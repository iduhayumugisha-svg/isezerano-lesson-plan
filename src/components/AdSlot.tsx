import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AdPlacement, AdsSettings } from '../types/platform';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  hasCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import { ExternalLink, Sparkles } from 'lucide-react';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

const AD_EXECUTION_TIMEOUT_MS = 12000;
let adExecutionQueue: Promise<void> = Promise.resolve();

const needsSerializedAdExecution = (code: string): boolean =>
  /atOptions\s*=|document\.write/i.test(code);

function enqueueAdSlotExecution(task: () => Promise<void>): void {
  adExecutionQueue = adExecutionQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await task();
      } catch {
        // Keep queue alive if an external ad script throws
      }
    });
}

function appendWrittenHtmlFragment(
  rawHtml: string,
  container: HTMLElement,
  isCancelled: () => boolean,
  pendingScripts: Promise<void>[]
): void {
  if (!rawHtml || isCancelled()) return;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = rawHtml;

  const nodes = Array.from(tempDiv.childNodes);
  for (const node of nodes) {
    if (isCancelled()) return;
    if (node.nodeName === 'SCRIPT') {
      const oldScript = node as HTMLScriptElement;
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.async = oldScript.hasAttribute('async');
      newScript.referrerPolicy = 'no-referrer-when-downgrade';

      const src = oldScript.getAttribute('src');
      if (src) {
        const scriptDone = new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timerId);
            resolve();
          };
          const timerId = window.setTimeout(finish, AD_EXECUTION_TIMEOUT_MS);
          newScript.addEventListener('load', finish, { once: true });
          newScript.addEventListener('error', finish, { once: true });
          container.appendChild(newScript);
        });
        pendingScripts.push(scriptDone);
      } else {
        if (oldScript.textContent) {
          newScript.textContent = oldScript.textContent;
        }
        container.appendChild(newScript);
      }
    } else {
      container.appendChild(node);
    }
  }
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(() => getCachedAdsSettingsSync());
  const [isAdsResolved, setIsAdsResolved] = useState<boolean>(() => hasCachedAdsSettingsSync());
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const appliedCodeSignatureRef = useRef<string>('');

  useEffect(() => {
    getAdsSettings().then((fresh) => {
      setAdsSettings(fresh);
      setIsAdsResolved(true);
    });

    // Subscribe to shared real-time updates from admin dashboard
    const unsubscribe = subscribeToAdsSettings((fresh) => {
      setAdsSettings(fresh);
      setIsAdsResolved(true);
    });

    return () => unsubscribe();
  }, []);

  const slotConfig = placement === 'below_header'
    ? adsSettings.belowHeaderAd
    : adsSettings.aboveFooterAd;

  // Responsive mobile layout fit for Adsterra banners (320x50, 728x90) & Native Banners
  const syncResponsiveEmbedLayout = useCallback(() => {
    const outer = outerWrapperRef.current;
    const container = codeContainerRef.current;
    if (!outer || !container) return;

    const availableWidth = outer.clientWidth;
    if (availableWidth <= 0) return;

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
      container.style.transform = '';
      container.style.width = '';
      outer.style.height = '';
      if (container.scrollWidth > availableWidth + 2) {
        targetWidth = container.scrollWidth;
        targetHeight = container.scrollHeight;
      }
    }

    if (targetWidth > availableWidth + 1) {
      const scale = Math.max(0.25, availableWidth / targetWidth);
      outer.style.height = '';
      container.style.width = `${targetWidth}px`;
      const measuredHeight = Math.max(targetHeight, container.scrollHeight, container.offsetHeight, 50);
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

  // Handle script / code execution inside the real document DOM safely (called unconditionally before returns)
  useEffect(() => {
    const rawCode = slotConfig?.code || '';
    const isCodeSlotActive = Boolean(
      adsSettings.masterEnabled &&
        slotConfig &&
        slotConfig.enabled &&
        slotConfig.type === 'code' &&
        rawCode.trim().length > 0
    );

    if (!isCodeSlotActive || !codeContainerRef.current) {
      appliedCodeSignatureRef.current = '';
      if (codeContainerRef.current) {
        codeContainerRef.current.innerHTML = '';
      }
      if (outerWrapperRef.current) {
        outerWrapperRef.current.style.height = '';
      }
      return;
    }

    const container = codeContainerRef.current;
    const outer = outerWrapperRef.current;
    const nextSignature = `${placement}::${rawCode}`;
    let cancelled = false;

    if (appliedCodeSignatureRef.current !== nextSignature || container.childNodes.length === 0) {
      appliedCodeSignatureRef.current = nextSignature;
      container.innerHTML = '';
      if (outer) {
        outer.style.height = '';
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rawCode;

      const scriptNodes: HTMLScriptElement[] = [];
      const childNodes = Array.from(tempDiv.childNodes);
      for (const child of childNodes) {
        if (child.nodeName === 'SCRIPT') {
          scriptNodes.push(child as HTMLScriptElement);
        } else {
          container.appendChild(child);
        }
      }

      if (scriptNodes.length > 0) {
        if (needsSerializedAdExecution(rawCode)) {
          enqueueAdSlotExecution(async () => {
            if (cancelled || !container.isConnected) return;

            const originalWrite = document.write.bind(document);
            const originalWriteln = document.writeln.bind(document);
            const pendingWrittenScripts: Promise<void>[] = [];
            let writeBuffer = '';

            const flushWriteBuffer = (force = false) => {
              if (!writeBuffer) return;
              const openScripts = (writeBuffer.match(/<script\b/gi) || []).length;
              const closeScripts = (writeBuffer.match(/<\/script>/gi) || []).length;
              if (!force && openScripts > closeScripts) {
                return;
              }
              const htmlToInsert = writeBuffer;
              writeBuffer = '';
              appendWrittenHtmlFragment(
                htmlToInsert,
                container,
                () => cancelled,
                pendingWrittenScripts
              );
              syncResponsiveEmbedLayout();
            };

            document.write = (...args: string[]) => {
              if (cancelled || !container.isConnected) return;
              writeBuffer += args.join('');
              flushWriteBuffer(false);
            };

            document.writeln = (...args: string[]) => {
              if (cancelled || !container.isConnected) return;
              writeBuffer += `${args.join('')}\n`;
              flushWriteBuffer(false);
            };

            try {
              for (const oldScript of scriptNodes) {
                if (cancelled || !container.isConnected) break;

                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach((attr) => {
                  newScript.setAttribute(attr.name, attr.value);
                });
                newScript.async = oldScript.hasAttribute('async');
                newScript.referrerPolicy = 'no-referrer-when-downgrade';

                const src = oldScript.getAttribute('src');
                if (src) {
                  await new Promise<void>((resolve) => {
                    let settled = false;
                    const finish = () => {
                      if (settled) return;
                      settled = true;
                      window.clearTimeout(timeoutId);
                      resolve();
                    };
                    const timeoutId = window.setTimeout(finish, AD_EXECUTION_TIMEOUT_MS);
                    newScript.addEventListener('load', finish, { once: true });
                    newScript.addEventListener('error', finish, { once: true });
                    container.appendChild(newScript);
                  });
                } else {
                  newScript.textContent = oldScript.textContent;
                  container.appendChild(newScript);
                }
              }

              // Wait for any nested <script src="..."> tags injected via document.write
              while (pendingWrittenScripts.length > 0 && !cancelled) {
                const batch = pendingWrittenScripts.splice(0, pendingWrittenScripts.length);
                await Promise.all(batch);
              }
              flushWriteBuffer(true);
            } finally {
              document.write = originalWrite;
              document.writeln = originalWriteln;
              if (!cancelled) {
                syncResponsiveEmbedLayout();
              }
            }
          });
        } else {
          // Async container tags (e.g. Adsterra Native Banner) inject immediately without blocking other slots
          scriptNodes.forEach((oldScript) => {
            if (cancelled || !container.isConnected) return;
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach((attr) => {
              newScript.setAttribute(attr.name, attr.value);
            });
            newScript.async = oldScript.hasAttribute('async');
            newScript.referrerPolicy = 'no-referrer-when-downgrade';
            if (oldScript.textContent) {
              newScript.textContent = oldScript.textContent;
            }
            container.appendChild(newScript);
          });
        }
      }
    }

    const handleCaptureLoad = () => {
      if (!cancelled) {
        syncResponsiveEmbedLayout();
      }
    };

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
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (!cancelled) {
          syncResponsiveEmbedLayout();
        }
      });
      if (outer) resizeObserver.observe(outer);
      resizeObserver.observe(container);
    }

    container.addEventListener('load', handleCaptureLoad, true);
    window.addEventListener('resize', syncResponsiveEmbedLayout);
    const rafId = window.requestAnimationFrame(syncResponsiveEmbedLayout);
    const lateTimers = [150, 600, 1500, 3000].map((delay) =>
      window.setTimeout(() => {
        if (!cancelled) {
          syncResponsiveEmbedLayout();
        }
      }, delay)
    );

    return () => {
      cancelled = true;
      container.removeEventListener('load', handleCaptureLoad, true);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncResponsiveEmbedLayout);
      window.cancelAnimationFrame(rafId);
      lateTimers.forEach((timerId) => window.clearTimeout(timerId));
      appliedCodeSignatureRef.current = '';
      container.innerHTML = '';
      container.style.width = '';
      container.style.transform = '';
      container.style.transformOrigin = '';
      if (outer) {
        outer.style.height = '';
      }
    };
  }, [
    placement,
    adsSettings.masterEnabled,
    slotConfig?.enabled,
    slotConfig?.type,
    slotConfig?.code,
    syncResponsiveEmbedLayout
  ]);

  // Hold compact below-header slot space during initial cold fetch to minimize layout shift
  if (!isAdsResolved) {
    if (placement === 'below_header') {
      return (
        <div
          className={`w-full max-w-7xl mx-auto px-0 min-[360px]:px-2 sm:px-6 lg:px-8 py-1.5 min-h-[76px] sm:min-h-[84px] ${className}`}
          data-ad-placement={placement}
          aria-hidden="true"
        />
      );
    }
    return null;
  }

  // Master disabled or slot disabled: render nothing
  if (!adsSettings.masterEnabled || !slotConfig || !slotConfig.enabled) {
    return null;
  }

  const placementLabel = placement === 'below_header' ? 'Partner Announcement' : 'Sponsored Content';
  const outerSpacingClasses =
    placement === 'below_header' ? 'pt-2 pb-1 sm:pt-2.5 sm:pb-1' : 'pt-2 pb-3 sm:pt-3 sm:pb-4';

  return (
    <div
      className={`w-full max-w-7xl mx-auto px-0 min-[360px]:px-2 sm:px-6 lg:px-8 ${outerSpacingClasses} transition-all relative z-0 ${className}`}
      data-ad-placement={placement}
    >
      <div className="bg-slate-50/80 border-y min-[360px]:border border-slate-200/90 rounded-none min-[360px]:rounded-2xl px-0 py-1.5 min-[360px]:p-2 sm:px-3 sm:py-2.5 shadow-2xs overflow-hidden relative">
        {/* Subtle Ad Disclosure Header */}
        <div className="flex items-center justify-between px-2.5 min-[360px]:px-0 pb-1.5 mb-1.5 border-b border-slate-200/60 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
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
          <div className="flex justify-center items-center w-full px-2.5 min-[360px]:px-0">
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
          <div ref={outerWrapperRef} className="ad-slot-wrapper w-full min-w-0 min-h-[50px] overflow-hidden">
            <div
              ref={codeContainerRef}
              className="ad-slot-content block w-full min-w-0 min-h-[50px] text-xs text-slate-700 text-center"
            />
          </div>
        )}
      </div>
    </div>
  );
};

