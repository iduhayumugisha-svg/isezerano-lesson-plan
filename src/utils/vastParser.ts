import { INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN } from './inArticleAdUtils';

export interface VastMediaFile {
  url: string;
  type: string;
  width: number;
  height: number;
  bitrate: number;
}

export type VastTrackingEventName =
  | 'creativeView'
  | 'start'
  | 'firstQuartile'
  | 'midpoint'
  | 'thirdQuartile'
  | 'complete'
  | 'mute'
  | 'unmute'
  | 'pause'
  | 'resume'
  | 'skip';

export interface ResolvedVastAd {
  adId?: string;
  impressions: string[];
  errors: string[];
  mediaFile: VastMediaFile;
  durationSeconds: number;
  skipOffsetSeconds: number | null;
  clickThroughUrl: string | null;
  clickTrackingUrls: string[];
  tracking: Partial<Record<VastTrackingEventName, string[]>>;
}

const MAX_WRAPPER_DEPTH = 5;
const VAST_FETCH_TIMEOUT_MS = 8000;
const MAX_VAST_XML_BYTES = 512 * 1024;

const isBlockedIpv4Octets = (octets: number[]): boolean => {
  if (octets.length !== 4 || octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
};

export const parseIpv6Hextets = (literal: string): number[] | null => {
  const clean = literal.split('%')[0].toLowerCase();
  const doubleColonParts = clean.split('::');
  if (doubleColonParts.length > 2) return null;

  const parseSegmentList = (seg: string): number[] | null => {
    if (!seg) return [];
    const parts = seg.split(':');
    const out: number[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) return null;
      if (part.includes('.')) {
        if (i !== parts.length - 1) return null;
        const v4 = part.split('.');
        if (v4.length !== 4 || v4.some((o) => !/^\d{1,3}$/.test(o))) return null;
        const octets = v4.map(Number);
        if (octets.some((n) => n < 0 || n > 255)) return null;
        out.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
        out.push(parseInt(part, 16));
      }
    }
    return out;
  };

  if (doubleColonParts.length === 1) {
    const groups = parseSegmentList(doubleColonParts[0]);
    return groups && groups.length === 8 ? groups : null;
  }

  const left = parseSegmentList(doubleColonParts[0]);
  const right = parseSegmentList(doubleColonParts[1]);
  if (!left || !right) return null;
  const missing = 8 - (left.length + right.length);
  if (missing < 1) return null;
  return [...left, ...Array(missing).fill(0), ...right];
};

const isBlockedIpv6Literal = (ipv6WithOrWithoutBrackets: string): boolean => {
  const unbracketed = ipv6WithOrWithoutBrackets.replace(/^\[|\]$/g, '');
  const h = parseIpv6Hextets(unbracketed);
  if (!h) return true;

  const isAllZeroPrefix64 = h[0] === 0 && h[1] === 0 && h[2] === 0 && h[3] === 0;
  const isUnspecified = isAllZeroPrefix64 && h[4] === 0 && h[5] === 0 && h[6] === 0 && h[7] === 0;
  const isLoopback = isAllZeroPrefix64 && h[4] === 0 && h[5] === 0 && h[6] === 0 && h[7] === 1;
  if (isUnspecified || isLoopback) return true;

  // Unique Local Addresses (fc00::/7)
  if ((h[0] & 0xfe00) === 0xfc00) return true;

  // Link-Local Unicast (fe80::/10)
  if ((h[0] & 0xffc0) === 0xfe80) return true;

  // Multicast (ff00::/8)
  if ((h[0] & 0xff00) === 0xff00) return true;

  // IPv4-mapped (::ffff:0:0/96) & IPv4-compatible (::/96)
  const isIpv4Mapped = isAllZeroPrefix64 && h[4] === 0 && h[5] === 0xffff;
  const isIpv4Compatible = isAllZeroPrefix64 && h[4] === 0 && h[5] === 0;
  if (isIpv4Mapped || isIpv4Compatible) {
    const mappedOctets = [(h[6] >> 8) & 0xff, h[6] & 0xff, (h[7] >> 8) & 0xff, h[7] & 0xff];
    return isBlockedIpv4Octets(mappedOctets);
  }

  return false;
};

