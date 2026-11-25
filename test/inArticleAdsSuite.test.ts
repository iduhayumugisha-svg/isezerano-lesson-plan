import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import {
  AdsSettings,
  DEFAULT_ADS_SETTINGS,
  DEFAULT_IN_ARTICLE_ADS_SETTINGS
} from '../src/types/platform';
import {
  GlobalAdScripts,
  __resetGlobalAdScriptsCacheForTests
} from '../src/components/GlobalAdScripts';
import {
  __resetPopunderGuardAndOverlayCacheForTests,
  analyzeAdCodeSnippet,
  clampInArticleParagraph,
  extractBareSafeDirectLinkUrl,
  hasRenderableAdCode,
  isInArticleSlotRenderable,
  isSafeAdAssetOrClickUrl,
  isSafeAdScriptUrl,
  isSafeDirectLinkUrl,
  normalizeAdProvider,
  normalizeGlobalAdScriptConfig,
  normalizeInArticleAdSlotConfig,
  normalizeInArticleAdsSettings,
  sanitizeAdCodeInput,
  sanitizeAdCodePayload,
  sanitizeAdConfigText,
  sanitizeStaticAdElement
} from '../src/utils/inArticleAdUtils';
import {
  buildArticleRenderSegments,
  countArticleContentParagraphs,
  splitTopLevelHtmlBlocks
} from '../src/utils/articleAdInjector';
import { InArticleAdSlot } from '../src/components/InArticleAdSlot';
import {
  __resetAdsSettingsCacheForTests,
  normalizeAdsSettingsPayload
} from '../src/services/siteSettingsService';
import { AdSlot } from '../src/components/AdSlot';
import { updateBlogPostSeo } from '../src/services/seoService';
import { BlogPost } from '../src/types/blog';

function makeParagraphs(count: number, extraMarkupBetween?: Record<number, string>): string {
  const parts: string[] = [];
  for (let i = 1; i <= count; i++) {
    parts.push(
      `<p>Paragraph ${i} covers important digital journalism details and verified community reporting across Rwanda.</p>`
    );
    if (extraMarkupBetween && extraMarkupBetween[i]) {
      parts.push(extraMarkupBetween[i]);
    }
  }
  return parts.join('\n');
}

function testOldAdscodAndMonetagCompletelyRemovedAndCoreAssetsPreserved(): void {
  const removedPaths = [
    'src/types/adscod.ts',
    'src/services/adscodService.ts',
    'src/components/AdscodBannerAd.tsx',
    'src/components/AdscodInlineAd.tsx',
    'test/adscodIntegrationSuite.test.ts',
    'public/sw.js',
    'src/components/MonetagVignetteBanner.tsx'
  ];
  for (const rel of removedPaths) {
    assert.equal(fs.existsSync(path.resolve(rel)), false, `${rel} must be removed`);
  }

  const filesToScan = [
    'src/App.tsx',
    'src/components/AdSlot.tsx',
    'src/components/AdsManager.tsx',
    'src/views/HomeView.tsx',
    'src/views/BlogView.tsx'
  ];
  for (const rel of filesToScan) {
    const src = fs.readFileSync(path.resolve(rel), 'utf8');
    assert.doesNotMatch(
      src,
      /AdscodBannerAd|AdscodInlineAd|adscodService|types\/adscod|workers\.dev|api\.adscod\.com|ads-adscod-diagnostics|MonetagVignetteBanner|monetag/i,
      `Obsolete Adscod or Monetag reference still exists in ${rel}`
    );
  }

  // Referrer meta required by HilltopAds remains preserved
  assert.match(
    fs.readFileSync(path.resolve('index.html'), 'utf8'),
    /name="referrer"\s+content="no-referrer-when-downgrade"/
  );

  // Below-header ad slot and Monetag Vignette removed cleanly; Global Scripts and Above-Footer preserved in App.tsx
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.doesNotMatch(appSrc, /<AdSlot placement="below_header"/);
  assert.doesNotMatch(appSrc, /MonetagVignetteBanner/);
  assert.match(appSrc, /<AdSlot placement="above_footer"/);
  assert.match(appSrc, /<GlobalAdScripts currentPage=\{currentPage\} \/>/);

  console.log('✓ 1. Old Adscod & Monetag completely removed, below_header AdSlot removed & HilltopAds/core slots wired cleanly');
}

