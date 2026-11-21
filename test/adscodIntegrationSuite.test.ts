import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ADSCOD_DWELL_ENDPOINT,
  ADSCOD_PLACEMENTS,
  ADSCOD_WORKER_URL,
  AdscodAd
} from '../src/types/adscod';
import {
  buildAdscodServeUrl,
  createAdscodDwellTracker,
  fetchAdscodAd,
  getAdscodDiagnosticsSnapshot,
  isSafeAdscodMediaUrl,
  isValidAdscodClickUrl,
  normalizeAdscodAdPayload
} from '../src/services/adscodService';
import { AdscodBannerAd } from '../src/components/AdscodBannerAd';
import { AdscodInlineAd } from '../src/components/AdscodInlineAd';
import { AdSlot } from '../src/components/AdSlot';

function testPlacementConstantsAndUrlBuilder(): void {
  assert.equal(ADSCOD_WORKER_URL, 'https://isezerano-adscod.twizerefelix90.workers.dev');
  assert.equal(ADSCOD_DWELL_ENDPOINT, 'https://api.adscod.com/api/v1/dwell');
  assert.equal(ADSCOD_PLACEMENTS.banner.placementId, 'fa638e17-ebc6-465c-b3da-7fc78d1cde4c');
  assert.equal(ADSCOD_PLACEMENTS.inline.placementId, '59311ecd-3e34-45e9-8e2c-4d94e01b4ee4');

  const bannerUrl = new URL(
    buildAdscodServeUrl('banner', { category: 'Education', q: 'Rwanda School News', device: 'MOBILE' })
  );
  assert.equal(bannerUrl.origin, ADSCOD_WORKER_URL);
  assert.equal(bannerUrl.searchParams.get('placement'), 'banner');
  assert.equal(bannerUrl.searchParams.get('category'), 'Education');
  assert.equal(bannerUrl.searchParams.get('device'), 'MOBILE');
  assert.equal(bannerUrl.searchParams.get('q'), 'Rwanda School News');
  assert.equal(bannerUrl.searchParams.has('apiKey'), false);

  const inlineUrl = new URL(
    buildAdscodServeUrl('inline', { category: 'All Categories', device: 'DESKTOP' })
  );
  assert.equal(inlineUrl.searchParams.get('placement'), 'inline');
  assert.equal(inlineUrl.searchParams.has('category'), false);

  console.log('✓ 1. Exact Adscod placement IDs and Worker query URL builder verified');
}

function testAdPayloadAndUrlValidation(): void {
  assert.equal(isValidAdscodClickUrl('https://api.adscod.com/click/abc.123'), true);
  assert.equal(isValidAdscodClickUrl('javascript:alert(1)'), false);
  assert.equal(isValidAdscodClickUrl('http://insecure.example.com/click'), false);
  assert.equal(isValidAdscodClickUrl(''), false);

  assert.equal(isSafeAdscodMediaUrl('https://images.adscod.com/uploads/logo.jpg'), true);
  assert.equal(isSafeAdscodMediaUrl('data:text/html,<script>alert(1)</script>'), false);

  const validNoHero = normalizeAdscodAdPayload({
    campaignId: '4da5a81b-3349-4e91-9292-4404c952dab2',
    title: 'Organic AI Business Launcher — Full Guide',
    body: 'Step by step Full Guide',
    ctaLabel: 'Buy Now',
    clickUrl: 'https://api.adscod.com/click/sample-token',
    clickToken: 'sample-token',
    brandName: 'CODEFANIC FOODS',
    brandLogoUrl: 'https://images.adscod.com/uploads/logo.jpg',
    brandVerified: true
  });
  assert.ok(validNoHero);
  assert.equal(validNoHero.clickUrl, 'https://api.adscod.com/click/sample-token');
  assert.equal(validNoHero.brandVerified, true);

  const rejectedXss = normalizeAdscodAdPayload({
    title: 'Bad Ad',
    clickUrl: 'javascript:alert(1)'
  });
  assert.equal(rejectedXss, null);

  console.log('✓ 2. Adscod payload sanitization and strict HTTPS URL validation verified');
}

