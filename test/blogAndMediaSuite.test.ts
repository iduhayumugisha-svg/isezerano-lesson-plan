import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createServerApp } from '../server.ts';
import {
  clearOgMetaCache,
  computeBytesHash8,
  fetchPublishedBlogPostsFromFirestore,
  readImageDimensionsFromBuffer,
  resolvePostThumbnailSource,
  sniffImageMimeFromBuffer
} from '../server/ogMeta.ts';
import { prerenderStaticBlogDist } from '../scripts/prerenderBlogMeta.ts';
import {
  SEED_BLOG_POSTS,
  generateSlug,
  ensureUniqueSlug,
  prepareBlogPostPayload,
  stripUndefinedForFirestore,
  calculateReadingTime,
  MAX_FIRESTORE_POST_BYTES,
  mergeCategoriesForDisplay,
  validateCategoryInput
} from '../src/services/blogService';
import {
  computeImageDataUriHash8,
  extractFirstImageFromContent,
  getSingleArticleThumbnailUrl,
  isValidPersistentImageSrc,
  extractPlainTextExcerpt,
  sanitizePostThumbnail
} from '../src/utils/thumbnailUtils';
import {
  IMAGE_SIZE_PRESETS,
  computeProportionalHeight,
  computeProportionalWidth,
  buildBlogFigureHtml
} from '../src/components/RichTextEditor';
import { isAuthorizedAdminEmail } from '../src/services/authService';
import {
  DEFAULT_WEBSITE_BRANDING,
  WebsiteBrandingSettings
} from '../src/types/websiteDesign';
import { DEFAULT_AI_BLOG_CATEGORIES, BlogCategory, BlogPost } from '../src/types/blog';
import {
  resolveSiteBrandingSeo,
  updateWebsiteBrandingSeo,
  updateBlogPostSeo,
  DEFAULT_SEO_DESCRIPTION
} from '../src/services/seoService';
import {
  sanitizeCommentPlainText,
  validateArticleCommentInput,
  buildPublicCommentPayload,
  checkCommentRateLimit,
  countApprovedCommentsByPost,
  sortCommentsNewestFirst,
  COMMENT_RATE_LIMIT_COOLDOWN_MS
} from '../src/services/commentService';
import {
  getCanonicalArticleUrl,
  buildArticleShareLinks
} from '../src/components/ArticleShareButton';

const rootDir = process.cwd();

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

function buildMinimalGifBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(14);
  buf.write('GIF89a', 0, 'ascii');
  buf.writeUInt16LE(width, 6);
  buf.writeUInt16LE(height, 8);
  buf[10] = 0x80;
  buf[13] = 0x3b;
  return buf;
}

function buildMinimalWebpVp8xBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(22, 4);
  buf.write('WEBP', 8, 'ascii');
  buf.write('VP8X', 12, 'ascii');
  buf.writeUInt32LE(10, 16);
  const wMinus1 = width - 1;
  const hMinus1 = height - 1;
  buf[24] = wMinus1 & 0xff;
  buf[25] = (wMinus1 >> 8) & 0xff;
  buf[26] = (wMinus1 >> 16) & 0xff;
  buf[27] = hMinus1 & 0xff;
  buf[28] = (hMinus1 >> 8) & 0xff;
  buf[29] = (hMinus1 >> 16) & 0xff;
  return buf;
}

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

// =========================================================================
// PART 1: BLOG FEATURES, IMAGES, THUMBNAILS & FIRESTORE SAFETY
// =========================================================================

function testImageCleanupAndPreservedAssets() {
  const unwantedPhoto = path.join(rootDir, 'src/assets/images/bible_logo_1792762017892.jpg');
  assert.equal(fs.existsSync(unwantedPhoto), false, 'Unwanted bible_logo photo must be deleted');

  const preservedPdf = path.join(rootDir, 'public/assets/aistudio/Class_Reports_N1_Term_1_62cf6792.pdf');
  assert.equal(fs.existsSync(preservedPdf), true, 'Report card asset must remain preserved');

  const walk = (dir: string): string[] => {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    let files: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files = files.concat(walk(full));
      else files.push(full);
    }
    return files;
  };

  const sourceFiles = [...walk(path.join(rootDir, 'src')), path.join(rootDir, 'index.html')];
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.equal(
      /bible_logo|Bible & Cross|Bible image/i.test(content),
      false,
      `Found leftover reference to deleted Bible image in ${file}`
    );
  }
  console.log('✓ 1. Image cleanup & unrelated asset preservation verified');
}

function testNoFakeArticlesOrStockFallbacks() {
  assert.equal(SEED_BLOG_POSTS.length, 0, 'SEED_BLOG_POSTS must stay empty (no fake articles)');

  assert.equal(isValidPersistentImageSrc('blob:http://localhost:3000/12345'), false);
  assert.equal(getSingleArticleThumbnailUrl({ thumbnailUrl: 'blob:http://localhost:3000/abc' }), '');
  assert.equal(getSingleArticleThumbnailUrl({ thumbnailUrl: '' }), '');

  const thumbUtilsCode = fs.readFileSync(path.join(rootDir, 'src/utils/thumbnailUtils.ts'), 'utf8');
  assert.equal(thumbUtilsCode.includes('images.unsplash.com'), false, 'No Unsplash fallback URLs allowed');

  console.log('✓ 2. No fake posts, no blob: URLs, no Unsplash fallbacks verified');
}

function testAutomaticFirstImageThumbnails() {
  const firstImg = 'data:image/jpeg;base64,' + 'A'.repeat(240);
  const secondImg = 'data:image/webp;base64,' + 'B'.repeat(240);

  const htmlWithTwoImages = `
    <p>Intro paragraph before photo.</p>
    ${buildBlogFigureHtml({
      src: firstImg,
      alt: 'Classroom Activity',
      width: 500,
      height: 312,
      sizePreset: 'medium',
      alignment: 'center',
      lockAspectRatio: true
    })}
    <p>Middle text.</p>
    ${buildBlogFigureHtml({
      src: secondImg,
      alt: 'Second Photo',
      width: 300,
      height: 200,
      sizePreset: 'small',
      alignment: 'right',
      lockAspectRatio: true
    })}
  `;

  assert.equal(extractFirstImageFromContent(htmlWithTwoImages), firstImg);
  assert.equal(getSingleArticleThumbnailUrl({ thumbnailUrl: '', content: htmlWithTwoImages }), firstImg);

  const autoPrepared = sanitizePostThumbnail({
    id: 'p_auto',
    title: 'Auto Thumb Post',
    slug: 'auto-thumb-post',
    content: htmlWithTwoImages,
    excerpt: '',
    thumbnailUrl: '',
    category: 'School News',
    author: { name: 'Twizere Felix', role: 'Administrator' },
    publishedAt: '',
    status: 'draft'
  });
  assert.equal(autoPrepared.thumbnailUrl, firstImg);

  const customCover = 'data:image/png;base64,' + 'C'.repeat(240);
  const customPrepared = sanitizePostThumbnail({
    ...autoPrepared,
    thumbnailUrl: customCover,
    thumbnailIsCustomOverride: true
  });
  assert.equal(customPrepared.thumbnailUrl, customCover);

  const imageFreePost: BlogPost = {
    id: 'post_text_only',
    title: 'Term Dates Announcement',
    slug: '',
    content: '<p>Term 2 opens on Monday morning at 08:00.</p>',
    excerpt: '',
    thumbnailUrl: '',
    category: 'Announcements',
    author: { name: 'Twizere Felix', role: 'Administrator' },
    publishedAt: '',
    status: 'published'
  };
  const savedTextOnly = prepareBlogPostPayload(imageFreePost, []);
  if (!savedTextOnly.ok) throw new Error(savedTextOnly.error);
  assert.equal(savedTextOnly.post.thumbnailUrl, '');

  console.log('✓ 3. Automatic first-image thumbnail & image-free placeholder behavior verified');
}

