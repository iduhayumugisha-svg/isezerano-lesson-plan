import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.ts';
import { prerenderStaticBlogDist } from '../scripts/prerenderBlogMeta.ts';
import {
  PUBLIC_SITE_ORIGIN,
  PUBLIC_STATIC_SITEMAP_ROUTES,
  escapeXml,
  formatSitemapLastMod,
  generateSitemapXml
} from '../scripts/sitemapGenerator.ts';
import type { BlogPost } from '../src/types/blog.ts';

function assertValidXmlSitemap(xml: string, expectedOrigin: string): void {
  assert.equal(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), true, 'XML must start with UTF-8 declaration');
  assert.equal(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), true, 'Missing standard sitemap namespace');
  assert.equal(xml.includes('</urlset>'), true, 'Missing closing </urlset>');
  assert.doesNotMatch(xml, /<!doctype html|<html\b|<body\b/i, 'Sitemap must NEVER contain HTML tags');

  for (const route of PUBLIC_STATIC_SITEMAP_ROUTES) {
    assert.equal(
      xml.includes(`<loc>${expectedOrigin}${route.path}</loc>`),
      true,
      `Sitemap missing canonical static route: ${route.path}`
    );
  }

  for (const forbidden of ['/admin', '/manage', '/api/']) {
    assert.equal(xml.includes(forbidden), false, `Sitemap must never include private route: ${forbidden}`);
  }
}

