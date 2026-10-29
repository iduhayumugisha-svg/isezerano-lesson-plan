import { BlogPost } from '../types/blog';

const DEFAULT_TITLE = 'ISEZERANO ONLINE – GS GITUMBA';
const DEFAULT_DESCRIPTION = 'Specialized pedagogical lesson-planning platform helping primary and secondary school teachers in Rwanda prepare official REB-compliant 8-column Competence-Based Curriculum (CBC) lesson plans.';
const DEFAULT_IMAGE = 'https://ais-pre-a7az4u6j4emzxaw3vwjczy-591146875574.europe-west2.run.app/isezerano-online-logo.jpg';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-a7az4u6j4emzxaw3vwjczy-591146875574.europe-west2.run.app';

/**
 * Sets or creates a meta tag with the given attribute and content.
 */
const setMetaTag = (attributeName: string, attributeValue: string, content: string) => {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
};

/**
 * Sets or creates a link tag with the given rel attribute.
 */
const setLinkTag = (rel: string, href: string) => {
  if (typeof document === 'undefined') return;

  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

/**
 * Updates all SEO, OpenGraph, Twitter Cards, and Schema.org metadata for a specific blog post.
 */
export const updateBlogPostSeo = (post: BlogPost): void => {
  if (typeof document === 'undefined') return;

  const pageTitle = `${post.title} – ISEZERANO ONLINE – GS GITUMBA`;
  const postUrl = `${BASE_URL}/blog/${post.slug}`;
  
  // Ensure image URL is absolute HTTPS for WhatsApp, Facebook, Telegram, and X crawlers
  let absoluteImageUrl = post.thumbnailUrl;
  if (absoluteImageUrl && !absoluteImageUrl.startsWith('http://') && !absoluteImageUrl.startsWith('https://')) {
    absoluteImageUrl = `${BASE_URL}${absoluteImageUrl.startsWith('/') ? '' : '/'}${absoluteImageUrl}`;
  }
  if (!absoluteImageUrl) {
    absoluteImageUrl = DEFAULT_IMAGE;
  }

  const description = post.excerpt || post.title;

  // 1. Standard HTML Title and Meta Description
  document.title = pageTitle;
  setMetaTag('name', 'description', description);
  setLinkTag('canonical', postUrl);

  // 2. OpenGraph (Facebook, WhatsApp, Telegram, LinkedIn, Discord)
  setMetaTag('property', 'og:type', 'article');
  setMetaTag('property', 'og:site_name', 'ISEZERANO ONLINE – GS GITUMBA');
  setMetaTag('property', 'og:title', post.title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', postUrl);
  setMetaTag('property', 'og:image', absoluteImageUrl);
  setMetaTag('property', 'og:image:secure_url', absoluteImageUrl);
  setMetaTag('property', 'og:image:alt', post.title);

  // 3. Twitter / X Cards (summary_large_image)
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', post.title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', absoluteImageUrl);
  setMetaTag('name', 'twitter:image:alt', post.title);

  // 4. Schema.org BlogPosting JSON-LD Structured Data
  let scriptTag = document.getElementById('blog-post-schema-jsonld') as HTMLScriptElement;
  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.id = 'blog-post-schema-jsonld';
    scriptTag.type = 'application/ld+json';
    document.head.appendChild(scriptTag);
  }

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl
    },
    headline: post.title,
    description: description,
    image: [absoluteImageUrl],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author?.name || 'GS GITUMBA Editorial Team',
      jobTitle: post.author?.role || 'Educator'
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'ISEZERANO ONLINE – GS GITUMBA',
      logo: {
        '@type': 'ImageObject',
        url: DEFAULT_IMAGE
      }
    }
  };

  scriptTag.textContent = JSON.stringify(structuredData, null, 2);
};

/**
 * Restores global default website SEO and OpenGraph metadata when leaving blog post pages.
 */
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
  setMetaTag('property', 'og:image', DEFAULT_IMAGE);
  setMetaTag('property', 'og:image:secure_url', DEFAULT_IMAGE);

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', DEFAULT_TITLE);
  setMetaTag('name', 'twitter:description', DEFAULT_DESCRIPTION);
  setMetaTag('name', 'twitter:image', DEFAULT_IMAGE);

  const scriptTag = document.getElementById('blog-post-schema-jsonld');
  if (scriptTag) {
    scriptTag.remove();
  }
};
