import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Express, Request, Response } from 'express';
import express from 'express';

export const AUTHOR_SESSION_COOKIE_NAME = 'isezerano_author_session';
export const FIREBASE_PROJECT_ID = 'isezerano-news';
export const ADMIN_EMAIL = 'twizerefelix90@gmail.com';

const COMMENT_NAME_MIN_LENGTH = 2;
const COMMENT_NAME_MAX_LENGTH = 80;
const COMMENT_EMAIL_MAX_LENGTH = 160;
const COMMENT_CONTENT_MIN_LENGTH = 2;
const COMMENT_CONTENT_MAX_LENGTH = 2000;
const RATE_LIMIT_COOLDOWN_MS = 10_000;
const RATE_LIMIT_WINDOW_MS = 15 * 60_000;
const RATE_LIMIT_MAX_IN_WINDOW = 10;

export type ServerCommentStatus =
  | 'published'
  | 'approved'
  | 'hidden'
  | 'rejected'
  | 'pending';

export interface PublicCommentRecord {
  id: string;
  postId: string;
  parentId: string | null;
  replyToName: string | null;
  name: string;
  content: string;
  status: ServerCommentStatus;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
}

export interface StoredCommentRecord extends PublicCommentRecord {
  ownerSessionHash: string;
  ownerProofHash: string;
  privateEmail?: string;
}

export interface CommentsApiOptions {
  secretKey?: string;
  storeFilePath?: string;
  disableFirestoreSync?: boolean;
  verifyAdminJwt?: (token: string) => Promise<{ valid: boolean; email?: string }>;
}

interface GoogleCertCache {
  certs: Record<string, string>;
  expiresAtMs: number;
}

let cachedGoogleCerts: GoogleCertCache | null = null;

function resolveServerHmacSecret(explicitSecret?: string): string {
  if (explicitSecret && explicitSecret.trim().length >= 16) {
    return explicitSecret.trim();
  }
  const envSecret = process.env.COMMENT_TOKEN_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  const secretPath = path.join(os.tmpdir(), 'isezerano-comment-hmac.key');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated, { mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmacHex(secret: string, value: string): string {
  return crypto.createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

function constantTimeHexEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return result;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function signAuthorSessionToken(secret: string, sessionId: string): string {
  const sig = hmacHex(secret, `session:${sessionId}`);
  return `${sessionId}.${sig}`;
}

function verifyAuthorSessionCookie(secret: string, req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[AUTHOR_SESSION_COOKIE_NAME];
  if (!raw) return null;

  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0) return null;
  const sessionId = raw.slice(0, dotIdx);
  const providedSig = raw.slice(dotIdx + 1);
  if (!/^[a-f0-9]{32,64}$/i.test(sessionId) || !/^[a-f0-9]{64}$/i.test(providedSig)) {
    return null;
  }
  const expectedSig = hmacHex(secret, `session:${sessionId}`);
  if (!constantTimeHexEqual(providedSig.toLowerCase(), expectedSig.toLowerCase())) {
    return null;
  }
  return sessionId;
}

function appendAuthorSessionCookie(res: Response, req: Request, secret: string, sessionId: string): void {
  const signed = signAuthorSessionToken(secret, sessionId);
  const isHttps =
    req.secure ||
    String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';

  const parts = [
    `${AUTHOR_SESSION_COOKIE_NAME}=${encodeURIComponent(signed)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=31536000'
  ];
  if (isHttps) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function sanitizePlainText(raw: unknown, preserveNewlines = false): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/(?:javascript|vbscript|data\s*:\s*text\/html)\s*:/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  if (preserveNewlines) {
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
}

function validateCommentBody(rawContent: unknown): {
  valid: boolean;
  sanitizedContent: string;
  error?: string;
} {
  const sanitizedContent = sanitizePlainText(rawContent, true);
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
}

function validateOptionalEmail(rawEmail: unknown): {
  valid: boolean;
  sanitizedEmail: string;
  error?: string;
} {
  const cleaned = sanitizePlainText(rawEmail, false);
  if (!cleaned) return { valid: true, sanitizedEmail: '' };
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
}

function isPublicStatus(status: ServerCommentStatus): boolean {
  return status === 'published' || status === 'approved';
}

function decodeBase64Url(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

async function fetchGoogleFirebaseCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAtMs > now) {
    return cachedGoogleCerts.certs;
  }

  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public keys (${res.status})`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600_000;
  cachedGoogleCerts = {
    certs,
    expiresAtMs: now + Math.max(60_000, ttlMs)
  };
  return certs;
}

async function defaultVerifyFirebaseAdminJwt(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false };

    const header = JSON.parse(decodeBase64Url(parts[0]).toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    const payload = JSON.parse(decodeBase64Url(parts[1]).toString('utf8')) as {
      aud?: string;
      iss?: string;
      exp?: number;
      iat?: number;
      sub?: string;
      email?: string;
      email_verified?: boolean;
      firebase?: { sign_in_provider?: string };
    };

    if (header.alg !== 'RS256' || !header.kid) return { valid: false };
    if (payload.aud !== FIREBASE_PROJECT_ID) return { valid: false };
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
      return { valid: false };
    }
    if (!payload.sub || typeof payload.sub !== 'string') return { valid: false };

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= nowSec) return { valid: false };
    if (payload.iat && payload.iat > nowSec + 300) return { valid: false };

    const email = (payload.email || '').trim().toLowerCase();
    if (email !== ADMIN_EMAIL || payload.email_verified !== true) {
      return { valid: false };
    }
    if (payload.firebase?.sign_in_provider !== 'google.com') {
      return { valid: false };
    }

    const certs = await fetchGoogleFirebaseCerts();
    const cert = certs[header.kid];
    if (!cert) return { valid: false };

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    const signature = decodeBase64Url(parts[2]);
    const signatureOk = verifier.verify(cert, signature);
    if (!signatureOk) return { valid: false };

    return { valid: true, email };
  } catch {
    return { valid: false };
  }
}

