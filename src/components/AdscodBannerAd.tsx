import React, { useEffect, useRef } from 'react';

const PUBLISHER_SDK_URL = 'https://api.adscod.com/sdk/v1/publisher.js';
const PUBLISHER_KEY = import.meta.env.VITE_ADSCOD_PUBLISHER_KEY;

export const AdscodBannerAd: React.FC = () => {
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot || !PUBLISHER_KEY) {
      if (!PUBLISHER_KEY) console.warn('[Adscod] Publisher SDK key is not configured.');
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

    slot.appendChild(script);

    return () => {
      script.remove();
      slot.replaceChildren();
    };
  }, []);

  return (
    <aside
      aria-label="Advertisement"
      className="no-print w-full border-b border-slate-200 bg-slate-50"
      data-ad-provider="adscod"
      data-ad-placement="banner"
    >
      <div
        ref={slotRef}
        className="mx-auto min-h-0 w-full max-w-7xl px-4 py-2 sm:px-6 lg:px-8"
      />
    </aside>
  );
};
