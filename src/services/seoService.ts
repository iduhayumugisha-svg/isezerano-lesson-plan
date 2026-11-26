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
export const DEFAULT_OG_IMAGE_PATH = '/og-default.jpg';
export const DEFAULT_OG_IMAGE_WIDTH = 1376;
export const DEFAULT_OG_IMAGE_HEIGHT = 768;
export const DEFAULT_OG_IMAGE_MIME = 'image/jpeg';

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

const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
  if (typeof document === 'undefined') return;

  const element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (element) element.remove();
    return;
  }
  const target = element || document.createElement('meta');
  if (!element) {
    target.setAttribute(attributeName, attributeValue);
    document.head.appendChild(target);
  }
  target.setAttribute('content', content);
};

const setLinkTag = (rel: string, href: string) => {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

/**
 * Updates global browser title, meta description, OpenGraph, and Twitter tags
 * dynamically from Admin branding settings while keeping HTTPS social card images intact.
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
  const customLogo = isValidHttpsImageUrl(siteLogoUrl) ? normalizePublicImageUrl(siteLogoUrl!) : '';
  const resolvedSiteImage = customLogo || `${BASE_URL}${DEFAULT_OG_IMAGE_PATH}`;

  document.title = resolvedTitle;
  setMetaTag('name', 'description', siteDescription);
  setLinkTag('canonical', pageUrl);

  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', fullTitle);
  setMetaTag('property', 'og:title', resolvedTitle);
  setMetaTag('property', 'og:description', siteDescription);
  setMetaTag('property', 'og:url', pageUrl);
  setMetaTag('property', 'og:image', resolvedSiteImage);
  setMetaTag('property', 'og:image:secure_url', resolvedSiteImage);
  setMetaTag('property', 'og:image:type', customLogo ? '' : DEFAULT_OG_IMAGE_MIME);
  setMetaTag('property', 'og:image:width', customLogo ? '' : String(DEFAULT_OG_IMAGE_WIDTH));
  setMetaTag('property', 'og:image:height', customLogo ? '' : String(DEFAULT_OG_IMAGE_HEIGHT));
  setMetaTag('property', 'og:image:alt', siteDescription);

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', resolvedTitle);
  setMetaTag('name', 'twitter:description', siteDescription);
  setMetaTag('name', 'twitter:image', resolvedSiteImage);
  setMetaTag('name', 'twitter:image:alt', siteDescription);

  const scriptTag = document.getElementById('blog-post-schema-jsonld');
  if (scriptTag) {
    scriptTag.remove();
  }
};

/**
 * Updates SEO, OpenGraph, Twitter Cards, and Schema.org metadata for a blog post.
 * Uses the article's first actual image (or explicit HTTPS image); omits article image metadata when image-free.
 */
export const updateBlogPostSeo = (
  post: BlogPost,
  branding?: Partial<WebsiteBrandingSettings> | SiteBrandingSeoInput
): void => {
  if (typeof document === 'undefined') return;

  const { fullTitle } = resolveSiteBrandingSeo(branding);
  const pageTitle = `${post.title} – ${fullTitle}`;
  const postUrl = `${BASE_URL}/blog/${encodeURIComponent(post.slug || post.id)}`;
  const thumb = getSingleArticleThumbnailUrl(post);
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
  const articleHttpsImage = isValidHttpsImageUrl(thumb)
    ? normalizePublicImageUrl(thumb)
    : thumb.startsWith('data:image/') && !thumb.startsWith('data:image/svg+xml')
    ? `${BASE_URL}/og-blog/${encodeURIComponent(
        `${rawSlug}-${computeImageDataUriHash8(thumb)}.${dataUriExt}`
      )}`
    : thumb.startsWith('/') && !thumb.startsWith('//') && !/\.svg(?:$|\?)/i.test(thumb)
    ? `${BASE_URL}${thumb}`
    : '';
  const hasArticleImage = Boolean(articleHttpsImage);
  const ogHttpsImage = hasArticleImage
    ? articleHttpsImage
    : `${BASE_URL}${DEFAULT_OG_IMAGE_PATH}`;
  const description =
    (post.excerpt || '').trim() ||
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
  setMetaTag('property', 'og:image:alt', hasArticleImage ? post.title : `${post.title} – ${fullTitle}`);
  setMetaTag('property', 'og:image:type', hasArticleImage ? '' : DEFAULT_OG_IMAGE_MIME);
  setMetaTag('property', 'og:image:width', hasArticleImage ? '' : String(DEFAULT_OG_IMAGE_WIDTH));
  setMetaTag('property', 'og:image:height', hasArticleImage ? '' : String(DEFAULT_OG_IMAGE_HEIGHT));

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', post.title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', ogHttpsImage);
  setMetaTag('name', 'twitter:image:alt', hasArticleImage ? post.title : `${post.title} – ${fullTitle}`);

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

export const resetDefaultSeo = (
  branding?: Partial<WebsiteBrandingSettings> | SiteBrandingSeoInput
): void => {
  updateWebsiteBrandingSeo(branding);
};

