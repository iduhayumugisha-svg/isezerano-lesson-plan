import { Buffer } from 'node:buffer';
import process from 'node:process';
import type { Request, Response } from 'express';
import type { BlogPost } from '../src/types/blog.ts';
import type { WebsiteBrandingSettings } from '../src/types/websiteDesign.ts';

export const FIREBASE_PROJECT_ID = 'isezerano-news';
export const DEFAULT_PUBLIC_ORIGIN = 'https://isezerano.online';
export const DEFAULT_SITE_TITLE = 'ISEZERANO ONLINE – GS GITUMBA';
export const DEFAULT_SITE_DESCRIPTION =
  'ISEZERANO ONLINE – Rwanda CBC lesson planning, nursery report cards, education resources and articles for teachers and educators.';

export interface DecodedImageAsset {
  buffer: Buffer;
  mimeType: string;
  ext: string;
  width?: number;
  height?: number;
}

export interface OgDataProviders {
  fetchPosts?: () => Promise<BlogPost[]>;
  fetchBranding?: () => Promise<Partial<WebsiteBrandingSettings> | null>;
  publicDir?: string;
}

/**
 * Escapes HTML special characters for safe inclusion inside HTML attributes and tags.
 */
export function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strips HTML tags and normalizes whitespace into a clean plain-text excerpt.
 */
export function extractPlainText(html: string, maxLength: number = 160): string {
  if (!html) return '';
  const plain = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength - 1).trimEnd() + '…';
}

export function isPublicHttpsImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.length < 12) return false;
  if (
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:') ||
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1')
  ) {
    return false;
  }
  return trimmed.startsWith('https://');
}

export function extractRawImageField(field: unknown): string {
  if (typeof field === 'string') return field.trim();
  if (field && typeof field === 'object') {
    const obj = field as Record<string, unknown>;
    const candidate = obj.url ?? obj.src ?? obj.secure_url ?? obj.href;
    if (typeof candidate === 'string') return candidate.trim();
  }
  return '';
}

export function normalizePersistentImageSrc(rawSrc: string | null | undefined): string {
  if (!rawSrc || typeof rawSrc !== 'string') return '';
  const trimmed = rawSrc.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('blob:') || trimmed.startsWith('file:')) return '';
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) return '';
  if (trimmed.startsWith('data:image/')) {
    return trimmed.includes(';base64,') ? trimmed : '';
  }
  if (trimmed.startsWith('//')) {
    const upgraded = `https:${trimmed}`;
    return upgraded.length >= 12 ? upgraded : '';
  }
  if (trimmed.startsWith('http://')) {
    const upgraded = 'https://' + trimmed.slice(7);
    return upgraded.length >= 12 ? upgraded : '';
  }
  if (trimmed.startsWith('https://')) {
    return trimmed.length >= 12 ? trimmed : '';
  }
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && trimmed.length > 1) {
    return trimmed;
  }
  return '';
}

function getServerHtmlAttr(tag: string, attrName: string): string {
  const doubleMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*"([^"]*)"`, 'i'));
  if (doubleMatch) return doubleMatch[1];
  const singleMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*'([^']*)'`, 'i'));
  if (singleMatch) return singleMatch[1];
  const unquotedMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*([^\\s"'=<>` + '`]+)', 'i'));
  if (unquotedMatch) return unquotedMatch[1];
  return '';
}

function parseServerPixelDim(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.endsWith('%')) return null;
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  if (!numMatch) return null;
  return Number(numMatch[1]);
}

