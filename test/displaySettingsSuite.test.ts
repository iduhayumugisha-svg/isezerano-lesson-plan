import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ADS_DISPLAY_LIMITS,
  DEFAULT_ADS_DISPLAY_SETTINGS,
  DEFAULT_MINI_SHOP_DISPLAY_SETTINGS,
  MINI_SHOP_DISPLAY_LIMITS,
  clampDisplayNumber,
  getMiniShopVisibleSlice,
  normalizeAdsDisplaySettings,
  normalizeMiniShopDisplaySettings,
  resolveMiniShopColumnsForWidth
} from '../src/utils/displaySettingsUtils';
import { MiniShopBar } from '../src/components/MiniShopBar';
import { MiniShopProduct } from '../src/types/platform';

function testAdsDisplayNormalization(): void {
  assert.deepEqual(normalizeAdsDisplaySettings(undefined), DEFAULT_ADS_DISPLAY_SETTINGS);
  assert.deepEqual(normalizeAdsDisplaySettings(null), DEFAULT_ADS_DISPLAY_SETTINGS);

  const clampedHigh = normalizeAdsDisplaySettings({
    containerWidthPercent: 250,
    maxWidthPx: 5000,
    containerHeightPx: 2000,
    marginY: 999,
    marginX: 500,
    paddingPx: 300
  });
  assert.equal(clampedHigh.containerWidthPercent, ADS_DISPLAY_LIMITS.containerWidthPercent.max);
  assert.equal(clampedHigh.maxWidthPx, ADS_DISPLAY_LIMITS.maxWidthPx.max);
  assert.equal(clampedHigh.containerHeightPx, ADS_DISPLAY_LIMITS.containerHeightPx.max);
  assert.equal(clampedHigh.marginY, ADS_DISPLAY_LIMITS.marginY.max);
  assert.equal(clampedHigh.marginX, ADS_DISPLAY_LIMITS.marginX.max);
  assert.equal(clampedHigh.paddingPx, ADS_DISPLAY_LIMITS.paddingPx.max);

  const clampedLow = normalizeAdsDisplaySettings({
    containerWidthPercent: 5,
    maxWidthPx: 100,
    containerHeightPx: 10,
    marginY: -20,
    marginX: -10,
    paddingPx: -5
  });
  assert.equal(clampedLow.containerWidthPercent, ADS_DISPLAY_LIMITS.containerWidthPercent.min);
  assert.equal(clampedLow.maxWidthPx, ADS_DISPLAY_LIMITS.maxWidthPx.min);
  assert.equal(clampedLow.containerHeightPx, ADS_DISPLAY_LIMITS.containerHeightPx.min);
  assert.equal(clampedLow.marginY, ADS_DISPLAY_LIMITS.marginY.min);
  assert.equal(clampedLow.marginX, ADS_DISPLAY_LIMITS.marginX.min);
  assert.equal(clampedLow.paddingPx, ADS_DISPLAY_LIMITS.paddingPx.min);

  const custom = normalizeAdsDisplaySettings({
    containerWidthPercent: 85,
    maxWidthPx: 960,
    containerHeightPx: 160,
    marginY: 16,
    marginX: 12,
    paddingPx: 18
  });
  assert.deepEqual(custom, {
    containerWidthPercent: 85,
    maxWidthPx: 960,
    containerHeightPx: 160,
    marginY: 16,
    marginX: 12,
    paddingPx: 18
  });

  assert.equal(clampDisplayNumber('not-a-number', 42, 0, 100), 42);
  console.log('✓ 1. AdsDisplaySettings clamping and normalization verified');
}

