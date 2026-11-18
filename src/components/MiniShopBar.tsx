import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { MiniShopProduct } from '../types/platform';
import {
  buildMiniShopTelHref,
  buildMiniShopWhatsAppUrl,
  filterActiveMiniShopProducts,
  getNextMiniShopProductIndex
} from '../utils/miniShopUtils';

interface MiniShopBarProps {
  products: MiniShopProduct[];
  visible?: boolean;
  onHeightChange?: (height: number) => void;
}

export const MiniShopBar: React.FC<MiniShopBarProps> = ({
  products,
  visible = true,
  onHeightChange
}) => {
  const activeProducts = useMemo(() => filterActiveMiniShopProducts(products), [products]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const barRef = useRef<HTMLElement | null>(null);

  const shouldRender = visible && activeProducts.length > 0;

  useEffect(() => {
    setActiveIndex((prev) => {
      if (activeProducts.length === 0) return 0;
      return prev >= activeProducts.length ? 0 : prev;
    });
  }, [activeProducts.length]);

  useEffect(() => {
    const publishHeight = (px: number) => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--mini-shop-height', `${px}px`);
      }
      onHeightChange?.(px);
    };

    if (!shouldRender || !barRef.current) {
      publishHeight(0);
      return;
    }

    const measure = () => {
      if (!barRef.current) return;
      const measured = Math.ceil(barRef.current.getBoundingClientRect().height || barRef.current.offsetHeight || 0);
      publishHeight(measured);
    };

    measure();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measure());
      resizeObserver.observe(barRef.current);
    }
    window.addEventListener('resize', measure);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--mini-shop-height', '0px');
      }
    };
  }, [shouldRender, activeIndex, activeProducts.length, onHeightChange]);

  if (!shouldRender) {
    return null;
  }

  const currentProduct = activeProducts[activeIndex] || activeProducts[0];
  if (!currentProduct) {
    return null;
  }

  const whatsappHref = buildMiniShopWhatsAppUrl(currentProduct.whatsappNumber, currentProduct.title);
  const telHref = buildMiniShopTelHref(currentProduct.phoneNumber);
  const hasMultiple = activeProducts.length > 1;
  const imgBroken = Boolean(imageErrorMap[currentProduct.id]);

  const handleNextProduct = () => {
    if (!hasMultiple) return;
    setActiveIndex((prev) => getNextMiniShopProductIndex(prev, activeProducts.length));
  };

  return (
    <aside
      ref={barRef}
      data-testid="mini-shop-bar"
      aria-label="Featured Products Mini Shop"
      className="no-print fixed top-0 left-0 right-0 z-50 w-full bg-slate-950 text-white border-b border-slate-800 shadow-md"
    >
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4 min-w-0">
        {/* Product Thumbnail + Title + Price + Short Description */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 flex items-center justify-center">
            {currentProduct.imageUrl && !imgBroken ? (
              <img
                key={currentProduct.id}
                src={currentProduct.imageUrl}
                alt={currentProduct.title}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
                onError={() =>
                  setImageErrorMap((prev) => ({
                    ...prev,
                    [currentProduct.id]: true
                  }))
                }
              />
            ) : (
              <ShoppingBag className="w-4 h-4 text-amber-300" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span
                className="text-xs sm:text-sm font-extrabold text-white truncate"
                title={currentProduct.title}
              >
                {currentProduct.title}
              </span>
              {currentProduct.price && (
                <span
                  data-testid="mini-shop-price"
                  className="shrink-0 text-[10px] sm:text-xs font-extrabold text-amber-300 bg-amber-500/15 border border-amber-400/35 px-1.5 py-0.5 rounded"
                >
                  {currentProduct.price}
                </span>
              )}
            </div>
            <p
              className="text-[11px] sm:text-xs text-slate-300 truncate leading-tight mt-0.5"
              title={currentProduct.description}
            >
              {currentProduct.description}
            </p>
          </div>
        </div>

        {/* Contact Seller Actions + Komeza Cycling Button */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0">
          <span
            data-testid="mini-shop-counter"
            className="text-[10px] font-bold text-slate-400 tabular-nums px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
            aria-label={`Product ${activeIndex + 1} of ${activeProducts.length}`}
          >
            {activeIndex + 1}/{activeProducts.length}
          </span>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="mini-shop-whatsapp"
                aria-label={`Message seller on WhatsApp about ${currentProduct.title}`}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-slate-950 text-[11px] sm:text-xs font-extrabold transition-all shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>WhatsApp</span>
              </a>
            )}

            {telHref && (
              <a
                href={telHref}
                data-testid="mini-shop-call"
                aria-label={`Call seller at ${currentProduct.phoneNumber}`}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:scale-[0.98] text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Call</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleNextProduct}
              disabled={!hasMultiple}
              data-testid="mini-shop-komeza"
              aria-label={
                hasMultiple
                  ? `Next product (${activeIndex + 1} of ${activeProducts.length})`
                  : 'Single active product displayed'
              }
              title={
                hasMultiple
                  ? 'Komeza — Reba igicuruzwa gikurikira'
                  : '1 product currently active'
              }
              className={`inline-flex items-center gap-0.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all border ${
                hasMultiple
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border-amber-300 cursor-pointer active:scale-[0.98] shadow-xs'
                  : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
            >
              <span>Komeza</span>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
