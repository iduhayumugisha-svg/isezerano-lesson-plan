import { BlogPost } from '../types/blog';
import { WebsiteBrandingSettings } from '../types/websiteDesign';
import {
  computeImageDataUriHash8,
  computeUint8ArrayHash8,
  extractPlainTextExcerpt,
  getSingleArticleThumbnailUrl,
  isValidHttpsImageUrl
} from '../utils/thumbnailUtils';

export const DEFAULT_SEO_TITLE = 'ISEZERANO ONLINE';
export const DEFAULT_SEO_DESCRIPTION =
  'ISEZERANO ONLINE – Independent digital news, breaking updates, features, and community information.';
export const DEFAULT_CANONICAL_ORIGIN = 'https://isezerano.online';

const FIREBASE_DEFAULT_HOSTNAMES = new Set([
  'isezerano-news.firebaseapp.com',
  'isezerano-news.web.app'
]);

/**
 * Always returns the official public domain for SEO, canonical tags, og:url,
 * and shared article URLs regardless of which preview or default Hosting domain served the page.
 */
export const getCanonicalPublicOrigin = (): string => DEFAULT_CANONICAL_ORIGIN;

/**
 * Returns a safe https://isezerano.online redirect URL only when visitors access
 * Firebase Hosting default domains (`isezerano-news.firebaseapp.com` or `isezerano-news.web.app`),
 * while preserving `/__/auth/*` and all preview/local environments untouched.
 */
export const resolveCanonicalDomainRedirectUrl = (
  locationLike?: {
    hostname?: string;
    pathname?: string;
    search?: string;
    hash?: string;
  } | null
): string | null => {
  if (!locationLike) return null;
  const hostname = (locationLike.hostname || '').trim().toLowerCase();
  if (!FIREBASE_DEFAULT_HOSTNAMES.has(hostname)) {
    return null;
  }
  const pathname = locationLike.pathname || '/';
  if (pathname.startsWith('/__/')) {
    return null;
  }
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${DEFAULT_CANONICAL_ORIGIN}${normalizedPath}${locationLike.search || ''}${locationLike.hash || ''}`;
};

const normalizePublicImageUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (FIREBASE_DEFAULT_HOSTNAMES.has(host)) {
      return `${DEFAULT_CANONICAL_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // ignore relative or malformed URLs
  }
  return trimmed;
};

const GENERIC_BRANDING_IMAGE_PATTERN =
  /(?:^|\/)(?:og-default|og-isezerano-online|isezerano-online-logo|og-branding|site-logo(?:-[0-9a-f]{8})?)\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i;

const isSvgImageSource = (url: string): boolean => {
  const lower = url.trim().toLowerCase();
  return lower.startsWith('data:image/svg+xml') || /\.svg(?:[?#]|$)/i.test(lower);
};

const resolveHomepageDataUriLogoUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('data:image/') || isSvgImageSource(trimmed) || !trimmed.includes(';base64,')) {
    return '';
  }
  const ext = trimmed.startsWith('data:image/png')
    ? 'png'
    : trimmed.startsWith('data:image/webp')
    ? 'webp'
    : trimmed.startsWith('data:image/gif')
    ? 'gif'
    : 'jpg';
  return `${DEFAULT_CANONICAL_ORIGIN}/og-blog/${encodeURIComponent(
    `site-logo-${computeImageDataUriHash8(trimmed)}.${ext}`
  )}`;
};

/**
 * Identifies unwanted generic website branding assets or an explicit homepage logo URL
 * so they can never be emitted as an individual article's social preview thumbnail.
 */
export const isGenericBrandingImageUrl = (
  url: string | null | undefined,
  disallowedUrls: Array<string | null | undefined> = []
): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const normalized = normalizePublicImageUrl(trimmed);

  if (
    GENERIC_BRANDING_IMAGE_PATTERN.test(trimmed) ||
    GENERIC_BRANDING_IMAGE_PATTERN.test(normalized)
  ) {
    return true;
  }

  for (const blocked of disallowedUrls) {
    if (!blocked || typeof blocked !== 'string') continue;
    const blockedTrimmed = blocked.trim();
    if (!blockedTrimmed) continue;
    const blockedNorm = normalizePublicImageUrl(blockedTrimmed);
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
};

