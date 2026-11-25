import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import {
  HILLTOPADS_BANNER_HEIGHT,
  HILLTOPADS_BANNER_WIDTH,
  HILLTOPADS_SCRIPT_SRC,
  HilltopAdsArticleBanner
} from '../src/components/HilltopAdsArticleBanner';
import {
  HILLTOPADS_HEADER_BANNER_HEIGHT,
  HILLTOPADS_HEADER_BANNER_WIDTH,
  HILLTOPADS_HEADER_SCRIPT_SRC,
  HilltopAdsHeaderBanner
} from '../src/components/HilltopAdsHeaderBanner';
import {
  DEFAULT_ADS_SETTINGS,
  HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC
} from '../src/types/platform';
import {
  __resetGlobalAdScriptsCacheForTests,
  GlobalAdScripts
} from '../src/components/GlobalAdScripts';
import { __resetAdsSettingsCacheForTests } from '../src/services/siteSettingsService';
import {
  detectIntrusivePopunderAdCode,
  isSafeAdScriptUrl,
  normalizeFloatingVideoAdConfig
} from '../src/utils/inArticleAdUtils';

const EXPECTED_SRC =
  '//conventionalresponse.com/b/XRV/s.dcGklE0QY/WocU/BeamJ9pu/ZNUPljkRPSTFcX2LNFTacv4yNvTdM/tdNTzQYC1yNrzqgi1CNTwV';
const EXPECTED_HEADER_SRC =
  '//conventionalresponse.com/b.XvV/sVdfGel-0AYtWjcO/DeymY9mu-ZIU/lAkoPGTpch2/N/Tecd4iNHj/kztpNVz/Yj1PN/zsgR3FMLwS';
const EXPECTED_VIDEO_SLIDER_SRC =
  '//conventionalresponse.com/bAXuVDs/d.GjlE0NYvWHcM/pe/m_9OuoZNUQlTkfP/Tocs2jNKTXcy4tObT/MPtQN-zEYB1kNBzvgz5DNBwP';

