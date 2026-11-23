import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  buildVimeoPlayerEmbedUrl,
  createTopVideoAdConfigFromUrl,
  normalizeTopVideoAdConfig,
  parseVimeoVideoUrl
} from '../src/services/shopVideoService';
import { ShopVimeoPlayer } from '../src/components/ShopVimeoPlayer';
import { TopVideoAdBanner } from '../src/components/TopVideoAdBanner';
import { DEFAULT_WEBSITE_DESIGN } from '../src/types/websiteDesign';
import { DEFAULT_ADS_SETTINGS } from '../src/types/platform';
import {
  DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS,
  TOP_VIDEO_AD_DISPLAY_LIMITS,
  normalizeTopVideoAdDisplaySettings,
  resolveTopVideoBannerHeaderSpacing
} from '../src/utils/displaySettingsUtils';

function testVimeoUrlValidationAndExtraction(): void {
  // Standard Vimeo link requested in spec
  const basic = parseVimeoVideoUrl('https://vimeo.com/1248666228');
  assert.equal(basic.valid, true);
  assert.equal(basic.videoId, '1248666228');
  assert.equal(basic.canonicalUrl, 'https://vimeo.com/1248666228');
  assert.equal(basic.playerEmbedUrl, 'https://player.vimeo.com/video/1248666228');

  // Vimeo link with www, trailing slash, or bare domain
  const bare = parseVimeoVideoUrl('vimeo.com/1248666228/');
  assert.equal(bare.valid, true);
  assert.equal(bare.videoId, '1248666228');

  // Unlisted/private hash formats
  const unlistedPath = parseVimeoVideoUrl('https://vimeo.com/1248666228/abc987def');
  assert.equal(unlistedPath.valid, true);
  assert.equal(unlistedPath.videoId, '1248666228');
  assert.equal(unlistedPath.hash, 'abc987def');
  assert.equal(
    unlistedPath.playerEmbedUrl,
    'https://player.vimeo.com/video/1248666228?h=abc987def'
  );

  const playerUrl = parseVimeoVideoUrl('https://player.vimeo.com/video/1248666228?h=xyz123');
  assert.equal(playerUrl.valid, true);
  assert.equal(playerUrl.videoId, '1248666228');
  assert.equal(playerUrl.hash, 'xyz123');
  assert.equal(playerUrl.playerEmbedUrl, 'https://player.vimeo.com/video/1248666228?h=xyz123');

  // Channel / manage / group URLs
  const channel = parseVimeoVideoUrl('https://vimeo.com/channels/staffpicks/1248666228');
  assert.equal(channel.valid, true);
  assert.equal(channel.videoId, '1248666228');

  const manage = parseVimeoVideoUrl('https://vimeo.com/manage/videos/1248666228');
  assert.equal(manage.valid, true);
  assert.equal(manage.videoId, '1248666228');

  // Invalid inputs rejected cleanly
  assert.equal(parseVimeoVideoUrl('').valid, false);
  assert.equal(parseVimeoVideoUrl('https://youtube.com/watch?v=123456').valid, false);
  assert.equal(parseVimeoVideoUrl('https://vimeo.com/channels/staffpicks').valid, false);
  assert.equal(parseVimeoVideoUrl('javascript:alert(1)').valid, false);
  assert.equal(parseVimeoVideoUrl('not a url').valid, false);

  // Top-of-site video advertisement config creation & normalization
  const topAdBuilt = createTopVideoAdConfigFromUrl({
    url: 'https://vimeo.com/1248666228',
    enabled: true,
    title: '  Sponsor Campaign  ',
    label: 'Sponsored Video'
  });
  assert.equal(topAdBuilt.success, true);
  assert.ok(topAdBuilt.videoAd);
  assert.equal(topAdBuilt.videoAd.enabled, true);
  assert.equal(topAdBuilt.videoAd.videoId, '1248666228');
  assert.equal(topAdBuilt.videoAd.vimeoUrl, 'https://vimeo.com/1248666228');
  assert.equal(topAdBuilt.videoAd.playerEmbedUrl, 'https://player.vimeo.com/video/1248666228');
  assert.equal(topAdBuilt.videoAd.title, 'Sponsor Campaign');

  assert.equal(createTopVideoAdConfigFromUrl({ url: 'https://youtube.com/watch?v=1' }).success, false);
  assert.equal(normalizeTopVideoAdConfig(null).enabled, false);
  assert.equal(normalizeTopVideoAdConfig({ enabled: true, vimeoUrl: 'javascript:alert(1)' }).enabled, false);
  assert.equal(DEFAULT_ADS_SETTINGS.aboveHeaderVideoAd?.enabled, false);

  // Top video ad display settings clamping (-5..120 for bannerHeightPx), aspect ratio locking, and persistence
  assert.equal(TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.min, -5);
  assert.equal(TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.max, 120);

  const defaultSizes = normalizeTopVideoAdDisplaySettings(null);
  assert.deepEqual(defaultSizes, DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS);

  const clampedSizes = normalizeTopVideoAdDisplaySettings({
    videoWidthPx: 50,
    videoHeightPx: 9999,
    bannerWidthPx: 9999,
    bannerHeightPx: -20,
    preserveAspectRatio: true
  });
  assert.equal(clampedSizes.videoWidthPx, TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.min);
  assert.equal(clampedSizes.videoHeightPx, Math.round((TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.min * 9) / 16));
  assert.equal(clampedSizes.bannerWidthPx, TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.max);
  assert.equal(clampedSizes.bannerHeightPx, -5);

  const minusFiveNormalized = normalizeTopVideoAdDisplaySettings({ bannerHeightPx: -5 });
  const zeroNormalized = normalizeTopVideoAdDisplaySettings({ bannerHeightPx: 0 });
  const tenNormalized = normalizeTopVideoAdDisplaySettings({ bannerHeightPx: 10 });
  assert.equal(minusFiveNormalized.bannerHeightPx, -5);
  assert.equal(zeroNormalized.bannerHeightPx, 0);
  assert.equal(tenNormalized.bannerHeightPx, 10);

  // Smart header spacing strictly shrinks across 24px -> 10px -> 0px -> -5px with non-negative CSS min-height
  const totalOverhead = (h: number) => {
    const s = resolveTopVideoBannerHeaderSpacing(h);
    assert.ok(s.headerMinHeightPx >= 0, 'headerMinHeightPx must never be negative CSS height');
    return (
      s.sectionPaddingTopPx +
      s.sectionPaddingBottomPx +
      s.wrapperPaddingTopPx +
      s.wrapperPaddingBottomPx +
      s.wrapperGapPx +
      s.headerMinHeightPx
    );
  };
  assert.ok(totalOverhead(24) > totalOverhead(10), '24px must occupy more overhead than 10px');
  assert.ok(totalOverhead(10) > totalOverhead(0), '10px must occupy more overhead than 0px');
  assert.ok(totalOverhead(0) > totalOverhead(-5), '0px must occupy more overhead than -5px');
  assert.equal(resolveTopVideoBannerHeaderSpacing(-5).compactTier, 'ultra');

  const unlockedCustom = normalizeTopVideoAdDisplaySettings({
    videoWidthPx: 500,
    videoHeightPx: 210,
    bannerWidthPx: 840,
    bannerHeightPx: 56,
    preserveAspectRatio: false
  });
  assert.equal(unlockedCustom.videoWidthPx, 500);
  assert.equal(unlockedCustom.videoHeightPx, 210);
  assert.equal(unlockedCustom.bannerWidthPx, 840);
  assert.equal(unlockedCustom.bannerHeightPx, 56);
  assert.equal(unlockedCustom.preserveAspectRatio, false);

  const builtWithSizes = createTopVideoAdConfigFromUrl({
    url: 'https://vimeo.com/1248666228',
    enabled: true,
    displaySettings: unlockedCustom
  });
  assert.equal(builtWithSizes.success, true);
  assert.deepEqual(builtWithSizes.videoAd?.displaySettings, unlockedCustom);

  console.log('✓ 1. Vimeo URL validation, video ID extraction & Top-of-Site Ad config creation verified');
}