function testMiniShopDisplayNormalizationAndColumns(): void {
  assert.deepEqual(
    normalizeMiniShopDisplaySettings(undefined),
    DEFAULT_MINI_SHOP_DISPLAY_SETTINGS
  );

  const clampedHigh = normalizeMiniShopDisplaySettings({
    sectionWidthPercent: 150,
    sectionMaxWidthPx: 3000,
    sectionMinHeightPx: 900,
    cardWidthPx: 4000,
    cardHeightPx: 800,
    imageSizePx: 500,
    cardGapPx: 200,
    desktopColumns: 12,
    tabletColumns: 9,
    mobileColumns: 6
  });
  assert.equal(clampedHigh.sectionWidthPercent, MINI_SHOP_DISPLAY_LIMITS.sectionWidthPercent.max);
  assert.equal(clampedHigh.sectionMaxWidthPx, MINI_SHOP_DISPLAY_LIMITS.sectionMaxWidthPx.max);
  assert.equal(clampedHigh.sectionMinHeightPx, MINI_SHOP_DISPLAY_LIMITS.sectionMinHeightPx.max);
  assert.equal(clampedHigh.cardWidthPx, MINI_SHOP_DISPLAY_LIMITS.cardWidthPx.max);
  assert.equal(clampedHigh.cardHeightPx, MINI_SHOP_DISPLAY_LIMITS.cardHeightPx.max);
  assert.equal(clampedHigh.imageSizePx, MINI_SHOP_DISPLAY_LIMITS.imageSizePx.max);
  assert.equal(clampedHigh.cardGapPx, MINI_SHOP_DISPLAY_LIMITS.cardGapPx.max);
  assert.equal(clampedHigh.desktopColumns, MINI_SHOP_DISPLAY_LIMITS.desktopColumns.max);
  assert.equal(clampedHigh.tabletColumns, MINI_SHOP_DISPLAY_LIMITS.tabletColumns.max);
  assert.equal(clampedHigh.mobileColumns, MINI_SHOP_DISPLAY_LIMITS.mobileColumns.max);

  const responsiveConfig = normalizeMiniShopDisplaySettings({
    desktopColumns: 3,
    tabletColumns: 2,
    mobileColumns: 1
  });
  assert.equal(resolveMiniShopColumnsForWidth(responsiveConfig, 320), 1);
  assert.equal(resolveMiniShopColumnsForWidth(responsiveConfig, 639), 1);
  assert.equal(resolveMiniShopColumnsForWidth(responsiveConfig, 640), 2);
  assert.equal(resolveMiniShopColumnsForWidth(responsiveConfig, 1023), 2);
  assert.equal(resolveMiniShopColumnsForWidth(responsiveConfig, 1024), 3);
  assert.equal(resolveMiniShopColumnsForWidth(responsiveConfig, 1440), 3);

  const sampleProducts: MiniShopProduct[] = [1, 2, 3, 4].map((n) => ({
    id: `p${n}`,
    title: `Item ${n}`,
    description: `Desc ${n}`,
    price: `${n}0,000 RWF`,
    imageUrl: `https://example.com/${n}.jpg`,
    whatsappNumber: '+250788000001',
    phoneNumber: '0788000001',
    active: true,
    displayOrder: n - 1,
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z'
  }));

  assert.deepEqual(
    getMiniShopVisibleSlice(sampleProducts, 0, 1).map((p) => p.id),
    ['p1']
  );
  assert.deepEqual(
    getMiniShopVisibleSlice(sampleProducts, 2, 3).map((p) => p.id),
    ['p3', 'p4', 'p1']
  );
  assert.deepEqual(
    getMiniShopVisibleSlice(sampleProducts, 1, 6).map((p) => p.id),
    ['p1', 'p2', 'p3', 'p4']
  );
  assert.deepEqual(getMiniShopVisibleSlice([], 0, 2), []);

  console.log('✓ 2. MiniShopDisplaySettings clamping, responsive columns & wrap slicing verified');
}