const isPrivateOrLocalHostname = (rawHostname: string): boolean => {
  const host = rawHostname.trim().toLowerCase();
  if (!host) return true;

  // Only inspect IPv6 address rules for bracketed IPv6 literals or colon-separated literals
  if ((host.startsWith('[') && host.endsWith(']')) || host.includes(':')) {
    return isBlockedIpv6Literal(host);
  }

  if (
    !host.includes('.') ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  if (/^(?:\d+|0x[0-9a-f]+)$/i.test(host)) {
    return true;
  }

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return isBlockedIpv4Octets(ipv4Match.slice(1).map(Number));
  }

  return false;
};

/**
 * Canonical HTTPS-only validator applied uniformly across initial VAST tag URLs,
 * Wrapper VASTAdTagURI redirects, MediaFile URLs, ClickThrough, ClickTracking,
 * Impression, Error, and Tracking URLs.
 */
export const isSafeVastHttpsUrl = (rawUrl: unknown, maxLen = 2048): boolean => {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > maxLen) return false;
  if (!/^https:\/\/[^\s<>"']+$/i.test(trimmed)) return false;
  if (INTRUSIVE_POPUNDER_SCRIPT_SRC_PATTERN.test(trimmed)) return false;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (isPrivateOrLocalHostname(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
};

export const parseVastTimeToSeconds = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const ms = match[4] ? Number(match[4].padEnd(3, '0')) / 1000 : 0;
  if (minutes >= 60 || seconds >= 60) return null;
  return hours * 3600 + minutes * 60 + seconds + ms;
};

export const parseVastSkipOffset = (
  raw: string | null | undefined,
  durationSeconds: number
): number | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.endsWith('%')) {
    const pct = Number(trimmed.slice(0, -1));
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100 || durationSeconds <= 0) {
      return null;
    }
    const computed = (durationSeconds * pct) / 100;
    return computed < durationSeconds ? computed : null;
  }

  const secs = parseVastTimeToSeconds(trimmed);
  if (secs === null || secs < 0) return null;
  if (durationSeconds > 0 && secs >= durationSeconds) {
    return null;
  }
  return secs;
};

const getDirectChildElements = (parent: Element, localName: string): Element[] =>
  Array.from(parent.children).filter(
    (el) => (el.localName || el.tagName).toLowerCase() === localName.toLowerCase()
  );

const collectSafeHttpsUrls = (elements: Element[]): string[] =>
  elements
    .map((el) => (el.textContent || '').trim())
    .filter((url) => isSafeVastHttpsUrl(url));

const mergeTracking = (
  target: Partial<Record<VastTrackingEventName, string[]>>,
  source: Partial<Record<VastTrackingEventName, string[]>>
): void => {
  (Object.keys(source) as VastTrackingEventName[]).forEach((key) => {
    const list = source[key];
    if (!list?.length) return;
    target[key] = [...(target[key] || []), ...list];
  });
};

const SUPPORTED_TRACKING_EVENTS = new Set<VastTrackingEventName>([
  'creativeView',
  'start',
  'firstQuartile',
  'midpoint',
  'thirdQuartile',
  'complete',
  'mute',
  'unmute',
  'pause',
  'resume',
  'skip'
]);

