import React, { useEffect, useState, useRef, useCallback } from 'react';
import { AdPlacement, AdsSettings } from '../types/platform';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  hasCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import {
  DEFAULT_ADS_DISPLAY_SETTINGS,
  normalizeAdsDisplaySettings
} from '../utils/displaySettingsUtils';
import {
  hasRenderableAdCode,
  isSafeAdAssetOrClickUrl,
  isSafeAdScriptUrl,
  sanitizeAdCodePayload,
  sanitizeStaticAdElement
} from '../utils/inArticleAdUtils';
import { ExternalLink, Sparkles } from 'lucide-react';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

const AD_EXECUTION_TIMEOUT_MS = 12000;
const AD_EMPTY_SETTLE_DELAY_MS = 3200;
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

function buildExecutableScriptElement(oldScript: HTMLScriptElement): HTMLScriptElement | null {
  const src = oldScript.getAttribute('src')?.trim() || '';
  if (src && !isSafeAdScriptUrl(src)) {
    return null;
  }

  const newScript = document.createElement('script');
  Array.from(oldScript.attributes).forEach((attr) => {
    if (!attr.name.toLowerCase().startsWith('on')) {
      newScript.setAttribute(attr.name, attr.value);
    }
  });
  newScript.async = oldScript.hasAttribute('async');
  newScript.referrerPolicy = 'no-referrer-when-downgrade';
  if (!src && oldScript.textContent) {
    newScript.textContent = oldScript.textContent;
  }
  return newScript;
}

function extractNestedScriptsAndSanitizeDom(root: HTMLElement): {
  scriptTargets: Array<{ oldScript: HTMLScriptElement; placeholder: Comment | null }>;
  hasStaticMarkup: boolean;
} {
  const scriptTargets: Array<{ oldScript: HTMLScriptElement; placeholder: Comment | null }> = [];
  let hasStaticMarkup = false;

  for (const meta of Array.from(root.querySelectorAll('meta'))) {
    meta.remove();
  }

  // Replace top-level and nested <script> nodes with comment anchors so scripts execute inside their wrapper in exact DOM order
  for (const oldScript of Array.from(root.querySelectorAll('script'))) {
    const parent = oldScript.parentNode;
    if (parent) {
      const marker = document.createComment('isezerano-slot-script');
      parent.replaceChild(marker, oldScript);
      scriptTargets.push({ oldScript, placeholder: marker });
    } else {
      scriptTargets.push({ oldScript, placeholder: null });
    }
  }

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === 1) {
      sanitizeStaticAdElement(child as HTMLElement);
      hasStaticMarkup = true;
    } else if (child.nodeType === 3 && (child.textContent || '').trim()) {
      hasStaticMarkup = true;
    }
  }

  return { scriptTargets, hasStaticMarkup };
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

  const { scriptTargets } = extractNestedScriptsAndSanitizeDom(tempDiv);
  while (tempDiv.firstChild) {
    if (isCancelled()) return;
    container.appendChild(tempDiv.firstChild);
  }

  for (const { oldScript, placeholder } of scriptTargets) {
    if (isCancelled()) return;
    const newScript = buildExecutableScriptElement(oldScript);
    if (!newScript) {
      placeholder?.remove();
      continue;
    }

    const src = oldScript.getAttribute('src')?.trim() || '';
    const attachTarget = placeholder?.parentNode ? placeholder.parentNode : container;

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
        if (placeholder?.parentNode) {
          placeholder.parentNode.replaceChild(newScript, placeholder);
        } else {
          attachTarget.appendChild(newScript);
        }
      });
      pendingScripts.push(scriptDone);
    } else if (placeholder?.parentNode) {
      placeholder.parentNode.replaceChild(newScript, placeholder);
    } else {
      attachTarget.appendChild(newScript);
    }
  }
}

