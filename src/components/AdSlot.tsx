import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AdPlacement, AdsSettings, DEFAULT_ADS_SETTINGS } from '../types/platform';
import { getAdsSettings, subscribeToAdsSettings } from '../services/siteSettingsService';
import { ExternalLink, Sparkles } from 'lucide-react';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const outerWrapperRef = useRef<HTMLDivElement>(null);
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

  // Responsive mobile scaling for fixed-width injected ad iframes/embeds (e.g., 728x90)
  const syncResponsiveEmbedLayout = useCallback(() => {
    const outer = outerWrapperRef.current;
    const container = codeContainerRef.current;
    if (!outer || !container) return;

    const availableWidth = outer.clientWidth;
    if (availableWidth <= 0) return;

    // Reset temporary wrapper styles before checking natural dimensions
    let targetWidth = 0;
    let targetHeight = 0;

    const iframes = Array.from(container.querySelectorAll('iframe'));
    for (const iframe of iframes) {
      const attrW = Number(iframe.getAttribute('width')) || 0;
      const styleW = parseFloat(iframe.style.width || '0') || 0;
      const offsetW = iframe.offsetWidth || 0;
      const naturalW = Math.max(attrW, styleW, offsetW);

      const attrH = Number(iframe.getAttribute('height')) || 0;
      const styleH = parseFloat(iframe.style.height || '0') || 0;
      const offsetH = iframe.offsetHeight || 0;
      const naturalH = Math.max(attrH, styleH, offsetH);

      if (naturalW > targetWidth) {
        targetWidth = naturalW;
        targetHeight = naturalH;
      }
    }

    // Fallback check for wide non-iframe fixed elements injected by ad networks
    if (targetWidth <= availableWidth) {
      // Clear transform temporarily to read real unscaled scrollWidth
      container.style.transform = '';
      container.style.width = '';
      if (container.scrollWidth > availableWidth + 2) {
        targetWidth = container.scrollWidth;
        targetHeight = container.scrollHeight;
      }
    }

    if (targetWidth > availableWidth + 1) {
      const scale = Math.max(0.25, availableWidth / targetWidth);
      const measuredHeight = Math.max(targetHeight, container.offsetHeight, 50);
      container.style.width = `${targetWidth}px`;
      container.style.transformOrigin = 'top left';
      container.style.transform = `scale(${scale})`;
      container.style.margin = '0';
      outer.style.height = `${Math.ceil(measuredHeight * scale)}px`;
    } else {
      container.style.width = '';
      container.style.transformOrigin = '';
      container.style.transform = '';
      container.style.margin = '';
      outer.style.height = '';
    }
  }, []);

  // Handle script / code execution inside DOM safely (called unconditionally before returns)
  useEffect(() => {
    if (!adsSettings.masterEnabled || !slotConfig || !slotConfig.enabled) {
      if (codeContainerRef.current) {
        codeContainerRef.current.innerHTML = '';
      }
      if (outerWrapperRef.current) {
        outerWrapperRef.current.style.height = '';
      }
      return;
    }

    if (slotConfig.type === 'code' && slotConfig.code && codeContainerRef.current) {
      const container = codeContainerRef.current;
      const outer = outerWrapperRef.current;
      let cancelled = false;

      container.innerHTML = '';
      if (outer) {
        outer.style.height = '';
      }

      // Create a temporary container to parse HTML and preserve exact DOM + script order
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = slotConfig.code;

      const scripts = Array.from(tempDiv.querySelectorAll('script'));
      // Append non-script nodes first so target containers exist in DOM
      while (tempDiv.firstChild) {
        if (tempDiv.firstChild.nodeName !== 'SCRIPT') {
          container.appendChild(tempDiv.firstChild);
        } else {
          tempDiv.removeChild(tempDiv.firstChild);
        }
      }

      // Execute scripts sequentially while preserving explicit async attributes
      scripts.forEach((oldScript) => {
        if (cancelled) return;
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.async = oldScript.hasAttribute('async');
        newScript.textContent = oldScript.textContent;
        container.appendChild(newScript);
      });

      const mutationObserver = new MutationObserver(() => {
        if (!cancelled) {
          syncResponsiveEmbedLayout();
        }
      });
      mutationObserver.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['width', 'height', 'style']
      });

      let resizeObserver: ResizeObserver | null = null;
      if (outer && typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          if (!cancelled) {
            syncResponsiveEmbedLayout();
          }
        });
        resizeObserver.observe(outer);
      }

      window.addEventListener('resize', syncResponsiveEmbedLayout);
      const rafId = window.requestAnimationFrame(syncResponsiveEmbedLayout);
      const lateCheckId = window.setTimeout(syncResponsiveEmbedLayout, 600);

      return () => {
        cancelled = true;
        mutationObserver.disconnect();
        resizeObserver?.disconnect();
        window.removeEventListener('resize', syncResponsiveEmbedLayout);
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(lateCheckId);
        container.innerHTML = '';
        container.style.width = '';
        container.style.transform = '';
        container.style.transformOrigin = '';
        if (outer) {
          outer.style.height = '';
        }
      };
    }
  }, [
    adsSettings.masterEnabled,
    slotConfig?.enabled,
    slotConfig?.type,
    slotConfig?.code,
    syncResponsiveEmbedLayout
  ]);

  // Master disabled or slot disabled: render nothing
  if (!adsSettings.masterEnabled || !slotConfig || !slotConfig.enabled) {
    return null;
  }

  const placementLabel = placement === 'below_header' ? 'Partner Announcement' : 'Sponsored Content';

  return (
    <div
      className={`w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2.5 sm:py-3 my-2 transition-all relative z-0 ${className}`}
      data-ad-placement={placement}
    >
      <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-2.5 sm:p-4 shadow-2xs overflow-hidden relative">
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
          <div className="flex justify-center items-center w-full">
            {slotConfig.linkUrl ? (
              <a
                href={slotConfig.linkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="block group relative overflow-hidden rounded-xl max-h-[180px] sm:max-h-[220px] w-full transition-transform hover:scale-[1.005]"
              >
                <img
                  src={slotConfig.imageUrl}
                  alt={slotConfig.altText || 'Sponsor Banner'}
                  className="w-full h-auto max-h-[180px] sm:max-h-[220px] object-contain mx-auto rounded-xl"
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
                className="w-full h-auto max-h-[180px] sm:max-h-[220px] object-contain mx-auto rounded-xl"
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* Ad Format 2: Custom Script / Embed Code (Responsive block wrapper prevents 0px mobile flex collapse) */}
        {slotConfig.type === 'code' && (
          <div ref={outerWrapperRef} className="ad-slot-wrapper w-full overflow-hidden">
            <div
              ref={codeContainerRef}
              className="ad-slot-content block w-full min-h-[50px] text-xs text-slate-700 text-center"
            />
          </div>
        )}
      </div>
    </div>
  );
};

