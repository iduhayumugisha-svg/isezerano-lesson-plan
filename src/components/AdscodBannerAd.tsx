import React, { useEffect, useRef } from 'react';

const PUBLISHER_SDK_URL = 'https://api.adscod.com/sdk/v1/publisher.js';
const PUBLISHER_KEY = import.meta.env.VITE_ADSCOD_PUBLISHER_KEY;

export const AdscodBannerAd: React.FC = () => {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    if (!PUBLISHER_KEY) {
      console.warn('[Adscod] Publisher SDK key is not configured.');
      return;
    }

    const targetId = 'adscod-banner-slot';
    slot.id = targetId;

    const script = document.createElement('script');
    script.src = PUBLISHER_SDK_URL;
    script.async = true;
    script.dataset.key = PUBLISHER_KEY;
    script.dataset.placement = 'banner';
    script.dataset.target = `#${targetId}`;
    script.dataset.category = 'news';
    script.dataset.limit = '1';
    script.dataset.adscodManaged = 'true';
    script.onerror = () => console.error('[Adscod] Publisher SDK failed to load.');

    slot.appendChild(script);

    return () => {
      script.remove();
      slot.replaceChildren();
    };
  }, []);

  return (
    <aside
      aria-label="Advertisement"
      className="no-print w-full max-w-7xl mx-auto px-0 min-[360px]:px-2 sm:px-6 lg:px-8 pt-2 pb-1 sm:pt-2.5 sm:pb-1"
      data-ad-provider="adscod"
      data-ad-placement="banner"
    >
      <div className="bg-slate-50/80 border-y min-[360px]:border border-slate-200/90 rounded-none min-[360px]:rounded-2xl px-0 py-1.5 min-[360px]:p-2 sm:px-3 sm:py-2.5 shadow-2xs overflow-hidden relative">
        <div className="flex items-center justify-between px-2.5 min-[360px]:px-0 pb-1.5 mb-1.5 border-b border-slate-200/60 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <span>Advertisement</span>
          <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">AD</span>
        </div>
        <div
          ref={slotRef}
          className="ad-slot-wrapper block w-full min-w-0 min-h-[50px] text-center"
        />
      </div>
    </aside>
  );
};