function testMiniShopBarSsrWithDisplaySettings(): void {
  const sampleProducts: MiniShopProduct[] = [1, 2, 3].map((n) => ({
    id: `prod-${n}`,
    title: `Laptop Model ${n}`,
    description: `High performance notebook ${n}`,
    price: `${n}50,000 RWF`,
    imageUrl: `https://example.com/laptop-${n}.png`,
    whatsappNumber: '+250788000001',
    phoneNumber: '0788000001',
    active: true,
    displayOrder: n - 1,
    createdAt: '2026-11-18T00:00:00.000Z',
    updatedAt: '2026-11-18T00:00:00.000Z'
  }));

  const singleCardHtml = renderToString(
    React.createElement(MiniShopBar, {
      products: sampleProducts,
      visible: true,
      displaySettings: {
        ...DEFAULT_MINI_SHOP_DISPLAY_SETTINGS,
        sectionWidthPercent: 80,
        sectionMaxWidthPx: 920,
        sectionMinHeightPx: 96,
        cardWidthPx: 760,
        cardHeightPx: 82,
        imageSizePx: 54
      }
    })
  );
  assert.match(singleCardHtml, /data-testid="mini-shop-bar"[^>]*bg-transparent pointer-events-none/);
  assert.match(singleCardHtml, /data-testid="mini-shop-container"[^>]*width:80%;max-width:920px;min-height:96px/);
  assert.match(singleCardHtml, /data-testid="mini-shop-card-single"[^>]*max-width:760px;min-height:82px/);
  assert.match(singleCardHtml, /data-testid="mini-shop-image-prod-1"[^>]*width:54px;height:54px/);
  assert.match(singleCardHtml, /Laptop Model 1/);
  assert.match(singleCardHtml, /Komeza/);
  assert.match(singleCardHtml, /WhatsApp/);
  assert.match(singleCardHtml, /Call/);
  assert.match(singleCardHtml, /object-contain/);

  const multiColHtml = renderToString(
    React.createElement(MiniShopBar, {
      products: sampleProducts,
      visible: true,
      displaySettings: {
        ...DEFAULT_MINI_SHOP_DISPLAY_SETTINGS,
        desktopColumns: 3,
        imageSizePx: 64,
        cardGapPx: 16,
        sectionMaxWidthPx: 1400,
        cardWidthPx: 420,
        cardHeightPx: 90
      }
    })
  );
  assert.match(multiColHtml, /Laptop Model 1/);
  assert.match(multiColHtml, /Laptop Model 2/);
  assert.match(multiColHtml, /Laptop Model 3/);
  assert.match(multiColHtml, /grid-template-columns:repeat\(3, minmax\(0, 1fr\)\);gap:16px/);
  assert.match(multiColHtml, /data-testid="mini-shop-card-prod-1"[^>]*max-width:420px;min-height:90px/);
  assert.match(multiColHtml, /width:64px;height:64px/);

  console.log('✓ 3. MiniShopBar Header container, single-card & multi-column display sizing verified');
}

async function testAdSlotBelowHeaderAndAboveFooterSizing(): Promise<void> {
  const store = new Map<string, string>();
  const prevLocalStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k)
  };

  try {
    const customSettings = {
      masterEnabled: true,
      displaySettings: {
        containerWidthPercent: 78,
        maxWidthPx: 860,
        containerHeightPx: 170,
        marginY: 20,
        marginX: 24,
        paddingPx: 16
      },
      belowHeaderAd: {
        enabled: true,
        type: 'banner',
        imageUrl: 'https://example.com/header-ad.png',
        linkUrl: 'https://example.com/sponsor',
        altText: 'Header Ad',
        label: 'Partner Announcement'
      },
      aboveFooterAd: {
        enabled: true,
        type: 'code',
        code: '<iframe width="728" height="90" src="https://example.com/ad.html"></iframe>',
        label: 'Sponsored Content'
      },
      updatedAt: '2026-11-20T00:00:00.000Z',
      updatedBy: 'admin'
    };
    store.set('isezerano_ads_settings', JSON.stringify(customSettings));

    const { AdSlot } = await import('../src/components/AdSlot');

    const belowHeaderHtml = renderToString(
      React.createElement(AdSlot, { placement: 'below_header' })
    );
    assert.match(belowHeaderHtml, /data-ad-placement="below_header"[^>]*margin-top:20px;margin-bottom:20px/);
    assert.match(
      belowHeaderHtml,
      /data-testid="ad-slot-sized-below_header"[^>]*width:78%;max-width:860px;padding-left:clamp\(0px, 24px, 12vw\);padding-right:clamp\(0px, 24px, 12vw\)/
    );
    assert.match(
      belowHeaderHtml,
      /data-testid="ad-slot-card-below_header"[^>]*padding:16px;min-height:170px/
    );
    assert.match(belowHeaderHtml, /object-contain/);
    assert.match(belowHeaderHtml, /max-height:110px/);

    const aboveFooterHtml = renderToString(
      React.createElement(AdSlot, { placement: 'above_footer' })
    );
    assert.match(aboveFooterHtml, /data-ad-placement="above_footer"[^>]*margin-top:20px;margin-bottom:20px/);
    assert.match(aboveFooterHtml, /data-testid="ad-slot-sized-above_footer"[^>]*width:78%;max-width:860px/);
    assert.match(aboveFooterHtml, /data-testid="ad-slot-card-above_footer"[^>]*padding:16px;min-height:170px/);
    assert.match(aboveFooterHtml, /ad-slot-wrapper/);
    assert.match(aboveFooterHtml, /ad-slot-content/);
  } finally {
    (globalThis as any).localStorage = prevLocalStorage;
  }

  console.log('✓ 4. AdSlot below_header (banner) and above_footer (code) display sizing verified');
}