const BASE_URL = DEFAULT_CANONICAL_ORIGIN;

export interface SiteBrandingSeoInput {
  siteName?: string;
  siteDescription?: string;
  subtitle?: string;
}

export const resolveSiteBrandingSeo = (branding?: Partial<WebsiteBrandingSettings> | SiteBrandingSeoInput): {
  siteName: string;
  fullTitle: string;
  siteDescription: string;
} => {
  const b = (branding || {}) as Partial<WebsiteBrandingSettings> & SiteBrandingSeoInput;
  const rawName = (b.siteName ?? b.platformTitle ?? '').trim();
  const rawSub = (b.subtitle ?? b.platformSubtitle ?? '').trim();
  const rawDesc = (b.siteDescription ?? b.websiteDescription ?? '').trim();

  const siteName = rawName || 'ISEZERANO ONLINE';
  const fullTitle = rawName
    ? rawSub && !rawName.toLowerCase().includes(rawSub.toLowerCase())
      ? `${rawName} – ${rawSub}`
      : rawName
    : DEFAULT_SEO_TITLE;

  const siteDescription = rawDesc || DEFAULT_SEO_DESCRIPTION;
  return { siteName, fullTitle, siteDescription };
};

const queryAllMatchingElements = (selector: string): Element[] => {
  if (typeof document === 'undefined') return [];
  if (typeof document.querySelectorAll === 'function') {
    return Array.from(document.querySelectorAll(selector));
  }
  const single = document.querySelector(selector);
  return single ? [single] : [];
};

const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
  if (typeof document === 'undefined') return;

  const selector = `meta[${attributeName}="${attributeValue}"]`;
  const existing = queryAllMatchingElements(selector) as HTMLMetaElement[];

  if (!content) {
    for (const el of existing) {
      el.remove();
    }
    return;
  }

  const target = existing[0] || document.createElement('meta');
  if (existing.length === 0) {
    target.setAttribute(attributeName, attributeValue);
    document.head.appendChild(target);
  } else {
    for (let i = 1; i < existing.length; i++) {
      existing[i].remove();
    }
  }
  target.setAttribute('content', content);
};

const setLinkTag = (rel: string, href: string) => {
  if (typeof document === 'undefined') return;

  const selector = `link[rel="${rel}"]`;
  const existing = queryAllMatchingElements(selector) as HTMLLinkElement[];
  const target = existing[0] || document.createElement('link');
  if (existing.length === 0) {
    target.setAttribute('rel', rel);
    document.head.appendChild(target);
  } else {
    for (let i = 1; i < existing.length; i++) {
      existing[i].remove?.();
    }
  }
  target.setAttribute('href', href);
};

/**
 * Updates global browser title, meta description, OpenGraph, and Twitter tags
 * dynamically from Admin branding settings for non-article pages.
 * Homepage may optionally pass an explicit HTTPS branding image via `siteLogoUrl`;
 * when omitted or invalid, social image tags are cleanly removed so no stale image persists.
 */