export function isDecorativeOrIconImgTag(tag: string, normalizedSrc: string): boolean {
  const lowerSrc = normalizedSrc.toLowerCase();
  if (lowerSrc.startsWith('data:image/svg+xml') || /\.svg(?:$|\?)/i.test(lowerSrc)) {
    return true;
  }

  const ariaHidden = getServerHtmlAttr(tag, 'aria-hidden').toLowerCase();
  if (ariaHidden === 'true') return true;

  const roleAttr = getServerHtmlAttr(tag, 'role').toLowerCase();
  if (roleAttr === 'presentation' || roleAttr === 'none') return true;

  if (/\bdata-(?:decorative|icon|emoji)\s*=\s*["']?true["']?/i.test(tag)) {
    return true;
  }

  const widthAttr = parseServerPixelDim(getServerHtmlAttr(tag, 'width'));
  const heightAttr = parseServerPixelDim(getServerHtmlAttr(tag, 'height'));
  if ((widthAttr !== null && widthAttr < 40) || (heightAttr !== null && heightAttr < 40)) {
    return true;
  }

  const styleAttr = getServerHtmlAttr(tag, 'style');
  if (styleAttr) {
    const styleW = styleAttr.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i);
    const styleH = styleAttr.match(/(?:^|;)\s*height\s*:\s*(\d+(?:\.\d+)?)px/i);
    if ((styleW && Number(styleW[1]) < 40) || (styleH && Number(styleH[1]) < 40)) {
      return true;
    }
  }

  const isBlogEditorImage = /\bdata-(?:size-preset|width|height|align)\s*=/i.test(tag);
  if (!isBlogEditorImage) {
    const classAttr = getServerHtmlAttr(tag, 'class');
    const idAttr = getServerHtmlAttr(tag, 'id');
    if (
      /\b(emoji|twemoji|wp-smiley|icon|favicon|badge|decorative|spacer|avatar-icon|logo)\b/i.test(
        `${classAttr} ${idAttr}`
      )
    ) {
      return true;
    }
    if (
      /(?:favicon|\/icons?\/|twemoji|wp-includes\/images\/|1x1|pixel\.|(?:^|\/|[-_])logo(?:[-_.]|$))/i.test(
        lowerSrc
      )
    ) {
      return true;
    }
  }

  return false;
}

export function extractFirstContentImage(htmlContent: string | null | undefined): string {
  if (!htmlContent || typeof htmlContent !== 'string') return '';
  const imgTagRegex = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgTagRegex.exec(htmlContent)) !== null) {
    const tag = match[0];
    const candidates = [
      getServerHtmlAttr(tag, 'src'),
      getServerHtmlAttr(tag, 'data-src'),
      getServerHtmlAttr(tag, 'data-lazy-src'),
      getServerHtmlAttr(tag, 'data-original'),
      getServerHtmlAttr(tag, 'srcset').split(',')[0]?.trim().split(/\s+/)[0] || ''
    ];
    for (const rawCandidate of candidates) {
      const normalized = normalizePersistentImageSrc(rawCandidate);
      if (normalized && !isDecorativeOrIconImgTag(tag, normalized)) {
        return normalized;
      }
    }
  }
  return '';
}

export function resolveExplicitPostCoverSource(post?: Partial<BlogPost> | null): string {
  if (!post) return '';
  const fields: unknown[] = [
    post.thumbnailUrl,
    post.featuredImage,
    post.coverImage,
    post.imageUrl,
    post.bannerImage,
    post.image
  ];
  for (const field of fields) {
    const norm = normalizePersistentImageSrc(extractRawImageField(field));
    if (norm) return norm;
  }
  return '';
}

/**
 * Resolves a single post's authoritative thumbnail source (identical to client `getSingleArticleThumbnailUrl`):
 * 1. Explicit custom cover ONLY when `post.thumbnailIsCustomOverride === true` and an explicit cover field is valid.
 * 2. Otherwise, always prefer the first actual non-decorative article image inside `post.content`.
 * 3. Otherwise, fall back to valid `thumbnailUrl` / `featuredImage` / `coverImage` / `image`.
 * 4. Otherwise, return '' (omits article-specific social image metadata rather than substituting a default image).
 */
export function resolvePostThumbnailSource(post?: Partial<BlogPost> | null): string {
  if (!post) return '';
  const explicit = resolveExplicitPostCoverSource(post);
  if (post.thumbnailIsCustomOverride === true && explicit) {
    return explicit;
  }
  if (post.content) {
    const firstContentImg = extractFirstContentImage(post.content);
    if (firstContentImg) return firstContentImg;
  }
  return explicit;
}

/**
 * Sniffs binary image magic headers so downloads with `application/octet-stream` Content-Type still resolve accurately.
 */
export function sniffImageMimeFromBuffer(
  buffer: Buffer
): { mimeType: string; ext: string } | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: 'jpg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mimeType: 'image/png', ext: 'png' };
  }
  // GIF: GIF87a / GIF89a
  const hdr6 = buffer.subarray(0, 6).toString('ascii');
  if (hdr6 === 'GIF87a' || hdr6 === 'GIF89a') {
    return { mimeType: 'image/gif', ext: 'gif' };
  }
  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * Parses JPEG, PNG, GIF, or WebP pixel dimensions cleanly from binary image headers.
 */
