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

export const AdscodInlineAd: React.FC = () => {
  const [ad, setAd] = useState<AdscodAd | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${ADS_WORKER_URL}/?placement=inline`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Ad request failed: ${response.status}`);
        return response.json() as Promise<AdscodResponse>;
      })
      .then((data) => setAd(data.ads?.[0] ?? null))
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('[Adscod] Inline ad could not be loaded.', error);
        }
      });

    return () => controller.abort();
  }, []);

  if (!ad?.clickUrl) return null;

  return (
    <aside
      aria-label="Advertisement"
      className="my-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
      data-ad-provider="adscod"
      data-ad-placement="inline"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span>Sponsored</span>
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] text-slate-600">AD</span>
      </div>
      <a href={ad.clickUrl} target="_blank" rel="sponsored noopener noreferrer" className="flex flex-col sm:flex-row items-center gap-3 text-left">
        {ad.imageUrl && (
          <img src={ad.imageUrl} alt={ad.title || 'Sponsored advertisement'} className="w-full sm:w-36 max-h-28 object-contain rounded-lg" loading="lazy" />
        )}
        <span className="min-w-0 flex-1">
          {ad.title && <strong className="block text-sm font-bold text-slate-900">{ad.title}</strong>}
          {ad.body && <span className="mt-1 block text-sm text-slate-600">{ad.body}</span>}
        </span>
        {ad.ctaLabel && <span className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white">{ad.ctaLabel}</span>}
      </a>
    </aside>
  );
};