export const updateWebsiteBrandingSeo = (
  branding?: Partial<WebsiteBrandingSettings> | SiteBrandingSeoInput,
  pageTitlePrefix?: string,
  siteLogoUrl?: string
): void => {
  if (typeof document === 'undefined') return;

  const { fullTitle, siteDescription } = resolveSiteBrandingSeo(branding);
  const resolvedTitle = pageTitlePrefix ? `${pageTitlePrefix} – ${fullTitle}` : fullTitle;
  const pageUrl = `${BASE_URL}/`;
  const rawLogo =
    isValidHttpsImageUrl(siteLogoUrl) && !isSvgImageSource(siteLogoUrl!)
      ? normalizePublicImageUrl(siteLogoUrl!)
      : resolveHomepageDataUriLogoUrl(siteLogoUrl);
  const customLogo = isGenericBrandingImageUrl(rawLogo) && !/\/og-blog\/site-logo-/i.test(rawLogo) ? '' : rawLogo;

  document.title = resolvedTitle;
  setMetaTag('name', 'description', siteDescription);
  setLinkTag('canonical', pageUrl);

  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', fullTitle);
  setMetaTag('property', 'og:title', resolvedTitle);
  setMetaTag('property', 'og:description', siteDescription);
  setMetaTag('property', 'og:url', pageUrl);
  setMetaTag('property', 'og:image', customLogo);
  setMetaTag('property', 'og:image:secure_url', customLogo);
  setMetaTag('property', 'og:image:type', '');
  setMetaTag('property', 'og:image:width', '');
  setMetaTag('property', 'og:image:height', '');
  setMetaTag('property', 'og:image:alt', customLogo ? siteDescription : '');

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', resolvedTitle);
  setMetaTag('name', 'twitter:description', siteDescription);
  setMetaTag('name', 'twitter:image', customLogo);
  setMetaTag('name', 'twitter:image:alt', customLogo ? siteDescription : '');

  const scriptTag = document.getElementById('blog-post-schema-jsonld');
  if (scriptTag) {
    scriptTag.remove();
  }
};

let registeredWebsiteLogoUrl = '';

/**
 * Registers the current website logo URL so `updateBlogPostSeo` always excludes it
 * without affecting homepage branding behavior.
 */
export const setRegisteredWebsiteLogoUrl = (logoUrl: string | null | undefined): void => {
  registeredWebsiteLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : '';
};

/**
 * Updates SEO, OpenGraph, Twitter Cards, and Schema.org metadata for a blog post.
 * Uses the article's first actual image (or explicit HTTPS image); strictly rejects generic branding
 * assets or site logos and omits article image metadata completely when image-free.
 */
