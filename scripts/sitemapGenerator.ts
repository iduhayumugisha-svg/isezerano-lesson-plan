import type { BlogPost } from '../src/types/blog.ts';

export const PUBLIC_SITE_ORIGIN = 'https://isezerano.online';

export interface StaticSitemapRoute {
  path: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

export const PUBLIC_STATIC_SITEMAP_ROUTES: readonly StaticSitemapRoute[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/blog', changefreq: 'daily', priority: '0.9' },
  { path: '/shop', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' }
] as const;

const PRIVATE_SLUG_BLOCKLIST = new Set([
  'admin',
  'manage',
  'api',
  'draft',
  'preview'
]);

export function escapeXml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function formatSitemapLastMod(dateInput?: string | Date | null): string | null {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(String(dateInput).trim());
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export interface GenerateSitemapOptions {
  origin?: string;
  posts?: BlogPost[];
  buildDate?: string | Date;
}

export interface GenerateSitemapResult {
  xml: string;
  urlCount: number;
  urls: string[];
}

export function generateSitemapXml(options: GenerateSitemapOptions = {}): GenerateSitemapResult {
  const rawOrigin = (options.origin || PUBLIC_SITE_ORIGIN).trim().replace(/\/+$/, '');
  const cleanOrigin = rawOrigin.startsWith('https://') || rawOrigin.startsWith('http://')
    ? rawOrigin
    : PUBLIC_SITE_ORIGIN;

  const fallbackDate = formatSitemapLastMod(options.buildDate || new Date());
  const seenUrls = new Set<string>();
  const urlEntries: string[] = [];
  const emittedUrls: string[] = [];

  const appendUrlEntry = (params: {
    loc: string;
    lastmod?: string | null;
    changefreq: string;
    priority: string;
  }) => {
    if (seenUrls.has(params.loc)) return;
    seenUrls.add(params.loc);
    emittedUrls.push(params.loc);

    const lines = [
      '  <url>',
      `    <loc>${escapeXml(params.loc)}</loc>`,
      ...(params.lastmod ? [`    <lastmod>${escapeXml(params.lastmod)}</lastmod>`] : []),
      `    <changefreq>${escapeXml(params.changefreq)}</changefreq>`,
      `    <priority>${escapeXml(params.priority)}</priority>`,
      '  </url>'
    ];
    urlEntries.push(lines.join('\n'));
  };

  // 1. Canonical homepage & public static pages
  for (const route of PUBLIC_STATIC_SITEMAP_ROUTES) {
    const loc = `${cleanOrigin}${route.path}`;
    appendUrlEntry({
      loc,
      lastmod: fallbackDate,
      changefreq: route.changefreq,
      priority: route.priority
    });
  }

  // 2. All published public articles (never drafts, archived, admin, or private posts)
  const posts = Array.isArray(options.posts) ? options.posts : [];
  for (const post of posts) {
    if (!post) continue;
    const status = String(post.status || '').trim().toLowerCase();
    if (status !== 'published') continue;

    const rawSlug = String(post.slug || post.id || '').trim();
    if (
      !rawSlug ||
      rawSlug.includes('..') ||
      rawSlug.includes('/') ||
      rawSlug.includes('\\') ||
      rawSlug.includes('?') ||
      rawSlug.includes('#') ||
      PRIVATE_SLUG_BLOCKLIST.has(rawSlug.toLowerCase())
    ) {
      continue;
    }

    const articleLoc = `${cleanOrigin}/blog/${encodeURIComponent(rawSlug)}`;
    const articleLastMod =
      formatSitemapLastMod(post.updatedAt) ||
      formatSitemapLastMod(post.publishedAt) ||
      formatSitemapLastMod((post as BlogPost & { createdAt?: string }).createdAt) ||
      fallbackDate;

    appendUrlEntry({
      loc: articleLoc,
      lastmod: articleLastMod,
      changefreq: 'weekly',
      priority: '0.8'
    });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlEntries,
    '</urlset>',
    ''
  ].join('\n');

  return {
    xml,
    urlCount: emittedUrls.length,
    urls: emittedUrls
  };
}
