import React, { useEffect, useState, useRef } from 'react';
import { AdPlacement, AdsSettings, DEFAULT_ADS_SETTINGS } from '../types/ads';
import { getAdsSettings, subscribeToAdsSettings } from '../services/adsService';
import { ExternalLink, Sparkles } from 'lucide-react';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial settings
    getAdsSettings().then(setAdsSettings);

    // Subscribe to real-time updates from admin dashboard
    const unsubscribe = subscribeToAdsSettings((fresh) => {
      setAdsSettings(fresh);
    });

    return () => unsubscribe();
  }, []);

  const slotConfig = placement === 'below_header' 
    ? adsSettings.belowHeaderAd 
    : adsSettings.aboveFooterAd;

  // Master disabled or slot disabled: render nothing
  if (!adsSettings.masterEnabled || !slotConfig || !slotConfig.enabled) {
    return null;
  }

  // Handle script / code execution inside DOM safely
  useEffect(() => {
    if (slotConfig.type === 'code' && slotConfig.code && codeContainerRef.current) {
      const container = codeContainerRef.current;
      container.innerHTML = '';

      // Create a temporary document fragment to parse HTML and extract scripts
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = slotConfig.code;

      const scripts = tempDiv.querySelectorAll('script');
      // Append non-script nodes
      while (tempDiv.firstChild) {
        if (tempDiv.firstChild.nodeName !== 'SCRIPT') {
          container.appendChild(tempDiv.firstChild);
        } else {
          tempDiv.removeChild(tempDiv.firstChild);
        }
      }

      // Execute scripts by re-creating script elements
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        container.appendChild(newScript);
      });
    }
  }, [slotConfig.code, slotConfig.type]);

  const placementLabel = placement === 'below_header' ? 'Partner Announcement' : 'Sponsored Content';

  return (
    <div 
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 my-2 transition-all ${className}`}
      data-ad-placement={placement}
    >
      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs overflow-hidden relative">
        {/* Subtle Ad Disclosure Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{slotConfig.label || placementLabel}</span>
          </span>
          <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
            AD
          </span>
        </div>

        {/* Ad Format 1: Banner Image with Link */}
        {slotConfig.type === 'banner' && slotConfig.imageUrl && (
          <div className="flex justify-center items-center">
            {slotConfig.linkUrl ? (
              <a 
                href={slotConfig.linkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block group relative overflow-hidden rounded-xl max-h-[140px] sm:max-h-[180px] w-full transition-transform hover:scale-[1.005]"
              >
                <img 
                  src={slotConfig.imageUrl} 
                  alt={slotConfig.altText || 'Sponsor Banner'}
                  className="w-full h-auto max-h-[140px] sm:max-h-[180px] object-cover rounded-xl"
                  loading="lazy"
                />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-[10px] px-2 py-0.5 rounded flex items-center space-x-1">
                  <span>Visit Sponsor</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </div>
              </a>
            ) : (
              <img 
                src={slotConfig.imageUrl} 
                alt={slotConfig.altText || 'Sponsor Banner'}
                className="w-full h-auto max-h-[140px] sm:max-h-[180px] object-cover rounded-xl"
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* Ad Format 2: Custom Script / Embed Code */}
        {slotConfig.type === 'code' && (
          <div 
            ref={codeContainerRef}
            className="flex justify-center items-center overflow-x-auto min-h-[50px] text-xs text-slate-700"
          />
        )}
      </div>
    </div>
  );
};
