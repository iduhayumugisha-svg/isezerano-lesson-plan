import { BlogPost } from '../types/blog';

/**
 * Checks whether a string is a valid, persistent image source (HTTPS URL or embedded Data URI).
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
 * Rejects temporary blob: URLs and preserves Data URIs and HTTPS Storage URLs verbatim.
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

  if (trimmed.startsWith('http://')) {
    const upgraded = 'https://' + trimmed.slice(7);
    return isValidPersistentImageSrc(upgraded) ? upgraded : '';
  }

  if (trimmed.startsWith('https://')) {
    return isValidPersistentImageSrc(trimmed) ? trimmed : '';
  }

  return '';
}

/**
 * Resolves the single authoritative thumbnail for an article card or featured banner.
 * Strictly returns the article's own uploaded thumbnail or '' if none was provided.
 * Never substitutes another article's image or external stock photos.
 */
export function getSingleArticleThumbnailUrl(
  post?: { thumbnailUrl?: string | null } | null
): string {
  if (!post) return '';
  return normalizeThumbnailSrc(post.thumbnailUrl);
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
 * Preserves the article's own thumbnail cleanly when saving.
 */
export function sanitizePostThumbnail(post: BlogPost): BlogPost {
  const cleanThumb = normalizeThumbnailSrc(post.thumbnailUrl);
  return {
    ...post,
    thumbnailUrl: cleanThumb,
    thumbnailAlt: (post.thumbnailAlt || `${post.title} – Featured Image`).trim()
  };
}