function testPublicFilesAndFirebaseConfig(): void {
  const publicSitemapPath = path.resolve('public/sitemap.xml');
  const publicRobotsPath = path.resolve('public/robots.txt');
  const firebaseJsonPath = path.resolve('firebase.json');

  assert.equal(fs.existsSync(publicSitemapPath), true, 'public/sitemap.xml must exist');
  assert.equal(fs.existsSync(publicRobotsPath), true, 'public/robots.txt must exist');

  const staticXml = fs.readFileSync(publicSitemapPath, 'utf-8');
  assertValidXmlSitemap(staticXml, PUBLIC_SITE_ORIGIN);

  const robotsTxt = fs.readFileSync(publicRobotsPath, 'utf-8');
  assert.match(robotsTxt, /User-agent:\s*\*/);
  assert.match(robotsTxt, /Allow:\s*\//);
  assert.match(robotsTxt, /Disallow:\s*\/admin/);
  assert.match(robotsTxt, /Disallow:\s*\/manage/);
  assert.match(robotsTxt, /Sitemap:\s*https:\/\/isezerano\.online\/sitemap\.xml/);

  const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf-8'));
  const headersList: Array<{ source: string; headers: Array<{ key: string; value: string }> }> =
    firebaseJson?.hosting?.headers || [];
  const sitemapHeader = headersList.find((h) => h.source === '/sitemap.xml');
  const robotsHeader = headersList.find((h) => h.source === '/robots.txt');

  assert.ok(sitemapHeader, 'firebase.json must define explicit headers for /sitemap.xml');
  assert.equal(
    sitemapHeader.headers.some(
      (h) => h.key.toLowerCase() === 'content-type' && h.value.includes('application/xml')
    ),
    true,
    '/sitemap.xml header must enforce application/xml'
  );
  assert.ok(robotsHeader, 'firebase.json must define explicit headers for /robots.txt');
  assert.equal(
    robotsHeader.headers.some(
      (h) => h.key.toLowerCase() === 'content-type' && h.value.includes('text/plain')
    ),
    true,
    '/robots.txt header must enforce text/plain'
  );

  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf-8');
  assert.match(indexHtml, /<link rel="sitemap" type="application\/xml" title="Sitemap" href="\/sitemap\.xml" \/>/);

  console.log('✓ 1. Static public/sitemap.xml, public/robots.txt & firebase.json headers verified');
}

function testSitemapGeneratorAndFiltering(): void {
  assert.equal(escapeXml(`a & b < c > d "e" 'f'`), 'a &amp; b &lt; c &gt; d &quot;e&quot; &apos;f&apos;');
  assert.equal(formatSitemapLastMod('2026-11-18T14:22:00Z'), '2026-11-18');
  assert.equal(formatSitemapLastMod('not-a-date'), null);

  const samplePosts: BlogPost[] = [
    {
      id: 'post_1',
      title: 'Published Article 1',
      slug: 'rwanda-school-calendar-2026',
      content: '<p>Public news</p>',
      excerpt: 'Summary',
      thumbnailUrl: '',
      category: 'Education',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-10T08:00:00Z',
      updatedAt: '2026-11-15T10:30:00Z',
      status: 'published'
    },
    {
      id: 'post_2',
      title: 'Published Article Special & Chars',
      slug: 'cbc-&-stem-2026',
      content: '<p>Special</p>',
      excerpt: 'Summary',
      thumbnailUrl: '',
      category: 'Education',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-12T08:00:00Z',
      status: 'published'
    },
    {
      id: 'post_draft',
      title: 'Secret Draft',
      slug: 'secret-draft-article',
      content: '<p>Draft</p>',
      excerpt: '',
      thumbnailUrl: '',
      category: 'News',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '',
      status: 'draft'
    },
    {
      id: 'post_admin_slug',
      title: 'Private Admin Slug Attempt',
      slug: 'admin',
      content: '<p>Blocked</p>',
      excerpt: '',
      thumbnailUrl: '',
      category: 'News',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-12T08:00:00Z',
      status: 'published'
    }
  ];

  const generated = generateSitemapXml({
    origin: 'https://isezerano.online/',
    posts: samplePosts,
    buildDate: '2026-11-20T00:00:00Z'
  });

  assertValidXmlSitemap(generated.xml, PUBLIC_SITE_ORIGIN);
  assert.equal(generated.urlCount, PUBLIC_STATIC_SITEMAP_ROUTES.length + 2);
  assert.equal(
    generated.xml.includes('<loc>https://isezerano.online/blog/rwanda-school-calendar-2026</loc>'),
    true
  );
  assert.equal(generated.xml.includes('<lastmod>2026-11-15</lastmod>'), true);
  assert.equal(
    generated.xml.includes(`<loc>https://isezerano.online/blog/${encodeURIComponent('cbc-&-stem-2026')}</loc>`),
    true
  );
  assert.equal(generated.xml.includes('secret-draft-article'), false, 'Drafts must never appear in sitemap');

  console.log('✓ 2. Sitemap generator XML escaping, canonical article URLs & draft filtering verified');
}

async function testPrerenderAndServerRoutes(): Promise<void> {
  const samplePosts: BlogPost[] = [
    {
      id: 'p_pub',
      title: 'Live Public Story',
      slug: 'live-public-story',
      content: '<p>Full text.</p>',
      excerpt: 'Excerpt.',
      thumbnailUrl: '',
      category: 'News',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-14T09:00:00Z',
      status: 'published'
    },
    {
      id: 'p_priv',
      title: 'Unpublished Story',
      slug: 'unpublished-story',
      content: '<p>Hidden.</p>',
      excerpt: '',
      thumbnailUrl: '',
      category: 'News',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '',
      status: 'draft'
    }
  ];

  // A. Post-build prerender writes dist/sitemap.xml cleanly for both 0 posts and published posts
  const tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-sitemap-dist-'));
  try {
    fs.writeFileSync(path.join(tempDistDir, 'index.html'), fs.readFileSync('index.html', 'utf-8'), 'utf-8');

    const zeroResult = await prerenderStaticBlogDist({
      distDir: tempDistDir,
      origin: PUBLIC_SITE_ORIGIN,
      posts: [],
      branding: null
    });
    assert.equal(zeroResult.sitemapUrlCount, PUBLIC_STATIC_SITEMAP_ROUTES.length);
    assertValidXmlSitemap(fs.readFileSync(path.join(tempDistDir, 'sitemap.xml'), 'utf-8'), PUBLIC_SITE_ORIGIN);

    const populatedResult = await prerenderStaticBlogDist({
      distDir: tempDistDir,
      origin: PUBLIC_SITE_ORIGIN,
      posts: samplePosts,
      branding: null
    });
    assert.equal(populatedResult.prerenderedCount, 1);
    assert.equal(populatedResult.sitemapUrlCount, PUBLIC_STATIC_SITEMAP_ROUTES.length + 1);
    const builtSitemapXml = fs.readFileSync(path.join(tempDistDir, 'sitemap.xml'), 'utf-8');
    assertValidXmlSitemap(builtSitemapXml, PUBLIC_SITE_ORIGIN);
    assert.equal(builtSitemapXml.includes('https://isezerano.online/blog/live-public-story'), true);
    assert.equal(builtSitemapXml.includes('unpublished-story'), false);
  } finally {
    fs.rmSync(tempDistDir, { recursive: true, force: true });
  }

  // B. Express server serves XML /sitemap.xml and text/plain /robots.txt (never SPA HTML)
  const app = createServerApp({
    isProd: false,
    providers: {
      fetchPosts: async () => samplePosts,
      fetchBranding: async () => null
    }
  });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemapRes.status, 200);
    assert.match(sitemapRes.headers.get('content-type') || '', /application\/xml/i);
    const bodyXml = await sitemapRes.text();
    assertValidXmlSitemap(bodyXml, PUBLIC_SITE_ORIGIN);
    assert.equal(bodyXml.includes('https://isezerano.online/blog/live-public-story'), true);
    assert.equal(bodyXml.includes('unpublished-story'), false);

    const headRes = await fetch(`${baseUrl}/sitemap.xml`, { method: 'HEAD' });
    assert.equal(headRes.status, 200);
    assert.match(headRes.headers.get('content-type') || '', /application\/xml/i);

    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    assert.equal(robotsRes.status, 200);
    assert.match(robotsRes.headers.get('content-type') || '', /text\/plain/i);
    const robotsBody = await robotsRes.text();
    assert.match(robotsBody, /Sitemap:\s*https:\/\/isezerano\.online\/sitemap\.xml/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }

  console.log('✓ 3. Post-build dist/sitemap.xml & server XML/robots.txt endpoints verified');
}

async function main(): Promise<void> {
  testPublicFilesAndFirebaseConfig();
  testSitemapGeneratorAndFiltering();
  await testPrerenderAndServerRoutes();
  console.log('\nALL SITEMAP & SEO VALIDATION TESTS PASSED!');
}

main().catch((err) => {
  console.error('SITEMAP & SEO SUITE FAILURE:', err);
  process.exit(1);
});
