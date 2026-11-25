import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import {
  DEFAULT_ADS_SETTINGS,
  DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS,
  DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS,
  HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC,
  AdsSettings
} from '../src/types/platform';
import {
  __resetPopunderGuardAndOverlayCacheForTests,
  analyzeAdCodeSnippet,
  clampHomepageInFeedPosition,
  detectIntrusivePopunderAdCode,
  hasRenderableAdCode,
  isSafeAdScriptUrl,
  normalizeGlobalAdScriptConfig,
  normalizeHomepageInFeedAdSlotConfig,
  normalizeHomepageInFeedAdsSettings,
  normalizeInArticleAdSlotConfig,
  normalizeStandardAdSlotConfig,
  sanitizeAdCodePayload,
  stripIntrusivePopunderAdCode
} from '../src/utils/inArticleAdUtils';
import { buildHomepageAdPlan } from '../src/utils/homepageAdInjector';
import {
  GlobalAdScripts,
  __resetGlobalAdScriptsCacheForTests
} from '../src/components/GlobalAdScripts';
import { HILLTOPADS_SCRIPT_SRC } from '../src/components/HilltopAdsArticleBanner';
import { HILLTOPADS_HEADER_SCRIPT_SRC } from '../src/components/HilltopAdsHeaderBanner';
import { AdSlot } from '../src/components/AdSlot';
import { InArticleAdSlot } from '../src/components/InArticleAdSlot';
import { HomepageInFeedAdSlot } from '../src/components/HomepageInFeedAdSlot';
import { HomepageInFeedAdManagerSection } from '../src/components/HomepageInFeedAdManagerSection';
import { HomeView } from '../src/views/HomeView';
import { AuthProvider } from '../src/context/AuthContext';
import { WebsiteDesignProvider } from '../src/context/WebsiteDesignContext';
import { BlogPost } from '../src/types/blog';
import { __resetAdsSettingsCacheForTests } from '../src/services/siteSettingsService';

const EXACT_INTRUSIVE_POPUNDER =
  '<script src="https://quge5.com/88/tag.min.js" data-zone="313598" async data-cfasync="false"></script>';

function makeSamplePosts(count: number, category = 'General News'): BlogPost[] {
  return Array.from({ length: count }, (_, idx) => {
    const n = idx + 1;
    const iso = new Date(Date.UTC(2026, 10, 22, 12, 0 - idx, 0)).toISOString();
    return {
      id: `post-${n}`,
      title: `Sample Headline ${n}: National Development Update`,
      slug: `sample-headline-${n}`,
      excerpt: `Summary for article card ${n} in ${category}.`,
      content: `<p>Article ${n} body paragraph one.</p><p>Article ${n} body paragraph two.</p>`,
      category,
      thumbnailUrl: '',
      author: { name: 'Editorial Desk', role: 'Editor' },
      publishedAt: iso,
      updatedAt: iso,
      status: 'published',
      views: n * 10
    };
  });
}

