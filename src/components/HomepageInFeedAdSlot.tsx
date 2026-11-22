import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  HomepageInFeedAdSlotConfig,
  HomepageInFeedAdSlotKey
} from '../types/platform';
import {
  analyzeAdCodeSnippet,
  getProviderDisplayName,
  hasRenderableAdCode,
  installIntrusivePopunderDomGuard,
  isIntrusivePopunderElement,
  isSafeAdScriptUrl,
  sanitizeAdCodePayload,
  sanitizeAdConfigText,
  sanitizeStaticAdElement,
  shouldSkipDuplicateOverlayScript
} from '../utils/inArticleAdUtils';

interface HomepageInFeedAdSlotProps {
  slotId: HomepageInFeedAdSlotKey;
  slotConfig: HomepageInFeedAdSlotConfig;
  feedContext: string;
  className?: string;
}

const AD_SCRIPT_TIMEOUT_MS = 12000;
const EMPTY_SETTLE_DELAY_MS = 3200;

let homepageInFeedQueue: Promise<void> = Promise.resolve();

function enqueueHomepageInFeedExecution(task: () => Promise<void>): void {
  homepageInFeedQueue = homepageInFeedQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await task();
      } catch {
        // Keep queue intact if a third-party script throws
      }
    });
}

function buildExecutableScriptElement(oldScript: HTMLScriptElement): HTMLScriptElement | null {
  if (isIntrusivePopunderElement(oldScript)) {
    return null;
  }
  const src = oldScript.getAttribute('src')?.trim() || '';
  if (src && !isSafeAdScriptUrl(src)) {
    return null;
  }
  if (shouldSkipDuplicateOverlayScript(oldScript)) {
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

  for (const oldScript of Array.from(root.querySelectorAll('script'))) {
    const parent = oldScript.parentNode;
    if (parent) {
      const marker = document.createComment('isezerano-homepage-ad-script');
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
        const timerId = window.setTimeout(finish, AD_SCRIPT_TIMEOUT_MS);
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
    } else {
      return true;
    }
  }
  const visibleDivs = container.querySelectorAll('div, span, p, section');
  for (const el of Array.from(visibleDivs)) {
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

export const HomepageInFeedAdSlot: React.FC<HomepageInFeedAdSlotProps> = ({
  slotId,
  slotConfig,
  feedContext,
  className = ''
}) => {
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const appliedSignatureRef = useRef<string>('');
  const [adFillState, setAdFillState] = useState<'pending' | 'filled' | 'empty'>('pending');

  const sanitizedCode = sanitizeAdCodePayload(slotConfig?.code);
  const isAdminRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.toLowerCase().startsWith('/admin');
  const isEnabled = Boolean(
    !isAdminRoute &&
      slotConfig?.enabled &&
      hasRenderableAdCode(sanitizedCode) &&
      (slotConfig.mobileEnabled || slotConfig.desktopEnabled)
  );

  const syncResponsiveEmbedLayout = useCallback(() => {
    const outer = outerWrapperRef.current;
    const container = codeContainerRef.current;
    if (!outer || !container) return;

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

    if (container.scrollWidth > availableWidth + 2 && container.scrollWidth > targetWidth) {
      targetWidth = container.scrollWidth;
      targetHeight = Math.max(targetHeight, container.scrollHeight);
    }

    if (targetWidth > availableWidth + 1) {
      const baseWidth = Math.max(targetWidth, container.scrollWidth, availableWidth);
      const measuredHeight = Math.max(
        targetHeight,
        container.scrollHeight,
        container.offsetHeight,
        60
      );
      const scale = Math.max(0.28, availableWidth / baseWidth);
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

  useEffect(() => {
    setAdFillState('pending');
    const container = codeContainerRef.current;
    const outer = outerWrapperRef.current;

    if (!isEnabled || !container) {
      appliedSignatureRef.current = '';
      if (container) container.innerHTML = '';
      if (outer) outer.style.height = '';
      return;
    }

    if (typeof window !== 'undefined') {
      const isMobileViewport = window.innerWidth < 768;
      if (isMobileViewport && !slotConfig.mobileEnabled) {
        container.innerHTML = '';
        return;
      }
      if (!isMobileViewport && !slotConfig.desktopEnabled) {
        container.innerHTML = '';
        return;
      }
    }

    installIntrusivePopunderDomGuard();

    const nextSignature = `${feedContext}::${slotId}::${sanitizedCode}`;
    let cancelled = false;
    const snippetAnalysis = analyzeAdCodeSnippet(sanitizedCode);

    if (appliedSignatureRef.current !== nextSignature || container.childNodes.length === 0) {
      appliedSignatureRef.current = nextSignature;
      container.innerHTML = '';
      if (outer) outer.style.height = '';

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizedCode;

      const { scriptTargets, hasStaticMarkup } = extractNestedScriptsAndSanitizeDom(tempDiv);

      while (tempDiv.firstChild) {
        container.appendChild(tempDiv.firstChild);
      }

      if (hasStaticMarkup && hasVisibleAdContent(container)) {
        setAdFillState('filled');
      }

      if (scriptTargets.length > 0) {
        if (snippetAnalysis.needsSerializedQueue) {
          enqueueHomepageInFeedExecution(async () => {
            if (cancelled || !container.isConnected) return;

            const originalWrite = document.write.bind(document);
            const originalWriteln = document.writeln.bind(document);
            const pendingWrittenScripts: Promise<void>[] = [];
            let writeBuffer = '';

            const flushWriteBuffer = (force = false) => {
              if (!writeBuffer) return;
              const openScripts = (writeBuffer.match(/<script\b/gi) || []).length;
              const closeScripts = (writeBuffer.match(/<\/script>/gi) || []).length;
              if (!force && openScripts > closeScripts) return;
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
                    const timeoutId = window.setTimeout(finish, AD_SCRIPT_TIMEOUT_MS);
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
                setAdFillState(hasVisibleAdContent(container) ? 'filled' : 'empty');
              }
            }
          });
        } else {
          for (const { oldScript, placeholder } of scriptTargets) {
            if (cancelled || !container.isConnected) break;
            const newScript = buildExecutableScriptElement(oldScript);
            if (!newScript) {
              placeholder?.remove();
              continue;
            }
            if (placeholder?.parentNode) {
              placeholder.parentNode.replaceChild(newScript, placeholder);
            } else {
              container.appendChild(newScript);
            }
          }
        }
      } else if (!hasStaticMarkup) {
        setAdFillState('empty');
      }
    }

    const evaluateContentVisibility = () => {
      if (cancelled || !container) return;
      syncResponsiveEmbedLayout();
      if (hasVisibleAdContent(container)) {
        setAdFillState('filled');
      }
    };

    const mutationObserver = new MutationObserver(evaluateContentVisibility);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['width', 'height', 'style']
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(evaluateContentVisibility);
      if (outer) resizeObserver.observe(outer);
      resizeObserver.observe(container);
    }

    container.addEventListener('load', evaluateContentVisibility, true);
    window.addEventListener('resize', syncResponsiveEmbedLayout);

    const hasRaf = typeof window.requestAnimationFrame === 'function';
    const rafId = hasRaf
      ? window.requestAnimationFrame(evaluateContentVisibility)
      : window.setTimeout(evaluateContentVisibility, 0);
    const settleTimerId = window.setTimeout(() => {
      if (cancelled || !container) return;
      syncResponsiveEmbedLayout();
      if (!hasVisibleAdContent(container)) {
        setAdFillState('empty');
      }
    }, EMPTY_SETTLE_DELAY_MS);

    return () => {
      cancelled = true;
      container.removeEventListener('load', evaluateContentVisibility, true);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener('resize', syncResponsiveEmbedLayout);
      if (hasRaf) {
        window.cancelAnimationFrame(rafId);
      } else {
        window.clearTimeout(rafId);
      }
      window.clearTimeout(settleTimerId);
      appliedSignatureRef.current = '';
      container.innerHTML = '';
      container.style.width = '';
      container.style.transform = '';
      container.style.transformOrigin = '';
      if (outer) {
        outer.style.height = '';
      }
    };
  }, [
    feedContext,
    slotId,
    isEnabled,
    sanitizedCode,
    slotConfig.mobileEnabled,
    slotConfig.desktopEnabled,
    syncResponsiveEmbedLayout
  ]);

  if (!isEnabled) {
    return null;
  }

  const deviceVisibilityClass =
    slotConfig.desktopEnabled && slotConfig.mobileEnabled
      ? 'block'
      : slotConfig.desktopEnabled
      ? 'hidden md:block'
      : 'block md:hidden';

  const disclosureLabel = sanitizeAdConfigText(slotConfig.label, 'Advertisement', 40);
  const providerName = getProviderDisplayName(slotConfig.provider, slotConfig.providerLabel);

  return (
    <aside
      aria-label={`${disclosureLabel} (${slotId})`}
      data-testid={`homepage-in-feed-ad-${slotId}`}
      data-ad-placement={`homepage_in_feed_${slotId}`}
      data-ad-provider={slotConfig.provider}
      data-after-post={slotConfig.afterPost}
      data-ad-fill={adFillState}
      className={`no-print w-full max-w-full min-w-0 clear-both transition-all ${deviceVisibilityClass} ${className}`}
    >
      <div className="w-full max-w-full bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-200/70 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="truncate">{disclosureLabel}</span>
          </span>
          <span
            className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono shrink-0"
            title={providerName}
          >
            AD
          </span>
        </div>

        <div className="flex items-center justify-center w-full min-w-0">
          <div
            ref={outerWrapperRef}
            className="ad-slot-wrapper w-full min-w-0 min-h-[50px] overflow-hidden"
          >
            <div
              ref={codeContainerRef}
              className="ad-slot-content block w-full min-w-0 min-h-[50px] text-xs text-slate-700 text-center"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
