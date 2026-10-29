import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

const CANONICAL_BASE_URL = 'https://ais-pre-a7az4u6j4emzxaw3vwjczy-591146875574.europe-west2.run.app';

function replaceOrInsertMeta(html: string, nameOrProp: string, isProperty: boolean, content: string): string {
  const attrName = isProperty ? 'property' : 'name';
  // Matches <meta [any attributes] property="og:title" [any attributes]> across line breaks
  const regex = new RegExp(`<meta\\s+[^>]*?${attrName}=["']${nameOrProp}["'][^>]*?>`, 'is');
  const safeContent = content.replace(/"/g, '&quot;');
  const newTag = `<meta ${attrName}="${nameOrProp}" content="${safeContent}" />`;

  if (regex.test(html)) {
    return html.replace(regex, newTag);
  }
  return html.replace('</head>', `    ${newTag}\n  </head>`);
}

/**
 * Prerenders OpenGraph and Twitter card metadata for social crawlers (WhatsApp, Facebook, Telegram, X)
 * when accessing blog posts directly via URL.
 */
function seoCrawlerPrerenderPlugin(): Plugin {
  return {
    name: 'seo-social-crawler-prerender',
    configureServer(server) {
      // Local sync endpoint to persist blog posts to posts.json on disk
      server.middlewares.use('/api/sync-blog', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              const postsFilePath = path.resolve(import.meta.dirname, 'src/data/posts.json');
              let currentPosts: any[] = [];
              if (fs.existsSync(postsFilePath)) {
                currentPosts = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'));
              }

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

              fs.writeFileSync(postsFilePath, JSON.stringify(currentPosts, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
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
    },

    transformIndexHtml(html: string, ctx: any) {
      const url = ctx?.originalUrl || ctx?.url || '';
      if (!url.startsWith('/blog/')) {
        return html;
      }

      const rawSlug = url.split('/blog/')[1]?.split('?')[0]?.replace(/\/$/, '');
      if (!rawSlug) return html;

      // Read published posts from disk
      let posts: any[] = [];
      try {
        const postsFilePath = path.resolve(import.meta.dirname, 'src/data/posts.json');
        if (fs.existsSync(postsFilePath)) {
          posts = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'));
        }
      } catch (err) {
        console.warn('Could not read posts.json for prerender:', err);
      }

      // Find matching post by slug or id
      const post = posts.find(p => p.slug === rawSlug || p.id === rawSlug);

      let title = '';
      let description = '';
      let image = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80';
      const canonicalUrl = `${CANONICAL_BASE_URL}/blog/${rawSlug}`;

      if (post) {
        title = post.title;
        description = post.excerpt || post.title;
        if (post.thumbnailUrl && post.thumbnailUrl.startsWith('http')) {
          image = post.thumbnailUrl;
        }
      } else {
        const words = rawSlug.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        title = `${words} – GS GITUMBA Educational Journal`;
        description = `Official pedagogical articles and Competence-Based Curriculum (CBC) guidance from GS GITUMBA on ISEZERANO ONLINE.`;
      }

      const fullPageTitle = `${title} – ISEZERANO ONLINE – GS GITUMBA`;

      let output = html;

      // 1. Page Title
      output = output.replace(/<title>[\s\S]*?<\/title>/i, `<title>${fullPageTitle}</title>`);

      // 2. Meta description
      output = replaceOrInsertMeta(output, 'description', false, description);

      // 3. OpenGraph tags
      output = replaceOrInsertMeta(output, 'og:title', true, fullPageTitle);
      output = replaceOrInsertMeta(output, 'og:description', true, description);
      output = replaceOrInsertMeta(output, 'og:image', true, image);
      output = replaceOrInsertMeta(output, 'og:image:secure_url', true, image);
      output = replaceOrInsertMeta(output, 'og:url', true, canonicalUrl);
      output = replaceOrInsertMeta(output, 'og:type', true, 'article');

      // 4. Twitter tags
      output = replaceOrInsertMeta(output, 'twitter:card', false, 'summary_large_image');
      output = replaceOrInsertMeta(output, 'twitter:title', false, fullPageTitle);
      output = replaceOrInsertMeta(output, 'twitter:description', false, description);
      output = replaceOrInsertMeta(output, 'twitter:image', false, image);

      return output;
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
