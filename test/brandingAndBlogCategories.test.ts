import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  DEFAULT_WEBSITE_BRANDING,
  WebsiteBrandingSettings
} from '../src/types/websiteDesign';
import { DEFAULT_AI_BLOG_CATEGORIES, BlogCategory } from '../src/types/blog';
import {
  mergeCategoriesForDisplay,
  validateCategoryInput
} from '../src/services/blogCategoryService';
import {
  resolveSiteBrandingSeo,
  updateWebsiteBrandingSeo,
  updateBlogPostSeo,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_OG_IMAGE
} from '../src/services/seoService';
import { isAuthorizedAdminEmail } from '../src/services/authService';

const rootDir = process.cwd();

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

  // Logo must appear BEFORE website name in the header horizontal container
  const logoIndex = headerCode.indexOf('logoSettings?.showInHeader !== false && logoUrl && !logoLoadError');
  const nameIndex = headerCode.indexOf('branding?.showWebsiteName !== false');
  const descIndex = headerCode.indexOf('branding?.showWebsiteDescription !== false');
  assert.equal(logoIndex > 0, true, 'Header must conditionally render uploaded logo');
  assert.equal(nameIndex > logoIndex, true, 'Website Name must appear horizontally AFTER logo in header');
  assert.equal(descIndex > nameIndex, true, 'Website Description must obey showWebsiteDescription toggle');

  assert.equal(footerCode.includes('showWebsiteName'), true, 'Footer must obey showWebsiteName toggle');
  assert.equal(footerCode.includes('showWebsiteDescription'), true, 'Footer must obey showWebsiteDescription toggle');
  assert.equal(homeCode.includes('showWebsiteName'), true, 'HomeView must obey showWebsiteName toggle');
  assert.equal(homeCode.includes('showWebsiteDescription'), true, 'HomeView must obey showWebsiteDescription toggle');

  // Ensure design manager has toggles and never renders empty src=""
  assert.equal(designMgrCode.includes('showWebsiteName'), true);
  assert.equal(designMgrCode.includes('showWebsiteDescription'), true);
  assert.equal(designMgrCode.includes('removeLogoFile'), true);
  assert.equal(designMgrCode.includes('src={logoUrl || ""}'), false, 'Must not render empty img src=""');

  console.log('✓ 1. Branding defaults, visibility toggles, and horizontal Logo-before-Name header verified');
}

