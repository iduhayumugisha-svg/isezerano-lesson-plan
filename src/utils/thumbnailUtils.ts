import { BlogPost } from '../types/blog';

const GENERIC_BRANDING_THUMBNAIL_PATTERN =
  /(?:^|\/)(?:og-default|og-isezerano-online|isezerano-online-logo|og-branding|site-logo(?:-[0-9a-f]{8})?|isezerano[-_ %20]+online[-_ %20]+logo)\.(?:jpe?g|png|webp|gif|svg)(?:[?#]|$)/i;

const GENERIC_WEBSITE_DESC_CORES = [
  'independent digital news breaking updates features and community information',
  'independent digital news and updates',
  'independent digital news updates'
];

const FIREBASE_DEFAULT_HOSTS = new Set([
  'isezerano-news.firebaseapp.com',
  'isezerano-news.web.app'
]);

let registeredDisallowedBrandingUrls: string[] = [];
let registeredDisallowedSiteDescriptions: string[] = [];

export function setDisallowedArticleBrandingUrls(
  urls: Array<string | null | undefined>
): void {
  registeredDisallowedBrandingUrls = urls
    .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u) => u.trim());
}

export function setDisallowedArticleSiteDescriptions(
  descriptions: Array<string | null | undefined>
): void {
  registeredDisallowedSiteDescriptions = descriptions
    .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
    .map((d) => d.trim());
}

function normalizeDescriptionForMatch(raw: string): string {
  return String(raw || '')
    .toLowerCase()
    .replace(/[\u2013\u2014-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function safeDecodeUrlText(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function normalizeUrlForBrandingComparison(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (FIREBASE_DEFAULT_HOSTS.has(host)) {
      return `https://isezerano.online${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    if (parsed.protocol === 'http:' && host === 'isezerano.online') {
      return `https://isezerano.online${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // ignore non-absolute URLs
  }
  return trimmed;
}

/**
 * Detects whether text is the generic website description (with or without site-name prefix,
 * commas, dashes, or trailing period) or matches an explicitly configured site description.
 */
export function isGenericWebsiteDescriptionText(
  text: string | null | undefined,
  extraSiteDescriptions: Array<string | null | undefined> = []
): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  const normalized = normalizeDescriptionForMatch(trimmed);
  if (!normalized) return false;

  for (const core of GENERIC_WEBSITE_DESC_CORES) {
    if (
      normalized === core ||
      normalized === `isezerano online ${core}` ||
      normalized === `isezerano ${core}` ||
      normalized.includes(core)
    ) {
      return true;
    }
  }

  for (const cand of [...registeredDisallowedSiteDescriptions, ...extraSiteDescriptions]) {
    if (!cand || typeof cand !== 'string') continue;
    const candNorm = normalizeDescriptionForMatch(cand);
    if (candNorm && normalized === candNorm) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether an image source matches known generic SEO/branding banners or the website's own logo.
 */
export function isGenericBrandingThumbnailUrl(
  src: string | null | undefined,
  extraDisallowedUrls: Array<string | null | undefined> = []
): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  const decoded = safeDecodeUrlText(trimmed);
  const normalized = normalizeUrlForBrandingComparison(trimmed);
  const decodedNormalized = safeDecodeUrlText(normalized);

  if (
    GENERIC_BRANDING_THUMBNAIL_PATTERN.test(trimmed) ||
    GENERIC_BRANDING_THUMBNAIL_PATTERN.test(decoded) ||
    GENERIC_BRANDING_THUMBNAIL_PATTERN.test(normalized) ||
    GENERIC_BRANDING_THUMBNAIL_PATTERN.test(decodedNormalized)
  ) {
    return true;
  }

  for (const blocked of [...registeredDisallowedBrandingUrls, ...extraDisallowedUrls]) {
    if (typeof blocked !== 'string' || !blocked.trim()) continue;
    const blockedTrimmed = blocked.trim();
    const blockedNorm = normalizeUrlForBrandingComparison(blockedTrimmed);
    if (
      trimmed === blockedTrimmed ||
      normalized === blockedTrimmed ||
      trimmed === blockedNorm ||
      normalized === blockedNorm
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts a string URL/Data URI from either a direct string or an object map like `{ url }`.
 */
export function extractRawImageFieldValue(field: unknown): string {
  if (typeof field === 'string') return field.trim();
  if (field && typeof field === 'object') {
    const obj = field as Record<string, unknown>;
    const candidate = obj.url ?? obj.src ?? obj.secure_url ?? obj.href;
    if (typeof candidate === 'string') return candidate.trim();
  }
  return '';
}

/**
 * Checks whether a string is a valid, persistent image source (HTTPS URL, relative asset path, or embedded Data URI).
 * Strictly rejects temporary blob: URLs, file: URLs, and localhost URLs.
 */
export function isValidPersistentImageSrc(src: string | null | undefined): boolean {
  if (!src || typeof src !== 'string') return false;
  const trimmed = src.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
    return false;
  }
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    return false;
  }

  if (trimmed.startsWith('data:image/')) {
    return trimmed.includes(';base64,') || trimmed.includes('image/svg+xml');
  }

  if (trimmed.startsWith('https://')) {
    return trimmed.length >= 12;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && trimmed.length > 1) {
    return true;
  }

  return false;
}

/**
 * Checks whether a given string is a valid, absolute HTTPS image URL suitable for external crawlers.
 */
export function isValidHttpsImageUrl(url: string | null | undefined): boolean {
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

/**
 * Normalizes a persistent image source without substituting any external stock URLs.
 * Rejects temporary blob: URLs and preserves Data URIs, relative paths, and HTTPS Storage URLs cleanly.
 */
export function normalizeThumbnailSrc(rawSrc: string | null | undefined): string {
  if (!rawSrc || typeof rawSrc !== 'string') return '';
  const trimmed = rawSrc.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('blob:') || trimmed.startsWith('file:')) {
    return '';
  }

  if (trimmed.startsWith('data:image/')) {
    return isValidPersistentImageSrc(trimmed) ? trimmed : '';
  }

  if (trimmed.startsWith('//')) {
    const upgraded = `https:${trimmed}`;
    return isValidPersistentImageSrc(upgraded) ? upgraded : '';
  }

  if (trimmed.startsWith('http://')) {
    const upgraded = 'https://' + trimmed.slice(7);
    return isValidPersistentImageSrc(upgraded) ? upgraded : '';
  }

  if (trimmed.startsWith('https://')) {
    return isValidPersistentImageSrc(trimmed) ? trimmed : '';
  }

  if (trimmed.startsWith('/')) {
    return isValidPersistentImageSrc(trimmed) ? trimmed : '';
  }

  return '';
}

function getHtmlAttr(tag: string, attrName: string): string {
  const doubleMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*"([^"]*)"`, 'i'));
  if (doubleMatch) return doubleMatch[1];
  const singleMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*'([^']*)'`, 'i'));
  if (singleMatch) return singleMatch[1];
  const unquotedMatch = tag.match(new RegExp(`\\b${attrName}\\s*=\\s*([^\\s"'=<>` + '`]+)', 'i'));
  if (unquotedMatch) return unquotedMatch[1];
  return '';
}

function parseExplicitPixelDim(raw: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed.endsWith('%')) return null;
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  if (!numMatch) return null;
  return Number(numMatch[1]);
}

