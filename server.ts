import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import {
  fetchPublishedBlogPostsFromFirestore,
  fetchWebsiteBrandingFromFirestore,
  findPublishedPostBySlugOrId,
  handleBlogOgImageRequest,
  parseBlogRoute,
  renderBlogArticleHtml,
  renderWebsiteDefaultHtml,
  resolvePublicOrigin
} from './server/ogMeta.ts';
import type { OgDataProviders } from './server/ogMeta.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerAppOptions {
  isProd?: boolean;
  providers?: OgDataProviders;
  transformHtml?: (url: string, html: string) => Promise<string>;
}

/**
 * Creates the Express application with:
 * - Public binary thumbnail endpoint `/api/blog-og-image/:slugOrFile` (no auth/cookies required)
 * - Initial HTML Open Graph & Twitter Card injection for `/blog/:slug`, `/blog?post=:slug`, and `/`
 * - Production static file serving + `/api/*` support
 */
export function createServerApp(options: ServerAppOptions = {}): Express {
  const app = express();
  const isProd = options.isProd ?? process.env.NODE_ENV === 'production';
  const rootDir = __dirname;
  const distDir = path.resolve(rootDir, 'dist');
  const publicDir = options.providers?.publicDir || path.resolve(rootDir, 'public');
  const providers: OgDataProviders = {
    ...options.providers,
    publicDir
  };

  // 1. Public Blog Thumbnail Image Endpoints (/og-blog/ static-aligned + legacy /api/blog-og-image/)
  app.all(
    ['/og-blog/:slugOrFile', '/api/blog-og-image/:slugOrFile'],
    async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.status(405).type('text/plain').send('Method Not Allowed');
        return;
      }
      try {
        await handleBlogOgImageRequest(req, res, providers);
      } catch (err) {
        next(err);
      }
    }
  );

  // 2. Production API endpoints (in dev, Vite middleware plugin handles these cleanly too)
  if (isProd) {
    app.get('/api/resolve-image-url', async (req: Request, res: Response) => {
      try {
        const targetUrl = String(req.query.url || '').trim();
        if (!targetUrl || !targetUrl.startsWith('http')) {
          res.status(400).json({ success: false, error: 'URL yuzuye ya HTTPS irakenewe.' });
          return;
        }
        const gdriveMatch = targetUrl.match(
          /^https?:\/\/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+))/i
        );
        if (gdriveMatch) {
          const fileId = gdriveMatch[1] || gdriveMatch[2];
          res.json({ success: true, directUrl: `https://lh3.googleusercontent.com/d/${fileId}` });
          return;
        }
        if (/^https?:\/\/(?:www\.)?dropbox\.com\/.+[?&]dl=0/i.test(targetUrl)) {
          res.json({ success: true, directUrl: targetUrl.replace(/([?&])dl=0/, '$1raw=1') });
          return;
        }
        res.status(400).json({ success: false, error: 'Unsupported viewer URL.' });
      } catch (err) {
        res.status(500).json({
          success: false,
          error: err instanceof Error ? err.message : 'Failed to resolve image URL.'
        });
      }
    });

    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir, { index: false }));
    }
  }

  // 3. Initial HTML SSR Metadata Injection (runs before JavaScript executes on client)
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    const reqPath = req.path || '/';
    const isAssetOrInternal =
      reqPath.startsWith('/api/') ||
      reqPath.startsWith('/src/') ||
      reqPath.startsWith('/@') ||
      reqPath.startsWith('/node_modules/') ||
      reqPath.startsWith('/assets/') ||
      reqPath.startsWith('/og-blog/') ||
      /\.[a-zA-Z0-9]{1,8}$/.test(reqPath);

    if (isAssetOrInternal) {
      next();
      return;
    }

    try {
      const templatePath = isProd
        ? path.resolve(distDir, 'index.html')
        : path.resolve(rootDir, 'index.html');

      if (!fs.existsSync(templatePath)) {
        next();
        return;
      }

      let html = fs.readFileSync(templatePath, 'utf-8');
      if (options.transformHtml) {
        html = await options.transformHtml(req.originalUrl, html);
      }

      const origin = resolvePublicOrigin(req);
      const route = parseBlogRoute(req.originalUrl);

      const loadBranding =
        providers.fetchBranding || (() => fetchWebsiteBrandingFromFirestore());
      const loadPosts =
        providers.fetchPosts || (() => fetchPublishedBlogPostsFromFirestore());

      if (route.isBlogArticle && route.slugOrId) {
        const [posts, branding] = await Promise.all([loadPosts(), loadBranding()]);
        const post = findPublishedPostBySlugOrId(posts, route.slugOrId);

        if (post) {
          html = renderBlogArticleHtml(html, post, origin, branding);
        } else {
          // Never expose unpublished/draft/deleted articles; safely render site metadata
          html = renderWebsiteDefaultHtml(html, origin, branding, '/');
        }
      } else if (route.isBlogIndex) {
        const branding = await loadBranding();
        html = renderWebsiteDefaultHtml(
          html,
          origin,
          branding,
          '/blog',
          'School Blog & Educational Articles'
        );
      } else {
        const branding = await loadBranding();
        html = renderWebsiteDefaultHtml(html, origin, branding, reqPath);
      }

      res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.send(html);
      }
    } catch (err) {
      next(err);
    }
  });

  return app;
}

export async function startServer(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 3000;
  let viteTransform: ((url: string, html: string) => Promise<string>) | undefined;
  let viteMiddlewares: express.RequestHandler | undefined;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom'
    });
    viteMiddlewares = vite.middlewares;
    viteTransform = (url, html) => vite.transformIndexHtml(url, html);
  }

  const app = express();

  // Mount SSR Open Graph + Binary Thumbnail endpoints first so crawlers get article metadata
  const ogApp = createServerApp({
    isProd,
    transformHtml: viteTransform
  });
  app.use(ogApp);

  // In dev mode, delegate remaining Vite/static/API plugin routes to Vite middlewares
  if (!isProd && viteMiddlewares) {
    app.use(viteMiddlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ISEZERANO ONLINE server listening on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
  });
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