function hasVisibleAdContent(container: HTMLElement): boolean {
  if (!container) return false;
  const visualNodes = container.querySelectorAll(
    'iframe, img, svg, video, canvas, ins, a, button'
  );
  for (const el of Array.from(visualNodes)) {
    if (el.nodeType === 1) {
      const htmlEl = el as HTMLElement;
      if (
        htmlEl.tagName === 'IFRAME' ||
        htmlEl.tagName === 'IMG' ||
        htmlEl.offsetHeight > 4 ||
        htmlEl.offsetWidth > 4 ||
        (htmlEl.textContent || '').trim().length > 0
      ) {
        return true;
      }
    }
  }
  const visibleContainers = container.querySelectorAll('div, span, p, section');
  for (const el of Array.from(visibleContainers)) {
    const htmlEl = el as HTMLElement;
    if (
      el.nodeType === 1 &&
      (htmlEl.offsetHeight > 8 || (htmlEl.textContent || '').trim().length > 0)
    ) {
      return true;
    }
  }
  return (container.textContent || '').trim().length > 0;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(() => getCachedAdsSettingsSync());
  const [isAdsResolved, setIsAdsResolved] = useState<boolean>(() => hasCachedAdsSettingsSync());
  const [adFillState, setAdFillState] = useState<'pending' | 'filled' | 'empty'>('pending');
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const appliedCodeSignatureRef = useRef<string>('');
  const displayRef = useRef(normalizeAdsDisplaySettings(adsSettings.displaySettings));
  const hasExplicitDisplayRef = useRef(Boolean(adsSettings.displaySettings));

  displayRef.current = normalizeAdsDisplaySettings(adsSettings.displaySettings);
  hasExplicitDisplayRef.current = Boolean(adsSettings.displaySettings);

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

  // Responsive mobile layout fit & proportional sizing for banner/code embeds (Monetag, AdSense, Adsterra, HTML)
  const syncResponsiveEmbedLayout = useCallback(() => {
    const outer = outerWrapperRef.current;
    const container = codeContainerRef.current;
    if (!outer || !container) return;

    // Reset previous scaled dimensions before measuring natural available container width
    outer.style.width = '';
    outer.style.marginLeft = '';
    outer.style.marginRight = '';
    outer.style.height = '';
    container.style.width = '';
    container.style.transformOrigin = '';
    container.style.transform = '';
    container.style.margin = '';

    const availableWidth = outer.parentElement?.clientWidth || outer.clientWidth;
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
    if (container.scrollWidth > availableWidth + 2 && container.scrollWidth > targetWidth) {
      targetWidth = container.scrollWidth;
      targetHeight = Math.max(targetHeight, container.scrollHeight);
    }

    if (targetHeight <= 0) {
      targetHeight = Math.max(container.scrollHeight, container.offsetHeight);
    }

    const currentDisplay = displayRef.current;
    const hasCustomOrExplicitHeight =
      hasExplicitDisplayRef.current ||
      currentDisplay.containerHeightPx !== DEFAULT_ADS_DISPLAY_SETTINGS.containerHeightPx;
    const maxInnerHeight = Math.max(
      40,
      currentDisplay.containerHeightPx - currentDisplay.paddingPx * 2 - 28
    );

    const widthScale = targetWidth > availableWidth + 1 ? availableWidth / targetWidth : 1;
    const heightScale =
      hasCustomOrExplicitHeight && targetHeight > maxInnerHeight + 2
        ? maxInnerHeight / targetHeight
        : 1;
    const scale = Math.max(0.25, Math.min(widthScale, heightScale));

    if (scale < 0.999) {
      const baseWidth = Math.max(targetWidth, container.scrollWidth, availableWidth);
      const measuredHeight = Math.max(targetHeight, container.scrollHeight, container.offsetHeight, 50);
      container.style.width = `${baseWidth}px`;
      container.style.transformOrigin = 'top left';
      container.style.transform = `scale(${scale})`;
      container.style.margin = '0';
      const scaledWidth = Math.ceil(baseWidth * scale);
      if (scaledWidth < availableWidth) {
        outer.style.width = `${scaledWidth}px`;
        outer.style.marginLeft = 'auto';
        outer.style.marginRight = 'auto';
      }
      outer.style.height = `${Math.ceil(measuredHeight * scale)}px`;
    }
  }, []);

  // Handle script / code execution inside the real document DOM safely (called unconditionally before returns)
  useEffect(() => {
    const rawCode = sanitizeAdCodePayload(slotConfig?.code);
    const isAdminRoute =
      typeof window !== 'undefined' &&
      window.location.pathname.toLowerCase().startsWith('/admin');
    const isBannerReady = Boolean(
      adsSettings.masterEnabled &&
        slotConfig &&
        slotConfig.enabled &&
        slotConfig.type === 'banner' &&
        isSafeAdAssetOrClickUrl(slotConfig.imageUrl)
    );
    const isCodeSlotActive = Boolean(
      !isAdminRoute &&
        adsSettings.masterEnabled &&
        slotConfig &&
        slotConfig.enabled &&
        slotConfig.type === 'code' &&
        hasRenderableAdCode(rawCode)
    );

    if (isBannerReady) {
      setAdFillState('filled');
    } else {
      setAdFillState('pending');
    }

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

      const { scriptTargets, hasStaticMarkup } = extractNestedScriptsAndSanitizeDom(tempDiv);

      while (tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
      }

      if (hasStaticMarkup && hasVisibleAdContent(container)) {
        setAdFillState('filled');
      }

      if (scriptTargets.length > 0) {
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
              for (const { oldScript, placeholder } of scriptTargets) {
                if (cancelled || !container.isConnected) break;

                const newScript = buildExecutableScriptElement(oldScript);
                if (!newScript) {
                  placeholder?.remove();
                  continue;
                }

                const src = oldScript.getAttribute('src')?.trim() || '';
                const attachTarget = placeholder?.parentNode ? placeholder.parentNode : container;

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
                    if (placeholder?.parentNode) {
                      placeholder.parentNode.replaceChild(newScript, placeholder);
                    } else {
                      attachTarget.appendChild(newScript);
                    }
                  });
                } else if (placeholder?.parentNode) {
                  placeholder.parentNode.replaceChild(newScript, placeholder);
                } else {
                  attachTarget.appendChild(newScript);
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
                if (hasVisibleAdContent(container)) {
                  setAdFillState('filled');
                }
              }
            }
          });
        } else {
          // Async container tags (e.g. Monetag/Adsterra Native Banner) inject immediately at exact DOM location without blocking other slots
          scriptTargets.forEach(({ oldScript, placeholder }) => {
            if (cancelled || !container.isConnected) return;
            const newScript = buildExecutableScriptElement(oldScript);
            if (!newScript) {
              placeholder?.remove();
              return;
            }
            if (placeholder?.parentNode) {
              placeholder.parentNode.replaceChild(newScript, placeholder);
            } else {
              container.appendChild(newScript);
            }
          });
        }
      } else if (!hasStaticMarkup) {
        setAdFillState('empty');
      }
    }

    const evaluateSlotContent = () => {
      if (cancelled || !container) return;
      syncResponsiveEmbedLayout();
      if (hasVisibleAdContent(container)) {
        setAdFillState('filled');
      }
    };

    const mutationObserver = new MutationObserver(evaluateSlotContent);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['width', 'height', 'style']
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(evaluateSlotContent);
      if (outer) resizeObserver.observe(outer);
      resizeObserver.observe(container);
    }

    container.addEventListener('load', evaluateSlotContent, true);
    window.addEventListener('resize', syncResponsiveEmbedLayout);
    const hasRaf = typeof window.requestAnimationFrame === 'function';
    const rafId = hasRaf
      ? window.requestAnimationFrame(evaluateSlotContent)
      : window.setTimeout(evaluateSlotContent, 0);
    const lateTimers = [150, 600, 1500, AD_EMPTY_SETTLE_DELAY_MS].map((delay) =>
      window.setTimeout(() => {
        if (cancelled) return;
        syncResponsiveEmbedLayout();
        if (hasVisibleAdContent(container)) {
          setAdFillState('filled');
        } else if (delay === AD_EMPTY_SETTLE_DELAY_MS) {
          setAdFillState('empty');
        }
      }, delay)
    );

    return () => {
      cancelled = true;
      container.removeEventListener('load', evaluateSlotContent, true);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncResponsiveEmbedLayout);
      if (hasRaf) {
        window.cancelAnimationFrame(rafId);
      } else {
        window.clearTimeout(rafId);
      }
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
    slotConfig?.imageUrl,
    syncResponsiveEmbedLayout
  ]);

  // Re-sync code embed scaling whenever admin changes width, maxWidth, height, or spacing settings
  useEffect(() => {
    if (typeof window.requestAnimationFrame === 'function') {
      const rafId = window.requestAnimationFrame(syncResponsiveEmbedLayout);
      return () => window.cancelAnimationFrame(rafId);
    }
    const timerId = window.setTimeout(syncResponsiveEmbedLayout, 0);
    return () => window.clearTimeout(timerId);
  }, [
    adsSettings.displaySettings?.containerWidthPercent,
    adsSettings.displaySettings?.maxWidthPx,
    adsSettings.displaySettings?.containerHeightPx,
    adsSettings.displaySettings?.marginX,
    adsSettings.displaySettings?.paddingPx,
    syncResponsiveEmbedLayout
  ]);

  // Resolve ads settings cleanly before rendering; collapse empty placeholders
  if (!isAdsResolved) {
    return null;
  }

  // Master disabled or slot disabled: render nothing
  if (!adsSettings.masterEnabled || !slotConfig || !slotConfig.enabled) {
    return null;
  }

  const hasCustomBanner =
    slotConfig.type === 'banner' && isSafeAdAssetOrClickUrl(slotConfig.imageUrl);
  const hasCustomCode =
    slotConfig.type === 'code' && hasRenderableAdCode(slotConfig.code);

  // Never render an empty bordered ad container if neither custom banner nor code is populated
  if (!hasCustomBanner && !hasCustomCode) {
    return null;
  }

  const safeBannerLink = isSafeAdAssetOrClickUrl(slotConfig.linkUrl)
    ? slotConfig.linkUrl!.trim()
    : '';
  const placementLabel = placement === 'below_header' ? 'Partner Announcement' : 'Sponsored Content';
  const display = normalizeAdsDisplaySettings(adsSettings.displaySettings);
  const hasExplicitDisplay = Boolean(adsSettings.displaySettings);
  const hasCustomHeight =
    hasExplicitDisplay ||
    display.containerHeightPx !== DEFAULT_ADS_DISPLAY_SETTINGS.containerHeightPx;
  const contentMaxHeightPx = Math.max(
    40,
    display.containerHeightPx - display.paddingPx * 2 - 28
  );

  return (
    <div
      className={`w-full max-w-full min-w-0 px-0 min-[360px]:px-2 sm:px-6 lg:px-8 transition-all relative z-0 ${className}`}
      data-ad-placement={placement}
      data-ad-fill={hasCustomBanner ? 'filled' : adFillState}
      style={{
        marginTop: `${display.marginY}px`,
        marginBottom: `${display.marginY}px`
      }}
    >
      <div
        data-testid={`ad-slot-sized-${placement}`}
        className="mx-auto max-w-full min-w-0 transition-all"
        style={{
          width: `${display.containerWidthPercent}%`,
          maxWidth: `${display.maxWidthPx}px`,
          paddingLeft: display.marginX > 0 ? `clamp(0px, ${display.marginX}px, 12vw)` : undefined,
          paddingRight: display.marginX > 0 ? `clamp(0px, ${display.marginX}px, 12vw)` : undefined
        }}
      >
        <div
          data-testid={`ad-slot-card-${placement}`}
          className="w-full bg-slate-50/80 border-y min-[360px]:border border-slate-200/90 rounded-none min-[360px]:rounded-2xl shadow-2xs overflow-hidden relative flex flex-col"
          style={{
            padding: `${display.paddingPx}px`,
            minHeight: hasCustomHeight ? `${display.containerHeightPx}px` : undefined
          }}
        >
          {/* Subtle Ad Disclosure Header */}
          <div className="shrink-0 flex items-center justify-between px-2.5 min-[360px]:px-0 pb-1.5 mb-1.5 border-b border-slate-200/60 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{slotConfig.label || placementLabel}</span>
            </span>
            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
              AD
            </span>
          </div>

          {/* Ad Format 1: Banner Image with Link */}
          {slotConfig.type === 'banner' && hasCustomBanner && (
            <div className="flex-1 flex justify-center items-center w-full min-w-0 px-2.5 min-[360px]:px-0">
              {safeBannerLink ? (
                <a
                  href={safeBannerLink}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center justify-center max-w-full group relative overflow-hidden rounded-xl transition-transform hover:scale-[1.005]"
                  style={{ maxHeight: `${contentMaxHeightPx}px` }}
                >
                  <img
                    src={slotConfig.imageUrl}
                    alt={slotConfig.altText || 'Sponsor Banner'}
                    className="w-auto max-w-full h-auto object-contain mx-auto rounded-xl"
                    style={{ maxHeight: `${contentMaxHeightPx}px` }}
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
                  className="w-auto max-w-full h-auto object-contain mx-auto rounded-xl"
                  style={{ maxHeight: `${contentMaxHeightPx}px` }}
                  loading="lazy"
                />
              )}
            </div>
          )}

          {/* Ad Format 2: Custom Script / Embed Code (Responsive block wrapper prevents 0px mobile flex collapse) */}
          {slotConfig.type === 'code' && (
            <div className="flex-1 flex items-center justify-center w-full min-w-0">
              <div ref={outerWrapperRef} className="ad-slot-wrapper w-full min-w-0 min-h-[50px] overflow-hidden">
                <div
                  ref={codeContainerRef}
                  className="ad-slot-content block w-full min-w-0 min-h-[50px] text-xs text-slate-700 text-center"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