/**
 * Determines whether an `<img>` tag in rich-text article HTML is a decorative icon,
 * emoji, spacer pixel, logo/badge, or hidden element rather than an actual article photo.
 */
export function isDecorativeOrIconImgTag(tag: string, normalizedSrc: string): boolean {
  const lowerSrc = normalizedSrc.toLowerCase();
  if (
    lowerSrc.startsWith('data:image/svg+xml') ||
    /\.svg(?:$|\?)/i.test(lowerSrc) ||
    isGenericBrandingThumbnailUrl(normalizedSrc)
  ) {
    return true;
  }

  const ariaHidden = getHtmlAttr(tag, 'aria-hidden').toLowerCase();
  if (ariaHidden === 'true') return true;

  const roleAttr = getHtmlAttr(tag, 'role').toLowerCase();
  if (roleAttr === 'presentation' || roleAttr === 'none') return true;

  if (/\bdata-(?:decorative|icon|emoji)\s*=\s*["']?true["']?/i.test(tag)) {
    return true;
  }

  const widthAttr = parseExplicitPixelDim(getHtmlAttr(tag, 'width'));
  const heightAttr = parseExplicitPixelDim(getHtmlAttr(tag, 'height'));
  if ((widthAttr !== null && widthAttr < 40) || (heightAttr !== null && heightAttr < 40)) {
    return true;
  }

  const styleAttr = getHtmlAttr(tag, 'style');
  if (styleAttr) {
    const styleW = styleAttr.match(/(?:^|;)\s*width\s*:\s*(\d+(?:\.\d+)?)px/i);
    const styleH = styleAttr.match(/(?:^|;)\s*height\s*:\s*(\d+(?:\.\d+)?)px/i);
    if ((styleW && Number(styleW[1]) < 40) || (styleH && Number(styleH[1]) < 40)) {
      return true;
    }
  }

  const isBlogEditorImage = /\bdata-(?:size-preset|width|height|align)\s*=/i.test(tag);
  if (!isBlogEditorImage) {
    const classAttr = getHtmlAttr(tag, 'class');
    const idAttr = getHtmlAttr(tag, 'id');
    if (/\b(emoji|twemoji|wp-smiley|icon|favicon|badge|decorative|spacer|avatar-icon|logo)\b/i.test(`${classAttr} ${idAttr}`)) {
      return true;
    }
    if (/(?:favicon|\/icons?\/|twemoji|wp-includes\/images\/|1x1|pixel\.|(?:^|\/|[-_])logo(?:[-_.]|$))/i.test(lowerSrc)) {
      return true;
    }
  }

  return false;
}

function getImgCandidateSrc(tag: string): string {
  const candidates = [
    getHtmlAttr(tag, 'src'),
    getHtmlAttr(tag, 'data-src'),
    getHtmlAttr(tag, 'data-lazy-src'),
    getHtmlAttr(tag, 'data-original')
  ];
  for (const cand of candidates) {
    const norm = normalizeThumbnailSrc(cand);
    if (norm) return norm;
  }
  const srcset = getHtmlAttr(tag, 'srcset');
  if (srcset) {
    const firstUrl = srcset.split(',')[0]?.trim().split(/\s+/)[0] || '';
    const norm = normalizeThumbnailSrc(firstUrl);
    if (norm) return norm;
  }
  return '';
}

/**
 * Extracts the first valid, non-decorative article image (src + alt) in exact document order
 * from an article's rich-text HTML content.
 */
export function extractFirstImageMetaFromContent(
  htmlContent: string | null | undefined,
  disallowedUrls: Array<string | null | undefined> = []
): { src: string; alt: string } | null {
  if (!htmlContent || typeof htmlContent !== 'string') return null;

  const imgTagRegex = /<img\b[^>]*>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = imgTagRegex.exec(htmlContent)) !== null) {
    const tag = tagMatch[0];
    const normalized = getImgCandidateSrc(tag);
    if (
      normalized &&
      !isDecorativeOrIconImgTag(tag, normalized) &&
      !isGenericBrandingThumbnailUrl(normalized, disallowedUrls)
    ) {
      return {
        src: normalized,
        alt: getHtmlAttr(tag, 'alt').trim()
      };
    }
  }

  return null;
}

