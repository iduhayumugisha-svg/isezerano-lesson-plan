import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

export const HILLTOPADS_BANNER_WIDTH = 300;
export const HILLTOPADS_BANNER_HEIGHT = 250;
export const HILLTOPADS_SCRIPT_SRC =
  '//conventionalresponse.com/b/XRV/s.dcGklE0QY/WocU/BeamJ9pu/ZNUPljkRPSTFcX2LNFTacv4yNvTdM/tdNTzQYC1yNrzqgi1CNTwV';

interface HilltopAdsScriptElement extends HTMLScriptElement {
  settings?: Record<string, unknown>;
}

interface HilltopAdsArticleBannerProps {
  articleId: string;
}

export const HilltopAdsArticleBanner: React.FC<HilltopAdsArticleBannerProps> = ({
  articleId
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const slotContainerRef = useRef<HTMLDivElement | null>(null);
  const loadedArticleIdRef = useRef<string | null>(null);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl || typeof window === 'undefined') return;

    const updateResponsiveScale = () => {
      const availableWidth = stageEl.clientWidth || window.innerWidth;
      if (availableWidth > 0 && availableWidth < HILLTOPADS_BANNER_WIDTH) {
        const nextScale = Math.max(0.65, Math.min(1, availableWidth / HILLTOPADS_BANNER_WIDTH));
        setScale(Number(nextScale.toFixed(4)));
      } else {
        setScale(1);
      }
    };

    updateResponsiveScale();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateResponsiveScale);
      observer.observe(stageEl);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', updateResponsiveScale);
    return () => window.removeEventListener('resize', updateResponsiveScale);
  }, []);

  useEffect(() => {
    const container = slotContainerRef.current;
    if (!container || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (window.location.pathname.toLowerCase().startsWith('/admin')) {
      return;
    }

    // Never re-inject repeatedly for the same article render cycle
    if (
      loadedArticleIdRef.current === articleId &&
      container.querySelector(`script[src*="conventionalresponse.com"]`)
    ) {
      return;
    }

    let cancelled = false;

    const timerId = setTimeout(() => {
      if (cancelled || !slotContainerRef.current) return;

      // Guarantee a single active HilltopAds script instance in the document
      const existingGlobalScript = document.querySelector(
        `script[src*="conventionalresponse.com/b/XRV/s."]`
      );
      if (existingGlobalScript) {
        return;
      }

      const activeContainer = slotContainerRef.current;
      activeContainer.replaceChildren();

      const s = document.createElement('script') as HilltopAdsScriptElement;
      s.settings = {};
      s.src = HILLTOPADS_SCRIPT_SRC;
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      s.setAttribute('data-hilltopads-zone', 'article-300x250');

      activeContainer.appendChild(s);
      loadedArticleIdRef.current = articleId;
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      loadedArticleIdRef.current = null;
      if (slotContainerRef.current) {
        slotContainerRef.current.replaceChildren();
      }
    };
  }, [articleId]);

  const scaledHeight = Math.round(HILLTOPADS_BANNER_HEIGHT * scale);

  return (
    <aside
      aria-label="Advertisement"
      data-testid="hilltopads-article-banner"
      data-ad-placement="article_300x250_banner"
      data-ad-network="hilltopads"
      data-ad-size="300x250"
      className="no-print my-6 w-full max-w-full min-w-0 clear-both"
    >
      <div className="theme-card w-full max-w-full border p-3 sm:p-4 shadow-2xs overflow-hidden">
        <div
          className="flex items-center justify-between gap-2 pb-1.5 mb-3 border-b text-[10px] font-semibold uppercase tracking-wider"
          style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="truncate">Advertisement</span>
          </span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0 border"
            style={{
              backgroundColor: 'var(--app-body-bg)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-muted-text)'
            }}
          >
            AD
          </span>
        </div>

        <div
          ref={stageRef}
          className="w-full min-w-0 flex items-start justify-center overflow-hidden"
          style={{ height: `${scaledHeight}px` }}
        >
          <div
            ref={slotContainerRef}
            data-testid="hilltopads-300x250-slot"
            className="shrink-0 overflow-hidden flex items-center justify-center"
            style={{
              width: `${HILLTOPADS_BANNER_WIDTH}px`,
              height: `${HILLTOPADS_BANNER_HEIGHT}px`,
              minWidth: `${HILLTOPADS_BANNER_WIDTH}px`,
              minHeight: `${HILLTOPADS_BANNER_HEIGHT}px`,
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: 'top center'
            }}
          />
        </div>
      </div>
    </aside>
  );
};
