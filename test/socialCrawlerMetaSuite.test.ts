import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { createServerApp } from '../server.ts';
import { prerenderStaticBlogDist } from '../scripts/prerenderBlogMeta.ts';
import {
  clearOgMetaCache,
  fetchPublishedBlogPostsFromFirestore,
  findPublishedPostBySlugOrId,
  isGenericBrandingAssetUrl,
  parseBlogRoute,
  readImageDimensionsFromBuffer,
  renderBlogArticleHtml,
  renderMissingArticleHtml,
  renderWebsiteDefaultHtml,
  resolveHomepageSocialImageUrl,
  resolvePostThumbnailSource,
  sniffImageMimeFromBuffer
} from '../server/ogMeta.ts';
import {
  ArticleShareButton,
  buildArticleShareLinks,
  getCanonicalArticleUrl,
  getPublicShareOrigin
} from '../src/components/ArticleShareButton.tsx';
import {
  DEFAULT_CANONICAL_ORIGIN,
  DEFAULT_SEO_DESCRIPTION,
  getCanonicalPublicOrigin,
  isGenericBrandingImageUrl,
  resolveCanonicalDomainRedirectUrl,
  setRegisteredWebsiteLogoUrl,
  updateBlogPostSeo,
  updateMissingArticleSeo,
  updateWebsiteBrandingSeo
} from '../src/services/seoService.ts';
import type { BlogPost } from '../src/types/blog.ts';

function extractMeta(html: string, attr: 'property' | 'name', key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(
    `<meta[^>]*\\b${attr}=["']${escaped}["'][^>]*\\bcontent=["']([^"']*)["'][^>]*>`,
    'i'
  );
  const re2 = new RegExp(
    `<meta[^>]*\\bcontent=["']([^"']*)["'][^>]*\\b${attr}=["']${escaped}["'][^>]*>`,
    'i'
  );
  return (html.match(re1) || html.match(re2))?.[1] ?? null;
}

function buildMinimalJpegDataUri(width: number, height: number, markerByte: number): {
  dataUri: string;
  rawBuffer: Buffer;
} {
  const buf = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x0b,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    markerByte, 0x11, 0x00,
    0xff, 0xd9
  ]);
  return {
    dataUri: `data:image/jpeg;base64,${buf.toString('base64')}`,
    rawBuffer: buf
  };
}

function buildMinimalPngDataUri(width: number, height: number, fillByte: number): {
  dataUri: string;
  rawBuffer: Buffer;
} {
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf[24] = 8;
  buf[25] = 2;
  buf.writeUInt32BE(fillByte, 29);
  return {
    dataUri: `data:image/png;base64,${buf.toString('base64')}`,
    rawBuffer: buf
  };
}

function testHtmlAndFirebaseConfig(): void {
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  assert.match(
    indexHtml,
    /<script type="application\/ld\+json">[\s\S]*?<\/script>\s*<!-- Anti-FOUC Theme Hydration Script/i,
    'index.html JSON-LD script must be cleanly closed before the Anti-FOUC script'
  );
  assert.equal(indexHtml.includes('og-default.jpg'), false, 'index.html must not reference og-default.jpg');
  assert.equal(indexHtml.includes('property="og:image"'), false, 'index.html must not force a generic og:image');
  assert.equal(indexHtml.includes('name="twitter:image"'), false, 'index.html must not force a generic twitter:image');

  const ogDefaultPath = path.resolve('public/og-default.jpg');
  assert.equal(fs.existsSync(ogDefaultPath), false, 'public/og-default.jpg must be permanently deleted');

  const firebaseJsonRaw = fs.readFileSync(path.resolve('firebase.json'), 'utf8');
  assert.equal(firebaseJsonRaw.includes('og-default.jpg'), false, 'firebase.json must not reference og-default.jpg');
  const firebaseJson = JSON.parse(firebaseJsonRaw);
  const headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }> =
    firebaseJson?.hosting?.headers || [];
  const blogGlobRule = headers.find((h) => h.source === '/blog/**');
  assert.ok(blogGlobRule, 'firebase.json must explicitly prevent stale 1h CDN cache on /blog/**');
  assert.equal(
    blogGlobRule.headers.some(
      (h) => h.key.toLowerCase() === 'cache-control' && h.value.includes('no-cache')
    ),
    true
  );

  console.log('✓ 1. Permanent deletion of public/og-default.jpg, index.html cleanup & firebase.json /blog/** headers verified');
}

