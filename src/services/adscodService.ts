import {
  ADSCOD_DWELL_ENDPOINT,
  ADSCOD_PLACEMENTS,
  ADSCOD_WORKER_URL,
  AdscodAd,
  AdscodDiagnosticsSnapshot,
  AdscodDwellStatus,
  AdscodFetchResult,
  AdscodPlacementDiagnostic,
  AdscodPlacementKey,
  AdscodServeResponse
} from '../types/adscod';

const PRODUCTION_ALLOWED_HOSTS = new Set(['isezerano.online', 'www.isezerano.online']);
const DEFAULT_SERVE_TIMEOUT_MS = 10000;

export interface FetchAdscodOptions {
  category?: string;
  q?: string;
  device?: 'MOBILE' | 'DESKTOP';
  limit?: number;
  signal?: AbortSignal;
  workerBaseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface AdscodDwellTrackerOptions {
  placement: AdscodPlacementKey;
  clickToken?: string;
  dwellEndpoint?: string;
  onStatusChange?: (status: AdscodDwellStatus) => void;
  sendBeaconImpl?: (url: string, data: BodyInit) => boolean;
  fetchImpl?: typeof fetch;
}

export interface AdscodDwellTrackerHandle {
  flush: () => void;
  dispose: () => void;
  getStatus: () => AdscodDwellStatus;
}

const diagnosticState: {
  placements: Record<AdscodPlacementKey, AdscodPlacementDiagnostic | null>;
  listeners: Set<(snapshot: AdscodDiagnosticsSnapshot) => void>;
} = {
  placements: {
    banner: null,
    inline: null
  },
  listeners: new Set()
};

const getCurrentOriginInfo = (): { currentOrigin: string; isProductionOrigin: boolean } => {
  if (typeof window === 'undefined' || !window.location) {
    return { currentOrigin: 'ssr', isProductionOrigin: false };
  }
  const currentOrigin = window.location.origin || '';
  const hostname = (window.location.hostname || '').toLowerCase();
  return {
    currentOrigin,
    isProductionOrigin: PRODUCTION_ALLOWED_HOSTS.has(hostname)
  };
};

export const getAdscodDiagnosticsSnapshot = (): AdscodDiagnosticsSnapshot => {
  const { currentOrigin, isProductionOrigin } = getCurrentOriginInfo();
  return {
    workerUrl: ADSCOD_WORKER_URL,
    dwellEndpoint: ADSCOD_DWELL_ENDPOINT,
    currentOrigin,
    isProductionOrigin,
    placements: {
      banner: diagnosticState.placements.banner
        ? { ...diagnosticState.placements.banner }
        : null,
      inline: diagnosticState.placements.inline
        ? { ...diagnosticState.placements.inline }
        : null
    }
  };
};

const notifyDiagnosticsListeners = (): void => {
  const snapshot = getAdscodDiagnosticsSnapshot();
  diagnosticState.listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // keep diagnostics resilient
    }
  });
};

export const subscribeToAdscodDiagnostics = (
  listener: (snapshot: AdscodDiagnosticsSnapshot) => void
): (() => void) => {
  diagnosticState.listeners.add(listener);
  listener(getAdscodDiagnosticsSnapshot());
  return () => {
    diagnosticState.listeners.delete(listener);
  };
};

const updatePlacementDiagnostic = (
  placement: AdscodPlacementKey,
  next: AdscodPlacementDiagnostic
): void => {
  const previousDwell = diagnosticState.placements[placement]?.dwell;
  diagnosticState.placements[placement] = {
    ...next,
    dwell: next.dwell || previousDwell
  };
  notifyDiagnosticsListeners();
};

const updatePlacementDwellDiagnostic = (
  placement: AdscodPlacementKey,
  dwell: AdscodDwellStatus
): void => {
  const existing = diagnosticState.placements[placement];
  if (!existing) {
    const info = ADSCOD_PLACEMENTS[placement];
    diagnosticState.placements[placement] = {
      placement,
      placementId: info.placementId,
      requestUrl: buildAdscodServeUrl(placement),
      httpStatus: 200,
      state: 'filled',
      hasClickToken: dwell.hasClickToken,
      checkedAt: new Date().toISOString(),
      dwell
    };
  } else {
    diagnosticState.placements[placement] = {
      ...existing,
      dwell
    };
  }
  notifyDiagnosticsListeners();
};

