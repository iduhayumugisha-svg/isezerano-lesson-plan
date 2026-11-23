import {
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { initFirestoreIfConfigured, getFirebaseAuth } from '../config/firebase';
import { isAuthorizedAdminEmail } from './authService';

export type CommentModerationStatus =
  | 'published'
  | 'approved'
  | 'hidden'
  | 'rejected'
  | 'pending';

export interface ArticleComment {
  id: string;
  postId: string;
  parentId: string | null;
  replyToName: string | null;
  name: string;
  content: string;
  status: CommentModerationStatus;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  publicSafe?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export interface SubmitCommentInput {
  postId: string;
  name: string;
  email?: string;
  content: string;
  parentId?: string | null;
  replyToName?: string | null;
  honeypot?: string;
}

export interface CommentValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName: string;
  sanitizedEmail: string;
  sanitizedContent: string;
  sanitizedPostId: string;
  sanitizedParentId: string | null;
  sanitizedReplyToName: string | null;
}

export interface CommentSubmitResult {
  success: boolean;
  error?: string;
  comment?: ArticleComment;
}

export interface CommentMutationResult {
  success: boolean;
  error?: string;
  updatedAt?: string;
  sanitizedContent?: string;
}

export interface CommentThreadGroup {
  comment: ArticleComment;
  replies: ArticleComment[];
}

export interface OrphanCommentThreadGroup {
  parentId: string;
  replies: ArticleComment[];
}

export interface CommentThreadsResult {
  topLevel: CommentThreadGroup[];
  orphanThreads: OrphanCommentThreadGroup[];
}

export const COMMENT_NAME_MIN_LENGTH = 2;
export const COMMENT_NAME_MAX_LENGTH = 80;
export const COMMENT_EMAIL_MAX_LENGTH = 160;
export const COMMENT_CONTENT_MIN_LENGTH = 2;
export const COMMENT_CONTENT_MAX_LENGTH = 2000;
export const COMMENT_RATE_LIMIT_COOLDOWN_MS = 10_000; // 10s minimum between rapid submissions
export const COMMENT_RATE_LIMIT_WINDOW_MS = 15 * 60_000; // 15 minutes
export const COMMENT_RATE_LIMIT_MAX_IN_WINDOW = 5;

const COMMENT_RATE_LIMIT_STORAGE_KEY = 'isezerano_comment_rate_limit_v1';
const COMMENT_OWNERSHIP_STORAGE_KEY = 'isezerano_comment_ownership_v1';

interface StoredCommentOwnershipRecord {
  ownerToken: string;
  createdAt: string;
  postId?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
  };
}

function logFirestoreCommentError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified
    }
  };
  console.warn('[Comments Firestore]', JSON.stringify(errInfo));
}

export const formatFirestoreCommentError = (
  err: unknown,
  fallbackMessage: string
): string => {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code || '')
      : '';
  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message || '')
      : String(err || '');

  if (
    code === 'permission-denied' ||
    /missing or insufficient permissions|permission-denied|permission_denied/i.test(rawMessage)
  ) {
    return 'Unable to save comment right now due to server permissions. Please refresh the page and try again.';
  }
  if (code === 'unavailable' || /network|offline|unavailable/i.test(rawMessage)) {
    return 'Network connection interrupted. Please check your internet connection and try again.';
  }
  return rawMessage || fallbackMessage;
};

const verifyCurrentAdminAuth = (): boolean => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser || currentUser.isAnonymous || !isAuthorizedAdminEmail(currentUser.email)) {
    return false;
  }
  return true;
};