export function readImageDimensionsFromBuffer(
  buffer: Buffer,
  mimeType: string
): { width?: number; height?: number } {
  try {
    if (mimeType === 'image/png' && buffer.length >= 24) {
      if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width > 0 && height > 0) return { width, height };
      }
    }

    if (mimeType === 'image/gif' && buffer.length >= 10) {
      const hdr = buffer.subarray(0, 6).toString('ascii');
      if (hdr === 'GIF87a' || hdr === 'GIF89a') {
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        if (width > 0 && height > 0) return { width, height };
      }
    }

    if (
      mimeType === 'image/webp' &&
      buffer.length >= 30 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      const chunk = buffer.subarray(12, 16).toString('ascii');
      if (chunk === 'VP8X' && buffer.length >= 30) {
        const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
        const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
        if (width > 0 && height > 0) return { width, height };
      } else if (chunk === 'VP8 ' && buffer.length >= 30) {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      } else if (chunk === 'VP8L' && buffer.length >= 25) {
        const bits = buffer.readUInt32LE(21);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        if (width > 0 && height > 0) return { width, height };
      }
    }

    if (
      (mimeType === 'image/jpeg' || mimeType === 'image/jpg') &&
      buffer.length >= 4 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8
    ) {
      let offset = 2;
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        if (
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf)
        ) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (width > 0 && height > 0) return { width, height };
          break;
        }
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
          offset += 2;
          continue;
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        if (segmentLength < 2) break;
        offset += 2 + segmentLength;
      }
    }
  } catch {
    // ignore malformed header
  }
  return {};
}

export function safeFileSlug(rawSlug: string): string {
  const cleaned = String(rawSlug || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'article';
}

export function computeBytesHash8(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Decodes a `data:image/<mime>;base64,<payload>` string into a binary Buffer and MIME metadata.
 */
export function decodeImageDataUri(dataUri: string): DecodedImageAsset | null {
  if (!dataUri || typeof dataUri !== 'string') return null;
  const match = dataUri.match(
    /^data:(image\/[a-zA-Z0-9.+-]+)(?:;[a-zA-Z0-9=_-]+)*;base64,([A-Za-z0-9+/=\s]+)$/i
  );
  if (!match) return null;

  const rawMime = match[1].toLowerCase();
  const base64Data = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length === 0) return null;

  const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
  if (mimeType === 'image/svg+xml') {
    // Social crawlers (WhatsApp, Facebook, Telegram) do not render SVG og:image files
    return null;
  }

  const ext =
    mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
      ? 'webp'
      : mimeType === 'image/gif'
      ? 'gif'
      : 'jpg';

  const dims = readImageDimensionsFromBuffer(buffer, mimeType);
  return {
    buffer,
    mimeType,
    ext,
    width: dims.width,
    height: dims.height
  };
}

/**
 * Converts a Cloud Firestore REST API Value object into plain JS types.
 */
function parseFirestoreRestValue(val: Record<string, any> | undefined): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values || [];
    return values.map((v: any) => parseFirestoreRestValue(v));
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreRestValue(v as Record<string, any>);
    }
    return out;
  }
  return undefined;
}

function parseFirestoreDocument(docJson: { name?: string; fields?: Record<string, any> }): Record<string, any> {
  const out: Record<string, any> = {};
  const fields = docJson.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = parseFirestoreRestValue(v);
  }
  if (!out.id && docJson.name) {
    out.id = docJson.name.split('/').pop() || '';
  }
  return out;
}

