import React, { useEffect, useRef } from 'react';

const PUBLISHER_SDK_URL = 'https://api.adscod.com/sdk/v1/publisher.js';
const PUBLISHER_KEY = import.meta.env.VITE_ADSCOD_PUBLISHER_KEY;

export const AdscodInlineAd: React.FC = () => {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || !PUBLISHER_KEY) {
      if (!PUBLISHER_KEY) console.warn('[Adscod] Publisher SDK key is not configured.');
      return;
    }

    const targetId = 'adscod-inline-slot';
    slot.id = targetId;

    const script = document.createElement('script');
    script.src = PUBLISHER_SDK_URL;
    script.async = true;
    script.dataset.key = PUBLISHER_KEY;
    script.dataset.placement = 'inline';
    script.dataset.target = `#${targetId}`;
    script.dataset.category = 'news';
    script.dataset.limit = '1';
    script.dataset.adscodManaged = 'true';

    slot.appendChild(script);

    return () => {
      script.remove();
      slot.replaceChildren();
    };
  }, []);

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
      <div ref={slotRef} className="min-h-0" />
    </aside>
  );
};
