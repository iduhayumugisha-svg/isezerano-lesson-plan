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

  return (
    <aside
      aria-label="Advertisement"
      className="no-print w-full max-w-7xl mx-auto px-0 min-[360px]:px-2 sm:px-6 lg:px-8 pt-2 pb-1 sm:pt-2.5 sm:pb-1"
      data-ad-provider="adscod"
      data-ad-placement="banner"
    >
      <div className="bg-slate-50/80 border-y min-[360px]:border border-slate-200/90 rounded-none min-[360px]:rounded-2xl p-2 sm:p-3 shadow-2xs overflow-hidden">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <span>Advertisement</span>
          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px]">AD</span>
        </div>
        {ad?.clickUrl ? (
          <a
            href={ad.clickUrl}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="flex flex-col sm:flex-row items-center gap-3 text-left"
          >
            {ad.imageUrl && (
              <img src={ad.imageUrl} alt={ad.title || 'Sponsored advertisement'} className="w-full sm:w-40 max-h-28 object-contain rounded-lg" loading="lazy" />
            )}
            <span className="min-w-0 flex-1">
              {ad.title && <strong className="block text-sm font-bold text-slate-900">{ad.title}</strong>}
              {ad.body && <span className="mt-1 block text-xs sm:text-sm text-slate-600">{ad.body}</span>}
            </span>
            {ad.ctaLabel && <span className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">{ad.ctaLabel}</span>}
          </a>
        ) : (
          <div className="min-h-12 flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-3 text-center text-xs text-slate-500">
            {loading
              ? 'Kwamamaza birimo gushakishwa…'
              : requestFailed
                ? 'Kwamamaza ntikubashije guhuzwa na Adscod muri aka kanya.'
                : 'Nta tangazo rya banner riraboneka muri aka kanya.'}
          </div>
        )}
      </div>
    </aside>
  );
};