function flushTicks(ms = 25): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function testArticleOnlyPlacementAndMonetagRemoval(): void {
  const blogViewSrc = fs.readFileSync(path.resolve('src/views/BlogView.tsx'), 'utf8');
  const homeViewSrc = fs.readFileSync(path.resolve('src/views/HomeView.tsx'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const firebaseJson = fs.readFileSync(path.resolve('firebase.json'), 'utf8');
  const adsManagerSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  const globalAdScriptsSrc = fs.readFileSync(
    path.resolve('src/components/GlobalAdScripts.tsx'),
    'utf8'
  );

  // Rendered strictly inside BlogView full article view, only once, between action bar and comments
  const matches = blogViewSrc.match(/<HilltopAdsArticleBanner\b/g) || [];
  assert.equal(matches.length, 1, 'BlogView must render HilltopAdsArticleBanner exactly once');

  const actionBarIdx = blogViewSrc.indexOf('<ArticleShareButton post={activePost} variant="button" />');
  const bannerIdx = blogViewSrc.indexOf('<HilltopAdsArticleBanner articleId={activePost.id} />');
  const commentsIdx = blogViewSrc.indexOf('<ArticleCommentsSection');
  const indexViewIdx = blogViewSrc.indexOf('PUBLIC BLOG INDEX VIEW');
  assert.ok(
    actionBarIdx > 0 && bannerIdx > actionBarIdx && commentsIdx > bannerIdx && bannerIdx < indexViewIdx,
    'HilltopAdsArticleBanner must appear inside full article view above comments and outside blog index'
  );

  // Must NOT be duplicated on other pages, global shell, or index.html
  for (const [label, src] of [
    ['HomeView.tsx', homeViewSrc],
    ['App.tsx', appSrc],
    ['index.html', indexHtml]
  ]) {
    assert.doesNotMatch(
      src,
      /HilltopAdsArticleBanner|conventionalresponse\.com/,
      `${label} must not duplicate or load the HilltopAds banner script`
    );
  }
  assert.doesNotMatch(
    globalAdScriptsSrc,
    /HilltopAdsArticleBanner|HilltopAdsHeaderBanner|b\/XRV\/s|b\.XvV\/sV/,
    'GlobalAdScripts.tsx must not duplicate 300x250 or 300x100 banner scripts'
  );

  // New 300x100 header banner sits strictly below WebsiteHeader and directly above <main> (above HomeView)
  const headerMatches = appSrc.match(/<HilltopAdsHeaderBanner\b/g) || [];
  assert.equal(headerMatches.length, 1, 'App.tsx must render HilltopAdsHeaderBanner exactly once');
  const websiteHeaderIdx = appSrc.indexOf('<WebsiteHeader');
  const headerBannerIdx = appSrc.indexOf('<HilltopAdsHeaderBanner currentPage={currentPage} />');
  const mainIdx = appSrc.indexOf('<main ');
  assert.ok(
    websiteHeaderIdx > 0 && headerBannerIdx > websiteHeaderIdx && mainIdx > headerBannerIdx,
    'HilltopAdsHeaderBanner must be positioned directly below WebsiteHeader and above <main>'
  );
  assert.doesNotMatch(
    blogViewSrc,
    /HilltopAdsHeaderBanner/,
    'BlogView must not duplicate HilltopAdsHeaderBanner'
  );
  assert.doesNotMatch(
    homeViewSrc,
    /HilltopAdsHeaderBanner/,
    'HomeView must not duplicate HilltopAdsHeaderBanner'
  );

  // Monetag integration permanently removed; HilltopAds domain verification file and non-Monetag slots intact
  assert.equal(fs.existsSync(path.resolve('public/sw.js')), false, 'public/sw.js must be deleted');
  assert.equal(
    fs.existsSync(path.resolve('src/components/MonetagVignetteBanner.tsx')),
    false,
    'MonetagVignetteBanner.tsx must be deleted'
  );
  assert.doesNotMatch(firebaseJson, /"\/sw\.js"/);
  assert.doesNotMatch(appSrc, /MonetagVignetteBanner|monetag/i);
  assert.doesNotMatch(adsManagerSrc, /monetag|vignette|inPagePush/i);
  assert.doesNotMatch(globalAdScriptsSrc, /monetag-in-page-push|inPagePushConfig/);
  assert.match(appSrc, /<GlobalAdScripts currentPage=\{currentPage\} \/>/);
  assert.match(appSrc, /<AdSlot placement="above_footer"/);
  assert.equal(
    fs.readFileSync(path.resolve('public/f5ed69878c42b4ed0e92.txt'), 'utf8').trim(),
    'f5ed69878c42b4ed0e92'
  );

  console.log('✓ 1. Article 300x250 & Header 300x100 placement + Monetag complete removal verified');
}

function testPopunderGuardCompatibility(): void {
  assert.equal(HILLTOPADS_SCRIPT_SRC, EXPECTED_SRC);
  assert.equal(HILLTOPADS_HEADER_SCRIPT_SRC, EXPECTED_HEADER_SRC);
  assert.equal(isSafeAdScriptUrl(HILLTOPADS_SCRIPT_SRC), true);
  assert.equal(isSafeAdScriptUrl(HILLTOPADS_HEADER_SCRIPT_SRC), true);

  const exactScriptSnippet = `<script>
(function(qmb){
var d = document,
    s = d.createElement('script'),
    l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = qmb || {};
s.src = "\\/\\/conventionalresponse.com\\/b\\/XRV\\/s.dcGklE0QY\\/WocU\\/BeamJ9pu\\/ZNUPljkRPSTFcX2LNFTacv4yNvTdM\\/tdNTzQYC1yNrzqgi1CNTwV";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>`;

  const exactHeaderScriptSnippet = `<script>
(function(iiojrj){
var d = document,
    s = d.createElement('script'),
    l = d.currentScript || d.scripts[d.scripts.length - 1];
s.settings = iiojrj || {};
s.src = "\\/\\/conventionalresponse.com\\/b.XvV\\/sVdfGel-0AYtWjcO\\/DeymY9mu-ZIU\\/lAkoPGTpch2\\/N\\/Tecd4iNHj\\/kztpNVz\\/Yj1PN\\/zsgR3FMLwS";
s.async = true;
s.referrerPolicy = 'no-referrer-when-downgrade';
l.parentNode.insertBefore(s, l);
})({})
</script>`;

  assert.equal(detectIntrusivePopunderAdCode(exactScriptSnippet), false);
  assert.equal(detectIntrusivePopunderAdCode(exactHeaderScriptSnippet), false);
  console.log('✓ 2. Exact HilltopAds URLs safety & non-popunder banner compliance verified');
}

async function testRuntimeScriptInjectionStrictModeAndResponsiveDimensions(): Promise<void> {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/blog/sample-story'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevHTMLElement = (globalThis as any).HTMLElement;
  const prevResizeObserver = (globalThis as any).ResizeObserver;

  try {
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;

    let observedWidth = 720;
    const resizeHolder: { cb: (() => void) | null } = { cb: null };
    (globalThis as any).ResizeObserver = class MockResizeObserver {
      constructor(cb: () => void) {
        resizeHolder.cb = cb;
      }
      observe(el: HTMLElement) {
        Object.defineProperty(el, 'clientWidth', {
          configurable: true,
          get: () => observedWidth
        });
      }
      disconnect() {
        resizeHolder.cb = null;
      }
    };

    const rootEl = dom.window.document.getElementById('root')!;
    const root = createRoot(rootEl);

    // Mount inside React.StrictMode to ensure zero duplicate script execution
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(HilltopAdsArticleBanner, { articleId: 'post-123' })
      )
    );

    await flushTicks(180);

    const aside = rootEl.querySelector('[data-testid="hilltopads-article-banner"]');
    assert.ok(aside, 'Banner container should render on article view');
    assert.equal(aside.getAttribute('data-ad-size'), '300x250');

    const slot = rootEl.querySelector('[data-testid="hilltopads-300x250-slot"]') as HTMLElement;
    assert.ok(slot, '300x250 inner slot should render');
    assert.equal(slot.style.width, `${HILLTOPADS_BANNER_WIDTH}px`);
    assert.equal(slot.style.height, `${HILLTOPADS_BANNER_HEIGHT}px`);
    assert.equal(slot.style.transform, '');

    const scripts = dom.window.document.querySelectorAll(
      'script[src*="conventionalresponse.com"]'
    );
    assert.equal(scripts.length, 1, 'StrictMode double-mount must inject HilltopAds script strictly once');

    const injected = scripts[0] as HTMLScriptElement & { settings?: Record<string, unknown> };
    assert.equal(injected.getAttribute('src'), EXPECTED_SRC);
    assert.equal(injected.async, true);
    assert.equal(injected.referrerPolicy, 'no-referrer-when-downgrade');
    assert.deepEqual(injected.settings, {});
    assert.equal(injected.parentElement, slot, 'Script must sit directly inside the 300x250 container');

    // Re-rendering with same articleId + viewport resize (desktop -> mobile -> ultra-narrow mobile) must NOT reload script
    observedWidth = 340; // typical mobile container width
    resizeHolder.cb?.();
    await flushTicks(20);
    assert.equal(slot.style.transform, '', '340px mobile width fits 300x250 without shrinking');

    observedWidth = 264; // 320px tiny phone after padding
    resizeHolder.cb?.();
    await flushTicks(20);
    assert.match(slot.style.transform, /scale\(0\.88\)/, 'Ultra-narrow mobile viewport must scale smoothly without overflow');

    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(HilltopAdsArticleBanner, { articleId: 'post-123' })
      )
    );
    await flushTicks(100);

    const scriptsAfterResizeAndRerender = dom.window.document.querySelectorAll(
      'script[src*="conventionalresponse.com"]'
    );
    assert.equal(
      scriptsAfterResizeAndRerender.length,
      1,
      'Re-renders and mobile resize must never re-inject or duplicate the HilltopAds script'
    );

    // Unmount cleans up DOM script cleanly when leaving article page
    root.unmount();
    await flushTicks(60);
    assert.equal(
      dom.window.document.querySelectorAll('script[src*="conventionalresponse.com"]').length,
      0
    );
  } finally {
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).HTMLElement = prevHTMLElement;
    (globalThis as any).ResizeObserver = prevResizeObserver;
  }

  console.log('✓ 3. Single-load StrictMode guard, exact attributes, desktop/mobile 300x250 sizing & cleanup verified');
}