const getAdminAuthHeaders = async (): Promise<Record<string, string>> => {
  if (!verifyCurrentAdminAuth()) return {};
  try {
    const token = await getFirebaseAuth()?.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

type ApiCallOutcome<T> =
  | { available: false }
  | { available: true; ok: boolean; status: number; data: T };

async function callCommentsApi<T>(
  url: string,
  init: RequestInit = {}
): Promise<ApiCallOutcome<T>> {
  if (typeof fetch !== 'function' || typeof window === 'undefined') {
    return { available: false };
  }

  try {
    const res = await fetch(url, {
      credentials: 'include',
      ...init
    });
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    // Static Firebase Hosting SPA rewrites non-API routes to index.html; treat non-JSON as static host fallback
    if (!contentType.includes('application/json')) {
      return { available: false };
    }
    const data = (await res.json()) as T;
    return {
      available: true,
      ok: res.ok,
      status: res.status,
      data
    };
  } catch {
    return { available: false };
  }
}

const postRefreshListeners = new Map<string, Set<() => void>>();

const notifyPostCommentsRefresh = (postId: string): void => {
  const listeners = postRefreshListeners.get(postId);
  if (listeners) {
    listeners.forEach((fn) => fn());
  }
};

export const isCommentPubliclyVisibleStatus = (status: unknown): boolean =>
  status === 'published' || status === 'approved';

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
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
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

export const validateOptionalCommentEmail = (
  rawEmail?: string
): { valid: boolean; sanitizedEmail: string; error?: string } => {
  const cleaned = sanitizeCommentPlainText(rawEmail || '', { preserveNewlines: false });
  if (!cleaned) {
    return { valid: true, sanitizedEmail: '' };
  }
  if (cleaned.length > COMMENT_EMAIL_MAX_LENGTH) {
    return {
      valid: false,
      sanitizedEmail: cleaned,
      error: `Email must be ${COMMENT_EMAIL_MAX_LENGTH} characters or fewer.`
    };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned)) {
    return {
      valid: false,
      sanitizedEmail: cleaned,
      error: 'Please enter a valid email address or leave the email field blank.'
    };
  }
  return { valid: true, sanitizedEmail: cleaned.toLowerCase() };
};

export const validateCommentBodyText = (
  rawContent: string
): { valid: boolean; sanitizedContent: string; error?: string } => {
  const sanitizedContent = sanitizeCommentPlainText(rawContent || '', {
    preserveNewlines: true
  });

  if (sanitizedContent.length < COMMENT_CONTENT_MIN_LENGTH) {
    return {
      valid: false,
      sanitizedContent,
      error: `Please enter a comment (at least ${COMMENT_CONTENT_MIN_LENGTH} characters).`
    };
  }

  if (sanitizedContent.length > COMMENT_CONTENT_MAX_LENGTH) {
    return {
      valid: false,
      sanitizedContent,
      error: `Comment must be ${COMMENT_CONTENT_MAX_LENGTH} characters or fewer.`
    };
  }

  const urlMatches = sanitizedContent.match(/(?:https?:\/\/|www\.)\S+/gi) || [];
  if (urlMatches.length > 2) {
    return {
      valid: false,
      sanitizedContent,
      error: 'Comments cannot contain more than 2 web links.'
    };
  }

  if (/(.)\1{14,}/.test(sanitizedContent)) {
    return {
      valid: false,
      sanitizedContent,
      error: 'Comment contains excessive repeated characters.'
    };
  }

  return { valid: true, sanitizedContent };
};

/**
 * Validates and sanitizes reader comment/reply input against length, spam, and Firestore schema rules.
 */
export const validateArticleCommentInput = (
  input: SubmitCommentInput
): CommentValidationResult => {
  if (typeof input.honeypot === 'string' && input.honeypot.trim().length > 0) {
    return {
      valid: false,
      error: 'Submission blocked by spam protection.',
      sanitizedName: '',
      sanitizedEmail: '',
      sanitizedContent: '',
      sanitizedPostId: '',
      sanitizedParentId: null,
      sanitizedReplyToName: null
    };
  }

  const sanitizedPostId = sanitizeCommentPlainText(input.postId || '', {
    preserveNewlines: false
  });
  const sanitizedName = sanitizeCommentPlainText(input.name || '', {
    preserveNewlines: false
  });
  const rawParentId =
    typeof input.parentId === 'string'
      ? sanitizeCommentPlainText(input.parentId, { preserveNewlines: false })
      : '';
  const sanitizedParentId = rawParentId.length > 0 ? rawParentId : null;
  const rawReplyToName =
    sanitizedParentId && typeof input.replyToName === 'string'
      ? sanitizeCommentPlainText(input.replyToName, { preserveNewlines: false }).slice(
          0,
          COMMENT_NAME_MAX_LENGTH
        )
      : '';
  const sanitizedReplyToName =
    sanitizedParentId && rawReplyToName.length > 0 ? rawReplyToName : null;

  const emailCheck = validateOptionalCommentEmail(input.email);
  const bodyCheck = validateCommentBodyText(input.content || '');

  if (!sanitizedPostId || sanitizedPostId.length > 120) {
    return {
      valid: false,
      error: 'Invalid article reference.',
      sanitizedName,
      sanitizedEmail: emailCheck.sanitizedEmail,
      sanitizedContent: bodyCheck.sanitizedContent,
      sanitizedPostId,
      sanitizedParentId,
      sanitizedReplyToName
    };
  }

  if (
    sanitizedParentId &&
    (sanitizedParentId.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(sanitizedParentId))
  ) {
    return {
      valid: false,
      error: 'Invalid parent comment reference.',
      sanitizedName,
      sanitizedEmail: emailCheck.sanitizedEmail,
      sanitizedContent: bodyCheck.sanitizedContent,
      sanitizedPostId,
      sanitizedParentId,
      sanitizedReplyToName
    };
  }

  if (sanitizedName.length < COMMENT_NAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Please enter your name (at least ${COMMENT_NAME_MIN_LENGTH} characters).`,
      sanitizedName,
      sanitizedEmail: emailCheck.sanitizedEmail,
      sanitizedContent: bodyCheck.sanitizedContent,
      sanitizedPostId,
      sanitizedParentId,
      sanitizedReplyToName
    };
  }

  if (sanitizedName.length > COMMENT_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Name must be ${COMMENT_NAME_MAX_LENGTH} characters or fewer.`,
      sanitizedName,
      sanitizedEmail: emailCheck.sanitizedEmail,
      sanitizedContent: bodyCheck.sanitizedContent,
      sanitizedPostId,
      sanitizedParentId,
      sanitizedReplyToName
    };
  }

  if (!emailCheck.valid) {
    return {
      valid: false,
      error: emailCheck.error,
      sanitizedName,
      sanitizedEmail: emailCheck.sanitizedEmail,
      sanitizedContent: bodyCheck.sanitizedContent,
      sanitizedPostId,
      sanitizedParentId,
      sanitizedReplyToName
    };
  }

  if (!bodyCheck.valid) {
    return {
      valid: false,
      error: bodyCheck.error,
      sanitizedName,
      sanitizedEmail: emailCheck.sanitizedEmail,
      sanitizedContent: bodyCheck.sanitizedContent,
      sanitizedPostId,
      sanitizedParentId,
      sanitizedReplyToName
    };
  }

  return {
    valid: true,
    sanitizedName,
    sanitizedEmail: emailCheck.sanitizedEmail,
    sanitizedContent: bodyCheck.sanitizedContent,
    sanitizedPostId,
    sanitizedParentId,
    sanitizedReplyToName
  };
};

