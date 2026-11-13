import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  SEED_BLOG_POSTS,
  generateSlug,
  ensureUniqueSlug,
  prepareBlogPostPayload,
  calculateReadingTime,
  MAX_FIRESTORE_POST_BYTES
} from '../src/services/blogService';
import {
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
import { BlogPost } from '../src/types/blog';

const rootDir = process.cwd();

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
  console.log('✓ 1. Final image cleanup & unrelated asset preservation verified');
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

  assert.equal(
    extractFirstImageFromContent(htmlWithTwoImages),
    firstImg,
    'extractFirstImageFromContent must select the very first image inserted into the article'
  );

  // Even if thumbnailUrl was omitted/empty, resolver derives first content image automatically
  assert.equal(
    getSingleArticleThumbnailUrl({ thumbnailUrl: '', content: htmlWithTwoImages }),
    firstImg,
    'getSingleArticleThumbnailUrl must fall back to the first image inside article content'
  );

  // sanitizePostThumbnail automatically sets thumbnailUrl to first image unless custom override is active
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

  // If custom override is enabled, preserve custom cover
  const customCover = 'data:image/png;base64,' + 'C'.repeat(240);
  const customPrepared = sanitizePostThumbnail({
    ...autoPrepared,
    thumbnailUrl: customCover,
    thumbnailIsCustomOverride: true
  });
  assert.equal(customPrepared.thumbnailUrl, customCover);

  // Article without any image saves cleanly with empty thumbnailUrl (UI renders clean default placeholder)
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
  assert.equal(savedTextOnly.post.thumbnailUrl, '', 'Image-free post must keep empty thumbnailUrl for default placeholder');

  console.log('✓ 3. Automatic first-image thumbnail & clean image-free placeholder behavior verified');
}

function testImageResizingAndAlignment() {
  assert.equal(IMAGE_SIZE_PRESETS.small, 300);
  assert.equal(IMAGE_SIZE_PRESETS.medium, 500);
  assert.equal(IMAGE_SIZE_PRESETS.large, 760);

  // Proportional calculations for 1600x900 photo
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
  assert.equal(figureRightSmall.includes('width:300px'), true, 'Figure preserves Small width');
  assert.equal(figureRightSmall.includes('max-width:100%'), true, 'Figure constrains to responsive max-width');
  assert.equal(figureRightSmall.includes('text-align:right'), true, 'Figure preserves right alignment');
  assert.equal(figureRightSmall.includes('object-fit:cover'), true, 'Image uses object-fit:cover');
  assert.equal(figureRightSmall.includes('aspect-ratio:300 / 180'), true, 'Proportional image preserves aspect-ratio');

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

  assert.equal(adminManagerCode.includes('type="file"'), true, 'Device file input missing in AdminBlogManager');
  assert.equal(adminManagerCode.includes('Image URL'), false, 'AdminBlogManager must not show Image URL field');
  assert.equal(adminManagerCode.includes('hideImageUrlInput={true}'), true, 'RichTextEditor must hide image URL input in blog editor');
  assert.equal(adminManagerCode.includes('extractFirstImageMetaFromContent'), true, 'AdminBlogManager must auto-sync first article image');
  assert.equal(adminManagerCode.includes('showSeparateBanner'), true, 'Preview modal must avoid duplicating auto-selected first image');

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
  assert.equal(richEditorCode.includes('Enter Web Image URL'), false, 'RichTextEditor must not show Image URL input');

  assert.equal(blogViewCode.includes('getSingleArticleThumbnailUrl'), true);
  assert.equal(blogViewCode.includes('Related Articles'), true, 'BlogView must display Related Articles');
  assert.equal(blogViewCode.includes('showSeparateBanner'), true, 'BlogView must avoid duplicating first body image');
  assert.equal(blogViewCode.includes('object-cover'), true, 'Thumbnails must use object-cover');
  assert.equal(blogViewCode.includes('Article placeholder'), true, 'BlogView must render clean placeholder when no image exists');
  assert.equal(blogViewCode.includes('dangerouslySetInnerHTML'), true);
  assert.equal(indexCssCode.includes('.blog-article-body'), true, 'index.css must include responsive blog article styling');

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
    thumbnailUrl: '', // intentionally empty — should auto-populate from first image
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
    thumbnailUrl: '', // intentionally empty — should auto-populate with thumbB
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
  assert.equal(getSingleArticleThumbnailUrl(resB.post), thumbB, 'Each article must retain its own distinct thumbnail');
  assert.notEqual(getSingleArticleThumbnailUrl(resA.post), getSingleArticleThumbnailUrl(resB.post));

  const oversized = prepareBlogPostPayload(
    { ...postAInput, content: `<p>${'X'.repeat(MAX_FIRESTORE_POST_BYTES + 1000)}</p>` },
    []
  );
  assert.equal(oversized.ok, false, 'Oversized article payload must be rejected cleanly before Firestore write');

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

testImageCleanupAndPreservedAssets();
testNoFakeArticlesOrStockFallbacks();
testAutomaticFirstImageThumbnails();
testImageResizingAndAlignment();
testEditorAndAdminUiConstraints();
testMultiArticleLifecycleAndSecurity();
console.log('\nALL BLOG THUMBNAIL & IMAGE SIZING VERIFICATION TESTS PASSED!');
