import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Film } from 'lucide-react';
import {
  DEFAULT_TOP_VIDEO_AD_CONFIG,
  TopVideoAdConfig,
  TopVideoAdDisplaySettings
} from '../types/platform';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  hasCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import { normalizeTopVideoAdConfig } from '../services/shopVideoService';
import {
  normalizeTopVideoAdDisplaySettings,
  resolveTopVideoBannerHeaderSpacing
} from '../utils/displaySettingsUtils';

// Lazy-load @vimeo/player only when a site-wide top video advertisement is actually enabled
const LazyShopVimeoPlayer = lazy(() =>
  import('./ShopVimeoPlayer').then((m) => ({ default: m.ShopVimeoPlayer }))
);

interface TopVideoAdBannerProps {
  currentPage: string;
  overrideVideoAd?: TopVideoAdConfig | null;
}

export const TopVideoAdBanner: React.FC<TopVideoAdBannerProps> = ({
  currentPage,
  overrideVideoAd
}) => {
  const [videoAd, setVideoAd] = useState<TopVideoAdConfig>(() => {
    if (overrideVideoAd !== undefined) {
      return normalizeTopVideoAdConfig(overrideVideoAd);
    }
    if (hasCachedAdsSettingsSync()) {
      return normalizeTopVideoAdConfig(getCachedAdsSettingsSync().aboveHeaderVideoAd);
    }
    return { ...DEFAULT_TOP_VIDEO_AD_CONFIG };
  });
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (overrideVideoAd !== undefined) {
      setVideoAd(normalizeTopVideoAdConfig(overrideVideoAd));
      return;
    }

    let active = true;

    const unsub = subscribeToAdsSettings((settings) => {
      if (!active) return;
      setVideoAd(normalizeTopVideoAdConfig(settings.aboveHeaderVideoAd));
    });

    getAdsSettings()
      .then((settings) => {
        if (!active) return;
        setVideoAd(normalizeTopVideoAdConfig(settings.aboveHeaderVideoAd));
      })
      .catch(() => {
        // fail gracefully without disrupting header
      });

    return () => {
      active = false;
      unsub();
    };
  }, [overrideVideoAd]);

  const isVideoActive = useMemo(() => {
    if (currentPage === 'admin') return false;
    return (
      videoAd.enabled &&
      Boolean(videoAd.videoId) &&
      videoAd.playerEmbedUrl.startsWith('https://player.vimeo.com/video/')
    );
  }, [currentPage, videoAd]);

  const display: TopVideoAdDisplaySettings = useMemo(
    () => normalizeTopVideoAdDisplaySettings(videoAd.displaySettings),
    [videoAd.displaySettings]
  );

  const headerSpacing = useMemo(
    () => resolveTopVideoBannerHeaderSpacing(display.bannerHeightPx),
    [display.bannerHeightPx]
  );

  if (!isVideoActive) {
    return null;
  }

  const customHeightVars = !display.preserveAspectRatio
    ? ({ '--top-ad-video-height': `${display.videoHeightPx}px` } as React.CSSProperties)
    : undefined;

  const badgePaddingClass =
    headerSpacing.compactTier === 'ultra'
      ? 'px-1 py-0 text-[8px] leading-[11px]'
      : headerSpacing.compactTier === 'compact'
      ? 'px-1.5 py-0 text-[9px] leading-[13px]'
      : 'px-1.5 py-0.5 text-[9px] leading-none';

  const labelTextClass =
    headerSpacing.compactTier === 'ultra'
      ? 'text-[9px] leading-[11px]'
      : headerSpacing.compactTier === 'compact'
      ? 'text-[10px] leading-[13px]'
      : 'text-[10px] sm:text-[11px] leading-none';

  const buttonSizeClass =
    headerSpacing.compactTier === 'ultra'
      ? 'px-1.5 py-0 text-[9px] leading-[12px]'
      : headerSpacing.compactTier === 'compact'
      ? 'px-1.5 py-[1px] text-[9px] leading-[13px]'
      : 'px-2 py-0.5 text-[10px]';

  return (
    <section
      data-testid="top-video-ad-banner"
      aria-label={videoAd.label || 'Sponsored Video Advertisement'}
      className="no-print w-full bg-slate-950/95 border-b border-slate-800 text-white px-2 sm:px-4"
      style={{
        paddingTop: `${headerSpacing.sectionPaddingTopPx}px`,
        paddingBottom: `${headerSpacing.sectionPaddingBottomPx}px`
      }}
    >
      <div
        data-testid="top-video-ad-wrapper"
        className="w-full max-w-full mx-auto bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 sm:px-3.5 shadow-sm transition-all flex flex-col"
        style={{
          maxWidth: `${display.bannerWidthPx}px`,
          paddingTop: `${headerSpacing.wrapperPaddingTopPx}px`,
          paddingBottom: `${headerSpacing.wrapperPaddingBottomPx}px`,
          gap: `${headerSpacing.wrapperGapPx}px`
        }}
      >
        <div
          data-testid="top-video-ad-header"
          className="flex items-center justify-between gap-2 text-[11px]"
          style={{
            minHeight: `${headerSpacing.headerMinHeightPx}px`
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`inline-flex items-center gap-1 rounded bg-amber-400 text-slate-950 font-extrabold uppercase tracking-wider shrink-0 ${badgePaddingClass}`}
            >
              <Film className="w-2.5 h-2.5" aria-hidden="true" />
              <span>AD</span>
            </span>
            <span className={`font-bold text-amber-300 uppercase tracking-wide shrink-0 ${labelTextClass}`}>
              {videoAd.label || 'Sponsored Video'}
            </span>
            {videoAd.title && (
              <span className={`font-semibold text-slate-200 truncate ${labelTextClass}`}>
                · {videoAd.title}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            data-testid="top-video-ad-collapse-toggle"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Show top video advertisement' : 'Minimize top video advertisement'}
            className={`inline-flex items-center gap-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-700 font-bold text-slate-300 cursor-pointer shrink-0 transition-colors ${buttonSizeClass}`}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3 h-3" aria-hidden="true" />
                <span>Show Video</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" aria-hidden="true" />
                <span>Minimize</span>
              </>
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div
            data-testid="top-video-ad-container"
            className={`w-full max-w-full mx-auto transition-all ${
              !display.preserveAspectRatio
                ? '[&_[data-testid=shop-vimeo-player]>div:first-child]:!aspect-auto [&_[data-testid=shop-vimeo-player]>div:first-child]:!h-[var(--top-ad-video-height)] [&_[data-testid=shop-vimeo-mount]>div]:!pt-0 [&_[data-testid=shop-vimeo-mount]>div]:!h-full'
                : ''
            }`}
            style={{
              width: '100%',
              maxWidth: `${display.videoWidthPx}px`,
              ...customHeightVars
            }}
          >
            <Suspense
              fallback={
                <div
                  className={`w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[11px] font-semibold text-slate-300 ${
                    display.preserveAspectRatio ? 'aspect-video' : ''
                  }`}
                  style={!display.preserveAspectRatio ? { height: `${display.videoHeightPx}px` } : undefined}
                >
                  Loading video advertisement...
                </div>
              }
            >
              <LazyShopVimeoPlayer
                video={{
                  videoId: videoAd.videoId,
                  playerEmbedUrl: videoAd.playerEmbedUrl,
                  title: videoAd.title || videoAd.label || 'Sponsored Video'
                }}
                autoPlay={true}
                compact={true}
                playerLabel="Video Ad"
                fallbackNote="Thank you for visiting ISEZERANO ONLINE."
              />
            </Suspense>
          </div>
        )}
      </div>
    </section>
  );
};
