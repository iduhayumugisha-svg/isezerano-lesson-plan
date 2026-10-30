import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { 
  syncPostsFromFirestore, 
  getBlogPostForPrerender, 
  renderBlogPostMetadata,
  writePostsToDisk,
  readPostsFromDisk
} from './src/server/blogPrerender';
import { auditAllBlogPosts } from './src/utils/thumbnailUtils';

/**
 * Prerenders OpenGraph and Twitter card metadata for social crawlers (WhatsApp, Facebook, Telegram, X)
 * when accessing any blog post directly via URL.
 * Automatically synchronizes posts from Firestore, audits and normalizes thumbnail URLs,
 * and ensures each post serves its own verified high-definition featured image.
 */
function seoCrawlerPrerenderPlugin(): Plugin {
  return {
    name: 'seo-social-crawler-prerender',
    configureServer(server) {
      // 1. Initial background sync of all Firestore posts on server boot
      syncPostsFromFirestore().then((synced) => {
        console.log(`[SEO Crawler Plugin] Synced ${synced.length} posts from Firestore for social card prerendering.`);
      }).catch((err) => {
        console.warn('[SEO Crawler Plugin] Initial Firestore sync warning:', err);
      });

      // 2. Local sync endpoint to persist blog posts to disk
      server.middlewares.use('/api/sync-blog', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body);
              let currentPosts = readPostsFromDisk();

              if (payload.action === 'save' && payload.post) {
                const idx = currentPosts.findIndex(p => p.id === payload.post.id || p.slug === payload.post.slug);
                if (idx >= 0) {
                  currentPosts[idx] = payload.post;
                } else {
                  currentPosts.unshift(payload.post);
                }
              } else if (payload.action === 'delete' && payload.postId) {
                currentPosts = currentPosts.filter(p => p.id !== payload.postId);
              }

              writePostsToDisk(currentPosts);
              // Also trigger fresh Firestore sync in background
              syncPostsFromFirestore().catch(() => {});

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, count: currentPosts.length }));
              return;
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message }));
              return;
            }
          });
        } else {
          res.statusCode = 404;
          res.end();
        }
      });

      // 3. Audit endpoint to query all posts and report thumbnail statuses
      server.middlewares.use('/api/audit-blog', async (req, res) => {
        try {
          const allPosts = await syncPostsFromFirestore();
          const auditReport = auditAllBlogPosts(allPosts);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, report: auditReport }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    },

    async transformIndexHtml(html: string, ctx: any) {
      const url = ctx?.originalUrl || ctx?.url || '';
      if (!url.startsWith('/blog/')) {
        return html;
      }

      const rawSlug = url.split('/blog/')[1]?.split('?')[0]?.replace(/\/$/, '');
      if (!rawSlug) return html;

      // Fetch the blog post directly from memory cache or Firestore
      const post = await getBlogPostForPrerender(rawSlug);

      // Render tailored metadata with the post's own featured image and full SEO tags
      return renderBlogPostMetadata(html, post, rawSlug);
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), seoCrawlerPrerenderPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
