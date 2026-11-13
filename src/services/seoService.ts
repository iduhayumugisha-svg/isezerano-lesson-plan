import { BlogPost } from '../types/blog';
import { getSingleArticleThumbnailUrl, isValidHttpsImageUrl } from '../utils/thumbnailUtils';

const DEFAULT_TITLE = 'ISEZERANO ONLINE – GS GITUMBA';
const DEFAULT_DESCRIPTION =
  'Official Rwanda Competence-Based Curriculum (CBC) lesson planning, nursery report cards, and school blog for GS GITUMBA.';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://isezerano.online';

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
 * Updates SEO, OpenGraph, Twitter Cards, and Schema.org metadata for a blog post.
 * External social meta tags only reference HTTPS image URLs (skipping embedded Data URIs).
 */
export const updateBlogPostSeo = (post: BlogPost): void => {
  if (typeof document === 'undefined') return;

  const pageTitle = `${post.title} – ISEZERANO ONLINE – GS GITUMBA`;
  const postUrl = `${BASE_URL}/blog/${post.slug}`;
  const thumb = getSingleArticleThumbnailUrl(post);
  const ogHttpsImage = isValidHttpsImageUrl(thumb) ? thumb : '';
  const description = post.excerpt || post.title;

  document.title = pageTitle;
  setMetaTag('name', 'description', description);
  setLinkTag('canonical', postUrl);

  setMetaTag('property', 'og:type', 'article');
  setMetaTag('property', 'og:site_name', 'ISEZERANO ONLINE – GS GITUMBA');
  setMetaTag('property', 'og:title', post.title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', postUrl);
  setMetaTag('property', 'og:image', ogHttpsImage);
  setMetaTag('property', 'og:image:secure_url', ogHttpsImage);
  setMetaTag('property', 'og:image:alt', ogHttpsImage ? post.title : '');

  setMetaTag('name', 'twitter:card', ogHttpsImage ? 'summary_large_image' : 'summary');
  setMetaTag('name', 'twitter:title', post.title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', ogHttpsImage);
  setMetaTag('name', 'twitter:image:alt', ogHttpsImage ? post.title : '');

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
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'GS GITUMBA Editorial Team',
      jobTitle: post.author?.role || 'Educator'
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'ISEZERANO ONLINE – GS GITUMBA'
    }
  };

  if (ogHttpsImage) {
    structuredData.image = [ogHttpsImage];
  }

  scriptTag.textContent = JSON.stringify(structuredData, null, 2);
};

export const resetDefaultSeo = (): void => {
  if (typeof document === 'undefined') return;

  document.title = DEFAULT_TITLE;
  setMetaTag('name', 'description', DEFAULT_DESCRIPTION);
  setLinkTag('canonical', BASE_URL);

  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:site_name', DEFAULT_TITLE);
  setMetaTag('property', 'og:title', DEFAULT_TITLE);
  setMetaTag('property', 'og:description', DEFAULT_DESCRIPTION);
  setMetaTag('property', 'og:url', BASE_URL);
  setMetaTag('property', 'og:image', '');
  setMetaTag('property', 'og:image:secure_url', '');

  setMetaTag('name', 'twitter:card', 'summary');
  setMetaTag('name', 'twitter:title', DEFAULT_TITLE);
  setMetaTag('name', 'twitter:description', DEFAULT_DESCRIPTION);
  setMetaTag('name', 'twitter:image', '');

  const scriptTag = document.getElementById('blog-post-schema-jsonld');
  if (scriptTag) {
    scriptTag.remove();
  }
};