export const isValidAdscodClickUrl = (rawUrl: unknown): rawUrl is string => {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isSafeAdscodMediaUrl = (rawUrl: unknown): rawUrl is string => {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const extractUrlHost = (rawUrl: string): string => {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
};

export const detectAdscodDeviceType = (): 'MOBILE' | 'DESKTOP' => {
  if (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return 'MOBILE';
  }
  if (typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 768) {
    return 'MOBILE';
  }
  return 'DESKTOP';
};

export const buildAdscodServeUrl = (
  placement: AdscodPlacementKey,
  options: Pick<FetchAdscodOptions, 'category' | 'q' | 'device' | 'limit' | 'workerBaseUrl'> = {}
): string => {
  const info = ADSCOD_PLACEMENTS[placement];
  const base = (options.workerBaseUrl || ADSCOD_WORKER_URL).replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('placement', info.workerParam);
  params.set('limit', String(Math.min(3, Math.max(1, options.limit || 1))));
  params.set('device', options.device || detectAdscodDeviceType());

  const cleanCategory = (options.category || '').trim();
  if (cleanCategory && cleanCategory.toLowerCase() !== 'all categories') {
    params.set('category', cleanCategory.slice(0, 80));
  }

  const cleanQuery = (options.q || '').replace(/\s+/g, ' ').trim();
  if (cleanQuery) {
    params.set('q', cleanQuery.slice(0, 120));
  }

  return `${base}/?${params.toString()}`;
};

export const normalizeAdscodAdPayload = (raw: unknown): AdscodAd | null => {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (!isValidAdscodClickUrl(candidate.clickUrl)) return null;

  const title = typeof candidate.title === 'string' ? candidate.title.trim() : undefined;
  const body = typeof candidate.body === 'string' ? candidate.body.trim() : undefined;
  const ctaLabel = typeof candidate.ctaLabel === 'string' ? candidate.ctaLabel.trim() : undefined;
  const brandName = typeof candidate.brandName === 'string' ? candidate.brandName.trim() : undefined;
  const matchContext =
    typeof candidate.matchContext === 'string' ? candidate.matchContext.trim() : undefined;

  if (!title && !body && !isSafeAdscodMediaUrl(candidate.imageUrl)) {
    return null;
  }

  return {
    campaignId: typeof candidate.campaignId === 'string' ? candidate.campaignId.trim() : undefined,
    title,
    body,
    imageUrl: isSafeAdscodMediaUrl(candidate.imageUrl) ? candidate.imageUrl.trim() : undefined,
    ctaLabel: ctaLabel || 'Learn More',
    clickUrl: candidate.clickUrl.trim(),
    clickToken: typeof candidate.clickToken === 'string' ? candidate.clickToken.trim() : undefined,
    cpcUsd: typeof candidate.cpcUsd === 'string' ? candidate.cpcUsd : undefined,
    cpmRateUsd: typeof candidate.cpmRateUsd === 'string' ? candidate.cpmRateUsd : undefined,
    matchContext,
    adPrice: typeof candidate.adPrice === 'string' ? candidate.adPrice : undefined,
    adCompareAtPrice:
      typeof candidate.adCompareAtPrice === 'string' ? candidate.adCompareAtPrice : undefined,
    adCurrency: typeof candidate.adCurrency === 'string' ? candidate.adCurrency : undefined,
    brandName,
    brandLogoUrl: isSafeAdscodMediaUrl(candidate.brandLogoUrl)
      ? candidate.brandLogoUrl.trim()
      : undefined,
    brandVerified: Boolean(candidate.brandVerified)
  };
};

export const fetchAdscodAd = async (
  placement: AdscodPlacementKey,
  options: FetchAdscodOptions = {}
): Promise<AdscodFetchResult> => {
  const info = ADSCOD_PLACEMENTS[placement];
  const requestUrl = buildAdscodServeUrl(placement, options);
  const fetchFn = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  const checkedAt = new Date().toISOString();

  if (!fetchFn) {
    const res: AdscodFetchResult = {
      ok: false,
      status: 0,
      placement,
      placementId: info.placementId,
      requestUrl,
      ad: null,
      state: 'error',
      error: 'Fetch API is unavailable in this environment.'
    };
    updatePlacementDiagnostic(placement, {
      placement,
      placementId: info.placementId,
      requestUrl,
      httpStatus: 0,
      state: 'error',
      hasClickToken: false,
      error: res.error,
      checkedAt
    });
    return res;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const externalSignal = options.signal;
  let abortedExternally = Boolean(externalSignal?.aborted);
  const onExternalAbort = () => {
    abortedExternally = true;
    controller?.abort();
  };
  if (externalSignal && controller) {
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_SERVE_TIMEOUT_MS;
  const timeoutId =
    controller && typeof setTimeout !== 'undefined'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : undefined;

  try {
    const response = await fetchFn(requestUrl, {
      method: 'GET',
      signal: controller ? controller.signal : externalSignal,
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = (await response.text()).trim().slice(0, 160);
      } catch {
        // ignore body read error
      }
      const originNote =
        response.status === 403 && !getCurrentOriginInfo().isProductionOrigin
          ? 'Worker rejected non-production origin (allowed: isezerano.online, www.isezerano.online).'
          : bodyText || `HTTP ${response.status}`;

      const result: AdscodFetchResult = {
        ok: false,
        status: response.status,
        placement,
        placementId: info.placementId,
        requestUrl,
        ad: null,
        state: 'error',
        error: `Worker responded ${response.status}: ${originNote}`
      };
      updatePlacementDiagnostic(placement, {
        placement,
        placementId: info.placementId,
        requestUrl,
        httpStatus: response.status,
        state: 'error',
        hasClickToken: false,
        error: result.error,
        checkedAt
      });
      return result;
    }

    const payload = (await response.json()) as AdscodServeResponse;
    const rawFirst = Array.isArray(payload?.ads) ? payload.ads[0] : undefined;
    const ad = normalizeAdscodAdPayload(rawFirst);

    if (!ad) {
      const noFillError =
        payload?.success === false && payload.error ? payload.error : undefined;
      const state: AdscodFetchResult['state'] = noFillError ? 'error' : 'no-fill';
      const result: AdscodFetchResult = {
        ok: state === 'no-fill',
        status: response.status,
        placement,
        placementId: info.placementId,
        requestUrl,
        ad: null,
        state,
        error: noFillError
      };
      updatePlacementDiagnostic(placement, {
        placement,
        placementId: info.placementId,
        requestUrl,
        httpStatus: response.status,
        state,
        hasClickToken: false,
        error: noFillError,
        checkedAt
      });
      return result;
    }

    updatePlacementDiagnostic(placement, {
      placement,
      placementId: info.placementId,
      requestUrl,
      httpStatus: response.status,
      state: 'filled',
      campaignId: ad.campaignId,
      title: ad.title,
      brandName: ad.brandName,
      clickUrlHost: extractUrlHost(ad.clickUrl),
      hasClickToken: Boolean(ad.clickToken),
      checkedAt
    });

    return {
      ok: true,
      status: response.status,
      placement,
      placementId: info.placementId,
      requestUrl,
      ad,
      state: 'filled'
    };
  } catch (err: unknown) {
    if (abortedExternally || (err instanceof Error && err.name === 'AbortError' && externalSignal?.aborted)) {
      return {
        ok: false,
        status: 0,
        placement,
        placementId: info.placementId,
        requestUrl,
        ad: null,
        state: 'error',
        error: 'Aborted'
      };
    }

    const errMessage =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `Ad request timed out after ${timeoutMs}ms`
          : err.message
        : 'Network error fetching Adscod ad';

    const { isProductionOrigin } = getCurrentOriginInfo();
    const diagnosticError = !isProductionOrigin
      ? `${errMessage} (Note: Worker CORS permits https://isezerano.online & https://www.isezerano.online)`
      : errMessage;

    updatePlacementDiagnostic(placement, {
      placement,
      placementId: info.placementId,
      requestUrl,
      httpStatus: 0,
      state: 'error',
      hasClickToken: false,
      error: diagnosticError,
      checkedAt
    });

    return {
      ok: false,
      status: 0,
      placement,
      placementId: info.placementId,
      requestUrl,
      ad: null,
      state: 'error',
      error: diagnosticError
    };
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (externalSignal && controller) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
};

/**
 * Tracks real viewability dwell time matching Adscod Publisher SDK rules:
 * - >= 50% element visibility inside viewport via IntersectionObserver
 * - Active page tab (!document.hidden)
 * - Deduplicated monotonic sentMs tracking per clickToken instance
 * - Dispatches fire-and-forget beacon to POST https://api.adscod.com/api/v1/dwell
 */
export const createAdscodDwellTracker = (
  element: Element | null,
  options: AdscodDwellTrackerOptions
): AdscodDwellTrackerHandle => {
  const info = ADSCOD_PLACEMENTS[options.placement];
  const token = (options.clickToken || '').trim();
  const dwellUrl = (options.dwellEndpoint || ADSCOD_DWELL_ENDPOINT).trim();

  const status: AdscodDwellStatus = {
    placement: options.placement,
    placementId: info.placementId,
    hasClickToken: Boolean(token),
    state: !token
      ? 'no-token'
      : !element || typeof IntersectionObserver === 'undefined'
      ? 'unsupported'
      : 'observing',
    accumulatedMs: 0,
    reportedMs: 0
  };

  const emitStatus = () => {
    const snapshot = { ...status };
    updatePlacementDwellDiagnostic(options.placement, snapshot);
    options.onStatusChange?.(snapshot);
  };

  if (!token || !element || typeof IntersectionObserver === 'undefined') {
    emitStatus();
    return {
      flush: () => {},
      dispose: () => {},
      getStatus: () => ({ ...status })
    };
  }

  let inView = false;
  let activeSince = 0;
  let accumMs = 0;
  let sentMs = 0;
  let disposed = false;

  const isDocHidden = (): boolean =>
    typeof document !== 'undefined' && Boolean(document.hidden);

  const currentMs = (): number =>
    accumMs + (activeSince > 0 ? Math.max(0, Date.now() - activeSince) : 0);

  const setActive = (shouldTrack: boolean): void => {
    if (shouldTrack && !activeSince) {
      activeSince = Date.now();
    } else if (!shouldTrack && activeSince) {
      accumMs += Math.max(0, Date.now() - activeSince);
      activeSince = 0;
      status.accumulatedMs = Math.round(accumMs);
    }
  };

  const recompute = (): void => {
    if (disposed) return;
    setActive(inView && !isDocHidden());
  };

  const flush = (): void => {
    const total = currentMs();
    const delta = Math.round(total - sentMs);
    status.accumulatedMs = Math.round(total);
    if (delta < 50) return;

    sentMs += delta;
    status.reportedMs = Math.round(sentMs);
    status.state = 'flushed';
    status.lastFlushedAt = new Date().toISOString();

    const payload = JSON.stringify({ token, ms: delta });

    try {
      const beaconFn =
        options.sendBeaconImpl ||
        (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
          ? navigator.sendBeacon.bind(navigator)
          : null);

      if (beaconFn) {
        const queued = beaconFn(dwellUrl, payload);
        status.transport = 'sendBeacon';
        if (queued) {
          emitStatus();
          return;
        }
      }

      const fetchFn = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
      if (fetchFn) {
        status.transport = 'fetch';
        void fetchFn(dwellUrl, {
          method: 'POST',
          body: payload,
          keepalive: true,
          mode: 'no-cors'
        }).catch(() => {
          // ignore silent telemetry failures
        });
      }
    } catch {
      // never break host UI on dwell telemetry error
    }

    emitStatus();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const latest = entries[entries.length - 1];
      if (!latest) return;
      inView = Boolean(latest.isIntersecting && latest.intersectionRatio >= 0.5);
      recompute();
    },
    { threshold: [0, 0.5, 1] }
  );

  observer.observe(element);
  emitStatus();

  const handleVisibilityChange = () => {
    recompute();
    if (isDocHidden()) {
      flush();
    }
  };

  const handlePageHide = () => {
    recompute();
    flush();
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', handlePageHide);
  }

  return {
    flush,
    dispose: () => {
      if (disposed) return;
      if (activeSince > 0) {
        accumMs += Math.max(0, Date.now() - activeSince);
        activeSince = 0;
      }
      disposed = true;
      observer.disconnect();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
      }
      flush();
    },
    getStatus: () => ({
      ...status,
      accumulatedMs: Math.round(currentMs()),
      reportedMs: Math.round(sentMs)
    })
  };
};

export const runAllAdscodDiagnostics = async (): Promise<AdscodDiagnosticsSnapshot> => {
  await Promise.all([
    fetchAdscodAd('banner', { q: 'admin diagnostics banner check' }),
    fetchAdscodAd('inline', { q: 'admin diagnostics inline check' })
  ]);
  return getAdscodDiagnosticsSnapshot();
};