/**
 * Builds the exact public Firestore payload allowed by `firestore.rules` -> `isValidPublicCommentCreate`.
 * Publishes immediately with `status: 'published'`. Never includes email or ownership credentials.
 */
export const buildPublicCommentPayload = (params: {
  postId: string;
  name: string;
  content: string;
  parentId?: string | null;
  replyToName?: string | null;
  createdAt?: string;
}): Omit<ArticleComment, 'id' | 'canEdit' | 'canDelete'> => {
  const timestamp = params.createdAt || new Date().toISOString();
  const normalizedParentId =
    typeof params.parentId === 'string' && params.parentId.trim().length > 0
      ? params.parentId.trim()
      : null;
  const normalizedReplyToName =
    normalizedParentId &&
    typeof params.replyToName === 'string' &&
    params.replyToName.trim().length > 0
      ? params.replyToName.trim().slice(0, COMMENT_NAME_MAX_LENGTH)
      : null;

  return {
    postId: params.postId,
    parentId: normalizedParentId,
    replyToName: normalizedReplyToName,
    name: params.name,
    content: params.content,
    status: 'published',
    createdAt: timestamp,
    updatedAt: timestamp,
    edited: false,
    publicSafe: true
  };
};

// =========================================================================
// FALLBACK CRYPTOGRAPHIC OWNERSHIP STORAGE (STATIC HOSTING ONLY)
// =========================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

/**
 * Pure UTF-8 SHA-256 lower-case hex digest helper so comment token hashing & proof generation
 * work identically across HTTPS browsers, local previews, and test environments.
 */
export const sha256Hex = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, highBits, false);
  view.setUint32(paddedLen - 4, lowBits, false);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  return Array.from(h, (word) => word.toString(16).padStart(8, '0')).join('');
};

export const buildCommentOwnershipVerifier = (params: {
  ownerToken: string;
  postId: string;
  createdAt: string;
  syncedAt: string;
}): string => {
  const { ownerToken, postId, createdAt, syncedAt } = params;
  const actionProof = sha256Hex(`${ownerToken}:${postId}:${createdAt}:${syncedAt}`);
  return `${ownerToken}:${actionProof}`;
};

