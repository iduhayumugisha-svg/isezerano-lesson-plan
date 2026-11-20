import React, { useEffect, useMemo, useRef, useState } from 'react';
import Player from '@vimeo/player';
import {
  AlertTriangle,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { ShopVideoConfig } from '../types/platform';
import { buildVimeoPlayerEmbedUrl } from '../services/shopVideoService';

const PLAYBACK_RATES = [0.5, 1, 1.5, 2] as const;

interface ShopVimeoPlayerProps {
  video: Pick<ShopVideoConfig, 'videoId' | 'playerEmbedUrl' | 'title' | 'thumbnailUrl'>;
  autoPlay?: boolean;
  className?: string;
  playerLabel?: string;
  fallbackNote?: string;
  compact?: boolean;
}

export const ShopVimeoPlayer: React.FC<ShopVimeoPlayerProps> = ({
  video,
  autoPlay = true,
  className = '',
  playerLabel = 'Shop',
  fallbackNote = 'All featured products listed below remain ready for ordering via WhatsApp or Phone.',
  compact = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [hasEnded, setHasEnded] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [speedNotice, setSpeedNotice] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const embedUrl = useMemo(() => buildVimeoPlayerEmbedUrl(video), [video]);

  useEffect(() => {
    setIsReady(false);
    setIsPlaying(false);
    setIsMuted(true);
    setHasEnded(false);
    setPlaybackRate(1);
    setSpeedNotice(null);
    setAutoplayBlocked(false);
    setPlayerError(null);

    const mountNode = containerRef.current;
    if (!mountNode || !embedUrl || !embedUrl.startsWith('https://player.vimeo.com/video/')) {
      setPlayerError('Vimeo video embed URL is unavailable.');
      return;
    }

    let cancelled = false;
    mountNode.innerHTML = '';

    let player: Player | null = null;
    try {
      player = new Player(mountNode, {
        url: embedUrl as `https://player.vimeo.com/video/${string}`,
        autoplay: autoPlay,
        muted: true,
        controls: true,
        responsive: true,
        playsinline: true,
        dnt: true,
        title: false,
        byline: false,
        portrait: false
      });
      playerRef.current = player;
    } catch {
      setPlayerError('Unable to initialize Vimeo Player.');
      return;
    }

    player.on('play', () => {
      if (cancelled) return;
      setIsPlaying(true);
      setHasEnded(false);
      setAutoplayBlocked(false);
    });

    player.on('pause', () => {
      if (cancelled) return;
      setIsPlaying(false);
    });

    player.on('ended', () => {
      if (cancelled) return;
      setIsPlaying(false);
      setHasEnded(true);
    });

    player.on('volumechange', (data) => {
      if (cancelled) return;
      if (typeof data?.muted === 'boolean') {
        setIsMuted(data.muted);
      } else if (typeof data?.volume === 'number') {
        setIsMuted(data.volume === 0);
      }
    });

    player.on('playbackratechange', (data) => {
      if (cancelled) return;
      if (typeof data?.playbackRate === 'number') {
        setPlaybackRate(data.playbackRate);
      }
    });

    player.on('error', () => {
      if (cancelled) return;
      setPlayerError('Vimeo video could not be loaded right now.');
    });

    player
      .ready()
      .then(async () => {
        if (cancelled || !player) return;
        setIsReady(true);

        try {
          await player.setMuted(true);
          setIsMuted(true);
        } catch {
          // ignore
        }

        if (autoPlay) {
          try {
            await player.play();
            if (!cancelled) {
              setIsPlaying(true);
              setAutoplayBlocked(false);
            }
          } catch {
            if (!cancelled) {
              setAutoplayBlocked(true);
              setIsPlaying(false);
            }
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPlayerError('Video playback is temporarily unavailable from Vimeo.');
      });

    return () => {
      cancelled = true;
      playerRef.current = null;
      if (player) {
        player.destroy().catch(() => {});
      }
      if (mountNode) {
        mountNode.innerHTML = '';
      }
    };
  }, [embedUrl, autoPlay]);

  const handleTogglePlay = async () => {
    const player = playerRef.current;
    if (!player || playerError) return;
    try {
      if (isPlaying) {
        await player.pause();
      } else {
        await player.play();
        setAutoplayBlocked(false);
        setHasEnded(false);
      }
    } catch {
      setAutoplayBlocked(true);
    }
  };

  const handleToggleMute = async () => {
    const player = playerRef.current;
    if (!player || playerError) return;
    try {
      const nextMuted = !isMuted;
      await player.setMuted(nextMuted);
      if (!nextMuted) {
        await player.setVolume(1).catch(() => {});
      }
      setIsMuted(nextMuted);
    } catch {
      // ignore
    }
  };

  const handleReplay = async () => {
    const player = playerRef.current;
    if (!player || playerError) return;
    try {
      await player.setCurrentTime(0);
      await player.play();
      setHasEnded(false);
      setAutoplayBlocked(false);
    } catch {
      setAutoplayBlocked(true);
    }
  };

  const handleSetPlaybackRate = async (rate: number) => {
    const player = playerRef.current;
    if (!player || playerError) return;
    setSpeedNotice(null);
    try {
      const applied = await player.setPlaybackRate(rate);
      setPlaybackRate(typeof applied === 'number' ? applied : rate);
    } catch {
      setSpeedNotice('Playback speed controls depend on the Vimeo plan for this video.');
    }
  };

  return (
    <div
      data-testid="shop-vimeo-player"
      className={`w-full ${compact ? "rounded-xl" : "rounded-2xl"} overflow-hidden bg-slate-950 border border-slate-800 shadow-lg ${className}`}
    >
      {/* Reserved 16:9 container prevents layout shift (CLS = 0) */}
      <div className={`relative w-full aspect-video ${compact ? "" : "min-h-[180px]"} bg-slate-950 overflow-hidden`}>
        <div
          ref={containerRef}
          data-testid="shop-vimeo-mount"
          className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
        />

        {/* Loading indicator while iframe initializes */}
        {!isReady && !playerError && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 text-white gap-2">
            {video.thumbnailUrl && (
              <img
                src={video.thumbnailUrl}
                alt={video.title || 'Shop video preview'}
                className="absolute inset-0 w-full h-full object-cover opacity-35"
              />
            )}
            <div className="relative z-10 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" aria-hidden="true" />
              <span>Loading {playerLabel} video...</span>
            </div>
          </div>
        )}

        {/* Fallback play overlay if browser blocks autoplay */}
        {isReady && autoplayBlocked && !isPlaying && !playerError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/70 p-4 text-center">
            {video.thumbnailUrl && (
              <img
                src={video.thumbnailUrl}
                alt={video.title || `${playerLabel} video thumbnail`}
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
            )}
            <button
              type="button"
              onClick={handleTogglePlay}
              data-testid="shop-vimeo-autoplay-fallback-play"
              className="relative z-10 inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-extrabold shadow-xl cursor-pointer transition-transform active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" aria-hidden="true" />
              <span>Play {playerLabel} Video</span>
            </button>
            <p className="relative z-10 mt-2 text-xs text-slate-200 font-medium">
              Tap Play to watch {playerLabel.toLowerCase()} highlights.
            </p>
          </div>
        )}

        {/* Graceful Vimeo unavailable / processing fallback */}
        {playerError && (
          <div
            data-testid="shop-vimeo-error-fallback"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-5 text-center text-white"
          >
            {video.thumbnailUrl && (
              <img
                src={video.thumbnailUrl}
                alt={video.title || `${playerLabel} video thumbnail`}
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
            )}
            <div className="relative z-10 max-w-md space-y-2">
              <AlertTriangle className="w-7 h-7 text-amber-400 mx-auto" aria-hidden="true" />
              <p className="text-sm font-bold text-white">{playerError}</p>
              <p className="text-xs text-slate-300">
                {fallbackNote}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Player Controls Bar */}
      <div className={`${compact ? "px-1.5 py-1.5 flex-col items-stretch gap-1" : "px-3.5 py-2.5 flex-row items-center justify-between gap-2.5"} bg-slate-900 border-t border-slate-800 text-slate-100 flex flex-wrap`}>
        <div className={`flex flex-wrap items-center ${compact ? "justify-center gap-1" : "gap-2"}`}>
          <button
            type="button"
            onClick={handleTogglePlay}
            disabled={!isReady || Boolean(playerError)}
            data-testid="shop-vimeo-play-pause"
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className={`inline-flex items-center gap-1 ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-45 text-white text-[11px] font-extrabold cursor-pointer transition-colors`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            disabled={!isReady || Boolean(playerError)}
            data-testid="shop-vimeo-mute-toggle"
            aria-label={isMuted ? 'Turn sound on' : 'Mute sound'}
            className={`inline-flex items-center gap-1 ${compact ? "px-2 py-1" : "px-3 py-1.5"} rounded-lg text-[11px] font-bold border cursor-pointer transition-colors disabled:opacity-45 ${
              isMuted
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300'
            }`}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sound Off</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sound On</span>
              </>
            )}
          </button>

          {!compact && <button
            type="button"
            onClick={handleReplay}
            disabled={!isReady || Boolean(playerError)}
            data-testid="shop-vimeo-replay"
            aria-label="Replay video from beginning"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-slate-200 border border-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{hasEnded ? 'Watch Again' : 'Replay'}</span>
          </button>}
        </div>

        {/* Playback Speed Controls (0.5x, 1x, 1.5x, 2x) */}
        <div
          className={`flex items-center justify-center gap-0.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5 ${compact ? "w-full" : ""}`}
          role="group"
          aria-label="Playback speed"
        >
          <span className="px-1.5 text-[10px] font-bold text-slate-400">Speed</span>
          {PLAYBACK_RATES.map((rate) => {
            const active = Math.abs(playbackRate - rate) < 0.05;
            return (
              <button
                key={rate}
                type="button"
                onClick={() => handleSetPlaybackRate(rate)}
                disabled={!isReady || Boolean(playerError)}
                data-testid={`shop-vimeo-speed-${rate}`}
                className={`px-1.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-colors disabled:opacity-45 ${
                  active
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {rate}x
              </button>
            );
          })}
        </div>
      </div>

      {speedNotice && (
        <div className="px-3.5 py-1.5 bg-slate-950 border-t border-slate-800 text-[11px] text-amber-300">
          {speedNotice}
        </div>
      )}
    </div>
  );
};
