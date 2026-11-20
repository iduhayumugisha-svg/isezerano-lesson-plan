import React, { useEffect, useState } from 'react';

const ADS_WORKER_URL = 'https://isezerano-adscod.twizerefelix90.workers.dev';

interface AdscodAd {
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  clickUrl?: string;
}

interface AdscodResponse {
  ads?: AdscodAd[];
}

// This component is intentionally content-only. AdSlot supplies the shared
// frame, spacing, and responsive dimensions configured in the Admin dashboard.
export const AdscodBannerAd: React.FC = () => {
  const [ad, setAd] = useState<AdscodAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestFailed, setRequestFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${ADS_WORKER_URL}/?placement=banner`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Ad request failed: ${response.status}`);
        return response.json() as Promise<AdscodResponse>;
      })
      .then((data) => {
        setAd(data.ads?.[0] ?? null);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('[Adscod] Banner ad could not be loaded.', error);
          setRequestFailed(true);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  if (!ad?.clickUrl) {
    return (
      <div
        className="w-full min-w-0 min-h-12 flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-3 text-center text-xs text-slate-500"
        data-ad-provider="adscod"
        data-ad-placement="banner"
      >
        {loading
          ? 'Kwamamaza birimo gushakishwa…'
          : requestFailed
            ? 'Kwamamaza ntikubashije guhuzwa na Adscod muri aka kanya.'
            : 'Nta tangazo rya banner riraboneka muri aka kanya.'}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 flex items-center justify-center" data-ad-provider="adscod" data-ad-placement="banner">
      <a
        href={ad.clickUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="w-full min-w-0 flex flex-col sm:flex-row items-center justify-center gap-3 text-left"
      >
        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt={ad.title || 'Sponsored advertisement'}
            className="w-full sm:w-40 max-w-full max-h-28 object-contain rounded-lg"
            loading="lazy"
          />
        )}
        <span className="min-w-0 flex-1 text-center sm:text-left">
          {ad.title && <strong className="block text-sm font-bold text-slate-900">{ad.title}</strong>}
          {ad.body && <span className="mt-1 block text-xs sm:text-sm text-slate-600">{ad.body}</span>}
        </span>
        {ad.ctaLabel && (
          <span className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">
            {ad.ctaLabel}
          </span>
        )}
      </a>
    </div>
  );
};
