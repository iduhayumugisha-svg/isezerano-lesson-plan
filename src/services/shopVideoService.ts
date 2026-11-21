import {
  DEFAULT_TOP_VIDEO_AD_CONFIG,
  ShopVideoConfig,
  TopVideoAdConfig,
  TopVideoAdDisplaySettings
} from '../types/platform';
import { normalizeTopVideoAdDisplaySettings } from '../utils/displaySettingsUtils';

export interface ParsedVimeoUrl {
  valid: boolean;
  videoId?: string;
  hash?: string;
  canonicalUrl?: string;
  playerEmbedUrl?: string;
  error?: string;
}

function sanitizeSafeHttpsUrl(raw: unknown, allowedHosts?: string[]): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return undefined;
    if (allowedHosts && allowedHosts.length > 0) {
      const host = parsed.hostname.toLowerCase();
      const matched = allowedHosts.some(
        (allowed) => host === allowed || host.endsWith(`.${allowed}`)
      );
      if (!matched) return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Validates a Vimeo video URL and extracts its numeric Vimeo video ID (plus optional unlisted ?h= hash).
 * Supports standard links (https://vimeo.com/1248666228), unlisted hash links
 * (https://vimeo.com/1248666228/abcdef1234), channel/group/manage paths, and player.vimeo.com/video/<id>.
 */
export function parseVimeoVideoUrl(rawInput: string): ParsedVimeoUrl {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Please paste a Vimeo video link (for example: https://vimeo.com/1248666228).'
    };
  }

  // Reject unsafe schemes immediately before attempting URL normalization
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      error: 'Please enter a valid https://vimeo.com/... video URL.'
    };
  }

  const normalizedInput = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(normalizedInput);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Example: https://vimeo.com/1248666228'
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      error: 'Vimeo Video URL must use https://.'
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isVimeoWebHost = host === 'vimeo.com' || host === 'www.vimeo.com';
  const isVimeoPlayerHost = host === 'player.vimeo.com';

  if (!isVimeoWebHost && !isVimeoPlayerHost) {
    return {
      valid: false,
      error: 'Only official Vimeo links (vimeo.com or player.vimeo.com) are supported.'
    };
  }

  const segments = parsed.pathname
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  let videoId = '';
  let hash = '';

  if (isVimeoPlayerHost) {
    // e.g. /video/1248666228
    const videoIdx = segments.findIndex((seg) => seg.toLowerCase() === 'video');
    if (videoIdx !== -1 && /^\d{4,20}$/.test(segments[videoIdx + 1] || '')) {
      videoId = segments[videoIdx + 1];
    } else if (segments.length === 1 && /^\d{4,20}$/.test(segments[0])) {
      videoId = segments[0];
    }
    const hParam = (parsed.searchParams.get('h') || '').trim();
    if (/^[a-zA-Z0-9_-]{4,64}$/.test(hParam)) {
      hash = hParam;
    }
  } else {
    // vimeo.com/<id>, vimeo.com/<id>/<hash>, vimeo.com/channels/<name>/<id>,
    // vimeo.com/groups/<name>/videos/<id>, vimeo.com/manage/videos/<id>, vimeo.com/video/<id>
    for (let i = 0; i < segments.length; i++) {
      if (/^\d{4,20}$/.test(segments[i])) {
        videoId = segments[i];
        const nextSeg = segments[i + 1] || '';
        if (/^[a-zA-Z0-9_-]{6,64}$/.test(nextSeg) && !/^\d+$/.test(nextSeg)) {
          hash = nextSeg;
        }
        break;
      }
    }
    if (!hash) {
      const hParam = (parsed.searchParams.get('h') || '').trim();
      if (/^[a-zA-Z0-9_-]{4,64}$/.test(hParam)) {
        hash = hParam;
      }
    }
  }

  if (!videoId) {
    return {
      valid: false,
      error: 'Could not find a valid numeric Vimeo Video ID in that link. Example: https://vimeo.com/1248666228'
    };
  }

  const canonicalUrl = hash
    ? `https://vimeo.com/${videoId}/${hash}`
    : `https://vimeo.com/${videoId}`;
  const playerEmbedUrl = hash
    ? `https://player.vimeo.com/video/${videoId}?h=${encodeURIComponent(hash)}`
    : `https://player.vimeo.com/video/${videoId}`;

  return {
    valid: true,
    videoId,
    ...(hash ? { hash } : {}),
    canonicalUrl,
    playerEmbedUrl
  };
}