function testConfigNormalizationValidationAndSecurity(): void {
  const defaults = normalizeInArticleAdsSettings(undefined);
  assert.equal(defaults.slot1.afterParagraph, 3);
  assert.equal(defaults.slot2.afterParagraph, 7);
  assert.equal(defaults.slot3.afterParagraph, 11);
  assert.equal(defaults.slot1.enabled, false);
  assert.equal(defaults.slot2.enabled, false);
  assert.equal(defaults.slot3.enabled, false);
  assert.equal(defaults.slot1.provider, 'hilltopads');
  assert.equal(normalizeAdProvider('monetag'), 'other');
  assert.equal(normalizeAdProvider('hilltopads'), 'hilltopads');

  assert.equal(clampInArticleParagraph(-3, 3), 1);
  assert.equal(clampInArticleParagraph(999, 7), 50);
  assert.equal(clampInArticleParagraph('not-a-num', 11), 11);

  assert.equal(sanitizeAdConfigText('<script>Kwamamaza</script>', 'Advertisement'), 'scriptKwamamaza/script');
  assert.equal(isSafeAdScriptUrl('https://cdn.example.com/tag.js'), true);
  assert.equal(isSafeAdScriptUrl('//cdn.example.com/tag.js'), true);
  assert.equal(isSafeAdScriptUrl('javascript:alert(1)'), false);
  assert.equal(isSafeAdScriptUrl('http://insecure.example.com/tag.js'), false);
  assert.equal(isSafeAdAssetOrClickUrl('data:text/html,<script>1</script>'), false);

  const partnerGlobalTag = `<meta name="partner-site-verify" content="abc123def"><script src="https://cdn.example.com/global-multitag.js" data-zone="12345" async data-cfasync="false"></script>`;
  const analysis = analyzeAdCodeSnippet(partnerGlobalTag);
  assert.equal(analysis.hasCode, true);
  assert.equal(analysis.hasMetaTags, true);
  assert.equal(analysis.isLikelyGlobalScript, true);
  assert.equal(analysis.hasUnsafeUrls, false);
  assert.deepEqual(analysis.metaTags, [{ name: 'partner-site-verify', content: 'abc123def' }]);

  const discontinuedMonetagSnippet = `<meta name="monetag" content="abc123def"><script src="https://alwingulla.com/88/tag.min.js" data-zone="12345" async data-cfasync="false"></script>`;
  const blockedAnalysis = analyzeAdCodeSnippet(discontinuedMonetagSnippet);
  assert.equal(blockedAnalysis.hasIntrusivePopunder, true);
  assert.equal(blockedAnalysis.hasCode, false);
  assert.equal(sanitizeAdCodePayload(discontinuedMonetagSnippet), '');

  const unsafeAnalysis = analyzeAdCodeSnippet(`<script src="javascript:alert(1)"></script><a href="javascript:void(0)">click</a>`);
  assert.equal(unsafeAnalysis.hasUnsafeUrls, true);

  const customSlot2 = normalizeInArticleAdSlotConfig('slot2', {
    enabled: true,
    provider: 'other',
    providerLabel: '<b>Google AdSense</b>',
    code: '<ins class="adsbygoogle"></ins>',
    afterParagraph: 8,
    mobileEnabled: false,
    desktopEnabled: true,
    label: 'Kwamamaza'
  });
  assert.equal(customSlot2.provider, 'other');
  assert.equal(customSlot2.providerLabel, 'bGoogle AdSense/b');
  assert.equal(customSlot2.afterParagraph, 8);
  assert.equal(customSlot2.mobileEnabled, false);
  assert.equal(customSlot2.desktopEnabled, true);
  assert.equal(customSlot2.label, 'Kwamamaza');

  const globalCfg = normalizeGlobalAdScriptConfig({
    enabled: true,
    provider: 'hilltopads',
    code: partnerGlobalTag,
    mobileEnabled: true,
    desktopEnabled: false
  });
  assert.equal(globalCfg.enabled, true);
  assert.equal(globalCfg.provider, 'hilltopads');
  assert.equal(globalCfg.mobileEnabled, true);
  assert.equal(globalCfg.desktopEnabled, false);

  console.log('✓ 2. Multi-provider normalization, clamping, URL/markup validation & Monetag blocking verified');
}

