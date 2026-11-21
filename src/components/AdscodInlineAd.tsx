import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { ADSCOD_PLACEMENTS, AdscodAd } from '../types/adscod';
import {
  createAdscodDwellTracker,
  fetchAdscodAd,
  normalizeAdscodAdPayload
} from '../services/adscodService';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  hasCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';

interface AdscodInlineAdProps {
  contextCategory?: string;
  contextQuery?: string;
  placementContext?: string;
  className?: string;
  overrideAd?: AdscodAd | null;
}

export const AdscodInlineAd: React.FC<AdscodInlineAdProps> = ({
  contextCategory,
  contextQuery,
  placementContext = 'editorial_inline',
  className = '',
  overrideAd
}) => {
  const normalizedOverride =
    overrideAd !== undefined ? normalizeAdscodAdPayload(overrideAd) : undefined;
  const [ad, setAd] = useState<AdscodAd | null>(() =>
    normalizedOverride !== undefined ? normalizedOverride : null
  );
  const [adsMasterEnabled, setAdsMasterEnabled] = useState<boolean>(() => {
    if (overrideAd !== undefined) return true;
    return hasCachedAdsSettingsSync() ? getCachedAdsSettingsSync().masterEnabled : true;
  });
  const [isSettingsResolved, setIsSettingsResolved] = useState<boolean>(() =>
    overrideAd !== undefined ? true : hasCachedAdsSettingsSync()
  );
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (overrideAd !== undefined) return;
    let active = true;

    getAdsSettings()
      .then((fresh) => {
        if (!active) return;
        setAdsMasterEnabled(fresh.masterEnabled);
        setIsSettingsResolved(true);
      })
      .catch(() => {
        if (!active) return;
        setIsSettingsResolved(true);
      });

    const unsub = subscribeToAdsSettings((fresh) => {
      if (!active) return;
      setAdsMasterEnabled(fresh.masterEnabled);
      setIsSettingsResolved(true);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [overrideAd]);

  useEffect(() => {
    if (overrideAd !== undefined) {
      setAd(normalizeAdscodAdPayload(overrideAd));
      return;
    }

    if (!isSettingsResolved || !adsMasterEnabled) {
      setAd(null);
      return;
    }

    const controller = new AbortController();
    fetchAdscodAd('inline', {
      category: contextCategory,
      q: contextQuery,
      signal: controller.signal
    }).then((result) => {
      if (controller.signal.aborted) return;
      setAd(result.ad);
    });

    return () => {
      controller.abort();
    };
  }, [overrideAd, isSettingsResolved, adsMasterEnabled, contextCategory, contextQuery]);

  useEffect(() => {
    if (!ad || !cardRef.current || overrideAd !== undefined) return;
    const tracker = createAdscodDwellTracker(cardRef.current, {
      placement: 'inline',
      clickToken: ad.clickToken
    });
    return () => tracker.dispose();
  }, [ad, overrideAd]);

  if (!adsMasterEnabled || !ad) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored advertisement"
      className={`my-5 sm:my-6 no-print ${className}`}
      data-ad-provider="adscod"
      data-ad-placement="inline"
      data-ad-placement-id={ADSCOD_PLACEMENTS.inline.placementId}
      data-ad-context={placementContext}
      data-ad-campaign-id={ad.campaignId || ''}
      data-testid="adscod-inline-ad"
    >
      <a
        ref={cardRef}
        href={ad.clickUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group block rounded-2xl border border-slate-200 bg-slate-50/90 hover:bg-white hover:border-teal-600/50 hover:shadow-sm transition-all p-3.5 sm:p-4 text-left"
      >
        <div className="mb-2.5 flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/70 text-[10px]">
          <div className="flex items-center gap-1.5 min-w-0">
            {ad.brandLogoUrl ? (
              <img
                src={ad.brandLogoUrl}
                alt={ad.brandName || 'Sponsor'}
                className="w-4 h-4 rounded-full object-cover border border-slate-200 shrink-0"
                loading="lazy"
              />
            ) : ad.brandName ? (
              <span className="w-4 h-4 rounded-full bg-teal-700 text-white text-[9px] font-bold inline-flex items-center justify-center shrink-0">
                {ad.brandName[0]?.toUpperCase()}
              </span>
            ) : null}
            {ad.brandName && (
              <span className="font-semibold text-slate-700 truncate">{ad.brandName}</span>
            )}
            {ad.brandVerified && (
              <BadgeCheck
                className="w-3.5 h-3.5 text-blue-600 shrink-0"
                aria-label="Verified advertiser"
              />
            )}
            <span className="font-semibold uppercase tracking-wider text-slate-500 shrink-0">
              {ad.brandName ? '· Sponsored' : 'Sponsored'}
            </span>
          </div>

          <span className="shrink-0 rounded bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-600">
            AD
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {ad.imageUrl && (
            <div className="w-full sm:w-36 h-28 sm:h-24 shrink-0 rounded-xl bg-white border border-slate-200/70 flex items-center justify-center overflow-hidden p-1">
              <img
                src={ad.imageUrl}
                alt={ad.title || ad.brandName || 'Sponsored advertisement'}
                className="max-w-full max-h-full w-auto h-auto object-contain"
                loading="lazy"
              />
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-1">
            {ad.title && (
              <strong className="block font-serif text-sm sm:text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug">
                {ad.title}
              </strong>
            )}
            {ad.body && (
              <span className="block text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                {ad.body}
              </span>
            )}
            {ad.adPrice && (
              <span className="inline-flex items-baseline gap-2 pt-0.5 text-xs font-bold text-slate-900">
                <span>
                  {ad.adCurrency ? `${ad.adCurrency} ` : ''}
                  {ad.adPrice}
                </span>
                {ad.adCompareAtPrice && (
                  <span className="text-[11px] font-normal text-slate-400 line-through">
                    {ad.adCurrency ? `${ad.adCurrency} ` : ''}
                    {ad.adCompareAtPrice}
                  </span>
                )}
              </span>
            )}
          </div>

          <span className="shrink-0 self-start sm:self-center inline-flex items-center gap-1.5 rounded-xl bg-teal-700 group-hover:bg-teal-600 px-4 py-2 text-xs font-bold text-white transition-colors whitespace-nowrap">
            <span>{ad.ctaLabel || 'Learn More'}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          </span>
        </div>
      </a>
    </aside>
  );
};
