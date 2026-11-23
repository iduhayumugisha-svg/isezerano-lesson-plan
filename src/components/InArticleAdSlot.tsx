import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import {
  InArticleAdSlotConfig,
  InArticleAdSlotKey
} from '../types/platform';
import {
  analyzeAdCodeSnippet,
  getProviderDisplayName,
  installIntrusivePopunderDomGuard,
  isInArticleSlotRenderable,
  isIntrusivePopunderElement,
  isSafeAdAssetOrClickUrl,
  isSafeAdScriptUrl,
  normalizeInArticleAdSlotConfig,
  sanitizeAdCodePayload,
  sanitizeAdConfigText,
  sanitizeStaticAdElement,
  shouldSkipDuplicateOverlayScript
} from '../utils/inArticleAdUtils';

interface InArticleAdSlotProps {
  slotId: InArticleAdSlotKey;
  slotConfig: InArticleAdSlotConfig;
  articleId: string;
  className?: string;
}

const AD_SCRIPT_TIMEOUT_MS = 12000;
const EMPTY_SETTLE_DELAY_MS = 3200;

let inArticleExecutionQueue: Promise<void> = Promise.resolve();

function enqueueInArticleExecution(task: () => Promise<void>): void {
  inArticleExecutionQueue = inArticleExecutionQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await task();
      } catch {
        // Keep serialized queue healthy if an external script throws
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

  // Remove any <meta> tags (those belong in <head> via GlobalAdScripts)
  for (const meta of Array.from(root.querySelectorAll('meta'))) {
    meta.remove();
  }

  // Replace nested or top-level <script> nodes with comment anchors so they execute in exact DOM order
  for (const oldScript of Array.from(root.querySelectorAll('script'))) {
    const parent = oldScript.parentNode;
    if (parent) {
      const marker = document.createComment('isezerano-ad-script');
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

export const InArticleAdSlot: React.FC<InArticleAdSlotProps> = ({
  slotId,
  slotConfig,
  articleId,
  className = ''
}) => {
  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const appliedSignatureRef = useRef<string>('');
  const [adFillState, setAdFillState] = useState<'pending' | 'filled' | 'empty'>('pending');

  const normalizedSlot = normalizeInArticleAdSlotConfig(slotId, slotConfig);
  const isDirectLinkMode = normalizedSlot.adFormat === 'direct_link';
  const directCard = normalizedSlot.directLinkCard;

  const sanitizedCode = isDirectLinkMode ? '' : sanitizeAdCodePayload(normalizedSlot.code);
  const isSlotReady = isInArticleSlotRenderable(normalizedSlot);
  const isEnabled = Boolean(
    isSlotReady && (normalizedSlot.mobileEnabled || normalizedSlot.desktopEnabled)
  );
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setThumbFailed(false);
  }, [directCard?.thumbnailUrl, articleId, slotId]);

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

    if (!isEnabled || isDirectLinkMode || !container) {
      appliedSignatureRef.current = '';
      if (container) container.innerHTML = '';
      if (outer) outer.style.height = '';
      if (isDirectLinkMode && isEnabled) {
        setAdFillState('filled');
      }
      return;
    }

    // Check active viewport eligibility before running external scripts
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

    const nextSignature = `${articleId}::${slotId}::${sanitizedCode}`;
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
          enqueueInArticleExecution(async () => {
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
    articleId,
    slotId,
    isEnabled,
    isDirectLinkMode,
    sanitizedCode,
    normalizedSlot.mobileEnabled,
    normalizedSlot.desktopEnabled,
    syncResponsiveEmbedLayout
  ]);

  if (!isEnabled) {
    return null;
  }

  const deviceVisibilityClass =
    normalizedSlot.desktopEnabled && normalizedSlot.mobileEnabled
      ? 'block'
      : normalizedSlot.desktopEnabled
      ? 'hidden md:block'
      : 'block md:hidden';

  const providerName = getProviderDisplayName(normalizedSlot.provider, normalizedSlot.providerLabel);

  if (isDirectLinkMode && directCard) {
    const cardDisclosure = sanitizeAdConfigText(
      directCard.disclosureLabel || normalizedSlot.label,
      'Sponsored',
      40
    );
    const hasThumbnail =
      Boolean(directCard.thumbnailUrl) &&
      !thumbFailed &&
      isSafeAdAssetOrClickUrl(directCard.thumbnailUrl);

    return (
      <aside
        aria-label={`${cardDisclosure} (${slotId})`}
        data-testid={`in-article-ad-${slotId}`}
        data-ad-placement={`in_article_${slotId}`}
        data-ad-format="direct_link"
        data-ad-provider={normalizedSlot.provider}
        data-after-paragraph={normalizedSlot.afterParagraph}
        data-ad-fill="filled"
        className={`no-print my-6 w-full max-w-full min-w-0 clear-both transition-all ${deviceVisibilityClass} ${className}`}
      >
        <div className="w-full max-w-full min-w-0 bg-slate-50/95 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200/70 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
              <span className="truncate">{cardDisclosure}</span>
            </span>
            <span
              className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono shrink-0"
              title={providerName}
            >
              SPONSORED
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
              {hasThumbnail ? (
                <a
                  href={directCard.directLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="block w-full sm:w-28 h-36 sm:h-20 rounded-xl overflow-hidden bg-slate-200/70 border border-slate-200 shrink-0"
                >
                  <img
                    src={directCard.thumbnailUrl}
                    alt={directCard.headline}
                    loading="lazy"
                    onError={() => setThumbFailed(true)}
                    className="w-full h-full object-cover"
                  />
                </a>
              ) : (
                <div
                  aria-hidden="true"
                  className="hidden sm:flex w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 items-center justify-center shrink-0"
                >
                  <Sparkles className="w-5 h-5 text-teal-700" />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <a
                  href={directCard.directLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="block text-sm sm:text-[15px] font-bold text-slate-900 hover:text-teal-800 leading-snug break-words transition-colors"
                >
                  {directCard.headline}
                </a>
                {directCard.description && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 break-words m-0">
                    {directCard.description}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <a
                href={directCard.directLinkUrl}
                target="_blank"
                rel="noopener noreferrer sponsored"
                data-testid={`in-article-ad-${slotId}-cta`}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-extrabold whitespace-nowrap shadow-2xs transition-colors"
              >
                <span>{directCard.ctaText}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  const disclosureLabel = sanitizeAdConfigText(normalizedSlot.label, 'Advertisement', 40);

  return (
    <aside
      aria-label={`${disclosureLabel} (${slotId})`}
      data-testid={`in-article-ad-${slotId}`}
      data-ad-placement={`in_article_${slotId}`}
      data-ad-format="code"
      data-ad-provider={normalizedSlot.provider}
      data-after-paragraph={normalizedSlot.afterParagraph}
      data-ad-fill={adFillState}
      className={`no-print my-6 w-full max-w-full min-w-0 clear-both transition-all ${deviceVisibilityClass} ${className}`}
    >
      <div className="w-full max-w-full bg-slate-50/85 border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs overflow-hidden">
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