function testPopunderAndMonetagDetectionAndSanitization(): void {
  assert.equal(detectIntrusivePopunderAdCode(EXACT_INTRUSIVE_POPUNDER), true);
  assert.equal(
    detectIntrusivePopunderAdCode('<meta name="monetag" content="verify-123" />'),
    true
  );
  assert.equal(
    detectIntrusivePopunderAdCode(
      `<meta name="google-site-verification" content="verify-123" />\n${EXACT_INTRUSIVE_POPUNDER}`
    ),
    true
  );
  assert.equal(
    detectIntrusivePopunderAdCode('<meta name="google-site-verification" content="verify-123" />'),
    false
  );
  assert.equal(
    detectIntrusivePopunderAdCode(
      '<div class="native"><script src="https://cdn.example.com/native-widget.js" data-zone="888"></script></div>'
    ),
    false
  );

  // URL validator blocks quge5.com and all Monetag domains while keeping HilltopAds and approved https embeds
  assert.equal(isSafeAdScriptUrl('https://quge5.com/88/tag.min.js'), false);
  assert.equal(isSafeAdScriptUrl('https://nap5k.com/tag.min.js'), false);
  assert.equal(isSafeAdScriptUrl('https://n6wxm.com/vignette.min.js'), false);
  assert.equal(isSafeAdScriptUrl('https://5gvci.com/act/files/service-worker.min.js?r=sw'), false);
  assert.equal(isSafeAdScriptUrl('https://alwingulla.com/88/tag.min.js'), false);
  assert.equal(isSafeAdScriptUrl('https://uplcm.com/4/12329910'), false);
  assert.equal(isSafeAdScriptUrl('https://cdn.example.com/native-widget.js'), true);

  // Strips popunder AND Monetag tags from mixed snippet while keeping approved verification meta tags
  const mixed = `<meta name="google-site-verification" content="abcd9876" />\n<meta name="monetag" content="strip-me" />\n${EXACT_INTRUSIVE_POPUNDER}`;
  const strippedMixed = stripIntrusivePopunderAdCode(mixed);
  assert.equal(strippedMixed.hadIntrusivePopunder, true);
  assert.equal(strippedMixed.removedCount, 2);
  assert.equal(strippedMixed.cleanedCode, '<meta name="google-site-verification" content="abcd9876" />');
  assert.doesNotMatch(strippedMixed.cleanedCode, /quge5\.com|313598|monetag/);

  // Stripping pure popunder yields empty string and non-renderable code
  assert.equal(sanitizeAdCodePayload(EXACT_INTRUSIVE_POPUNDER), '');
  assert.equal(hasRenderableAdCode(EXACT_INTRUSIVE_POPUNDER), false);

  // analyzeAdCodeSnippet flags popunder / Monetag warning clearly
  const popunderAnalysis = analyzeAdCodeSnippet(EXACT_INTRUSIVE_POPUNDER);
  assert.equal(popunderAnalysis.hasIntrusivePopunder, true);
  assert.ok(popunderAnalysis.warnings.some((w) => /Popunder|OnClick|Monetag/i.test(w)));

  // All slot normalizers strip the popunder and Monetag tags automatically
  const cleanHeader = normalizeStandardAdSlotConfig({
    enabled: true,
    type: 'code',
    code: EXACT_INTRUSIVE_POPUNDER
  });
  assert.equal(cleanHeader.code, '');

  const cleanInArticle = normalizeInArticleAdSlotConfig('slot1', {
    enabled: true,
    code: EXACT_INTRUSIVE_POPUNDER
  });
  assert.equal(cleanInArticle.code, '');

  const cleanHomepage = normalizeHomepageInFeedAdSlotConfig('slot1', {
    enabled: true,
    code: EXACT_INTRUSIVE_POPUNDER
  });
  assert.equal(cleanHomepage.code, '');

  const cleanGlobal = normalizeGlobalAdScriptConfig({
    enabled: true,
    code: mixed
  });
  assert.equal(cleanGlobal.code, '<meta name="google-site-verification" content="abcd9876" />');

  // Root /sw.js must be permanently deleted
  assert.equal(fs.existsSync(path.resolve('public/sw.js')), false);

  console.log('✓ 1. Intrusive OnClick/Popunder & Monetag removal verified across all normalizers & /sw.js deleted');
}

