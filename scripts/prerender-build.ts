import path from 'path';
import fs from 'fs';
import { 
  syncPostsFromFirestore, 
  readPostsFromDisk, 
  renderBlogPostMetadata 
} from '../src/server/blogPrerender';
import { auditAndRepairBlogPost, isValidHttpsImageUrl } from '../src/utils/thumbnailUtils';
import { BlogPost } from '../src/types/blog';

async function runPrerender() {
  console.log('🚀 Starting Static OpenGraph Prerendering for Firebase Hosting...');

  const distPath = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');

  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ dist/index.html not found! Ensure `vite build` completed first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

  // 1. Fetch posts from Firestore (authoritative) and merge with disk fallback
  let posts: BlogPost[] = [];
  try {
    posts = await syncPostsFromFirestore();
    console.log(`📡 Fetched ${posts.length} posts from Firestore/disk.`);
  } catch (err) {
    console.warn('⚠️ Could not connect to remote Firestore during build, using disk cache:', err);
    posts = readPostsFromDisk();
  }

  if (posts.length === 0) {
    console.warn('⚠️ No posts found to prerender. Creating baseline directory structure.');
    return;
  }

  const blogDistDir = path.join(distPath, 'blog');
  if (!fs.existsSync(blogDistDir)) {
    fs.mkdirSync(blogDistDir, { recursive: true });
  }

  let prerenderedCount = 0;

  for (const rawPost of posts) {
    // Audit thumbnail to guarantee valid high-resolution absolute HTTPS image
    const { repairedPost } = auditAndRepairBlogPost(rawPost);
    const post = repairedPost;

    // Prerender tailored HTML with post's own featured image and OpenGraph metadata
    const postHtml = renderBlogPostMetadata(baseHtml, post, post.slug);

    // 1. Write dist/blog/:slug/index.html
    const slugDir = path.join(blogDistDir, post.slug);
    if (!fs.existsSync(slugDir)) {
      fs.mkdirSync(slugDir, { recursive: true });
    }
    fs.writeFileSync(path.join(slugDir, 'index.html'), postHtml, 'utf-8');

    // 2. Write dist/blog/:slug.html for cleanUrls compatibility
    fs.writeFileSync(path.join(blogDistDir, `${post.slug}.html`), postHtml, 'utf-8');

    // 3. Write ID-based paths (e.g. dist/blog/:id/index.html) if slug != id
    if (post.id && post.id !== post.slug) {
      const idDir = path.join(blogDistDir, post.id);
      if (!fs.existsSync(idDir)) {
        fs.mkdirSync(idDir, { recursive: true });
      }
      fs.writeFileSync(path.join(idDir, 'index.html'), postHtml, 'utf-8');
      fs.writeFileSync(path.join(blogDistDir, `${post.id}.html`), postHtml, 'utf-8');
    }

    // 4. Also write any known slug aliases
    const aliases = [];
    if (post.id === 'post-1793332078487') {
      aliases.push('ai-10-zingenzi-zifasha-abanyeshuri-nabarimu-mu-burezi');
      aliases.push('ai-10-zingenzi-zifasha-abanyeshuri-nabarimu');
    }
    for (const alias of aliases) {
      if (alias !== post.slug) {
        const aliasDir = path.join(blogDistDir, alias);
        if (!fs.existsSync(aliasDir)) {
          fs.mkdirSync(aliasDir, { recursive: true });
        }
        const aliasHtml = renderBlogPostMetadata(baseHtml, post, alias);
        fs.writeFileSync(path.join(aliasDir, 'index.html'), aliasHtml, 'utf-8');
        fs.writeFileSync(path.join(blogDistDir, `${alias}.html`), aliasHtml, 'utf-8');
      }
    }

    console.log(`✅ Prerendered [${post.slug}]:`);
    console.log(`   Image: ${post.thumbnailUrl}`);
    console.log(`   Valid HTTPS: ${isValidHttpsImageUrl(post.thumbnailUrl)}`);

    prerenderedCount++;
  }

  console.log(`🎉 Successfully prerendered ${prerenderedCount} blog posts for Firebase Hosting.`);
}

runPrerender().catch((err) => {
  console.error('❌ Prerendering failed:', err);
  process.exit(1);
});