const extractLinearTracking = (
  linearEl: Element
): {
  tracking: Partial<Record<VastTrackingEventName, string[]>>;
  clickThroughUrl: string | null;
  clickTrackingUrls: string[];
} => {
  const tracking: Partial<Record<VastTrackingEventName, string[]>> = {};
  for (const group of getDirectChildElements(linearEl, 'TrackingEvents')) {
    for (const node of getDirectChildElements(group, 'Tracking')) {
      const eventName = (node.getAttribute('event') || '').trim() as VastTrackingEventName;
      const url = (node.textContent || '').trim();
      if (SUPPORTED_TRACKING_EVENTS.has(eventName) && isSafeVastHttpsUrl(url)) {
        tracking[eventName] = [...(tracking[eventName] || []), url];
      }
    }
  }

  let clickThroughUrl: string | null = null;
  const clickTrackingUrls: string[] = [];
  for (const vc of getDirectChildElements(linearEl, 'VideoClicks')) {
    for (const ct of getDirectChildElements(vc, 'ClickThrough')) {
      const ctUrl = (ct.textContent || '').trim();
      if (!clickThroughUrl && isSafeVastHttpsUrl(ctUrl)) {
        clickThroughUrl = ctUrl;
      }
    }
    clickTrackingUrls.push(...collectSafeHttpsUrls(getDirectChildElements(vc, 'ClickTracking')));
  }

  return { tracking, clickThroughUrl, clickTrackingUrls };
};

const selectPlayableMediaFile = (
  linearEl: Element,
  preferredMaxWidth: number
): VastMediaFile | null => {
  const mediaFilesContainer = getDirectChildElements(linearEl, 'MediaFiles')[0];
  if (!mediaFilesContainer) return null;

  const probeVideo =
    typeof document !== 'undefined' && typeof document.createElement === 'function'
      ? document.createElement('video')
      : null;

  const candidates: VastMediaFile[] = getDirectChildElements(mediaFilesContainer, 'MediaFile')
    .map((node) => ({
      url: (node.textContent || '').trim(),
      type: (node.getAttribute('type') || '').trim().toLowerCase(),
      apiFramework: (node.getAttribute('apiFramework') || '').trim().toLowerCase(),
      width: Number(node.getAttribute('width')) || 0,
      height: Number(node.getAttribute('height')) || 0,
      bitrate: Number(node.getAttribute('bitrate')) || 0
    }))
    .filter((file) => {
      if (!isSafeVastHttpsUrl(file.url)) return false;
      // Never allow VPAID/SIMID or executable JS/Flash media files
      if (file.apiFramework === 'vpaid' || file.apiFramework === 'simid') return false;
      if (
        file.type.includes('javascript') ||
        file.type.includes('ecmascript') ||
        file.type.includes('flash') ||
        file.type.includes('html')
      ) {
        return false;
      }
      if (file.type !== 'video/mp4' && file.type !== 'video/webm') return false;
      if (probeVideo && typeof probeVideo.canPlayType === 'function') {
        const support = probeVideo.canPlayType(file.type);
        const ua =
          (typeof window !== 'undefined' ? window.navigator?.userAgent || '' : '') ||
          (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
        // JSDOM returns '' for canPlayType, whereas real browsers return 'probably'/'maybe'
        if (support === '' && !/jsdom/i.test(ua)) {
          return false;
        }
      }
      return true;
    })
    .map(({ apiFramework: _af, ...rest }) => rest);

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const aMp4 = a.type === 'video/mp4' ? 1 : 0;
    const bMp4 = b.type === 'video/mp4' ? 1 : 0;
    if (aMp4 !== bMp4) return bMp4 - aMp4;
    const aDiff = Math.abs((a.width || preferredMaxWidth) - preferredMaxWidth);
    const bDiff = Math.abs((b.width || preferredMaxWidth) - preferredMaxWidth);
    return aDiff - bDiff;
  });

  return candidates[0];
};