async function testRuntimePopunderBlockingAndScriptIsolation(): Promise<void> {
  __resetGlobalAdScriptsCacheForTests();
  __resetPopunderGuardAndOverlayCacheForTests();
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevFetch = (globalThis as any).fetch;
  const prevCss = (globalThis as any).CSS;
  const prevMutationObserver = (globalThis as any).MutationObserver;
  const prevResizeObserver = (globalThis as any).ResizeObserver;
  const prevRAF = (globalThis as any).requestAnimationFrame;
  const prevCAF = (globalThis as any).cancelAnimationFrame;

  const contaminatedSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
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
    belowHeaderAd: {
      enabled: true,
      type: 'code',
      label: 'Advertisement',
      code: EXACT_INTRUSIVE_POPUNDER
    },
    aboveFooterAd: {
      enabled: true,
      type: 'code',
      label: 'Advertisement',
      code: `${EXACT_INTRUSIVE_POPUNDER}<div class="safe-footer"><script src="https://cdn.example.com/footer-native.js"></script></div>`
    },
    globalScripts: {
      enabled: true,
      provider: 'hilltopads',
      code: `<meta name="partner-verify" content="verify-keep-me" /><meta name="monetag" content="drop-me" />${EXACT_INTRUSIVE_POPUNDER}<script src="https://nap5k.com/tag.min.js" data-zone="12321969"></script>`,
      mobileEnabled: true,
      desktopEnabled: true
    }
  } as any;

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

  __resetAdsSettingsCacheForTests();
  (dom.window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    dom.window.setTimeout(() => cb(Date.now()), 0);
  (dom.window as any).cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id);
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).CSS = { escape: (v: string) => v };
  (globalThis as any).MutationObserver = dom.window.MutationObserver;
  (globalThis as any).ResizeObserver = undefined;
  (globalThis as any).requestAnimationFrame = (dom.window as any).requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = (dom.window as any).cancelAnimationFrame;
  (globalThis as any).localStorage = {
    getItem: (key: string) =>
      key === 'isezerano_ads_settings' ? JSON.stringify(contaminatedSettings) : null,
    setItem: () => undefined,
    removeItem: () => undefined
  };
  (globalThis as any).fetch = async () => ({
    ok: true,
    json: async () => ({ fields: toFirestoreRestFields(contaminatedSettings).mapValue.fields })
  });

  const container = dom.window.document.getElementById('root')!;
  const root = createRoot(container);

  try {
    root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(GlobalAdScripts, { currentPage: 'home' }),
        React.createElement(AdSlot, { placement: 'below_header' as any }),
        React.createElement(AdSlot, { placement: 'above_footer' }),
        React.createElement(InArticleAdSlot, {
          slotId: 'slot1',
          articleId: 'post-pop-test',
          slotConfig: {
            enabled: true,
            provider: 'hilltopads',
            afterParagraph: 3,
            mobileEnabled: true,
            desktopEnabled: true,
            label: 'Advertisement',
            code: EXACT_INTRUSIVE_POPUNDER
          }
        }),
        React.createElement(HomepageInFeedAdSlot, {
          slotId: 'slot1',
          feedContext: 'frontpage',
          slotConfig: {
            enabled: true,
            provider: 'hilltopads',
            afterPost: 4,
            mobileEnabled: true,
            desktopEnabled: true,
            label: 'Kwamamaza',
            code: `${EXACT_INTRUSIVE_POPUNDER}<div class="safe-feed"><script src="https://cdn.example.com/feed-native.js" data-zone="777"></script></div>`
          }
        })
      )
    );

    await new Promise((r) => setTimeout(r, 160));

    // Zero quge5.com / nap5k / n6wxm / monetag scripts anywhere in head or body
    const allScripts = Array.from(dom.window.document.querySelectorAll('script'));
    assert.equal(
      allScripts.some((s) =>
        /(?:quge5\.com|nap5k\.com|n6wxm\.com|alwingulla\.com|5gvci\.com|uplcm\.com|monetag\.com)/i.test(
          s.getAttribute('src') || ''
        )
      ),
      false,
      'Intrusive popunder and Monetag scripts must NEVER be mounted in DOM'
    );

    // Approved partner verification meta tag mounts cleanly while Monetag meta tag is dropped
    assert.equal(
      dom.window.document.head.querySelector('meta[name="partner-verify"]')?.getAttribute('content'),
      'verify-keep-me'
    );
    assert.equal(dom.window.document.head.querySelector('meta[name="monetag"]'), null);

    // Removed below_header collapses cleanly & In-Article pure popunder collapses cleanly
    assert.equal(container.querySelector('[data-ad-placement="below_header"]'), null);
    assert.equal(container.querySelector('[data-testid="in-article-ad-slot1"]'), null);

    // Mixed Above Footer & Homepage In-Feed Slot 1 keep safe native script only
    assert.ok(container.querySelector('[data-ad-placement="above_footer"] .safe-footer script[src="https://cdn.example.com/footer-native.js"]'));
    const feedSlot = container.querySelector('[data-testid="homepage-in-feed-ad-slot1"]');
    assert.ok(feedSlot);
    assert.ok(feedSlot.querySelector('.safe-feed script[src="https://cdn.example.com/feed-native.js"]'));
    assert.match(feedSlot.textContent || '', /Kwamamaza/);
  } finally {
    root.unmount();
    await new Promise((r) => setTimeout(r, 20));
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).localStorage = prevLocalStorage;
    (globalThis as any).fetch = prevFetch;
    (globalThis as any).CSS = prevCss;
    (globalThis as any).MutationObserver = prevMutationObserver;
    (globalThis as any).ResizeObserver = prevResizeObserver;
    (globalThis as any).requestAnimationFrame = prevRAF;
    (globalThis as any).cancelAnimationFrame = prevCAF;
  }

  console.log('✓ 2. Runtime popunder & Monetag blocking across GlobalAdScripts, AdSlot, InArticleAdSlot & HomepageInFeedAdSlot verified');
}