function testNormalizationAndPlayerRendering(): void {
  const normalizedAd = normalizeTopVideoAdConfig({
    enabled: true,
    vimeoUrl: 'https://vimeo.com/1248666228/abc123',
    title: '  Top Video Ad Campaign  ',
    label: 'Sponsored Video'
  });
  assert.equal(normalizedAd.enabled, true);
  assert.equal(normalizedAd.videoId, '1248666228');
  assert.equal(normalizedAd.playerEmbedUrl, 'https://player.vimeo.com/video/1248666228?h=abc123');
  assert.equal(
    buildVimeoPlayerEmbedUrl(normalizedAd),
    'https://player.vimeo.com/video/1248666228?h=abc123'
  );

  // SSR render of ShopVimeoPlayer guarantees zero layout shift aspect-video stage & full SDK controls
  const html = renderToString(React.createElement(ShopVimeoPlayer, { video: normalizedAd }));
  assert.match(html, /data-testid="shop-vimeo-player"/);
  assert.match(html, /aspect-video/);
  assert.match(html, /data-testid="shop-vimeo-play-pause"/);
  assert.match(html, /data-testid="shop-vimeo-mute-toggle"/);
  assert.match(html, /data-testid="shop-vimeo-replay"/);
  assert.match(html, /data-testid="shop-vimeo-speed-0\.5"/);
  assert.match(html, /data-testid="shop-vimeo-speed-1"/);
  assert.match(html, /data-testid="shop-vimeo-speed-1\.5"/);
  assert.match(html, /data-testid="shop-vimeo-speed-2"/);

  // SSR render of compact TopVideoAdBanner player omits min-h-[180px] so narrow 16:9 stays proportional while keeping all controls
  const compactHtml = renderToString(
    React.createElement(ShopVimeoPlayer, { video: normalizedAd, compact: true })
  );
  assert.match(compactHtml, /aspect-video/);
  assert.doesNotMatch(compactHtml, /min-h-\[180px\]/);
  assert.match(compactHtml, /data-testid="shop-vimeo-play-pause"/);
  assert.match(compactHtml, /data-testid="shop-vimeo-mute-toggle"/);
  assert.match(compactHtml, /data-testid="shop-vimeo-replay"/);
  assert.match(compactHtml, /data-testid="shop-vimeo-speed-2"/);

  // TopVideoAdBanner renders nothing when disabled or on /admin, and renders compact centered banner when enabled on public pages
  const disabledTopHtml = renderToString(
    React.createElement(TopVideoAdBanner, {
      currentPage: 'home',
      overrideVideoAd: {
        enabled: false,
        vimeoUrl: 'https://vimeo.com/1248666228',
        videoId: '1248666228',
        playerEmbedUrl: 'https://player.vimeo.com/video/1248666228',
        title: 'Hidden'
      }
    })
  );
  assert.equal(disabledTopHtml, '');

  const adminTopHtml = renderToString(
    React.createElement(TopVideoAdBanner, {
      currentPage: 'admin',
      overrideVideoAd: {
        enabled: true,
        vimeoUrl: 'https://vimeo.com/1248666228',
        videoId: '1248666228',
        playerEmbedUrl: 'https://player.vimeo.com/video/1248666228',
        title: 'Should hide on admin'
      }
    })
  );
  assert.equal(adminTopHtml, '');

  const enabledTopHtml = renderToString(
    React.createElement(TopVideoAdBanner, {
      currentPage: 'blog',
      overrideVideoAd: {
        enabled: true,
        vimeoUrl: 'https://vimeo.com/1248666228',
        videoId: '1248666228',
        playerEmbedUrl: 'https://player.vimeo.com/video/1248666228',
        title: 'Top Banner Ad',
        label: 'Sponsored Video',
        displaySettings: {
          videoWidthPx: 480,
          videoHeightPx: 270,
          bannerWidthPx: 820,
          bannerHeightPx: 44,
          preserveAspectRatio: true
        }
      }
    })
  );
  assert.match(enabledTopHtml, /data-testid="top-video-ad-banner"/);
  assert.match(enabledTopHtml, /data-testid="top-video-ad-wrapper"/);
  assert.match(enabledTopHtml, /data-testid="top-video-ad-header"/);
  assert.match(enabledTopHtml, /data-testid="top-video-ad-container"/);
  assert.match(enabledTopHtml, /max-width:820px/);
  assert.match(enabledTopHtml, /min-height:44px/);
  assert.match(enabledTopHtml, /max-width:480px/);
  assert.match(enabledTopHtml, /Sponsored Video/);
  assert.match(enabledTopHtml, /Top Banner Ad/);
  assert.match(enabledTopHtml, /data-testid="top-video-ad-collapse-toggle"/);

  // Custom unlocked height injects --top-ad-video-height and removes forced aspect-video
  const unlockedTopHtml = renderToString(
    React.createElement(TopVideoAdBanner, {
      currentPage: 'home',
      overrideVideoAd: {
        enabled: true,
        vimeoUrl: 'https://vimeo.com/1248666228',
        videoId: '1248666228',
        playerEmbedUrl: 'https://player.vimeo.com/video/1248666228',
        title: 'Custom Height',
        label: 'AD',
        displaySettings: {
          videoWidthPx: 460,
          videoHeightPx: 190,
          bannerWidthPx: 760,
          bannerHeightPx: 40,
          preserveAspectRatio: false
        }
      }
    })
  );
  assert.match(unlockedTopHtml, /max-width:760px/);
  assert.match(unlockedTopHtml, /min-height:40px/);
  assert.match(unlockedTopHtml, /max-width:460px/);
  assert.match(unlockedTopHtml, /--top-ad-video-height:190px/);

  // Negative & zero banner heights render non-negative min-height:0px while collapsing vertical padding cleanly
  for (const testHeight of [24, 10, 0, -5]) {
    const html = renderToString(
      React.createElement(TopVideoAdBanner, {
        currentPage: 'home',
        overrideVideoAd: {
          enabled: true,
          vimeoUrl: 'https://vimeo.com/1248666228',
          videoId: '1248666228',
          playerEmbedUrl: 'https://player.vimeo.com/video/1248666228',
          title: `Height ${testHeight}`,
          label: 'AD',
          displaySettings: {
            videoWidthPx: 330,
            videoHeightPx: 186,
            bannerWidthPx: 672,
            bannerHeightPx: testHeight,
            preserveAspectRatio: true
          }
        }
      })
    );
    assert.doesNotMatch(html, /min-height:-/, `Must never emit negative CSS min-height at ${testHeight}px`);
    if (testHeight < 0) {
      assert.match(html, /min-height:0px/);
      assert.match(html, /gap:0px/);
    } else {
      assert.match(html, new RegExp(`min-height:${testHeight}px`));
    }
  }

  const topBannerFileSrc = fs.readFileSync(path.resolve('src/components/TopVideoAdBanner.tsx'), 'utf8');
  assert.match(topBannerFileSrc, /compact=\{true\}/);
  assert.doesNotMatch(topBannerFileSrc, /max-w-2xl/);

  const appFileSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.match(appFileSrc, /data-testid="top-header-sticky-group"/);
  assert.match(appFileSrc, /sticky top-0 z-40 w-full/);

  const playerSrc = fs.readFileSync(path.resolve('src/components/ShopVimeoPlayer.tsx'), 'utf8');
  assert.match(playerSrc, /import Player from '@vimeo\/player'/);
  assert.match(playerSrc, /muted:\s*true/);
  assert.match(playerSrc, /autoplay:\s*autoPlay/);
  assert.match(playerSrc, /player\.setPlaybackRate/);

  assert.equal('shopVideo' in DEFAULT_WEBSITE_DESIGN, false);
  assert.equal('miniShopDisplay' in DEFAULT_WEBSITE_DESIGN, false);

  console.log('✓ 2. Top Video Ad normalization, SSR rendering, and @vimeo/player controls verified');
}