// Short TTL cache so rapid crawler bursts (WhatsApp + Facebook fetching HTML + image within 1s)
// avoid redundant Firestore REST calls while still reflecting updates promptly.
let postsCache: { data: BlogPost[]; fetchedAt: number } | null = null;
let brandingCache: { data: Partial<WebsiteBrandingSettings> | null; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 10_000;

export function clearOgMetaCache(): void {
  postsCache = null;
  brandingCache = null;
}

/**
 * Fetches published Blog posts from public Cloud Firestore REST API (no secret credentials required).
 * Uses compact page sizes (25) with per-page retries and 15s timeout so large embedded-image posts never time out or drop trailing pages.
 */
export async function fetchPublishedBlogPostsFromFirestore(
  projectId: string = FIREBASE_PROJECT_ID,
  timeoutMs: number = 15000
): Promise<BlogPost[]> {
  if (postsCache && Date.now() - postsCache.fetchedAt < CACHE_TTL_MS) {
    return postsCache.data;
  }

  const allPosts: BlogPost[] = [];
  let pageToken = '';

  const fetchPageWithRetry = async (token: string): Promise<{
    documents?: Array<{ name?: string; fields?: Record<string, any> }>;
    nextPageToken?: string;
  } | null> => {
    const url = new URL(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/posts`
    );
    url.searchParams.set('pageSize', '25');
    if (token) {
      url.searchParams.set('pageToken', token);
    }

    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: { Accept: 'application/json' }
        });
        clearTimeout(timer);
        if (!res.ok) {
          console.warn(`[SEO/OG] Firestore REST page fetch HTTP ${res.status} (attempt ${attempt}).`);
          if (attempt < 2 && res.status >= 500) {
            await new Promise((r) => setTimeout(r, 400));
            continue;
          }
          return null;
        }
        return (await res.json()) as {
          documents?: Array<{ name?: string; fields?: Record<string, any> }>;
          nextPageToken?: string;
        };
      } catch (err) {
        clearTimeout(timer);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 400));
          continue;
        }
        throw err;
      }
    }
    return null;
  };

  try {
    do {
      const json = await fetchPageWithRetry(pageToken);
      if (!json) break;

      for (const docItem of json.documents || []) {
        const parsed = parseFirestoreDocument(docItem) as BlogPost;
        if (String(parsed.status || '').trim().toLowerCase() === 'published') {
          allPosts.push({ ...parsed, status: 'published' });
        }
      }

      pageToken = json.nextPageToken || '';
    } while (pageToken);

    allPosts.sort((a, b) => {
      const tA = Date.parse(a.publishedAt || a.updatedAt || '') || 0;
      const tB = Date.parse(b.publishedAt || b.updatedAt || '') || 0;
      return tB - tA;
    });

    postsCache = { data: allPosts, fetchedAt: Date.now() };
    return allPosts;
  } catch (err) {
    console.warn('[SEO/OG] Could not query Firestore posts via REST:', err);
    return postsCache?.data || allPosts;
  }
}

/**
 * Fetches website branding settings from Cloud Firestore REST API (`appSettings/website_design`).
 */
export async function fetchWebsiteBrandingFromFirestore(
  projectId: string = FIREBASE_PROJECT_ID,
  timeoutMs: number = 3500
): Promise<Partial<WebsiteBrandingSettings> | null> {
  if (brandingCache && Date.now() - brandingCache.fetchedAt < CACHE_TTL_MS) {
    return brandingCache.data;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/appSettings/website_design`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = (await res.json()) as { name?: string; fields?: Record<string, any> };
    const parsed = parseFirestoreDocument(json);
    const branding = (parsed.branding || null) as Partial<WebsiteBrandingSettings> | null;
    brandingCache = { data: branding, fetchedAt: Date.now() };
    return branding;
  } catch {
    return brandingCache?.data || null;
  }
}

/**
 * Resolves a public HTTPS origin for canonical `og:url` and `og:image` tags.
 * Never outputs `http://localhost`, `127.0.0.1`, or authenticated `ais-dev-*` preview proxy hostnames.
 */
export function resolvePublicOrigin(req?: Request): string {
  const configured = (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '');
  if (configured.startsWith('https://')) {
    return configured;
  }

  if (req) {
    const fwdProtoRaw = String(req.headers['x-forwarded-proto'] || req.protocol || '')
      .split(',')[0]
      .trim()
      .toLowerCase();
    const fwdHostRaw = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();

    if (
      fwdProtoRaw === 'https' &&
      fwdHostRaw &&
      !fwdHostRaw.includes('localhost') &&
      !fwdHostRaw.includes('127.0.0.1') &&
      !fwdHostRaw.startsWith('ais-dev-')
    ) {
      return `https://${fwdHostRaw}`;
    }
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

export function resolveBrandingTitleAndDesc(
  branding?: Partial<WebsiteBrandingSettings> | null
): { fullTitle: string; siteDescription: string } {
  const rawName = (branding?.platformTitle || '').trim();
  const rawSub = (branding?.platformSubtitle || '').trim();
  const rawDesc = (branding?.websiteDescription || '').trim();

  const fullTitle = rawName
    ? rawSub && !rawName.toLowerCase().includes(rawSub.toLowerCase())
      ? `${rawName} – ${rawSub}`
      : rawName
    : DEFAULT_SITE_TITLE;

  const siteDescription = rawDesc || DEFAULT_SITE_DESCRIPTION;
  return { fullTitle, siteDescription };
}

/**
 * Resolves whether an incoming request URL targets a specific Blog article (`/blog/:slug`,
 * `/blog?post=:slug`, or `/?post=:slug`) or the Blog index (`/blog`).
 */
export function parseBlogRoute(rawUrl: string): {
  isBlogArticle: boolean;
  isBlogIndex: boolean;
  slugOrId: string | null;
} {
  try {
    const parsed = new URL(rawUrl || '/', 'https://isezerano.online');
    const pathname = parsed.pathname;
    const lowerPath = pathname.toLowerCase();

    if (lowerPath.startsWith('/blog/')) {
      const slug = decodeURIComponent(pathname.slice('/blog/'.length)).replace(/\/+$/, '');
      if (slug) {
        return { isBlogArticle: true, isBlogIndex: false, slugOrId: slug };
      }
    }

    const postQuery = (parsed.searchParams.get('post') || '').trim();
    if (postQuery && (lowerPath === '/' || lowerPath === '/blog' || lowerPath === '/blog/')) {
      return { isBlogArticle: true, isBlogIndex: false, slugOrId: postQuery };
    }

    if (lowerPath === '/blog' || lowerPath === '/blog/') {
      return { isBlogArticle: false, isBlogIndex: true, slugOrId: null };
    }
  } catch {
    // ignore malformed URL
  }
  return { isBlogArticle: false, isBlogIndex: false, slugOrId: null };
}

/**
 * Strips existing generic `<title>`, `<meta>`, `<link rel="canonical">`, and JSON-LD tags
 * cleanly so article-specific or site-specific metadata never duplicates homepage tags.
 */
function stripExistingSeoHeadTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/gi, '')
    .replace(/<meta\b[^>]*\bname\s*=\s*["']description["'][^>]*>\s*/gi, '')
    .replace(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>\s*/gi, '')
    .replace(/<meta\b[^>]*\bproperty\s*=\s*["'](?:og|article):[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta\b[^>]*\bname\s*=\s*["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
}

function injectHeadBlock(templateHtml: string, headBlock: string): string {
  const cleaned = stripExistingSeoHeadTags(templateHtml);
  const headCloseIdx = cleaned.search(/<\/head>/i);
  if (headCloseIdx === -1) {
    return `${headBlock}\n${cleaned}`;
  }
  return `${cleaned.slice(0, headCloseIdx)}${headBlock}\n  ${cleaned.slice(headCloseIdx)}`;
}

/**
 * Builds complete initial HTML containing article-specific Open Graph, Twitter Card,
 * and Schema.org JSON-LD metadata readable without JavaScript.
 */
export function renderBlogArticleHtml(
  templateHtml: string,
  post: BlogPost,
  origin: string,
  branding?: Partial<WebsiteBrandingSettings> | null,
  options?: {
    overrideImageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    imageMimeType?: string;
  }
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const { fullTitle: siteName } = resolveBrandingTitleAndDesc(branding);

  const articleTitle = (post.title || 'Article').trim();
  const pageTitle = `${articleTitle} – ${siteName}`;
  const description =
    (post.excerpt || '').trim() ||
    extractPlainText(post.content || '', 160) ||
    articleTitle;
  const articleUrl = `${cleanOrigin}/blog/${encodeURIComponent(post.slug || post.id)}`;

  const rawThumb = resolvePostThumbnailSource(post);
  const decodedData = rawThumb.startsWith('data:image/') ? decodeImageDataUri(rawThumb) : null;

  let imageUrl = options?.overrideImageUrl || '';
  let imageWidth = options?.imageWidth;
  let imageHeight = options?.imageHeight;
  let imageMime = options?.imageMimeType;

  if (!imageUrl) {
    if (isPublicHttpsImageUrl(rawThumb)) {
      imageUrl = rawThumb;
    } else if (decodedData) {
      const fileSlug = safeFileSlug(post.slug || post.id);
      const hash8 = computeBytesHash8(decodedData.buffer);
      imageUrl = `${cleanOrigin}/og-blog/${encodeURIComponent(`${fileSlug}-${hash8}.${decodedData.ext}`)}`;
      imageWidth = decodedData.width;
      imageHeight = decodedData.height;
      imageMime = decodedData.mimeType;
    } else if (rawThumb.startsWith('/') && !rawThumb.startsWith('//') && !/\.svg(?:$|\?)/i.test(rawThumb)) {
      imageUrl = `${cleanOrigin}${rawThumb}`;
    } else {
      imageUrl = '';
      imageWidth = undefined;
      imageHeight = undefined;
      imageMime = undefined;
    }
  }

  const hasImage = Boolean(imageUrl);
  const imageAlt = (post.thumbnailAlt || articleTitle).trim();
  const authorName = post.author?.name || 'GS GITUMBA Editorial Team';
  const authorRole = post.author?.role || 'Educator';

  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': articleUrl
    },
    headline: articleTitle,
    description,
    ...(hasImage ? { image: [imageUrl] } : {}),
    datePublished: post.publishedAt || post.updatedAt || '',
    dateModified: post.updatedAt || post.publishedAt || '',
    author: {
      '@type': 'Person',
      name: authorName,
      jobTitle: authorRole
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: siteName
    }
  };

  const optionalDimTags = [
    hasImage && imageMime ? `    <meta property="og:image:type" content="${escapeHtml(imageMime)}" />` : '',
    hasImage && imageWidth && imageHeight
      ? `    <meta property="og:image:width" content="${imageWidth}" />\n    <meta property="og:image:height" content="${imageHeight}" />`
      : ''
  ]
    .filter(Boolean)
    .join('\n');

  const articleTags = [
    `    <title>${escapeHtml(pageTitle)}</title>`,
    `    <meta name="description" content="${escapeHtml(description)}" />`,
    `    <link rel="canonical" href="${escapeHtml(articleUrl)}" />`,
    `    <meta property="og:type" content="article" />`,
    `    <meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    `    <meta property="og:title" content="${escapeHtml(articleTitle)}" />`,
    `    <meta property="og:description" content="${escapeHtml(description)}" />`,
    hasImage ? `    <meta property="og:image" content="${escapeHtml(imageUrl)}" />` : '',
    hasImage ? `    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />` : '',
    optionalDimTags,
    hasImage ? `    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />` : '',
    `    <meta property="og:url" content="${escapeHtml(articleUrl)}" />`,
    post.publishedAt
      ? `    <meta property="article:published_time" content="${escapeHtml(post.publishedAt)}" />`
      : '',
    post.updatedAt
      ? `    <meta property="article:modified_time" content="${escapeHtml(post.updatedAt)}" />`
      : '',
    post.category
      ? `    <meta property="article:section" content="${escapeHtml(post.category)}" />`
      : '',
    `    <meta name="twitter:card" content="${hasImage ? 'summary_large_image' : 'summary'}" />`,
    `    <meta name="twitter:title" content="${escapeHtml(articleTitle)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(description)}" />`,
    hasImage ? `    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : '',
    hasImage ? `    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />` : '',
    `    <script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2).replace(/</g, '\\u003c')}\n    </script>`
  ]
    .filter(Boolean)
    .join('\n');

  return injectHeadBlock(templateHtml, articleTags);
}

/**
 * Renders homepage or section-level HTML retaining the website's own title and description cleanly.
 */
export function renderWebsiteDefaultHtml(
  templateHtml: string,
  origin: string,
  branding?: Partial<WebsiteBrandingSettings> | null,
  pagePath: string = '/',
  pageTitlePrefix?: string
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const { fullTitle, siteDescription } = resolveBrandingTitleAndDesc(branding);
  const resolvedTitle = pageTitlePrefix ? `${pageTitlePrefix} – ${fullTitle}` : fullTitle;
  const normalizedPath = pagePath.startsWith('/') ? pagePath : `/${pagePath}`;
  const canonicalUrl = `${cleanOrigin}${normalizedPath}`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: fullTitle,
    alternateName: branding?.platformTitle?.trim() || 'ISEZERANO ONLINE',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'All',
    description: siteDescription,
    url: `${cleanOrigin}/`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RWF'
    },
    creator: {
      '@type': 'Organization',
      name: branding?.schoolName?.trim() || 'GS GITUMBA',
      location: {
        '@type': 'Place',
        name:
          branding?.schoolLocation?.trim() ||
          'Buyoga Sector, Rulindo District, Northern Province, Rwanda'
      }
    }
  };

  const headBlock = [
    `    <title>${escapeHtml(resolvedTitle)}</title>`,
    `    <meta name="description" content="${escapeHtml(siteDescription)}" />`,
    `    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:site_name" content="${escapeHtml(fullTitle)}" />`,
    `    <meta property="og:title" content="${escapeHtml(resolvedTitle)}" />`,
    `    <meta property="og:description" content="${escapeHtml(siteDescription)}" />`,
    `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `    <meta name="twitter:card" content="summary_large_image" />`,
    `    <meta name="twitter:title" content="${escapeHtml(resolvedTitle)}" />`,
    `    <meta name="twitter:description" content="${escapeHtml(siteDescription)}" />`,
    `    <script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2).replace(/</g, '\\u003c')}\n    </script>`
  ].join('\n');

  return injectHeadBlock(templateHtml, headBlock);
}

/**
 * Matches a published blog post by slug (preferred) or ID. Never returns drafts or unpublished posts.
 */
export function findPublishedPostBySlugOrId(
  posts: BlogPost[],
  slugOrId: string | null | undefined
): BlogPost | null {
  if (!slugOrId) return null;
  const target = slugOrId.trim().toLowerCase();
  if (!target) return null;
  return (
    posts.find(
      (p) =>
        String(p.status || '').trim().toLowerCase() === 'published' &&
        ((p.slug || '').trim().toLowerCase() === target ||
          (p.id || '').trim().toLowerCase() === target ||
          safeFileSlug(p.slug || p.id).toLowerCase() === target)
    ) || null
  );
}

/**
 * Route handler serving public HTTPS/HTTP binary thumbnails for published Blog articles
 * at `/og-blog/:slugOrFile` without requiring login, cookies, or JavaScript.
 */
export async function handleBlogOgImageRequest(
  req: Request,
  res: Response,
  providers: OgDataProviders = {}
): Promise<void> {
  const rawParam = String(req.params.slugOrFile || '');
  const decodedParam = decodeURIComponent(rawParam).trim();
  const baseWithoutExt = decodedParam.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '').trim();
  const baseWithoutHashAndExt = decodedParam
    .replace(/-[0-9a-f]{8}\.(jpg|jpeg|png|webp|gif)$/i, '')
    .trim();

  if (!baseWithoutExt) {
    res.status(404).type('text/plain').send('Article image not found.');
    return;
  }

  const loadPosts = providers.fetchPosts || (() => fetchPublishedBlogPostsFromFirestore());
  const posts = await loadPosts();
  const post =
    findPublishedPostBySlugOrId(posts, baseWithoutExt) ||
    findPublishedPostBySlugOrId(posts, baseWithoutHashAndExt);

  if (!post) {
    res.status(404).type('text/plain').send('Published article not found.');
    return;
  }

  const thumbSrc = resolvePostThumbnailSource(post);

  // Case 1: Embedded Data URI stored in Firestore (Spark free tier)
  if (thumbSrc.startsWith('data:image/')) {
    const decoded = decodeImageDataUri(thumbSrc);
    if (decoded) {
      res.status(200);
      res.setHeader('Content-Type', decoded.mimeType);
      res.setHeader('Content-Length', String(decoded.buffer.length));
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.send(decoded.buffer);
      }
      return;
    }
  }

  // Case 2: External HTTPS thumbnail (e.g., Firebase Storage download URL)
  if (isPublicHttpsImageUrl(thumbSrc)) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const upstream = await fetch(thumbSrc, { signal: controller.signal });
      clearTimeout(timer);

      if (upstream.ok) {
        const rawType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const arrayBuf = await upstream.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const sniffed = sniffImageMimeFromBuffer(buf);
        const contentType = rawType.startsWith('image/') && rawType !== 'image/svg+xml'
          ? rawType === 'image/jpg'
            ? 'image/jpeg'
            : rawType
          : sniffed?.mimeType || '';
        if (contentType && buf.length > 0) {
          res.status(200);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', String(buf.length));
          res.setHeader('Cache-Control', 'public, max-age=300');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          if (req.method === 'HEAD') {
            res.end();
          } else {
            res.send(buf);
          }
          return;
        }
      }
    } catch {
      // Fall through to 302 redirect if upstream fetch fails from server network
    }
    res.redirect(302, thumbSrc);
    return;
  }

  // Case 3: Article has no custom or inline image -> return 404 (never substitute a deleted default image)
  res.status(404).type('text/plain').send('No thumbnail available.');
}
