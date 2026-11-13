import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import type { BlogPost } from '../src/types/blog.ts';
import type { WebsiteBrandingSettings } from '../src/types/websiteDesign.ts';
import {
  DEFAULT_PUBLIC_ORIGIN,
  computeBytesHash8,
  decodeImageDataUri,
  fetchPublishedBlogPostsFromFirestore,
  fetchWebsiteBrandingFromFirestore,
  isPublicHttpsImageUrl,
  readImageDimensionsFromBuffer,
  renderBlogArticleHtml,
  renderWebsiteDefaultHtml,
  resolvePostThumbnailSource,
  safeFileSlug
} from '../server/ogMeta.ts';

export interface PrerenderStaticOptions {
  distDir?: string;
  origin?: string;
  posts?: BlogPost[];
  branding?: Partial<WebsiteBrandingSettings> | null;
}

export interface PrerenderStaticResult {
  prerenderedCount: number;
  generatedFiles: Array<{
    slug: string;
    htmlPath: string;
    cleanHtmlPath: string;
    imagePath: string | null;
    ogImageUrl: string;
  }>;
}

async function downloadExternalImageToBuffer(
  imageUrl: string,
  timeoutMs: number = 6000
): Promise<{
  buffer: Buffer;
  mimeType: string;
  ext: string;
  width?: number;
  height?: number;
} | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { Accept: 'image/*' }
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const rawMime = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!rawMime.startsWith('image/') || rawMime === 'image/svg+xml') return null;

    const mimeType = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;
    const ext =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
        ? 'webp'
        : mimeType === 'image/gif'
        ? 'gif'
        : 'jpg';

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;

    const dims = readImageDimensionsFromBuffer(buffer, mimeType);
    return {
      buffer,
      mimeType,
      ext,
      width: dims.width,
      height: dims.height
    };
  } catch {
    return null;
  }
}

/**
 * Post-build static pre-renderer for Firebase Hosting (Spark free plan).
 * - Cleans stale `dist/blog` and `dist/og-blog` so deleted/unpublished posts never persist.
 * - Generates static `dist/blog/<slug>/index.html`, `dist/blog/<slug>.html`, and
 *   content-hashed `dist/og-blog/<slug>-<hash8>.<ext>` image files for every published article.
 * - Injects matching static HTTPS `og:image`, `og:image:secure_url`, `twitter:image`, and JSON-LD URLs directly into HTML.
 */