async function testAdminPathSafetyGuard(): Promise<void> {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/admin'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevHTMLElement = (globalThis as any).HTMLElement;

  try {
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;

    const rootEl = dom.window.document.getElementById('root')!;
    const root = createRoot(rootEl);
    root.render(React.createElement(HilltopAdsArticleBanner, { articleId: 'post-admin-check' }));
    await flushTicks(100);

    assert.equal(
      dom.window.document.querySelectorAll('script[src*="conventionalresponse.com"]').length,
      0,
      'Admin route must never execute the HilltopAds banner script'
    );
    root.unmount();
    await flushTicks(60);
  } finally {
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).HTMLElement = prevHTMLElement;
  }

  console.log('✓ 4. /admin safety guard verified');
}

async function testHeaderBannerNavigationDeduplicationAndAdminHidden(): Promise<void> {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevHTMLElement = (globalThis as any).HTMLElement;
  const prevResizeObserver = (globalThis as any).ResizeObserver;

  try {
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;

    let observedWidth = 316;
    const resizeHolder: { cb: (() => void) | null } = { cb: null };
    (globalThis as any).ResizeObserver = class MockResizeObserver {
      constructor(cb: () => void) {
        resizeHolder.cb = cb;
      }
      observe(el: HTMLElement) {
        Object.defineProperty(el, 'clientWidth', {
          configurable: true,
          get: () => observedWidth
        });
      }
      disconnect() {
        resizeHolder.cb = null;
      }
    };

    const rootEl = dom.window.document.getElementById('root')!;
    const root = createRoot(rootEl);

    // Mount inside React.StrictMode on homepage
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(HilltopAdsHeaderBanner, { currentPage: 'home' })
      )
    );
    await flushTicks(180);

    const aside = rootEl.querySelector('[data-testid="hilltopads-header-banner"]');
    assert.ok(aside, 'Header 300x100 banner must render on homepage');
    assert.equal(aside.getAttribute('data-ad-size'), '300x100');

    const slot = rootEl.querySelector('[data-testid="hilltopads-300x100-slot"]') as HTMLElement;
    assert.ok(slot);
    assert.equal(slot.style.width, `${HILLTOPADS_HEADER_BANNER_WIDTH}px`);
    assert.equal(slot.style.height, `${HILLTOPADS_HEADER_BANNER_HEIGHT}px`);
    assert.equal(slot.style.transform, '');

    const initialScripts = dom.window.document.querySelectorAll(
      'script[src*="conventionalresponse.com/b.XvV/sV"]'
    );
    assert.equal(initialScripts.length, 1, 'StrictMode mount must inject 300x100 script strictly once');
    const injected = initialScripts[0] as HTMLScriptElement & { settings?: Record<string, unknown> };
    assert.equal(injected.getAttribute('src'), EXPECTED_HEADER_SRC);
    assert.equal(injected.async, true);
    assert.equal(injected.referrerPolicy, 'no-referrer-when-downgrade');
    assert.deepEqual(injected.settings, {});
    assert.equal(injected.parentElement, slot);

    // Narrow < 300px phone scales cleanly without overflow
    observedWidth = 270;
    resizeHolder.cb?.();
    await flushTicks(20);
    assert.match(slot.style.transform, /scale\(0\.9\)/);

    // Navigating across public pages must NOT duplicate or reload the script
    for (const page of ['blog', 'about', 'contact', 'home']) {
      root.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(HilltopAdsHeaderBanner, { currentPage: page })
        )
      );
      await flushTicks(80);
      assert.equal(
        dom.window.document.querySelectorAll('script[src*="conventionalresponse.com/b.XvV/sV"]').length,
        1,
        `Page navigation to ${page} must keep exact single header banner script without duplication`
      );
      assert.equal(
        dom.window.document.querySelector('script[src*="conventionalresponse.com/b.XvV/sV"]'),
        injected,
        `Navigation to ${page} must preserve existing loaded script node without re-inserting`
      );
    }

    // Switching to admin dashboard removes banner and script completely
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(HilltopAdsHeaderBanner, { currentPage: 'admin' })
      )
    );
    await flushTicks(80);
    assert.equal(rootEl.querySelector('[data-testid="hilltopads-header-banner"]'), null);
    assert.equal(
      dom.window.document.querySelectorAll('script[src*="conventionalresponse.com/b.XvV/sV"]').length,
      0
    );

    root.unmount();
    await flushTicks(60);
  } finally {
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).HTMLElement = prevHTMLElement;
    (globalThis as any).ResizeObserver = prevResizeObserver;
  }

  console.log('✓ 5. Header 300x100 banner single-load navigation, mobile scaling & /admin hide verified');
}

