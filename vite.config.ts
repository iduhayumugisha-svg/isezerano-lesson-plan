import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Image resolver middleware for converting viewer URLs (ImgBB, Google Drive, Dropbox) into direct URLs
 */
function imageResolverPlugin(): Plugin {
  return {
    name: 'image-resolver-middleware',
    configureServer(server) {
      server.middlewares.use('/api/resolve-image-url', async (req, res) => {
        try {
          const parsed = new URL(req.url || '', 'http://localhost:3000');
          const targetUrl = parsed.searchParams.get('url')?.trim();

          if (!targetUrl || !targetUrl.startsWith('http')) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'URL yuzuye ya HTTPS irakenewe.' }));
            return;
          }

          // Check instant converts first (Google Drive, Dropbox)
          const gdriveMatch = targetUrl.match(/^https?:\/\/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+))/i);
          if (gdriveMatch) {
            const fileId = gdriveMatch[1] || gdriveMatch[2];
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, directUrl: `https://lh3.googleusercontent.com/d/${fileId}` }));
            return;
          }

          if (/^https?:\/\/(?:www\.)?dropbox\.com\/.+[?&]dl=0/i.test(targetUrl)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, directUrl: targetUrl.replace(/([?&])dl=0/, '$1raw=1') }));
            return;
          }

          // Fetch page to extract og:image meta tag
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 6000);

          const pageRes = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
          });
          clearTimeout(timer);

          if (!pageRes.ok) {
            res.statusCode = pageRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: `Urubuga rwasubije: ${pageRes.status} ${pageRes.statusText}` }));
            return;
          }

          const html = await pageRes.text();
          const ogMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](https?:\/\/[^"']+)["']/i) ||
                          html.match(/<meta\s+content=["'](https?:\/\/[^"']+)["']\s+property=["']og:image["']/i) ||
                          html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](https?:\/\/[^"']+)["']/i) ||
                          html.match(/(https:\/\/i\.ibb\.co\/[a-zA-Z0-9_\/-]+\.(?:png|jpg|jpeg|webp))/i);

          if (ogMatch && ogMatch[1]) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, directUrl: ogMatch[1] }));
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Nta direct image yabonetse kuri iyi page.' }));
          }
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message || 'Ikosa mu gushaka direct image.' }));
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), imageResolverPlugin()],
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