export async function prerenderStaticBlogDist(
  options: PrerenderStaticOptions = {}
): Promise<PrerenderStaticResult> {
  const distDir = options.distDir || path.resolve(process.cwd(), 'dist');
  const distIndexPath = path.join(distDir, 'index.html');

  if (!fs.existsSync(distIndexPath)) {
    console.log('[prerenderBlogMeta] dist/index.html not found, skipping.');
    return { prerenderedCount: 0, generatedFiles: [] };
  }

  const templateHtml = fs.readFileSync(distIndexPath, 'utf-8');
  const origin =
    options.origin && options.origin.startsWith('https://')
      ? options.origin.replace(/\/+$/, '')
      : (process.env.PUBLIC_SITE_URL || '').trim().startsWith('https://')
      ? (process.env.PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '')
      : DEFAULT_PUBLIC_ORIGIN;

  const [posts, branding] = await Promise.all([
    options.posts !== undefined ? Promise.resolve(options.posts) : fetchPublishedBlogPostsFromFirestore(),
    options.branding !== undefined ? Promise.resolve(options.branding) : fetchWebsiteBrandingFromFirestore()
  ]);

  // Remove stale pre-rendered blog artifacts so deleted or updated articles never serve old images/HTML across builds
  const blogOutDir = path.join(distDir, 'blog');
  const ogImagesDir = path.join(distDir, 'og-blog');
  fs.rmSync(blogOutDir, { recursive: true, force: true });
  fs.rmSync(ogImagesDir, { recursive: true, force: true });
  fs.rmSync(path.join(distDir, 'blog.html'), { force: true });

  // Update root dist/index.html and static /blog index page cleanly
  const updatedRootHtml = renderWebsiteDefaultHtml(templateHtml, origin, branding, '/');
  fs.writeFileSync(distIndexPath, updatedRootHtml, 'utf-8');

  const blogIndexHtml = renderWebsiteDefaultHtml(
    templateHtml,
    origin,
    branding,
    '/blog',
    'School Blog & Educational Articles'
  );
  fs.mkdirSync(blogOutDir, { recursive: true });
  fs.writeFileSync(path.join(blogOutDir, 'index.html'), blogIndexHtml, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'blog.html'), blogIndexHtml, 'utf-8');

  const publishedPosts = posts.filter((p) => p && p.status === 'published');
  if (publishedPosts.length === 0) {
    console.log('[prerenderBlogMeta] 0 published posts found; dist/index.html and dist/blog/index.html preserved cleanly.');
    return { prerenderedCount: 0, generatedFiles: [] };
  }

  const generatedFiles: PrerenderStaticResult['generatedFiles'] = [];

  for (const post of publishedPosts) {
    const rawSlug = (post.slug || post.id || '').trim();
    if (!rawSlug || rawSlug.includes('..') || rawSlug.includes('/') || rawSlug.includes('\\')) continue;
    const fileSlug = safeFileSlug(rawSlug);

    const thumbSrc = resolvePostThumbnailSource(post);
    let staticImageUrl = '';
    let writtenImagePath: string | null = null;
    let imageWidth: number | undefined;
    let imageHeight: number | undefined;
    let imageMimeType: string | undefined;

    if (thumbSrc.startsWith('data:image/')) {
      const decoded = decodeImageDataUri(thumbSrc);
      if (decoded) {
        fs.mkdirSync(ogImagesDir, { recursive: true });
        const hash8 = computeBytesHash8(decoded.buffer);
        const fileName = `${fileSlug}-${hash8}.${decoded.ext}`;
        writtenImagePath = path.join(ogImagesDir, fileName);
        fs.writeFileSync(writtenImagePath, decoded.buffer);
        staticImageUrl = `${origin}/og-blog/${encodeURIComponent(fileName)}`;
        imageWidth = decoded.width;
        imageHeight = decoded.height;
        imageMimeType = decoded.mimeType;
      }
    } else if (isPublicHttpsImageUrl(thumbSrc)) {
      const downloaded = await downloadExternalImageToBuffer(thumbSrc);
      if (downloaded) {
        fs.mkdirSync(ogImagesDir, { recursive: true });
        const hash8 = computeBytesHash8(downloaded.buffer);
        const fileName = `${fileSlug}-${hash8}.${downloaded.ext}`;
        writtenImagePath = path.join(ogImagesDir, fileName);
        fs.writeFileSync(writtenImagePath, downloaded.buffer);
        staticImageUrl = `${origin}/og-blog/${encodeURIComponent(fileName)}`;
        imageWidth = downloaded.width;
        imageHeight = downloaded.height;
        imageMimeType = downloaded.mimeType;
      } else {
        staticImageUrl = thumbSrc;
        imageWidth = undefined;
        imageHeight = undefined;
        imageMimeType = undefined;
      }
    }

    const articleHtml = renderBlogArticleHtml(templateHtml, post, origin, branding, {
      overrideImageUrl: staticImageUrl || undefined,
      imageWidth,
      imageHeight,
      imageMimeType
    });

    const articleDir = path.join(blogOutDir, rawSlug);
    const articleHtmlPath = path.join(articleDir, 'index.html');
    const cleanHtmlPath = path.join(blogOutDir, `${rawSlug}.html`);
    fs.mkdirSync(articleDir, { recursive: true });
    fs.writeFileSync(articleHtmlPath, articleHtml, 'utf-8');
    fs.writeFileSync(cleanHtmlPath, articleHtml, 'utf-8');

    // Also pre-render by post.id if distinct from post.slug so /blog/<id> shares also resolve statically
    const rawId = (post.id || '').trim();
    if (rawId && rawId !== rawSlug && !rawId.includes('..') && !rawId.includes('/') && !rawId.includes('\\')) {
      const idDir = path.join(blogOutDir, rawId);
      fs.mkdirSync(idDir, { recursive: true });
      fs.writeFileSync(path.join(idDir, 'index.html'), articleHtml, 'utf-8');
      fs.writeFileSync(path.join(blogOutDir, `${rawId}.html`), articleHtml, 'utf-8');
    }

    generatedFiles.push({
      slug: rawSlug,
      htmlPath: articleHtmlPath,
      cleanHtmlPath,
      imagePath: writtenImagePath,
      ogImageUrl: staticImageUrl
    });
  }

  console.log(
    `[prerenderBlogMeta] Pre-rendered ${generatedFiles.length} published blog article page(s) and static thumbnails in dist/.`
  );
  return { prerenderedCount: generatedFiles.length, generatedFiles };
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  prerenderStaticBlogDist().catch((err) => {
    console.warn('[prerenderBlogMeta] Non-fatal pre-render notice:', err);
  });
}