async function testVimeoRemovalAndMultiTagVideoSliderConfigAndUi(): Promise<void> {
  // 1. Complete removal of old Top-of-Site Vimeo Video Ad files, dependency & references
  const obsoleteFiles = [
    'src/components/TopVideoAdBanner.tsx',
    'src/components/ShopVimeoPlayer.tsx',
    'src/services/shopVideoService.ts',
    'src/components/DisplayNumericControl.tsx',
    'test/shopVimeoSuite.test.ts'
  ];
  for (const relPath of obsoleteFiles) {
    assert.equal(
      fs.existsSync(path.resolve(relPath)),
      false,
      `Obsolete file ${relPath} must be deleted`
    );
  }

  const pkgJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  assert.equal(
    pkgJson.dependencies?.['@vimeo/player'],
    undefined,
    '@vimeo/player dependency must be removed from package.json'
  );

  const filesToAudit = [
    'src/App.tsx',
    'src/components/AdsManager.tsx',
    'src/types/platform.ts',
    'src/services/siteSettingsService.ts',
    'src/utils/displaySettingsUtils.ts',
    'src/components/GlobalAdScripts.tsx'
  ];
  for (const relPath of filesToAudit) {
    const src = fs.readFileSync(path.resolve(relPath), 'utf8');
    assert.doesNotMatch(
      src,
      /TopVideoAdBanner|ShopVimeoPlayer|shopVideoService|vimeo/i,
      `${relPath} must not contain stale Vimeo or TopVideoAd references`
    );
  }

  const siteSettingsSrc = fs.readFileSync(
    path.resolve('src/services/siteSettingsService.ts'),
    'utf8'
  );
  assert.match(
    siteSettingsSrc,
    /aboveHeaderVideoAd:\s*deleteField\(\)/,
    'saveAdsSettings must safely delete obsolete aboveHeaderVideoAd field from Firestore'
  );

  // 2. MultiTag Video Slider config defaults & bundled popunder restriction
  assert.equal(
    HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC,
    EXPECTED_VIDEO_SLIDER_SRC
  );
  assert.equal(isSafeAdScriptUrl(HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC), true);
  assert.equal(
    DEFAULT_ADS_SETTINGS.floatingVideoAd?.enabled,
    false,
    'HilltopAds MultiTag Video Slider must remain disabled by default due to bundled popunder'
  );

  const normalized = normalizeFloatingVideoAdConfig({
    enabled: true,
    scriptUrl: 'https://evil.example/fake.js'
  } as any);
  assert.equal(normalized.enabled, true);
  assert.equal(normalized.provider, 'hilltopads');
  assert.equal(normalized.zoneFormat, 'multitag_video_slider');
  assert.equal(
    normalized.scriptUrl,
    EXPECTED_VIDEO_SLIDER_SRC,
    'normalizeFloatingVideoAdConfig must enforce the exact official HilltopAds script URL'
  );

  // 3. AdminDashboardView registers Ads Management tab -> AdsManager with single HilltopAds MultiTag Video Slider card
  const adminDashSrc = fs.readFileSync(path.resolve('src/views/AdminDashboardView.tsx'), 'utf8');
  assert.match(adminDashSrc, /setActiveTab\('ads'\)/);
  assert.match(adminDashSrc, /Ads Management/);
  assert.match(adminDashSrc, /Banners, Video &amp; Slots/);
  assert.match(adminDashSrc, /activeTab === 'ads' && <AdsManager \/>/);

  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  const floatingSectionMatches = adsMgrSrc.match(/data-testid="ads-floating-video-manager"/g) || [];
  assert.equal(floatingSectionMatches.length, 1, 'AdsManager must render exactly one Floating Video Advertisement section');
  assert.match(adsMgrSrc, /Floating Video Advertisement/);
  assert.match(adsMgrSrc, /HilltopAds MultiTag Video Slider/);
  assert.match(adsMgrSrc, /data-testid="ads-floating-video-enable-toggle"/);
  assert.match(adsMgrSrc, /data-testid="ads-floating-video-popunder-notice"/);
  assert.match(adsMgrSrc, /data-testid="ads-floating-video-save"/);
  assert.match(adsMgrSrc, /data-testid="ads-floating-video-status"/);
  assert.match(adsMgrSrc, /Popunder\/Popup/i);
  assert.doesNotMatch(adsMgrSrc, /disablePopunder|noPopunder/i);

  // 4. Verify Firebase payload normalization preserves default disabled state & loads saved floatingVideoAd
  const { normalizeAdsSettingsPayload } = await import('../src/services/siteSettingsService');
  const defaultLoaded = normalizeAdsSettingsPayload({});
  assert.equal(defaultLoaded.floatingVideoAd?.enabled, false);
  assert.equal(defaultLoaded.floatingVideoAd?.scriptUrl, EXPECTED_VIDEO_SLIDER_SRC);
  const enabledLoaded = normalizeAdsSettingsPayload({
    masterEnabled: true,
    floatingVideoAd: { enabled: true, provider: 'hilltopads', zoneFormat: 'multitag_video_slider', scriptUrl: EXPECTED_VIDEO_SLIDER_SRC }
  });
  assert.equal(enabledLoaded.floatingVideoAd?.enabled, true);
  assert.equal(enabledLoaded.floatingVideoAd?.provider, 'hilltopads');

  console.log('✓ 6. Complete Vimeo removal, Firestore cleanup & MultiTag Video Slider UI/config verified');
}