const generateRandomHex = (byteLength = 24): string => {
  if (typeof globalThis === 'undefined' || !globalThis.crypto?.getRandomValues) {
    throw new Error('Secure cryptographic random generator (crypto.getRandomValues) is required.');
  }
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const readOwnershipMap = (): Record<string, StoredCommentOwnershipRecord> => {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(COMMENT_OWNERSHIP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, StoredCommentOwnershipRecord>;
  } catch {
    return {};
  }
};

const writeOwnershipMap = (map: Record<string, StoredCommentOwnershipRecord>): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(COMMENT_OWNERSHIP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
};

export const saveCommentOwnerToken = (
  commentId: string,
  ownerToken: string,
  createdAt: string,
  postId?: string
): void => {
  if (!commentId || !ownerToken) return;
  const map = readOwnershipMap();
  map[commentId] = {
    ownerToken,
    createdAt,
    ...(postId ? { postId } : {})
  };
  writeOwnershipMap(map);
};

export const getCommentOwnershipRecord = (
  commentId: string
): StoredCommentOwnershipRecord | null => {
  if (!commentId) return null;
  const map = readOwnershipMap();
  const entry = map[commentId];
  if (!entry || typeof entry.ownerToken !== 'string' || entry.ownerToken.length < 32) {
    return null;
  }
  return entry;
};

export const getCommentOwnerToken = (commentId: string): string | null =>
  getCommentOwnershipRecord(commentId)?.ownerToken ?? null;

export const removeCommentOwnerToken = (commentId: string): void => {
  if (!commentId) return;
  const map = readOwnershipMap();
  if (commentId in map) {
    delete map[commentId];
    writeOwnershipMap(map);
  }
};

export const isCommentOwnedByVisitor = (commentId: string): boolean =>
  getCommentOwnerToken(commentId) !== null;

/**
 * Single authoritative UI permission check:
 * - If server backend evaluated `canEdit`/`canDelete` from the HttpOnly cookie, trust ONLY that boolean (or Admin).
 * - Only in static Firebase Hosting fallback (where `canEdit === undefined`), check local ownership token (or Admin).
 */
export const canVisitorEditComment = (comment: ArticleComment, isAdmin: boolean): boolean => {
  if (isAdmin) return true;
  if (typeof comment.canEdit === 'boolean') return comment.canEdit;
  return isCommentOwnedByVisitor(comment.id);
};

export const canVisitorDeleteComment = (comment: ArticleComment, isAdmin: boolean): boolean => {
  if (isAdmin) return true;
  if (typeof comment.canDelete === 'boolean') return comment.canDelete;
  return isCommentOwnedByVisitor(comment.id);
};

const createNextMonotonicIso = (previousIso?: string): string => {
  const now = Date.now();
  const prevMs = previousIso ? new Date(previousIso).getTime() : 0;
  const nextMs = Number.isFinite(prevMs) ? Math.max(now, prevMs + 1) : now;
  return new Date(nextMs).toISOString();
};

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
        error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before posting another comment.`
      };
    }
  }

  if (recent.length >= COMMENT_RATE_LIMIT_MAX_IN_WINDOW) {
    const oldestInWindow = Math.min(...recent);
    const waitSeconds = Math.ceil((COMMENT_RATE_LIMIT_WINDOW_MS - (nowMs - oldestInWindow)) / 1000);
    return {
      allowed: false,
      waitSeconds,
      error: 'Too many comments posted recently. Please wait a few minutes before posting another.'
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

const normalizeTimestampString = (raw: unknown): string => {
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

const normalizeCommentStatus = (rawStatus: unknown): CommentModerationStatus => {
  if (
    rawStatus === 'published' ||
    rawStatus === 'approved' ||
    rawStatus === 'hidden' ||
    rawStatus === 'rejected' ||
    rawStatus === 'pending'
  ) {
    return rawStatus;
  }
  return 'published';
};

export const parseCommentDoc = (id: string, data: Record<string, unknown>): ArticleComment => {
  const createdAt = normalizeTimestampString(data.createdAt);
  const updatedAt = normalizeTimestampString(data.updatedAt) || createdAt;
  const rawParentId =
    typeof data.parentId === 'string' && data.parentId.trim().length > 0
      ? data.parentId.trim()
      : null;
  const rawReplyToName =
    rawParentId && typeof data.replyToName === 'string' && data.replyToName.trim().length > 0
      ? sanitizeCommentPlainText(data.replyToName)
      : null;

  return {
    id,
    postId: typeof data.postId === 'string' ? data.postId : '',
    parentId: rawParentId,
    replyToName: rawReplyToName,
    name: typeof data.name === 'string' ? sanitizeCommentPlainText(data.name) : 'Reader',
    content:
      typeof data.content === 'string'
        ? sanitizeCommentPlainText(data.content, { preserveNewlines: true })
        : '',
    status: normalizeCommentStatus(data.status),
    createdAt,
    updatedAt,
    edited: Boolean(data.edited),
    ...(typeof data.canEdit === 'boolean' ? { canEdit: data.canEdit } : {}),
    ...(typeof data.canDelete === 'boolean' ? { canDelete: data.canDelete } : {})
  };
};

const parseCreatedMs = (c: Pick<ArticleComment, 'createdAt'>): number => {
  if (!c.createdAt) return 0;
  const ms = new Date(c.createdAt).getTime();
  return Number.isFinite(ms) ? ms : 0;
};

export const sortCommentsNewestFirst = (comments: ArticleComment[]): ArticleComment[] =>
  [...comments].sort((a, b) => parseCreatedMs(b) - parseCreatedMs(a));

export const sortCommentsChronological = (comments: ArticleComment[]): ArticleComment[] =>
  [...comments].sort((a, b) => parseCreatedMs(a) - parseCreatedMs(b));

export const buildCommentThreads = (comments: ArticleComment[]): CommentThreadsResult => {
  const byId = new Map<string, ArticleComment>();
  for (const comment of comments) {
    byId.set(comment.id, comment);
  }

  const topLevelRaw: ArticleComment[] = [];
  const repliesRaw: ArticleComment[] = [];

  for (const comment of comments) {
    if (!comment.parentId) {
      topLevelRaw.push(comment);
    } else {
      repliesRaw.push(comment);
    }
  }

  const resolveRootParentId = (reply: ArticleComment): string => {
    let currentParentId = reply.parentId || '';
    const visited = new Set<string>([reply.id]);

    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      const parentDoc = byId.get(currentParentId);
      if (!parentDoc) {
        return currentParentId;
      }
      if (!parentDoc.parentId) {
        return parentDoc.id;
      }
      currentParentId = parentDoc.parentId;
    }

    return reply.parentId || '';
  };

  const repliesByParentId = new Map<string, ArticleComment[]>();
  const orphanRepliesByParentId = new Map<string, ArticleComment[]>();
  const topLevelIds = new Set(topLevelRaw.map((c) => c.id));

  for (const reply of repliesRaw) {
    const rootId = resolveRootParentId(reply);
    if (topLevelIds.has(rootId)) {
      const list = repliesByParentId.get(rootId) || [];
      list.push(reply);
      repliesByParentId.set(rootId, list);
    } else {
      const list = orphanRepliesByParentId.get(rootId) || [];
      list.push(reply);
      orphanRepliesByParentId.set(rootId, list);
    }
  }

  const topLevel: CommentThreadGroup[] = sortCommentsNewestFirst(topLevelRaw).map((comment) => ({
    comment,
    replies: sortCommentsChronological(repliesByParentId.get(comment.id) || [])
  }));

  const orphanThreads: OrphanCommentThreadGroup[] = Array.from(orphanRepliesByParentId.entries())
    .map(([parentId, replies]) => ({
      parentId,
      replies: sortCommentsChronological(replies)
    }))
    .sort(
      (a, b) =>
        parseCreatedMs(b.replies[0] || { createdAt: '' }) -
        parseCreatedMs(a.replies[0] || { createdAt: '' })
    );

  return { topLevel, orphanThreads };
};

export const countPublishedCommentsByPost = (
  comments: Pick<ArticleComment, 'postId' | 'status'>[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const comment of comments) {
    if (isCommentPubliclyVisibleStatus(comment.status) && comment.postId) {
      counts[comment.postId] = (counts[comment.postId] || 0) + 1;
    }
  }
  return counts;
};

export const countApprovedCommentsByPost = countPublishedCommentsByPost;

/**
 * Publicly submits a reader comment or reply with instant publication (`status: 'published'`).
 * Primary path: Trusted backend `/api/comments` issues HttpOnly signed author cookie & verifies server-side.
 * Fallback (static Firebase Hosting without Node server): Atomic Firestore batch with /tokens & /private/ownership.
 */
export const submitArticleComment = async (
  input: SubmitCommentInput
): Promise<CommentSubmitResult> => {
  const validation = validateArticleCommentInput(input);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Please check your name and comment.'
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

  // 1. Try trusted backend API (HttpOnly signed session cookie)
  const apiRes = await callCommentsApi<{
    success?: boolean;
    error?: string;
    comment?: ArticleComment;
  }>('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      postId: validation.sanitizedPostId,
      parentId: validation.sanitizedParentId,
      replyToName: validation.sanitizedReplyToName,
      name: validation.sanitizedName,
      email: validation.sanitizedEmail || undefined,
      content: validation.sanitizedContent,
      honeypot: input.honeypot || ''
    })
  });

  if (apiRes.available) {
    if (!apiRes.ok || !apiRes.data.success || !apiRes.data.comment) {
      return {
        success: false,
        error: apiRes.data?.error || 'Could not publish your comment. Please try again.'
      };
    }
    recordCommentSubmissionTimestamp(nowMs);
    notifyPostCommentsRefresh(validation.sanitizedPostId);
    return {
      success: true,
      comment: {
        ...apiRes.data.comment,
        canEdit: Boolean(apiRes.data.comment.canEdit),
        canDelete: Boolean(apiRes.data.comment.canDelete)
      }
    };
  }

  // 2. Fallback for static Firebase Hosting without Express API
  const db = initFirestoreIfConfigured();
  if (!db) {
    return {
      success: false,
      error: 'Comments service is temporarily unavailable. Please try again later.'
    };
  }

  const createdAt = new Date(nowMs).toISOString();
  const payload = buildPublicCommentPayload({
    postId: validation.sanitizedPostId,
    parentId: validation.sanitizedParentId,
    replyToName: validation.sanitizedReplyToName,
    name: validation.sanitizedName,
    content: validation.sanitizedContent,
    createdAt
  });

  const commentRef = doc(collection(db, 'comments'));
  const ownerToken = generateRandomHex(24);
  const tokenHash = sha256Hex(ownerToken);
  const tokenRef = doc(db, 'comments', commentRef.id, 'tokens', tokenHash);
  const ownershipRef = doc(db, 'comments', commentRef.id, 'private', 'ownership');

  try {
    const batch = writeBatch(db);
    batch.set(commentRef, payload);
    batch.set(tokenRef, {
      tokenHash,
      postId: validation.sanitizedPostId,
      createdAt
    });
    batch.set(ownershipRef, {
      tokenHash,
      postId: validation.sanitizedPostId,
      createdAt,
      lastSyncedAt: createdAt,
      verifier: '',
      ...(validation.sanitizedEmail ? { email: validation.sanitizedEmail } : {})
    });

    await batch.commit();

    saveCommentOwnerToken(
      commentRef.id,
      ownerToken,
      createdAt,
      validation.sanitizedPostId
    );
    recordCommentSubmissionTimestamp(nowMs);

    return {
      success: true,
      comment: {
        id: commentRef.id,
        ...payload
      }
    };
  } catch (err: any) {
    logFirestoreCommentError(err, OperationType.CREATE, `comments/${commentRef.id}`);
    return {
      success: false,
      error: formatFirestoreCommentError(err, 'Could not publish your comment. Please try again.')
    };
  }
};

/**
 * Edits an existing comment or reply immediately while preserving author name and original createdAt.
 * Ownership is verified strictly on the backend via HttpOnly signed cookie (or Admin RSA JWT),
 * or via Firestore Rules batch verification when running statically.
 */
export const editArticleComment = async (params: {
  commentId: string;
  content: string;
  previousUpdatedAt?: string;
  allowAdminOverride?: boolean;
  postId?: string;
}): Promise<CommentMutationResult> => {
  const { commentId, content, previousUpdatedAt, allowAdminOverride = false, postId } = params;
  if (!commentId) {
    return { success: false, error: 'Missing comment reference.' };
  }

  const bodyCheck = validateCommentBodyText(content);
  if (!bodyCheck.valid) {
    return {
      success: false,
      error: bodyCheck.error || 'Please enter a valid comment.'
    };
  }

  const adminHeaders = allowAdminOverride ? await getAdminAuthHeaders() : {};
  const apiRes = await callCommentsApi<{
    success?: boolean;
    error?: string;
    comment?: ArticleComment;
  }>(`/api/comments/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...adminHeaders
    },
    body: JSON.stringify({ content: bodyCheck.sanitizedContent })
  });

  if (apiRes.available) {
    if (apiRes.ok && apiRes.data.success && apiRes.data.comment) {
      if (postId) notifyPostCommentsRefresh(postId);
      return {
        success: true,
        updatedAt: apiRes.data.comment.updatedAt,
        sanitizedContent: apiRes.data.comment.content
      };
    }

    // Never fall back on HTTP 403/401/400 rejections — backend explicitly rejected unauthorized edit!
    const canTryLegacyAdminFirestore =
      apiRes.status === 404 && allowAdminOverride && verifyCurrentAdminAuth();
    if (!canTryLegacyAdminFirestore) {
      return {
        success: false,
        error: apiRes.data?.error || 'Forbidden: Only the original author can edit this comment.'
      };
    }
  }

  // Fallback for static Firebase Hosting OR Admin editing legacy Firestore-only comment
  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Comments service is temporarily unavailable.' };
  }

  const nextIso = createNextMonotonicIso(previousUpdatedAt);
  const commentRef = doc(db, 'comments', commentId);

  try {
    if (allowAdminOverride && verifyCurrentAdminAuth()) {
      await updateDoc(commentRef, {
        content: bodyCheck.sanitizedContent,
        updatedAt: nextIso,
        edited: true
      });
      return {
        success: true,
        updatedAt: nextIso,
        sanitizedContent: bodyCheck.sanitizedContent
      };
    }

    const ownershipRecord = getCommentOwnershipRecord(commentId);
    if (!ownershipRecord) {
      return {
        success: false,
        error: 'Forbidden: Only the original author of this comment can edit it.'
      };
    }

    let targetPostId = ownershipRecord.postId || postId || '';
    let targetCreatedAt = ownershipRecord.createdAt || '';
    if (!targetPostId || !targetCreatedAt) {
      const existingSnap = await getDoc(commentRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        if (!targetPostId && typeof existingData?.postId === 'string') {
          targetPostId = existingData.postId;
        }
        if (!targetCreatedAt && typeof existingData?.createdAt === 'string') {
          targetCreatedAt = existingData.createdAt;
        }
      }
    }

    if (!targetPostId || !targetCreatedAt) {
      return {
        success: false,
        error: 'Forbidden: Only the original author of this comment can edit it.'
      };
    }

    const verifier = buildCommentOwnershipVerifier({
      ownerToken: ownershipRecord.ownerToken,
      postId: targetPostId,
      createdAt: targetCreatedAt,
      syncedAt: nextIso
    });
    const ownershipRef = doc(db, 'comments', commentId, 'private', 'ownership');
    const batch = writeBatch(db);
    batch.update(commentRef, {
      content: bodyCheck.sanitizedContent,
      updatedAt: nextIso,
      edited: true
    });
    batch.update(ownershipRef, {
      verifier,
      lastSyncedAt: nextIso
    });
    await batch.commit();

    return {
      success: true,
      updatedAt: nextIso,
      sanitizedContent: bodyCheck.sanitizedContent
    };
  } catch (err: any) {
    logFirestoreCommentError(err, OperationType.UPDATE, `comments/${commentId}`);
    return {
      success: false,
      error: formatFirestoreCommentError(err, 'Could not save your changes. Please try again.')
    };
  }
};

