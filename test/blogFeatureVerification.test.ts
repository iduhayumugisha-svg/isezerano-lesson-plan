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
  getSingleArticleThumbnailUrl,
  isValidPersistentImageSrc,
  extractPlainTextExcerpt
} from '../src/utils/thumbnailUtils';
import { isAuthorizedAdminEmail } from '../src/services/authService';
import { BlogPost } from '../src/types/blog';

const rootDir = process.cwd();

function testImageCleanupAndPreservedAssets() {
  const unwantedPhoto = path.join(rootDir, 'src/assets/images/bible_logo_1792762017892.jpg');
  assert.equal(fs.existsSync(unwantedPhoto), false, 'Unwanted bible_logo photo must be deleted');

  const preservedPdf = path.join(rootDir, 'public/assets/aistudio/Class_Reports_N1_Term_1_62cf6792.pdf');
  assert.equal(fs.existsSync(preservedPdf), true, 'Report card asset must remain preserved');

  // Verify zero references to bible_logo across src and index.html
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

  // Reject blob: and local file: URLs
  assert.equal(isValidPersistentImageSrc('blob:http://localhost:3000/12345'), false);
  assert.equal(getSingleArticleThumbnailUrl({ thumbnailUrl: 'blob:http://localhost:3000/abc' }), '');
  assert.equal(getSingleArticleThumbnailUrl({ thumbnailUrl: '' }), '');
  assert.equal(
    getSingleArticleThumbnailUrl({ thumbnailUrl: 'https://images.unsplash.com/photo-123' }).includes('unsplash'),
    true // only if explicitly passed, never auto-injected when empty
  );

  // Confirm thumbnailUtils has no Unsplash fallback constant
  const thumbUtilsCode = fs.readFileSync(path.join(rootDir, 'src/utils/thumbnailUtils.ts'), 'utf8');
  assert.equal(thumbUtilsCode.includes('images.unsplash.com'), false, 'No Unsplash fallback URLs allowed');

  console.log('✓ 2. No fake posts, no blob: URLs, no Unsplash fallbacks verified');
}

function testEditorAndAdminUiConstraints() {
  const adminManagerCode = fs.readFileSync(path.join(rootDir, 'src/components/AdminBlogManager.tsx'), 'utf8');
  const richEditorCode = fs.readFileSync(path.join(rootDir, 'src/components/RichTextEditor.tsx'), 'utf8');
  const blogViewCode = fs.readFileSync(path.join(rootDir, 'src/views/BlogView.tsx'), 'utf8');

  // AdminBlogManager must have Step 1 photo upload before Step 2 title/content, no image URL input
  assert.equal(adminManagerCode.includes('type="file"'), true, 'Device file input missing in AdminBlogManager');
  assert.equal(adminManagerCode.includes('Image URL'), false, 'AdminBlogManager must not show Image URL field');
  assert.equal(adminManagerCode.includes('Step 1 of 2'), true, 'Step 1 photo workflow missing');
  assert.equal(adminManagerCode.includes('Step 2 of 2'), true, 'Step 2 title & content workflow missing');
  assert.equal(adminManagerCode.includes('hideImageUrlInput={true}'), true, 'RichTextEditor must hide image URL input in blog editor');

  // RichTextEditor formatting controls check
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
    'defaultParagraphSeparator'
  ]) {
    assert.equal(
      richEditorCode.includes(requiredControl),
      true,
      `RichTextEditor missing required formatting control: ${requiredControl}`
    );
  }
  assert.equal(richEditorCode.includes('Enter Web Image URL'), false, 'RichTextEditor must not show Image URL input');

  // Public BlogView renders thumbnail, title, author, publication date, full content
  assert.equal(blogViewCode.includes('getSingleArticleThumbnailUrl'), true);
  assert.equal(blogViewCode.includes('dangerouslySetInnerHTML'), true);
  assert.equal(blogViewCode.includes('activePost.author'), true);
  assert.equal(blogViewCode.includes('formattedDateFull'), true);

  console.log('✓ 3. Editor workflow, formatting controls, and no-image-URL-field verified');
}

