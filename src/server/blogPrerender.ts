import path from 'path';
import fs from 'fs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { BlogPost } from '../types/blog';
import { 
  auditAndRepairBlogPost, 
  normalizeAndUpgradeThumbnailUrl, 
  getSafeFallbackThumbnail,
  isValidHttpsImageUrl,
  SAFE_FALLBACK_THUMBNAILS
} from '../utils/thumbnailUtils';

const CANONICAL_BASE_URL = 'https://ais-pre-a7az4u6j4emzxaw3vwjczy-591146875574.europe-west2.run.app';

const CANONICAL_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBJToe1yvQJ8ZRRXn6xwOYxh8wZOa4HO0c',
  authDomain: 'isezerano-news.firebaseapp.com',
  projectId: 'isezerano-news',
  storageBucket: 'isezerano-news.firebasestorage.app',
  messagingSenderId: '37703708100',
  appId: '1:37703708100:web:4e59c508899434b8b74891'
};

let cachedPosts: BlogPost[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds in dev/server

/**
 * Gets or initializes the Firebase app in Node server environment.
 */
function getServerFirestore() {
  try {
    let app;
    if (getApps().length > 0) {
      app = getApp();
    } else {
      app = initializeApp(CANONICAL_FIREBASE_CONFIG);
    }
    return getFirestore(app);
  } catch (err) {
    console.warn('Could not initialize Firebase in server environment:', err);
    return null;
  }
}

/**
 * Reads posts from local posts.json file.
 */
export function readPostsFromDisk(): BlogPost[] {
  try {
    const postsFilePath = path.resolve(process.cwd(), 'src/data/posts.json');
    if (fs.existsSync(postsFilePath)) {
      const raw = fs.readFileSync(postsFilePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Could not read posts from disk:', err);
  }
  return [];
}

/**
 * Writes posts to local posts.json file.
 */
export function writePostsToDisk(posts: BlogPost[]): void {
  try {
    const postsFilePath = path.resolve(process.cwd(), 'src/data/posts.json');
    const dir = path.dirname(postsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write posts to disk:', err);
  }
}

/**
 * Fetches all published posts from Firestore, audits and normalizes their thumbnails,
 * caches them in memory, and writes to posts.json on disk.
 */
export async function syncPostsFromFirestore(): Promise<BlogPost[]> {
  const db = getServerFirestore();
  if (!db) {
    const diskPosts = readPostsFromDisk();
    cachedPosts = diskPosts;
    return diskPosts;
  }

  try {
    const snapshot = await getDocs(collection(db, 'posts'));
    const remotePosts: BlogPost[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as BlogPost;
      const { repairedPost } = auditAndRepairBlogPost({
        ...data,
        id: docSnap.id,
        views: typeof data.views === 'number' ? data.views : 0
      });
      remotePosts.push(repairedPost);
    });

    // Also merge any baseline posts from disk that might not be in Firestore yet
    const diskPosts = readPostsFromDisk();
    for (const dp of diskPosts) {
      if (!remotePosts.some(rp => rp.id === dp.id || rp.slug === dp.slug)) {
        const { repairedPost } = auditAndRepairBlogPost(dp);
        remotePosts.push(repairedPost);
      }
    }

    cachedPosts = remotePosts;
    lastFetchTime = Date.now();
    writePostsToDisk(remotePosts);
    return remotePosts;
  } catch (err) {
    console.warn('Failed to sync posts from Firestore:', err);
    const diskPosts = readPostsFromDisk();
    cachedPosts = diskPosts;
    return diskPosts;
  }
}

/**
 * Finds a blog post by its SEO slug or ID, querying Firestore if not in cache.
 */
export async function getBlogPostForPrerender(slugOrId: string): Promise<BlogPost | null> {
  const now = Date.now();
  if (!cachedPosts || now - lastFetchTime > CACHE_TTL_MS) {
    await syncPostsFromFirestore();
  }

  let post = cachedPosts?.find(p => p.slug === slugOrId || p.id === slugOrId) || null;

  // If not found in current cache, re-fetch from Firestore in case it was published recently
  if (!post) {
    await syncPostsFromFirestore();
    post = cachedPosts?.find(p => p.slug === slugOrId || p.id === slugOrId) || null;
  }

  return post;
}

/**
 * Replaces or inserts a meta tag in HTML string.
 */
export function replaceOrInsertMeta(html: string, nameOrProp: string, isProperty: boolean, content: string): string {
  const attrName = isProperty ? 'property' : 'name';
  const regex = new RegExp(`<meta\\s+[^>]*?${attrName}=["']${nameOrProp}["'][^>]*?>`, 'is');
  const safeContent = content.replace(/"/g, '&quot;');
  const newTag = `<meta ${attrName}="${nameOrProp}" content="${safeContent}" />`;

  if (regex.test(html)) {
    return html.replace(regex, newTag);
  }
  return html.replace('</head>', `    ${newTag}\n  </head>`);
}

/**
 * Prerenders full SEO, OpenGraph, Twitter Cards, and Schema.org for a blog post URL.
 */
export function renderBlogPostMetadata(html: string, post: BlogPost | null, rawSlug: string): string {
  const canonicalUrl = `${CANONICAL_BASE_URL}/blog/${rawSlug}`;

  let title = '';
  let description = '';
  let image = '';
  let imageAlt = '';
  let publishedTime = '';
  let authorName = 'GS GITUMBA Educational Journal';

  if (post) {
    title = post.title;
    description = post.excerpt || post.title;
    imageAlt = post.thumbnailAlt || `${post.title} – Featured Thumbnail`;
    publishedTime = post.publishedAt || '';
    if (post.author?.name) {
      authorName = post.author.name;
    }

    if (isValidHttpsImageUrl(post.thumbnailUrl)) {
      image = normalizeAndUpgradeThumbnailUrl(post.thumbnailUrl);
    } else {
      image = getSafeFallbackThumbnail(post.category);
    }
  } else {
    const words = rawSlug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    title = `${words} – GS GITUMBA Educational Journal`;
    description = 'Official pedagogical articles and Competence-Based Curriculum (CBC) guidance from GS GITUMBA on ISEZERANO ONLINE.';
    image = SAFE_FALLBACK_THUMBNAILS.default;
    imageAlt = 'ISEZERANO ONLINE – GS GITUMBA Educational Journal';
  }

  const fullPageTitle = `${title} – ISEZERANO ONLINE – GS GITUMBA`;
  const isPng = image.toLowerCase().includes('.png');
  const imageType = isPng ? 'image/png' : 'image/jpeg';

  let output = html;

  // 1. Page Title
  output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${fullPageTitle}</title>`);

  // 2. Meta description
  output = replaceOrInsertMeta(output, 'description', false, description);

  // 3. OpenGraph Tags (WhatsApp, Facebook, Telegram, LinkedIn)
  output = replaceOrInsertMeta(output, 'og:site_name', true, 'ISEZERANO ONLINE – GS GITUMBA');
  output = replaceOrInsertMeta(output, 'og:title', true, fullPageTitle);
  output = replaceOrInsertMeta(output, 'og:description', true, description);
  output = replaceOrInsertMeta(output, 'og:image', true, image);
  output = replaceOrInsertMeta(output, 'og:image:secure_url', true, image);
  output = replaceOrInsertMeta(output, 'og:image:type', true, imageType);
  output = replaceOrInsertMeta(output, 'og:image:width', true, '1200');
  output = replaceOrInsertMeta(output, 'og:image:height', true, '630');
  output = replaceOrInsertMeta(output, 'og:image:alt', true, imageAlt);
  output = replaceOrInsertMeta(output, 'og:url', true, canonicalUrl);
  output = replaceOrInsertMeta(output, 'og:type', true, 'article');

  if (publishedTime) {
    output = replaceOrInsertMeta(output, 'article:published_time', true, publishedTime);
  }
  output = replaceOrInsertMeta(output, 'article:author', true, authorName);

  // 4. Twitter / X Cards
  output = replaceOrInsertMeta(output, 'twitter:card', false, 'summary_large_image');
  output = replaceOrInsertMeta(output, 'twitter:title', false, fullPageTitle);
  output = replaceOrInsertMeta(output, 'twitter:description', false, description);
  output = replaceOrInsertMeta(output, 'twitter:image', false, image);
  output = replaceOrInsertMeta(output, 'twitter:image:alt', false, imageAlt);

  // 5. Schema.org JSON-LD structured data for article crawlers
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    },
    headline: title,
    description: description,
    image: [image],
    datePublished: publishedTime || new Date().toISOString(),
    author: {
      '@type': 'Person',
      name: authorName
    },
    publisher: {
      '@type': 'EducationalOrganization',
      name: 'ISEZERANO ONLINE – GS GITUMBA',
      logo: {
        '@type': 'ImageObject',
        url: `${CANONICAL_BASE_URL}/isezerano-online-logo.jpg`
      }
    }
  };

  const jsonLdScript = `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n  </head>`;
  output = output.replace('</head>', jsonLdScript);

  return output;
}