function testDynamicInArticlePlacementAcrossArticleLengthsAndRichMarkup(): void {
  const fullAdsSettings: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    inArticleAds: {
      slot1: {
        ...DEFAULT_IN_ARTICLE_ADS_SETTINGS.slot1,
        enabled: true,
        provider: 'hilltopads',
        afterParagraph: 3,
        label: 'Kwamamaza',
        code: '<script data-zone="101" src="https://example.com/hilltopads-slot1.js"></script>'
      },
      slot2: {
        ...DEFAULT_IN_ARTICLE_ADS_SETTINGS.slot2,
        enabled: true,
        provider: 'adscod',
        afterParagraph: 7,
        label: 'Advertisement',
        code: '<div class="adscod-unit">Adscod Custom Unit</div>'
      },
      slot3: {
        ...DEFAULT_IN_ARTICLE_ADS_SETTINGS.slot3,
        enabled: true,
        provider: 'other',
        providerLabel: 'AdSense',
        afterParagraph: 11,
        label: 'Advertisement',
        code: '<div class="adsense-unit">Other Network Unit</div>'
      }
    }
  };

  // Case A: Short article (3 paragraphs) -> all defaults (3, 7, 11) skipped cleanly so ad doesn't trail after final paragraph
  const shortHtml = makeParagraphs(3);
  const shortPlan = buildArticleRenderSegments({ html: shortHtml, adsSettings: fullAdsSettings, deviceType: 'desktop' });
  assert.equal(shortPlan.totalParagraphs, 3);
  assert.deepEqual(shortPlan.placedSlots, []);

  // Case B: Medium article (6 paragraphs) -> ONLY Slot 1 after P3 is placed; Slots 2 & 3 skipped cleanly
  const mediumHtml = makeParagraphs(6);
  const mediumPlan = buildArticleRenderSegments({ html: mediumHtml, adsSettings: fullAdsSettings, deviceType: 'desktop' });
  assert.equal(mediumPlan.totalParagraphs, 6);
  assert.deepEqual(mediumPlan.placedSlots, ['slot1']);

  // Case C: Long article (13 paragraphs) with images, headings, blockquotes, lists, embeds & empty <p><br></p>
  const richHtml = makeParagraphs(13, {
    1: '<h2>Section Heading Not Counted As Paragraph</h2>',
    2: '<figure><img src="https://example.com/photo.jpg" alt="Photo"><figcaption>Image Caption Protected</figcaption></figure><p><br></p>',
    4: '<blockquote>Important quotation that must stay intact.</blockquote><ul><li>Bullet 1</li><li>Bullet 2</li></ul>',
    6: '<p><img src="https://example.com/inline-only.png" /></p>', // image-only p ignored as prose paragraph
    8: '<iframe src="https://player.vimeo.com/video/1248666228"></iframe>'
  });

  const blocks = splitTopLevelHtmlBlocks(richHtml);
  assert.ok(blocks.some((b) => b.includes('<figcaption>Image Caption Protected</figcaption>')));
  assert.equal(countArticleContentParagraphs(richHtml), 13);

  const longPlan = buildArticleRenderSegments({ html: richHtml, adsSettings: fullAdsSettings, deviceType: 'desktop' });
  assert.deepEqual(longPlan.placedSlots, ['slot1', 'slot2', 'slot3']);
  assert.equal(longPlan.segments.filter((s) => s.type === 'ad').length, 3);

  // Ensure combined HTML segments preserve 100% of original prose & media without splitting figures/captions/headings/lists
  const reconstructedHtml = longPlan.segments
    .filter((s): s is Extract<typeof s, { type: 'html' }> => s.type === 'html')
    .map((s) => s.html)
    .join('');
  assert.equal(reconstructedHtml, richHtml.replace(/\n/g, ''));

  // Case D: Prevent duplicate / immediately adjacent ads when Slot 2 targets same paragraph as Slot 1
  const duplicateBoundarySettings: AdsSettings = {
    ...fullAdsSettings,
    inArticleAds: {
      ...fullAdsSettings.inArticleAds!,
      slot2: {
        ...fullAdsSettings.inArticleAds!.slot2,
        afterParagraph: 3
      }
    }
  };
  const dedupedPlan = buildArticleRenderSegments({
    html: makeParagraphs(13),
    adsSettings: duplicateBoundarySettings,
    deviceType: 'desktop'
  });
  assert.deepEqual(dedupedPlan.placedSlots, ['slot1', 'slot3']);
  assert.ok(
    dedupedPlan.skippedSlots.some((s) => s.slotId === 'slot2' && s.reason === 'adjacent_ad_prevented')
  );

  // Case E: Mobile vs Desktop visibility filtering per slot
  const deviceSplitSettings: AdsSettings = {
    ...fullAdsSettings,
    inArticleAds: {
      slot1: { ...fullAdsSettings.inArticleAds!.slot1, mobileEnabled: true, desktopEnabled: false },
      slot2: { ...fullAdsSettings.inArticleAds!.slot2, mobileEnabled: false, desktopEnabled: true },
      slot3: { ...fullAdsSettings.inArticleAds!.slot3, enabled: false }
    }
  };
  assert.deepEqual(
    buildArticleRenderSegments({ html: makeParagraphs(10), adsSettings: deviceSplitSettings, deviceType: 'mobile' }).placedSlots,
    ['slot1']
  );
  assert.deepEqual(
    buildArticleRenderSegments({ html: makeParagraphs(10), adsSettings: deviceSplitSettings, deviceType: 'desktop' }).placedSlots,
    ['slot2']
  );

  // Case F: Real rich-editor wrapped article HTML (e.g. outer <h1><span>...<p>P1</p><figure>...</figure><span><p>P2..P10</p></span></h1>)
  const wrappedLeadPostHtml =
    '<h1><span>' +
    '<p>Intro paragraph 1 explaining the announcement clearly.</p>' +
    '<figure><img src="https://example.com/lead.jpg" alt="Lead"><figcaption>Event photo</figcaption></figure>' +
    '<span>' +
    makeParagraphs(9).replace(/Paragraph (\d+)/g, (_, n) => `Paragraph ${Number(n) + 1}`) +
    '</span>' +
    '</span></h1>';
  assert.equal(countArticleContentParagraphs(wrappedLeadPostHtml), 10);
  const wrappedDesktop = buildArticleRenderSegments({
    html: wrappedLeadPostHtml,
    adsSettings: fullAdsSettings,
    deviceType: 'desktop'
  });
  assert.equal(wrappedDesktop.totalParagraphs, 10);
  assert.deepEqual(wrappedDesktop.placedSlots, ['slot1', 'slot2']);
  const wrappedMobile = buildArticleRenderSegments({
    html: wrappedLeadPostHtml,
    adsSettings: fullAdsSettings,
    deviceType: 'mobile'
  });
  assert.deepEqual(wrappedMobile.placedSlots, ['slot1', 'slot2']);
  assert.ok(
    wrappedDesktop.segments.some((s) => s.type === 'html' && s.html.includes('<figcaption>Event photo</figcaption>'))
  );

  // Case G: Comment-only ad code is rejected by hasRenderableAdCode and skipped cleanly
  assert.equal(hasRenderableAdCode('<!-- empty comment only -->'), false);
  assert.equal(hasRenderableAdCode('<!-- zone --><script src="https://example.com/ad.js"></script>'), true);
  assert.equal(analyzeAdCodeSnippet('atOptions = { key: "123" };').hasBareJavaScript, true);
  assert.equal(sanitizeAdCodeInput('  <div>\n  </div>  '), '  <div>\n  </div>  ');

  console.log('✓ 3. Short/medium/long/wrapped-editor articles, rich HTML preservation, adjacent-ad prevention & device filtering verified');
}