export function fireVastTrackingBeacons(
  urls: string[] = [],
  macros: Record<string, string> = {}
): void {
  if (typeof window === 'undefined' || urls.length === 0) return;

  for (const rawUrl of urls) {
    const trimmed = rawUrl.trim();
    if (!isSafeVastHttpsUrl(trimmed)) continue;

    const expanded = trimmed.replace(/\[([A-Z0-9_]+)\]/g, (_match, key: string) =>
      encodeURIComponent(macros[key] ?? '')
    );

    if (!isSafeVastHttpsUrl(expanded)) continue;

    try {
      const ImgCtor = typeof Image !== 'undefined' ? Image : window.Image;
      if (!ImgCtor) continue;
      const img = new ImgCtor(1, 1);
      img.referrerPolicy = 'no-referrer-when-downgrade';
      img.src = expanded;
    } catch {
      // Never interrupt reading or video playback on individual beacon errors
    }
  }
}

export interface FetchVastOptions {
  signal?: AbortSignal;
  preferredMaxWidth?: number;
}

export async function fetchAndParseVast(
  vastUrl: string,
  options: FetchVastOptions = {},
  depth = 0,
  visited = new Set<string>(),
  inherited: {
    impressions: string[];
    errors: string[];
    tracking: Partial<Record<VastTrackingEventName, string[]>>;
    clickTrackingUrls: string[];
  } = {
    impressions: [],
    errors: [],
    tracking: {},
    clickTrackingUrls: []
  }
): Promise<ResolvedVastAd | null> {
  if (!isSafeVastHttpsUrl(vastUrl)) {
    return null;
  }
  if (depth > MAX_WRAPPER_DEPTH || visited.has(vastUrl)) {
    fireVastTrackingBeacons(inherited.errors, { ERRORCODE: '302' });
    return null;
  }
  visited.add(vastUrl);

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), VAST_FETCH_TIMEOUT_MS);
  const onParentAbort = () => timeoutController.abort();
  options.signal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    const res = await fetch(vastUrl, {
      method: 'GET',
      signal: timeoutController.signal,
      credentials: 'omit',
      cache: 'no-store'
    });

    // Post-fetch gate: discard response if browser HTTP redirects landed on a disallowed final URL
    if (res.url && !isSafeVastHttpsUrl(res.url)) {
      fireVastTrackingBeacons(inherited.errors, { ERRORCODE: '301' });
      return null;
    }

    if (!res.ok) {
      fireVastTrackingBeacons(inherited.errors, { ERRORCODE: '301' });
      return null;
    }

    const xmlText = await res.text();
    if (!xmlText.trim() || xmlText.length > MAX_VAST_XML_BYTES) {
      fireVastTrackingBeacons(inherited.errors, { ERRORCODE: '100' });
      return null;
    }

    const ParserCtor =
      typeof DOMParser !== 'undefined'
        ? DOMParser
        : typeof window !== 'undefined'
        ? window.DOMParser
        : undefined;
    if (!ParserCtor) return null;

    const xmlDoc = new ParserCtor().parseFromString(xmlText, 'text/xml');
    if (xmlDoc.querySelector('parsererror')) {
      fireVastTrackingBeacons(inherited.errors, { ERRORCODE: '100' });
      return null;
    }

    const vastRoot = xmlDoc.documentElement;
    if (!vastRoot || (vastRoot.localName || vastRoot.tagName).toLowerCase() !== 'vast') {
      fireVastTrackingBeacons(inherited.errors, { ERRORCODE: '101' });
      return null;
    }

    const rootErrors = collectSafeHttpsUrls(getDirectChildElements(vastRoot, 'Error'));
    const adNodes = getDirectChildElements(vastRoot, 'Ad');
    if (adNodes.length === 0) {
      const noAdErrors = [...inherited.errors, ...rootErrors];
      if (noAdErrors.length > 0) {
        fireVastTrackingBeacons(noAdErrors, { ERRORCODE: depth > 0 ? '303' : '303' });
      }
      return null;
    }

    let sawAnyMediaFailure = false;

    for (const adNode of adNodes) {
      const adId = adNode.getAttribute('id') || undefined;
      const wrapper = getDirectChildElements(adNode, 'Wrapper')[0];
      if (wrapper) {
        const wrapperErrors = [
          ...inherited.errors,
          ...rootErrors,
          ...collectSafeHttpsUrls(getDirectChildElements(wrapper, 'Error'))
        ];
        const nextUrl = collectSafeHttpsUrls(getDirectChildElements(wrapper, 'VASTAdTagURI'))[0];
        if (!nextUrl) {
          fireVastTrackingBeacons(wrapperErrors, { ERRORCODE: '301' });
          continue;
        }

        const nextTracking: Partial<Record<VastTrackingEventName, string[]>> = {};
        mergeTracking(nextTracking, inherited.tracking);
        const nextClickTracking = [...inherited.clickTrackingUrls];

        const wrapperCreatives = getDirectChildElements(wrapper, 'Creatives')[0];
        if (wrapperCreatives) {
          for (const creative of getDirectChildElements(wrapperCreatives, 'Creative')) {
            const linear = getDirectChildElements(creative, 'Linear')[0];
            if (linear) {
              const extracted = extractLinearTracking(linear);
              mergeTracking(nextTracking, extracted.tracking);
              nextClickTracking.push(...extracted.clickTrackingUrls);
            }
          }
        }

        const resolved = await fetchAndParseVast(
          nextUrl,
          options,
          depth + 1,
          visited,
          {
            impressions: [
              ...inherited.impressions,
              ...collectSafeHttpsUrls(getDirectChildElements(wrapper, 'Impression'))
            ],
            errors: wrapperErrors,
            tracking: nextTracking,
            clickTrackingUrls: nextClickTracking
          }
        );
        if (resolved) return resolved;
        continue;
      }

      const inline = getDirectChildElements(adNode, 'InLine')[0];
      if (!inline) continue;

      const impressions = [
        ...inherited.impressions,
        ...collectSafeHttpsUrls(getDirectChildElements(inline, 'Impression'))
      ];
      const errors = [
        ...inherited.errors,
        ...rootErrors,
        ...collectSafeHttpsUrls(getDirectChildElements(inline, 'Error'))
      ];

      const creativesEl = getDirectChildElements(inline, 'Creatives')[0];
      if (!creativesEl) continue;

      for (const creative of getDirectChildElements(creativesEl, 'Creative')) {
        const linear = getDirectChildElements(creative, 'Linear')[0];
        if (!linear) continue;

        const mediaFile = selectPlayableMediaFile(
          linear,
          options.preferredMaxWidth || 1280
        );
        if (!mediaFile) {
          sawAnyMediaFailure = true;
          fireVastTrackingBeacons(errors, { ERRORCODE: '403' });
          continue;
        }

        const durationText =
          getDirectChildElements(linear, 'Duration')[0]?.textContent || '';
        const durationSeconds = parseVastTimeToSeconds(durationText) || 0;
        const skipOffsetSeconds = parseVastSkipOffset(
          linear.getAttribute('skipoffset'),
          durationSeconds
        );

        const inlineLinear = extractLinearTracking(linear);
        const mergedTracking: Partial<Record<VastTrackingEventName, string[]>> = {};
        mergeTracking(mergedTracking, inherited.tracking);
        mergeTracking(mergedTracking, inlineLinear.tracking);

        return {
          adId,
          impressions,
          errors,
          mediaFile,
          durationSeconds,
          skipOffsetSeconds,
          clickThroughUrl: inlineLinear.clickThroughUrl,
          clickTrackingUrls: [
            ...inherited.clickTrackingUrls,
            ...inlineLinear.clickTrackingUrls
          ],
          tracking: mergedTracking
        };
      }
    }

    if (!sawAnyMediaFailure) {
      fireVastTrackingBeacons([...inherited.errors, ...rootErrors], { ERRORCODE: '403' });
    }
    return null;
  } catch (err: any) {
    if (err?.name !== 'AbortError' || !options.signal?.aborted) {
      fireVastTrackingBeacons(inherited.errors, { ERRORCODE: '301' });
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', onParentAbort);
  }
}