function testMultiArticleLifecycleAndThumbnails() {
  const thumbA = 'data:image/jpeg;base64,' + 'A'.repeat(240);
  const thumbB = 'data:image/webp;base64,' + 'B'.repeat(240);

  const postAInput: BlogPost = {
    id: 'post_a',
    title: 'CBC Lesson Planning Term 1',
    slug: '',
    content: '<p>Paragraph one explains learning objectives.</p><p>Paragraph two explains assessment.</p>',
    excerpt: '',
    thumbnailUrl: thumbA,
    category: 'CBC Curriculum',
    author: { name: 'Twizere Felix', role: 'Administrator' },
    publishedAt: '',
    status: 'draft'
  };

  const postBInput: BlogPost = {
    id: 'post_b',
    title: 'CBC Lesson Planning Term 1', // same title -> must get unique slug
    slug: '',
    content: '<p>Second article with different thumbnail and multi-paragraph guide.</p><p>Second paragraph.</p>',
    excerpt: '',
    thumbnailUrl: thumbB,
    category: 'School News',
    author: { name: 'Twizere Felix', role: 'Administrator' },
    publishedAt: new Date('2026-10-01T08:00:00Z').toISOString(),
    status: 'published'
  };

  const resA = prepareBlogPostPayload(postAInput, []);
  if (!resA.ok) throw new Error(resA.error);
  assert.equal(resA.post.slug, 'cbc-lesson-planning-term-1');
  assert.equal(resA.post.status, 'draft');
  assert.equal(getSingleArticleThumbnailUrl(resA.post), thumbA);

  const resB = prepareBlogPostPayload(postBInput, [{ id: resA.post.id, slug: resA.post.slug }]);
  if (!resB.ok) throw new Error(resB.error);
  assert.equal(resB.post.slug, 'cbc-lesson-planning-term-1-2', 'Duplicate title must produce unique slug');
  assert.equal(resB.post.status, 'published');
  assert.equal(getSingleArticleThumbnailUrl(resB.post), thumbB, 'Each article must retain its own thumbnail');
  assert.notEqual(getSingleArticleThumbnailUrl(resA.post), getSingleArticleThumbnailUrl(resB.post));

  // Publish Post A, then Edit, then Unpublish
  const publishedA = prepareBlogPostPayload({ ...resA.post, status: 'published' }, []);
  if (!publishedA.ok) throw new Error(publishedA.error);
  assert.ok(publishedA.post.publishedAt.length > 0, 'Publishing draft must assign publishedAt');

  const editedA = prepareBlogPostPayload(
    { ...publishedA.post, title: 'Updated CBC Guide', content: '<p>Updated paragraph</p>' },
    []
  );
  if (!editedA.ok) throw new Error(editedA.error);
  assert.equal(editedA.post.publishedAt, publishedA.post.publishedAt, 'Editing published article keeps original publishedAt');

  const unpublishedA = prepareBlogPostPayload({ ...editedA.post, status: 'draft' }, []);
  if (!unpublishedA.ok) throw new Error(unpublishedA.error);
  assert.equal(unpublishedA.post.status, 'draft');

  // Reject oversized payload (> 940 KB Firestore safety cap)
  const oversized = prepareBlogPostPayload(
    { ...postAInput, content: `<p>${'X'.repeat(MAX_FIRESTORE_POST_BYTES + 1000)}</p>` },
    []
  );
  assert.equal(oversized.ok, false, 'Oversized article payload must be rejected cleanly before Firestore write');

  // Reject article missing photo
  const missingPhoto = prepareBlogPostPayload({ ...postAInput, thumbnailUrl: '' }, []);
  assert.equal(missingPhoto.ok, false, 'Article without featured device photo must be rejected');

  console.log('✓ 4. Multi-article distinct thumbnails, unique slugs, edit/publish/unpublish, and Firestore byte-limit guards verified');
}

function testAdminSecurityAndHelpers() {
  assert.equal(isAuthorizedAdminEmail('twizerefelix90@gmail.com'), true);
  assert.equal(isAuthorizedAdminEmail('TWIZEREFELIX90@GMAIL.COM'), true);
  assert.equal(isAuthorizedAdminEmail('teacher@school.rw'), false);
  assert.equal(isAuthorizedAdminEmail(''), false);

  assert.equal(generateSlug('Rwanda CBC Lesson Plan 2026!'), 'rwanda-cbc-lesson-plan-2026');
  assert.equal(
    ensureUniqueSlug('school-news', 'id2', [{ id: 'id1', slug: 'school-news' }]),
    'school-news-2'
  );
  assert.equal(calculateReadingTime('<p>hello world</p>'), 1);
  assert.equal(extractPlainTextExcerpt('<p>Hello <b>world</b></p>', 50), 'Hello world');

  console.log('✓ 5. Admin-only security check and blog utility functions verified');
}

testImageCleanupAndPreservedAssets();
testNoFakeArticlesOrStockFallbacks();
testEditorAndAdminUiConstraints();
testMultiArticleLifecycleAndThumbnails();
testAdminSecurityAndHelpers();
console.log('\nALL BLOG REBUILD VERIFICATION TESTS PASSED!');