/**
 * Convenience helper returning only the normalized URL/Data URI of the first actual article image in content.
 */
export function extractFirstImageFromContent(
  htmlContent: string | null | undefined,
  disallowedUrls: Array<string | null | undefined> = []
): string {
  return extractFirstImageMetaFromContent(htmlContent, disallowedUrls)?.src || '';
}

/**
 * Resolves the first explicit cover field on a BlogPost across canonical and legacy field names
 * (`thumbnailUrl`, `featuredImage`, `coverImage`, `imageUrl`, `bannerImage`, `image`).
 * Rejects SVG assets, generic branding banners, and the website's own logo.
 */
export function resolveExplicitPostCoverField(
  post?: Partial<BlogPost> | null,
  disallowedUrls: Array<string | null | undefined> = []
): string {
  if (!post) return '';
  const fields: unknown[] = [
    post.thumbnailUrl,
    post.featuredImage,
    post.coverImage,
    post.imageUrl,
    post.bannerImage,
    post.image
  ];
  for (const f of fields) {
    const raw = extractRawImageFieldValue(f);
    const norm = normalizeThumbnailSrc(raw);
    if (
      norm &&
      !norm.toLowerCase().startsWith('data:image/svg+xml') &&
      !/\.svg(?:[?#]|$)/i.test(norm) &&
      !isGenericBrandingThumbnailUrl(norm, disallowedUrls)
    ) {
      return norm;
    }
  }
  return '';
}

/**
 * Single authoritative thumbnail resolution rule shared across Blog cards, Preview,
 * client SEO tags, SSR HTML tags, and static `dist/og-blog/` builds:
 *
 * 1. If `post.thumbnailIsCustomOverride === true` and an explicit cover field is valid -> custom cover.
 * 2. Otherwise, always use the first actual article image inside `post.content`
 *    (so an older/stale cover field never overrides the article's real first image).
 * 3. Otherwise, fall back to valid `thumbnailUrl` / `featuredImage` / `coverImage` / `image`.
 * 4. Otherwise -> '' (never substitutes a generic branding image or website logo).
 */
export function getSingleArticleThumbnailUrl(
  post?: Partial<BlogPost> | null,
  disallowedUrls: Array<string | null | undefined> = []
): string {
  if (!post) return '';
  const explicit = resolveExplicitPostCoverField(post, disallowedUrls);
  if (post.thumbnailIsCustomOverride === true && explicit) {
    return explicit;
  }
  if (post.content) {
    const firstContentImg = extractFirstImageFromContent(post.content, disallowedUrls);
    if (firstContentImg) return firstContentImg;
  }
  return explicit;
}

/**
 * Deterministic 8-hex-char FNV-1a fingerprint over exact binary image bytes (Uint8Array).
 * Used identically by client SEO metadata and static build pre-rendering so filenames
 * and metadata URLs always bind to the exact image bytes and bust stale CDN caches.
 */
export function computeUint8ArrayHash8(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeImageDataUriHash8(dataUri: string): string {
  const match = dataUri.match(
    /^data:image\/[a-zA-Z0-9.+-]+(?:;[a-zA-Z0-9=_-]+)*;base64,([A-Za-z0-9+/=\s]+)$/i
  );
  if (match) {
    const b64 = match[1].replace(/\s+/g, '');
    if (typeof atob === 'function') {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return computeUint8ArrayHash8(bytes);
    }
    if (typeof Buffer !== 'undefined') {
      return computeUint8ArrayHash8(Buffer.from(b64, 'base64'));
    }
  }
  const encoded = new TextEncoder().encode(dataUri);
  return computeUint8ArrayHash8(encoded);
}

/**
 * Estimates UTF-8 byte length of a string or serializable object cleanly across Node and browsers.
 */
export function estimateUtf8Bytes(input: unknown): number {
  const str = typeof input === 'string' ? input : JSON.stringify(input);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return unescape(encodeURIComponent(str)).length;
}

/**
 * Strips HTML tags and computes a clean plain-text excerpt.
 */
export function extractPlainTextExcerpt(htmlContent: string, maxLength: number = 160): string {
  if (!htmlContent) return '';
  const plain = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength - 1).trimEnd() + '…';
}

/**
 * Returns an article's own excerpt or body-text summary for article cards and SEO metadata.
 * Rejects any generic website description and returns '' when the article has no valid summary.
 */
export function getArticleCardExcerpt(
  post?: Pick<Partial<BlogPost>, 'excerpt' | 'content'> | null,
  maxLength: number = 160,
  extraSiteDescriptions: Array<string | null | undefined> = []
): string {
  if (!post) return '';
  const rawExcerpt = (post.excerpt || '').trim();
  if (rawExcerpt && !isGenericWebsiteDescriptionText(rawExcerpt, extraSiteDescriptions)) {
    return rawExcerpt;
  }
  const contentExcerpt = extractPlainTextExcerpt(post.content || '', maxLength);
  if (contentExcerpt && !isGenericWebsiteDescriptionText(contentExcerpt, extraSiteDescriptions)) {
    return contentExcerpt;
  }
  return '';
}

/**
 * Automatically derives and preserves the article's thumbnail before saving:
 * - If `thumbnailIsCustomOverride` is true and an explicit cover exists, keep the custom cover.
 * - Otherwise, automatically use the first actual image inside `post.content` if one exists,
 *   or keep the fallback cover field if provided, or cleanly persist '' (for default placeholder).
 */
export function sanitizePostThumbnail(post: BlogPost): BlogPost {
  const explicitThumb = resolveExplicitPostCoverField(post);
  const firstContentImg = extractFirstImageMetaFromContent(post.content);

  let resolvedThumb = '';
  let resolvedAlt = (post.thumbnailAlt || '').trim();
  const hasExplicitCustom = Boolean(post.thumbnailIsCustomOverride && explicitThumb);

  if (hasExplicitCustom) {
    resolvedThumb = explicitThumb;
  } else if (firstContentImg) {
    resolvedThumb = firstContentImg.src;
    if (!resolvedAlt && firstContentImg.alt) {
      resolvedAlt = firstContentImg.alt;
    }
  } else {
    resolvedThumb = explicitThumb;
  }

  return {
    ...post,
    thumbnailUrl: resolvedThumb,
    thumbnailIsCustomOverride: hasExplicitCustom,
    thumbnailAlt: resolvedAlt || `${post.title} – Featured Image`
  };
}