function testSsrRenderingAndSeoNonMutation(): void {
  const activeSlotHtml = renderToString(
    React.createElement(InArticleAdSlot, {
      slotId: 'slot1',
      articleId: 'post-abc',
      slotConfig: {
        enabled: true,
        provider: 'hilltopads',
        code: '<div class="promo">Sponsor Card</div>',
        afterParagraph: 3,
        mobileEnabled: true,
        desktopEnabled: false,
        label: 'Kwamamaza'
      }
    })
  );
  assert.match(activeSlotHtml, /data-testid="in-article-ad-slot1"/);
  assert.match(activeSlotHtml, /data-ad-provider="hilltopads"/);
  assert.match(activeSlotHtml, /data-after-paragraph="3"/);
  assert.match(activeSlotHtml, /Kwamamaza/);
  assert.match(activeSlotHtml, /block md:hidden/);
  assert.match(activeSlotHtml, /ad-slot-wrapper/);
  assert.match(activeSlotHtml, /ad-slot-content/);

  const disabledSlotHtml = renderToString(
    React.createElement(InArticleAdSlot, {
      slotId: 'slot2',
      articleId: 'post-abc',
      slotConfig: {
        enabled: false,
        provider: 'other',
        code: '<div>Should collapse</div>',
        afterParagraph: 7,
        mobileEnabled: true,
        desktopEnabled: true
      }
    })
  );
  assert.equal(disabledSlotHtml, '');

  // Verify SEO extraction reads unmodified post content cleanly
  const samplePost: BlogPost = {
    id: 'post-seo-1',
    title: 'Kigali Innovation Report',
    slug: 'kigali-innovation-report',
    excerpt: '',
    content: makeParagraphs(5),
    category: 'Technology',
    thumbnailUrl: '',
    author: { name: 'Editorial Desk', role: 'Editor' },
    publishedAt: '2026-11-20T08:00:00.000Z',
    updatedAt: '2026-11-20T08:00:00.000Z',
    status: 'published',
    views: 10
  };
  const originalContentSnapshot = samplePost.content;

  const dom = new JSDOM('<!doctype html><html><head><title></title></head><body><div id="test"></div></body></html>', {
    url: 'https://isezerano.online/blog/kigali-innovation-report'
  });
  const prevDoc = (globalThis as any).document;
  const prevWin = (globalThis as any).window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).window = dom.window;

  try {
    updateBlogPostSeo(samplePost);
    const metaDesc = dom.window.document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const jsonLd = dom.window.document.getElementById('blog-post-schema-jsonld')?.textContent || '';
    assert.match(metaDesc, /Paragraph 1 covers important digital journalism/);
    assert.doesNotMatch(jsonLd, /Kwamamaza|monetag|adscod/i);
    assert.equal(samplePost.content, originalContentSnapshot);

    // Verify sanitizeStaticAdElement strips unsafe onclick / javascript: attributes
    const unsafeEl = dom.window.document.createElement('div');
    unsafeEl.innerHTML = `<a href="javascript:alert(1)" onclick="steal()">Bad</a>`;
    sanitizeStaticAdElement(unsafeEl);
    const anchor = unsafeEl.querySelector('a')!;
    assert.equal(anchor.hasAttribute('onclick'), false);
    assert.equal(anchor.hasAttribute('href'), false);
  } finally {
    (globalThis as any).document = prevDoc;
    (globalThis as any).window = prevWin;
  }

  console.log('✓ 4. InArticleAdSlot SSR markup, clean collapse, static sanitization & untouched SEO verified');
}

