import React, { useEffect, useState } from 'react';

const ADS_ENDPOINT = 'https://isezerano-adscod.twizerefelix90.workers.dev';

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

export const AdscodInlineAd: React.FC = () => {
  const [ad, setAd] = useState<AdscodAd | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadAd = async () => {
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

        setAd({
          title: typeof candidate.title === 'string' ? candidate.title : undefined,
          body: typeof candidate.body === 'string' ? candidate.body : undefined,
          imageUrl: safeHttpsUrl(candidate.imageUrl) || undefined,
          ctaLabel: typeof candidate.ctaLabel === 'string' ? candidate.ctaLabel : undefined,
          clickUrl
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn('[Adscod] Could not load inline advertisement:', error);
        }
      }
    };

    void loadAd();
    return () => controller.abort();
  }, []);

  if (!ad) return null;

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
      <a
        href={ad.clickUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="flex flex-col gap-3 rounded-xl bg-white p-3 transition-shadow hover:shadow-sm sm:flex-row sm:items-center"
      >
        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt={ad.title || 'Sponsored content'}
            loading="lazy"
            className="h-36 w-full rounded-lg object-cover sm:h-24 sm:w-36 sm:shrink-0"
          />
        )}
        <span className="min-w-0 flex-1">
          {ad.title && <span className="block font-semibold text-slate-900">{ad.title}</span>}
          {ad.body && <span className="mt-1 block text-sm leading-relaxed text-slate-600">{ad.body}</span>}
          <span className="mt-3 inline-flex rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white">
            {ad.ctaLabel || 'Learn more'}
          </span>
        </span>
      </a>
    </aside>
  );
};