/**
 * Deletes an author's own comment/reply with strict backend HttpOnly session verification.
 */
export const deleteArticleCommentByOwner = async (
  commentId: string,
  postId?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!commentId) {
    return { success: false, error: 'Missing comment reference.' };
  }

  const apiRes = await callCommentsApi<{ success?: boolean; error?: string }>(
    `/api/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE' }
  );

  if (apiRes.available) {
    if (!apiRes.ok || !apiRes.data.success) {
      return {
        success: false,
        error:
          apiRes.data?.error || 'Forbidden: Only the original author of this comment can delete it.'
      };
    }
    removeCommentOwnerToken(commentId);
    if (postId) notifyPostCommentsRefresh(postId);
    return { success: true };
  }

  // Fallback for static Firebase Hosting without Node API
  const ownershipRecord = getCommentOwnershipRecord(commentId);
  if (!ownershipRecord) {
    return {
      success: false,
      error: 'Forbidden: Only the original author of this comment can delete it.'
    };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Comments service is temporarily unavailable.' };
  }

  const commentRef = doc(db, 'comments', commentId);
  const ownershipRef = doc(db, 'comments', commentId, 'private', 'ownership');

  try {
    let targetPostId = ownershipRecord.postId || postId || '';
    let targetCreatedAt = ownershipRecord.createdAt || '';
    if (!targetPostId || !targetCreatedAt) {
      const existingSnap = await getDoc(commentRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data();
        if (!targetPostId && typeof existingData?.postId === 'string') {
          targetPostId = existingData.postId;
        }
        if (!targetCreatedAt && typeof existingData?.createdAt === 'string') {
          targetCreatedAt = existingData.createdAt;
        }
      }
    }

    if (!targetPostId || !targetCreatedAt) {
      return {
        success: false,
        error: 'Forbidden: Only the original author of this comment can delete it.'
      };
    }

    const actionNonce = generateRandomHex(6);
    const deleteMarker = `deleted_${Date.now()}_${actionNonce}`;
    const verifier = buildCommentOwnershipVerifier({
      ownerToken: ownershipRecord.ownerToken,
      postId: targetPostId,
      createdAt: targetCreatedAt,
      syncedAt: deleteMarker
    });

    const batch = writeBatch(db);
    batch.update(ownershipRef, {
      verifier,
      lastSyncedAt: deleteMarker
    });
    batch.delete(commentRef);
    await batch.commit();

    removeCommentOwnerToken(commentId);
    return { success: true };
  } catch (err: any) {
    logFirestoreCommentError(err, OperationType.DELETE, `comments/${commentId}`);
    return {
      success: false,
      error: formatFirestoreCommentError(err, 'Could not delete this comment. Please try again.')
    };
  }
};

/**
 * Subscribes to live public comments & replies (`published` + legacy `approved`) for a single article.
 * Uses trusted backend API when available for authoritative `canEdit`/`canDelete` session permissions,
 * merged seamlessly with Firestore listeners.
 */
export const subscribeToPublishedCommentsForPost = (
  postId: string,
  callback: (comments: ArticleComment[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  if (!postId) {
    callback([]);
    return () => {};
  }

  const db = initFirestoreIfConfigured();
  const apiMap = new Map<string, ArticleComment>();
  const publishedMap = new Map<string, ArticleComment>();
  const approvedMap = new Map<string, ArticleComment>();

  let backendApiActive: boolean | null = null;
  let gotApi = false;
  let gotPublished = false;
  let gotApproved = false;
  let cancelled = false;

  const emitMerged = () => {
    if (cancelled) return;
    if (!gotApi && !gotPublished && !gotApproved) return;

    const merged = new Map<string, ArticleComment>();

    const normalizeFirestorePermission = (item: ArticleComment): ArticleComment => {
      // When backend API is active, Firestore items unknown to the visitor session MUST NOT claim local ownership
      if (backendApiActive === true) {
        return {
          ...item,
          canEdit: false,
          canDelete: false
        };
      }
      return item;
    };

    approvedMap.forEach((val, key) => merged.set(key, normalizeFirestorePermission(val)));
    publishedMap.forEach((val, key) => merged.set(key, normalizeFirestorePermission(val)));
    apiMap.forEach((val, key) => merged.set(key, val));

    callback(sortCommentsNewestFirst(Array.from(merged.values())));
  };

  const refreshFromBackendApi = async () => {
    if (cancelled) return;
    const adminHeaders = await getAdminAuthHeaders();
    const res = await callCommentsApi<{ success?: boolean; comments?: ArticleComment[] }>(
      `/api/comments?postId=${encodeURIComponent(postId)}`,
      { headers: adminHeaders }
    );
    if (cancelled) return;

    if (!res.available) {
      backendApiActive = false;
      gotApi = true;
      emitMerged();
      return;
    }

    backendApiActive = true;
    if (res.ok && Array.isArray(res.data?.comments)) {
      apiMap.clear();
      for (const item of res.data.comments) {
        apiMap.set(item.id, {
          ...item,
          canEdit: Boolean(item.canEdit),
          canDelete: Boolean(item.canDelete)
        });
      }
    }
    gotApi = true;
    emitMerged();
  };

  void refreshFromBackendApi();

  let listenersSet = postRefreshListeners.get(postId);
  if (!listenersSet) {
    listenersSet = new Set();
    postRefreshListeners.set(postId, listenersSet);
  }
  const triggerRefresh = () => {
    void refreshFromBackendApi();
  };
  listenersSet.add(triggerRefresh);

  const pollTimer =
    typeof window !== 'undefined'
      ? window.setInterval(() => {
          if (
            backendApiActive === true &&
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible'
          ) {
            void refreshFromBackendApi();
          }
        }, 5000)
      : null;

  let unsubPublished = () => {};
  let unsubApproved = () => {};

  if (db) {
    const publishedQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      where('status', '==', 'published'),
      where('publicSafe', '==', true)
    );

    const approvedQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      where('status', '==', 'approved'),
      where('publicSafe', '==', true)
    );

    unsubPublished = onSnapshot(
      publishedQuery,
      (snapshot) => {
        publishedMap.clear();
        for (const d of snapshot.docs) {
          publishedMap.set(d.id, parseCommentDoc(d.id, d.data() as Record<string, unknown>));
        }
        gotPublished = true;
        emitMerged();
      },
      (err) => {
        logFirestoreCommentError(err, OperationType.LIST, `comments(postId=${postId},published)`);
        gotPublished = true;
        emitMerged();
        if (backendApiActive === false) {
          onError?.(err);
        }
      }
    );

    unsubApproved = onSnapshot(
      approvedQuery,
      (snapshot) => {
        approvedMap.clear();
        for (const d of snapshot.docs) {
          approvedMap.set(d.id, parseCommentDoc(d.id, d.data() as Record<string, unknown>));
        }
        gotApproved = true;
        emitMerged();
      },
      (err) => {
        logFirestoreCommentError(err, OperationType.LIST, `comments(postId=${postId},approved)`);
        gotApproved = true;
        emitMerged();
        if (backendApiActive === false && publishedMap.size === 0) {
          onError?.(err);
        }
      }
    );
  }

  return () => {
    cancelled = true;
    listenersSet?.delete(triggerRefresh);
    if (listenersSet && listenersSet.size === 0) {
      postRefreshListeners.delete(postId);
    }
    if (pollTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(pollTimer);
    }
    unsubPublished();
    unsubApproved();
  };
};

export const subscribeToApprovedCommentsForPost = subscribeToPublishedCommentsForPost;

/**
 * Subscribes to live public comment + reply counts aggregated per postId.
 */
export const subscribeToPublishedCommentCounts = (
  callback: (countsByPostId: Record<string, number>) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  const publishedMap = new Map<string, ArticleComment>();
  const approvedMap = new Map<string, ArticleComment>();
  let apiCounts: Record<string, number> | null = null;
  let cancelled = false;

  const emitMergedCounts = () => {
    if (cancelled) return;
    const merged = new Map<string, ArticleComment>();
    approvedMap.forEach((val, key) => merged.set(key, val));
    publishedMap.forEach((val, key) => merged.set(key, val));
    const firestoreCounts = countPublishedCommentsByPost(Array.from(merged.values()));

    if (!apiCounts) {
      callback(firestoreCounts);
      return;
    }

    const combined: Record<string, number> = { ...firestoreCounts };
    for (const [pId, count] of Object.entries(apiCounts)) {
      combined[pId] = Math.max(combined[pId] || 0, count);
    }
    callback(combined);
  };

  void callCommentsApi<{ success?: boolean; counts?: Record<string, number> }>(
    '/api/comments/counts'
  ).then((res) => {
    if (!cancelled && res.available && res.ok && res.data?.counts) {
      apiCounts = res.data.counts;
      emitMergedCounts();
    }
  });

  if (!db) {
    callback({});
    return () => {
      cancelled = true;
    };
  }

  const publishedQuery = query(
    collection(db, 'comments'),
    where('status', '==', 'published'),
    where('publicSafe', '==', true)
  );
  const approvedQuery = query(
    collection(db, 'comments'),
    where('status', '==', 'approved'),
    where('publicSafe', '==', true)
  );

  const unsubPublished = onSnapshot(
    publishedQuery,
    (snapshot) => {
      publishedMap.clear();
      for (const d of snapshot.docs) {
        publishedMap.set(d.id, parseCommentDoc(d.id, d.data() as Record<string, unknown>));
      }
      emitMergedCounts();
    },
    (err) => {
      logFirestoreCommentError(err, OperationType.LIST, 'comments(published)');
      emitMergedCounts();
    }
  );

  const unsubApproved = onSnapshot(
    approvedQuery,
    (snapshot) => {
      approvedMap.clear();
      for (const d of snapshot.docs) {
        approvedMap.set(d.id, parseCommentDoc(d.id, d.data() as Record<string, unknown>));
      }
      emitMergedCounts();
    },
    (err) => {
      logFirestoreCommentError(err, OperationType.LIST, 'comments(approved)');
      emitMergedCounts();
    }
  );

  return () => {
    cancelled = true;
    unsubPublished();
    unsubApproved();
  };
};

export const subscribeToApprovedCommentCounts = subscribeToPublishedCommentCounts;

/**
 * Admin-only subscription to all comments & replies across all statuses.
 */
export const subscribeToAllCommentsForAdmin = (
  callback: (comments: ArticleComment[]) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!verifyCurrentAdminAuth()) {
    callback([]);
    return () => {};
  }

  let cancelled = false;
  const firestoreMap = new Map<string, ArticleComment>();
  const apiMap = new Map<string, ArticleComment>();

  const emitAll = () => {
    if (cancelled) return;
    const merged = new Map<string, ArticleComment>();
    firestoreMap.forEach((v, k) => merged.set(k, v));
    apiMap.forEach((v, k) => merged.set(k, v));
    callback(sortCommentsNewestFirst(Array.from(merged.values())));
  };

  void getAdminAuthHeaders().then(async (headers) => {
    if (cancelled || !headers.Authorization) return;
    const res = await callCommentsApi<{ success?: boolean; comments?: ArticleComment[] }>(
      '/api/comments/all',
      { headers }
    );
    if (!cancelled && res.available && res.ok && Array.isArray(res.data?.comments)) {
      apiMap.clear();
      for (const c of res.data.comments) {
        apiMap.set(c.id, c);
      }
      emitAll();
    }
  });

  if (!db) {
    return () => {
      cancelled = true;
    };
  }

  const unsubFirestore = onSnapshot(
    collection(db, 'comments'),
    (snapshot) => {
      firestoreMap.clear();
      for (const d of snapshot.docs) {
        firestoreMap.set(d.id, parseCommentDoc(d.id, d.data() as Record<string, unknown>));
      }
      emitAll();
    },
    (err) => {
      logFirestoreCommentError(err, OperationType.LIST, 'comments');
      emitAll();
    }
  );

  return () => {
    cancelled = true;
    unsubFirestore();
  };
};

/**
 * Admin-only post-publication moderation to publish/restore, hide/reject, or archive a comment.
 */
export const moderateArticleComment = async (
  commentId: string,
  status: CommentModerationStatus
): Promise<{ success: boolean; error?: string }> => {
  if (!verifyCurrentAdminAuth()) {
    return { success: false, error: 'Unauthorized: Administrator sign-in required.' };
  }

  const headers = await getAdminAuthHeaders();
  const apiRes = await callCommentsApi<{ success?: boolean; error?: string }>(
    `/api/comments/${encodeURIComponent(commentId)}/moderate`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ status })
    }
  );

  if (apiRes.available && !apiRes.ok && apiRes.status !== 404) {
    return {
      success: false,
      error: apiRes.data?.error || 'Failed to update comment moderation status.'
    };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return apiRes.available && apiRes.ok
      ? { success: true }
      : { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    await updateDoc(doc(db, 'comments', commentId), { status });
    return { success: true };
  } catch (err: any) {
    if (apiRes.available && apiRes.ok) {
      return { success: true };
    }
    logFirestoreCommentError(err, OperationType.UPDATE, `comments/${commentId}`);
    return {
      success: false,
      error: formatFirestoreCommentError(err, 'Failed to update comment moderation status.')
    };
  }
};

/**
 * Admin-only action to permanently delete a comment (and optionally its child replies).
 */
export const deleteArticleComment = async (
  commentId: string,
  childReplyIds: string[] = []
): Promise<{ success: boolean; error?: string }> => {
  if (!verifyCurrentAdminAuth()) {
    return { success: false, error: 'Unauthorized: Administrator sign-in required.' };
  }

  const headers = await getAdminAuthHeaders();
  const cascade = childReplyIds.length > 0 ? '?cascade=true' : '';
  const apiRes = await callCommentsApi<{ success?: boolean; error?: string }>(
    `/api/comments/${encodeURIComponent(commentId)}${cascade}`,
    {
      method: 'DELETE',
      headers
    }
  );

  if (apiRes.available && !apiRes.ok && apiRes.status !== 404) {
    return {
      success: false,
      error: apiRes.data?.error || 'Failed to delete comment.'
    };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return apiRes.available && apiRes.ok
      ? { success: true }
      : { success: false, error: 'Cloud Firestore is not configured.' };
  }

  try {
    if (childReplyIds.length > 0) {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'comments', commentId));
      for (const replyId of childReplyIds) {
        if (replyId && replyId !== commentId) {
          batch.delete(doc(db, 'comments', replyId));
        }
      }
      await batch.commit();
    } else {
      await deleteDoc(doc(db, 'comments', commentId));
    }
    return { success: true };
  } catch (err: any) {
    if (apiRes.available && apiRes.ok) {
      return { success: true };
    }
    logFirestoreCommentError(err, OperationType.DELETE, `comments/${commentId}`);
    return {
      success: false,
      error: formatFirestoreCommentError(err, 'Failed to delete comment.')
    };
  }
};