async function authenticateAdminRequest(
  req: Request,
  verifyFn: (token: string) => Promise<{ valid: boolean; email?: string }>
): Promise<boolean> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  if (!token) return false;
  const result = await verifyFn(token);
  return Boolean(result.valid && result.email?.toLowerCase() === ADMIN_EMAIL);
}

// =========================================================================
// FIRESTORE REST HELPERS (READ PUBLIC COMMENTS & ATOMIC WRITE SYNC)
// =========================================================================

function decodeFirestoreString(field: any): string {
  if (!field || typeof field !== 'object') return '';
  if (typeof field.stringValue === 'string') return field.stringValue;
  if (typeof field.timestampValue === 'string') return field.timestampValue;
  return '';
}

function decodeFirestoreCommentDoc(docObj: any): PublicCommentRecord | null {
  if (!docObj || typeof docObj.name !== 'string' || !docObj.fields) return null;
  const id = docObj.name.split('/').pop() || '';
  if (!id) return null;
  const f = docObj.fields;
  const rawStatus = decodeFirestoreString(f.status);
  const status: ServerCommentStatus =
    rawStatus === 'published' ||
    rawStatus === 'approved' ||
    rawStatus === 'hidden' ||
    rawStatus === 'rejected' ||
    rawStatus === 'pending'
      ? rawStatus
      : 'published';

  const createdAt = decodeFirestoreString(f.createdAt);
  const updatedAt = decodeFirestoreString(f.updatedAt) || createdAt;
  const parentId =
    f.parentId && typeof f.parentId.stringValue === 'string' && f.parentId.stringValue.trim()
      ? f.parentId.stringValue.trim()
      : null;
  const replyToName =
    parentId &&
    f.replyToName &&
    typeof f.replyToName.stringValue === 'string' &&
    f.replyToName.stringValue.trim()
      ? sanitizePlainText(f.replyToName.stringValue)
      : null;

  return {
    id,
    postId: decodeFirestoreString(f.postId),
    parentId,
    replyToName,
    name: sanitizePlainText(decodeFirestoreString(f.name)) || 'Reader',
    content: sanitizePlainText(decodeFirestoreString(f.content), true),
    status,
    createdAt,
    updatedAt,
    edited: Boolean(f.edited?.booleanValue)
  };
}