async function testMultiTagVideoSliderRuntimeSingleLoadAndAdminGuard(): Promise<void> {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/'
  });

  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevHTMLElement = (globalThis as any).HTMLElement;
  const prevLocalStorage = (globalThis as any).localStorage;
  const prevFetch = (globalThis as any).fetch;

  try {
    (globalThis as any).window = dom.window;
    (globalThis as any).document = dom.window.document;
    (globalThis as any).HTMLElement = dom.window.HTMLElement;
    (globalThis as any).localStorage = dom.window.localStorage;
    let seededFloatingEnabled = false;
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({
        fields: {
          masterEnabled: { booleanValue: true },
          floatingVideoAd: {
            mapValue: {
              fields: {
                enabled: { booleanValue: seededFloatingEnabled }
              }
            }
          }
        }
      })
    });

    const rootEl = dom.window.document.getElementById('root')!;
    const root = createRoot(rootEl);

    // A) Disabled by default even when masterEnabled is true -> never loads script
    __resetAdsSettingsCacheForTests(true);
    __resetGlobalAdScriptsCacheForTests();
    seededFloatingEnabled = false;
    dom.window.localStorage.setItem(
      'isezerano_ads_settings',
      JSON.stringify({
        masterEnabled: true,
        floatingVideoAd: { enabled: false }
      })
    );

    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(GlobalAdScripts, { currentPage: 'home' })
      )
    );
    await flushTicks(120);

    assert.equal(
      dom.window.document.querySelectorAll('script[src*="conventionalresponse.com/bAXuVDs/"]').length,
      0,
      'Must NOT inject MultiTag Video Slider when disabled by default'
    );

    root.unmount();
    await flushTicks(40);

    // B) Explicitly enabled -> injects strictly once with official attributes across StrictMode & navigation
    __resetAdsSettingsCacheForTests(true);
    __resetGlobalAdScriptsCacheForTests();
    seededFloatingEnabled = true;
    dom.window.localStorage.setItem(
      'isezerano_ads_settings',
      JSON.stringify({
        masterEnabled: true,
        floatingVideoAd: { enabled: true }
      })
    );

    const enabledRoot = createRoot(rootEl);
    enabledRoot.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(GlobalAdScripts, { currentPage: 'home' })
      )
    );
    await flushTicks(150);

    const scripts = dom.window.document.querySelectorAll(
      'script[src*="conventionalresponse.com/bAXuVDs/"]'
    );
    assert.equal(scripts.length, 1, 'StrictMode double-mount must inject MultiTag script once');
    const injected = scripts[0] as HTMLScriptElement & { settings?: Record<string, unknown> };
    assert.equal(injected.getAttribute('src'), EXPECTED_VIDEO_SLIDER_SRC);
    assert.equal(injected.async, true);
    assert.equal(injected.referrerPolicy, 'no-referrer-when-downgrade');
    assert.deepEqual(injected.settings, {});

    // Navigating across public pages must NOT duplicate or reload script
    for (const page of ['blog', 'about', 'contact', 'home']) {
      enabledRoot.render(
        React.createElement(
          React.StrictMode,
          null,
          React.createElement(GlobalAdScripts, { currentPage: page })
        )
      );
      await flushTicks(60);
      assert.equal(
        dom.window.document.querySelectorAll('script[src*="conventionalresponse.com/bAXuVDs/"]').length,
        1,
        `Navigation to ${page} must never duplicate MultiTag Video Slider script`
      );
    }

    // Navigating to /admin removes script cleanly
    enabledRoot.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(GlobalAdScripts, { currentPage: 'admin' })
      )
    );
    await flushTicks(60);
    assert.equal(
      dom.window.document.querySelectorAll('script[src*="conventionalresponse.com/bAXuVDs/"]').length,
      0,
      '/admin route must never retain or execute MultiTag Video Slider script'
    );

    enabledRoot.unmount();
    await flushTicks(40);
  } finally {
    __resetAdsSettingsCacheForTests(false);
    __resetGlobalAdScriptsCacheForTests();
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).HTMLElement = prevHTMLElement;
    (globalThis as any).localStorage = prevLocalStorage;
    (globalThis as any).fetch = prevFetch;
  }

  console.log('✓ 7. MultiTag Video Slider runtime default-disabled, single-load & /admin cleanup verified');
}

async function runSuite(): Promise<void> {
  testArticleOnlyPlacementAndMonetagRemoval();
  testPopunderGuardCompatibility();
  await testRuntimeScriptInjectionStrictModeAndResponsiveDimensions();
  await testAdminPathSafetyGuard();
  await testHeaderBannerNavigationDeduplicationAndAdminHidden();
  await testVimeoRemovalAndMultiTagVideoSliderConfigAndUi();
  await testMultiTagVideoSliderRuntimeSingleLoadAndAdminGuard();
  console.log('\nALL HILLTOPADS BANNER & MULTITAG VIDEO SLIDER TESTS PASSED!');
}

runSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