function testHomepageInFeedDefaultsPlannerAndRendering(): void {
  const defaults = normalizeHomepageInFeedAdsSettings(undefined);
  assert.equal(defaults.slot1.afterPost, DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS.slot1);
  assert.equal(defaults.slot2.afterPost, DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS.slot2);
  assert.equal(defaults.slot3.afterPost, DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS.slot3);
  assert.equal(defaults.slot1.afterPost, 4);
  assert.equal(defaults.slot2.afterPost, 8);
  assert.equal(defaults.slot3.afterPost, 12);
  assert.equal(defaults.slot1.enabled, false);
  assert.equal(defaults.slot1.label, 'Advertisement');
  assert.equal(defaults.slot1.mobileEnabled, true);
  assert.equal(defaults.slot1.desktopEnabled, true);

  assert.equal(clampHomepageInFeedPosition(-2, 4), 1);
  assert.equal(clampHomepageInFeedPosition(999, 8), 50);
  assert.equal(clampHomepageInFeedPosition('invalid', 12), 12);

  const settingsWithAllThree: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    homepageInFeedAds: {
      slot1: {
        ...DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS.slot1,
        enabled: true,
        provider: 'hilltopads',
        afterPost: 4,
        label: 'Advertisement',
        code: '<div class="feed-ad-1">Feed Slot 1</div>'
      },
      slot2: {
        ...DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS.slot2,
        enabled: true,
        provider: 'other',
        providerLabel: 'Partner Direct',
        afterPost: 8,
        label: 'Kwamamaza',
        code: '<div class="feed-ad-2">Feed Slot 2</div>'
      },
      slot3: {
        ...DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS.slot3,
        enabled: true,
        provider: 'hilltopads',
        afterPost: 12,
        label: 'Advertisement',
        mobileEnabled: true,
        desktopEnabled: false,
        code: '<div class="feed-ad-3">Feed Slot 3</div>'
      }
    }
  };

  // Short feed (3 posts): all defaults skipped cleanly
  const shortPlan = buildHomepageAdPlan({
    totalPosts: 3,
    adsSettings: settingsWithAllThree,
    deviceType: 'desktop'
  });
  assert.deepEqual(shortPlan.placedSlots, []);

  // Desktop 14 posts: slot1 (4) and slot2 (8) placed; slot3 is mobile-only so hidden on desktop
  const desktopPlan = buildHomepageAdPlan({
    totalPosts: 14,
    adsSettings: settingsWithAllThree,
    deviceType: 'desktop'
  });
  assert.deepEqual(desktopPlan.placedSlots, ['slot1', 'slot2']);
  assert.ok(desktopPlan.skippedSlots.some((s) => s.slotId === 'slot3' && s.reason === 'device_hidden'));

  // Mobile 14 posts: slot1 (4), slot2 (8), slot3 (12) all placed
  const mobilePlan = buildHomepageAdPlan({
    totalPosts: 14,
    adsSettings: settingsWithAllThree,
    deviceType: 'mobile'
  });
  assert.deepEqual(mobilePlan.placedSlots, ['slot1', 'slot2', 'slot3']);

  // Duplicate position prevented cleanly
  const duplicatePlan = buildHomepageAdPlan({
    totalPosts: 10,
    adsSettings: {
      ...settingsWithAllThree,
      homepageInFeedAds: {
        ...settingsWithAllThree.homepageInFeedAds!,
        slot2: { ...settingsWithAllThree.homepageInFeedAds!.slot2, afterPost: 4 }
      }
    },
    deviceType: 'desktop'
  });
  assert.deepEqual(duplicatePlan.placedSlots, ['slot1']);
  assert.ok(
    duplicatePlan.skippedSlots.some(
      (s) => s.slotId === 'slot2' && s.reason === 'adjacent_ad_prevented'
    )
  );

  // HomeView SSR renders ads cleanly between <article> cards (never nested inside <article>)
  const prevLs = (globalThis as any).localStorage;
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k === 'isezerano_ads_settings' ? JSON.stringify(settingsWithAllThree) : null),
    setItem: () => undefined,
    removeItem: () => undefined
  };

  try {
    const samplePosts = makeSamplePosts(14, 'National News');
    const categories = [
      { id: 'cat-1', name: 'National News', slug: 'national-news', description: 'Top national reporting.' }
    ];

    const frontPageHtml = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          WebsiteDesignProvider,
          null,
          React.createElement(HomeView, {
            onNavigate: () => undefined,
            posts: samplePosts,
            categories,
            commentCounts: {},
            isNewsLoading: false,
            selectedCategory: 'All Categories'
          })
        )
      )
    );
    assert.match(frontPageHtml, /data-testid="homepage-in-feed-ad-slot1"/);
    assert.match(frontPageHtml, /data-testid="homepage-in-feed-ad-slot2"/);
    // Ensure HomepageInFeedAdSlot aside tags are never nested inside <article>...</article>
    const domCheck = new JSDOM(`<body>${frontPageHtml}</body>`);
    const asideNodes = Array.from(
      domCheck.window.document.querySelectorAll('[data-ad-placement^="homepage_in_feed_"]')
    );
    assert.equal(asideNodes.length, 2);
    for (const node of asideNodes) {
      assert.equal(node.closest('article'), null, 'Feed ad must never be nested inside an <article>');
    }

    // Filtered Category Feed also renders HomepageInFeedAdSlot cleanly
    const filteredHtml = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          WebsiteDesignProvider,
          null,
          React.createElement(HomeView, {
            onNavigate: () => undefined,
            posts: samplePosts,
            categories,
            commentCounts: {},
            isNewsLoading: false,
            selectedCategory: 'National News'
          })
        )
      )
    );
    assert.match(filteredHtml, /data-testid="homepage-in-feed-ad-slot1"/);
    assert.match(filteredHtml, /data-testid="homepage-in-feed-ad-slot2"/);

    // Master disabled -> zero Homepage In-Feed Ads
    const disabledSettings: AdsSettings = { ...settingsWithAllThree, masterEnabled: false };
    (globalThis as any).localStorage = {
      getItem: (k: string) => (k === 'isezerano_ads_settings' ? JSON.stringify(disabledSettings) : null),
      setItem: () => undefined,
      removeItem: () => undefined
    };
    const hiddenHtml = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          WebsiteDesignProvider,
          null,
          React.createElement(HomeView, {
            onNavigate: () => undefined,
            posts: samplePosts,
            categories,
            commentCounts: {},
            isNewsLoading: false,
            selectedCategory: 'All Categories'
          })
        )
      )
    );
    assert.doesNotMatch(hiddenHtml, /homepage_in_feed_/);
  } finally {
    (globalThis as any).localStorage = prevLs;
  }

  console.log('✓ 3. Homepage In-Feed Ads planner, defaults (4/8/12), device visibility & HomeView SSR outside-<article> placement verified');
}