function testImageResizingAndAlignment() {
  assert.equal(IMAGE_SIZE_PRESETS.small, 300);
  assert.equal(IMAGE_SIZE_PRESETS.medium, 500);
  assert.equal(IMAGE_SIZE_PRESETS.large, 760);

  assert.equal(computeProportionalHeight(400, 1600, 900), 225);
  assert.equal(computeProportionalWidth(225, 1600, 900), 400);

  const imgSrc = 'data:image/jpeg;base64,' + 'D'.repeat(200);
  const figureRightSmall = buildBlogFigureHtml({
    src: imgSrc,
    alt: 'Science Lab',
    width: 300,
    height: 180,
    sizePreset: 'small',
    alignment: 'right',
    lockAspectRatio: true
  });
  assert.equal(figureRightSmall.includes('width:300px'), true);
  assert.equal(figureRightSmall.includes('max-width:100%'), true);
  assert.equal(figureRightSmall.includes('text-align:right'), true);
  assert.equal(figureRightSmall.includes('object-fit:cover'), true);
  assert.equal(figureRightSmall.includes('aspect-ratio:300 / 180'), true);

  const figureCustomUnlocked = buildBlogFigureHtml({
    src: imgSrc,
    alt: 'Custom Photo',
    width: 420,
    height: 260,
    sizePreset: 'custom',
    alignment: 'left',
    lockAspectRatio: false
  });
  assert.equal(figureCustomUnlocked.includes('width:420px'), true);
  assert.equal(figureCustomUnlocked.includes('height:260px'), true);
  assert.equal(figureCustomUnlocked.includes('text-align:left'), true);

  console.log('✓ 4. Image size presets, proportional scaling, custom dimensions, and alignment verified');
}

function testEditorAndAdminUiConstraints() {
  const adminManagerCode = fs.readFileSync(path.join(rootDir, 'src/components/AdminBlogManager.tsx'), 'utf8');
  const richEditorCode = fs.readFileSync(path.join(rootDir, 'src/components/RichTextEditor.tsx'), 'utf8');
  const blogViewCode = fs.readFileSync(path.join(rootDir, 'src/views/BlogView.tsx'), 'utf8');
  const indexCssCode = fs.readFileSync(path.join(rootDir, 'src/index.css'), 'utf8');

  assert.equal(adminManagerCode.includes('type="file"'), true);
  assert.equal(adminManagerCode.includes('Image URL'), false);
  assert.equal(adminManagerCode.includes('hideImageUrlInput={true}'), true);
  assert.equal(adminManagerCode.includes('extractFirstImageMetaFromContent'), true);
  assert.equal(adminManagerCode.includes('showSeparateBanner'), true);

  for (const requiredControl of [
    'Font Family',
    'Font Size',
    "'bold'",
    "'italic'",
    "'underline'",
    '<h1>',
    '<h2>',
    '<h3>',
    "'justifyLeft'",
    "'justifyCenter'",
    "'justifyRight'",
    "'justifyFull'",
    'defaultParagraphSeparator',
    'Visual Resize Slider',
    'Toggle proportional aspect ratio lock',
    'Drag corner to resize image'
  ]) {
    assert.equal(
      richEditorCode.includes(requiredControl),
      true,
      `RichTextEditor missing required control: ${requiredControl}`
    );
  }
  assert.equal(richEditorCode.includes('Enter Web Image URL'), false);

  assert.equal(blogViewCode.includes('getSingleArticleThumbnailUrl'), true);
  assert.equal(blogViewCode.includes('Related Articles'), true);
  assert.equal(blogViewCode.includes('showSeparateBanner'), true);
  assert.equal(blogViewCode.includes('object-cover'), true);
  assert.equal(blogViewCode.includes('Article placeholder'), true);
  assert.equal(blogViewCode.includes('dangerouslySetInnerHTML'), true);
  assert.equal(indexCssCode.includes('.blog-article-body'), true);

  console.log('✓ 5. Editor UI, image resize/drag controls, responsive CSS, and public Blog layout verified');
}

function testMultiArticleLifecycleAndSecurity() {
  const thumbA = 'data:image/jpeg;base64,' + 'A'.repeat(240);
  const thumbB = 'data:image/webp;base64,' + 'B'.repeat(240);

  const postAInput: BlogPost = {
    id: 'post_a',
    title: 'CBC Lesson Planning Term 1',
    slug: '',
    content: `<p>Intro.</p>${buildBlogFigureHtml({
      src: thumbA,
      alt: 'Post A Image',
      width: 500,
      height: 312,
      sizePreset: 'medium',
      alignment: 'center',
      lockAspectRatio: true
    })}<p>Details.</p>`,
    excerpt: '',
    thumbnailUrl: '',
    category: 'CBC Curriculum',
    author: { name: 'Twizere Felix', role: 'Administrator' },
    publishedAt: '',
    status: 'draft'
  };

  const postBInput: BlogPost = {
    id: 'post_b',
    title: 'CBC Lesson Planning Term 1',
    slug: '',
    content: `<p>Second article.</p>${buildBlogFigureHtml({
      src: thumbB,
      alt: 'Post B Image',
      width: 300,
      height: 180,
      sizePreset: 'small',
      alignment: 'left',
      lockAspectRatio: true
    })}`,
    excerpt: '',
    thumbnailUrl: '',
    category: 'School News',
    author: { name: 'Twizere Felix', role: 'Administrator' },
    publishedAt: new Date('2026-10-01T08:00:00Z').toISOString(),
    status: 'published'
  };

  const resA = prepareBlogPostPayload(postAInput, []);
  if (!resA.ok) throw new Error(resA.error);
  assert.equal(resA.post.slug, 'cbc-lesson-planning-term-1');
  assert.equal(getSingleArticleThumbnailUrl(resA.post), thumbA);

  const resB = prepareBlogPostPayload(postBInput, [{ id: resA.post.id, slug: resA.post.slug }]);
  if (!resB.ok) throw new Error(resB.error);
  assert.equal(resB.post.slug, 'cbc-lesson-planning-term-1-2');
  assert.equal(getSingleArticleThumbnailUrl(resB.post), thumbB);
  assert.notEqual(getSingleArticleThumbnailUrl(resA.post), getSingleArticleThumbnailUrl(resB.post));

  const oversized = prepareBlogPostPayload(
    { ...postAInput, content: `<p>${'X'.repeat(MAX_FIRESTORE_POST_BYTES + 1000)}</p>` },
    []
  );
  assert.equal(oversized.ok, false);

  assert.equal(isAuthorizedAdminEmail('twizerefelix90@gmail.com'), true);
  assert.equal(isAuthorizedAdminEmail('teacher@school.rw'), false);
  assert.equal(generateSlug('Rwanda CBC Lesson Plan 2026!'), 'rwanda-cbc-lesson-plan-2026');
  assert.equal(
    ensureUniqueSlug('school-news', 'id2', [{ id: 'id1', slug: 'school-news' }]),
    'school-news-2'
  );
  assert.equal(calculateReadingTime('<p>hello world</p>'), 1);
  assert.equal(extractPlainTextExcerpt('<p>Hello <b>world</b></p>', 50), 'Hello world');

  console.log('✓ 6. Multi-article distinct thumbnails, unique slugs, byte-limit guards, and security verified');
}

