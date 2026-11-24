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
  DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS,
  DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS
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
import {
  MonetagVignetteBanner,
  __resetMonetagVignetteCacheForTests
} from '../src/components/MonetagVignetteBanner';
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

function testPopunderDetectionAndSanitization(): void {
  assert.equal(detectIntrusivePopunderAdCode(EXACT_INTRUSIVE_POPUNDER), true);
  assert.equal(
    detectIntrusivePopunderAdCode(
      `<meta name="monetag" content="verify-123" />\n${EXACT_INTRUSIVE_POPUNDER}`
    ),
    true
  );
  assert.equal(
    detectIntrusivePopunderAdCode('<meta name="monetag" content="verify-123" />'),
    false
  );
  assert.equal(
    detectIntrusivePopunderAdCode(
      '<div class="native"><script src="https://cdn.example.com/native-widget.js" data-zone="888"></script></div>'
    ),
    false
  );

  // URL validator blocks quge5.com and click-under hosts while keeping https native embeds
  assert.equal(isSafeAdScriptUrl('https://quge5.com/88/tag.min.js'), false);
  assert.equal(isSafeAdScriptUrl('https://cdn.example.com/native-widget.js'), true);

  // Strips exact popunder from mixed snippet while keeping <meta name="monetag">
  const mixed = `<meta name="monetag" content="abcd9876" />\n${EXACT_INTRUSIVE_POPUNDER}`;
  const strippedMixed = stripIntrusivePopunderAdCode(mixed);
  assert.equal(strippedMixed.hadIntrusivePopunder, true);
  assert.equal(strippedMixed.removedCount, 1);
  assert.equal(strippedMixed.cleanedCode, '<meta name="monetag" content="abcd9876" />');
  assert.doesNotMatch(strippedMixed.cleanedCode, /quge5\.com|313598/);

  // Stripping pure popunder yields empty string and non-renderable code
  assert.equal(sanitizeAdCodePayload(EXACT_INTRUSIVE_POPUNDER), '');
  assert.equal(hasRenderableAdCode(EXACT_INTRUSIVE_POPUNDER), false);

  // analyzeAdCodeSnippet flags popunder warning clearly
  const popunderAnalysis = analyzeAdCodeSnippet(EXACT_INTRUSIVE_POPUNDER);
  assert.equal(popunderAnalysis.hasIntrusivePopunder, true);
  assert.ok(popunderAnalysis.warnings.some((w) => /Popunder|OnClick/i.test(w)));

  // All slot normalizers strip the popunder automatically
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
  assert.equal(cleanGlobal.code, '<meta name="monetag" content="abcd9876" />');

  // Root /sw.js remains preserved
  assert.equal(fs.existsSync(path.resolve('public/sw.js')), true);
  assert.match(fs.readFileSync(path.resolve('public/sw.js'), 'utf8'), /"zoneId":\s*12145119/);

  console.log('✓ 1. Intrusive Monetag OnClick/Popunder removal verified across all normalizers & root sw.js preserved');
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

  const contaminatedSettings: AdsSettings = {
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
      provider: 'monetag',
      code: `<meta name="monetag" content="verify-keep-me" />${EXACT_INTRUSIVE_POPUNDER}`,
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

  __resetAdsSettingsCacheForTests();
  __resetMonetagVignetteCacheForTests();
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
        React.createElement(MonetagVignetteBanner, { currentPage: 'home' }),
        React.createElement(GlobalAdScripts, { currentPage: 'home' }),
        React.createElement(AdSlot, { placement: 'below_header' as any }),
        React.createElement(AdSlot, { placement: 'above_footer' }),
        React.createElement(InArticleAdSlot, {
          slotId: 'slot1',
          articleId: 'post-pop-test',
          slotConfig: {
            enabled: true,
            provider: 'monetag',
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
            provider: 'monetag',
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

    // Zero quge5.com / 313598 scripts anywhere in head or body
    const allScripts = Array.from(dom.window.document.querySelectorAll('script'));
    assert.equal(
      allScripts.some(
        (s) =>
          /quge5\.com/i.test(s.getAttribute('src') || '') ||
          s.getAttribute('data-zone') === '313598'
      ),
      false,
      'Intrusive popunder script must NEVER be mounted in DOM'
    );

    // Verification meta tag is STILL mounted cleanly in <head>
    const metaTag = dom.window.document.head.querySelector('meta[name="monetag"]');
    assert.equal(metaTag?.getAttribute('content'), 'verify-keep-me');

    // Removed below_header collapses cleanly & In-Article pure popunder collapses cleanly
    assert.equal(container.querySelector('[data-ad-placement="below_header"]'), null);
    assert.equal(container.querySelector('[data-testid="in-article-ad-slot1"]'), null);

    // Vignette & In-Page Push mount cleanly without Popunders
    assert.ok(dom.window.document.querySelector('script[data-isezerano-vignette="true"][data-zone="12322670"]'));
    assert.ok(dom.window.document.querySelector('script[data-isezerano-global-ad="monetag-in-page-push"][data-zone="12321969"]'));

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

  console.log('✓ 2. Runtime popunder blocking across GlobalAdScripts, AdSlot, InArticleAdSlot & HomepageInFeedAdSlot verified');
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
        provider: 'monetag',
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
        provider: 'monetag',
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

function testAdminUiAllEightPositionsAndCommentRulesAudit(): void {
  const adminFeedHtml = renderToString(
    React.createElement(HomepageInFeedAdManagerSection, {
      homepageInFeedAds: DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS,
      isSaving: false,
      onUpdateSlot: () => undefined,
      onSaveSlot: () => undefined
    })
  );
  assert.match(adminFeedHtml, /HOMEPAGE IN-FEED ADS/);
  assert.match(adminFeedHtml, /6\. Homepage In-Feed Ad Slot 1/);
  assert.match(adminFeedHtml, /7\. Homepage In-Feed Ad Slot 2/);
  assert.match(adminFeedHtml, /8\. Homepage In-Feed Ad Slot 3/);
  assert.match(adminFeedHtml, /Kwamamaza/);
  assert.match(adminFeedHtml, /Advertisement/);

  // Verify AdsManager imports HomepageInFeedAdManagerSection, Vignette/In-Page Push controls & preserves Top Video Ad + Global Scripts without Below Website Header
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  assert.doesNotMatch(adsMgrSrc, /1\. Below Website Header/);
  assert.match(adsMgrSrc, /1\. Monetag Vignette Banner/);
  assert.match(adsMgrSrc, /2\. Above Website Footer/);
  assert.match(adsMgrSrc, /<InArticleAdManagerSection/);
  assert.match(adsMgrSrc, /<HomepageInFeedAdManagerSection/);
  assert.match(adsMgrSrc, /normalizeHomepageInFeedAdsSettings/);
  assert.match(adsMgrSrc, /normalizeVignetteAdConfig/);
  assert.match(adsMgrSrc, /normalizeInPagePushAdConfig/);
  assert.match(adsMgrSrc, /aboveHeaderVideoAd/);

  const inArticleMgrSrc = fs.readFileSync(path.resolve('src/components/InArticleAdManagerSection.tsx'), 'utf8');
  assert.match(inArticleMgrSrc, /ads-in-page-push-manager/);
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

  console.log('✓ 4. Admin UI restructured ad positions, Direct Link / Push controls, orphan-reply fix & acyclic Firestore rules verified');
}

async function testAuditPopunderGuardVignetteDeduplicationAndLinkSafety(): Promise<void> {
  __resetGlobalAdScriptsCacheForTests();
  __resetAdsSettingsCacheForTests();
  __resetPopunderGuardAndOverlayCacheForTests();

  // 1. Inline dataset.zone='313598' loader & unclosed quge5 tags are stripped while Vignette (zone 12322670) & In-Page Push remain intact
  const inlineJsPopunder =
    "<script>(function(s){s.dataset.zone='313598',s.src='https://quge5.com/88/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  const legitimateVignette =
    "<script>(function(s){s.dataset.zone='12322670',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  const legitimateInPagePush =
    '<script src="https://cdn.example.com/in-page-push.js" data-zone="555111" async></script>';
  const legitimateNativeBanner =
    '<div class="native-between-p"><div data-banner-id="native-1">Native Banner Unit</div><script src="https://cdn.example.com/native-banner.js" data-zone="888222"></script></div>';

  assert.equal(detectIntrusivePopunderAdCode(inlineJsPopunder), true);
  assert.equal(detectIntrusivePopunderAdCode(legitimateVignette), false);
  assert.equal(detectIntrusivePopunderAdCode(legitimateInPagePush), false);
  assert.equal(detectIntrusivePopunderAdCode(legitimateNativeBanner), false);
  assert.equal(sanitizeAdCodePayload(`${inlineJsPopunder}\n${legitimateVignette}`), legitimateVignette);

  // 2. Runtime JSDOM test: MutationObserver DOM guard blocks dynamically injected quge5/313598 nodes,
  // duplicate Vignette in vignetteAd + globalScripts + above_footer executes ONLY ONCE, native banners between paragraphs work independently,
  // and clicking an ordinary article link does not invoke window.open.
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
  __resetMonetagVignetteCacheForTests();
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

  // Duplicate Vignette (zone 12322670) across vignetteAd + globalScripts + aboveFooterAd executes ONLY ONCE,
  // removed below_header never renders, native banners between paragraphs work independently, and ordinary clicks trigger zero popups.
  const auditSettings: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    vignetteAd: {
      enabled: true,
      zoneId: '12322670',
      scriptUrl: 'https://n6wxm.com/vignette.min.js',
      mobileEnabled: true,
      desktopEnabled: true
    },
    globalScripts: {
      enabled: true,
      provider: 'monetag',
      code: legitimateVignette,
      mobileEnabled: true,
      desktopEnabled: true
    },
    aboveFooterAd: {
      enabled: true,
      type: 'code',
      label: 'Advertisement',
      code: legitimateVignette
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
        React.createElement(MonetagVignetteBanner, { currentPage: 'blog' }),
        React.createElement(GlobalAdScripts, { currentPage: 'blog' }),
        React.createElement(AdSlot, { placement: 'below_header' as any }),
        React.createElement(InArticleAdSlot, {
          slotId: 'slot1',
          articleId: 'audit-article-1',
          slotConfig: {
            enabled: true,
            provider: 'monetag',
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

    // A. Duplicate Vignette (zone 12322670) across MonetagVignetteBanner + globalScripts + above_footer executed ONLY ONCE
    const vignetteExecScripts = Array.from(
      dom.window.document.querySelectorAll('script[src*="vignette.min.js"], script[data-zone="12322670"]')
    );
    assert.equal(
      vignetteExecScripts.length,
      1,
      'Duplicate Vignette overlay script across MonetagVignetteBanner, globalScripts & above_footer must execute only once'
    );
    assert.equal(container.querySelector('[data-ad-placement="below_header"]'), null);

    // B. Native Banners between paragraphs both rendered and mounted their scripts independently
    assert.ok(
      container.querySelector('[data-testid="in-article-ad-slot1"] .native-between-p script[src="https://cdn.example.com/native-banner.js"]')
    );
    assert.ok(
      container.querySelector('[data-testid="in-article-ad-slot2"] .custom-between-p script[src="https://cdn.example.com/native-banner-2.js"]')
    );

    // C. Runtime MutationObserver DOM guard removes a dynamically appended quge5 / 313598 script immediately
    const rogueScript = dom.window.document.createElement('script');
    rogueScript.src = 'https://quge5.com/88/tag.min.js';
    rogueScript.setAttribute('data-zone', '313598');
    dom.window.document.body.appendChild(rogueScript);

    const rogueIframe = dom.window.document.createElement('iframe');
    rogueIframe.src = 'https://quge5.com/pop';
    dom.window.document.body.appendChild(rogueIframe);

    await new Promise((r) => setTimeout(r, 30));

    assert.equal(
      dom.window.document.querySelectorAll('script[src*="quge5.com"], script[data-zone="313598"], iframe[src*="quge5.com"]').length,
      0,
      'MutationObserver DOM guard must immediately strip dynamically appended quge5.com / zone 313598 nodes'
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

  console.log('✓ 5. Inline loader blocking, runtime MutationObserver guard, Vignette deduplication, Native Banner preservation & safe article click verified');
}

function testLegitimateMonetagInPagePushAndAdminStateSaveCleanup(): void {
  const legitimateInPagePushTag =
    "<script>(function(s){s.dataset.zone='9451234',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  const commentedNativeBanner =
    '<!-- Monetag Native Banner (no popunder) -->\n<div class="native-slot"><script src="https://cdn.example.com/native-unit.js" async></script></div>';

  // 1. Legitimate Monetag In-Page Push (nap5k.com/tag.min.js) must NOT be flagged or stripped
  assert.equal(detectIntrusivePopunderAdCode(legitimateInPagePushTag), false);
  assert.equal(isSafeAdScriptUrl('https://nap5k.com/tag.min.js'), true);
  const inPageAnalysis = analyzeAdCodeSnippet(legitimateInPagePushTag);
  assert.equal(inPageAnalysis.hasIntrusivePopunder, false);
  assert.deepEqual(inPageAnalysis.warnings, []);
  assert.equal(sanitizeAdCodePayload(legitimateInPagePushTag), legitimateInPagePushTag);

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
    normalizeStandardAdSlotConfig({ enabled: true, type: 'code', code: legitimateInPagePushTag }).code,
    legitimateInPagePushTag
  );
  assert.equal(
    normalizeGlobalAdScriptConfig({ enabled: true, code: legitimateInPagePushTag }).code,
    legitimateInPagePushTag
  );

  // 3. Confirmed quge5.com + zone 313598 continues to be blocked cleanly
  const confirmedPopunder =
    "<script>(function(s){s.dataset.zone='313598',s.src='https://quge5.com/88/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))</script>";
  assert.equal(detectIntrusivePopunderAdCode(confirmedPopunder), true);
  assert.equal(sanitizeAdCodePayload(confirmedPopunder), '');

  // 4. AdsManager normalizes vignetteAd, inPagePushAd and aboveFooterAd cleanly when loading and saving state
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  assert.match(adsMgrSrc, /normalizeStandardAdSlotConfig\(/);
  assert.match(adsMgrSrc, /normalizeVignetteAdConfig\(/);
  assert.match(adsMgrSrc, /normalizeInPagePushAdConfig\(/);
  const stdNormalizeCalls = adsMgrSrc.match(/normalizeStandardAdSlotConfig\(/g) || [];
  assert.ok(
    stdNormalizeCalls.length >= 2,
    'AdsManager load & save paths must normalize aboveFooterAd, vignetteAd & inPagePushAd cleanly'
  );

  console.log('✓ 6. Monetag In-Page Push (nap5k.com) allowed, comment false-positives resolved & AdsManager save/reload normalization verified');
}

async function run(): Promise<void> {
  testPopunderDetectionAndSanitization();
  await testRuntimePopunderBlockingAndScriptIsolation();
  testHomepageInFeedDefaultsPlannerAndRendering();
  testAdminUiAllEightPositionsAndCommentRulesAudit();
  await testAuditPopunderGuardVignetteDeduplicationAndLinkSafety();
  testLegitimateMonetagInPagePushAndAdminStateSaveCleanup();
  console.log('\nALL HOMEPAGE IN-FEED ADS, POPUNDER REMOVAL & COMMENT REPAIR TESTS PASSED!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('HOMEPAGE IN-FEED & FIXES SUITE FAILED:', err);
    process.exit(1);
  });