export const updateBlogPostSeo = (
  post: BlogPost,
  branding?: Partial<WebsiteBrandingSettings> | SiteBrandingSeoInput,
  disallowedBrandingUrls: Array<string | null | undefined> = []
): void => {
  if (typeof document === 'undefined') return;

  const effectiveDisallowedUrls = registeredWebsiteLogoUrl
    ? [...disallowedBrandingUrls, registeredWebsiteLogoUrl]
    : disallowedBrandingUrls;

  const { fullTitle } = resolveSiteBrandingSeo(branding);
  const pageTitle = `${post.title} – ${fullTitle}`;
  const postUrl = `${BASE_URL}/blog/${encodeURIComponent(post.slug || post.id)}`;
  const rawThumb = getSingleArticleThumbnailUrl(post);
  const thumb =
    rawThumb &&
    !isSvgImageSource(rawThumb) &&
    !isGenericBrandingImageUrl(rawThumb, effectiveDisallowedUrls)
      ? rawThumb
      : '';
  const cleanedSlug =
    (post.slug || post.id || 'article')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/^-+|-+$/g, '') || 'article';
  const rawSlug =
    cleanedSlug.length <= 140
      ? cleanedSlug
      : `${cleanedSlug.slice(0, 130).replace(/-+$/g, '')}-${computeUint8ArrayHash8(
          new TextEncoder().encode(cleanedSlug)
        )}`;
  const dataUriExt = thumb.startsWith('data:image/png')
    ? 'png'
    : thumb.startsWith('data:image/webp')
    ? 'webp'
    : thumb.startsWith('data:image/gif')
    ? 'gif'
    : 'jpg';
  const candidateArticleImage = isValidHttpsImageUrl(thumb)
    ? normalizePublicImageUrl(thumb)
    : thumb.startsWith('data:image/') && !thumb.startsWith('data:image/svg+xml')
    ? `${BASE_URL}/og-blog/${encodeURIComponent(
        `${rawSlug}-${computeImageDataUriHash8(thumb)}.${dataUriExt}`
      )}`
    : thumb.startsWith('/') && !thumb.startsWith('//') && !/\.svg(?:$|\?)/i.test(thumb)
    ? `${BASE_URL}${thumb}`
    : '';
  const ogHttpsImage =
    candidateArticleImage &&
    !isSvgImageSource(candidateArticleImage) &&
    !isGenericBrandingImageUrl(candidateArticleImage, effectiveDisallowedUrls)
      ? candidateArticleImage
      : '';
  const hasArticleImage = Boolean(ogHttpsImage);
  const { siteDescription } = resolveSiteBrandingSeo(branding);
  const rawExcerpt = (post.excerpt || '').trim();
  const isGenericExcerpt =
    !rawExcerpt ||
    rawExcerpt.toLowerCase() === DEFAULT_SEO_DESCRIPTION.toLowerCase() ||
    rawExcerpt.toLowerCase() === siteDescription.toLowerCase();
  const description =
    (!isGenericExcerpt ? rawExcerpt : '') ||
    extractPlainTextExcerpt(post.content || '', 160) ||
    post.title;

  document.title = pageTitle;
  setMetaTag('name', 'description', description);
  setLinkTag('canonical', postUrl);

  setMetaTag('property', 'og:type', 'article');
  setMetaTag('property', 'og:site_name', fullTitle);
  setMetaTag('property', 'og:title', post.title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', postUrl);
  setMetaTag('property', 'og:image', ogHttpsImage);
  setMetaTag('property', 'og:image:secure_url', ogHttpsImage);
  setMetaTag('property', 'og:image:alt', hasArticleImage ? (post.thumbnailAlt || post.title) : '');
  setMetaTag('property', 'og:image:type', '');
  setMetaTag('property', 'og:image:width', '');
  setMetaTag('property', 'og:image:height', '');

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', post.title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', ogHttpsImage);
  setMetaTag('name', 'twitter:image:alt', hasArticleImage ? (post.thumbnailAlt || post.title) : '');

  let scriptTag = document.getElementById('blog-post-schema-jsonld') as HTMLScriptElement | null;
  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.id = 'blog-post-schema-jsonld';
    scriptTag.type = 'application/ld+json';
    document.head.appendChild(scriptTag);
  }

  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl
    },
    headline: post.title,
    description,
    ...(ogHttpsImage ? { image: [ogHttpsImage] } : {}),
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'ISEZERANO Editorial Team',
      jobTitle: post.author?.role || 'Editor'
    },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: fullTitle
    }
  };

  scriptTag.textContent = JSON.stringify(structuredData, null, 2);
};

export const updateMissingArticleSeo = (
  slugOrId: string,
  branding?: Partial<WebsiteBrandingSettings> | SiteBrandingSeoInput
): void => {
  if (typeof document === 'undefined') return;
  const { fullTitle } = resolveSiteBrandingSeo(branding);
  const cleaned = String(slugOrId || '').trim().replace(/\/+$/, '').replace(/\.html$/i, '');
  const articleUrl = cleaned ? `${BASE_URL}/blog/${encodeURIComponent(cleaned)}` : `${BASE_URL}/blog`;
  const title = `Article Not Available – ${fullTitle}`;
  const description = `This article is currently unavailable or unpublished on ${fullTitle}.`;

  document.title = title;
  setMetaTag('name', 'description', description);
  setLinkTag('canonical', articleUrl);

  setMetaTag('property', 'og:type', 'article');
  setMetaTag('property', 'og:site_name', fullTitle);
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', articleUrl);
  setMetaTag('property', 'og:image', '');
  setMetaTag('property', 'og:image:secure_url', '');
  setMetaTag('property', 'og:image:alt', '');

  setMetaTag('name', 'twitter:card', 'summary');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', '');
  setMetaTag('name', 'twitter:image:alt', '');

  const scriptTag = document.getElementById('blog-post-schema-jsonld');
  if (scriptTag) {
    scriptTag.remove();
  }
};

export const resetDefaultSeo = (
  branding?: Partial<WebsiteBrandingSettings> | SiteBrandingSeoInput,
  siteLogoUrl?: string
): void => {
  updateWebsiteBrandingSeo(branding, undefined, siteLogoUrl);
};

