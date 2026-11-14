import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { initFirestoreIfConfigured, getFirebaseAuth } from './storageService';
import { isAuthorizedAdminEmail } from './authService';

export type CommentModerationStatus = 'pending' | 'approved' | 'rejected';

export interface ArticleComment {
  id: string;
  postId: string;
  name: string;
  content: string;
  status: CommentModerationStatus;
  createdAt: string;
}

export interface SubmitCommentInput {
  postId: string;
  name: string;
  content: string;
  honeypot?: string;
}

export interface CommentValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName: string;
  sanitizedContent: string;
  sanitizedPostId: string;
}

export interface CommentSubmitResult {
  success: boolean;
  error?: string;
  comment?: ArticleComment;
}

export const COMMENT_NAME_MIN_LENGTH = 2;
export const COMMENT_NAME_MAX_LENGTH = 80;
export const COMMENT_CONTENT_MIN_LENGTH = 2;
export const COMMENT_CONTENT_MAX_LENGTH = 2000;
export const COMMENT_RATE_LIMIT_COOLDOWN_MS = 20_000; // 20s minimum between submissions
export const COMMENT_RATE_LIMIT_WINDOW_MS = 15 * 60_000; // 15 minutes
export const COMMENT_RATE_LIMIT_MAX_IN_WINDOW = 5;

const COMMENT_RATE_LIMIT_STORAGE_KEY = 'isezerano_comment_rate_limit_v1';

const verifyCurrentAdminAuth = (): boolean => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser || !isAuthorizedAdminEmail(currentUser.email)) {
    return false;
  }
  return true;
};

/**
 * Strips HTML tags, embedded scripts/styles, dangerous URI schemes, and ASCII control characters
 * so comments are stored and rendered strictly as plain text without XSS vectors.
 */
export const sanitizeCommentPlainText = (
  raw: string,
  options: { preserveNewlines?: boolean } = {}
): string => {
  if (typeof raw !== 'string') return '';

  let cleaned = raw
    // Remove script/style/iframe/svg blocks completely including inner content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    // Strip any remaining HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Neutralize dangerous URI protocols
    .replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
    // Remove control characters except \n, \r, \t
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  if (options.preserveNewlines) {
    cleaned = cleaned
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim();
  } else {
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
  }

  return cleaned;
};

/**
 * Validates and sanitizes reader comment input against length, spam, and Firestore schema rules.
 */
export const validateArticleCommentInput = (
  input: SubmitCommentInput
): CommentValidationResult => {
  if (typeof input.honeypot === 'string' && input.honeypot.trim().length > 0) {
    return {
      valid: false,
      error: 'Submission blocked by spam protection.',
      sanitizedName: '',
      sanitizedContent: '',
      sanitizedPostId: ''
    };
  }

  const sanitizedPostId = sanitizeCommentPlainText(input.postId || '', {
    preserveNewlines: false
  });
  const sanitizedName = sanitizeCommentPlainText(input.name || '', {
    preserveNewlines: false
  });
  const sanitizedContent = sanitizeCommentPlainText(input.content || '', {
    preserveNewlines: true
  });

  if (!sanitizedPostId || sanitizedPostId.length > 120) {
    return {
      valid: false,
      error: 'Invalid article reference.',
      sanitizedName,
      sanitizedContent,
      sanitizedPostId
    };
  }

  if (sanitizedName.length < COMMENT_NAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Please enter your name (at least ${COMMENT_NAME_MIN_LENGTH} characters).`,
      sanitizedName,
      sanitizedContent,
      sanitizedPostId
    };
  }

  if (sanitizedName.length > COMMENT_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Name must be ${COMMENT_NAME_MAX_LENGTH} characters or fewer.`,
      sanitizedName,
      sanitizedContent,
      sanitizedPostId
    };
  }

  if (sanitizedContent.length < COMMENT_CONTENT_MIN_LENGTH) {
    return {
      valid: false,
      error: `Please enter a message (at least ${COMMENT_CONTENT_MIN_LENGTH} characters).`,
      sanitizedName,
      sanitizedContent,
      sanitizedPostId
    };
  }

  if (sanitizedContent.length > COMMENT_CONTENT_MAX_LENGTH) {
    return {
      valid: false,
      error: `Message must be ${COMMENT_CONTENT_MAX_LENGTH} characters or fewer.`,
      sanitizedName,
      sanitizedContent,
      sanitizedPostId
    };
  }

  // Basic anti-spam heuristics: block link-flooding & excessive repeated-character bots
  const urlMatches = sanitizedContent.match(/(?:https?:\/\/|www\.)\S+/gi) || [];
  if (urlMatches.length > 2) {
    return {
      valid: false,
      error: 'Messages cannot contain more than 2 web links.',
      sanitizedName,
      sanitizedContent,
      sanitizedPostId
    };
  }

  if (/(.)\1{14,}/.test(sanitizedContent)) {
    return {
      valid: false,
      error: 'Message contains excessive repeated characters.',
      sanitizedName,
      sanitizedContent,
      sanitizedPostId
    };
  }

  return {
    valid: true,
    sanitizedName,
    sanitizedContent,
    sanitizedPostId
  };
};

