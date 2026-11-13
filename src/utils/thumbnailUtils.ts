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
 * Extracts the first valid persistent image (src + alt) inserted inside an article's HTML content.
 * Used to automatically set the article's thumbnail from its first image without double-uploading.
 */
export function extractFirstImageMetaFromContent(
  htmlContent: string | null | undefined
): { src: string; alt: string } | null {
  if (!htmlContent || typeof htmlContent !== 'string') return null;

  const imgTagRegex = /<img\b[^>]*>/gi;
  let tagMatch: RegExpExecArray | null;

  while ((tagMatch = imgTagRegex.exec(htmlContent)) !== null) {
    const tag = tagMatch[0];
    const srcMatch =
      tag.match(/\bsrc\s*=\s*"([^"]+)"/i) ||
      tag.match(/\bsrc\s*=\s*'([^']+)'/i);

    if (srcMatch && srcMatch[1]) {
      const normalized = normalizeThumbnailSrc(srcMatch[1]);
      if (normalized) {
        const altMatch =
          tag.match(/\balt\s*=\s*"([^"]*)"/i) ||
          tag.match(/\balt\s*=\s*'([^']*)'/i);
        return {
          src: normalized,
          alt: (altMatch?.[1] || '').trim()
        };
      }
    }
  }

  return null;
}

/**
 * Convenience helper returning only the normalized URL/Data URI of the first image in content.
 */
export function extractFirstImageFromContent(htmlContent: string | null | undefined): string {
  return extractFirstImageMetaFromContent(htmlContent)?.src || '';
}

/**
 * Resolves the single authoritative thumbnail for an article card or preview.
 * Priority:
 * 1. Valid persistent `post.thumbnailUrl` (if explicitly set / stored)
 * 2. Automatic fallback to the first valid image inside `post.content`
 * 3. '' (empty string -> UI displays a clean default placeholder)
 *
 * Never substitutes another article's image or external stock photos.
 */
export function getSingleArticleThumbnailUrl(
  post?: { thumbnailUrl?: string | null; content?: string | null } | null
): string {
  if (!post) return '';
  const direct = normalizeThumbnailSrc(post.thumbnailUrl);
  if (direct) return direct;
  if (post.content) {
    return extractFirstImageFromContent(post.content);
  }
  return '';
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
 * Automatically derives and preserves the article's thumbnail before saving:
 * - If `thumbnailIsCustomOverride` is true and `thumbnailUrl` is valid, keep the custom cover.
 * - Otherwise, automatically use the first image inside `post.content` if one exists,
 *   or keep `thumbnailUrl` if provided, or cleanly persist '' (for default placeholder).
 */
export function sanitizePostThumbnail(post: BlogPost): BlogPost {
  const explicitThumb = normalizeThumbnailSrc(post.thumbnailUrl);
  const firstContentImg = extractFirstImageMetaFromContent(post.content);

  let resolvedThumb = '';
  let resolvedAlt = (post.thumbnailAlt || '').trim();

  if (post.thumbnailIsCustomOverride && explicitThumb) {
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
    thumbnailAlt: resolvedAlt || `${post.title} – Featured Image`
  };
}