export function buildVimeoPlayerEmbedUrl(
  video: Pick<ShopVideoConfig, 'videoId' | 'playerEmbedUrl'>
): string {
  const cleanId = String(video.videoId || '').trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cleanId)) {
    return '';
  }

  const safeExisting = sanitizeSafeHttpsUrl(video.playerEmbedUrl, ['player.vimeo.com']);
  if (safeExisting) {
    try {
      const url = new URL(safeExisting);
      const hashParam = url.searchParams.get('h');
      const base = `https://player.vimeo.com/video/${cleanId}`;
      return hashParam ? `${base}?h=${encodeURIComponent(hashParam)}` : base;
    } catch {
      return `https://player.vimeo.com/video/${cleanId}`;
    }
  }

  return `https://player.vimeo.com/video/${cleanId}`;
}

export function createShopVideoConfigFromUrl(options: {
  url: string;
  title?: string;
  published?: boolean;
  existing?: ShopVideoConfig | null;
}): { success: boolean; video?: ShopVideoConfig; error?: string } {
  const parsed = parseVimeoVideoUrl(options.url);
  if (!parsed.valid || !parsed.videoId || !parsed.playerEmbedUrl || !parsed.canonicalUrl) {
    return {
      success: false,
      error: parsed.error || 'Please enter a valid Vimeo video URL.'
    };
  }

  const nowIso = new Date().toISOString();
  const cleanTitle = (options.title || '').trim().slice(0, 128) || 'Featured Shop Video';
  const sameVideo = options.existing?.videoId === parsed.videoId;

  const video = normalizeShopVideoConfig({
    videoId: parsed.videoId,
    vimeoUri: `/videos/${parsed.videoId}`,
    playerEmbedUrl: parsed.playerEmbedUrl,
    vimeoLink: parsed.canonicalUrl,
    title: cleanTitle,
    thumbnailUrl: sameVideo ? options.existing?.thumbnailUrl : undefined,
    durationSeconds: sameVideo ? options.existing?.durationSeconds : undefined,
    published: options.published !== undefined ? options.published : true,
    status: 'ready',
    uploadedAt: sameVideo && options.existing?.uploadedAt ? options.existing.uploadedAt : nowIso,
    updatedAt: nowIso
  });

  if (!video) {
    return { success: false, error: 'Could not construct valid Vimeo video settings.' };
  }

  return { success: true, video };
}

export function normalizeShopVideoConfig(raw: unknown): ShopVideoConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const videoId = typeof record.videoId === 'string' ? record.videoId.trim() : '';
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(videoId)) {
    return null;
  }

  const playerEmbedUrl = buildVimeoPlayerEmbedUrl({
    videoId,
    playerEmbedUrl: typeof record.playerEmbedUrl === 'string' ? record.playerEmbedUrl : ''
  });
  if (!playerEmbedUrl) return null;

  const vimeoUri =
    typeof record.vimeoUri === 'string' && record.vimeoUri.trim().startsWith('/videos/')
      ? record.vimeoUri.trim()
      : `/videos/${videoId}`;

  const rawTitle = typeof record.title === 'string' ? record.title.trim() : '';
  const title = (rawTitle || 'Featured Shop Video').slice(0, 128);

  const rawStatus = record.status;
  const status: ShopVideoConfig['status'] =
    rawStatus === 'processing' || rawStatus === 'error' ? rawStatus : 'ready';

  const durationRaw = Number(record.durationSeconds);
  const durationSeconds =
    Number.isFinite(durationRaw) && durationRaw >= 0 ? Math.round(durationRaw) : undefined;

  const vimeoLink =
    sanitizeSafeHttpsUrl(record.vimeoLink, ['vimeo.com']) || `https://vimeo.com/${videoId}`;
  const thumbnailUrl = sanitizeSafeHttpsUrl(record.thumbnailUrl);

  const nowIso = new Date().toISOString();
  const uploadedAt =
    typeof record.uploadedAt === 'string' && record.uploadedAt.trim()
      ? record.uploadedAt.trim()
      : nowIso;
  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt.trim()
      ? record.updatedAt.trim()
      : uploadedAt;

  return {
    videoId,
    vimeoUri,
    playerEmbedUrl,
    vimeoLink,
    title,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
    published: Boolean(record.published),
    status,
    uploadedAt,
    updatedAt
  };
}

