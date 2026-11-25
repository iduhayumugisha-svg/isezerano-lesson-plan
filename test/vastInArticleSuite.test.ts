import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import {
  AdsSettings,
  DEFAULT_ADS_SETTINGS,
  DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG,
  HILLTOPADS_IN_ARTICLE_VAST_TAG_URL,
  InArticleVastVideoAdConfig
} from '../src/types/platform';
import {
  fetchAndParseVast,
  fireVastTrackingBeacons,
  isSafeVastHttpsUrl,
  parseVastSkipOffset,
  parseVastTimeToSeconds
} from '../src/utils/vastParser';
import { normalizeInArticleVastVideoAdConfig } from '../src/utils/inArticleAdUtils';
import { buildArticleRenderSegments } from '../src/utils/articleAdInjector';
import {
  VastInArticleVideoAd,
  __resetVastInArticleCacheForTests
} from '../src/components/VastInArticleVideoAd';
import {
  __resetAdsSettingsCacheForTests,
  normalizeAdsSettingsPayload
} from '../src/services/siteSettingsService';

const flushMicrotasks = async (ticks = 6): Promise<void> => {
  for (let i = 0; i < ticks; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

function makeParagraphs(count: number): string {
  const parts: string[] = ['<h2>Headline Before Content</h2>'];
  for (let i = 1; i <= count; i++) {
    parts.push(
      `<p>Paragraph ${i} provides verified reporting on local digital innovation and public interest updates.</p>`
    );
    if (i === 2) {
      parts.push('<figure><img src="https://isezerano.online/photo.jpg" alt="News" /><figcaption>Caption text</figcaption></figure>');
    }
    if (i === 5) {
      parts.push('<ul><li>Key point one</li><li>Key point two</li></ul>');
    }
  }
  return parts.join('\n');
}

function testStrictHttpsAndIpv6Validation(): void {
  // Valid public HTTPS URLs (including fc/fd domain names that must NOT be rejected by IPv6 rules)
  assert.equal(isSafeVastHttpsUrl(HILLTOPADS_IN_ARTICLE_VAST_TAG_URL), true);
  assert.equal(isSafeVastHttpsUrl('https://fcbarcelona.com/vast.xml'), true);
  assert.equal(isSafeVastHttpsUrl('https://fdic.gov/ads/vast3.xml'), true);
  assert.equal(isSafeVastHttpsUrl('https://[2001:4860:4860::8888]/vast.xml'), true);

  // Disallowed protocols, credentials, localhost, private IPv4, ULA/link-local/loopback IPv6, and Monetag
  assert.equal(isSafeVastHttpsUrl('http://sadpicture.com/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('//sadpicture.com/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('javascript:alert(1)'), false);
  assert.equal(isSafeVastHttpsUrl('data:text/xml,<VAST/>'), false);
  assert.equal(isSafeVastHttpsUrl('https://user:pass@example.com/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://localhost/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://intranet.local/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://service.internal/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://127.0.0.1/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://10.0.0.8/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://172.16.5.4/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://192.168.1.25/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://169.254.169.254/latest/meta-data'), false);
  assert.equal(isSafeVastHttpsUrl('https://[::1]/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://[fc00::1]/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://[fd12:3456:789a::1]/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://[fe80::1]/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://[::ffff:127.0.0.1]/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://[::ffff:192.168.1.10]/vast.xml'), false);
  assert.equal(isSafeVastHttpsUrl('https://quge5.com/88/tag.min.js'), false);
  assert.equal(isSafeVastHttpsUrl('https://nap5k.com/vast.xml'), false);

  // SkipOffset & time helpers
  assert.equal(parseVastTimeToSeconds('00:00:15'), 15);
  assert.equal(parseVastTimeToSeconds('00:01:05.500'), 65.5);
  assert.equal(parseVastTimeToSeconds('00:75:00'), null);
  assert.equal(parseVastSkipOffset('00:00:05', 30), 5);
  assert.equal(parseVastSkipOffset('00:00:15', 14), null); // skipoffset >= duration => non-skippable
  assert.equal(parseVastSkipOffset('25%', 20), 5);
  assert.equal(parseVastSkipOffset('100%', 20), null);

  console.log('✓ 1. Strict HTTPS, IPv4/IPv6 (fcbarcelona.com allowed, fc00::/7 blocked) & skipoffset validation verified');
}

async function testVastParsingWrapperErrorsAndSecurity(): Promise<void> {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://isezerano.online/blog/test'
  });
  const prevWin = (globalThis as any).window;
  const prevDoc = (globalThis as any).document;
  const prevDomParser = (globalThis as any).DOMParser;
  const prevImage = (globalThis as any).Image;
  const prevFetch = (globalThis as any).fetch;

  const firedBeacons: string[] = [];
  class MockImage {
    referrerPolicy = '';
    set src(val: string) {
      firedBeacons.push(val);
    }
  }

  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).DOMParser = dom.window.DOMParser;
  (globalThis as any).Image = MockImage;

  try {
    // A. Valid VAST 3.0 InLine (including filtering out http:// insecure media/tracking URLs)
    (globalThis as any).fetch = async (url: string) => ({
      ok: true,
      status: 200,
      url,
      text: async () => `<?xml version="1.0" encoding="UTF-8"?>
        <VAST version="3.0">
          <Ad id="ad-1">
            <InLine>
              <Impression><![CDATA[https://tracker.example.com/imp1]]></Impression>
              <Impression><![CDATA[http://insecure.example.com/imp-drop]]></Impression>
              <Error><![CDATA[https://tracker.example.com/err?code=[ERRORCODE]]]></Error>
              <Creatives>
                <Creative>
                  <Linear skipoffset="00:00:05">
                    <Duration>00:00:20</Duration>
                    <TrackingEvents>
                      <Tracking event="start"><![CDATA[https://tracker.example.com/start]]></Tracking>
                      <Tracking event="firstQuartile"><![CDATA[https://tracker.example.com/q1]]></Tracking>
                      <Tracking event="midpoint"><![CDATA[https://tracker.example.com/q2]]></Tracking>
                      <Tracking event="thirdQuartile"><![CDATA[https://tracker.example.com/q3]]></Tracking>
                      <Tracking event="complete"><![CDATA[https://tracker.example.com/complete]]></Tracking>
                      <Tracking event="skip"><![CDATA[https://tracker.example.com/skip]]></Tracking>
                    </TrackingEvents>
                    <VideoClicks>
                      <ClickThrough><![CDATA[https://advertiser.example.com/landing]]></ClickThrough>
                      <ClickTracking><![CDATA[https://tracker.example.com/click]]></ClickTracking>
                    </VideoClicks>
                    <MediaFiles>
                      <MediaFile delivery="progressive" type="application/javascript" apiFramework="VPAID" width="640" height="360"><![CDATA[https://cdn.example.com/vpaid.js]]></MediaFile>
                      <MediaFile delivery="progressive" type="video/mp4" width="640" height="360"><![CDATA[http://insecure.example.com/bad.mp4]]></MediaFile>
                      <MediaFile delivery="progressive" type="video/mp4" width="1280" height="720"><![CDATA[https://cdn.example.com/ad-720.mp4]]></MediaFile>
                      <MediaFile delivery="progressive" type="video/webm" width="640" height="360"><![CDATA[https://cdn.example.com/ad-360.webm]]></MediaFile>
                    </MediaFiles>
                  </Linear>
                </Creative>
              </Creatives>
            </InLine>
          </Ad>
        </VAST>`
    });

    const inlineAd = await fetchAndParseVast('https://adserver.example.com/vast.xml', {
      preferredMaxWidth: 1280
    });
    assert.ok(inlineAd);
    assert.equal(inlineAd.mediaFile.url, 'https://cdn.example.com/ad-720.mp4');
    assert.equal(inlineAd.impressions.length, 1);
    assert.equal(inlineAd.impressions[0], 'https://tracker.example.com/imp1');
    assert.equal(inlineAd.durationSeconds, 20);
    assert.equal(inlineAd.skipOffsetSeconds, 5);
    assert.equal(inlineAd.clickThroughUrl, 'https://advertiser.example.com/landing');
    assert.deepEqual(inlineAd.clickTrackingUrls, ['https://tracker.example.com/click']);

    // B. Wrapper redirect chain merges tracking & impressions across hops
    (globalThis as any).fetch = async (url: string) => {
      if (url === 'https://wrapper1.example.com/vast.xml') {
        return {
          ok: true,
          status: 200,
          url,
          text: async () => `<VAST version="3.0"><Ad id="w1"><Wrapper>
            <Impression><![CDATA[https://wrapper1.example.com/imp]]></Impression>
            <Error><![CDATA[https://wrapper1.example.com/err?code=[ERRORCODE]]]></Error>
            <VASTAdTagURI><![CDATA[https://inline2.example.com/vast.xml]]></VASTAdTagURI>
            <Creatives><Creative><Linear>
              <TrackingEvents><Tracking event="start"><![CDATA[https://wrapper1.example.com/start]]></Tracking></TrackingEvents>
              <VideoClicks><ClickTracking><![CDATA[https://wrapper1.example.com/click]]></ClickTracking></VideoClicks>
            </Linear></Creative></Creatives>
          </Wrapper></Ad></VAST>`
        };
      }
      return {
        ok: true,
        status: 200,
        url,
        text: async () => `<VAST version="3.0"><Ad id="i2"><InLine>
          <Impression><![CDATA[https://inline2.example.com/imp]]></Impression>
          <Creatives><Creative><Linear>
            <Duration>00:00:15</Duration>
            <TrackingEvents><Tracking event="start"><![CDATA[https://inline2.example.com/start]]></Tracking></TrackingEvents>
            <VideoClicks>
              <ClickThrough><![CDATA[https://sponsor.example.com/offer]]></ClickThrough>
              <ClickTracking><![CDATA[https://inline2.example.com/click]]></ClickTracking>
            </VideoClicks>
            <MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="640" height="360"><![CDATA[https://cdn.example.com/final.mp4]]></MediaFile></MediaFiles>
          </Linear></Creative></Creatives>
        </InLine></Ad></VAST>`
      };
    };

    const wrappedAd = await fetchAndParseVast('https://wrapper1.example.com/vast.xml');
    assert.ok(wrappedAd);
    assert.deepEqual(wrappedAd.impressions, [
      'https://wrapper1.example.com/imp',
      'https://inline2.example.com/imp'
    ]);
    assert.deepEqual(wrappedAd.tracking.start, [
      'https://wrapper1.example.com/start',
      'https://inline2.example.com/start'
    ]);
    assert.deepEqual(wrappedAd.clickTrackingUrls, [
      'https://wrapper1.example.com/click',
      'https://inline2.example.com/click'
    ]);
    assert.equal(wrappedAd.skipOffsetSeconds, null);

    // C. Circular Wrapper loop triggers 302 and aborts safely
    firedBeacons.length = 0;
    (globalThis as any).fetch = async (url: string) => ({
      ok: true,
      status: 200,
      url,
      text: async () => `<VAST version="3.0"><Ad><Wrapper>
        <Error><![CDATA[https://loop.example.com/err?code=[ERRORCODE]]]></Error>
        <VASTAdTagURI><![CDATA[https://loop.example.com/vast.xml]]></VASTAdTagURI>
      </Wrapper></Ad></VAST>`
    });
    assert.equal(await fetchAndParseVast('https://loop.example.com/vast.xml'), null);
    assert.ok(firedBeacons.includes('https://loop.example.com/err?code=302'));

    // D. Empty no-fill with root Error fires 303
    firedBeacons.length = 0;
    (globalThis as any).fetch = async (url: string) => ({
      ok: true,
      status: 200,
      url,
      text: async () => `<VAST version="3.0"><Error><![CDATA[https://nofill.example.com/err?c=[ERRORCODE]]]></Error></VAST>`
    });
    assert.equal(await fetchAndParseVast('https://nofill.example.com/vast.xml'), null);
    assert.ok(firedBeacons.includes('https://nofill.example.com/err?c=303'));

    // E. Malformed XML triggers 100
    (globalThis as any).fetch = async (url: string) => ({
      ok: true,
      status: 200,
      url,
      text: async () => '<VAST><Ad><Broken'
    });
    assert.equal(await fetchAndParseVast('https://broken.example.com/vast.xml'), null);

    // F. VPAID-only creative is rejected with 403 and zero script execution
    (globalThis as any).fetch = async (url: string) => ({
      ok: true,
      status: 200,
      url,
      text: async () => `<VAST version="3.0"><Ad><InLine>
        <Error><![CDATA[https://vpaid.example.com/err?c=[ERRORCODE]]]></Error>
        <Creatives><Creative><Linear><Duration>00:00:15</Duration>
          <MediaFiles><MediaFile delivery="progressive" type="application/javascript" apiFramework="VPAID"><![CDATA[https://vpaid.example.com/ad.js]]></MediaFile></MediaFiles>
        </Linear></Creative></Creatives>
      </InLine></Ad></VAST>`
    });
    firedBeacons.length = 0;
    assert.equal(await fetchAndParseVast('https://vpaid.example.com/vast.xml'), null);
    assert.ok(firedBeacons.includes('https://vpaid.example.com/err?c=403'));

    // G. CORS / network failure rejects cleanly
    (globalThis as any).fetch = async () => {
      throw new TypeError('Failed to fetch (CORS)');
    };
    assert.equal(await fetchAndParseVast('https://cors-blocked.example.com/vast.xml'), null);

    // H. Post-fetch redirect gate rejects disallowed final res.url before parsing XML
    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 200,
      url: 'http://127.0.0.1/internal.xml',
      text: async () => `<VAST version="3.0"><Ad><InLine><Creatives><Creative><Linear><MediaFiles><MediaFile type="video/mp4">https://cdn.example.com/a.mp4</MediaFile></MediaFiles></Linear></Creative></Creatives></InLine></Ad></VAST>`
    });
    assert.equal(await fetchAndParseVast('https://redirector.example.com/vast.xml'), null);

    // I. Beacon dispatcher ignores unsafe protocols
    firedBeacons.length = 0;
    fireVastTrackingBeacons(['http://bad.example.com/p', 'https://good.example.com/p?c=[ERRORCODE]'], { ERRORCODE: '400' });
    assert.deepEqual(firedBeacons, ['https://good.example.com/p?c=400']);
  } finally {
    (globalThis as any).window = prevWin;
    (globalThis as any).document = prevDoc;
    (globalThis as any).DOMParser = prevDomParser;
    (globalThis as any).Image = prevImage;
    (globalThis as any).fetch = prevFetch;
  }

  console.log('✓ 2. VAST 3.0 InLine, Wrapper, no-fill, invalid XML, VPAID rejection, CORS & redirect gate verified');
}