function testNoVimeoApiTokensUploadsAndAdPreservation(): void {
  // 1. Server Vimeo upload API & VIMEO_ACCESS_TOKEN must be completely removed
  assert.equal(fs.existsSync(path.resolve('server/vimeoApi.ts')), false);

  const serverSrc = fs.readFileSync(path.resolve('server.ts'), 'utf8');
  assert.doesNotMatch(serverSrc, /vimeoApi|mountVimeoApi|VIMEO_ACCESS_TOKEN/i);

  const envExample = fs.readFileSync(path.resolve('.env.example'), 'utf8');
  assert.doesNotMatch(envExample, /VIMEO_ACCESS_TOKEN/i);

  // 2. Client files must not reference VIMEO_ACCESS_TOKEN, tus uploads, or /api/vimeo/*
  for (const file of [
    'src/services/shopVideoService.ts',
    'src/components/ShopVimeoPlayer.tsx',
    'src/components/TopVideoAdBanner.tsx',
    'src/components/AdsManager.tsx'
  ]) {
    const content = fs.readFileSync(path.resolve(file), 'utf8');
    assert.doesNotMatch(
      content,
      /VIMEO_ACCESS_TOKEN|\/api\/vimeo|create-upload|tus-resumable|upload-offset|upload ticket/i,
      `Unexpected Vimeo API token/upload reference in ${file}`
    );
  }

  // 3. AdsManager uses "Vimeo Video URL" input and update/enable/disable/remove controls
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  assert.doesNotMatch(adsMgrSrc, /window\.(alert|confirm|open)/);
  assert.match(adsMgrSrc, /ads-top-video-manager/);
  assert.match(adsMgrSrc, /ads-top-video-url-input/);
  assert.match(adsMgrSrc, /ads-top-video-enable-toggle/);
  assert.match(adsMgrSrc, /ads-top-video-save-btn/);
  assert.match(adsMgrSrc, /ads-top-video-remove-btn/);
  assert.match(adsMgrSrc, /ads-top-video-preview/);
  assert.match(adsMgrSrc, /ads-top-video-size-controls/);
  assert.match(adsMgrSrc, /ads-top-video-width-px/);
  assert.match(adsMgrSrc, /ads-top-video-height-px/);
  assert.match(adsMgrSrc, /ads-top-video-banner-width-px/);
  assert.match(adsMgrSrc, /ads-top-video-banner-height-px/);
  assert.match(adsMgrSrc, /ads-top-video-aspect-toggle/);
  assert.match(adsMgrSrc, /ads-top-video-reset-sizes/);
  // Dedicated Monetag Vignette Banner, Above Website Footer & displaySettings remain intact (below_header removed)
  assert.match(adsMgrSrc, /1\. Monetag Vignette Banner/);
  assert.match(adsMgrSrc, /2\. Above Website Footer/);
  assert.match(adsMgrSrc, /Advertisement Display Settings/);

  // 4. Verify AdSlot.tsx is 100% untouched (zero Vimeo references)
  const adSlotSrc = fs.readFileSync(path.resolve('src/components/AdSlot.tsx'), 'utf8');
  assert.doesNotMatch(adSlotSrc, /vimeo|ShopVideo|ShopView|TopVideoAd/i);

  // 5. Verify App.tsx places TopVideoAdBanner ABOVE WebsiteHeader, includes MonetagVignetteBanner, removes below_header & MinShop, and preserves above_footer
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.doesNotMatch(appSrc, /MiniShopBar|ShopView|mini_shop_products|mini-shop-spacer/);
  assert.match(appSrc, /<MonetagVignetteBanner currentPage=\{currentPage\} \/>/);
  assert.match(appSrc, /<TopVideoAdBanner currentPage=\{currentPage\} \/>/);
  assert.doesNotMatch(appSrc, /<AdSlot placement="below_header"/);
  assert.match(appSrc, /<AdSlot placement="above_footer"/);
  const topVideoPos = appSrc.indexOf('<TopVideoAdBanner');
  const headerPos = appSrc.indexOf('<WebsiteHeader');
  const mainPos = appSrc.indexOf('<main ');
  const aboveFooterPos = appSrc.indexOf('<AdSlot placement="above_footer"');
  assert.ok(
    topVideoPos > 0 &&
      headerPos > topVideoPos &&
      mainPos > headerPos &&
      aboveFooterPos > mainPos,
    'TopVideoAdBanner must sit above WebsiteHeader without below_header or MinShop clutter while preserving above_footer AdSlot'
  );

  // 6. Ensure @vimeo/player is NOT statically imported in App, TopVideoAdBanner, AdsManager, HomeView, or WebsiteHeader
  const topBannerSrc = fs.readFileSync(path.resolve('src/components/TopVideoAdBanner.tsx'), 'utf8');
  assert.match(topBannerSrc, /lazy\(\(\) =>\s*import\('\.\/ShopVimeoPlayer'\)/);
  assert.match(adsMgrSrc, /lazy\(\(\) =>\s*import\('\.\/ShopVimeoPlayer'\)/);

  for (const eagerFile of [
    'src/App.tsx',
    'src/components/TopVideoAdBanner.tsx',
    'src/components/AdsManager.tsx',
    'src/views/HomeView.tsx',
    'src/components/WebsiteHeader.tsx'
  ]) {
    const content = fs.readFileSync(path.resolve(eagerFile), 'utf8');
    assert.doesNotMatch(
      content,
      /from\s+['"]@vimeo\/player['"]/,
      `@vimeo/player must NOT be eagerly imported in ${eagerFile}`
    );
  }

  console.log('✓ 3. Site-wide above-Header Vimeo ad, lazy loading, Admin controls & AdSlot preservation verified');
}

async function main(): Promise<void> {
  testVimeoUrlValidationAndExtraction();
  testNormalizationAndPlayerRendering();
  testNoVimeoApiTokensUploadsAndAdPreservation();
  console.log('\nALL SHOP & SITE-WIDE VIMEO VIDEO TESTS PASSED!');
}

main().catch((err) => {
  console.error('SHOP VIMEO SUITE FAILURE:', err);
  process.exit(1);
});
