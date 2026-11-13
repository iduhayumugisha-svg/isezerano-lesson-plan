import { BlogPost } from '../types/blog';
import { WebsiteBrandingSettings } from '../types/websiteDesign';
import {
  computeImageDataUriHash8,
  getSingleArticleThumbnailUrl,
  isValidHttpsImageUrl
} from '../utils/thumbnailUtils';

export const DEFAULT_SEO_TITLE = 'ISEZERANO ONLINE – GS GITUMBA';
export const DEFAULT_SEO_DESCRIPTION =
  'ISEZERANO ONLINE – Rwanda CBC lesson planning, nursery report cards, education resources and articles for teachers and educators.';
export const DEFAULT_OG_IMAGE = 'https://isezerano.online/og-isezerano-online.jpg';
export const DEFAULT_CANONICAL_ORIGIN = 'https://isezerano.online';
const BASE_URL =
  typeof window !== 'undefined' &&
  window.location.protocol === 'https:' &&
  !window.location.hostname.startsWith('ais-dev-')
    ? window.location.origin
    : DEFAULT_CANONICAL_ORIGIN;

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
  pageTitlePrefix?: string
): void => {
  if (typeof document === 'undefined') return;

  const { fullTitle, siteDescription } = resolveSiteBrandingSeo(branding);
  const resolvedTitle = pageTitlePrefix ? `${pageTitlePrefix} – ${fullTitle}` : fullTitle;
  const pageUrl = `${BASE_URL}/`;

  document.title = resolvedTitle;
  setMetaTag('name', 'description', siteDescription);
  setLinkTag('canonical', pageUrl);

  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', fullTitle);
  setMetaTag('property', 'og:title', resolvedTitle);
  setMetaTag('property', 'og:description', siteDescription);
  setMetaTag('property', 'og:url', pageUrl);
  setMetaTag('property', 'og:image', DEFAULT_OG_IMAGE);
  setMetaTag('property', 'og:image:secure_url', DEFAULT_OG_IMAGE);
  setMetaTag('property', 'og:image:type', 'image/jpeg');
  setMetaTag('property', 'og:image:width', '1376');
  setMetaTag('property', 'og:image:height', '768');
  setMetaTag('property', 'og:image:alt', siteDescription);

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', resolvedTitle);
  setMetaTag('name', 'twitter:description', siteDescription);
  setMetaTag('name', 'twitter:image', DEFAULT_OG_IMAGE);
  setMetaTag('name', 'twitter:image:alt', siteDescription);

  const scriptTag = document.getElementById('blog-post-schema-jsonld');
  if (scriptTag) {
    scriptTag.remove();
  }
};

/**
 * Updates SEO, OpenGraph, Twitter Cards, and Schema.org metadata for a blog post.
 * External social meta tags only reference HTTPS image URLs (falling back to DEFAULT_OG_IMAGE for Data URIs or text-only posts).
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
  const rawSlug = (post.slug || post.id || 'article')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'article';
  const dataUriExt = thumb.startsWith('data:image/png')
    ? 'png'
    : thumb.startsWith('data:image/webp')
    ? 'webp'
    : thumb.startsWith('data:image/gif')
    ? 'gif'
    : 'jpg';
  const ogHttpsImage = isValidHttpsImageUrl(thumb)
    ? thumb
    : thumb.startsWith('data:image/') && !thumb.startsWith('data:image/svg+xml')
    ? `${BASE_URL}/og-blog/${encodeURIComponent(
        `${rawSlug}-${computeImageDataUriHash8(thumb)}.${dataUriExt}`
      )}`
    : DEFAULT_OG_IMAGE;
  const isDefaultFallback = ogHttpsImage === DEFAULT_OG_IMAGE;
  const description = post.excerpt || post.title;

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
  setMetaTag('property', 'og:image:alt', post.title);
  if (isDefaultFallback) {
    setMetaTag('property', 'og:image:type', 'image/jpeg');
    setMetaTag('property', 'og:image:width', '1376');
    setMetaTag('property', 'og:image:height', '768');
  } else {
    setMetaTag('property', 'og:image:type', '');
    setMetaTag('property', 'og:image:width', '');
    setMetaTag('property', 'og:image:height', '');
  }

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', post.title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', ogHttpsImage);
  setMetaTag('name', 'twitter:image:alt', post.title);

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
    image: [ogHttpsImage],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'GS GITUMBA Editorial Team',
      jobTitle: post.author?.role || 'Educator'
    },
    publisher: {
      '@type': 'EducationalOrganization',
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