function assertNoUndefinedValuesForFirestore(value: unknown, fieldPath: string = 'root'): void {
  if (value === undefined) {
    throw new Error(`Firestore invalid data: Unsupported field value: undefined (found in field ${fieldPath})`);
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => assertNoUndefinedValuesForFirestore(item, `${fieldPath}[${idx}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      assertNoUndefinedValuesForFirestore(val, `${fieldPath}.${key}`);
    }
  }
}

function testFirestoreUndefinedFieldSafety() {
  const inlinePhoto = 'data:image/jpeg;base64,' + 'E'.repeat(240);
  const updatedPhoto = 'data:image/png;base64,' + 'F'.repeat(240);
  const customCloudUrl = 'https://firebasestorage.googleapis.com/v0/b/isezerano-news.firebasestorage.app/o/posts%2Fcover.jpg?alt=media';

  const newPublishedInput: BlogPost = {
    id: 'post_1794565379907_bdjru',
    title: 'CBC Formative Assessment Strategies',
    slug: 'cbc-formative-assessment-strategies',
    content: `<p>Practical rubric guidance.</p><figure data-blog-figure="true"><img src="${inlinePhoto}" data-width="500" data-height="312" alt="Rubric" /></figure>`,
    excerpt: '',
    thumbnailUrl: inlinePhoto,
    thumbnailStorageMode: undefined,
    thumbnailIsCustomOverride: false,
    category: 'CBC Curriculum',
    author: { name: 'Twizere Felix', role: 'Administrator', email: undefined },
    publishedAt: new Date('2026-11-13T08:00:00Z').toISOString(),
    tags: undefined,
    status: 'published'
  };

  const publishedRes = prepareBlogPostPayload(newPublishedInput, []);
  if (!publishedRes.ok) throw new Error(publishedRes.error);
  assertNoUndefinedValuesForFirestore(publishedRes.post, 'posts/post_1794565379907_bdjru');
  assert.equal('thumbnailStorageMode' in publishedRes.post, false);
  assert.equal('email' in publishedRes.post.author, false);
  assert.equal('tags' in publishedRes.post, false);
  assert.equal(publishedRes.post.id, 'post_1794565379907_bdjru');
  assert.equal(publishedRes.post.thumbnailUrl, inlinePhoto);

  const draftInput: BlogPost = {
    ...newPublishedInput,
    id: 'post_draft_regression_1',
    status: 'draft',
    publishedAt: '',
    thumbnailStorageMode: undefined
  };
  const draftRes = prepareBlogPostPayload(draftInput, [{ id: publishedRes.post.id, slug: publishedRes.post.slug }]);
  if (!draftRes.ok) throw new Error(draftRes.error);
  assertNoUndefinedValuesForFirestore(draftRes.post, 'posts/post_draft_regression_1');
  assert.equal(draftRes.post.status, 'draft');
  assert.equal('thumbnailStorageMode' in draftRes.post, false);

  const publishExistingDraftInput: BlogPost = {
    ...draftRes.post,
    status: 'published',
    thumbnailStorageMode: undefined
  };
  const publishedDraftRes = prepareBlogPostPayload(publishExistingDraftInput, [
    { id: publishedRes.post.id, slug: publishedRes.post.slug },
    { id: draftRes.post.id, slug: draftRes.post.slug }
  ]);
  if (!publishedDraftRes.ok) throw new Error(publishedDraftRes.error);
  assertNoUndefinedValuesForFirestore(publishedDraftRes.post, 'posts/post_draft_regression_1');
  assert.equal(publishedDraftRes.post.id, draftRes.post.id);
  assert.equal(publishedDraftRes.post.slug, draftRes.post.slug);
  assert.equal(publishedDraftRes.post.status, 'published');
  assert.equal(publishedDraftRes.post.thumbnailUrl, inlinePhoto);

  const embeddedEditRes = prepareBlogPostPayload(
    {
      ...publishedDraftRes.post,
      content: `<p>Updated body.</p><figure data-blog-figure="true"><img src="${updatedPhoto}" data-width="500" data-height="312" alt="Updated" /></figure>`,
      thumbnailUrl: customCloudUrl,
      thumbnailIsCustomOverride: true,
      thumbnailStorageMode: 'firebase_storage'
    },
    [{ id: publishedDraftRes.post.id, slug: publishedDraftRes.post.slug }]
  );
  if (!embeddedEditRes.ok) throw new Error(embeddedEditRes.error);
  assertNoUndefinedValuesForFirestore(embeddedEditRes.post, 'posts/edit_with_storage_mode');
  assert.equal(embeddedEditRes.post.thumbnailStorageMode, 'firebase_storage');
  assert.equal(embeddedEditRes.post.thumbnailUrl, customCloudUrl);

  const switchToFirstImgRes = prepareBlogPostPayload(
    {
      ...embeddedEditRes.post,
      thumbnailIsCustomOverride: false,
      thumbnailStorageMode: undefined
    },
    [{ id: embeddedEditRes.post.id, slug: embeddedEditRes.post.slug }]
  );
  if (!switchToFirstImgRes.ok) throw new Error(switchToFirstImgRes.error);
  assertNoUndefinedValuesForFirestore(switchToFirstImgRes.post, 'posts/switch_to_first_img');
  assert.equal(switchToFirstImgRes.post.thumbnailUrl, updatedPhoto);
  assert.equal('thumbnailStorageMode' in switchToFirstImgRes.post, false);

  const deeplySanitized = stripUndefinedForFirestore({
    a: 1,
    b: undefined,
    nested: { keep: 'ok', drop: undefined },
    list: ['tag1', undefined, 'tag2']
  });
  assertNoUndefinedValuesForFirestore(deeplySanitized);
  assert.deepEqual(deeplySanitized, {
    a: 1,
    nested: { keep: 'ok' },
    list: ['tag1', 'tag2']
  });

  const blogServiceCode = fs.readFileSync(path.join(rootDir, 'src/services/blogService.ts'), 'utf8');
  const adminBlogCode = fs.readFileSync(path.join(rootDir, 'src/components/AdminBlogManager.tsx'), 'utf8');
  assert.equal(blogServiceCode.includes('const firestorePayload = stripUndefinedForFirestore(prepared.post);'), true);
  assert.equal(blogServiceCode.includes('await setDoc(docRef, firestorePayload, { merge: true });'), true);
  assert.equal(adminBlogCode.includes('email: user?.email || undefined'), false);

  console.log('✓ 7. Firestore undefined-value guard & thumbnailStorageMode regression tests verified');
}

// =========================================================================
// PART 2: BRANDING, CATEGORIES & RUNTIME SEO
// =========================================================================

function testWebsiteBrandingDefaultsAndLayout() {
  assert.equal(DEFAULT_WEBSITE_BRANDING.platformTitle, 'ISEZERANO ONLINE');
  assert.equal(typeof DEFAULT_WEBSITE_BRANDING.websiteDescription, 'string');
  assert.equal(DEFAULT_WEBSITE_BRANDING.websiteDescription.length > 10, true);
  assert.equal(DEFAULT_WEBSITE_BRANDING.showWebsiteName, true);
  assert.equal(DEFAULT_WEBSITE_BRANDING.showWebsiteDescription, true);

  const headerCode = fs.readFileSync(path.join(rootDir, 'src/components/WebsiteHeader.tsx'), 'utf8');
  const footerCode = fs.readFileSync(path.join(rootDir, 'src/components/WebsiteFooter.tsx'), 'utf8');
  const homeCode = fs.readFileSync(path.join(rootDir, 'src/views/HomeView.tsx'), 'utf8');
  const designMgrCode = fs.readFileSync(path.join(rootDir, 'src/components/WebsiteDesignManager.tsx'), 'utf8');

  const logoIndex = headerCode.indexOf('logoSettings?.showInHeader !== false && logoUrl && !logoLoadError');
  const nameIndex = headerCode.indexOf('branding?.showWebsiteName !== false');
  const descIndex = headerCode.indexOf('branding?.showWebsiteDescription !== false');
  assert.equal(logoIndex > 0, true);
  assert.equal(nameIndex > logoIndex, true);
  assert.equal(descIndex > nameIndex, true);

  assert.equal(footerCode.includes('showWebsiteName'), true);
  assert.equal(footerCode.includes('showWebsiteDescription'), true);
  assert.equal(homeCode.includes('showWebsiteName'), true);
  assert.equal(homeCode.includes('showWebsiteDescription'), true);

  assert.equal(designMgrCode.includes('showWebsiteName'), true);
  assert.equal(designMgrCode.includes('showWebsiteDescription'), true);
  assert.equal(designMgrCode.includes('removeLogoFile'), true);
  assert.equal(designMgrCode.includes('src={logoUrl || ""}'), false);

  console.log('✓ 8. Branding defaults, visibility toggles, and Logo-before-Name header verified');
}

function testDynamicSeoMetadataUpdates() {
  const expectedDesc =
    'ISEZERANO ONLINE – Rwanda CBC lesson planning, nursery report cards, education resources and articles for teachers and educators.';
  assert.equal(DEFAULT_SEO_DESCRIPTION, expectedDesc);
  assert.equal(DEFAULT_WEBSITE_BRANDING.websiteDescription, expectedDesc);
  assert.equal(fs.existsSync(path.join(rootDir, 'public/og-isezerano-online.jpg')), false);

  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.equal(
    indexHtml.includes('8-column lesson planning platform for educators and teachers at GS GITUMBA and across Rwanda'),
    false
  );
  assert.equal(indexHtml.includes('og-isezerano-online.jpg'), false);
  assert.equal(
    (indexHtml.match(new RegExp(expectedDesc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length >= 4,
    true
  );
  for (const tagSnippet of [
    '<meta property="og:title" content="ISEZERANO ONLINE – GS GITUMBA"',
    'property="og:description"',
    '<meta property="og:url" content="https://isezerano.online/"',
    '<meta name="twitter:card" content="summary_large_image"'
  ]) {
    assert.equal(indexHtml.includes(tagSnippet), true);
  }

  const customBranding: WebsiteBrandingSettings = {
    ...DEFAULT_WEBSITE_BRANDING,
    platformTitle: 'GS GITUMBA PORTAL',
    platformSubtitle: 'NORDIC CBC HUB',
    websiteDescription: 'Custom school portal description managed by Admin.'
  };

  const resolved = resolveSiteBrandingSeo(customBranding);
  assert.equal(resolved.siteName, 'GS GITUMBA PORTAL');
  assert.equal(resolved.fullTitle, 'GS GITUMBA PORTAL – NORDIC CBC HUB');
  assert.equal(resolved.siteDescription, 'Custom school portal description managed by Admin.');

  const defaultResolved = resolveSiteBrandingSeo({});
  assert.equal(defaultResolved.siteName, 'ISEZERANO ONLINE');
  assert.equal(defaultResolved.siteDescription, DEFAULT_SEO_DESCRIPTION);

  const metaMap = new Map<string, { attrs: Record<string, string>; setAttribute: (k: string, v: string) => void; remove: () => void }>();
  const linkMap = new Map<string, { attrs: Record<string, string>; setAttribute: (k: string, v: string) => void }>();
  let schemaTag: { id: string; type: string; textContent: string; remove: () => void } | null = null;

  const mockDocument = {
    title: '',
    head: {
      appendChild: (node: any) => {
        if (node.id === 'blog-post-schema-jsonld') {
          schemaTag = node;
        } else if (node._rel) {
          linkMap.set(node._rel, node);
        } else if (node._metaKey) {
          metaMap.set(node._metaKey, node);
        }
      }
    },
    querySelector: (selector: string) => {
      const metaMatch = selector.match(/^meta\[(name|property)="(.+)"\]$/);
      if (metaMatch) {
        return metaMap.get(`${metaMatch[1]}=${metaMatch[2]}`) || null;
      }
      const linkMatch = selector.match(/^link\[rel="(.+)"\]$/);
      if (linkMatch) {
        return linkMap.get(linkMatch[1]) || null;
      }
      return null;
    },
    getElementById: (id: string) => (id === 'blog-post-schema-jsonld' ? schemaTag : null),
    createElement: (tag: string) => {
      if (tag === 'script') {
        return {
          id: '',
          type: '',
          textContent: '',
          remove: () => {
            schemaTag = null;
          }
        };
      }
      const attrs: Record<string, string> = {};
      const el: any = {
        attrs,
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
          if (k === 'name' || k === 'property') {
            el._metaKey = `${k}=${v}`;
            metaMap.set(el._metaKey, el);
          }
          if (k === 'rel') {
            el._rel = v;
            linkMap.set(v, el);
          }
        },
        remove: () => {
          if (el._metaKey) metaMap.delete(el._metaKey);
        }
      };
      return el;
    }
  };

  const prevDoc = (globalThis as any).document;
  (globalThis as any).document = mockDocument;
  try {
    updateWebsiteBrandingSeo(customBranding);
    assert.equal(mockDocument.title, 'GS GITUMBA PORTAL – NORDIC CBC HUB');
    assert.equal(metaMap.get('name=description')?.attrs.content, 'Custom school portal description managed by Admin.');
    assert.equal(metaMap.get('property=og:site_name')?.attrs.content, 'GS GITUMBA PORTAL – NORDIC CBC HUB');
    assert.equal(metaMap.get('property=og:description')?.attrs.content, 'Custom school portal description managed by Admin.');
    assert.equal(metaMap.has('property=og:image'), false);
    assert.equal(metaMap.has('name=twitter:image'), false);
    assert.equal(metaMap.get('name=twitter:card')?.attrs.content, 'summary_large_image');

    updateBlogPostSeo(
      {
        id: 'post_seo_1',
        title: 'Term 2 Reopening',
        slug: 'term-2-reopening',
        content: '<p>Welcome back to school.</p>',
        excerpt: 'Classes resume Monday.',
        thumbnailUrl: '',
        category: 'Announcements',
        author: { name: 'Twizere Felix', role: 'Administrator' },
        publishedAt: '2026-11-10T08:00:00Z',
        status: 'published'
      },
      customBranding
    );
    assert.equal(mockDocument.title, 'Term 2 Reopening – GS GITUMBA PORTAL – NORDIC CBC HUB');
    assert.equal(metaMap.get('name=description')?.attrs.content, 'Classes resume Monday.');
    assert.equal(metaMap.has('property=og:image'), false);
    assert.equal(metaMap.has('name=twitter:image'), false);
    assert.equal(metaMap.get('name=twitter:card')?.attrs.content, 'summary');

    updateBlogPostSeo(
      {
        id: 'post_seo_2',
        title: 'Science Fair Gallery',
        slug: 'science-fair-gallery',
        content: '<p>Photos from campus.</p><img src="https://cdn.example.org/fair.jpg" alt="Fair" />',
        excerpt: 'Students showcase projects.',
        thumbnailUrl: '',
        category: 'School News',
        author: { name: 'Twizere Felix', role: 'Administrator' },
        publishedAt: '2026-11-11T08:00:00Z',
        status: 'published'
      },
      customBranding
    );
    assert.equal(metaMap.get('property=og:image')?.attrs.content, 'https://cdn.example.org/fair.jpg');
    assert.equal(metaMap.get('property=og:image:secure_url')?.attrs.content, 'https://cdn.example.org/fair.jpg');
    assert.equal(metaMap.get('name=twitter:image')?.attrs.content, 'https://cdn.example.org/fair.jpg');
    assert.equal(metaMap.get('name=twitter:card')?.attrs.content, 'summary_large_image');
  } finally {
    if (prevDoc === undefined) delete (globalThis as any).document;
    else (globalThis as any).document = prevDoc;
  }

  console.log('✓ 9. Initial HTML SEO tags, article og:image, twitter:card, and runtime metadata updates verified');
}

function testBlogCategoryDiscoveryAndValidation() {
  const initialCats = mergeCategoriesForDisplay([], false, [
    { category: 'Community Spotlight' },
    { category: 'All Categories' },
    { category: 'Uncategorized' }
  ]);
  const initialNames = initialCats.map((c: BlogCategory) => c.name);
  for (const aiCat of DEFAULT_AI_BLOG_CATEGORIES) {
    assert.equal(initialNames.includes(aiCat.name), true, `Missing AI category: ${aiCat.name}`);
  }
  assert.equal(initialNames.includes('Community Spotlight'), true);
  assert.equal(initialNames.includes('All Categories'), false);
  assert.equal(initialNames.includes('Uncategorized'), false);

  const customStored: BlogCategory[] = [
    { id: 'cat_1', name: 'STEM Club', slug: 'stem-club', description: 'Science updates' }
  ];
  const postInitCats = mergeCategoriesForDisplay(customStored, true, []);
  assert.deepEqual(postInitCats.map((c: BlogCategory) => c.name), ['STEM Club']);

  assert.equal(validateCategoryInput('   ', initialCats).valid, false);
  assert.equal(validateCategoryInput('All Categories', initialCats).valid, false);
  assert.equal(validateCategoryInput('cbc curriculum', initialCats).valid, false);
  assert.equal(validateCategoryInput('CBC Curriculum', initialCats, 'ai_cat_cbc_curriculum').valid, true);
  assert.equal(validateCategoryInput('Sports & Culture', initialCats).valid, true);

  console.log('✓ 10. Blog category AI migration, post discovery, deletion persistence, and validation verified');
}

function testPostEditingPreservationAndSecurity() {
  const richEditorCode = fs.readFileSync(path.join(rootDir, 'src/components/RichTextEditor.tsx'), 'utf8');
  const adminBlogCode = fs.readFileSync(path.join(rootDir, 'src/components/AdminBlogManager.tsx'), 'utf8');
  const blogViewCode = fs.readFileSync(path.join(rootDir, 'src/views/BlogView.tsx'), 'utf8');
  const brandingServiceCode = fs.readFileSync(path.join(rootDir, 'src/services/websiteDesignService.ts'), 'utf8');

  assert.equal(richEditorCode.includes("const lastEmittedHtmlRef = useRef<string>('');"), true);
  assert.equal(adminBlogCode.includes('key={draft.id}'), true);
  assert.equal(
    adminBlogCode.includes('Boolean(resolvedThumb && firstContentThumb && resolvedThumb !== firstContentThumb)'),
    true,
    'AdminBlogManager must only treat non-matching inline vs explicit thumbnails as custom override'
  );
  assert.equal(adminBlogCode.includes('saveBlogCategory'), true);
  assert.equal(adminBlogCode.includes('deleteBlogCategory'), true);
  assert.equal(adminBlogCode.includes('updatePostCategory'), true);
  assert.equal(adminBlogCode.includes('Image URL'), false);

  assert.equal(blogViewCode.includes('subscribeToBlogCategories'), true);
  assert.equal(blogViewCode.includes('mergeCategoriesForDisplay'), true);

  assert.equal(brandingServiceCode.includes('stripUndefinedDeep'), true);
  assert.equal(isAuthorizedAdminEmail('twizerefelix90@gmail.com'), true);
  assert.equal(isAuthorizedAdminEmail('unauthorized@example.com'), false);

  console.log('✓ 11. Post edit-preservation, live BlogView categories, and security checks verified');
}

// =========================================================================
// PART 3: COMMENTS, MODERATION, SHARING & NEWSPAPER REDESIGN
// =========================================================================

function testCommentsSharingAndNewspaperRedesign() {
  const homeCode = fs.readFileSync(path.join(rootDir, 'src/views/HomeView.tsx'), 'utf8');
  const blogCode = fs.readFileSync(path.join(rootDir, 'src/views/BlogView.tsx'), 'utf8');
  const adminCode = fs.readFileSync(path.join(rootDir, 'src/components/AdminBlogManager.tsx'), 'utf8');
  const headerCode = fs.readFileSync(path.join(rootDir, 'src/components/WebsiteHeader.tsx'), 'utf8');
  const appCode = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf8');
  const thumbCode = fs.readFileSync(path.join(rootDir, 'src/components/ArticleThumbnailImage.tsx'), 'utf8');
  const commentsCode = fs.readFileSync(path.join(rootDir, 'src/components/ArticleCommentsSection.tsx'), 'utf8');
  const shareCode = fs.readFileSync(path.join(rootDir, 'src/components/ArticleShareButton.tsx'), 'utf8');
  const commentServiceCode = fs.readFileSync(path.join(rootDir, 'src/services/commentService.ts'), 'utf8');

  // Reading-time removal
  assert.equal(homeCode.includes('min read'), false);
  assert.equal(homeCode.includes('readTimeMinutes'), false);
  assert.equal(blogCode.includes('min read'), false);
  assert.equal(blogCode.includes('readTimeMinutes'), false);
  assert.equal(adminCode.includes('min read'), false);

  // Comment sanitization & spam guards
  const dirty = 'Hello <script>alert("xss")</script><b>Teachers</b>! <img src=x onerror=alert(1)> javascript:void(0)';
  const cleaned = sanitizeCommentPlainText(dirty, { preserveNewlines: true });
  assert.equal(cleaned.includes('<script'), false);
  assert.equal(cleaned.includes('alert("xss")'), false);
  assert.equal(cleaned.includes('<img'), false);
  assert.equal(cleaned.includes('javascript:'), false);
  assert.equal(cleaned.includes('Teachers'), true);

  assert.equal(validateArticleCommentInput({ postId: 'p', name: 'Spam', content: 'Hi!', honeypot: 'http://x' }).valid, false);
  assert.equal(validateArticleCommentInput({ postId: 'p', name: 'A', content: 'Valid body' }).valid, false);
  assert.equal(validateArticleCommentInput({ postId: 'p', name: 'Jean Paul', content: 'x' }).valid, false);
  assert.equal(validateArticleCommentInput({ postId: 'p', name: 'N'.repeat(81), content: 'Valid body' }).valid, false);
  assert.equal(validateArticleCommentInput({ postId: 'p', name: 'Jean Paul', content: 'M'.repeat(2001) }).valid, false);
  assert.equal(validateArticleCommentInput({ postId: 'p', name: 'Reader', content: 'https://a.com https://b.com https://c.com' }).valid, false);

  const validInput = validateArticleCommentInput({
    postId: 'post_abc',
    name: '  Marie Claire  ',
    content: 'Thank you for this helpful CBC update!\nVery clear.'
  });
  assert.equal(validInput.valid, true);
  assert.equal(validInput.sanitizedName, 'Marie Claire');

  const payload = buildPublicCommentPayload({
    postId: validInput.sanitizedPostId,
    name: validInput.sanitizedName,
    content: validInput.sanitizedContent,
    createdAt: '2026-11-13T10:30:00.000Z'
  });
  assert.deepEqual(Object.keys(payload).sort(), ['content', 'createdAt', 'name', 'postId', 'status']);
  assert.equal(payload.status, 'pending');

  // Rate limiting & counting
  const now = 1_700_000_000_000;
  assert.equal(checkCommentRateLimit([], now).allowed, true);
  assert.equal(checkCommentRateLimit([now - 5_000], now).allowed, false);
  assert.equal(checkCommentRateLimit([now - COMMENT_RATE_LIMIT_COOLDOWN_MS - 100], now).allowed, true);
  assert.equal(
    checkCommentRateLimit([now - 120_000, now - 100_000, now - 80_000, now - 60_000, now - 25_000], now).allowed,
    false
  );

  const counts = countApprovedCommentsByPost([
    { postId: 'post_1', status: 'approved' },
    { postId: 'post_1', status: 'approved' },
    { postId: 'post_1', status: 'pending' },
    { postId: 'post_1', status: 'rejected' },
    { postId: 'post_2', status: 'approved' }
  ]);
  assert.equal(counts['post_1'], 2);
  assert.equal(counts['post_2'], 1);

  const sorted = sortCommentsNewestFirst([
    { id: 'c1', postId: 'p1', name: 'Older', content: 'First', status: 'approved', createdAt: '2026-11-12T08:00:00.000Z' },
    { id: 'c2', postId: 'p1', name: 'Newer', content: 'Second', status: 'approved', createdAt: '2026-11-13T09:15:00.000Z' }
  ]);
  assert.equal(sorted[0].id, 'c2');

  // Sharing links
  assert.equal(getCanonicalArticleUrl('rwanda-cbc-update', 'https://isezerano.online'), 'https://isezerano.online/blog/rwanda-cbc-update');
  const links = buildArticleShareLinks(
    { id: 'post_1', slug: 'rwanda-cbc-update', title: 'Rwanda CBC Update' },
    'https://isezerano.online'
  );
  assert.equal(links.canonicalUrl, 'https://isezerano.online/blog/rwanda-cbc-update');
  assert.equal(links.whatsappUrl.startsWith('https://wa.me/?text='), true);
  assert.equal(decodeURIComponent(links.whatsappUrl).includes('https://isezerano.online/blog/rwanda-cbc-update'), true);
  assert.equal(links.facebookUrl, 'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fisezerano.online%2Fblog%2Frwanda-cbc-update');
  assert.equal(links.telegramUrl.startsWith('https://t.me/share/url?url='), true);
  assert.equal(decodeURIComponent(links.telegramUrl).includes('Rwanda CBC Update'), true);

  // UI & admin moderation wiring
  assert.equal(homeCode.includes('ArticleShareButton'), true);
  assert.equal(homeCode.includes('handleOpenComments'), true);
  assert.equal(blogCode.includes('ArticleCommentsSection'), true);
  assert.equal(blogCode.includes('ArticleShareButton'), true);
  assert.equal(blogCode.includes('updateBlogPostSeo'), true);
  assert.equal(appCode.includes('subscribeToApprovedCommentCounts'), true);
  assert.equal(appCode.includes('focusArticleComments'), true);
  assert.equal(commentsCode.includes('id="article-comments"'), true);
  assert.equal(commentsCode.includes('formattedDate'), true);
  assert.equal(commentsCode.includes('formattedTime'), true);
  assert.equal(commentsCode.includes('dangerouslySetInnerHTML'), false);
  assert.equal(shareCode.includes('navigator.share'), true);
  assert.equal(shareCode.includes('WhatsApp'), true);
  assert.equal(shareCode.includes('Facebook'), true);
  assert.equal(shareCode.includes('Telegram'), true);
  assert.equal(shareCode.includes('Copy article link'), true);
  assert.equal(adminCode.includes("setDashboardTab('comments')"), true);
  assert.equal(adminCode.includes('subscribeToAllCommentsForAdmin'), true);
  assert.equal(adminCode.includes("handleModerateComment(comment, 'approved')"), true);
  assert.equal(adminCode.includes("handleModerateComment(comment, 'rejected')"), true);
  assert.equal(adminCode.includes('handleConfirmDeleteComment'), true);
  assert.equal(commentServiceCode.includes("where('status', '==', 'approved')"), true);

  // Newspaper redesign & three-dot menu checks
  const tier2Marker = 'TIER 2: NEWSPAPER CATEGORY NAVIGATION BAR';
  const tier2Index = headerCode.indexOf(tier2Marker);
  assert.equal(tier2Index > 0, true);
  const tier1OverflowSection = headerCode.slice(0, tier2Index);
  const tier2NavSection = headerCode.slice(tier2Index);

  for (const movedSection of ['Lesson Preparation', 'CBC Report Cards N1-N3', 'Admin Portal']) {
    assert.equal(tier1OverflowSection.includes(movedSection), true);
    assert.equal(tier2NavSection.includes(movedSection), false);
  }
  for (const excludedMainItem of ['Ahabanza (Home)', 'Blog & Articles']) {
    assert.equal(tier2NavSection.includes(excludedMainItem), false);
  }
  assert.equal(tier1OverflowSection.includes("handleNavClick('dashboard')"), true);
  assert.equal(tier1OverflowSection.includes("handleNavClick('nursery')"), true);
  assert.equal(tier1OverflowSection.includes("handleNavClick('admin')"), true);
  assert.equal(tier1OverflowSection.includes('MoreVertical'), true);
  assert.equal(headerCode.includes('subscribeToBlogCategories'), true);
  assert.equal(headerCode.includes('mergeCategoriesForDisplay'), true);
  assert.equal(tier2NavSection.includes('All News'), true);
  assert.equal(tier2NavSection.includes('resolvedCategories.map'), true);
  assert.equal(tier2NavSection.includes('whitespace-nowrap shrink-0'), true);

  assert.equal(homeCode.includes('Create Lesson Plan'), false);
  assert.equal(homeCode.includes('Open Report Cards'), false);
  for (const marker of [
    'getSingleArticleThumbnailUrl',
    'ArticleThumbnailImage',
    'Latest Headlines',
    'Latest News',
    'categorySections.map',
    'extractPlainTextExcerpt',
    'showWebsiteName',
    'showWebsiteDescription'
  ]) {
    assert.equal(homeCode.includes(marker), true, `HomeView missing expected marker: ${marker}`);
  }
  assert.equal(thumbCode.includes('Article placeholder'), true);
  assert.equal(homeCode.includes('object-cover'), true);
  assert.equal(appCode.includes('subscribeToBlogPosts'), true);
  assert.equal(appCode.includes('subscribeToBlogCategories'), true);
  assert.equal(appCode.includes('handleOpenNewspaperArticle'), true);
  assert.equal(appCode.includes('AdminPortalGateway'), true);
  assert.equal(appCode.includes('LessonPlanAuthGate'), true);

  console.log('✓ 12. Comments, moderation, sharing & newspaper redesign verified');
}

// =========================================================================
// PART 4: SOCIAL CRAWLER PREVIEWS, PROBLEM 2 MULTI-FORMAT & PAGINATED FIRESTORE
// =========================================================================

async function testSocialCrawlersAndAllPostThumbnails(): Promise<void> {
  const pngA = buildMinimalPngDataUri(1200, 630, 0x11223344);
  const updatedPngA = buildMinimalPngDataUri(1200, 630, 0x99887766);
  const staleJpg = buildMinimalJpegDataUri(640, 400, 0xee);
  const secondArticleBodyJpg = buildMinimalJpegDataUri(900, 500, 0xcc);
  const jpgB = buildMinimalJpegDataUri(800, 450, 0xaa);
  const customCoverJpg = buildMinimalJpegDataUri(1200, 630, 0x77);
  const bodyImgUnderCustomJpg = buildMinimalJpegDataUri(700, 420, 0x33);
  const draftJpg = buildMinimalJpegDataUri(1200, 630, 0x55);
  const gifBuf = buildMinimalGifBuffer(640, 360);
  const webpBuf = buildMinimalWebpVp8xBuffer(1200, 675);

  assert.deepEqual(sniffImageMimeFromBuffer(gifBuf), { mimeType: 'image/gif', ext: 'gif' });
  assert.deepEqual(readImageDimensionsFromBuffer(gifBuf, 'image/gif'), { width: 640, height: 360 });
  assert.deepEqual(sniffImageMimeFromBuffer(webpBuf), { mimeType: 'image/webp', ext: 'webp' });
  assert.deepEqual(readImageDimensionsFromBuffer(webpBuf, 'image/webp'), { width: 1200, height: 675 });

  // Problem 2 parity checks for alternative post fields, lazy-load img attrs, unquoted attrs, protocol upgrades, relative URLs
  const postFeaturedField: Partial<BlogPost> = {
    featuredImage: 'http://cdn.example.org/featured.jpg',
    content: '<p>Text</p>'
  };
  assert.equal(getSingleArticleThumbnailUrl(postFeaturedField), 'https://cdn.example.org/featured.jpg');
  assert.equal(resolvePostThumbnailSource(postFeaturedField), 'https://cdn.example.org/featured.jpg');

  const postImageObjectField: Partial<BlogPost> = {
    image: { url: '//cdn.example.org/object-cover.webp' },
    content: '<p>Text</p>'
  };
  assert.equal(getSingleArticleThumbnailUrl(postImageObjectField), 'https://cdn.example.org/object-cover.webp');
  assert.equal(resolvePostThumbnailSource(postImageObjectField), 'https://cdn.example.org/object-cover.webp');

  const postLazyAndUnquoted: Partial<BlogPost> = {
    content: '<img src=data:image/svg+xml;base64,PHN2Zy8+ alt=logo><img data-src=/media/campus-photo.png alt="Campus">'
  };
  assert.equal(getSingleArticleThumbnailUrl(postLazyAndUnquoted), '/media/campus-photo.png');
  assert.equal(resolvePostThumbnailSource(postLazyAndUnquoted), '/media/campus-photo.png');

  const hashA = computeBytesHash8(pngA.rawBuffer);
  const hashUpdatedA = computeBytesHash8(updatedPngA.rawBuffer);
  const hashB = computeBytesHash8(jpgB.rawBuffer);
  const hashCustomD = computeBytesHash8(customCoverJpg.rawBuffer);

  assert.equal(computeImageDataUriHash8(pngA.dataUri), hashA);
  assert.equal(computeImageDataUriHash8(jpgB.dataUri), hashB);

  const fileA = `rwanda-cbc-term-1-lesson-guide-${hashA}.png`;
  const fileUpdatedA = `rwanda-cbc-term-1-lesson-guide-${hashUpdatedA}.png`;
  const fileB = `nursery-report-card-term-updates-${hashB}.jpg`;
  const fileD = `custom-cover-article-${hashCustomD}.jpg`;

  // Mock external binary asset server serving WebP with generic application/octet-stream Content-Type
  const externalWebpServer = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.end(webpBuf);
  });
  await new Promise<void>((resolve) => externalWebpServer.listen(0, '127.0.0.1', resolve));
  const extPort = (externalWebpServer.address() as AddressInfo).port;

  const testPosts: BlogPost[] = [
    {
      id: 'ephemeral_a',
      title: 'Rwanda CBC Term 1 Lesson Guide',
      slug: 'rwanda-cbc-term-1-lesson-guide',
      excerpt: 'Practical classroom strategies for primary educators across Rulindo and Rwanda.',
      content:
        `<p><img src="data:image/svg+xml;base64,PHN2Zy8+" alt="Badge" />` +
        `<img src="${staleJpg.dataUri}" class="emoji" width="16" height="16" alt="pin" />` +
        `<img src="https://isezerano.online/school-logo.png" alt="Logo" aria-hidden="true" /></p>` +
        `<figure data-blog-figure="true"><img src="${pngA.dataUri}" data-width="760" data-height="400" alt="Classroom Activity" /></figure>` +
        `<figure data-blog-figure="true"><img src="${secondArticleBodyJpg.dataUri}" data-width="760" data-height="400" alt="Second Image" /></figure>`,
      thumbnailUrl: staleJpg.dataUri,
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
      coverImage: 'https://cdn.example.org/school-science-1200x630.jpg',
      thumbnailUrl: '',
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

  for (const post of testPosts) {
    assert.equal(getSingleArticleThumbnailUrl(post), resolvePostThumbnailSource(post));
  }
  assert.equal(getSingleArticleThumbnailUrl(testPosts[0]), pngA.dataUri);
  assert.equal(getSingleArticleThumbnailUrl(testPosts[2]), 'https://cdn.example.org/school-science-1200x630.jpg');
  assert.equal(getSingleArticleThumbnailUrl(testPosts[3]), customCoverJpg.dataUri);
  assert.equal(getSingleArticleThumbnailUrl(testPosts[4]), '');

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
    // 1. Homepage preserves site metadata without deleted og-isezerano-online.jpg
    const homeRes = await fetch(`${baseUrl}/`, { headers: { 'User-Agent': 'WhatsApp/2.23.20.0' } });
    assert.equal(homeRes.status, 200);
    const homeHtml = await homeRes.text();
    assert.equal(homeHtml.includes('<meta property="og:type" content="website" />'), true);
    assert.equal(homeHtml.includes('<meta property="og:title" content="ISEZERANO ONLINE – GS GITUMBA" />'), true);
    assert.equal(homeHtml.includes('og-isezerano-online.jpg'), false);
    assert.equal(homeHtml.includes('property="og:image"'), false);
    assert.equal(homeHtml.includes('Rwanda CBC Term 1 Lesson Guide'), false);

    // 2. Article A: first real content image overrides stale thumbnailUrl & skips decorative icons
    const articleARes = await fetch(`${baseUrl}/blog/rwanda-cbc-term-1-lesson-guide`, {
      headers: {
        'User-Agent': 'WhatsApp/2.23.20.0',
        'X-Forwarded-Proto': 'https',
        'X-Forwarded-Host': 'isezerano.online'
      }
    });
    assert.equal(articleARes.status, 200);
    const articleAHtml = await articleARes.text();
    assert.equal(countOccurrences(articleAHtml, 'property="og:title"'), 1);
    assert.equal(countOccurrences(articleAHtml, 'property="og:image"'), 1);
    assert.equal(articleAHtml.includes('<meta property="og:type" content="article" />'), true);
    assert.equal(articleAHtml.includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileA}" />`), true);
    assert.equal(articleAHtml.includes(`<meta property="og:image:secure_url" content="https://isezerano.online/og-blog/${fileA}" />`), true);
    assert.equal(articleAHtml.includes(`<meta name="twitter:image" content="https://isezerano.online/og-blog/${fileA}" />`), true);
    assert.equal(articleAHtml.includes(`"https://isezerano.online/og-blog/${fileA}"`), true);
    assert.equal(articleAHtml.includes('/api/blog-og-image/'), false);
    assert.equal(articleAHtml.includes('<meta property="og:image:width" content="1200" />'), true);
    assert.equal(articleAHtml.includes('<meta property="og:image:height" content="630" />'), true);
    const ogImageTags = articleAHtml.match(/<meta\b[^>]*(?:og:image|twitter:image)[^>]*>/gi) || [];
    assert.equal(ogImageTags.length >= 3, true);
    assert.equal(ogImageTags.some((tag) => /data:image\/|blob:/i.test(tag)), false);

    // 3. Binary thumbnail endpoint serves exact bytes
    const imgARes = await fetch(`${baseUrl}/og-blog/${fileA}`);
    assert.equal(imgARes.status, 200);
    assert.equal(imgARes.headers.get('content-type'), 'image/png');
    const imgABuf = Buffer.from(await imgARes.arrayBuffer());
    assert.equal(imgABuf.equals(pngA.rawBuffer), true);
    assert.equal(imgABuf.equals(staleJpg.rawBuffer), false);

    const headARes = await fetch(`${baseUrl}/og-blog/${fileA}`, { method: 'HEAD' });
    assert.equal(headARes.status, 200);
    assert.equal(headARes.headers.get('content-type'), 'image/png');

    // 4. Article B distinct JPEG thumbnail
    const articleBRes = await fetch(`${baseUrl}/blog/nursery-report-card-term-updates`, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }
    });
    assert.equal(articleBRes.status, 200);
    assert.equal((await articleBRes.text()).includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileB}" />`), true);

    const imgBRes = await fetch(`${baseUrl}/og-blog/${fileB}`);
    assert.equal(imgBRes.status, 200);
    assert.equal(imgBRes.headers.get('content-type'), 'image/jpeg');
    const imgBBuf = Buffer.from(await imgBRes.arrayBuffer());
    assert.equal(imgBBuf.equals(jpgB.rawBuffer), true);
    assert.equal(imgABuf.equals(imgBBuf), false);

    // 5. Article C coverImage, Article D custom override, Article E image-free omission
    const articleCHtml = await (await fetch(`${baseUrl}/blog/external-https-thumbnail-article`)).text();
    assert.equal(articleCHtml.includes('<meta property="og:image" content="https://cdn.example.org/school-science-1200x630.jpg" />'), true);

    const articleDHtml = await (await fetch(`${baseUrl}/blog/custom-cover-article`)).text();
    assert.equal(articleDHtml.includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileD}" />`), true);

    const articleEHtml = await (await fetch(`${baseUrl}/blog/text-only-educational-notice`)).text();
    assert.equal(articleEHtml.includes('og-isezerano-online.jpg'), false);
    assert.equal(articleEHtml.includes('property="og:image"'), false);
    assert.equal(articleEHtml.includes('property="og:image:secure_url"'), false);
    assert.equal(articleEHtml.includes('name="twitter:image"'), false);
    assert.equal(articleEHtml.includes('<meta name="twitter:card" content="summary" />'), true);
    assert.equal((await fetch(`${baseUrl}/og-blog/text-only-educational-notice.jpg`)).status, 404);

    // 6. Query-string route + draft/missing protection
    const queryRouteHtml = await (await fetch(`${baseUrl}/blog?post=nursery-report-card-term-updates`)).text();
    assert.equal(queryRouteHtml.includes('<meta property="og:title" content="Nursery Report Card Term Updates" />'), true);

    const draftHtml = await (await fetch(`${baseUrl}/blog/private-unpublished-draft`)).text();
    assert.equal(draftHtml.includes('Private Unpublished Draft Title'), false);
    assert.equal((await fetch(`${baseUrl}/og-blog/private-unpublished-draft.jpg`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/og-blog/non-existent-slug.jpg`)).status, 404);

    // 7. Static Spark Hosting prerender & rebuild cleanup
    const tempDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isezerano-static-dist-'));
    try {
      const realIndexHtml = fs.readFileSync(path.resolve(rootDir, 'index.html'), 'utf-8');
      fs.writeFileSync(path.join(tempDistDir, 'index.html'), realIndexHtml, 'utf-8');

      const prerenderRes = await prerenderStaticBlogDist({
        distDir: tempDistDir,
        origin: 'https://isezerano.online',
        posts: testPosts,
        branding: null
      });
      assert.equal(prerenderRes.prerenderedCount, 5);

      const generatedHtmlA = fs.readFileSync(
        path.join(tempDistDir, 'blog', 'rwanda-cbc-term-1-lesson-guide', 'index.html'),
        'utf-8'
      );
      assert.equal(generatedHtmlA.includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileA}" />`), true);
      assert.equal(fs.readFileSync(path.join(tempDistDir, 'og-blog', fileA)).equals(pngA.rawBuffer), true);
      assert.equal(fs.readFileSync(path.join(tempDistDir, 'og-blog', fileB)).equals(jpgB.rawBuffer), true);
      assert.equal(fs.readFileSync(path.join(tempDistDir, 'og-blog', fileD)).equals(customCoverJpg.rawBuffer), true);

      // Simulate static host serving dist/
      const staticServer = http.createServer((req, res) => {
        const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
        const rel = pathname.replace(/^\/+/, '');
        const candidates = rel
          ? [path.join(tempDistDir, rel), path.join(tempDistDir, `${rel.replace(/\/+$/, '')}.html`), path.join(tempDistDir, rel, 'index.html')]
          : [path.join(tempDistDir, 'index.html')];
        const matched = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
        const fileToServe = matched || path.join(tempDistDir, 'index.html');
        const ext = path.extname(fileToServe).toLowerCase();
        const mime = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.png' ? 'image/png' : 'image/jpeg';
        res.statusCode = 200;
        res.setHeader('Content-Type', mime);
        res.end(fs.readFileSync(fileToServe));
      });
      await new Promise<void>((resolve) => staticServer.listen(0, '127.0.0.1', resolve));
      const staticBase = `http://127.0.0.1:${(staticServer.address() as AddressInfo).port}`;
      try {
        const sHtml = await (await fetch(`${staticBase}/blog/rwanda-cbc-term-1-lesson-guide`)).text();
        assert.equal(sHtml.includes(`<meta property="og:image" content="https://isezerano.online/og-blog/${fileA}" />`), true);
        const sImgB = await fetch(`${staticBase}/og-blog/${fileB}`);
        assert.equal(Buffer.from(await sImgB.arrayBuffer()).equals(jpgB.rawBuffer), true);
      } finally {
        await new Promise<void>((resolve, reject) => staticServer.close((err) => (err ? reject(err) : resolve())));
      }

      // Rebuild cleanup: changing Article A's first image replaces stale fileA with fileUpdatedA
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
      assert.equal(fs.existsSync(path.join(tempDistDir, 'og-blog', fileA)), false);
      assert.equal(fs.existsSync(path.join(tempDistDir, 'og-blog', fileUpdatedA)), true);
      assert.equal(fs.readFileSync(path.join(tempDistDir, 'og-blog', fileUpdatedA)).equals(updatedPngA.rawBuffer), true);
    } finally {
      fs.rmSync(tempDistDir, { recursive: true, force: true });
    }

    // 8. Paginated Firestore REST mock (`pageSize=25` + transient HTTP 500 retry)
    clearOgMetaCache();
    let callCount = 0;
    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input);
        if (urlStr.startsWith('https://firestore.googleapis.com/')) {
          callCount += 1;
          const u = new URL(urlStr);
          assert.equal(u.searchParams.get('pageSize'), '25');
          const token = u.searchParams.get('pageToken') || '';
          if (!token && callCount === 1) {
            return new Response('Transient error', { status: 503 });
          }
          if (!token) {
            return new Response(
              JSON.stringify({
                documents: [
                  {
                    name: 'projects/isezerano-news/databases/(default)/documents/posts/p1',
                    fields: {
                      slug: { stringValue: 'first-post' },
                      title: { stringValue: 'First Post' },
                      status: { stringValue: 'Published' },
                      publishedAt: { stringValue: '2026-11-10T08:00:00Z' },
                      content: { stringValue: `<img src="${pngA.dataUri}" />` }
                    }
                  }
                ],
                nextPageToken: 'page2'
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(
            JSON.stringify({
              documents: [
                {
                  name: 'projects/isezerano-news/databases/(default)/documents/posts/p2',
                  fields: {
                    slug: { stringValue: 'second-post' },
                    title: { stringValue: 'Second Post' },
                    status: { stringValue: 'published' },
                    publishedAt: { stringValue: '2026-11-12T08:00:00Z' },
                    content: { stringValue: `<img src="http://127.0.0.1:${extPort}/img.webp" />` }
                  }
                }
              ]
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return origFetch(input, init);
      }) as typeof fetch;

      const pagedPosts = await fetchPublishedBlogPostsFromFirestore('isezerano-news', 5000);
      assert.equal(pagedPosts.length, 2, 'Paginated + retried Firestore REST query must return both published posts');
      assert.equal(pagedPosts[0].slug, 'second-post');
      assert.equal(pagedPosts[1].slug, 'first-post');
      assert.equal(callCount, 3, 'Should retry transient 503 and then fetch nextPageToken=page2');
    } finally {
      globalThis.fetch = origFetch;
      clearOgMetaCache();
    }

    console.log('✓ 13. Social crawler previews, Spark prerendering, magic-byte sniffing, and paginated Firestore REST verified');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await new Promise<void>((resolve, reject) => externalWebpServer.close((err) => (err ? reject(err) : resolve())));
  }
}

async function runSuite(): Promise<void> {
  testImageCleanupAndPreservedAssets();
  testNoFakeArticlesOrStockFallbacks();
  testAutomaticFirstImageThumbnails();
  testImageResizingAndAlignment();
  testEditorAndAdminUiConstraints();
  testMultiArticleLifecycleAndSecurity();
  testFirestoreUndefinedFieldSafety();
  testWebsiteBrandingDefaultsAndLayout();
  testDynamicSeoMetadataUpdates();
  testBlogCategoryDiscoveryAndValidation();
  testPostEditingPreservationAndSecurity();
  testCommentsSharingAndNewspaperRedesign();
  await testSocialCrawlersAndAllPostThumbnails();
  console.log('\nALL BLOG, THUMBNAIL, SEO, COMMENTS & NEWSPAPER SUITE TESTS PASSED!');
}

runSuite().catch((err) => {
  console.error('BLOG & MEDIA SUITE FAILURE:', err);
  process.exit(1);
});