async function testThreeDistinctArticlesWithCrawlerUserAgents(): Promise<void> {
  const jpg1 = buildMinimalJpegDataUri(1200, 630, 0x11);
  const jpg2 = buildMinimalJpegDataUri(1280, 720, 0x22);
  const png3 = buildMinimalPngDataUri(1200, 675, 0x33);

  const articles: BlogPost[] = [
    {
      id: 'art_1',
      title: 'Kigali Innovation Forum Opens & Welcomes "Regional" Founders',
      slug: 'kigali-innovation-forum-opens',
      excerpt: 'Leaders & founders meet in Kigali for digital growth.',
      content: `<p>First paragraph.</p><img src="${jpg1.dataUri}" alt="Forum" />`,
      thumbnailUrl: jpg1.dataUri,
      category: 'National',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-24T10:00:00Z',
      updatedAt: '2026-11-24T10:00:00Z',
      status: 'published'
    },
    {
      id: 'art_2',
      title: 'Amavubi Secures Home Victory',
      slug: 'amavubi-secures-home-victory',
      excerpt: 'Match report and highlights from Kigali.',
      content: `<p>Match report.</p><img src="${jpg2.dataUri}" alt="Stadium" />`,
      thumbnailUrl: jpg2.dataUri,
      category: 'Culture & Sports',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-25T10:00:00Z',
      updatedAt: '2026-11-25T10:00:00Z',
      status: 'published'
    },
    {
      id: 'art_3',
      title: 'Education Ministry Announces New STEM Labs',
      slug: 'education-ministry-stem-labs',
      excerpt: 'STEM equipment delivered nationwide.',
      content: `<p>STEM classrooms.</p><img src="${png3.dataUri}" alt="STEM" />`,
      thumbnailUrl: png3.dataUri,
      category: 'Education',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-26T04:00:00Z',
      updatedAt: '2026-11-26T04:00:00Z',
      status: 'published'
    }
  ];

  const crawlers = [
    { name: 'Facebook', ua: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    { name: 'WhatsApp', ua: 'WhatsApp/2.23.20.0' },
    { name: 'Telegram', ua: 'TelegramBot (like TwitterBot)' }
  ];

  // A. Express SSR server verification
  const app = createServerApp({
    isProd: false,
    providers: {
      fetchPosts: async () => articles,
      fetchBranding: async () => null
    }
  });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // B. Static Firebase-Hosting-compatible dist verification
  const tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-og-crawler-'));
  let staticServer: http.Server | null = null;

  try {
    fs.writeFileSync(path.join(tempDistDir, 'index.html'), fs.readFileSync('index.html', 'utf8'), 'utf8');

    await prerenderStaticBlogDist({
      distDir: tempDistDir,
      origin: baseUrl,
      posts: articles,
      branding: null
    });

    assert.equal(fs.existsSync(path.join(tempDistDir, 'blog-og-manifest.json')), true);

    staticServer = http.createServer((req, res) => {
      const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = pathname.replace(/^\/+/, '');
      const candidates = rel
        ? [path.join(tempDistDir, rel), path.join(tempDistDir, `${rel.replace(/\/+$/, '')}.html`), path.join(tempDistDir, rel, 'index.html')]
        : [path.join(tempDistDir, 'index.html')];
      const matched = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
      const fileToServe = matched || path.join(tempDistDir, 'index.html');
      const ext = path.extname(fileToServe).toLowerCase();
      const mime =
        ext === '.html'
          ? 'text/html; charset=utf-8'
          : ext === '.png'
          ? 'image/png'
          : ext === '.json'
          ? 'application/json'
          : 'image/jpeg';
      res.statusCode = 200;
      res.setHeader('Content-Type', mime);
      if (req.method === 'HEAD') res.end();
      else res.end(fs.readFileSync(fileToServe));
    });
    await new Promise<void>((resolve) => staticServer!.listen(0, '127.0.0.1', resolve));
    const staticBase = `http://127.0.0.1:${(staticServer.address() as AddressInfo).port}`;

    // Re-prerender with canonical https://isezerano.online origin as Firebase Hosting does
    await prerenderStaticBlogDist({
      distDir: tempDistDir,
      origin: 'https://isezerano.online',
      posts: articles,
      branding: null
    });

    const seenOgImages = new Set<string>();
    const expectedBuffers = [jpg1.rawBuffer, jpg2.rawBuffer, png3.rawBuffer];

    for (let i = 0; i < articles.length; i++) {
      const post = articles[i];
      for (const crawler of crawlers) {
        const res = await fetch(`${staticBase}/blog/${post.slug}`, {
          headers: { 'User-Agent': crawler.ua }
        });
        assert.equal(res.status, 200);
        const rawHtml = await res.text();

        const ogType = extractMeta(rawHtml, 'property', 'og:type');
        const ogTitle = extractMeta(rawHtml, 'property', 'og:title');
        const ogDesc = extractMeta(rawHtml, 'property', 'og:description');
        const ogImage = extractMeta(rawHtml, 'property', 'og:image');
        const ogSecure = extractMeta(rawHtml, 'property', 'og:image:secure_url');
        const ogImgType = extractMeta(rawHtml, 'property', 'og:image:type');
        const ogImgW = extractMeta(rawHtml, 'property', 'og:image:width');
        const ogImgH = extractMeta(rawHtml, 'property', 'og:image:height');
        const ogUrl = extractMeta(rawHtml, 'property', 'og:url');
        const twCard = extractMeta(rawHtml, 'name', 'twitter:card');
        const twTitle = extractMeta(rawHtml, 'name', 'twitter:title');
        const twDesc = extractMeta(rawHtml, 'name', 'twitter:description');
        const twImage = extractMeta(rawHtml, 'name', 'twitter:image');

        assert.equal(ogType, 'article');
        assert.ok(ogTitle && ogDesc);
        assert.equal(rawHtml.includes('&quot;Regional&quot;') || i !== 0, true, 'HTML attributes must be escaped');
        assert.ok(ogImage && ogImage.startsWith('https://isezerano.online/og-blog/'));
        assert.equal(ogSecure, ogImage);
        assert.ok(ogImgType === 'image/jpeg' || ogImgType === 'image/png');
        assert.ok(Number(ogImgW) >= 1200 && Number(ogImgH) >= 630);
        assert.equal(ogUrl, `https://isezerano.online/blog/${post.slug}`);
        assert.equal(twCard, 'summary_large_image');
        assert.equal(twTitle, ogTitle);
        assert.equal(twDesc, ogDesc);
        assert.equal(twImage, ogImage);

        const imgPath = new URL(ogImage).pathname;
        const imgRes = await fetch(`${staticBase}${imgPath}`, {
          headers: { 'User-Agent': crawler.ua }
        });
        assert.equal(imgRes.status, 200);
        assert.match(imgRes.headers.get('content-type') || '', /^image\/(jpeg|png)$/i);
        const imgBuf = Buffer.from(await imgRes.arrayBuffer());
        assert.equal(imgBuf.equals(expectedBuffers[i]), true, `Article ${post.slug} image must match its own bytes`);

        if (crawler.name === 'Facebook') {
          assert.equal(seenOgImages.has(ogImage), false, 'Articles must never leak another article og:image');
          seenOgImages.add(ogImage);
        }
      }
    }

    // Also verify SSR express server has Anti-FOUC hydration script intact after tag stripping
    const ssrRes = await fetch(`${baseUrl}/blog/kigali-innovation-forum-opens`, {
      headers: {
        'User-Agent': 'WhatsApp/2.23.20.0',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'isezerano.online'
      }
    });
    const ssrHtml = await ssrRes.text();
    assert.equal(ssrHtml.includes('isezerano_website_design'), true, 'Anti-FOUC script must remain intact after SEO injection');

    // Live Firestore pre-render check against 3 real published posts when network is available
    const livePosts = await fetchPublishedBlogPostsFromFirestore('isezerano-news', 8000).catch(() => []);
    if (livePosts.length >= 3) {
      const liveTempDist = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-live-og-'));
      try {
        fs.writeFileSync(path.join(liveTempDist, 'index.html'), fs.readFileSync('index.html', 'utf8'), 'utf8');
        const res = await prerenderStaticBlogDist({
          distDir: liveTempDist,
          origin: 'https://isezerano.online',
          posts: livePosts,
          branding: null
        });
        assert.ok(res.prerenderedCount >= 3);
        const sampleThree = livePosts.slice(0, 3);
        const distinctLiveImages = new Set<string>();
        for (const p of sampleThree) {
          const html = fs.readFileSync(path.join(liveTempDist, 'blog', p.slug, 'index.html'), 'utf8');
          const ogImg = extractMeta(html, 'property', 'og:image');
          assert.ok(ogImg && ogImg.startsWith('https://isezerano.online/og-blog/'));
          distinctLiveImages.add(ogImg);
          const relFile = decodeURIComponent(new URL(ogImg).pathname).replace(/^\/+/, '');
          assert.equal(fs.existsSync(path.join(liveTempDist, relFile)), true);
        }
        assert.equal(distinctLiveImages.size, 3, 'Three real published articles must produce 3 distinct static images');
        console.log('✓ 3. Verified static prerender across 3 real live Firestore articles (including newest posts)');
      } finally {
        fs.rmSync(liveTempDist, { recursive: true, force: true });
      }
    }

    console.log('✓ 2. 3 distinct articles verified across Facebook, WhatsApp & Telegram crawlers with HTTP 200 images and zero cross-leakage');
  } finally {
    fs.rmSync(tempDistDir, { recursive: true, force: true });
    if (staticServer) {
      await new Promise<void>((resolve, reject) => staticServer!.close((err) => (err ? reject(err) : resolve())));
    }
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

async function testCanonicalDomainEnforcementAcrossShareCopySeoAndSsr(): Promise<void> {
  const samplePosts: BlogPost[] = [
    {
      id: 'post_barcelona',
      title: 'Barcelona Yatsinzwe Igitego n’Umunyarwanda',
      slug: 'barcelona-yatsinzwe-igitego-numunyarwanda',
      excerpt: 'Inkuru irambuye ku mukino wahuje Barcelona.',
      content: '<p>Paragraph one.</p>',
      thumbnailUrl: buildMinimalJpegDataUri(1200, 630, 0x41).dataUri,
      category: 'Culture & Sports',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-24T08:00:00Z',
      updatedAt: '2026-11-24T08:00:00Z',
      status: 'published'
    },
    {
      id: 'post_kigali',
      title: 'Kigali Innovation Forum Opens',
      slug: 'kigali-innovation-forum-opens',
      excerpt: 'Founders convene in Kigali.',
      content: '<p>Paragraph one.</p>',
      thumbnailUrl: 'https://cdn.example.org/kigali-forum.jpg',
      category: 'Technology',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-25T08:00:00Z',
      updatedAt: '2026-11-25T08:00:00Z',
      status: 'published'
    },
    {
      id: 'post_stem',
      title: 'Education Ministry Announces New STEM Labs',
      slug: 'education-ministry-stem-labs',
      excerpt: 'STEM equipment delivered nationwide.',
      content: '<p>Pure text update.</p>',
      thumbnailUrl: '',
      category: 'Education',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-26T08:00:00Z',
      updatedAt: '2026-11-26T08:00:00Z',
      status: 'published'
    }
  ];

  assert.equal(DEFAULT_CANONICAL_ORIGIN, 'https://isezerano.online');
  assert.equal(getCanonicalPublicOrigin(), 'https://isezerano.online');

  const pollutedOrigins = [
    'https://isezerano-news.firebaseapp.com',
    'https://isezerano-news.web.app',
    'https://ais-pre-preview-123.run.app',
    'http://localhost:3000'
  ];

  // 1. Unit checks across 3 articles & polluted origins
  for (const post of samplePosts) {
    const expectedUrl = `https://isezerano.online/blog/${post.slug}`;
    for (const badOrigin of pollutedOrigins) {
      assert.equal(getCanonicalArticleUrl(post.slug, badOrigin), expectedUrl);
      const links = buildArticleShareLinks(post, badOrigin);
      assert.equal(links.canonicalUrl, expectedUrl);
      assert.equal(decodeURIComponent(links.whatsappUrl).includes(expectedUrl), true);
      assert.equal(decodeURIComponent(links.facebookUrl).includes(expectedUrl), true);
      assert.equal(decodeURIComponent(links.telegramUrl).includes(expectedUrl), true);
      assert.equal(links.whatsappUrl.includes('firebaseapp.com') || links.whatsappUrl.includes('web.app'), false);
      assert.equal(links.facebookUrl.includes('firebaseapp.com') || links.facebookUrl.includes('web.app'), false);
      assert.equal(links.telegramUrl.includes('firebaseapp.com') || links.telegramUrl.includes('web.app'), false);
    }
  }

  // 2. Real React JSDOM UI rendering + copy button + share links under firebaseapp.com & web.app window.location
  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const prevActEnv = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  try {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

    for (const simulatedHostUrl of [
      'https://isezerano-news.firebaseapp.com/blog/barcelona-yatsinzwe-igitego-numunyarwanda',
      'https://isezerano-news.web.app/blog/barcelona-yatsinzwe-igitego-numunyarwanda'
    ]) {
      const dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', {
        url: simulatedHostUrl
      });
      const copiedTexts: string[] = [];

      Object.defineProperty(dom.window.navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            copiedTexts.push(text);
          }
        }
      });

      (globalThis as any).window = dom.window;
      (globalThis as any).document = dom.window.document;
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: dom.window.navigator
      });

      assert.equal(getPublicShareOrigin(), 'https://isezerano.online');

      for (const post of samplePosts) {
        const expectedUrl = `https://isezerano.online/blog/${post.slug}`;

        // Verify runtime SEO tags under simulated firebaseapp.com / web.app window.location
        updateBlogPostSeo(post);
        const canonicalEl = dom.window.document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        const ogUrlEl = dom.window.document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
        const ogImageEl = dom.window.document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
        const jsonLdEl = dom.window.document.getElementById('blog-post-schema-jsonld');

        assert.equal(canonicalEl?.getAttribute('href'), expectedUrl);
        assert.equal(ogUrlEl?.getAttribute('content'), expectedUrl);
        if (post.thumbnailUrl) {
          assert.ok(ogImageEl?.getAttribute('content')?.startsWith('https://'));
          assert.equal(ogImageEl?.getAttribute('content')?.includes('firebaseapp.com'), false);
          assert.equal(ogImageEl?.getAttribute('content')?.includes('web.app'), false);
          assert.equal(ogImageEl?.getAttribute('content')?.includes('og-default.jpg'), false);
        } else {
          assert.equal(ogImageEl, null, 'Image-free article must not receive a deleted default og:image');
        }
        assert.ok(jsonLdEl?.textContent?.includes(expectedUrl));

        // Render ArticleShareButton, open menu, inspect social links & click Copy article link
        const mountNode = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(mountNode);
        const root = createRoot(mountNode);

        await act(async () => {
          root.render(React.createElement(ArticleShareButton, { post, variant: 'button' }));
        });

        const toggleBtn = mountNode.querySelector(`button[aria-label="Share ${post.title}"]`) as HTMLButtonElement | null;
        assert.ok(toggleBtn, `Share button must render for ${post.slug}`);

        await act(async () => {
          toggleBtn.click();
        });

        const menuLinks = Array.from(mountNode.querySelectorAll('a[role="menuitem"]')) as HTMLAnchorElement[];
        assert.equal(menuLinks.length, 3);
        for (const a of menuLinks) {
          const decoded = decodeURIComponent(a.href);
          assert.equal(decoded.includes(expectedUrl), true, `Share link must target ${expectedUrl}`);
          assert.equal(a.href.includes('firebaseapp.com') || a.href.includes('web.app'), false);
        }

        const buttons = Array.from(mountNode.querySelectorAll('button[role="menuitem"]')) as HTMLButtonElement[];
        const copyBtn = buttons.find((b) => b.textContent?.includes('Copy article link'));
        assert.ok(copyBtn, 'Copy article link button must exist');

        const beforeCopyCount = copiedTexts.length;
        await act(async () => {
          copyBtn.click();
        });
        assert.equal(copiedTexts.length, beforeCopyCount + 1);
        assert.equal(copiedTexts[copiedTexts.length - 1], expectedUrl);

        await act(async () => {
          root.unmount();
        });
        mountNode.remove();
      }

      // Also check homepage SEO canonical under simulated firebaseapp.com
      updateWebsiteBrandingSeo(undefined);
      const homeCanonical = dom.window.document.querySelector('link[rel="canonical"]')?.getAttribute('href');
      const homeOgUrl = dom.window.document.querySelector('meta[property="og:url"]')?.getAttribute('content');
      assert.equal(homeCanonical, 'https://isezerano.online/');
      assert.equal(homeOgUrl, 'https://isezerano.online/');

      dom.window.close();
    }
  } finally {
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    if (prevNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', prevNavigatorDescriptor);
    } else {
      delete (globalThis as any).navigator;
    }
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = prevActEnv;
  }

  // 3. SSR Express server check when accessed with firebaseapp.com / web.app forwarded host headers
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
    for (const forwardedHost of ['isezerano-news.firebaseapp.com', 'isezerano-news.web.app', 'ais-pre-x.run.app']) {
      for (const post of samplePosts) {
        const res = await fetch(`${baseUrl}/blog/${post.slug}`, {
          headers: {
            'User-Agent': 'WhatsApp/2.23.20.0',
            'X-Forwarded-Proto': 'https',
            'X-Forwarded-Host': forwardedHost
          }
        });
        assert.equal(res.status, 200);
        const html = await res.text();
        assert.equal(extractMeta(html, 'property', 'og:url'), `https://isezerano.online/blog/${post.slug}`);
        assert.equal(
          html.includes(`<link rel="canonical" href="https://isezerano.online/blog/${post.slug}" />`),
          true
        );
        assert.equal(html.includes(forwardedHost), false, `SSR HTML must never leak ${forwardedHost}`);
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }

  // 4. Redirect helper safety checks (redirect firebaseapp.com / web.app, preserve /__/auth/* & Firebase config)
  assert.equal(
    resolveCanonicalDomainRedirectUrl({
      hostname: 'isezerano-news.firebaseapp.com',
      pathname: '/blog/barcelona-yatsinzwe-igitego-numunyarwanda',
      search: '?ref=wa',
      hash: '#article-comments'
    }),
    'https://isezerano.online/blog/barcelona-yatsinzwe-igitego-numunyarwanda?ref=wa#article-comments'
  );
  assert.equal(
    resolveCanonicalDomainRedirectUrl({
      hostname: 'isezerano-news.web.app',
      pathname: '/blog/kigali-innovation-forum-opens',
      search: '',
      hash: ''
    }),
    'https://isezerano.online/blog/kigali-innovation-forum-opens'
  );
  assert.equal(
    resolveCanonicalDomainRedirectUrl({
      hostname: 'isezerano-news.firebaseapp.com',
      pathname: '/__/auth/handler',
      search: '?apiKey=abc',
      hash: ''
    }),
    null,
    'Firebase Auth /__/auth/handler MUST NOT be redirected'
  );
  assert.equal(
    resolveCanonicalDomainRedirectUrl({
      hostname: 'isezerano.online',
      pathname: '/blog/barcelona-yatsinzwe-igitego-numunyarwanda',
      search: '',
      hash: ''
    }),
    null
  );
  assert.equal(
    resolveCanonicalDomainRedirectUrl({
      hostname: 'localhost',
      pathname: '/',
      search: '',
      hash: ''
    }),
    null
  );

  // Confirm Firebase Auth config in src/config/firebase.ts was preserved
  const firebaseConfigSrc = fs.readFileSync(path.resolve('src/config/firebase.ts'), 'utf8');
  assert.equal(firebaseConfigSrc.includes("authDomain: 'isezerano-news.firebaseapp.com'"), true);

  console.log('✓ 4. https://isezerano.online URL enforcement verified across Copy Link, Share menu, SEO tags, SSR & safe host redirects for 3 articles');
}