async function testPlayerDomTrackingClickSkipAndLifecycle(): Promise<void> {
  __resetVastInArticleCacheForTests();
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://isezerano.online/blog/sample'
  });

  const prevWin = (globalThis as any).window;
  const prevDoc = (globalThis as any).document;
  const prevDomParser = (globalThis as any).DOMParser;
  const prevImage = (globalThis as any).Image;
  const prevFetch = (globalThis as any).fetch;
  const prevNavigator = (globalThis as any).navigator;

  const beacons: string[] = [];
  class MockImage {
    referrerPolicy = '';
    set src(val: string) {
      beacons.push(val);
    }
  }

  (globalThis as any).window = dom.window;
  (globalThis as any).document = dom.window.document;
  (globalThis as any).DOMParser = dom.window.DOMParser;
  (globalThis as any).Image = MockImage;
  (globalThis as any).fetch = prevFetch;
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });

  // Stub HTMLMediaElement methods for JSDOM
  const proto = dom.window.HTMLMediaElement.prototype as any;
  const origPlay = proto.play;
  const origPause = proto.pause;
  const origLoad = proto.load;

  proto.load = function () {};
  proto.play = function () {
    Object.defineProperty(this, 'paused', { value: false, configurable: true });
    Object.defineProperty(this, 'ended', { value: false, configurable: true });
    this.dispatchEvent(new dom.window.Event('playing'));
    return Promise.resolve();
  };
  proto.pause = function () {
    Object.defineProperty(this, 'paused', { value: true, configurable: true });
    this.dispatchEvent(new dom.window.Event('pause'));
  };

  try {
    // Case 1: Skippable VAST creative + full tracking + accurate multi-click ClickTracking + controls isolation
    let fetchCount = 0;
    (globalThis as any).fetch = async (url: string) => {
      fetchCount++;
      return {
        ok: true,
        status: 200,
        url,
        text: async () => `<VAST version="3.0"><Ad id="skippable"><InLine>
          <Impression><![CDATA[https://trk.example.com/imp]]></Impression>
          <Creatives><Creative><Linear skipoffset="00:00:05">
            <Duration>00:00:20</Duration>
            <TrackingEvents>
              <Tracking event="creativeView"><![CDATA[https://trk.example.com/creativeView]]></Tracking>
              <Tracking event="start"><![CDATA[https://trk.example.com/start]]></Tracking>
              <Tracking event="firstQuartile"><![CDATA[https://trk.example.com/q1]]></Tracking>
              <Tracking event="midpoint"><![CDATA[https://trk.example.com/q2]]></Tracking>
              <Tracking event="thirdQuartile"><![CDATA[https://trk.example.com/q3]]></Tracking>
              <Tracking event="complete"><![CDATA[https://trk.example.com/complete]]></Tracking>
              <Tracking event="mute"><![CDATA[https://trk.example.com/mute]]></Tracking>
              <Tracking event="unmute"><![CDATA[https://trk.example.com/unmute]]></Tracking>
              <Tracking event="pause"><![CDATA[https://trk.example.com/pause]]></Tracking>
              <Tracking event="resume"><![CDATA[https://trk.example.com/resume]]></Tracking>
              <Tracking event="skip"><![CDATA[https://trk.example.com/skip]]></Tracking>
            </TrackingEvents>
            <VideoClicks>
              <ClickThrough><![CDATA[https://advertiser.example.com/promo]]></ClickThrough>
              <ClickTracking><![CDATA[https://trk.example.com/click]]></ClickTracking>
            </VideoClicks>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="640" height="360"><![CDATA[https://cdn.example.com/spot.mp4]]></MediaFile>
            </MediaFiles>
          </Linear></Creative></Creatives>
        </InLine></Ad></VAST>`
      };
    };

    const config: InArticleVastVideoAdConfig = {
      ...DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG,
      enabled: true,
      vastTagUrl: 'https://ads.example.com/vast.xml'
    };

    const mountNode = dom.window.document.getElementById('root')!;
    const root = createRoot(mountNode);

    // Mount inside React.StrictMode to verify ref-counted dedup (single fetch, no premature abort!)
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(VastInArticleVideoAd, {
          articleId: 'art-1',
          placementKey: 'vast1',
          afterParagraph: 3,
          config
        })
      )
    );
    await flushMicrotasks(8);

    assert.equal(fetchCount, 1, 'StrictMode double-mount must make exactly 1 VAST fetch');

    const aside = dom.window.document.querySelector('[data-testid="vast-in-article-ad-vast1"]');
    assert.ok(aside, 'Player must mount cleanly');
    const videoEl = aside.querySelector('video') as HTMLVideoElement;
    assert.ok(videoEl);
    assert.equal(videoEl.muted, true, 'Autoplay must start muted');

    // Initial muted autoplay must NOT fire mute tracking; impression + creativeView + start fire once
    assert.equal(beacons.filter((b) => b.endsWith('/imp')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/creativeView')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/start')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/mute')).length, 0);

    // Before skipoffset (t=2s), Skip countdown appears and Skip Ad button is not yet clickable
    Object.defineProperty(videoEl, 'duration', { value: 20, configurable: true });
    Object.defineProperty(videoEl, 'currentTime', { value: 2, configurable: true });
    videoEl.dispatchEvent(new dom.window.Event('timeupdate'));
    await flushMicrotasks(2);
    assert.ok(dom.window.document.querySelector('[data-testid="vast-skip-countdown-vast1"]'));
    assert.equal(dom.window.document.querySelector('[data-testid="vast-skip-btn-vast1"]'), null);

    // Mute toggle (unmute then mute) tracks accurately and does NOT fire ClickTracking
    const muteBtn = dom.window.document.querySelector('[data-testid="vast-mute-toggle-vast1"]') as HTMLButtonElement;
    muteBtn.click();
    await flushMicrotasks(2);
    assert.equal(beacons.filter((b) => b.endsWith('/unmute')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/click')).length, 0);
    muteBtn.click();
    await flushMicrotasks(2);
    assert.equal(beacons.filter((b) => b.endsWith('/mute')).length, 1);

    // Quartiles fire at 25%, 50%, 75% without duplicates
    for (const t of [5, 6, 10, 15]) {
      Object.defineProperty(videoEl, 'currentTime', { value: t, configurable: true });
      videoEl.dispatchEvent(new dom.window.Event('timeupdate'));
    }
    await flushMicrotasks(2);
    assert.equal(beacons.filter((b) => b.endsWith('/q1')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/q2')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/q3')).length, 1);

    // Skip button is now active because currentTime >= 5
    assert.ok(dom.window.document.querySelector('[data-testid="vast-skip-btn-vast1"]'));

    // Two genuine separate user clicks on CTA / overlay each track ClickTracking once (no permanent 1-click lock!)
    const ctaLink = dom.window.document.querySelector('[data-testid="vast-clickthrough-cta-vast1"]') as HTMLAnchorElement;
    ctaLink.addEventListener('click', (ev) => ev.preventDefault());
    ctaLink.click();
    await flushMicrotasks(2);
    assert.equal(beacons.filter((b) => b.endsWith('/click')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/pause')).length, 1);

    // Resume playback, then genuine 2nd click on overlay
    const playToggle = dom.window.document.querySelector('[data-testid="vast-play-toggle-vast1"]') as HTMLButtonElement;
    playToggle.click();
    await flushMicrotasks(2);
    assert.equal(beacons.filter((b) => b.endsWith('/resume')).length, 1);

    const overlayLink = dom.window.document.querySelector('[data-testid="vast-clickthrough-overlay-vast1"]') as HTMLAnchorElement;
    overlayLink.addEventListener('click', (ev) => ev.preventDefault());
    overlayLink.click();
    await flushMicrotasks(2);
    assert.equal(beacons.filter((b) => b.endsWith('/click')).length, 2);

    // Clicking Skip Ad fires skip once, collapses component, and does NOT fire complete
    const skipBtn = dom.window.document.querySelector('[data-testid="vast-skip-btn-vast1"]') as HTMLButtonElement;
    skipBtn.click();
    await flushMicrotasks(3);
    assert.equal(beacons.filter((b) => b.endsWith('/skip')).length, 1);
    assert.equal(beacons.filter((b) => b.endsWith('/complete')).length, 0);
    assert.equal(dom.window.document.querySelector('[data-testid="vast-in-article-ad-vast1"]'), null);

    root.unmount();
    await flushMicrotasks(2);

    // Case 2: Non-skippable creative MUST NOT show any Skip or Close button, collapses cleanly on ended
    beacons.length = 0;
    (globalThis as any).fetch = async (url: string) => ({
      ok: true,
      status: 200,
      url,
      text: async () => `<VAST version="3.0"><Ad id="nonskip"><InLine>
        <Impression><![CDATA[https://trk.example.com/imp2]]></Impression>
        <Creatives><Creative><Linear>
          <Duration>00:00:10</Duration>
          <TrackingEvents>
            <Tracking event="complete"><![CDATA[https://trk.example.com/complete2]]></Tracking>
          </TrackingEvents>
          <MediaFiles>
            <MediaFile delivery="progressive" type="video/mp4" width="640" height="360"><![CDATA[https://cdn.example.com/nonskip.mp4]]></MediaFile>
          </MediaFiles>
        </Linear></Creative></Creatives>
      </InLine></Ad></VAST>`
    });

    const mount2 = dom.window.document.getElementById('root')!;
    const root2 = createRoot(mount2);
    root2.render(
      React.createElement(VastInArticleVideoAd, {
        articleId: 'art-2',
        placementKey: 'vast1',
        afterParagraph: 3,
        config
      })
    );
    await flushMicrotasks(6);

    assert.equal(dom.window.document.querySelector('[data-testid="vast-skip-btn-vast1"]'), null);
    assert.equal(dom.window.document.querySelector('[data-testid="vast-skip-countdown-vast1"]'), null);
    assert.equal(dom.window.document.querySelector('button[aria-label*="Close"]'), null);

    const video2 = dom.window.document.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video2, 'ended', { value: true, configurable: true });
    video2.dispatchEvent(new dom.window.Event('ended'));
    await flushMicrotasks(3);
    assert.equal(beacons.filter((b) => b.endsWith('/complete2')).length, 1);
    assert.equal(dom.window.document.querySelector('[data-testid="vast-in-article-ad-vast1"]'), null);
    root2.unmount();

    // Case 3: Real unmount aborts in-flight VAST fetch cleanly
    let abortedOnRealUnmount = false;
    (globalThis as any).fetch = (_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          abortedOnRealUnmount = true;
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      });

    const mount3 = dom.window.document.getElementById('root')!;
    const root3 = createRoot(mount3);
    root3.render(
      React.createElement(VastInArticleVideoAd, {
        articleId: 'art-3',
        placementKey: 'vast1',
        afterParagraph: 3,
        config
      })
    );
    await flushMicrotasks(1);
    root3.unmount();
    await flushMicrotasks(2);
    assert.equal(abortedOnRealUnmount, true, 'Real unmount must abort pending VAST fetch');
  } finally {
    proto.play = origPlay;
    proto.pause = origPause;
    proto.load = origLoad;
    (globalThis as any).window = prevWin;
    (globalThis as any).document = prevDoc;
    (globalThis as any).DOMParser = prevDomParser;
    (globalThis as any).Image = prevImage;
    (globalThis as any).fetch = prevFetch;
    Object.defineProperty(globalThis, 'navigator', { value: prevNavigator, configurable: true });
  }

  console.log('✓ 3. Player DOM controls, skipoffset, non-skippable rule, multi-click ClickTracking & lifecycle cleanup verified');
}

