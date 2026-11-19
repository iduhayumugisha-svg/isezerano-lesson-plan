import React, { useEffect, useState } from 'react';

const ADS_ENDPOINT = 'https://isezerano-adscod.twizerefelix90.workers.dev?placement=banner';
const ROTATION_INTERVAL_MS = 15_000;

interface AdscodAd {
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  clickUrl: string;
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export const AdscodBannerAd: React.FC = () => {
  const [ad, setAd] = useState<AdscodAd | null>(null);

  useEffect(() => {
    let inFlight = false;
    let disposed = false;
    let controller: AbortController | null = null;

    const loadAd = async () => {
      // Avoid unnecessary requests while the visitor has this tab in the background.
      if (disposed || document.visibilityState !== 'visible' || inFlight) return;

      inFlight = true;
      controller = new AbortController();

      try {
        const response = await fetch(ADS_ENDPOINT, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object' || !('ads' in payload)) return;

        const ads = (payload as { ads?: unknown }).ads;
        if (!Array.isArray(ads) || ads.length === 0) return;

        const candidate = ads[0] as Record<string, unknown>;
        const clickUrl = safeHttpsUrl(candidate?.clickUrl);
        if (!clickUrl) return;

        // Keep the current banner if the provider has no valid replacement.
        setAd({
          title: typeof candidate.title === 'string' ? candidate.title : undefined,
          body: typeof candidate.body === 'string' ? candidate.body : undefined,
          imageUrl: safeHttpsUrl(candidate.imageUrl) || undefined,
          ctaLabel: typeof candidate.ctaLabel === 'string' ? candidate.ctaLabel : undefined,
          clickUrl
        });
      } catch (error) {
        if (!disposed && !controller?.signal.aborted) {
          console.warn('[Adscod] Could not refresh banner advertisement:', error);
        }
      } finally {
        inFlight = false;
      }
    };

    void loadAd();
    const intervalId = window.setInterval(() => {
      void loadAd();
    }, ROTATION_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      controller?.abort();
    };
  }, []);

  if (!ad) return null;

  return (
    <aside
      aria-label="Advertisement"
      className="no-print w-full border-b border-slate-200 bg-slate-50"
      data-ad-provider="adscod"
      data-ad-placement="banner"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <span className="shrink-0 rounded bg-slate-200 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
          Ad
        </span>
        <a
          href={ad.clickUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition-opacity hover:opacity-90"
        >
          {ad.imageUrl && (
            <img
              src={ad.imageUrl}
              alt={ad.title || 'Sponsored content'}
              loading="lazy"
              className="h-14 w-20 shrink-0 rounded-md object-cover sm:h-16 sm:w-28"
            />
          )}
          <span className="min-w-0 flex-1">
            {ad.title && <span className="block truncate text-sm font-semibold text-slate-900">{ad.title}</span>}
            {ad.body && <span className="mt-0.5 block line-clamp-2 text-xs leading-relaxed text-slate-600">{ad.body}</span>}
          </span>
          <span className="shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">
            {ad.ctaLabel || 'Learn more'}
          </span>
        </a>
      </div>
    </aside>
  );
};
