import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.ts';
import { computeBytesHash8, resolvePostThumbnailSource } from '../server/ogMeta.ts';
import { prerenderStaticBlogDist } from '../scripts/prerenderBlogMeta.ts';
import {
  computeImageDataUriHash8,
  getSingleArticleThumbnailUrl
} from '../src/utils/thumbnailUtils.ts';
import type { BlogPost } from '../src/types/blog.ts';

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
  buf[26] = 0;
  buf[27] = 0;
  buf[28] = 0;
  buf.writeUInt32BE(fillByte, 29);
  return {
    dataUri: `data:image/png;base64,${buf.toString('base64')}`,
    rawBuffer: buf
  };
}

function buildMinimalJpegDataUri(width: number, height: number, markerByte: number): {
  dataUri: string;
  rawBuffer: Buffer;
} {
  const buf = Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x0b, // length = 11
    0x08, // precision
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, // components
    markerByte, 0x11, 0x00,
    0xff, 0xd9 // EOI
  ]);
  return {
    dataUri: `data:image/jpeg;base64,${buf.toString('base64')}`,
    rawBuffer: buf
  };
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

async function runTests(): Promise<void> {
  const pngA = buildMinimalPngDataUri(1200, 630, 0x11223344);
  const updatedPngA = buildMinimalPngDataUri(1200, 630, 0x99887766);
  const staleJpg = buildMinimalJpegDataUri(640, 400, 0xee);
  const secondArticleBodyJpg = buildMinimalJpegDataUri(900, 500, 0xcc);
  const jpgB = buildMinimalJpegDataUri(800, 450, 0xaa);
  const customCoverJpg = buildMinimalJpegDataUri(1200, 630, 0x77);
  const bodyImgUnderCustomJpg = buildMinimalJpegDataUri(700, 420, 0x33);
  const draftJpg = buildMinimalJpegDataUri(1200, 630, 0x55);

  const hashA = computeBytesHash8(pngA.rawBuffer);
  const hashUpdatedA = computeBytesHash8(updatedPngA.rawBuffer);
  const hashB = computeBytesHash8(jpgB.rawBuffer);
  const hashCustomD = computeBytesHash8(customCoverJpg.rawBuffer);

  assert.equal(computeImageDataUriHash8(pngA.dataUri), hashA, 'Client & server byte hash must match');
  assert.equal(computeImageDataUriHash8(jpgB.dataUri), hashB, 'Client & server JPEG byte hash must match');

  const fileA = `rwanda-cbc-term-1-lesson-guide-${hashA}.png`;
  const fileUpdatedA = `rwanda-cbc-term-1-lesson-guide-${hashUpdatedA}.png`;
  const fileB = `nursery-report-card-term-updates-${hashB}.jpg`;
  const fileD = `custom-cover-article-${hashCustomD}.jpg`;

  // Ephemeral in-memory test articles only (never written to Firestore)
  const testPosts: BlogPost[] = [
    {
      id: 'ephemeral_a',
      title: 'Rwanda CBC Term 1 Lesson Guide',
      slug: 'rwanda-cbc-term-1-lesson-guide',
      excerpt: 'Practical classroom strategies for primary educators across Rulindo and Rwanda.',
      // Decorative SVG, tiny 16x16 icon, and logo placed BEFORE the real first article photo;
      // plus stale thumbnailUrl with thumbnailIsCustomOverride: false to verify first content image wins!
      content:
        `<p><img src="data:image/svg+xml;base64,PHN2Zy8+" alt="Badge" />` +
        `<img src="${staleJpg.dataUri}" class="emoji" width="16" height="16" alt="pin" />` +
        `<img src="https://isezerano.online/school-logo.png" alt="Logo" aria-hidden="true" /></p>` +
        `<figure data-blog-figure="true"><img src="${pngA.dataUri}" data-width="760" data-height="400" alt="Classroom Activity" /></figure>` +
        `<figure data-blog-figure="true"><img src="${secondArticleBodyJpg.dataUri}" data-width="760" data-height="400" alt="Second Image" /></figure>`,
      thumbnailUrl: staleJpg.dataUri, // Stale/unrelated URL without custom override
      thumbnailIsCustomOverride: false,
      thumbnailAlt: 'Teachers preparing CBC lessons',
      category: 'CBC Curriculum',
      author: { name: 'Twizere Felix', role: 'Administrator' },
      publishedAt: '2026-11-01T08:00:00.000Z',
      updatedAt: '2026-11-02T10:00:00.000Z',
      status: 'published'
    },
    {
      id: 'ephemeral_b',
      title: 'Nursery Report Card Term Updates',
      slug: 'nursery-report-card-term-updates',
      excerpt: 'How nursery teachers download official term report cards.',
      content: `<p>Download printable nursery report cards effortlessly.</p><figure data-blog-figure="true"><img src="${jpgB.dataUri}" data-width="760" data-height="428" alt="Nursery Cards" /></figure>`,
      thumbnailUrl: jpgB.dataUri,
      thumbnailAlt: 'Nursery Report Card Cover',
      category: 'Announcements',
      author: { name: 'Twizere Felix', role: 'Administrator' },
      publishedAt: '2026-11-03T08:00:00.000Z',
      status: 'published'
    },
    {
      id: 'ephemeral_c',
      title: 'External HTTPS Thumbnail Article',
      slug: 'external-https-thumbnail-article',
      excerpt: 'Article hosted with direct HTTPS cloud storage photo.',
      content: '<p>Full external image article.</p>',
      thumbnailUrl: 'https://cdn.example.org/school-science-1200x630.jpg',
      thumbnailAlt: 'Science Fair',
      category: 'School News',
      author: { name: 'Twizere Felix', role: 'Administrator' },
      publishedAt: '2026-11-04T08:00:00.000Z',
      status: 'published'
    },
    {
      id: 'ephemeral_d',
      title: 'Explicit Custom Cover Article',
      slug: 'custom-cover-article',
      excerpt: 'Uses explicit custom cover selected by the author.',
      content: `<p>Article body image.</p><figure data-blog-figure="true"><img src="${bodyImgUnderCustomJpg.dataUri}" data-width="700" data-height="420" alt="Body Photo" /></figure>`,
      thumbnailUrl: customCoverJpg.dataUri,
      thumbnailIsCustomOverride: true,
      thumbnailAlt: 'Custom Cover Photo',
      category: 'School News',
      author: { name: 'Twizere Felix', role: 'Administrator' },
      publishedAt: '2026-11-05T08:00:00.000Z',
      status: 'published'
    },
    {
      id: 'ephemeral_e',
      title: 'Text Only Educational Notice',
      slug: 'text-only-educational-notice',
      excerpt: 'Notice with no images falls back to website default banner.',
      content: '<p>Pure text educational notice for teachers.</p>',
      thumbnailUrl: '',
      category: 'Announcements',
      author: { name: 'Twizere Felix', role: 'Administrator' },
      publishedAt: '2026-11-06T08:00:00.000Z',
      status: 'published'
    },
    {
      id: 'ephemeral_draft',
      title: 'Private Unpublished Draft Title',
      slug: 'private-unpublished-draft',
      excerpt: 'Must never leak to social crawlers.',
      content: '<p>Unpublished content</p>',
      thumbnailUrl: draftJpg.dataUri,
      category: 'School News',
      author: { name: 'Twizere Felix', role: 'Administrator' },
      publishedAt: '',
      status: 'draft'
    }
  ];

  // Parity check: client getSingleArticleThumbnailUrl MUST match server resolvePostThumbnailSource
  for (const post of testPosts) {
    assert.equal(
      getSingleArticleThumbnailUrl(post),
      resolvePostThumbnailSource(post),
      `Client & server thumbnail selection must match 100% for ${post.slug}`
    );
  }
  assert.equal(
    getSingleArticleThumbnailUrl(testPosts[0]),
    pngA.dataUri,
    'First real content image must win over stale thumbnailUrl & skipped decorative/icon images'
  );
  assert.equal(
    getSingleArticleThumbnailUrl(testPosts[3]),
    customCoverJpg.dataUri,
    'Explicit thumbnailIsCustomOverride: true must select custom cover'
  );
  assert.equal(
    getSingleArticleThumbnailUrl(testPosts[4]),
    '',
    'Text-only article with no images must return empty thumbnail for default banner fallback'
  );

  const app = createServerApp({
    isProd: false,
    providers: {
      fetchPosts: async () => testPosts.filter((p) => p.status === 'published'),
      fetchBranding: async () => null
    }
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Homepage preserves website-level metadata cleanly
    const homeRes = await fetch(`${baseUrl}/`, {
      headers: { 'User-Agent': 'WhatsApp/2.23.20.0' }
    });
    assert.equal(homeRes.status, 200);
    const homeHtml = await homeRes.text();
    assert.equal(homeHtml.includes('<meta property="og:type" content="website" />'), true);
    assert.equal(homeHtml.includes('<meta property="og:title" content="ISEZERANO ONLINE – GS GITUMBA" />'), true);
    assert.equal(
      homeHtml.includes('<meta property="og:image" content="https://isezerano.online/og-isezerano-online.jpg" />'),
      true
    );
    assert.equal(homeHtml.includes('Rwanda CBC Term 1 Lesson Guide'), false, 'Homepage must not leak article metadata');
    console.log('✓ 1. Homepage retains website title, description, and branded OG image');

    // 2. Article A: first real content image overrides stale thumbnailUrl & skips decorative/icon tags
    const articleARes = await fetch(`${baseUrl}/blog/rwanda-cbc-term-1-lesson-guide`, {
      headers: {
        'User-Agent': 'WhatsApp/2.23.20.0',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'isezerano.online'
      }
    });
    assert.equal(articleARes.status, 200);
    const articleAHtml = await articleARes.text();
    assert.equal(countOccurrences(articleAHtml, 'property="og:title"'), 1, 'No duplicate og:title tags');
    assert.equal(countOccurrences(articleAHtml, 'property="og:image"'), 1, 'No duplicate og:image tags');
    assert.equal(articleAHtml.includes('<meta property="og:type" content="article" />'), true);
    assert.equal(articleAHtml.includes('<meta property="og:title" content="Rwanda CBC Term 1 Lesson Guide" />'), true);
    assert.equal(
      articleAHtml.includes(
        `<meta property="og:image" content="https://isezerano.online/og-blog/${fileA}" />`
      ),
      true
    );
    assert.equal(
      articleAHtml.includes(
        `<meta property="og:image:secure_url" content="https://isezerano.online/og-blog/${fileA}" />`
      ),
      true
    );
    assert.equal(
      articleAHtml.includes(
        `<meta name="twitter:image" content="https://isezerano.online/og-blog/${fileA}" />`
      ),
      true
    );
    assert.equal(
      articleAHtml.includes(`"https://isezerano.online/og-blog/${fileA}"`),
      true,
      'Schema.org JSON-LD image must match og:image'
    );
    assert.equal(articleAHtml.includes('/api/blog-og-image/'), false, 'HTML must NOT reference /api/blog-og-image/');
    assert.equal(articleAHtml.includes('<meta property="og:image:width" content="1200" />'), true);
    assert.equal(articleAHtml.includes('<meta property="og:image:height" content="630" />'), true);
    const ogAndTwitterImageTags = articleAHtml.match(
      /<meta\b[^>]*(?:og:image|twitter:image)[^>]*>/gi
    ) || [];
    assert.equal(ogAndTwitterImageTags.length >= 3, true);
    assert.equal(
      ogAndTwitterImageTags.some((tag) => /data:image\/|blob:/i.test(tag)),
      false,
      'HTML OG/Twitter image tags must never expose raw data: or blob: URIs'
    );
    console.log('✓ 2. First real content image selected cleanly (decorative/icon & stale thumbnailUrl ignored)');

    // 3. Binary thumbnail URL serves exact PNG bytes of first real content image
    const imgARes = await fetch(`${baseUrl}/og-blog/${fileA}`);
    assert.equal(imgARes.status, 200);
    assert.equal(imgARes.headers.get('content-type'), 'image/png');
    const imgABuf = Buffer.from(await imgARes.arrayBuffer());
    assert.equal(imgABuf.equals(pngA.rawBuffer), true, 'Served image must equal Article A first content image bytes');
    assert.equal(imgABuf.equals(staleJpg.rawBuffer), false, 'Served image must NOT be stale thumbnailUrl');

    const headARes = await fetch(`${baseUrl}/og-blog/${fileA}`, { method: 'HEAD' });
    assert.equal(headARes.status, 200);
    assert.equal(headARes.headers.get('content-type'), 'image/png');
    console.log('✓ 3. Article A public thumbnail URL returns HTTP 200 image/png matching first content image bytes');

    // 4. Article B returns distinct metadata & distinct JPEG thumbnail (Facebook & Telegram bots)
    const articleBRes = await fetch(`${baseUrl}/blog/nursery-report-card-term-updates`, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }
    });
    assert.equal(articleBRes.status, 200);
    const articleBHtml = await articleBRes.text();
    assert.equal(
      articleBHtml.includes(
        `<meta property="og:image" content="https://isezerano.online/og-blog/${fileB}" />`
      ),
      true
    );

    const imgBRes = await fetch(`${baseUrl}/og-blog/${fileB}`);
    assert.equal(imgBRes.status, 200);
    assert.equal(imgBRes.headers.get('content-type'), 'image/jpeg');
    const imgBBuf = Buffer.from(await imgBRes.arrayBuffer());
    assert.equal(imgBBuf.equals(jpgB.rawBuffer), true);
    assert.equal(imgABuf.equals(imgBBuf), false, 'Different published articles must serve different thumbnails');
    console.log('✓ 4. Article B returns distinct Facebook/Telegram metadata & distinct JPEG thumbnail');

    // 5. Article C external HTTPS, Article D custom override, Article E website default fallback
    const articleCRes = await fetch(`${baseUrl}/blog/external-https-thumbnail-article`, {
      headers: { 'User-Agent': 'TelegramBot (like TwitterBot)' }
    });
    const articleCHtml = await articleCRes.text();
    assert.equal(
      articleCHtml.includes('<meta property="og:image" content="https://cdn.example.org/school-science-1200x630.jpg" />'),
      true
    );

    const articleDRes = await fetch(`${baseUrl}/blog/custom-cover-article`);
    const articleDHtml = await articleDRes.text();
    assert.equal(
      articleDHtml.includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileD}" />`),
      true
    );

    const articleERes = await fetch(`${baseUrl}/blog/text-only-educational-notice`);
    const articleEHtml = await articleERes.text();
    assert.equal(
      articleEHtml.includes('<meta property="og:image" content="https://isezerano.online/og-isezerano-online.jpg" />'),
      true
    );
    console.log('✓ 5. External HTTPS, explicit custom cover, and image-free default banner fallback all verified');

    // 6. Query-param share route /blog?post=... works too
    const queryRouteRes = await fetch(`${baseUrl}/blog?post=nursery-report-card-term-updates`);
    assert.equal(queryRouteRes.status, 200);
    const queryRouteHtml = await queryRouteRes.text();
    assert.equal(queryRouteHtml.includes('<meta property="og:title" content="Nursery Report Card Term Updates" />'), true);
    console.log('✓ 6. Query-string article share URL (?post=...) injects article metadata');

    // 7. Unpublished draft and deleted/non-existent articles are strictly protected
    const draftHtmlRes = await fetch(`${baseUrl}/blog/private-unpublished-draft`);
    assert.equal(draftHtmlRes.status, 200);
    const draftHtml = await draftHtmlRes.text();
    assert.equal(draftHtml.includes('Private Unpublished Draft Title'), false, 'Draft title must NOT leak');

    const draftImgRes = await fetch(`${baseUrl}/og-blog/private-unpublished-draft.jpg`);
    assert.equal(draftImgRes.status, 404);
    const missingImgRes = await fetch(`${baseUrl}/og-blog/non-existent-slug.jpg`);
    assert.equal(missingImgRes.status, 404);
    console.log('✓ 7. Unpublished drafts and non-existent slugs never leak metadata or images');

    // 8. Static Firebase Hosting (Spark plan) dist/ prerender verification + stale cache/file cleanup on rebuild
    const tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-static-dist-'));
    try {
      const realIndexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
      fs.writeFileSync(path.join(tempDistDir, 'index.html'), realIndexHtml, 'utf-8');
      const realBanner = path.resolve(process.cwd(), 'public', 'og-isezerano-online.jpg');
      if (fs.existsSync(realBanner)) {
        fs.copyFileSync(realBanner, path.join(tempDistDir, 'og-isezerano-online.jpg'));
      }

      const prerenderRes = await prerenderStaticBlogDist({
        distDir: tempDistDir,
        origin: 'https://isezerano.online',
        posts: testPosts,
        branding: null
      });
      assert.equal(prerenderRes.prerenderedCount, 5, 'All 5 published articles are pre-rendered into dist/');

      // Check exact files in dist/blog/ & dist/og-blog/
      const generatedHtmlA = fs.readFileSync(
        path.join(tempDistDir, 'blog', 'rwanda-cbc-term-1-lesson-guide', 'index.html'),
        'utf-8'
      );
      assert.equal(
        generatedHtmlA.includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileA}" />`),
        true
      );
      assert.equal(
        generatedHtmlA.includes(`<meta property="og:image:secure_url" content="https://isezerano.online/og-blog/${fileA}" />`),
        true
      );
      assert.equal(
        generatedHtmlA.includes(`<meta name="twitter:image" content="https://isezerano.online/og-blog/${fileA}" />`),
        true
      );
      assert.equal(
        generatedHtmlA.includes(`"https://isezerano.online/og-blog/${fileA}"`),
        true
      );
      assert.equal(
        fs.readFileSync(path.join(tempDistDir, 'og-blog', fileA)).equals(pngA.rawBuffer),
        true,
        'dist/og-blog file bytes must match Article A first content image'
      );
      assert.equal(
        fs.readFileSync(path.join(tempDistDir, 'og-blog', fileB)).equals(jpgB.rawBuffer),
        true,
        'dist/og-blog file bytes must match Article B image'
      );
      assert.equal(
        fs.readFileSync(path.join(tempDistDir, 'og-blog', fileD)).equals(customCoverJpg.rawBuffer),
        true,
        'dist/og-blog file bytes must match Article D custom cover'
      );

      // Simulate static Firebase Hosting (cleanUrls: true, trailingSlash: false, rewrite ** -> /index.html)
      const staticServer = http.createServer((req, res) => {
        const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = pathname.replace(/^\/+/, '');
        const candidates = rel
          ? [
              path.join(tempDistDir, rel),
              path.join(tempDistDir, `${rel.replace(/\/+$/, '')}.html`),
              path.join(tempDistDir, rel, 'index.html')
            ]
          : [path.join(tempDistDir, 'index.html')];

        const matched = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
        const fileToServe = matched || path.join(tempDistDir, 'index.html');
        const ext = path.extname(fileToServe).toLowerCase();
        const mime =
          ext === '.html'
            ? 'text/html; charset=utf-8'
            : ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream';
        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        res.end(fs.readFileSync(fileToServe));
      });

      await new Promise<void>((resolve) => staticServer.listen(0, '127.0.0.1', resolve));
      const staticPort = (staticServer.address() as AddressInfo).port;
      const staticBase = `http://127.0.0.1:${staticPort}`;

      try {
        const staticPageA = await fetch(`${staticBase}/blog/rwanda-cbc-term-1-lesson-guide`);
        assert.equal(staticPageA.status, 200);
        assert.equal(
          (await staticPageA.text()).includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileA}" />`),
          true
        );

        const staticImgA = await fetch(`${staticBase}/og-blog/${fileA}`);
        assert.equal(staticImgA.status, 200);
        assert.equal(staticImgA.headers.get('content-type'), 'image/png');
        assert.equal(Buffer.from(await staticImgA.arrayBuffer()).equals(pngA.rawBuffer), true);

        const staticImgB = await fetch(`${staticBase}/og-blog/${fileB}`);
        assert.equal(staticImgB.status, 200);
        assert.equal(staticImgB.headers.get('content-type'), 'image/jpeg');
        assert.equal(Buffer.from(await staticImgB.arrayBuffer()).equals(jpgB.rawBuffer), true);
      } finally {
        await new Promise<void>((resolve, reject) =>
          staticServer.close((err) => (err ? reject(err) : resolve()))
        );
      }

      // Rebuild verification: changing Article A's first content image removes stale fileA and generates fileUpdatedA
      const updatedPosts = testPosts.map((p) =>
        p.id === 'ephemeral_a'
          ? {
              ...p,
              content: `<figure data-blog-figure="true"><img src="${updatedPngA.dataUri}" data-width="760" data-height="400" alt="Updated Photo" /></figure>`
            }
          : p
      );
      await prerenderStaticBlogDist({
        distDir: tempDistDir,
        origin: 'https://isezerano.online',
        posts: updatedPosts,
        branding: null
      });

      assert.equal(
        fs.existsSync(path.join(tempDistDir, 'og-blog', fileA)),
        false,
        'Stale old thumbnail file must be removed on rebuild'
      );
      assert.equal(
        fs.existsSync(path.join(tempDistDir, 'og-blog', fileUpdatedA)),
        true,
        'New content-hashed thumbnail file must exist on rebuild'
      );
      assert.equal(
        fs.readFileSync(path.join(tempDistDir, 'og-blog', fileUpdatedA)).equals(updatedPngA.rawBuffer),
        true
      );
      const rebuiltHtmlA = fs.readFileSync(
        path.join(tempDistDir, 'blog', 'rwanda-cbc-term-1-lesson-guide', 'index.html'),
        'utf-8'
      );
      assert.equal(
        rebuiltHtmlA.includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileUpdatedA}" />`),
        true
      );

      console.log('✓ 8. Static Firebase Hosting dist/ prerender, unique byte-hashed filenames, and stale cleanup verified');
    } finally {
      fs.rmSync(tempDistDir, { recursive: true, force: true });
    }

    console.log('\nALL BLOG SOCIAL CRAWLER (WHATSAPP / FACEBOOK / TELEGRAM) TESTS PASSED!');
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