export function normalizeTopVideoAdConfig(raw: unknown): TopVideoAdConfig {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_TOP_VIDEO_AD_CONFIG,
      displaySettings: normalizeTopVideoAdDisplaySettings(null)
    };
  }

  const record = raw as Record<string, unknown>;
  const rawUrl = typeof record.vimeoUrl === 'string' ? record.vimeoUrl.trim() : '';
  const rawVideoId = typeof record.videoId === 'string' ? record.videoId.trim() : '';

  const parsedFromUrl = rawUrl ? parseVimeoVideoUrl(rawUrl) : null;
  const parsedFromId =
    !parsedFromUrl?.valid && /^\d{4,20}$/.test(rawVideoId)
      ? parseVimeoVideoUrl(`https://vimeo.com/${rawVideoId}`)
      : null;

  const resolved = parsedFromUrl?.valid ? parsedFromUrl : parsedFromId;
  const title = typeof record.title === 'string' ? record.title.trim().slice(0, 128) : '';
  const label =
    typeof record.label === 'string' && record.label.trim()
      ? record.label.trim().slice(0, 48)
      : 'Sponsored Video';
  const displaySettings = normalizeTopVideoAdDisplaySettings(
    (record.displaySettings as Partial<TopVideoAdDisplaySettings> | undefined) || null
  );
  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt.trim()
      ? record.updatedAt.trim()
      : undefined;

  if (!resolved?.valid || !resolved.videoId || !resolved.playerEmbedUrl || !resolved.canonicalUrl) {
    return {
      ...DEFAULT_TOP_VIDEO_AD_CONFIG,
      enabled: false,
      title,
      label,
      displaySettings,
      ...(updatedAt ? { updatedAt } : {})
    };
  }

  return {
    enabled: Boolean(record.enabled),
    vimeoUrl: resolved.canonicalUrl,
    videoId: resolved.videoId,
    playerEmbedUrl: buildVimeoPlayerEmbedUrl({
      videoId: resolved.videoId,
      playerEmbedUrl:
        typeof record.playerEmbedUrl === 'string' && record.playerEmbedUrl.trim()
          ? record.playerEmbedUrl
          : resolved.playerEmbedUrl
    }),
    title,
    label,
    displaySettings,
    ...(updatedAt ? { updatedAt } : {})
  };
}

export function createTopVideoAdConfigFromUrl(options: {
  url: string;
  enabled?: boolean;
  title?: string;
  label?: string;
  displaySettings?: Partial<TopVideoAdDisplaySettings> | null;
}): { success: boolean; videoAd?: TopVideoAdConfig; error?: string } {
  const parsed = parseVimeoVideoUrl(options.url);
  if (!parsed.valid || !parsed.videoId || !parsed.canonicalUrl || !parsed.playerEmbedUrl) {
    return {
      success: false,
      error: parsed.error || 'Please enter a valid Vimeo Video URL.'
    };
  }

  return {
    success: true,
    videoAd: {
      enabled: options.enabled !== undefined ? Boolean(options.enabled) : true,
      vimeoUrl: parsed.canonicalUrl,
      videoId: parsed.videoId,
      playerEmbedUrl: parsed.playerEmbedUrl,
      title: (options.title || '').trim().slice(0, 128),
      label: (options.label || '').trim().slice(0, 48) || 'Sponsored Video',
      displaySettings: normalizeTopVideoAdDisplaySettings(options.displaySettings),
      updatedAt: new Date().toISOString()
    }
  };
}
