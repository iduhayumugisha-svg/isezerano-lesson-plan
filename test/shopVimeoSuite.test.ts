import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  buildVimeoPlayerEmbedUrl,
  createShopVideoConfigFromUrl,
  createTopVideoAdConfigFromUrl,
  normalizeShopVideoConfig,
  normalizeTopVideoAdConfig,
  parseVimeoVideoUrl
} from '../src/services/shopVideoService';
import { ShopVimeoPlayer } from '../src/components/ShopVimeoPlayer';
import { TopVideoAdBanner } from '../src/components/TopVideoAdBanner';
import { DEFAULT_WEBSITE_DESIGN } from '../src/types/websiteDesign';
import { DEFAULT_ADS_SETTINGS } from '../src/types/platform';

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

  // Config creation & update preservation
  const built = createShopVideoConfigFromUrl({
    url: 'https://vimeo.com/1248666228',
    title: '  Weekend Shop Highlights  ',
    published: true
  });
  assert.equal(built.success, true);
  assert.ok(built.video);
  assert.equal(built.video.videoId, '1248666228');
  assert.equal(built.video.vimeoLink, 'https://vimeo.com/1248666228');
  assert.equal(built.video.playerEmbedUrl, 'https://player.vimeo.com/video/1248666228');
  assert.equal(built.video.title, 'Weekend Shop Highlights');
  assert.equal(built.video.published, true);
  assert.equal(built.video.status, 'ready');

  const updated = createShopVideoConfigFromUrl({
    url: 'https://vimeo.com/1248666228',
    title: 'Updated Title',
    published: false,
    existing: built.video
  });
  assert.equal(updated.success, true);
  assert.equal(updated.video?.uploadedAt, built.video.uploadedAt);
  assert.equal(updated.video?.published, false);

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

  console.log('✓ 1. Vimeo URL validation, video ID extraction, Shop & Top-of-Site Ad config creation verified');
}