function testDynamicSeoMetadataUpdates() {
  const expectedDesc =
    'ISEZERANO ONLINE – Rwanda CBC lesson planning, nursery report cards, education resources and articles for teachers and educators.';
  assert.equal(DEFAULT_SEO_DESCRIPTION, expectedDesc);
  assert.equal(DEFAULT_WEBSITE_BRANDING.websiteDescription, expectedDesc);
  assert.equal(DEFAULT_OG_IMAGE.startsWith('https://'), true, 'Default OG image must use public HTTPS URL');

  const ogImageFile = path.join(rootDir, 'public/og-isezerano-online.jpg');
  assert.equal(fs.existsSync(ogImageFile), true, 'public/og-isezerano-online.jpg must exist');
  assert.equal(fs.statSync(ogImageFile).size > 10000, true, 'OG social card image must be non-empty');

  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.equal(
    indexHtml.includes('8-column lesson planning platform for educators and teachers at GS GITUMBA and across Rwanda'),
    false,
    'Old description must be removed from index.html'
  );
  assert.equal(
    (indexHtml.match(new RegExp(expectedDesc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length >= 4,
    true,
    'index.html must include consistent updated description in meta, og:description, twitter:description, and JSON-LD'
  );
  for (const tagSnippet of [
    '<meta property="og:title" content="ISEZERANO ONLINE – GS GITUMBA"',
    'property="og:description"',
    `<meta property="og:image" content="${DEFAULT_OG_IMAGE}"`,
    '<meta property="og:url" content="https://isezerano.online/"',
    '<meta name="twitter:card" content="summary_large_image"',
    `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}"`
  ]) {
    assert.equal(indexHtml.includes(tagSnippet), true, `index.html initial HTML missing required tag: ${tagSnippet}`);
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

  // Set up minimal mock document to test updateWebsiteBrandingSeo & updateBlogPostSeo DOM mutations
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
        const scriptEl = {
          id: '',
          type: '',
          textContent: '',
          remove: () => {
            schemaTag = null;
          }
        };
        return scriptEl;
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
    assert.equal(metaMap.get('property=og:image')?.attrs.content, DEFAULT_OG_IMAGE);
    assert.equal(metaMap.get('name=twitter:image')?.attrs.content, DEFAULT_OG_IMAGE);
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
    assert.equal(metaMap.get('property=og:image')?.attrs.content, DEFAULT_OG_IMAGE);
  } finally {
    if (prevDoc === undefined) delete (globalThis as any).document;
    else (globalThis as any).document = prevDoc;
  }

  console.log('✓ 2. Initial HTML SEO tags, og:image, twitter:card, and runtime metadata updates verified');
}

function testBlogCategoryDiscoveryAndValidation() {
  // Before Firestore initialization, all 6 AI-created categories must be surfaced
  const initialCats = mergeCategoriesForDisplay([], false, [
    { category: 'Community Spotlight' },
    { category: 'All Categories' },
    { category: 'Uncategorized' }
  ]);
  const initialNames = initialCats.map((c) => c.name);
  for (const aiCat of DEFAULT_AI_BLOG_CATEGORIES) {
    assert.equal(initialNames.includes(aiCat.name), true, `Missing AI category: ${aiCat.name}`);
  }
  assert.equal(initialNames.includes('Community Spotlight'), true, 'Must include categories already used on existing articles');
  assert.equal(initialNames.includes('All Categories'), false, 'Must not treat All Categories filter as a category');
  assert.equal(initialNames.includes('Uncategorized'), false, 'Must not promote Uncategorized placeholder into category list');

  // After initialization, deleted default categories stay deleted
  const customStored: BlogCategory[] = [
    { id: 'cat_1', name: 'STEM Club', slug: 'stem-club', description: 'Science updates' }
  ];
  const postInitCats = mergeCategoriesForDisplay(customStored, true, []);
  assert.deepEqual(postInitCats.map((c) => c.name), ['STEM Club']);

  // Input validation rules
  const emptyErr = validateCategoryInput('   ', initialCats);
  assert.equal(emptyErr.valid, false);

  const reservedErr = validateCategoryInput('All Categories', initialCats);
  assert.equal(reservedErr.valid, false);

  const dupErr = validateCategoryInput('cbc curriculum', initialCats);
  assert.equal(dupErr.valid, false);

  const validRename = validateCategoryInput('CBC Curriculum', initialCats, 'ai_cat_cbc_curriculum');
  assert.equal(validRename.valid, true);

  const validNew = validateCategoryInput('Sports & Culture', initialCats);
  assert.equal(validNew.valid, true);

  console.log('✓ 3. Blog category AI migration, post discovery, deletion persistence, and validation verified');
}

function testPostEditingPreservationAndSecurity() {
  const richEditorCode = fs.readFileSync(path.join(rootDir, 'src/components/RichTextEditor.tsx'), 'utf8');
  const adminBlogCode = fs.readFileSync(path.join(rootDir, 'src/components/AdminBlogManager.tsx'), 'utf8');
  const blogViewCode = fs.readFileSync(path.join(rootDir, 'src/views/BlogView.tsx'), 'utf8');
  const brandingServiceCode = fs.readFileSync(path.join(rootDir, 'src/services/websiteDesignService.ts'), 'utf8');

  // RichTextEditor edit initialization fix
  assert.equal(
    richEditorCode.includes("const lastEmittedHtmlRef = useRef<string>('');"),
    true,
    'RichTextEditor must initialize lastEmittedHtmlRef empty so initial article HTML renders when editing'
  );
  assert.equal(
    adminBlogCode.includes('key={draft.id}'),
    true,
    'AdminBlogManager must key RichTextEditor by draft.id so switching articles resets editor cleanly'
  );
  assert.equal(
    adminBlogCode.includes('Boolean(resolvedThumb && resolvedThumb !== firstContentThumb)'),
    true,
    'AdminBlogManager must preserve standalone thumbnails when article body has no inline images'
  );

  // Admin category CRUD + inline category switcher + public sync
  assert.equal(adminBlogCode.includes('saveBlogCategory'), true);
  assert.equal(adminBlogCode.includes('deleteBlogCategory'), true);
  assert.equal(adminBlogCode.includes('updatePostCategory'), true);
  assert.equal(adminBlogCode.includes('Image URL'), false, 'Keep Image URL input disabled in AdminBlogManager');

  assert.equal(blogViewCode.includes('subscribeToBlogCategories'), true);
  assert.equal(blogViewCode.includes('mergeCategoriesForDisplay'), true);

  // Security & non-fake-success checks
  assert.equal(brandingServiceCode.includes('stripUndefinedDeep'), true);
  assert.equal(isAuthorizedAdminEmail('twizerefelix90@gmail.com'), true);
  assert.equal(isAuthorizedAdminEmail('unauthorized@example.com'), false);

  console.log('✓ 4. Post edit-preservation, live BlogView categories, and security checks verified');
}

testWebsiteBrandingDefaultsAndLayout();
testDynamicSeoMetadataUpdates();
testBlogCategoryDiscoveryAndValidation();
testPostEditingPreservationAndSecurity();
console.log('\nALL WEBSITE BRANDING & BLOG CATEGORY MANAGEMENT TESTS PASSED!');