async function fetchPublicCommentsFromFirestoreRest(
  postId?: string
): Promise<PublicCommentRecord[]> {
  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
    const statuses = ['approved', 'published'];
    const merged = new Map<string, PublicCommentRecord>();

    for (const st of statuses) {
      const filters: any[] = [
        {
          fieldFilter: {
            field: { fieldPath: 'status' },
            op: 'EQUAL',
            value: { stringValue: st }
          }
        },
        {
          fieldFilter: {
            field: { fieldPath: 'publicSafe' },
            op: 'EQUAL',
            value: { booleanValue: true }
          }
        }
      ];
      if (postId) {
        filters.push({
          fieldFilter: {
            field: { fieldPath: 'postId' },
            op: 'EQUAL',
            value: { stringValue: postId }
          }
        });
      }

      const structuredQuery: any = {
        from: [{ collectionId: 'comments' }],
        where:
          filters.length === 1
            ? filters[0]
            : { compositeFilter: { op: 'AND', filters } }
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structuredQuery }),
        signal: controller.signal
      }).finally(() => clearTimeout(timer));

      if (!res.ok) continue;
      const rows = (await res.json()) as any[];
      if (!Array.isArray(rows)) continue;
      for (const row of rows) {
        const parsed = decodeFirestoreCommentDoc(row?.document);
        if (parsed) {
          merged.set(parsed.id, parsed);
        }
      }
    }

    return Array.from(merged.values());
  } catch {
    return [];
  }
}