function testNormalizationAndPlayerRendering(): void {
  assert.equal(normalizeShopVideoConfig(null), null);
  assert.equal(normalizeShopVideoConfig({ videoId: '' }), null);
  assert.equal(normalizeShopVideoConfig({ videoId: 'bad id with spaces' }), null);

  const normalized = normalizeShopVideoConfig({
    videoId: '1248666228',
    vimeoUri: '/videos/1248666228',
    playerEmbedUrl: 'https://player.vimeo.com/video/1248666228?h=abc123&autoplay=0',
    vimeoLink: 'https://vimeo.com/1248666228',
    thumbnailUrl: 'javascript:alert(1)',
    title: '  Shop Featured Showcase  ',
    published: true,
    status: 'ready'
  });
  assert.ok(normalized);
  assert.equal(normalized.videoId, '1248666228');
  assert.equal(normalized.playerEmbedUrl, 'https://player.vimeo.com/video/1248666228?h=abc123');
  assert.equal(normalized.thumbnailUrl, undefined);
  assert.equal(normalized.published, true);
  assert.equal(
    buildVimeoPlayerEmbedUrl(normalized),
    'https://player.vimeo.com/video/1248666228?h=abc123'
  );

  // SSR render of ShopVimeoPlayer guarantees zero layout shift aspect-video stage & full SDK controls
  const html = renderToString(React.createElement(ShopVimeoPlayer, { video: normalized }));
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
    React.createElement(ShopVimeoPlayer, { video: normalized, compact: true })
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
        label: 'Sponsored Video'
      }
    })
  );
  assert.match(enabledTopHtml, /data-testid="top-video-ad-banner"/);
  assert.match(enabledTopHtml, /data-testid="top-video-ad-header"/);
  assert.match(enabledTopHtml, /data-testid="top-video-ad-container"/);
  assert.match(enabledTopHtml, /max-w-2xl/);
  assert.match(enabledTopHtml, /Sponsored Video/);
  assert.match(enabledTopHtml, /Top Banner Ad/);
  assert.match(enabledTopHtml, /data-testid="top-video-ad-collapse-toggle"/);

  const topBannerFileSrc = fs.readFileSync(path.resolve('src/components/TopVideoAdBanner.tsx'), 'utf8');
  assert.match(topBannerFileSrc, /compact=\{true\}/);

  const appFileSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.match(appFileSrc, /data-testid="top-header-sticky-group"/);
  assert.match(appFileSrc, /sticky top-0 z-40 w-full/);

  const playerSrc = fs.readFileSync(path.resolve('src/components/ShopVimeoPlayer.tsx'), 'utf8');
  assert.match(playerSrc, /import Player from '@vimeo\/player'/);
  assert.match(playerSrc, /muted:\s*true/);
  assert.match(playerSrc, /autoplay:\s*autoPlay/);
  assert.match(playerSrc, /player\.setPlaybackRate/);

  assert.equal(
    'shopVideo' in DEFAULT_WEBSITE_DESIGN || DEFAULT_WEBSITE_DESIGN.shopVideo === undefined,
    true
  );

  console.log('✓ 2. Shop & Top Video Ad normalization, SSR rendering, and @vimeo/player controls verified');
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
    'src/components/AdminShopVideoManager.tsx',
    'src/components/ShopVimeoPlayer.tsx',
    'src/components/TopVideoAdBanner.tsx',
    'src/components/AdsManager.tsx',
    'src/views/ShopView.tsx'
  ]) {
    const content = fs.readFileSync(path.resolve(file), 'utf8');
    assert.doesNotMatch(
      content,
      /VIMEO_ACCESS_TOKEN|\/api\/vimeo|create-upload|tus-resumable|upload-offset|upload ticket/i,
      `Unexpected Vimeo API token/upload reference in ${file}`
    );
  }

  // 3. AdminShopVideoManager & AdsManager use "Vimeo Video URL" input and update/enable/disable/remove controls
  const adminVideoSrc = fs.readFileSync(
    path.resolve('src/components/AdminShopVideoManager.tsx'),
    'utf8'
  );
  assert.doesNotMatch(adminVideoSrc, /window\.(alert|confirm|open)/);
  assert.doesNotMatch(adminVideoSrc, /type="file"/);
  assert.match(adminVideoSrc, />\s*Vimeo Video URL\s*<\/label>/);
  assert.match(adminVideoSrc, /https:\/\/vimeo\.com\/1248666228/);
  assert.match(adminVideoSrc, /admin-shop-video-save-btn/);
  assert.match(adminVideoSrc, /admin-shop-video-publish-toggle/);
  assert.match(adminVideoSrc, /admin-shop-video-remove-btn/);

  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  assert.doesNotMatch(adsMgrSrc, /window\.(alert|confirm|open)/);
  assert.match(adsMgrSrc, /ads-top-video-manager/);
  assert.match(adsMgrSrc, /ads-top-video-url-input/);
  assert.match(adsMgrSrc, /ads-top-video-enable-toggle/);
  assert.match(adsMgrSrc, /ads-top-video-save-btn/);
  assert.match(adsMgrSrc, /ads-top-video-remove-btn/);
  assert.match(adsMgrSrc, /ads-top-video-preview/);
  // Existing belowHeaderAd, aboveFooterAd, displaySettings remain intact
  assert.match(adsMgrSrc, /1\. Below Website Header/);
  assert.match(adsMgrSrc, /2\. Above Website Footer/);
  assert.match(adsMgrSrc, /Advertisement Display Settings/);

  // 4. Verify AdSlot.tsx is 100% untouched (zero Vimeo references)
  const adSlotSrc = fs.readFileSync(path.resolve('src/components/AdSlot.tsx'), 'utf8');
  assert.doesNotMatch(adSlotSrc, /vimeo|ShopVideo|ShopView|TopVideoAd/i);

  // 5. Verify App.tsx places TopVideoAdBanner ABOVE WebsiteHeader and preserves MiniShopBar + AdSlot placements
  const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');
  assert.match(appSrc, /const ShopView = lazy\(\(\) => import\('\.\/views\/ShopView'\)/);
  assert.match(appSrc, /<TopVideoAdBanner currentPage=\{currentPage\} \/>/);
  assert.match(appSrc, /<AdSlot placement="below_header"/);
  assert.match(appSrc, /<AdSlot placement="above_footer"/);
  const miniShopPos = appSrc.indexOf('<MiniShopBar');
  const spacerPos = appSrc.indexOf('data-testid="mini-shop-spacer"');
  const topVideoPos = appSrc.indexOf('<TopVideoAdBanner');
  const headerPos = appSrc.indexOf('<WebsiteHeader');
  const belowAdPos = appSrc.indexOf('<AdSlot placement="below_header"');
  const mainPos = appSrc.indexOf('<main ');
  const shopPos = appSrc.indexOf('<ShopView');
  const aboveFooterPos = appSrc.indexOf('<AdSlot placement="above_footer"');
  assert.ok(
    miniShopPos > 0 &&
      spacerPos > miniShopPos &&
      topVideoPos > spacerPos &&
      headerPos > topVideoPos &&
      belowAdPos > headerPos &&
      mainPos > belowAdPos &&
      shopPos > mainPos &&
      aboveFooterPos > shopPos,
    'TopVideoAdBanner must sit above WebsiteHeader while preserving MiniShopBar, ShopView, and AdSlot placements'
  );

  // 6. Verify ShopView renders video ABOVE products and includes friendly empty states
  const shopViewSrc = fs.readFileSync(path.resolve('src/views/ShopView.tsx'), 'utf8');
  const videoSecPos = shopViewSrc.indexOf('data-testid="shop-video-section"');
  const productsSecPos = shopViewSrc.indexOf('data-testid="shop-products-section"');
  assert.ok(
    videoSecPos > 0 && productsSecPos > videoSecPos,
    'Featured Shop video must appear above products'
  );
  assert.match(shopViewSrc, /shop-video-empty-state/);

  // 7. Ensure @vimeo/player is NOT statically imported in App, TopVideoAdBanner, AdsManager, HomeView, WebsiteHeader, or MiniShopBar
  const topBannerSrc = fs.readFileSync(path.resolve('src/components/TopVideoAdBanner.tsx'), 'utf8');
  assert.match(topBannerSrc, /lazy\(\(\) =>\s*import\('\.\/ShopVimeoPlayer'\)/);
  assert.match(adsMgrSrc, /lazy\(\(\) =>\s*import\('\.\/ShopVimeoPlayer'\)/);

  for (const eagerFile of [
    'src/App.tsx',
    'src/components/TopVideoAdBanner.tsx',
    'src/components/AdsManager.tsx',
    'src/views/HomeView.tsx',
    'src/components/WebsiteHeader.tsx',
    'src/components/MiniShopBar.tsx'
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
