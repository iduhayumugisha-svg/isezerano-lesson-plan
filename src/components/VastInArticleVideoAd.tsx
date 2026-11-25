import React, { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Pause,
  Play,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import { InArticleVastVideoAdConfig } from '../types/platform';
import {
  ResolvedVastAd,
  fetchAndParseVast,
  fireVastTrackingBeacons,
  isSafeVastHttpsUrl
} from '../utils/vastParser';

interface VastInArticleVideoAdProps {
  articleId: string;
  placementKey: 'vast1' | 'vast2';
  afterParagraph: number;
  config: InArticleVastVideoAdConfig;
  className?: string;
}

type PlayerStatus = 'loading' | 'ready' | 'playing' | 'paused' | 'completed' | 'empty';

interface InFlightVastEntry {
  controller: AbortController;
  promise: Promise<ResolvedVastAd | null>;
  subscribers: number;
}

const inFlightVastCache = new Map<string, InFlightVastEntry>();

export const __resetVastInArticleCacheForTests = (): void => {
  for (const entry of inFlightVastCache.values()) {
    entry.controller.abort();
  }
  inFlightVastCache.clear();
};

export const VastInArticleVideoAd: React.FC<VastInArticleVideoAdProps> = ({
  articleId,
  placementKey,
  afterParagraph,
  config,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const firedEventsRef = useRef<Set<string>>(new Set());
  const handledClickEventsRef = useRef<WeakSet<Event>>(new WeakSet());
  const impressionFiredRef = useRef<boolean>(false);
  const hasStartedRef = useRef<boolean>(false);
  const wasPausedRef = useRef<boolean>(false);
  const isTeardownRef = useRef<boolean>(false);

  const [status, setStatus] = useState<PlayerStatus>('loading');
  const [vastAd, setVastAd] = useState<ResolvedVastAd | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.7);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [needsUserPlayTap, setNeedsUserPlayTap] = useState<boolean>(false);

  const isTagValid = config.enabled && isSafeVastHttpsUrl(config.vastTagUrl);

  // 1. Reference-counted VAST 3.0 XML fetch & cleanup
  useEffect(() => {
    firedEventsRef.current.clear();
    impressionFiredRef.current = false;
    hasStartedRef.current = false;
    wasPausedRef.current = false;
    isTeardownRef.current = false;
    setCurrentTime(0);
    setDuration(0);
    setNeedsUserPlayTap(false);

    if (!isTagValid || typeof window === 'undefined') {
      setVastAd(null);
      setStatus('empty');
      return;
    }

    const isMobile = window.innerWidth < 768;
    if ((isMobile && !config.mobileEnabled) || (!isMobile && !config.desktopEnabled)) {
      setVastAd(null);
      setStatus('empty');
      return;
    }

    let effectActive = true;
    const cacheKey = `${articleId}::${placementKey}::${config.vastTagUrl}`;
    setStatus('loading');

    let entry = inFlightVastCache.get(cacheKey);
    if (!entry) {
      const controller = new AbortController();
      const promise = fetchAndParseVast(config.vastTagUrl, {
        signal: controller.signal,
        preferredMaxWidth: isMobile ? 640 : 1280
      }).finally(() => {
        if (inFlightVastCache.get(cacheKey)?.controller === controller) {
          inFlightVastCache.delete(cacheKey);
        }
      });
      entry = { controller, promise, subscribers: 0 };
      inFlightVastCache.set(cacheKey, entry);
    }

    entry.subscribers += 1;
    const subscribedEntry = entry;

    subscribedEntry.promise
      .then((resolved) => {
        if (!effectActive) return;
        if (!resolved || !isSafeVastHttpsUrl(resolved.mediaFile?.url)) {
          setVastAd(null);
          setStatus('empty');
          return;
        }
        setVastAd(resolved);
        setStatus('ready');
      })
      .catch(() => {
        if (!effectActive) return;
        setVastAd(null);
        setStatus('empty');
      });

    return () => {
      effectActive = false;
      isTeardownRef.current = true;
      subscribedEntry.subscribers -= 1;

      queueMicrotask(() => {
        if (subscribedEntry.subscribers <= 0) {
          subscribedEntry.controller.abort();
          if (inFlightVastCache.get(cacheKey) === subscribedEntry) {
            inFlightVastCache.delete(cacheKey);
          }
        }
      });

      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeAttribute('src');
        if (typeof video.load === 'function') {
          video.load();
        }
      }
    };
  }, [
    articleId,
    placementKey,
    isTagValid,
    config.vastTagUrl,
    config.mobileEnabled,
    config.desktopEnabled
  ]);

  // 2. Muted autoplay + VAST 3.0 Impression, Quartile, Pause/Resume & Completion lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !vastAd || status === 'empty' || status === 'completed') return;

    isTeardownRef.current = false;
    // Always initialize muted without firing a user mute tracking beacon
    video.muted = true;
    video.playsInline = true;
    setIsMuted(true);

    const fireOnce = (eventKey: string, urls?: string[]) => {
      if (!urls?.length || firedEventsRef.current.has(eventKey)) return;
      firedEventsRef.current.add(eventKey);
      fireVastTrackingBeacons(urls);
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };

    const handlePlaying = () => {
      setStatus('playing');
      setNeedsUserPlayTap(false);

      if (!impressionFiredRef.current) {
        impressionFiredRef.current = true;
        fireVastTrackingBeacons(vastAd.impressions);
      }

      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        wasPausedRef.current = false;
        fireOnce('creativeView', vastAd.tracking.creativeView);
        fireOnce('start', vastAd.tracking.start);
      } else if (wasPausedRef.current) {
        wasPausedRef.current = false;
        fireVastTrackingBeacons(vastAd.tracking.resume);
      }
    };

    const handlePause = () => {
      if (isTeardownRef.current || !hasStartedRef.current) return;
      const d =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : vastAd.durationSeconds || 0;
      const atEnd = Boolean(video.ended) || (d > 0 && video.currentTime >= d - 0.05);
      if (atEnd) return;

      wasPausedRef.current = true;
      setStatus('paused');
      fireVastTrackingBeacons(vastAd.tracking.pause);
    };

    const handleTimeUpdate = () => {
      const t = video.currentTime || 0;
      const d =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : vastAd.durationSeconds || 0;
      setCurrentTime(t);
      if (d > 0) {
        setDuration(d);
        const progress = t / d;
        if (progress >= 0.25) fireOnce('firstQuartile', vastAd.tracking.firstQuartile);
        if (progress >= 0.5) fireOnce('midpoint', vastAd.tracking.midpoint);
        if (progress >= 0.75) fireOnce('thirdQuartile', vastAd.tracking.thirdQuartile);
      }
    };

    const handleEnded = () => {
      isTeardownRef.current = true;
      fireOnce('complete', vastAd.tracking.complete);
      setStatus('completed');
    };

    const handleError = () => {
      isTeardownRef.current = true;
      fireVastTrackingBeacons(vastAd.errors, { ERRORCODE: '400' });
      setStatus('empty');
      setVastAd(null);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    if (config.autoplayMuted !== false) {
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          setNeedsUserPlayTap(true);
          setStatus('paused');
        });
      }
    } else {
      setNeedsUserPlayTap(true);
      setStatus('paused');
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [vastAd, config.autoplayMuted]);

  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !vastAd) return;
    if (video.paused) {
      video.play().catch(() => setNeedsUserPlayTap(true));
    } else {
      video.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !vastAd) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    if (!nextMuted && video.volume === 0) {
      video.volume = volume || 0.7;
    }
    setIsMuted(nextMuted);
    fireVastTrackingBeacons(nextMuted ? vastAd.tracking.mute : vastAd.tracking.unmute);
  };

  const handleVolumeChange = (nextVol: number) => {
    const video = videoRef.current;
    if (!video || !vastAd) return;
    const clamped = Math.max(0, Math.min(1, nextVol));
    video.volume = clamped;
    const nextMuted = clamped === 0;
    if (nextMuted !== isMuted) {
      video.muted = nextMuted;
      setIsMuted(nextMuted);
      fireVastTrackingBeacons(nextMuted ? vastAd.tracking.mute : vastAd.tracking.unmute);
    }
    setVolume(clamped);
  };

  const handleSkipAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!vastAd || vastAd.skipOffsetSeconds === null) return;
    if (currentTime < vastAd.skipOffsetSeconds) return;

    isTeardownRef.current = true;
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.removeAttribute('src');
      if (typeof video.load === 'function') {
        video.load();
      }
    }
    if (!firedEventsRef.current.has('skip')) {
      firedEventsRef.current.add('skip');
      fireVastTrackingBeacons(vastAd.tracking.skip);
    }
    setStatus('completed');
  };

  const handleAdClickThrough = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation();
    if (!vastAd?.clickThroughUrl || !isSafeVastHttpsUrl(vastAd.clickThroughUrl)) {
      e.preventDefault();
      return;
    }

    if (handledClickEventsRef.current.has(e.nativeEvent)) {
      return;
    }
    handledClickEventsRef.current.add(e.nativeEvent);

    const video = videoRef.current;
    if (video && !video.paused && !video.ended) {
      video.pause();
    }

    fireVastTrackingBeacons(vastAd.clickTrackingUrls);
  };

  if (!isTagValid || status === 'empty' || status === 'completed' || status === 'loading' || !vastAd) {
    return null;
  }

  const effectiveDuration = duration || vastAd.durationSeconds || 0;
  const rawSkipSeconds = vastAd.skipOffsetSeconds;
  const skipOffsetSeconds =
    rawSkipSeconds !== null && (effectiveDuration <= 0 || rawSkipSeconds < effectiveDuration)
      ? rawSkipSeconds
      : null;

  const canSkip = skipOffsetSeconds !== null && currentTime >= Math.max(0, skipOffsetSeconds);
  const secondsUntilSkip =
    skipOffsetSeconds !== null ? Math.max(0, Math.ceil(skipOffsetSeconds - currentTime)) : null;

  const deviceVisibilityClass =
    config.desktopEnabled && config.mobileEnabled
      ? 'block'
      : config.desktopEnabled
      ? 'hidden md:block'
      : 'block md:hidden';

  return (
    <aside
      aria-label={config.label || 'Sponsored Video'}
      data-testid={`vast-in-article-ad-${placementKey}`}
      data-after-paragraph={afterParagraph}
      className={`no-print my-6 w-full max-w-full min-w-0 clear-both ${deviceVisibilityClass} ${className}`}
    >
      <div className="theme-card w-full max-w-full border p-3 sm:p-4 shadow-2xs overflow-hidden">
        <div
          className="flex items-center justify-between gap-2 pb-1.5 mb-2.5 border-b text-[10px] font-semibold uppercase tracking-wider"
          style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{config.label || 'Sponsored Video'}</span>
          </span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono border shrink-0"
            style={{
              backgroundColor: 'var(--app-body-bg)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-muted-text)'
            }}
          >
            VIDEO AD
          </span>
        </div>

        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={vastAd.mediaFile.url}
            playsInline
            muted={isMuted}
            preload="metadata"
            className="w-full h-full object-contain"
          />

          {/* Sibling ClickThrough overlay (non-overlapping with bottom control bar) */}
          {vastAd.clickThroughUrl && !needsUserPlayTap && (
            <a
              href={vastAd.clickThroughUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={handleAdClickThrough}
              data-testid={`vast-clickthrough-overlay-${placementKey}`}
              aria-label="Visit advertiser site"
              className="absolute inset-x-0 top-0 bottom-12 z-10 cursor-pointer"
            />
          )}

          {/* Tap-to-play overlay when autoplay is blocked by browser policy */}
          {needsUserPlayTap && (
            <button
              type="button"
              onClick={togglePlayPause}
              data-testid={`vast-play-tap-${placementKey}`}
              aria-label="Play sponsored video"
              className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 text-white cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-600 text-xs font-bold shadow-md">
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Play Video Ad</span>
              </span>
            </button>
          )}

          {/* Sibling Bottom Controls Bar (never triggers advertiser click-through) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 z-20 p-2 sm:p-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-wrap items-center justify-between gap-2 text-white text-xs"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlayPause}
                data-testid={`vast-play-toggle-${placementKey}`}
                aria-label={status === 'playing' ? 'Pause video ad' : 'Play video ad'}
                className="p-1.5 rounded-md bg-black/65 hover:bg-black/85 cursor-pointer"
              >
                {status === 'playing' ? (
                  <Pause className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Play className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                data-testid={`vast-mute-toggle-${placementKey}`}
                aria-label={isMuted ? 'Unmute video ad' : 'Mute video ad'}
                className="p-1.5 rounded-md bg-black/65 hover:bg-black/85 cursor-pointer"
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                )}
              </button>

              {!isMuted && (
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Video advertisement volume"
                  className="w-16 sm:w-20 accent-teal-400 cursor-pointer"
                />
              )}

              {effectiveDuration > 0 && (
                <span className="text-[11px] font-mono opacity-90 tabular-nums">
                  {Math.max(0, Math.ceil(effectiveDuration - currentTime))}s
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {vastAd.clickThroughUrl && (
                <a
                  href={vastAd.clickThroughUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  onClick={handleAdClickThrough}
                  data-testid={`vast-clickthrough-cta-${placementKey}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-[11px] font-bold whitespace-nowrap"
                >
                  <span>Learn More</span>
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
              )}

              {/* Strict VAST 3.0 skipoffset rule: render Skip UI only when VAST permits skipping */}
              {skipOffsetSeconds !== null &&
                (canSkip ? (
                  <button
                    type="button"
                    onClick={handleSkipAd}
                    data-testid={`vast-skip-btn-${placementKey}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-slate-900 hover:bg-slate-100 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                  >
                    <span>Skip Ad</span>
                    <SkipForward className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </button>
                ) : (
                  <span
                    data-testid={`vast-skip-countdown-${placementKey}`}
                    className="px-2.5 py-1 rounded-md bg-black/75 text-[11px] font-medium tabular-nums whitespace-nowrap"
                  >
                    Skip in {secondsUntilSkip}s
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