async function testBrandingIsolationAndArticleSafety(): Promise<void> {
  // 1. Public directory must never ship any generic OG branding banner image
  const publicFiles = fs.readdirSync(path.resolve('public'));
  for (const name of ['og-default.jpg', 'og-isezerano-online.jpg', 'isezerano-online-logo.jpg']) {
    assert.equal(publicFiles.includes(name), false, `public/${name} must not exist`);
  }

  // 2. Server-side & client-side generic branding filters reject unwanted branding assets & siteLogoUrl
  const blockedUrls = [
    'https://isezerano.online/og-default.jpg',
    'https://isezerano.online/og-isezerano-online.jpg',
    'https://isezerano.online/isezerano-online-logo.jpg',
    '/og-isezerano-online.jpg',
    '/og-default.jpg'
  ];
  const siteLogoBannerUrl = 'https://isezerano.online/assets/homepage-brand-card.jpg';

  for (const badUrl of blockedUrls) {
    assert.equal(isGenericBrandingImageUrl(badUrl), true, `Client filter must block ${badUrl}`);
    assert.equal(isGenericBrandingAssetUrl(badUrl), true, `Server filter must block ${badUrl}`);
  }
  assert.equal(isGenericBrandingImageUrl(siteLogoBannerUrl, [siteLogoBannerUrl]), true);
  assert.equal(isGenericBrandingAssetUrl(siteLogoBannerUrl, [siteLogoBannerUrl]), true);

  // Article A whose cover wrongly points to og-isezerano-online.jpg but body has a real photo -> uses real photo
  const realPhoto = buildMinimalJpegDataUri(1200, 630, 0x5a);
  const articleWithPollutedCoverButRealBody: BlogPost = {
    id: 'art_polluted_cover',
    title: 'Real Photo Overrides Generic Banner',
    slug: 'real-photo-overrides-generic-banner',
    excerpt: 'Article should prefer its real image over generic banner.',
    content: `<p>First text.</p><img src="https://isezerano.online/og-isezerano-online.jpg" alt="banner" /><img src="${realPhoto.dataUri}" alt="Actual News Photo" />`,
    thumbnailUrl: 'https://isezerano.online/og-isezerano-online.jpg',
    category: 'National',
    author: { name: 'Editor', role: 'Admin' },
    publishedAt: '2026-11-26T08:00:00Z',
    updatedAt: '2026-11-26T08:00:00Z',
    status: 'published'
  };
  const resolvedSource = resolvePostThumbnailSource(articleWithPollutedCoverButRealBody);
  assert.equal(resolvedSource, realPhoto.dataUri);
  const templateHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const renderedRealHtml = renderBlogArticleHtml(
    templateHtml,
    articleWithPollutedCoverButRealBody,
    'https://isezerano.online',
    null
  );
  const renderedOgImg = extractMeta(renderedRealHtml, 'property', 'og:image');
  assert.ok(renderedOgImg && renderedOgImg.startsWith('https://isezerano.online/og-blog/real-photo-overrides-generic-banner-'));
  assert.equal(renderedRealHtml.includes('og-isezerano-online.jpg'), false);

  // Article B whose ONLY image is a generic branding image or SVG -> must omit og:image & twitter:image completely
  const articleWithOnlyGenericCover: BlogPost = {
    id: 'art_only_generic',
    title: 'Breaking Update Without Photo',
    slug: 'breaking-update-without-photo',
    excerpt: 'Text-only breaking update.',
    content: '<p>Text-only article body.</p>',
    thumbnailUrl: 'https://isezerano.online/og-isezerano-online.jpg',
    thumbnailIsCustomOverride: true,
    category: 'National',
    author: { name: 'Editor', role: 'Admin' },
    publishedAt: '2026-11-26T09:00:00Z',
    updatedAt: '2026-11-26T09:00:00Z',
    status: 'published'
  };
  assert.equal(resolvePostThumbnailSource(articleWithOnlyGenericCover), '');
  const renderedCleanHtml = renderBlogArticleHtml(
    templateHtml,
    articleWithOnlyGenericCover,
    'https://isezerano.online',
    null
  );
  assert.equal(extractMeta(renderedCleanHtml, 'property', 'og:image'), null);
  assert.equal(extractMeta(renderedCleanHtml, 'property', 'og:image:secure_url'), null);
  assert.equal(extractMeta(renderedCleanHtml, 'name', 'twitter:image'), null);

  // 3. Homepage MAY use its valid HTTPS branding image, while Blog index / articles MUST NEVER inherit it
  const homeHtmlWithBrandImg = renderWebsiteDefaultHtml(
    templateHtml,
    'https://isezerano.online',
    null,
    '/',
    undefined,
    siteLogoBannerUrl
  );
  assert.equal(extractMeta(homeHtmlWithBrandImg, 'property', 'og:image'), siteLogoBannerUrl);

  const blogIdxHtmlWithBrandImgAttempt = renderWebsiteDefaultHtml(
    templateHtml,
    'https://isezerano.online',
    null,
    '/blog',
    'News & Editorial Articles',
    siteLogoBannerUrl
  );
  assert.equal(extractMeta(blogIdxHtmlWithBrandImgAttempt, 'property', 'og:image'), null);

  // 4. Client JSDOM test: switching from Homepage (with branding image + duplicate meta tags) -> Image-free article
  // and Article whose thumbnail matches registered siteLogoBannerUrl
  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const dom = new JSDOM(
    '<!doctype html><html><head>' +
      '<meta property="og:image" content="https://isezerano.online/stale-dup-1.jpg" />' +
      '<meta property="og:image" content="https://isezerano.online/stale-dup-2.jpg" />' +
      '<meta name="twitter:image" content="https://isezerano.online/stale-dup-tw.jpg" />' +
      '</head><body></body></html>',
    { url: 'https://isezerano.online/' }
  );
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;

  try {
    setRegisteredWebsiteLogoUrl(siteLogoBannerUrl);

    // Homepage applies siteLogoBannerUrl cleanly and removes duplicate tags
    updateWebsiteBrandingSeo(undefined, undefined, siteLogoBannerUrl);
    assert.equal(dom.window.document.querySelectorAll('meta[property="og:image"]').length, 1);
    assert.equal(
      dom.window.document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      siteLogoBannerUrl
    );

    // Navigating to an article with NO image (or whose thumbnail equals siteLogoBannerUrl) strips og:image cleanly
    const imageFreeOrSiteLogoArticle: BlogPost = {
      id: 'art_site_logo',
      title: 'Article Must Not Inherit Site Logo',
      slug: 'article-must-not-inherit-site-logo',
      excerpt: 'No custom article photo.',
      content: '<p>Text only.</p>',
      thumbnailUrl: siteLogoBannerUrl,
      category: 'National',
      author: { name: 'Editor', role: 'Admin' },
      publishedAt: '2026-11-26T10:00:00Z',
      updatedAt: '2026-11-26T10:00:00Z',
      status: 'published'
    };
    updateBlogPostSeo(imageFreeOrSiteLogoArticle);
    assert.equal(dom.window.document.querySelectorAll('meta[property="og:image"]').length, 0);
    assert.equal(dom.window.document.querySelectorAll('meta[property="og:image:secure_url"]').length, 0);
    assert.equal(dom.window.document.querySelectorAll('meta[name="twitter:image"]').length, 0);

    // Navigating to an article with an SVG image also emits no og:image
    updateBlogPostSeo({
      ...imageFreeOrSiteLogoArticle,
      id: 'art_svg',
      slug: 'art-svg',
      thumbnailUrl: 'https://isezerano.online/icon.svg'
    });
    assert.equal(dom.window.document.querySelectorAll('meta[property="og:image"]').length, 0);

    // Navigating to an article with a real photo sets ONLY that article's image
    updateBlogPostSeo({
      ...imageFreeOrSiteLogoArticle,
      id: 'art_real',
      slug: 'art-real',
      thumbnailUrl: 'https://cdn.example.org/real-news-photo.jpg'
    });
    assert.equal(dom.window.document.querySelectorAll('meta[property="og:image"]').length, 1);
    assert.equal(
      dom.window.document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      'https://cdn.example.org/real-news-photo.jpg'
    );
  } finally {
    setRegisteredWebsiteLogoUrl('');
    dom.window.close();
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
  }

  // 5. Verify BlogView loading-race guard prevents overwriting prerendered article tags while isLoading === true
  // and missing articles use updateMissingArticleSeo instead of resetDefaultSeo
  const blogViewSrc = fs.readFileSync(path.resolve('src/views/BlogView.tsx'), 'utf8');
  assert.match(
    blogViewSrc,
    /else\s+if\s*\(\s*!activeSlug\s*\)\s*\{\s*resetDefaultSeo\(branding\);\s*\}\s*else\s+if\s*\(\s*!isLoading\s*\)\s*\{\s*updateMissingArticleSeo\(activeSlug,\s*branding\);/m,
    'BlogView must guard resetDefaultSeo and isolate missing article URLs from homepage metadata'
  );

  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.match(
    appSrc,
    /currentPage === 'home' \? logoUrl : undefined/,
    'App.tsx must isolate homepage logoUrl from non-homepage SEO'
  );

  console.log('✓ 5. Generic branding elimination, homepage vs article isolation, duplicate meta cleanup & BlogView loading guard verified');
}

async function testGlobalSeoReliabilityAndProtection(): Promise<void> {
  const olderJpg = buildMinimalJpegDataUri(1200, 630, 0x19);
  const newJpg = buildMinimalJpegDataUri(1280, 720, 0x2a);
  const updatedNewJpg = buildMinimalJpegDataUri(1280, 720, 0x3b);
  const realSiteLogo = buildMinimalJpegDataUri(512, 512, 0x4c);

  const olderPost: BlogPost & { _docId?: string } = {
    id: 'old_post_101',
    _docId: 'doc_old_101',
    title: 'Older Archive Report: Rural Schools Expand Libraries',
    slug: 'older-archive-report-libraries',
    excerpt: DEFAULT_SEO_DESCRIPTION, // accidentally polluted with generic homepage description
    content: `<p>Detailed archive reporting on library access.</p><img src="${olderJpg.dataUri}" alt="Library" />`,
    thumbnailUrl: olderJpg.dataUri,
    category: 'Education',
    author: { name: 'Editor', role: 'Admin' },
    publishedAt: '2025-05-10T08:00:00Z',
    updatedAt: '2025-05-10T08:00:00Z',
    status: 'Published' as any // legacy mixed-case status
  };

  const newerPost: BlogPost & { _docId?: string } = {
    id: 'new_post_202',
    _docId: 'doc_new_202',
    title: 'Breaking Update: Kigali Digital Bus Cards Launch',
    slug: 'breaking-kigali-digital-bus-cards',
    excerpt: 'Commuters begin using contactless cards citywide.',
    content: `<p>Commuters tap contactless cards across Kigali buses.</p><img src="blob:https://isezerano.online/temp-blob-id" alt="Temp"/><img src="${newJpg.dataUri}" alt="Bus Card" />`,
    thumbnailUrl: 'blob:https://isezerano.online/temp-blob-id',
    category: 'National',
    author: { name: 'Editor', role: 'Admin' },
    publishedAt: '2026-11-26T16:00:00Z',
    updatedAt: '2026-11-26T16:00:00Z',
    status: 'published'
  };

  const missingImagePost: BlogPost = {
    id: 'missing_img_303',
    title: 'Public Advisory Without Image',
    slug: 'public-advisory-without-image',
    excerpt: 'Official advisory regarding weekend schedule.',
    content: '<p>Schedule notice with zero images.</p><img src="data:image/svg+xml;base64,PHN2Zy8+" alt="svg"/>',
    thumbnailUrl: 'https://isezerano.online/og-blog/site-logo-12345678.jpg',
    category: 'Announcements',
    author: { name: 'Editor', role: 'Admin' },
    publishedAt: '2026-11-26T15:00:00Z',
    status: 'published'
  };

  const draftPost: BlogPost = {
    id: 'draft_404',
    title: 'Unpublished Draft Story',
    slug: 'unpublished-draft-story',
    excerpt: 'Should never be indexed or returned.',
    content: '<p>Draft body.</p>',
    thumbnailUrl: olderJpg.dataUri,
    category: 'National',
    author: { name: 'Editor', role: 'Admin' },
    publishedAt: '',
    status: 'draft'
  };

  const allPosts = [olderPost, newerPost, missingImagePost, draftPost];

  // 1. Slug, ID, _docId, trailing slash, .html, mixed-case, and malformed URL decoding checks
  assert.equal(parseBlogRoute('/blog/older-archive-report-libraries/').slugOrId, 'older-archive-report-libraries');
  assert.equal(parseBlogRoute('/blog/older-archive-report-libraries.html').slugOrId, 'older-archive-report-libraries');
  assert.equal(parseBlogRoute('/blog/100%-safe-article').isBlogArticle, true);
  assert.equal(parseBlogRoute('/blog/100%-safe-article').slugOrId, '100%-safe-article');

  assert.equal(findPublishedPostBySlugOrId(allPosts, 'older-archive-report-libraries')?.id, 'old_post_101');
  assert.equal(findPublishedPostBySlugOrId(allPosts, 'OLDER-ARCHIVE-REPORT-LIBRARIES.html')?.id, 'old_post_101');
  assert.equal(findPublishedPostBySlugOrId(allPosts, 'old_post_101')?.id, 'old_post_101');
  assert.equal(findPublishedPostBySlugOrId(allPosts, 'doc_old_101')?.id, 'old_post_101');
  assert.equal(findPublishedPostBySlugOrId(allPosts, 'unpublished-draft-story'), null);

  // 2. Older post with accidentally polluted homepage description uses real article body text instead
  const templateHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const olderHtml = renderBlogArticleHtml(templateHtml, olderPost, 'https://isezerano.online', {
    platformTitle: 'ISEZERANO',
    websiteDescription: DEFAULT_SEO_DESCRIPTION
  });
  assert.equal(extractMeta(olderHtml, 'property', 'og:description')?.includes('Detailed archive reporting on library access.'), true);
  assert.equal(extractMeta(olderHtml, 'property', 'og:description')?.includes('Independent digital news, breaking updates'), false);

  // 3. Homepage preserves real logo branding (data:image/jpeg -> /og-blog/site-logo-<hash>.jpg) while articles never inherit it
  const homepageResolved = resolveHomepageSocialImageUrl(realSiteLogo.dataUri, 'https://isezerano.online');
  assert.ok(homepageResolved.publicUrl.startsWith('https://isezerano.online/og-blog/site-logo-'));
  assert.equal(isGenericBrandingImageUrl(homepageResolved.publicUrl), true);
  assert.equal(isGenericBrandingAssetUrl(homepageResolved.publicUrl), true);

  const missingImgHtml = renderBlogArticleHtml(templateHtml, missingImagePost, 'https://isezerano.online', null);
  assert.equal(extractMeta(missingImgHtml, 'property', 'og:image'), null);
  assert.equal(extractMeta(missingImgHtml, 'name', 'twitter:image'), null);

  // 4. Static prerender includes old + new + site-logo, writes slug + id + _docId HTML, and refreshes on update
  const tempDist = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-global-seo-'));
  try {
    fs.writeFileSync(path.join(tempDist, 'index.html'), templateHtml, 'utf8');
    // Plant unwanted stale og-default.jpg inside tempDist to prove build purges it
    fs.writeFileSync(path.join(tempDist, 'og-default.jpg'), 'stale');

    const res1 = await prerenderStaticBlogDist({
      distDir: tempDist,
      origin: 'https://isezerano.online',
      posts: allPosts,
      branding: { platformTitle: 'ISEZERANO' },
      homepageLogoUrl: realSiteLogo.dataUri
    });

    assert.equal(res1.prerenderedCount, 3);
    assert.equal(fs.existsSync(path.join(tempDist, 'og-default.jpg')), false);

    // Homepage keeps its real site-logo og:image & twitter:image
    const builtHome = fs.readFileSync(path.join(tempDist, 'index.html'), 'utf8');
    assert.equal(extractMeta(builtHome, 'property', 'og:image'), homepageResolved.publicUrl);
    assert.equal(extractMeta(builtHome, 'name', 'twitter:image'), homepageResolved.publicUrl);
    assert.equal(
      fs.existsSync(path.join(tempDist, 'og-blog', homepageResolved.fileName!)),
      true,
      'Homepage real site logo file must exist in dist/og-blog/'
    );

    // Old article accessible by slug, id, and _docId; blob: URL skipped cleanly in new post
    assert.equal(fs.existsSync(path.join(tempDist, 'blog', 'older-archive-report-libraries', 'index.html')), true);
    assert.equal(fs.existsSync(path.join(tempDist, 'blog', 'old_post_101', 'index.html')), true);
    assert.equal(fs.existsSync(path.join(tempDist, 'blog', 'doc_old_101', 'index.html')), true);

    const newHtml1 = fs.readFileSync(
      path.join(tempDist, 'blog', 'breaking-kigali-digital-bus-cards', 'index.html'),
      'utf8'
    );
    const ogImg1 = extractMeta(newHtml1, 'property', 'og:image');
    assert.ok(ogImg1 && !ogImg1.includes('blob:') && ogImg1.startsWith('https://isezerano.online/og-blog/'));

    // Subsequent deployment after updating new post image deletes old image and generates fresh hash
    const updatedPosts = allPosts.map((p) =>
      p.id === 'new_post_202'
        ? { ...p, content: `<p>Updated photo.</p><img src="${updatedNewJpg.dataUri}" alt="Updated"/>`, updatedAt: '2026-11-26T17:00:00Z' }
        : p
    );
    await prerenderStaticBlogDist({
      distDir: tempDist,
      origin: 'https://isezerano.online',
      posts: updatedPosts,
      branding: { platformTitle: 'ISEZERANO' },
      homepageLogoUrl: realSiteLogo.dataUri
    });

    const newHtml2 = fs.readFileSync(
      path.join(tempDist, 'blog', 'breaking-kigali-digital-bus-cards', 'index.html'),
      'utf8'
    );
    const ogImg2 = extractMeta(newHtml2, 'property', 'og:image');
    assert.ok(ogImg2 && ogImg2 !== ogImg1);
    const oldFileRel = decodeURIComponent(new URL(ogImg1).pathname).replace(/^\/+/, '');
    assert.equal(fs.existsSync(path.join(tempDist, oldFileRel)), false, 'Old image asset must be purged on rebuild');
  } finally {
    fs.rmSync(tempDist, { recursive: true, force: true });
  }

  // 5. Missing/unresolved article URL NEVER silently gets homepage metadata (SSR + client)
  const missingSsrHtml = renderMissingArticleHtml(templateHtml, 'https://isezerano.online', 'non-existent-slug', {
    platformTitle: 'ISEZERANO'
  });
  assert.equal(extractMeta(missingSsrHtml, 'property', 'og:type'), 'article');
  assert.equal(extractMeta(missingSsrHtml, 'property', 'og:url'), 'https://isezerano.online/blog/non-existent-slug');
  assert.equal(extractMeta(missingSsrHtml, 'name', 'robots'), 'noindex, nofollow');
  assert.equal(extractMeta(missingSsrHtml, 'property', 'og:image'), null);
  assert.equal(missingSsrHtml.includes('Independent digital news, breaking updates'), false);

  const serverApp = createServerApp({
    isProd: false,
    providers: {
      fetchPosts: async () => allPosts.filter((p) => String(p.status).toLowerCase() === 'published'),
      fetchBranding: async () => ({ platformTitle: 'ISEZERANO' })
    }
  });
  const srv = http.createServer(serverApp);
  await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', resolve));
  const srvBase = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  try {
    const missingHttpRes = await fetch(`${srvBase}/blog/does-not-exist-anywhere`, {
      headers: { 'User-Agent': 'WhatsApp/2.23.20.0' }
    });
    const missingHttpHtml = await missingHttpRes.text();
    assert.equal(extractMeta(missingHttpHtml, 'property', 'og:url'), 'https://isezerano.online/blog/does-not-exist-anywhere');
    assert.equal(extractMeta(missingHttpHtml, 'property', 'og:type'), 'article');
    assert.equal(extractMeta(missingHttpHtml, 'property', 'og:image'), null);
    assert.equal(missingHttpHtml.includes('"@type": "WebSite"'), false);
  } finally {
    await new Promise<void>((resolve, reject) => srv.close((err) => (err ? reject(err) : resolve())));
  }

  // 6. Client-side generic description guard + missing article SEO + data-URI homepage logo resolution
  const dom2 = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://isezerano.online/'
  });
  const prevW = (globalThis as any).window;
  const prevD = (globalThis as any).document;
  (globalThis as any).window = dom2.window;
  (globalThis as any).document = dom2.window.document;
  try {
    updateWebsiteBrandingSeo({ platformTitle: 'ISEZERANO' }, undefined, realSiteLogo.dataUri);
    assert.equal(
      dom2.window.document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      homepageResolved.publicUrl
    );
    updateBlogPostSeo(olderPost, { platformTitle: 'ISEZERANO' });
    assert.equal(
      dom2.window.document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.includes('Detailed archive reporting'),
      true
    );
    updateMissingArticleSeo('missing-slug-client', { platformTitle: 'ISEZERANO' });
    assert.equal(
      dom2.window.document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
      'https://isezerano.online/blog/missing-slug-client'
    );
    assert.equal(dom2.window.document.querySelector('meta[property="og:image"]'), null);
  } finally {
    dom2.window.close();
    (globalThis as any).window = prevW;
    (globalThis as any).document = prevD;
  }

  // 7. Pagination resilience check: failed Firestore fetch must never crash or poison posts cache
  clearOgMetaCache();
  const realFetch = globalThis.fetch;
  try {
    let callCount = 0;
    globalThis.fetch = (async () => {
      callCount++;
      return new Response('Service Unavailable', { status: 503 });
    }) as typeof fetch;
    const failedPosts = await fetchPublishedBlogPostsFromFirestore('isezerano-news', 1000);
    assert.deepEqual(failedPosts, []);
    assert.ok(callCount >= 1);
  } finally {
    globalThis.fetch = realFetch;
    clearOgMetaCache();
  }

  console.log('✓ 6. Global SEO protection: old/new/missing/draft posts, slug/ID/docId lookup, cache resilience & homepage real logo verified');
}

async function run(): Promise<void> {
  testHtmlAndFirebaseConfig();
  await testThreeDistinctArticlesWithCrawlerUserAgents();
  await testCanonicalDomainEnforcementAcrossShareCopySeoAndSsr();
  await testBrandingIsolationAndArticleSafety();
  await testGlobalSeoReliabilityAndProtection();
  console.log('\nALL SOCIAL CRAWLER METADATA TESTS PASSED!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('SOCIAL CRAWLER METADATA SUITE FAILURE:', err);
    process.exit(1);
  });