function testAdminControlsAndSecurityWiring(): void {
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  const inArticleMgrSrc = fs.readFileSync(path.resolve('src/components/InArticleAdManagerSection.tsx'), 'utf8');
  const siteSettingsSrc = fs.readFileSync(path.resolve('src/services/siteSettingsService.ts'), 'utf8');
  const blogViewSrc = fs.readFileSync(path.resolve('src/views/BlogView.tsx'), 'utf8');
  const rulesSrc = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');

  assert.doesNotMatch(adsMgrSrc, /window\.(alert|confirm|open)/);
  assert.doesNotMatch(inArticleMgrSrc, /window\.(alert|confirm|open)/);

  // All active positions represented clearly in Admin UI (zero Monetag controls or sw.js checks)
  assert.doesNotMatch(adsMgrSrc, /1\. Below Website Header/);
  assert.doesNotMatch(adsMgrSrc, /Monetag|vignette|inPagePush/i);
  assert.match(adsMgrSrc, /1\. Above Website Footer/);
  assert.match(inArticleMgrSrc, /2\. In-Article Ad Slot 1/);
  assert.match(inArticleMgrSrc, /3\. In-Article Ad Slot 2/);
  assert.match(inArticleMgrSrc, /4\. In-Article Ad Slot 3/);
  assert.doesNotMatch(inArticleMgrSrc, /ads-in-page-push-manager|\/sw\.js|5gvci|nap5k|uplcm|monetag/i);
  assert.match(inArticleMgrSrc, /Global Site-Wide Ad &amp; Verification Scripts/);

  // BlogView uses dynamic injector without altering post.content
  assert.match(blogViewSrc, /buildArticleRenderSegments/);
  assert.match(blogViewSrc, /<InArticleAdSlot/);
  assert.match(blogViewSrc, /updateBlogPostSeo\(activePost, branding\)/);

  // Admin write protection & Firestore Monetag field cleanup verified across client & rules
  assert.match(siteSettingsSrc, /isAuthorizedAdminEmail/);
  assert.match(siteSettingsSrc, /normalizeInArticleAdsSettings/);
  assert.match(siteSettingsSrc, /normalizeGlobalAdScriptConfig/);
  assert.match(siteSettingsSrc, /vignetteAd:\s*deleteField\(\)/);
  assert.match(siteSettingsSrc, /inPagePushAd:\s*deleteField\(\)/);
  assert.match(rulesSrc, /match \/appSettings\/ads[\s\S]*allow get:\s*if true;[\s\S]*allow list, write:\s*if isAdmin\(\);/);

  console.log('✓ 5. Admin Dashboard clean numbered positions, Global Scripts panel, Monetag deletion & Admin security verified');
}

async function testGlobalAdScriptsRuntimeDeduplication(): Promise<void> {
  __resetGlobalAdScriptsCacheForTests();
  __resetAdsSettingsCacheForTests();
  __resetPopunderGuardAndOverlayCacheForTests();
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/blog/sample-article'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevFetch = (globalThis as any).fetch;
  const prevCss = (globalThis as any).CSS;

  const seededSettings: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    globalScripts: {
      enabled: true,
      provider: 'hilltopads',
      code: `<meta name="partner-verify" content="verify-999" /><meta name="monetag" content="blocked-meta" /><script src="https://cdn.example.com/global-tag.min.js" data-zone="999001" async data-cfasync="false"></script>`,
      mobileEnabled: true,
      desktopEnabled: true
    }
  };

  const toFirestoreRestFields = (val: any): any => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreRestFields) } };
    if (typeof val === 'object') {
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) fields[k] = toFirestoreRestFields(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  };

  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).CSS = { escape: (v: string) => v };
  (globalThis as any).localStorage = {
    getItem: (key: string) =>
      key === 'isezerano_ads_settings' ? JSON.stringify(seededSettings) : null,
    setItem: () => undefined,
    removeItem: () => undefined
  };
  (globalThis as any).fetch = async () => ({
    ok: true,
    json: async () => ({ fields: toFirestoreRestFields(seededSettings).mapValue.fields })
  });

  const container = dom.window.document.getElementById('root')!;
  const root = createRoot(container);

  try {
    // 1. Admin route must NEVER execute global ad scripts
    root.render(React.createElement(GlobalAdScripts, { currentPage: 'admin' }));
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(dom.window.document.head.querySelectorAll('script[data-isezerano-global-ad]').length, 0);
    assert.equal(dom.window.document.head.querySelectorAll('meta[name="partner-verify"]').length, 0);
    assert.equal(dom.window.document.head.querySelectorAll('meta[name="monetag"]').length, 0);

    // 2. Public route injects approved meta + global script once cleanly while stripping Monetag meta
    root.render(React.createElement(GlobalAdScripts, { currentPage: 'blog' }));
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(dom.window.document.head.querySelectorAll('meta[name="partner-verify"]').length, 1);
    assert.equal(dom.window.document.head.querySelectorAll('meta[name="monetag"]').length, 0);
    assert.equal(dom.window.document.head.querySelectorAll('script[data-isezerano-global-ad]').length, 1);

    // 3. Re-navigating across public pages does NOT duplicate script/meta in document.head
    root.render(React.createElement(GlobalAdScripts, { currentPage: 'home' }));
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(dom.window.document.head.querySelectorAll('meta[name="partner-verify"]').length, 1);
    assert.equal(dom.window.document.head.querySelectorAll('meta[name="monetag"]').length, 0);
    assert.equal(dom.window.document.head.querySelectorAll('script[data-isezerano-global-ad]').length, 1);
  } finally {
    root.unmount();
    await new Promise((r) => setTimeout(r, 20));
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).localStorage = prevLocalStorage;
    (globalThis as any).fetch = prevFetch;
    (globalThis as any).CSS = prevCss;
  }

  console.log('✓ 6. GlobalAdScripts runtime /admin suppression, Monetag meta stripping & single-execution deduplication verified');
}