function testAdminUiAllSevenPositionsAndCommentRulesAudit(): void {
  const adminFeedHtml = renderToString(
    React.createElement(HomepageInFeedAdManagerSection, {
      homepageInFeedAds: DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS,
      isSaving: false,
      onUpdateSlot: () => undefined,
      onSaveSlot: () => undefined
    })
  );
  assert.match(adminFeedHtml, /HOMEPAGE IN-FEED ADS/);
  assert.match(adminFeedHtml, /5\. Homepage In-Feed Ad Slot 1/);
  assert.match(adminFeedHtml, /6\. Homepage In-Feed Ad Slot 2/);
  assert.match(adminFeedHtml, /7\. Homepage In-Feed Ad Slot 3/);
  assert.match(adminFeedHtml, /Kwamamaza/);
  assert.match(adminFeedHtml, /Advertisement/);

  // Verify AdsManager imports HomepageInFeedAdManagerSection, Floating Video Slider & completely removes Monetag & Top Vimeo Ad
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  assert.doesNotMatch(adsMgrSrc, /1\. Below Website Header/);
  assert.doesNotMatch(adsMgrSrc, /monetag|vignette|inPagePush/i);
  assert.match(adsMgrSrc, /1\. Above Website Footer/);
  assert.match(adsMgrSrc, /<InArticleAdManagerSection/);
  assert.match(adsMgrSrc, /<HomepageInFeedAdManagerSection/);
  assert.match(adsMgrSrc, /normalizeHomepageInFeedAdsSettings/);
  assert.match(adsMgrSrc, /floatingVideoAd/);
  assert.doesNotMatch(adsMgrSrc, /aboveHeaderVideoAd|TopVideoAd|ShopVimeo|vimeo/i);

  const inArticleMgrSrc = fs.readFileSync(path.resolve('src/components/InArticleAdManagerSection.tsx'), 'utf8');
  assert.doesNotMatch(inArticleMgrSrc, /ads-in-page-push-manager|monetag|\/sw\.js|5gvci|nap5k|uplcm/i);
  assert.match(inArticleMgrSrc, /Direct Link Sponsored Ad Card/);

  // Verify Comment Orphan Reply target fix and acyclic Firestore Rules
  const commentSectionSrc = fs.readFileSync(
    path.resolve('src/components/ArticleCommentsSection.tsx'),
    'utf8'
  );
  assert.match(
    commentSectionSrc,
    /orphanThreads\.map[\s\S]*renderCommentCard\(reply,\s*\{\s*isReply:\s*true,\s*rootParentId:\s*reply\.id\s*\}/
  );

  const rulesSrc = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
  assert.match(rulesSrc, /function hasValidParentComment\(/);
  assert.match(rulesSrc, /function hasValidOwnershipAfterForComment\(/);
  assert.doesNotMatch(rulesSrc, /function hasValidOwnershipAfterForToken\(/, 'tokens/{tokenId} must remain a pure leaf node with zero cycles');
  assert.match(rulesSrc, /function hasValidPeerDocsAfterForOwnership\(/);
  assert.match(rulesSrc, /function hasValidTokenAfterForOwnership\(/);
  assert.doesNotMatch(rulesSrc, /\$\(getAfter\(/, 'Nested getAfter substitutions must stay eliminated');
  const ownershipPeerFn = (rulesSrc.match(/function hasValidPeerDocsAfterForOwnership[\s\S]*?\n\s*\}/) || [''])[0];
  assert.doesNotMatch(ownershipPeerFn, /getAfter\(/, 'hasValidPeerDocsAfterForOwnership must remain acyclic without circular getAfter');
  assert.doesNotMatch(ownershipPeerFn, /comments\/\$\(commentId\)\)/, 'private/ownership create must not reference /comments/$(commentId) via existsAfter');
  const ownershipTokenAfterFn = (rulesSrc.match(/function hasValidTokenAfterForOwnership[\s\S]*?\n\s*\}/) || [''])[0];
  assert.doesNotMatch(ownershipTokenAfterFn, /comments\/\$\(commentId\)\)/, 'hasValidTokenAfterForOwnership must only inspect leaf /tokens/$(data.tokenHash)');
  const ownershipUpdateFn = (rulesSrc.match(/function isValidPublicOwnershipUpdate[\s\S]*?\n\s*\}/) || [''])[0];
  assert.doesNotMatch(ownershipUpdateFn, /(?:existsAfter|getAfter)\(/, 'isValidPublicOwnershipUpdate must remain 1-way acyclic without existsAfter/getAfter back to comments');
  const tokensMatchBlock = (rulesSrc.match(/match \/tokens\/\{tokenId\}[\s\S]*?\n\s*\}/) || [''])[0];
  assert.doesNotMatch(tokensMatchBlock, /(?:existsAfter|getAfter)\(/, 'tokens/{tokenId} leaf rule must have zero existsAfter/getAfter dependencies');
  assert.match(
    rulesSrc,
    /isValidCommentId\(data\.parentId\)[\s\S]*?exists\([^)]*comments\/\$\(data\.parentId\)\)[\s\S]*?hasValidParentComment\(data\)/
  );

  console.log('✓ 4. Admin UI clean 7-position layout, Monetag removal, orphan-reply fix & acyclic Firestore rules verified');
}

async function testAuditPopunderGuardMonetagDomBlockingAndLinkSafety(): Promise<void> {
  __resetGlobalAdScriptsCacheForTests();
  __resetAdsSettingsCacheForTests();
  __resetPopunderGuardAndOverlayCacheForTests();

  // 1. Inline popunder & Monetag loaders are detected and stripped while native non-Monetag banners remain intact
  const inlineJsPopunder =
    "<script>(function(s){s.dataset.zone='313598',s.src='https://quge5.com/88/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  const discontinuedVignette =
    "<script>(function(s){s.dataset.zone='12322670',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  const legitimateNativeBanner =
    '<div class="native-between-p"><div data-banner-id="native-1">Native Banner Unit</div><script src="https://cdn.example.com/native-banner.js" data-zone="888222"></script></div>';

  assert.equal(detectIntrusivePopunderAdCode(inlineJsPopunder), true);
  assert.equal(detectIntrusivePopunderAdCode(discontinuedVignette), true);
  assert.equal(detectIntrusivePopunderAdCode(legitimateNativeBanner), false);
  assert.equal(sanitizeAdCodePayload(`${inlineJsPopunder}\n${discontinuedVignette}`), '');
  assert.equal(sanitizeAdCodePayload(`${discontinuedVignette}\n${legitimateNativeBanner}`), legitimateNativeBanner);

  // 2. Runtime JSDOM test: MutationObserver DOM guard blocks dynamically injected quge5/Monetag nodes,
  // native banners between paragraphs work independently, and clicking an ordinary article link does not invoke window.open.
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div><a id="article-link" href="/blog/test-story">Read Story</a></body></html>', {
    url: 'https://isezerano.online/blog/test-story'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevFetch = (globalThis as any).fetch;
  const prevCss = (globalThis as any).CSS;
  const prevMutationObserver = (globalThis as any).MutationObserver;
  const prevResizeObserver = (globalThis as any).ResizeObserver;
  const prevRAF = (globalThis as any).requestAnimationFrame;
  const prevCAF = (globalThis as any).cancelAnimationFrame;

  __resetAdsSettingsCacheForTests();
  (dom.window as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
    dom.window.setTimeout(() => cb(Date.now()), 0);
  (dom.window as any).cancelAnimationFrame = (id: number) => dom.window.clearTimeout(id);
  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).CSS = { escape: (v: string) => v };
  (globalThis as any).MutationObserver = dom.window.MutationObserver;
  (globalThis as any).ResizeObserver = undefined;
  (globalThis as any).requestAnimationFrame = (dom.window as any).requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = (dom.window as any).cancelAnimationFrame;

  const auditSettings: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    globalScripts: {
      enabled: true,
      provider: 'hilltopads',
      code: discontinuedVignette,
      mobileEnabled: true,
      desktopEnabled: true
    },
    aboveFooterAd: {
      enabled: true,
      type: 'code',
      label: 'Advertisement',
      code: discontinuedVignette
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

  let unexpectedOpenCount = 0;
  (dom.window as any).open = () => {
    unexpectedOpenCount += 1;
    return null;
  };
  (globalThis as any).localStorage = {
    getItem: (key: string) =>
      key === 'isezerano_ads_settings' ? JSON.stringify(auditSettings) : null,
    setItem: () => undefined,
    removeItem: () => undefined
  };
  (globalThis as any).fetch = async () => ({
    ok: true,
    json: async () => ({ fields: toFirestoreRestFields(auditSettings).mapValue.fields })
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
          articleId: 'audit-article-1',
          slotConfig: {
            enabled: true,
            provider: 'hilltopads',
            afterParagraph: 3,
            mobileEnabled: true,
            desktopEnabled: true,
            label: 'Advertisement',
            code: legitimateNativeBanner
          }
        }),
        React.createElement(InArticleAdSlot, {
          slotId: 'slot2',
          articleId: 'audit-article-1',
          slotConfig: {
            enabled: true,
            provider: 'other',
            providerLabel: 'Custom Native',
            afterParagraph: 7,
            mobileEnabled: true,
            desktopEnabled: true,
            label: 'Kwamamaza',
            code: '<div class="custom-between-p"><script src="https://cdn.example.com/native-banner-2.js" data-zone="888333"></script></div>'
          }
        }),
        React.createElement(AdSlot, { placement: 'above_footer' })
      )
    );

    await new Promise((r) => setTimeout(r, 140));

    // A. Discontinued Monetag Vignette never executes in DOM
    assert.equal(
      dom.window.document.querySelectorAll('script[src*="vignette.min.js"], script[data-zone="12322670"]').length,
      0,
      'Discontinued Monetag vignette script must never execute'
    );
    assert.equal(container.querySelector('[data-ad-placement="below_header"]'), null);
    assert.equal(container.querySelector('[data-ad-placement="above_footer"]'), null);

    // B. Native Banners between paragraphs both rendered and mounted their scripts independently
    assert.ok(
      container.querySelector('[data-testid="in-article-ad-slot1"] .native-between-p script[src="https://cdn.example.com/native-banner.js"]')
    );
    assert.ok(
      container.querySelector('[data-testid="in-article-ad-slot2"] .custom-between-p script[src="https://cdn.example.com/native-banner-2.js"]')
    );

    // C. Runtime MutationObserver DOM guard removes dynamically appended quge5 / Monetag nodes immediately
    const rogueScript = dom.window.document.createElement('script');
    rogueScript.src = 'https://quge5.com/88/tag.min.js';
    rogueScript.setAttribute('data-zone', '313598');
    dom.window.document.body.appendChild(rogueScript);

    const rogueMonetagScript = dom.window.document.createElement('script');
    rogueMonetagScript.src = 'https://nap5k.com/tag.min.js';
    rogueMonetagScript.setAttribute('data-zone', '12321969');
    dom.window.document.body.appendChild(rogueMonetagScript);

    const rogueIframe = dom.window.document.createElement('iframe');
    rogueIframe.src = 'https://quge5.com/pop';
    dom.window.document.body.appendChild(rogueIframe);

    await new Promise((r) => setTimeout(r, 30));

    assert.equal(
      dom.window.document.querySelectorAll('script[src*="quge5.com"], script[src*="nap5k.com"], script[data-zone="313598"], iframe[src*="quge5.com"]').length,
      0,
      'MutationObserver DOM guard must immediately strip dynamically appended popunder and Monetag nodes'
    );

    // D. Clicking an ordinary article link triggers zero window.open popups
    const linkEl = dom.window.document.getElementById('article-link') as HTMLAnchorElement;
    let defaultPrevented = false;
    linkEl.addEventListener('click', (e) => {
      defaultPrevented = e.defaultPrevented;
    });
    linkEl.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    assert.equal(unexpectedOpenCount, 0);
    assert.equal(defaultPrevented, false);
  } finally {
    root.unmount();
    await new Promise((r) => setTimeout(r, 20));
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).localStorage = prevLocalStorage;
    (globalThis as any).fetch = prevFetch;
    (globalThis as any).CSS = prevCss;
    (globalThis as any).MutationObserver = prevMutationObserver;
    (globalThis as any).ResizeObserver = prevResizeObserver;
    (globalThis as any).requestAnimationFrame = prevRAF;
    (globalThis as any).cancelAnimationFrame = prevCAF;
  }

  console.log('✓ 5. Runtime MutationObserver guard, Monetag DOM suppression, Native Banner preservation & safe article click verified');
}

function testHilltopAdsPreservedAndMonetagBlockedOnSaveReload(): void {
  const monetagInPagePushTag =
    "<script>(function(s){s.dataset.zone='9451234',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  const commentedNativeBanner =
    '<!-- Partner Native Banner (no popunder) -->\n<div class="native-slot"><script src="https://cdn.example.com/native-unit.js" async></script></div>';

  // 1. All HilltopAds official scripts pass validation cleanly; discontinued Monetag tags are rejected
  assert.equal(isSafeAdScriptUrl(HILLTOPADS_SCRIPT_SRC), true);
  assert.equal(isSafeAdScriptUrl(HILLTOPADS_HEADER_SCRIPT_SRC), true);
  assert.equal(isSafeAdScriptUrl(HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC), true);
  assert.equal(detectIntrusivePopunderAdCode(monetagInPagePushTag), true);
  assert.equal(isSafeAdScriptUrl('https://nap5k.com/tag.min.js'), false);
  assert.equal(sanitizeAdCodePayload(monetagInPagePushTag), '');

  // 2. HTML comments mentioning popunder alongside legitimate native banners must NOT false-trigger warning
  assert.equal(detectIntrusivePopunderAdCode(commentedNativeBanner), false);
  const commentBannerAnalysis = analyzeAdCodeSnippet(commentedNativeBanner);
  assert.equal(commentBannerAnalysis.hasIntrusivePopunder, false);
  assert.deepEqual(commentBannerAnalysis.warnings, []);
  assert.equal(
    normalizeInArticleAdSlotConfig('slot1', { enabled: true, code: commentedNativeBanner }).code,
    commentedNativeBanner
  );
  assert.equal(
    normalizeStandardAdSlotConfig({ enabled: true, type: 'code', code: monetagInPagePushTag }).code,
    ''
  );
  assert.equal(
    normalizeGlobalAdScriptConfig({ enabled: true, code: monetagInPagePushTag }).code,
    ''
  );

  // 3. Confirmed quge5.com + zone 313598 continues to be blocked cleanly
  const confirmedPopunder =
    "<script>(function(s){s.dataset.zone='313598',s.src='https://quge5.com/88/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  assert.equal(detectIntrusivePopunderAdCode(confirmedPopunder), true);
  assert.equal(sanitizeAdCodePayload(confirmedPopunder), '');

  // 4. AdsManager normalizes aboveFooterAd cleanly when loading and saving state without Monetag helpers
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  assert.match(adsMgrSrc, /normalizeStandardAdSlotConfig\(/);
  assert.doesNotMatch(adsMgrSrc, /normalizeVignetteAdConfig|normalizeInPagePushAdConfig/);
  const stdNormalizeCalls = adsMgrSrc.match(/normalizeStandardAdSlotConfig\(/g) || [];
  assert.ok(
    stdNormalizeCalls.length >= 2,
    'AdsManager load & save paths must normalize aboveFooterAd cleanly'
  );

  console.log('✓ 6. HilltopAds scripts preserved, Monetag tags stripped & AdsManager save/reload normalization verified');
}

async function run(): Promise<void> {
  testPopunderAndMonetagDetectionAndSanitization();
  await testRuntimePopunderBlockingAndScriptIsolation();
  testHomepageInFeedDefaultsPlannerAndRendering();
  testAdminUiAllSevenPositionsAndCommentRulesAudit();
  await testAuditPopunderGuardMonetagDomBlockingAndLinkSafety();
  testHilltopAdsPreservedAndMonetagBlockedOnSaveReload();
  console.log('\nALL HOMEPAGE IN-FEED ADS, POPUNDER & MONETAG REMOVAL TESTS PASSED!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('HOMEPAGE IN-FEED & FIXES SUITE FAILED:', err);
    process.exit(1);
  });
