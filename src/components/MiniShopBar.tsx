import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { MiniShopProduct } from '../types/platform';
import {
  buildMiniShopTelHref,
  buildMiniShopWhatsAppUrl,
  filterActiveMiniShopProducts,
  getNextMiniShopProductIndex
} from '../utils/miniShopUtils';
import {
  DEFAULT_MINI_SHOP_DISPLAY_SETTINGS,
  MiniShopDisplaySettings,
  getMiniShopVisibleSlice,
  normalizeMiniShopDisplaySettings,
  resolveMiniShopColumnsForWidth
} from '../utils/displaySettingsUtils';

interface MiniShopBarProps {
  products: MiniShopProduct[];
  visible?: boolean;
  onHeightChange?: (height: number) => void;
  displaySettings?: MiniShopDisplaySettings;
  onOpenShop?: () => void;
}

export const MiniShopBar: React.FC<MiniShopBarProps> = ({
  products,
  visible = true,
  onHeightChange,
  displaySettings,
  onOpenShop
}) => {
  const activeProducts = useMemo(() => filterActiveMiniShopProducts(products), [products]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const barRef = useRef<HTMLElement | null>(null);

  const display = useMemo(
    () => normalizeMiniShopDisplaySettings(displaySettings || DEFAULT_MINI_SHOP_DISPLAY_SETTINGS),
    [displaySettings]
  );

  const activeColumns = resolveMiniShopColumnsForWidth(display, viewportWidth);
  const shouldRender = visible && activeProducts.length > 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  }, [shouldRender, activeIndex, activeProducts.length, activeColumns, display, onHeightChange]);

  if (!shouldRender) {
    return null;
  }

  const visibleProducts = getMiniShopVisibleSlice(activeProducts, activeIndex, activeColumns);
  const currentProduct = visibleProducts[0] || activeProducts[0];
  if (!currentProduct) {
    return null;
  }

  const hasMultiple = activeProducts.length > 1;
  const effectiveCols = Math.max(1, Math.min(activeColumns, visibleProducts.length));

  const handleNextProduct = () => {
    if (!hasMultiple) return;
    setActiveIndex((prev) => getNextMiniShopProductIndex(prev, activeProducts.length));
  };

  return (
    <aside
      ref={barRef}
      data-testid="mini-shop-bar"
      aria-label="Featured Products Mini Shop"
      className="no-print fixed top-0 left-0 right-0 z-50 w-full bg-transparent pointer-events-none overflow-x-hidden"
    >
      <div
        data-testid="mini-shop-container"
        className="pointer-events-auto mx-auto bg-slate-950 text-white border-b border-x border-slate-800 shadow-md max-w-full px-2.5 sm:px-6 lg:px-8 py-1.5 sm:py-2 flex flex-col justify-center min-w-0 transition-all"
        style={{
          width: `${display.sectionWidthPercent}%`,
          maxWidth: `${display.sectionMaxWidthPx}px`,
          minHeight: `${display.sectionMinHeightPx}px`
        }}
      >
        {effectiveCols === 1 ? (
          (() => {
            const whatsappHref = buildMiniShopWhatsAppUrl(currentProduct.whatsappNumber, currentProduct.title);
            const telHref = buildMiniShopTelHref(currentProduct.phoneNumber);
            const imgBroken = Boolean(imageErrorMap[currentProduct.id]);
            return (
              <div
                data-testid="mini-shop-card-single"
                className="w-full max-w-full mx-auto rounded-xl bg-slate-900/80 border border-slate-800 px-2.5 sm:px-3 py-1.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4 min-w-0 transition-all"
                style={{
                  maxWidth: `${display.cardWidthPx}px`,
                  minHeight: `${display.cardHeightPx}px`
                }}
              >
                {/* Product Thumbnail + Title + Price + Short Description */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <div
                    data-testid={`mini-shop-image-${currentProduct.id}`}
                    className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 flex items-center justify-center"
                    style={{
                      width: `${display.imageSizePx}px`,
                      height: `${display.imageSizePx}px`
                    }}
                  >
                    {currentProduct.imageUrl && !imgBroken ? (
                      <img
                        key={currentProduct.id}
                        src={currentProduct.imageUrl}
                        alt={currentProduct.title}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-contain"
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
                <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0 flex-wrap">
                  <span
                    data-testid="mini-shop-counter"
                    className="text-[10px] font-bold text-slate-400 tabular-nums px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                    aria-label={`Product ${activeIndex + 1} of ${activeProducts.length}`}
                  >
                    {activeIndex + 1}/{activeProducts.length}
                  </span>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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

                    {onOpenShop && (
                      <button
                        type="button"
                        onClick={onOpenShop}
                        data-testid="mini-shop-open-shop"
                        aria-label="Open full Shop page with video and all products"
                        className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>Shop</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="space-y-2 min-w-0">
            <div
              data-testid="mini-shop-grid"
              className="w-full min-w-0"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${effectiveCols}, minmax(0, 1fr))`,
                gap: `${display.cardGapPx}px`
              }}
            >
              {visibleProducts.map((prod) => {
                const whatsappHref = buildMiniShopWhatsAppUrl(prod.whatsappNumber, prod.title);
                const telHref = buildMiniShopTelHref(prod.phoneNumber);
                const imgBroken = Boolean(imageErrorMap[prod.id]);
                return (
                  <div
                    key={prod.id}
                    data-testid={`mini-shop-card-${prod.id}`}
                    className="w-full max-w-full mx-auto rounded-xl bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 min-w-0 transition-all"
                    style={{
                      maxWidth: `${display.cardWidthPx}px`,
                      minHeight: `${display.cardHeightPx}px`
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        data-testid={`mini-shop-image-${prod.id}`}
                        className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 flex items-center justify-center"
                        style={{
                          width: `${display.imageSizePx}px`,
                          height: `${display.imageSizePx}px`
                        }}
                      >
                        {prod.imageUrl && !imgBroken ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.title}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-contain"
                            onError={() =>
                              setImageErrorMap((prev) => ({
                                ...prev,
                                [prod.id]: true
                              }))
                            }
                          />
                        ) : (
                          <ShoppingBag className="w-4 h-4 text-amber-300" aria-hidden="true" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-extrabold text-white truncate" title={prod.title}>
                            {prod.title}
                          </span>
                          {prod.price && (
                            <span
                              data-testid="mini-shop-price"
                              className="shrink-0 text-[10px] font-extrabold text-amber-300 bg-amber-500/15 border border-amber-400/35 px-1.5 py-0.5 rounded"
                            >
                              {prod.price}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 truncate leading-tight mt-0.5" title={prod.description}>
                          {prod.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid="mini-shop-whatsapp"
                          aria-label={`Message seller on WhatsApp about ${prod.title}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] text-slate-950 text-[10px] font-extrabold transition-all shadow-xs"
                        >
                          <MessageCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {telHref && (
                        <a
                          href={telHref}
                          data-testid="mini-shop-call"
                          aria-label={`Call seller at ${prod.phoneNumber}`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold transition-all shadow-xs"
                        >
                          <Phone className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {(hasMultiple || onOpenShop) && (
              <div className="flex items-center justify-end gap-2">
                {hasMultiple && (
                  <>
                    <span
                      data-testid="mini-shop-counter"
                      className="text-[10px] font-bold text-slate-400 tabular-nums px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                    >
                      {activeIndex + 1}/{activeProducts.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextProduct}
                      data-testid="mini-shop-komeza"
                      aria-label={`Next product (${activeIndex + 1} of ${activeProducts.length})`}
                      className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 cursor-pointer shadow-xs"
                    >
                      <span>Komeza</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    </button>
                  </>
                )}
                {onOpenShop && (
                  <button
                    type="button"
                    onClick={onOpenShop}
                    data-testid="mini-shop-open-shop"
                    aria-label="Open full Shop page with video and all products"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer shadow-xs"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Shop</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