function testParagraph3And8InjectionAndAdminPreservation(): void {
  __resetAdsSettingsCacheForTests(true);

  const vastSettings: AdsSettings = {
    ...DEFAULT_ADS_SETTINGS,
    masterEnabled: true,
    inArticleVastVideoAd: {
      ...DEFAULT_IN_ARTICLE_VAST_VIDEO_AD_CONFIG,
      enabled: true,
      vastTagUrl: HILLTOPADS_IN_ARTICLE_VAST_TAG_URL,
      afterParagraph: 3,
      secondPlacementEnabled: true,
      secondAfterParagraph: 8
    }
  };

  // Short article (3 paragraphs): skipped so no trailing video at end
  const shortPlan = buildArticleRenderSegments({
    html: makeParagraphs(3),
    adsSettings: vastSettings,
    deviceType: 'desktop'
  });
  assert.deepEqual(shortPlan.placedVastPlacements, []);

  // Medium article (6 paragraphs): only paragraph 3 placement inserted
  const medPlan = buildArticleRenderSegments({
    html: makeParagraphs(6),
    adsSettings: vastSettings,
    deviceType: 'mobile'
  });
  assert.deepEqual(medPlan.placedVastPlacements, ['vast1']);

  // Long article (10 paragraphs): paragraph 3 and paragraph 8 placements inserted cleanly between <p> blocks
  const longPlan = buildArticleRenderSegments({
    html: makeParagraphs(10),
    adsSettings: vastSettings,
    deviceType: 'desktop'
  });
  assert.deepEqual(longPlan.placedVastPlacements, ['vast1', 'vast2']);
  const vastSegs = longPlan.segments.filter((s) => s.type === 'vast_video');
  assert.equal(vastSegs.length, 2);
  assert.equal(vastSegs[0].afterParagraph, 3);
  assert.equal(vastSegs[1].afterParagraph, 8);

  // Admin normalization & default disabled safety
  const normalizedDefault = normalizeAdsSettingsPayload(null);
  assert.equal(normalizedDefault.inArticleVastVideoAd?.enabled, false);
  assert.equal(
    normalizedDefault.inArticleVastVideoAd?.vastTagUrl,
    HILLTOPADS_IN_ARTICLE_VAST_TAG_URL
  );
  assert.equal(normalizedDefault.inArticleVastVideoAd?.afterParagraph, 3);
  assert.equal(normalizedDefault.inArticleVastVideoAd?.secondAfterParagraph, 8);

  const rejectedUnsafeUrl = normalizeInArticleVastVideoAdConfig({
    enabled: true,
    vastTagUrl: 'http://insecure.example.com/vast.xml'
  });
  assert.equal(rejectedUnsafeUrl.vastTagUrl, '');

  // Source wiring & preservation assertions
  const blogSrc = fs.readFileSync(path.resolve('src/views/BlogView.tsx'), 'utf8');
  const adsMgrSrc = fs.readFileSync(path.resolve('src/components/AdsManager.tsx'), 'utf8');
  const headerBannerSrc = fs.readFileSync(path.resolve('src/components/HilltopAdsHeaderBanner.tsx'), 'utf8');
  const articleBannerSrc = fs.readFileSync(path.resolve('src/components/HilltopAdsArticleBanner.tsx'), 'utf8');

  assert.match(blogSrc, /<VastInArticleVideoAd/);
  assert.match(blogSrc, /<HilltopAdsArticleBanner/);
  assert.match(adsMgrSrc, /ads-vast-video-manager/);
  assert.match(adsMgrSrc, /ads-vast-tag-url-input/);
  assert.match(adsMgrSrc, /ads-floating-video-manager/);
  assert.match(headerBannerSrc, /300/);
  assert.match(articleBannerSrc, /300/);
  assert.doesNotMatch(blogSrc, /monetag/i);
  assert.doesNotMatch(adsMgrSrc, /monetag/i);

  console.log('✓ 4. Paragraph 3 & 8 injection, Admin defaults, and existing HilltopAds preservation verified');
}

async function runSuite(): Promise<void> {
  testStrictHttpsAndIpv6Validation();
  await testVastParsingWrapperErrorsAndSecurity();
  await testPlayerDomTrackingClickSkipAndLifecycle();
  testParagraph3And8InjectionAndAdminPreservation();
  console.log('\nALL VAST 3.0 IN-ARTICLE VIDEO TESTS PASSED!');
}

runSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VAST IN-ARTICLE SUITE FAILURE:', err);
    process.exit(1);
  });