async function testFetchAdscodAdFillNoFillAndErrors(): Promise<void> {
  const filledFetch = (async () =>
    new Response(
      JSON.stringify({
        success: true,
        ads: [
          {
            campaignId: 'camp-1',
            title: 'Live Partner Banner',
            body: 'Sponsored summary text',
            imageUrl: 'https://images.adscod.com/uploads/banner.jpg',
            ctaLabel: 'Explore',
            clickUrl: 'https://api.adscod.com/click/live-banner-token',
            clickToken: 'live-banner-token',
            brandName: 'Rwanda Tech',
            brandVerified: true
          }
        ]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )) as unknown as typeof fetch;

  const filledResult = await fetchAdscodAd('banner', { fetchImpl: filledFetch });
  assert.equal(filledResult.ok, true);
  assert.equal(filledResult.state, 'filled');
  assert.equal(filledResult.placementId, 'fa638e17-ebc6-465c-b3da-7fc78d1cde4c');
  assert.equal(filledResult.ad?.clickUrl, 'https://api.adscod.com/click/live-banner-token');

  const noFillFetch = (async () =>
    new Response(JSON.stringify({ success: true, ads: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })) as unknown as typeof fetch;

  const noFillResult = await fetchAdscodAd('inline', { fetchImpl: noFillFetch });
  assert.equal(noFillResult.ok, true);
  assert.equal(noFillResult.state, 'no-fill');
  assert.equal(noFillResult.ad, null);

  const forbiddenFetch = (async () =>
    new Response('Forbidden', { status: 403 })) as unknown as typeof fetch;

  const forbiddenResult = await fetchAdscodAd('inline', { fetchImpl: forbiddenFetch });
  assert.equal(forbiddenResult.ok, false);
  assert.equal(forbiddenResult.status, 403);
  assert.equal(forbiddenResult.state, 'error');
  assert.match(forbiddenResult.error || '', /403/);

  const diag = getAdscodDiagnosticsSnapshot();
  assert.equal(diag.placements.banner?.state, 'filled');
  assert.equal(diag.placements.banner?.clickUrlHost, 'api.adscod.com');
  assert.equal(diag.placements.inline?.state, 'error');
  assert.equal(diag.placements.inline?.httpStatus, 403);

  console.log('✓ 3. Worker serve fetch handling (filled, no-fill, 403 error, diagnostics) verified');
}

async function testCpmViewabilityAndDwellDeduplication(): Promise<void> {
  type IoCallback = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void;
  let ioCallback: IoCallback | null = null;
  let ioThreshold: number[] | undefined;

  const prevIo = (globalThis as any).IntersectionObserver;
  const prevDoc = (globalThis as any).document;
  const prevWin = (globalThis as any).window;

  const docListeners = new Map<string, Set<() => void>>();
  const winListeners = new Map<string, Set<() => void>>();
  let docHidden = false;

  (globalThis as any).document = {
    get hidden() {
      return docHidden;
    },
    addEventListener: (evt: string, cb: () => void) => {
      if (!docListeners.has(evt)) docListeners.set(evt, new Set());
      docListeners.get(evt)!.add(cb);
    },
    removeEventListener: (evt: string, cb: () => void) => {
      docListeners.get(evt)?.delete(cb);
    }
  };
  (globalThis as any).window = {
    location: { origin: 'https://isezerano.online', hostname: 'isezerano.online' },
    addEventListener: (evt: string, cb: () => void) => {
      if (!winListeners.has(evt)) winListeners.set(evt, new Set());
      winListeners.get(evt)!.add(cb);
    },
    removeEventListener: (evt: string, cb: () => void) => {
      winListeners.get(evt)?.delete(cb);
    }
  };
  (globalThis as any).IntersectionObserver = class MockIO {
    constructor(cb: IoCallback, opts?: { threshold?: number[] }) {
      ioCallback = cb;
      ioThreshold = opts?.threshold;
    }
    observe(): void {}
    disconnect(): void {}
  };

  const beacons: Array<{ url: string; body: { token: string; ms: number } }> = [];

  try {
    const fakeEl = {} as Element;
    const tracker = createAdscodDwellTracker(fakeEl, {
      placement: 'inline',
      clickToken: 'signed-cpm-token-123',
      sendBeaconImpl: (url, data) => {
        beacons.push({ url, body: JSON.parse(String(data)) });
        return true;
      }
    });

    assert.deepEqual(ioThreshold, [0, 0.5, 1]);

    // Below 50% intersection: must NOT accrue or fire dwell
    ioCallback!([{ isIntersecting: true, intersectionRatio: 0.25 }]);
    await new Promise((r) => setTimeout(r, 40));
    tracker.flush();
    assert.equal(beacons.length, 0);

    // At >= 50% intersection while tab is visible: must accrue & flush once
    ioCallback!([{ isIntersecting: true, intersectionRatio: 0.75 }]);
    await new Promise((r) => setTimeout(r, 70));
    ioCallback!([{ isIntersecting: false, intersectionRatio: 0 }]);
    tracker.flush();
    assert.equal(beacons.length, 1);
    assert.equal(beacons[0].url, ADSCOD_DWELL_ENDPOINT);
    assert.equal(beacons[0].body.token, 'signed-cpm-token-123');
    assert.ok(beacons[0].body.ms >= 50);

    // Calling flush again or hiding tab / disposing without new dwell -> no duplicate beacon
    tracker.flush();
    assert.equal(beacons.length, 1);

    docHidden = true;
    docListeners.get('visibilitychange')?.forEach((cb) => cb());
    tracker.dispose();
    assert.equal(beacons.length, 1);
  } finally {
    (globalThis as any).IntersectionObserver = prevIo;
    (globalThis as any).document = prevDoc;
    (globalThis as any).window = prevWin;
  }

  console.log('✓ 4. CPM IntersectionObserver (>=50%) and deduplicated dwell beacon verified');
}

async function testBannerInlineAndAdSlotCollapseBehavior(): Promise<void> {
  // No-fill collapses cleanly to empty string
  const emptyBannerHtml = renderToString(
    React.createElement(AdscodBannerAd, { overrideAd: null })
  );
  assert.equal(emptyBannerHtml, '');

  const emptyInlineHtml = renderToString(
    React.createElement(AdscodInlineAd, { overrideAd: null })
  );
  assert.equal(emptyInlineHtml, '');

  // Filled ad renders Sponsored label, verified badge, exact clickUrl verbatim, and object-contain image
  const sampleAd: AdscodAd = {
    campaignId: '4da5a81b-3349-4e91-9292-4404c952dab2',
    title: 'Organic AI Business Launcher — Full Guide',
    body: 'Step by step Full Guide',
    imageUrl: 'https://images.adscod.com/uploads/hero.jpg',
    ctaLabel: 'Buy Now',
    clickUrl: 'https://api.adscod.com/click/exact-click-token-xyz',
    clickToken: 'exact-click-token-xyz',
    brandName: 'CODEFANIC FOODS',
    brandLogoUrl: 'https://images.adscod.com/uploads/logo.jpg',
    brandVerified: true
  };

  const bannerHtml = renderToString(
    React.createElement(AdscodBannerAd, { overrideAd: sampleAd })
  );
  assert.match(bannerHtml, /data-ad-placement-id="fa638e17-ebc6-465c-b3da-7fc78d1cde4c"/);
  assert.match(bannerHtml, /href="https:\/\/api\.adscod\.com\/click\/exact-click-token-xyz"/);
  assert.match(bannerHtml, /Sponsored/);
  assert.match(bannerHtml, /CODEFANIC FOODS/);
  assert.match(bannerHtml, /object-contain/);
  assert.match(bannerHtml, /Buy Now/);

  const inlineHtml = renderToString(
    React.createElement(AdscodInlineAd, { overrideAd: sampleAd, placementContext: 'article_inline' })
  );
  assert.match(inlineHtml, /data-ad-placement-id="59311ecd-3e34-45e9-8e2c-4d94e01b4ee4"/);
  assert.match(inlineHtml, /href="https:\/\/api\.adscod\.com\/click\/exact-click-token-xyz"/);
  assert.match(inlineHtml, /Sponsored/);
  assert.match(inlineHtml, /object-contain/);

  // Unconfigured AdSlot (exact live Firestore empty-code state) must NOT emit an empty bordered AD box
  const store = new Map<string, string>();
  const prevLocalStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k)
  };
  try {
    store.set(
      'isezerano_ads_settings',
      JSON.stringify({
        masterEnabled: true,
        belowHeaderAd: { enabled: true, type: 'code', code: '', label: 'Advertisement' },
        aboveFooterAd: { enabled: true, type: 'code', code: '', label: 'Advertisement' },
        displaySettings: {
          containerWidthPercent: 40,
          maxWidthPx: 320,
          containerHeightPx: 70,
          marginY: 0,
          marginX: 0,
          paddingPx: 0
        }
      })
    );
    const belowHeaderEmptyHtml = renderToString(
      React.createElement(AdSlot, { placement: 'below_header' })
    );
    assert.doesNotMatch(belowHeaderEmptyHtml, /ad-slot-content/);
    assert.equal(belowHeaderEmptyHtml, '');

    const aboveFooterEmptyHtml = renderToString(
      React.createElement(AdSlot, { placement: 'above_footer' })
    );
    assert.equal(aboveFooterEmptyHtml, '');
  } finally {
    (globalThis as any).localStorage = prevLocalStorage;
  }

  console.log('✓ 5. AdscodBannerAd, AdscodInlineAd, and AdSlot no-fill/empty collapse verified');
}

function testSecurityAndPreservation(): void {
  const walkSrc = (dir: string): string[] => {
    let files: string[] = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) files = files.concat(walkSrc(full));
      else if (/\.(ts|tsx|html|yml)$/.test(ent.name)) files.push(full);
    }
    return files;
  };

  const clientAndConfigFiles = [
    ...walkSrc(path.resolve('src')),
    path.resolve('index.html'),
    path.resolve('.github/workflows/main.yml')
  ];

  for (const filePath of clientAndConfigFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.doesNotMatch(content, /ADSCOD_API_KEY/, `Unexpected ADSCOD_API_KEY in ${filePath}`);
    assert.doesNotMatch(content, /VITE_ADSCOD/, `Unexpected VITE_ADSCOD in ${filePath}`);
    assert.doesNotMatch(content, /adc_pub_/, `Unexpected publisher key literal in ${filePath}`);
  }

  // Confirm TopVideoAd (-5px), sitemap, and firebase.json remain intact
  const displayUtilsSrc = fs.readFileSync(path.resolve('src/utils/displaySettingsUtils.ts'), 'utf8');
  assert.match(displayUtilsSrc, /bannerHeightPx:\s*\{\s*min:\s*-5,\s*max:\s*120/);
  assert.equal(fs.existsSync(path.resolve('public/sitemap.xml')), true);
  assert.equal(fs.existsSync(path.resolve('public/robots.txt')), true);

  console.log('✓ 6. Zero client-side API key exposure & TopVideoAd/sitemap preservation verified');
}

async function runSuite(): Promise<void> {
  testPlacementConstantsAndUrlBuilder();
  testAdPayloadAndUrlValidation();
  await testFetchAdscodAdFillNoFillAndErrors();
  await testCpmViewabilityAndDwellDeduplication();
  await testBannerInlineAndAdSlotCollapseBehavior();
  testSecurityAndPreservation();
  console.log('\nALL ADSCOD INTEGRATION SUITE TESTS PASSED!');
}

runSuite().catch((err) => {
  console.error('Adscod integration suite failed:', err);
  process.exit(1);
});
