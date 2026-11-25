import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

export const HILLTOPADS_HEADER_BANNER_WIDTH = 300;
export const HILLTOPADS_HEADER_BANNER_HEIGHT = 100;
export const HILLTOPADS_HEADER_SCRIPT_SRC =
  '//conventionalresponse.com/b.XvV/sVdfGel-0AYtWjcO/DeymY9mu-ZIU/lAkoPGTpch2/N/Tecd4iNHj/kztpNVz/Yj1PN/zsgR3FMLwS';

interface HilltopAdsScriptElement extends HTMLScriptElement {
  settings?: Record<string, unknown>;
}

interface HilltopAdsHeaderBannerProps {
  currentPage?: string;
}

function isAdminPathOrPage(currentPage?: string): boolean {
  if (currentPage === 'admin') return true;
  if (typeof window !== 'undefined') {
    return window.location.pathname.toLowerCase().startsWith('/admin');
  }
  return false;
}

export const HilltopAdsHeaderBanner: React.FC<HilltopAdsHeaderBannerProps> = ({
  currentPage
}) => {
  const isHiddenForAdmin = isAdminPathOrPage(currentPage);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const slotContainerRef = useRef<HTMLDivElement | null>(null);
  const hasInjectedRef = useRef<boolean>(false);
  const [scale, setScale] = useState<number>(1);

  useEffect(() => {
    if (isHiddenForAdmin) return;
    const stageEl = stageRef.current;
    if (!stageEl || typeof window === 'undefined') return;

    const updateResponsiveScale = () => {
      const availableWidth = stageEl.clientWidth || window.innerWidth;
      if (availableWidth > 0 && availableWidth < HILLTOPADS_HEADER_BANNER_WIDTH) {
        const nextScale = Math.max(
          0.65,
          Math.min(1, availableWidth / HILLTOPADS_HEADER_BANNER_WIDTH)
        );
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
  }, [isHiddenForAdmin]);

  useEffect(() => {
    if (isHiddenForAdmin) {
      hasInjectedRef.current = false;
      if (slotContainerRef.current) {
        slotContainerRef.current.replaceChildren();
      }
      return;
    }

    const container = slotContainerRef.current;
    if (!container || typeof document === 'undefined') {
      return;
    }

    if (
      hasInjectedRef.current &&
      container.querySelector('script[src*="conventionalresponse.com/b.XvV/sV"]')
    ) {
      return;
    }

    let cancelled = false;

    const timerId = setTimeout(() => {
      if (cancelled || !slotContainerRef.current || isAdminPathOrPage(currentPage)) {
        return;
      }

      // Guarantee a single active 300x100 header banner script instance in the document
      const existingScript = document.querySelector(
        'script[src*="conventionalresponse.com/b.XvV/sV"]'
      );
      if (existingScript) {
        hasInjectedRef.current = true;
        return;
      }

      const activeContainer = slotContainerRef.current;
      activeContainer.replaceChildren();

      const s = document.createElement('script') as HilltopAdsScriptElement;
      s.settings = {};
      s.src = HILLTOPADS_HEADER_SCRIPT_SRC;
      s.async = true;
      s.referrerPolicy = 'no-referrer-when-downgrade';
      s.setAttribute('data-hilltopads-zone', 'header-300x100');

      activeContainer.appendChild(s);
      hasInjectedRef.current = true;
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      hasInjectedRef.current = false;
      if (slotContainerRef.current) {
        slotContainerRef.current.replaceChildren();
      }
    };
  }, [isHiddenForAdmin]);

  if (isHiddenForAdmin) {
    return null;
  }

  const scaledHeight = Math.round(HILLTOPADS_HEADER_BANNER_HEIGHT * scale);

  return (
    <aside
      aria-label="Advertisement"
      data-testid="hilltopads-header-banner"
      data-ad-placement="below_header_300x100_banner"
      data-ad-network="hilltopads"
      data-ad-size="300x100"
      className="no-print w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-1 flex justify-center min-w-0 clear-both"
    >
      <div className="theme-card w-full max-w-[332px] sm:max-w-[340px] border px-2.5 py-2 sm:px-3 sm:py-2.5 shadow-2xs overflow-hidden">
        <div
          className="flex items-center justify-between gap-2 pb-1 mb-2 border-b text-[10px] font-semibold uppercase tracking-wider"
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
            data-testid="hilltopads-300x100-slot"
            className="shrink-0 overflow-hidden flex items-center justify-center"
            style={{
              width: `${HILLTOPADS_HEADER_BANNER_WIDTH}px`,
              height: `${HILLTOPADS_HEADER_BANNER_HEIGHT}px`,
              minWidth: `${HILLTOPADS_HEADER_BANNER_WIDTH}px`,
              minHeight: `${HILLTOPADS_HEADER_BANNER_HEIGHT}px`,
              transform: scale < 1 ? `scale(${scale})` : undefined,
              transformOrigin: 'top center'
            }}
          />
        </div>
      </div>
    </aside>
  );
};
