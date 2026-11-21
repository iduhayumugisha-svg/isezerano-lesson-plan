import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import {
  ADSCOD_PLACEMENTS,
  AdscodAd,
  AdscodFillState
} from '../types/adscod';
import {
  createAdscodDwellTracker,
  fetchAdscodAd,
  normalizeAdscodAdPayload
} from '../services/adscodService';

interface AdscodBannerAdProps {
  category?: string;
  queryHint?: string;
  wrapperClassName?: string;
  overrideAd?: AdscodAd | null;
  onFillStateChange?: (state: AdscodFillState) => void;
}

export const AdscodBannerAd: React.FC<AdscodBannerAdProps> = ({
  category,
  queryHint,
  wrapperClassName = '',
  overrideAd,
  onFillStateChange
}) => {
  const normalizedOverride =
    overrideAd !== undefined ? normalizeAdscodAdPayload(overrideAd) : undefined;
  const [ad, setAd] = useState<AdscodAd | null>(() =>
    normalizedOverride !== undefined ? normalizedOverride : null
  );
  const cardRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (overrideAd !== undefined) {
      const next = normalizeAdscodAdPayload(overrideAd);
      setAd(next);
      onFillStateChange?.(next ? 'filled' : 'no-fill');
      return;
    }

    const controller = new AbortController();
    onFillStateChange?.('loading');

    fetchAdscodAd('banner', {
      category,
      q: queryHint,
      signal: controller.signal
    }).then((result) => {
      if (controller.signal.aborted) return;
      setAd(result.ad);
      onFillStateChange?.(result.state);
    });

    return () => {
      controller.abort();
    };
  }, [overrideAd, category, queryHint, onFillStateChange]);

  useEffect(() => {
    if (!ad || !cardRef.current || overrideAd !== undefined) return;
    const tracker = createAdscodDwellTracker(cardRef.current, {
      placement: 'banner',
      clickToken: ad.clickToken
    });
    return () => tracker.dispose();
  }, [ad, overrideAd]);

  if (!ad) {
    return null;
  }

  return (
    <div
      className={`w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 my-1.5 sm:my-2 no-print ${wrapperClassName}`}
      data-ad-provider="adscod"
      data-ad-placement="banner"
      data-ad-placement-id={ADSCOD_PLACEMENTS.banner.placementId}
      data-ad-campaign-id={ad.campaignId || ''}
      data-testid="adscod-banner-ad"
    >
      <a
        ref={cardRef}
        href={ad.clickUrl}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="group block w-full rounded-xl border border-slate-200/95 bg-white hover:border-teal-600/50 hover:shadow-xs transition-all px-3 py-2 sm:px-4 sm:py-2.5 text-left"
      >
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-100 text-[10px]">
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
              <span className="font-semibold text-slate-700 truncate max-w-[150px] sm:max-w-[240px]">
                {ad.brandName}
              </span>
            )}
            {ad.brandVerified && (
              <BadgeCheck
                className="w-3.5 h-3.5 text-blue-600 shrink-0"
                aria-label="Verified advertiser"
              />
            )}
            <span className="text-slate-500 font-semibold uppercase tracking-wider shrink-0">
              {ad.brandName ? '· Sponsored' : 'Sponsored'}
            </span>
          </div>

          <span className="shrink-0 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-600">
            AD
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          {ad.imageUrl && (
            <div className="w-16 h-12 sm:w-24 sm:h-14 shrink-0 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden p-0.5">
              <img
                src={ad.imageUrl}
                alt={ad.title || ad.brandName || 'Sponsored advertisement'}
                className="max-w-full max-h-full w-auto h-auto object-contain"
                loading="lazy"
              />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {ad.title && (
              <strong className="block text-xs sm:text-sm font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-1">
                {ad.title}
              </strong>
            )}
            {ad.body && (
              <span className="block text-[11px] sm:text-xs text-slate-600 leading-snug line-clamp-1 mt-0.5">
                {ad.body}
              </span>
            )}
            {ad.adPrice && (
              <span className="inline-flex items-baseline gap-1.5 mt-0.5 text-[11px] font-bold text-slate-900">
                <span>
                  {ad.adCurrency ? `${ad.adCurrency} ` : ''}
                  {ad.adPrice}
                </span>
                {ad.adCompareAtPrice && (
                  <span className="text-[10px] font-normal text-slate-400 line-through">
                    {ad.adCurrency ? `${ad.adCurrency} ` : ''}
                    {ad.adCompareAtPrice}
                  </span>
                )}
              </span>
            )}
          </div>

          <span className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-900 group-hover:bg-teal-700 text-white px-2.5 sm:px-3.5 py-1.5 text-[11px] sm:text-xs font-bold transition-colors whitespace-nowrap">
            <span>{ad.ctaLabel || 'Learn More'}</span>
            <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
          </span>
        </div>
      </a>
    </div>
  );
};
