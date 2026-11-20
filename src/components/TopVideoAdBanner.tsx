import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Film } from 'lucide-react';
import { DEFAULT_TOP_VIDEO_AD_CONFIG, TopVideoAdConfig } from '../types/platform';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  hasCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import { normalizeTopVideoAdConfig } from '../services/shopVideoService';

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

  if (!isVideoActive) {
    return null;
  }

  return (
    <section
      data-testid="top-video-ad-banner"
      aria-label={videoAd.label || 'Sponsored Video Advertisement'}
      className="no-print w-full md:w-[37.5%] mx-auto bg-slate-950 border border-slate-800 rounded-b-2xl text-white"
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-1.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
              <Film className="w-3 h-3" aria-hidden="true" />
              <span>AD</span>
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-amber-300 uppercase tracking-wide shrink-0">
              {videoAd.label || 'Sponsored Video'}
            </span>
            {videoAd.title && (
              <span className="text-xs font-semibold text-slate-200 truncate">
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 cursor-pointer shrink-0 transition-colors"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Show Video</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Minimize</span>
              </>
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="w-full max-w-xs mx-auto">
            <Suspense
              fallback={
                <div className="w-full aspect-video min-h-[180px] rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300">
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