async function testHeaderFooterAndInArticleRuntimeExecution(): Promise<void> {
  __resetAdsSettingsCacheForTests();
  __resetPopunderGuardAndOverlayCacheForTests();
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/blog/sample-article'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevFetch = (globalThis as any).fetch;
  const prevMutationObserver = (globalThis as any).MutationObserver;
  const prevResizeObserver = (globalThis as any).ResizeObserver;
  const prevRAF = (globalThis as any).requestAnimationFrame;
  const prevCAF = (globalThis as any).cancelAnimationFrame;

  const seededSettings: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    belowHeaderAd: {
      enabled: true,
      type: 'code',
      label: 'Header Partner',
      code: '<div class="partner-hdr"><script async src="https://cdn.example.com/header-zone.js" data-zone="111"></script></div>'
    },
    aboveFooterAd: {
      enabled: true,
      type: 'code',
      label: 'Below Post Sponsor',
      code: '<div class="partner-ftr"><script src="https://cdn.example.com/footer-zone.js" data-zone="222"></script></div>'
    }
  };

  const toFirestoreRestFields = (val: any): any => {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    if (typeof val === 'string') return { stringValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreRestFields) } };
    if (typeof val === 'object') {
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) fields[k] = toFirestoreRestFields(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  };

  (dom.window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    dom.window.setTimeout(() => cb(Date.now()), 0);
  (dom.window as any).cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id);
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).MutationObserver = dom.window.MutationObserver;
  (globalThis as any).ResizeObserver = undefined;
  (globalThis as any).requestAnimationFrame = (dom.window as any).requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = (dom.window as any).cancelAnimationFrame;
  (globalThis as any).localStorage = {
    getItem: (key: string) =>
      key === 'isezerano_ads_settings' ? JSON.stringify(seededSettings) : null,
    setItem: () => undefined,
    removeItem: () => undefined
  };
  (globalThis as any).fetch = async () => ({
    ok: true,
    json: async () => ({ fields: toFirestoreRestFields(seededSettings).mapValue.fields })
  });

  const container = dom.window.document.getElementById('root')!;
  const root = createRoot(container);

  try {
    root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(GlobalAdScripts, { currentPage: 'blog' }),
        React.createElement(AdSlot, { placement: 'below_header' as any }),
        React.createElement(InArticleAdSlot, {
          slotId: 'slot1',
          articleId: 'post-nested',
          slotConfig: {
            enabled: true,
            provider: 'hilltopads',
            afterParagraph: 3,
            mobileEnabled: true,
            desktopEnabled: true,
            label: 'Advertisement',
            code: '<div class="partner-inline"><script src="https://cdn.example.com/inarticle-slot1.js" data-zone="333"></script></div>'
          }
        }),
        React.createElement(InArticleAdSlot, {
          slotId: 'slot2',
          articleId: 'post-comment-only',
          slotConfig: {
            enabled: true,
            provider: 'hilltopads',
            afterParagraph: 7,
            mobileEnabled: true,
            desktopEnabled: true,
            label: 'Advertisement',
            code: '<!-- comment-only code collapses -->'
          }
        }),
        React.createElement(AdSlot, { placement: 'above_footer' })
      )
    );

    await new Promise((r) => setTimeout(r, 120));

    // Legacy below_header never renders in the DOM
    assert.equal(container.querySelector('[data-ad-placement="below_header"]'), null);

    // In-Article Slot 1 rendered immediately (not gated behind IntersectionObserver) & stays visible (never max-h-0 / opacity-0)
    const inArticleSlot1 = container.querySelector('[data-testid="in-article-ad-slot1"]') as HTMLElement | null;
    assert.ok(inArticleSlot1, 'In-Article Slot 1 must mount when enabled and configured');
    assert.doesNotMatch(inArticleSlot1.className, /max-h-0|opacity-0|pointer-events-none/);
    const inlineScript = inArticleSlot1.querySelector('.partner-inline script') as HTMLScriptElement | null;
    assert.ok(inlineScript, 'Nested <script> inside .partner-inline must execute inside DOM wrapper');
    assert.equal(inlineScript.getAttribute('data-zone'), '333');

    // Comment-only slot 2 collapses cleanly
    assert.equal(container.querySelector('[data-testid="in-article-ad-slot2"]'), null);

    // Below-Post / Above-Footer Ad rendered & nested script executed
    const footerWrap = container.querySelector('[data-ad-placement="above_footer"]');
    assert.ok(footerWrap, 'Below-Post AdSlot must mount when enabled and configured');
    const footerScript = footerWrap.querySelector('.partner-ftr script') as HTMLScriptElement | null;
    assert.ok(footerScript, 'Nested <script> inside .partner-ftr must execute inside DOM wrapper');
    assert.equal(footerScript.getAttribute('data-zone'), '222');
  } finally {
    root.unmount();
    await new Promise((r) => setTimeout(r, 20));
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).localStorage = prevLocalStorage;
    (globalThis as any).fetch = prevFetch;
    (globalThis as any).MutationObserver = prevMutationObserver;
    (globalThis as any).ResizeObserver = prevResizeObserver;
    (globalThis as any).requestAnimationFrame = prevRAF;
    (globalThis as any).cancelAnimationFrame = prevCAF;
  }

  console.log('✓ 7. Removed below_header, Below-Post & In-Article nested script DOM execution verified');
}