function testAdminControlsPersistenceAndSafetyWiring(): void {
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  const adSlotSrc = fs.readFileSync(path.resolve('src/components/AdSlot.tsx'), 'utf8');
  const miniShopMgrSrc = fs.readFileSync(path.resolve('src/components/AdminMiniShopManager.tsx'), 'utf8');
  const miniShopBarSrc = fs.readFileSync(path.resolve('src/components/MiniShopBar.tsx'), 'utf8');
  const designSvcSrc = fs.readFileSync(path.resolve('src/services/websiteDesignService.ts'), 'utf8');
  const siteSettingsSvcSrc = fs.readFileSync(path.resolve('src/services/siteSettingsService.ts'), 'utf8');
  const designCtxSrc = fs.readFileSync(path.resolve('src/context/WebsiteDesignContext.tsx'), 'utf8');
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

  // AdsManager controls & preview
  assert.match(adsMgrSrc, /Advertisement Display Settings/);
  assert.match(adsMgrSrc, /DisplayNumericControl/);
  assert.match(adsMgrSrc, /Reset to Default/);
  assert.match(adsMgrSrc, /Save Changes/);
  assert.match(adsMgrSrc, /Live Preview Before Saving/);
  assert.doesNotMatch(adsMgrSrc, /window\.(alert|confirm|open)/);

  // AdSlot applies display settings without distorting image aspect ratio & scales embeds on display changes
  assert.match(adSlotSrc, /normalizeAdsDisplaySettings/);
  assert.match(adSlotSrc, /object-contain/);
  assert.match(adSlotSrc, /display\.containerHeightPx/);
  assert.match(adSlotSrc, /heightScale/);

  // AdminMiniShopManager controls & preview
  assert.match(miniShopMgrSrc, /Mini Shop Display Settings/);
  assert.match(miniShopMgrSrc, /DisplayNumericControl/);
  assert.match(miniShopMgrSrc, /saveMiniShopDisplaySettings/);
  assert.match(miniShopMgrSrc, /Reset to Default/);
  assert.match(miniShopMgrSrc, /Save Changes/);
  assert.match(miniShopMgrSrc, /Live Preview Before Saving/);

  // MiniShopBar + App wiring (pinned Header container)
  assert.match(appSrc, /displaySettings=\{miniShopDisplay\}/);
  assert.match(miniShopBarSrc, /normalizeMiniShopDisplaySettings/);
  assert.match(miniShopBarSrc, /resolveMiniShopColumnsForWidth/);
  assert.match(miniShopBarSrc, /getMiniShopVisibleSlice/);
  assert.match(miniShopBarSrc, /data-testid="mini-shop-container"/);

  // Authoritative Firestore persistence & no-store fresh fetch across devices
  assert.match(designSvcSrc, /mask\.fieldPaths=miniShopDisplay/);
  assert.match(designSvcSrc, /normalizeMiniShopDisplaySettings/);
  assert.match(designSvcSrc, /saveMiniShopDisplayToFirestore/);
  assert.match(designSvcSrc, /cache:\s*'no-store'/);
  assert.match(siteSettingsSvcSrc, /cache:\s*'no-store'/);
  assert.match(siteSettingsSvcSrc, /normalizeAdsDisplaySettings/);
  assert.match(siteSettingsSvcSrc, /isAuthorizedAdminEmail/);
  assert.match(designCtxSrc, /saveMiniShopDisplayToFirestore/);

  console.log('✓ 5. Admin controls, public REST mask, Firestore merge persistence & safety wiring verified');
}

async function runSuite(): Promise<void> {
  testAdsDisplayNormalization();
  testMiniShopDisplayNormalizationAndColumns();
  testMiniShopBarSsrWithDisplaySettings();
  await testAdSlotBelowHeaderAndAboveFooterSizing();
  testAdminControlsPersistenceAndSafetyWiring();
  console.log('\nALL DISPLAY SIZE CONTROLS SUITE TESTS PASSED!');
}

runSuite().catch((err) => {
  console.error('Display size controls test suite failed:', err);
  process.exit(1);
});
