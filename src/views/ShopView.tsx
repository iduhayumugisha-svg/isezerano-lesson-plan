import React, { useMemo, useState } from 'react';
import { ArrowLeft, Film, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { MiniShopProduct } from '../types/platform';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { WebsitePage } from '../components/WebsiteHeader';
import { ShopVimeoPlayer } from '../components/ShopVimeoPlayer';
import {
  buildMiniShopTelHref,
  buildMiniShopWhatsAppUrl,
  filterActiveMiniShopProducts
} from '../utils/miniShopUtils';
import {
  DEFAULT_MINI_SHOP_DISPLAY_SETTINGS,
  normalizeMiniShopDisplaySettings
} from '../utils/displaySettingsUtils';
import { scrollMainContentToTop } from '../utils/scrollUtils';

interface ShopViewProps {
  products: MiniShopProduct[];
  onNavigate: (page: WebsitePage) => void;
}

export const ShopView: React.FC<ShopViewProps> = ({ products, onNavigate }) => {
  const { shopVideo, miniShopDisplay } = useWebsiteDesign();
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  const activeProducts = useMemo(() => filterActiveMiniShopProducts(products), [products]);
  const display = useMemo(
    () => normalizeMiniShopDisplaySettings(miniShopDisplay || DEFAULT_MINI_SHOP_DISPLAY_SETTINGS),
    [miniShopDisplay]
  );

  const hasPublishedVideo = Boolean(shopVideo && shopVideo.published && shopVideo.videoId);

  return (
    <div
      data-testid="shop-view"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8"
    >
      {/* Shop Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal-700">
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            <span>ISEZERANO ONLINE Shop</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Featured Products &amp; Showcase
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Watch the featured showcase video and order verified items directly via WhatsApp or Phone.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onNavigate('home');
            scrollMainContentToTop('auto');
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Front Page</span>
        </button>
      </div>

      {/* SECTION 1: FEATURED SHOP VIDEO (Rendered ABOVE products) */}
      <section
        data-testid="shop-video-section"
        aria-label="Shop Showcase Video"
        className="space-y-3"
      >
        {hasPublishedVideo && shopVideo ? (
          <div className="max-w-4xl mx-auto space-y-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Film className="w-4 h-4 text-teal-700 shrink-0" aria-hidden="true" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                {shopVideo.title}
              </h2>
            </div>

            <ShopVimeoPlayer video={shopVideo} autoPlay={true} />
          </div>
        ) : (
          <div
            data-testid="shop-video-empty-state"
            className="max-w-4xl mx-auto rounded-2xl border border-dashed border-slate-300 bg-white/80 px-5 py-6 text-center space-y-1.5"
          >
            <Film className="w-6 h-6 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-800">
              No featured Shop video is published right now.
            </p>
            <p className="text-xs text-slate-500">
              Browse all available Shop products listed below.
            </p>
          </div>
        )}
      </section>

      {/* SECTION 2: ACTIVE SHOP PRODUCTS GRID (Preserves all existing products & contact actions) */}
      <section
        data-testid="shop-products-section"
        aria-label="Shop Products"
        className="space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Available Products ({activeProducts.length})
          </h2>
        </div>

        {activeProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-700">
              No active products are listed in the Shop yet.
            </p>
            <p className="text-xs text-slate-500">
              Please check back soon for new items from ISEZERANO ONLINE.
            </p>
          </div>
        ) : (
          <div
            data-testid="shop-products-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            style={{ gap: `${Math.max(12, display.cardGapPx)}px` }}
          >
            {activeProducts.map((prod) => {
              const whatsappHref = buildMiniShopWhatsAppUrl(prod.whatsappNumber, prod.title);
              const telHref = buildMiniShopTelHref(prod.phoneNumber);
              const imgBroken = Boolean(imageErrorMap[prod.id]);

              return (
                <article
                  key={prod.id}
                  data-testid={`shop-product-card-${prod.id}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between transition-shadow hover:shadow-md"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-slate-100 border-b border-slate-100 flex items-center justify-center overflow-hidden p-3">
                      {prod.imageUrl && !imgBroken ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          loading="lazy"
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
                        <ShoppingBag className="w-10 h-10 text-slate-400" aria-hidden="true" />
                      )}
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                          {prod.title}
                        </h3>
                        {prod.price && (
                          <span className="shrink-0 text-xs font-extrabold text-amber-900 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                            {prod.price}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>
                  </div>

                  {(whatsappHref || telHref) && (
                    <div className="px-4 pb-4 pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100">
                      {whatsappHref && (
                        <a
                          href={whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-slate-950 text-xs font-extrabold transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {telHref && (
                        <a
                          href={telHref}
                          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span>Call Seller</span>
                        </a>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
