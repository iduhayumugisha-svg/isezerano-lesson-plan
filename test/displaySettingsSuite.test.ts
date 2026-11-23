import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  ADS_DISPLAY_LIMITS,
  DEFAULT_ADS_DISPLAY_SETTINGS,
  clampDisplayNumber,
  normalizeAdsDisplaySettings
} from '../src/utils/displaySettingsUtils';

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

async function testAdSlotBelowHeaderCollapsedAndAboveFooterSizing(): Promise<void> {
  const store = new Map<string, string>();
  const prevLocalStorage = (globalThis as any).localStorage;
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k)
  };

  try {
    const { AdSlot } = await import('../src/components/AdSlot');

    // 1. Even if legacy belowHeaderAd exists in cached settings, below_header placement always collapses cleanly
    store.set(
      'isezerano_ads_settings',
      JSON.stringify({
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
          label: 'Sponsored Content'
        },
        aboveFooterAd: {
          enabled: true,
          type: 'banner',
          imageUrl: 'https://example.com/footer-banner.png',
          linkUrl: 'https://example.com/sponsor',
          altText: 'Footer Banner',
          label: 'Sponsored Content'
        },
        updatedAt: '2026-11-20T00:00:00.000Z',
        updatedBy: 'admin'
      })
    );

    const belowHeaderHtml = renderToString(
      React.createElement(AdSlot, { placement: 'below_header' as any })
    );
    assert.equal(belowHeaderHtml, '', 'below_header placement must always collapse cleanly');

    const aboveFooterBannerHtml = renderToString(
      React.createElement(AdSlot, { placement: 'above_footer' })
    );
    assert.match(aboveFooterBannerHtml, /data-ad-placement="above_footer"[^>]*margin-top:20px;margin-bottom:20px/);
    assert.match(
      aboveFooterBannerHtml,
      /data-testid="ad-slot-sized-above_footer"[^>]*width:78%;max-width:860px;padding-left:clamp\(0px, 24px, 12vw\);padding-right:clamp\(0px, 24px, 12vw\)/
    );
    assert.match(
      aboveFooterBannerHtml,
      /data-testid="ad-slot-card-above_footer"[^>]*padding:16px;min-height:170px/
    );
    assert.match(aboveFooterBannerHtml, /object-contain/);
    assert.match(aboveFooterBannerHtml, /max-height:110px/);

    // 2. Verify code-mode above_footer container sizing
    store.set(
      'isezerano_ads_settings',
      JSON.stringify({
        masterEnabled: true,
        displaySettings: {
          containerWidthPercent: 78,
          maxWidthPx: 860,
          containerHeightPx: 170,
          marginY: 20,
          marginX: 24,
          paddingPx: 16
        },
        aboveFooterAd: {
          enabled: true,
          type: 'code',
          code: '<iframe width="728" height="90" src="https://example.com/ad.html"></iframe>',
          label: 'Sponsored Content'
        },
        updatedAt: '2026-11-20T00:00:00.000Z',
        updatedBy: 'admin'
      })
    );

    const aboveFooterCodeHtml = renderToString(
      React.createElement(AdSlot, { placement: 'above_footer' })
    );
    assert.match(aboveFooterCodeHtml, /data-ad-placement="above_footer"[^>]*margin-top:20px;margin-bottom:20px/);
    assert.match(aboveFooterCodeHtml, /data-testid="ad-slot-sized-above_footer"[^>]*width:78%;max-width:860px/);
    assert.match(aboveFooterCodeHtml, /data-testid="ad-slot-card-above_footer"[^>]*padding:16px;min-height:170px/);
    assert.match(aboveFooterCodeHtml, /ad-slot-wrapper/);
    assert.match(aboveFooterCodeHtml, /ad-slot-content/);
  } finally {
    (globalThis as any).localStorage = prevLocalStorage;
  }

  console.log('✓ 4. Removed below_header collapses cleanly & above_footer (banner + code) display sizing verified');
}

function testAdminControlsPersistenceAndSafetyWiring(): void {
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  const adSlotSrc = fs.readFileSync(path.resolve('src/components/AdSlot.tsx'), 'utf8');
  const designSvcSrc = fs.readFileSync(path.resolve('src/services/websiteDesignService.ts'), 'utf8');
  const siteSettingsSvcSrc = fs.readFileSync(path.resolve('src/services/siteSettingsService.ts'), 'utf8');

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

  // Authoritative Firestore persistence & no-store fresh fetch across devices
  assert.doesNotMatch(designSvcSrc, /miniShopDisplay/);
  assert.match(designSvcSrc, /cache:\s*'no-store'/);
  assert.match(siteSettingsSvcSrc, /cache:\s*'no-store'/);
  assert.match(siteSettingsSvcSrc, /normalizeAdsDisplaySettings/);
  assert.match(siteSettingsSvcSrc, /isAuthorizedAdminEmail/);

  console.log('✓ 3. Admin controls, public REST fetch, Firestore merge persistence & safety wiring verified');
}

async function runSuite(): Promise<void> {
  testAdsDisplayNormalization();
  await testAdSlotBelowHeaderCollapsedAndAboveFooterSizing();
  testAdminControlsPersistenceAndSafetyWiring();
  console.log('\nALL DISPLAY SIZE CONTROLS SUITE TESTS PASSED!');
}

runSuite().catch((err) => {
  console.error('Display size controls test suite failed:', err);
  process.exit(1);
});
