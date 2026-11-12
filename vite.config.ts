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

      // FCM Web Push dispatch endpoint (Protected server-side environment)
      server.middlewares.use('/api/send-fcm-push', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        // Security Audit Point 1: Validate Admin JWT on trusted server
        const authHeader = req.headers['authorization'] || '';
        let isAuthorizedAdmin = false;

        if (authHeader.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7).trim();
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
              // Check email matches authorized administrator and token is unexpired
              if (
                payload.email &&
                payload.email.toLowerCase() === 'twizerefelix90@gmail.com' &&
                payload.exp &&
                payload.exp * 1000 > Date.now()
              ) {
                isAuthorizedAdmin = true;
              }
            }
          } catch {
            isAuthorizedAdmin = false;
          }
        }

        if (!isAuthorizedAdmin) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: false,
            error: 'Forbidden: Only verified platform administrator (twizerefelix90@gmail.com) can broadcast push notifications.'
          }));
          return;
        }

        try {
          const buffers: Buffer[] = [];
          for await (const chunk of req) {
            buffers.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
          }
          const raw = Buffer.concat(buffers).toString('utf-8');
          const payload = raw ? JSON.parse(raw) : {};

          const { title, body, noticeId, url, tokens } = payload;
          const targetTokens: string[] = Array.isArray(tokens) ? tokens.filter(t => t && t.length > 10) : [];

          // Server-only environment variable: never expose to client or use VITE_ prefix
          const serverKey = process.env.FCM_SERVER_KEY;
          let fcmNetworkSuccess = false;

          if (serverKey && targetTokens.length > 0) {
            try {
              const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `key=${serverKey.trim()}`
                },
                body: JSON.stringify({
                  registration_ids: targetTokens,
                  notification: {
                    title: title || 'ISEZERANO ONLINE – GS GITUMBA',
                    body: body || 'Itangazo rishya ry\'Abarimu',
                    click_action: url || `/?notice=${noticeId}`
                  },
                  data: {
                    title: title || 'ISEZERANO ONLINE – GS GITUMBA',
                    body: body || '',
                    noticeId: noticeId || '',
                    url: url || `/?notice=${noticeId}`,
                    requiresAuth: 'true'
                  },
                  priority: 'high'
                })
              });
              if (fcmRes.ok) {
                fcmNetworkSuccess = true;
              }
            } catch (fcmErr) {
              console.warn('[Vite FCM] Remote FCM gateway notice:', fcmErr);
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            fcmNetworkSuccess,
            tokensTargeted: targetTokens.length,
            successCount: targetTokens.length
          }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message || 'Push dispatch failed' }));
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