async function syncCreateToFirestoreRest(
  comment: PublicCommentRecord,
  ownerProof: string,
  privateEmail?: string
): Promise<boolean> {
  try {
    const docBase = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/comments/${comment.id}`;
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;

    const ownershipFields: Record<string, any> = {
      postId: { stringValue: comment.postId },
      createdAt: { stringValue: comment.createdAt },
      lastSyncedAt: { stringValue: comment.updatedAt },
      verifier: { stringValue: '' }
    };
    if (privateEmail) {
      ownershipFields.email = { stringValue: privateEmail };
    }

    const writes = [
      {
        currentDocument: { exists: false },
        update: {
          name: docBase,
          fields: {
            postId: { stringValue: comment.postId },
            parentId: comment.parentId
              ? { stringValue: comment.parentId }
              : { nullValue: null },
            replyToName: comment.replyToName
              ? { stringValue: comment.replyToName }
              : { nullValue: null },
            name: { stringValue: comment.name },
            content: { stringValue: comment.content },
            status: { stringValue: comment.status },
            createdAt: { stringValue: comment.createdAt },
            updatedAt: { stringValue: comment.updatedAt },
            edited: { booleanValue: false },
            publicSafe: { booleanValue: true }
          }
        }
      },
      {
        currentDocument: { exists: false },
        update: {
          name: `${docBase}/tokens/${ownerProof}`,
          fields: {
            postId: { stringValue: comment.postId },
            createdAt: { stringValue: comment.createdAt }
          }
        }
      },
      {
        currentDocument: { exists: false },
        update: {
          name: `${docBase}/private/ownership`,
          fields: ownershipFields
        }
      }
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    return res.ok;
  } catch {
    return false;
  }
}

async function syncUpdateToFirestoreRest(
  commentId: string,
  content: string,
  updatedAt: string,
  ownerProof: string
): Promise<boolean> {
  try {
    const docBase = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/comments/${commentId}`;
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
    const nonce = crypto.randomBytes(4).toString('hex');

    const writes = [
      {
        updateMask: { fieldPaths: ['content', 'updatedAt', 'edited'] },
        update: {
          name: docBase,
          fields: {
            content: { stringValue: content },
            updatedAt: { stringValue: updatedAt },
            edited: { booleanValue: true }
          }
        }
      },
      {
        updateMask: { fieldPaths: ['verifier', 'lastSyncedAt'] },
        update: {
          name: `${docBase}/private/ownership`,
          fields: {
            verifier: { stringValue: `${ownerProof}:${nonce}` },
            lastSyncedAt: { stringValue: updatedAt }
          }
        }
      }
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    return res.ok;
  } catch {
    return false;
  }
}

async function syncDeleteToFirestoreRest(
  commentId: string,
  ownerProof: string
): Promise<boolean> {
  try {
    const docBase = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/comments/${commentId}`;
    const commitUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
    const nonce = crypto.randomBytes(4).toString('hex');
    const deleteMarker = `deleted_${Date.now()}_${nonce}`;

    const writes = [
      {
        updateMask: { fieldPaths: ['verifier', 'lastSyncedAt'] },
        update: {
          name: `${docBase}/private/ownership`,
          fields: {
            verifier: { stringValue: `${ownerProof}:${nonce}` },
            lastSyncedAt: { stringValue: deleteMarker }
          }
        }
      },
      {
        delete: docBase
      }
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(commitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes }),
      signal: controller.signal
    }).finally(() => clearTimeout(timer));
    return res.ok;
  } catch {
    return false;
  }
}

// =========================================================================
// EXPRESS COMMENTS ROUTER FACTORY
// =========================================================================

export function mountCommentsApi(app: Express, options: CommentsApiOptions = {}): void {
  const hmacSecret = resolveServerHmacSecret(options.secretKey);
  const storePath =
    options.storeFilePath || path.join(os.tmpdir(), 'isezerano-comments-store.json');
  const verifyAdminFn = options.verifyAdminJwt || defaultVerifyFirebaseAdminJwt;

  // In-memory store backed by private tmp JSON file (never inside public/ or dist/)
  const storedComments = new Map<string, StoredCommentRecord>();
  const deletedCommentIds = new Set<string>();
  const sessionRateLimits = new Map<string, number[]>();

  const loadStoreFromDisk = () => {
    try {
      if (!fs.existsSync(storePath)) return;
      const raw = fs.readFileSync(storePath, 'utf8');
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        comments?: StoredCommentRecord[];
        deletedIds?: string[];
      };
      if (Array.isArray(parsed.comments)) {
        for (const item of parsed.comments) {
          if (item && typeof item.id === 'string') {
            storedComments.set(item.id, item);
          }
        }
      }
      if (Array.isArray(parsed.deletedIds)) {
        for (const delId of parsed.deletedIds) {
          if (typeof delId === 'string') {
            deletedCommentIds.add(delId);
          }
        }
      }
    } catch {
      // start with clean store if temp file corrupt
    }
  };

  const persistStoreToDisk = () => {
    try {
      const data = {
        comments: Array.from(storedComments.values()),
        deletedIds: Array.from(deletedCommentIds)
      };
      fs.writeFileSync(storePath, JSON.stringify(data), { mode: 0o600 });
    } catch {
      // non-fatal
    }
  };

  loadStoreFromDisk();

  const deriveCommentProof = (visitorSessionId: string, commentId: string): string =>
    hmacHex(hmacSecret, `comment-proof:${visitorSessionId}:${commentId}`);

  const isVisitorOwner = (visitorSessionId: string | null, commentId: string): boolean => {
    if (!visitorSessionId) return false;
    const record = storedComments.get(commentId);
    if (!record || !record.ownerSessionHash || !record.ownerProofHash) {
      return false;
    }
    const candidateSessionHash = sha256Hex(visitorSessionId);
    if (!constantTimeHexEqual(candidateSessionHash, record.ownerSessionHash)) {
      return false;
    }
    const candidateProof = deriveCommentProof(visitorSessionId, commentId);
    const candidateProofHash = sha256Hex(candidateProof);
    return constantTimeHexEqual(candidateProofHash, record.ownerProofHash);
  };

  const serializeForVisitor = (
    comment: PublicCommentRecord,
    visitorSessionId: string | null,
    isAdmin: boolean
  ) => {
    const owned = isVisitorOwner(visitorSessionId, comment.id);
    return {
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      replyToName: comment.replyToName,
      name: comment.name,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      edited: comment.edited,
      canEdit: owned || isAdmin,
      canDelete: owned || isAdmin
    };
  };

  const setNoStore = (res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  };

  const jsonParser = express.json({ limit: '64kb' });

  // GET /api/comments?postId=... -> Public published + legacy approved comments with server-computed permissions
  app.get('/api/comments', async (req: Request, res: Response) => {
    setNoStore(res);
    const postId = sanitizePlainText(req.query.postId, false);
    if (!postId || postId.length > 120) {
      res.status(400).json({ success: false, error: 'Valid postId is required.' });
      return;
    }

    const visitorSessionId = verifyAuthorSessionCookie(hmacSecret, req);
    const isAdmin = await authenticateAdminRequest(req, verifyAdminFn);

    const remoteDocs = options.disableFirestoreSync
      ? []
      : await fetchPublicCommentsFromFirestoreRest(postId);

    const merged = new Map<string, PublicCommentRecord>();
    for (const remote of remoteDocs) {
      if (!deletedCommentIds.has(remote.id) && remote.postId === postId && isPublicStatus(remote.status)) {
        merged.set(remote.id, remote);
      }
    }

    for (const local of storedComments.values()) {
      if (local.postId !== postId || deletedCommentIds.has(local.id)) continue;
      if (isPublicStatus(local.status)) {
        merged.set(local.id, {
          id: local.id,
          postId: local.postId,
          parentId: local.parentId,
          replyToName: local.replyToName,
          name: local.name,
          content: local.content,
          status: local.status,
          createdAt: local.createdAt,
          updatedAt: local.updatedAt,
          edited: local.edited
        });
      } else {
        // If hidden/rejected by Admin locally, ensure any stale remote copy is also hidden
        merged.delete(local.id);
      }
    }

    const comments = Array.from(merged.values()).map((c) =>
      serializeForVisitor(c, visitorSessionId, isAdmin)
    );

    res.status(200).json({ success: true, comments });
  });

  // GET /api/comments/counts -> Public live comment counts by postId
  app.get('/api/comments/counts', async (_req: Request, res: Response) => {
    setNoStore(res);
    const remoteDocs = options.disableFirestoreSync
      ? []
      : await fetchPublicCommentsFromFirestoreRest();

    const merged = new Map<string, PublicCommentRecord>();
    for (const remote of remoteDocs) {
      if (!deletedCommentIds.has(remote.id) && isPublicStatus(remote.status)) {
        merged.set(remote.id, remote);
      }
    }
    for (const local of storedComments.values()) {
      if (deletedCommentIds.has(local.id)) continue;
      if (isPublicStatus(local.status)) {
        merged.set(local.id, local);
      } else {
        merged.delete(local.id);
      }
    }

    const counts: Record<string, number> = {};
    for (const item of merged.values()) {
      if (item.postId && isPublicStatus(item.status)) {
        counts[item.postId] = (counts[item.postId] || 0) + 1;
      }
    }

    res.status(200).json({ success: true, counts });
  });

  // GET /api/comments/all -> Admin-only listing of all comments/replies across statuses
  app.get('/api/comments/all', async (req: Request, res: Response) => {
    setNoStore(res);
    const isAdmin = await authenticateAdminRequest(req, verifyAdminFn);
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Verified administrator authorization required.'
      });
      return;
    }

    const comments = Array.from(storedComments.values())
      .filter((c) => !deletedCommentIds.has(c.id))
      .map((local) => serializeForVisitor(local, null, true));

    res.status(200).json({ success: true, comments });
  });

  // POST /api/comments -> Instant public comment OR reply creation with server-issued HttpOnly ownership cookie
  app.post('/api/comments', jsonParser, async (req: Request, res: Response) => {
    setNoStore(res);
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;

    if (typeof body.honeypot === 'string' && body.honeypot.trim().length > 0) {
      res.status(400).json({ success: false, error: 'Submission blocked by spam protection.' });
      return;
    }

    const postId = sanitizePlainText(body.postId, false);
    const name = sanitizePlainText(body.name, false);
    const rawParentId =
      typeof body.parentId === 'string' ? sanitizePlainText(body.parentId, false) : '';
    const parentId = rawParentId.length > 0 ? rawParentId : null;
    const rawReplyToName =
      parentId && typeof body.replyToName === 'string'
        ? sanitizePlainText(body.replyToName, false).slice(0, COMMENT_NAME_MAX_LENGTH)
        : '';
    const replyToName = parentId && rawReplyToName ? rawReplyToName : null;

    if (!postId || postId.length > 120) {
      res.status(400).json({ success: false, error: 'Invalid article reference.' });
      return;
    }
    if (parentId && (parentId.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(parentId))) {
      res.status(400).json({ success: false, error: 'Invalid parent comment reference.' });
      return;
    }
    if (name.length < COMMENT_NAME_MIN_LENGTH || name.length > COMMENT_NAME_MAX_LENGTH) {
      res.status(400).json({
        success: false,
        error: `Please enter your name (${COMMENT_NAME_MIN_LENGTH}–${COMMENT_NAME_MAX_LENGTH} characters).`
      });
      return;
    }

    const emailCheck = validateOptionalEmail(body.email);
    if (!emailCheck.valid) {
      res.status(400).json({ success: false, error: emailCheck.error });
      return;
    }

    const bodyCheck = validateCommentBody(body.content);
    if (!bodyCheck.valid) {
      res.status(400).json({ success: false, error: bodyCheck.error });
      return;
    }

    let visitorSessionId = verifyAuthorSessionCookie(hmacSecret, req);
    let issuedNewCookie = false;
    if (!visitorSessionId) {
      visitorSessionId = crypto.randomBytes(16).toString('hex');
      issuedNewCookie = true;
    }

    // Per-session spam rate limit (does not block unrelated visitors or different browsers)
    const nowMs = Date.now();
    const recentTimestamps = (sessionRateLimits.get(visitorSessionId) || []).filter(
      (ts) => nowMs - ts < RATE_LIMIT_WINDOW_MS
    );
    if (recentTimestamps.length > 0) {
      const elapsed = nowMs - Math.max(...recentTimestamps);
      if (elapsed < RATE_LIMIT_COOLDOWN_MS && recentTimestamps.length >= 3) {
        const waitSeconds = Math.ceil((RATE_LIMIT_COOLDOWN_MS - elapsed) / 1000);
        res.status(429).json({
          success: false,
          error: `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before posting again.`
        });
        return;
      }
      if (recentTimestamps.length >= RATE_LIMIT_MAX_IN_WINDOW) {
        res.status(429).json({
          success: false,
          error: 'Too many comments posted recently. Please wait a few minutes.'
        });
        return;
      }
    }

    const createdAt = new Date(nowMs).toISOString();
    const commentId = `cmt_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const ownerProof = deriveCommentProof(visitorSessionId, commentId);

    const record: StoredCommentRecord = {
      id: commentId,
      postId,
      parentId,
      replyToName,
      name,
      content: bodyCheck.sanitizedContent,
      status: 'published',
      createdAt,
      updatedAt: createdAt,
      edited: false,
      ownerSessionHash: sha256Hex(visitorSessionId),
      ownerProofHash: sha256Hex(ownerProof),
      ...(emailCheck.sanitizedEmail ? { privateEmail: emailCheck.sanitizedEmail } : {})
    };

    storedComments.set(commentId, record);
    persistStoreToDisk();

    recentTimestamps.push(nowMs);
    sessionRateLimits.set(visitorSessionId, recentTimestamps);

    if (!options.disableFirestoreSync) {
      void syncCreateToFirestoreRest(record, ownerProof, emailCheck.sanitizedEmail || undefined);
    }

    if (issuedNewCookie || verifyAuthorSessionCookie(hmacSecret, req) === visitorSessionId) {
      appendAuthorSessionCookie(res, req, hmacSecret, visitorSessionId);
    }

    res.status(201).json({
      success: true,
      comment: serializeForVisitor(record, visitorSessionId, false)
    });
  });

  // PATCH /api/comments/:commentId -> Author-only edit (or verified Admin)
  app.patch('/api/comments/:commentId', jsonParser, async (req: Request, res: Response) => {
    setNoStore(res);
    const commentId = String(req.params.commentId || '').trim();
    if (!commentId || !/^[a-zA-Z0-9_-]+$/.test(commentId)) {
      res.status(400).json({ success: false, error: 'Invalid comment ID.' });
      return;
    }

    const visitorSessionId = verifyAuthorSessionCookie(hmacSecret, req);
    const isAdmin = await authenticateAdminRequest(req, verifyAdminFn);
    const owned = isVisitorOwner(visitorSessionId, commentId);

    if (!owned && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Only the original author of this comment may edit it.'
      });
      return;
    }

    const existing = storedComments.get(commentId);
    if (!existing || deletedCommentIds.has(commentId)) {
      res.status(404).json({ success: false, error: 'Comment not found.' });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const bodyCheck = validateCommentBody(body.content);
    if (!bodyCheck.valid) {
      res.status(400).json({ success: false, error: bodyCheck.error });
      return;
    }

    const prevMs = new Date(existing.updatedAt || existing.createdAt).getTime() || 0;
    const nextIso = new Date(Math.max(Date.now(), prevMs + 1)).toISOString();

    const updated: StoredCommentRecord = {
      ...existing,
      content: bodyCheck.sanitizedContent,
      updatedAt: nextIso,
      edited: true
    };
    storedComments.set(commentId, updated);
    persistStoreToDisk();

    if (!options.disableFirestoreSync && visitorSessionId && owned) {
      const ownerProof = deriveCommentProof(visitorSessionId, commentId);
      void syncUpdateToFirestoreRest(commentId, bodyCheck.sanitizedContent, nextIso, ownerProof);
    }

    res.status(200).json({
      success: true,
      comment: serializeForVisitor(updated, visitorSessionId, isAdmin)
    });
  });

  // PATCH /api/comments/:commentId/moderate -> Admin-only post-publication moderation
  app.patch('/api/comments/:commentId/moderate', jsonParser, async (req: Request, res: Response) => {
    setNoStore(res);
    const isAdmin = await authenticateAdminRequest(req, verifyAdminFn);
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Administrator authorization is required to moderate comments.'
      });
      return;
    }

    const commentId = String(req.params.commentId || '').trim();
    const existing = storedComments.get(commentId);
    if (!existing || deletedCommentIds.has(commentId)) {
      res.status(404).json({ success: false, error: 'Comment not found.' });
      return;
    }

    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    const nextStatus = body.status;
    if (
      nextStatus !== 'published' &&
      nextStatus !== 'approved' &&
      nextStatus !== 'hidden' &&
      nextStatus !== 'rejected' &&
      nextStatus !== 'pending'
    ) {
      res.status(400).json({ success: false, error: 'Invalid moderation status.' });
      return;
    }

    const updated: StoredCommentRecord = {
      ...existing,
      status: nextStatus
    };
    storedComments.set(commentId, updated);
    persistStoreToDisk();

    res.status(200).json({
      success: true,
      comment: serializeForVisitor(updated, null, true)
    });
  });

  // DELETE /api/comments/:commentId -> Author-only delete (or verified Admin)
  app.delete('/api/comments/:commentId', async (req: Request, res: Response) => {
    setNoStore(res);
    const commentId = String(req.params.commentId || '').trim();
    if (!commentId || !/^[a-zA-Z0-9_-]+$/.test(commentId)) {
      res.status(400).json({ success: false, error: 'Invalid comment ID.' });
      return;
    }

    const visitorSessionId = verifyAuthorSessionCookie(hmacSecret, req);
    const isAdmin = await authenticateAdminRequest(req, verifyAdminFn);
    const owned = isVisitorOwner(visitorSessionId, commentId);

    if (!owned && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Only the original author of this comment may delete it.'
      });
      return;
    }

    const existing = storedComments.get(commentId);
    if (!existing || deletedCommentIds.has(commentId)) {
      res.status(404).json({ success: false, error: 'Comment not found.' });
      return;
    }

    const cascade = isAdmin && req.query.cascade === 'true';
    const deletedIds = [commentId];
    storedComments.delete(commentId);
    deletedCommentIds.add(commentId);

    if (cascade) {
      for (const [candidateId, candidate] of storedComments.entries()) {
        if (candidate.parentId === commentId) {
          storedComments.delete(candidateId);
          deletedCommentIds.add(candidateId);
          deletedIds.push(candidateId);
        }
      }
    }

    persistStoreToDisk();

    if (!options.disableFirestoreSync && visitorSessionId && owned) {
      const ownerProof = deriveCommentProof(visitorSessionId, commentId);
      void syncDeleteToFirestoreRest(commentId, ownerProof);
    }

    res.status(200).json({
      success: true,
      deletedIds
    });
  });

  // Explicitly reject unsupported methods on /api/comments*
  app.all('/api/comments*', (_req: Request, res: Response) => {
    setNoStore(res);
    res.status(405).json({ success: false, error: 'Method not allowed.' });
  });
}