/**
 * Builds the exact Firestore payload allowed by `firestore.rules` -> `isValidPublicComment`.
 * Only contains: name, content, postId, status ('pending'), createdAt.
 */
export const buildPublicCommentPayload = (params: {
  postId: string;
  name: string;
  content: string;
  createdAt?: string;
}): Omit<ArticleComment, 'id'> => ({
  name: params.name,
  content: params.content,
  postId: params.postId,
  status: 'pending',
  createdAt: params.createdAt || new Date().toISOString()
});

const readRateLimitTimestamps = (): number[] => {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(COMMENT_RATE_LIMIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n) => typeof n === 'number' && Number.isFinite(n));
  } catch {
    return [];
  }
};

const writeRateLimitTimestamps = (timestamps: number[]): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(COMMENT_RATE_LIMIT_STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // ignore storage failures
  }
};

/**
 * Checks whether the current browser session is allowed to submit another comment.
 */
export const checkCommentRateLimit = (
  timestamps: number[],
  nowMs: number = Date.now()
): { allowed: boolean; waitSeconds?: number; error?: string } => {
  const recent = timestamps.filter((ts) => nowMs - ts < COMMENT_RATE_LIMIT_WINDOW_MS);
  if (recent.length > 0) {
    const latest = Math.max(...recent);
    const elapsed = nowMs - latest;
    if (elapsed < COMMENT_RATE_LIMIT_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COMMENT_RATE_LIMIT_COOLDOWN_MS - elapsed) / 1000);
      return {
        allowed: false,
        waitSeconds,
        error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before posting another message.`
      };
    }
  }

  if (recent.length >= COMMENT_RATE_LIMIT_MAX_IN_WINDOW) {
    const oldestInWindow = Math.min(...recent);
    const waitSeconds = Math.ceil((COMMENT_RATE_LIMIT_WINDOW_MS - (nowMs - oldestInWindow)) / 1000);
    return {
      allowed: false,
      waitSeconds,
      error: 'Too many messages sent recently. Please wait a few minutes before sending another.'
    };
  }

  return { allowed: true };
};

export const recordCommentSubmissionTimestamp = (nowMs: number = Date.now()): void => {
  const recent = readRateLimitTimestamps().filter(
    (ts) => nowMs - ts < COMMENT_RATE_LIMIT_WINDOW_MS
  );
  recent.push(nowMs);
  writeRateLimitTimestamps(recent);
};

const normalizeCreatedAt = (raw: unknown): string => {
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as any).toDate === 'function') {
    try {
      return (raw as any).toDate().toISOString();
    } catch {
      return '';
    }
  }
  return '';
};

const parseCommentDoc = (id: string, data: Record<string, unknown>): ArticleComment => {
  const rawStatus = data.status;
  const status: CommentModerationStatus =
    rawStatus === 'approved' || rawStatus === 'rejected' || rawStatus === 'pending'
      ? rawStatus
      : 'pending';

  return {
    id,
    postId: typeof data.postId === 'string' ? data.postId : '',
    name: typeof data.name === 'string' ? sanitizeCommentPlainText(data.name) : 'Reader',
    content:
      typeof data.content === 'string'
        ? sanitizeCommentPlainText(data.content, { preserveNewlines: true })
        : '',
    status,
    createdAt: normalizeCreatedAt(data.createdAt)
  };
};

export const sortCommentsNewestFirst = (comments: ArticleComment[]): ArticleComment[] =>
  [...comments].sort((a, b) => {
    const tA = a.createdAt ? new Date(a.createdAt).getTime() || 0 : 0;
    const tB = b.createdAt ? new Date(b.createdAt).getTime() || 0 : 0;
    return tB - tA;
  });

export const countApprovedCommentsByPost = (
  comments: Pick<ArticleComment, 'postId' | 'status'>[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const comment of comments) {
    if (comment.status === 'approved' && comment.postId) {
      counts[comment.postId] = (counts[comment.postId] || 0) + 1;
    }
  }
  return counts;
};

/**
 * Publicly submits a reader message for an article with validation, sanitization, and rate limiting.
 * Stored with status='pending' in Firestore /comments to honor security rules & moderation.
 */
export const submitArticleComment = async (
  input: SubmitCommentInput
): Promise<CommentSubmitResult> => {
  const validation = validateArticleCommentInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Please check your name and message.'
    };
  }

  const nowMs = Date.now();
  const rateCheck = checkCommentRateLimit(readRateLimitTimestamps(), nowMs);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: rateCheck.error
    };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return {
      success: false,
      error: 'Comments service is temporarily unavailable. Please try again later.'
    };
  }

  const payload = buildPublicCommentPayload({
    postId: validation.sanitizedPostId,
    name: validation.sanitizedName,
    content: validation.sanitizedContent
  });

  try {
    const docRef = await addDoc(collection(db, 'comments'), payload);
    recordCommentSubmissionTimestamp(nowMs);
    return {
      success: true,
      comment: {
        id: docRef.id,
        ...payload
      }
    };
  } catch (err: any) {
    console.error('[Comments] Failed to submit article comment:', err);
    return {
      success: false,
      error: err?.message || 'Could not submit your message. Please try again.'
    };
  }
};

/**
 * Subscribes to public approved comments for a single article.
 * Uses where('status', '==', 'approved') to comply strictly with Firestore security rules.
 */
export const subscribeToApprovedCommentsForPost = (
  postId: string,
  callback: (comments: ArticleComment[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db || !postId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, 'comments'),
    where('postId', '==', postId),
    where('status', '==', 'approved')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        parseCommentDoc(d.id, d.data() as Record<string, unknown>)
      );
      callback(sortCommentsNewestFirst(items));
    },
    (err) => {
      console.warn('[Comments] Approved post comments subscription error:', err.message);
      callback([]);
      onError?.(err);
    }
  );
};

/**
 * Subscribes to live approved comment counts aggregated per postId for article cards.
 * Uses where('status', '==', 'approved') to comply strictly with Firestore security rules.
 */
export const subscribeToApprovedCommentCounts = (
  callback: (countsByPostId: Record<string, number>) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db) {
    callback({});
    return () => {};
  }

  const q = query(collection(db, 'comments'), where('status', '==', 'approved'));

  return onSnapshot(
    q,
    (snapshot) => {
      const parsed = snapshot.docs.map((d) =>
        parseCommentDoc(d.id, d.data() as Record<string, unknown>)
      );
      callback(countApprovedCommentsByPost(parsed));
    },
    (err) => {
      console.warn('[Comments] Approved comment counts subscription error:', err.message);
      callback({});
    }
  );
};

/**
 * Admin-only subscription to all comments across all statuses (pending, approved, rejected).
 */
export const subscribeToAllCommentsForAdmin = (
  callback: (comments: ArticleComment[]) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db || !verifyCurrentAdminAuth()) {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    collection(db, 'comments'),
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        parseCommentDoc(d.id, d.data() as Record<string, unknown>)
      );
      callback(sortCommentsNewestFirst(items));
    },
    (err) => {
      console.warn('[Comments] Admin comments subscription error:', err.message);
      callback([]);
    }
  );
};

/**
 * Admin-only action to approve, reject, or move a comment back to pending.
 */
export const moderateArticleComment = async (
  commentId: string,
  status: CommentModerationStatus
): Promise<{ success: boolean; error?: string }> => {
  if (!verifyCurrentAdminAuth()) {
    return { success: false, error: 'Unauthorized: Administrator sign-in required.' };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    await updateDoc(doc(db, 'comments', commentId), { status });
    return { success: true };
  } catch (err: any) {
    console.error('[Comments] Failed to moderate comment:', err);
    return {
      success: false,
      error: err?.message || 'Failed to update comment moderation status.'
    };
  }
};

/**
 * Admin-only action to permanently delete a comment.
 */
export const deleteArticleComment = async (
  commentId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!verifyCurrentAdminAuth()) {
    return { success: false, error: 'Unauthorized: Administrator sign-in required.' };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    await deleteDoc(doc(db, 'comments', commentId));
    return { success: true };
  } catch (err: any) {
    console.error('[Comments] Failed to delete comment:', err);
    return {
      success: false,
      error: err?.message || 'Failed to delete comment.'
    };
  }
};