async function testDirectLinkCardsAndLegacyMonetagPurge(): Promise<void> {
  // 1. Direct Link URL security & Monetag domain rejection
  assert.equal(isSafeDirectLinkUrl('https://partner.example.com/offer/123'), true);
  assert.equal(isSafeDirectLinkUrl('http://partner.example.com/offer/123'), false);
  assert.equal(isSafeDirectLinkUrl('javascript:alert(1)'), false);
  assert.equal(isSafeDirectLinkUrl('https://uplcm.com/4/12329910'), false);
  assert.equal(isSafeDirectLinkUrl('https://quge5.com/4/313598'), false);
  assert.equal(isSafeAdScriptUrl('https://nap5k.com/tag.min.js'), false);
  assert.equal(isSafeAdScriptUrl('https://n6wxm.com/vignette.min.js'), false);
  assert.equal(isSafeAdScriptUrl('https://5gvci.com/act/files/service-worker.min.js?r=sw'), false);
  assert.equal(isSafeAdScriptUrl('https://alwingulla.com/88/tag.min.js'), false);
  assert.equal(
    extractBareSafeDirectLinkUrl('  https://partner.example.com/offer/123  '),
    'https://partner.example.com/offer/123'
  );
  assert.equal(extractBareSafeDirectLinkUrl('<div>Banner</div>'), null);

  // 2. Stale Firestore appSettings/ads containing legacy Monetag fields/codes is cleanly stripped at runtime
  const purged = normalizeAdsSettingsPayload({
    masterEnabled: true,
    belowHeaderAd: {
      enabled: true,
      type: 'code',
      label: 'Advertisement',
      code: "<script>(function(s){s.dataset.zone='12321969',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>"
    },
    vignetteAd: {
      enabled: true,
      zoneId: '12322670',
      scriptUrl: 'https://n6wxm.com/vignette.min.js',
      mobileEnabled: true,
      desktopEnabled: true
    },
    inPagePushAd: {
      enabled: true,
      zoneId: '12321969',
      scriptUrl: 'https://nap5k.com/tag.min.js',
      mobileEnabled: true,
      desktopEnabled: true
    },
    globalScripts: {
      enabled: true,
      provider: 'monetag' as any,
      mobileEnabled: true,
      desktopEnabled: true,
      code: `<meta name="monetag" content="verify-live" /><script>(function(s){s.dataset.zone='12322670',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>`
    },
    aboveFooterAd: {
      enabled: true,
      type: 'code',
      label: 'Sponsored Content',
      code: 'https://partner.example.com/offer/123'
    },
    inArticleAds: {
      slot1: {
        enabled: true,
        provider: 'monetag' as any,
        afterParagraph: 3,
        mobileEnabled: true,
        desktopEnabled: true,
        label: 'Advertisement',
        code: 'https://uplcm.com/4/12329910'
      }
    } as AdsSettings['inArticleAds']
  } as any);

  assert.equal(purged.belowHeaderAd?.enabled, false);
  assert.equal(purged.belowHeaderAd?.code, '');
  assert.equal('vignetteAd' in purged, false);
  assert.equal('inPagePushAd' in purged, false);
  assert.equal(purged.globalScripts?.provider, 'other');
  assert.equal(purged.globalScripts?.code, '');
  assert.equal(purged.inArticleAds?.slot1.provider, 'other');
  assert.equal(purged.inArticleAds?.slot1.directLinkCard?.directLinkUrl, '');
  assert.equal(isInArticleSlotRenderable(purged.inArticleAds?.slot1), false);

  // Bare URL placed inside legacy aboveFooterAd ('code' mode) never leaks raw URL text onto public pages
  const prevLs = (globalThis as any).localStorage;
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k === 'isezerano_ads_settings' ? JSON.stringify(purged) : null),
    setItem: () => undefined,
    removeItem: () => undefined
  };
  try {
    assert.equal(renderToString(React.createElement(AdSlot, { placement: 'above_footer' })), '');
  } finally {
    (globalThis as any).localStorage = prevLs;
  }

  // 3. Complete non-Monetag In-Article Direct Link Sponsored Ad Card renders responsive rectangular card between P3, P7, P11
  const configuredDirectSettings: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    inArticleAds: {
      slot1: {
        enabled: true,
        provider: 'hilltopads',
        adFormat: 'direct_link',
        code: '',
        afterParagraph: 3,
        mobileEnabled: true,
        desktopEnabled: true,
        label: 'Sponsored',
        directLinkCard: {
          directLinkUrl: 'https://partner.example.com/offer/123',
          headline: 'Discover Verified Partner Offers Across Kigali',
          description: 'Explore curated mobile & business services.',
          thumbnailUrl: 'https://cdn.example.com/offer-thumb.jpg',
          ctaText: 'Visit Partner',
          disclosureLabel: 'Sponsored'
        }
      },
      slot2: {
        enabled: true,
        provider: 'hilltopads',
        adFormat: 'direct_link',
        code: '',
        afterParagraph: 7,
        mobileEnabled: true,
        desktopEnabled: true,
        label: 'Advertisement',
        directLinkCard: {
          directLinkUrl: 'https://partner.example.com/offer/456',
          headline: 'Trusted Local Digital Solutions',
          description: '',
          thumbnailUrl: '',
          ctaText: 'Learn More',
          disclosureLabel: 'Advertisement'
        }
      },
      slot3: {
        enabled: true,
        provider: 'hilltopads',
        adFormat: 'direct_link',
        code: '',
        afterParagraph: 11,
        mobileEnabled: true,
        desktopEnabled: true,
        label: 'Kwamamaza',
        directLinkCard: {
          directLinkUrl: 'https://partner.example.com/offer/789',
          headline: '',
          description: 'Incomplete slot collapses',
          thumbnailUrl: '',
          ctaText: '',
          disclosureLabel: 'Kwamamaza'
        }
      }
    }
  };

  const articlePlan = buildArticleRenderSegments({
    html: makeParagraphs(13),
    adsSettings: configuredDirectSettings,
    deviceType: 'desktop'
  });
  assert.deepEqual(articlePlan.placedSlots, ['slot1', 'slot2']);
  assert.equal(
    renderToString(
      React.createElement(InArticleAdSlot, {
        slotId: 'slot3',
        articleId: 'post-direct-1',
        slotConfig: configuredDirectSettings.inArticleAds!.slot3
      })
    ),
    ''
  );

  const directCardHtml = renderToString(
    React.createElement(InArticleAdSlot, {
      slotId: 'slot1',
      articleId: 'post-direct-1',
      slotConfig: configuredDirectSettings.inArticleAds!.slot1
    })
  );
  assert.match(directCardHtml, /data-ad-format="direct_link"/);
  assert.match(directCardHtml, /href="https:\/\/partner\.example\.com\/offer\/123"/);
  assert.match(directCardHtml, /target="_blank"/);
  assert.match(directCardHtml, /rel="noopener noreferrer sponsored"/);
  assert.match(directCardHtml, /Discover Verified Partner Offers Across Kigali/);
  assert.match(directCardHtml, /Visit Partner/);
  assert.match(directCardHtml, /flex-col sm:flex-row/);
  assert.match(directCardHtml, /SPONSORED/);

  console.log('✓ 8. Direct Link Sponsored Cards, legacy Monetag purge & bare-URL suppression verified');
}

async function runSuite(): Promise<void> {
  testOldAdscodAndMonetagCompletelyRemovedAndCoreAssetsPreserved();
  testConfigNormalizationValidationAndSecurity();
  testDynamicInArticlePlacementAcrossArticleLengthsAndRichMarkup();
  testSsrRenderingAndSeoNonMutation();
  testAdminControlsAndSecurityWiring();
  await testGlobalAdScriptsRuntimeDeduplication();
  await testHeaderFooterAndInArticleRuntimeExecution();
  await testDirectLinkCardsAndLegacyMonetagPurge();
  console.log('\nALL MULTI-PROVIDER & IN-ARTICLE ADVERTISING TESTS PASSED!');
}

runSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('IN-ARTICLE ADS SUITE FAILURE:', err);
    process.exit(1);
  });
