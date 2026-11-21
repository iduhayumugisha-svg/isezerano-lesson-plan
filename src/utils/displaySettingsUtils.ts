import { MiniShopProduct } from '../types/platform';

export interface AdsDisplaySettings {
  containerWidthPercent: number; // 40..100 (%)
  maxWidthPx: number;            // 320..1600 (px)
  containerHeightPx: number;     // 60..600 (px)
  marginY: number;               // 0..64 (px)
  marginX: number;               // 0..64 (px)
  paddingPx: number;             // 0..48 (px)
}

export const ADS_DISPLAY_LIMITS = {
  containerWidthPercent: { min: 40, max: 100, step: 5 },
  maxWidthPx: { min: 320, max: 1600, step: 20 },
  containerHeightPx: { min: 60, max: 600, step: 10 },
  marginY: { min: 0, max: 64, step: 2 },
  marginX: { min: 0, max: 64, step: 2 },
  paddingPx: { min: 0, max: 48, step: 2 }
} as const;

export const DEFAULT_ADS_DISPLAY_SETTINGS: AdsDisplaySettings = {
  containerWidthPercent: 100,
  maxWidthPx: 1280,
  containerHeightPx: 220,
  marginY: 8,
  marginX: 0,
  paddingPx: 10
};

export interface MiniShopDisplaySettings {
  sectionWidthPercent: number; // 50..100 (%)
  sectionMaxWidthPx: number;   // 480..1600 (px)
  sectionMinHeightPx: number;  // 48..240 (px)
  cardWidthPx: number;         // 180..1280 (px)
  cardHeightPx: number;        // 48..260 (px)
  imageSizePx: number;         // 32..140 (px)
  cardGapPx: number;           // 4..32 (px)
  desktopColumns: number;      // 1..4
  tabletColumns: number;       // 1..3
  mobileColumns: number;       // 1..2
}

export const MINI_SHOP_DISPLAY_LIMITS = {
  sectionWidthPercent: { min: 50, max: 100, step: 5 },
  sectionMaxWidthPx: { min: 480, max: 1600, step: 20 },
  sectionMinHeightPx: { min: 48, max: 240, step: 4 },
  cardWidthPx: { min: 180, max: 1280, step: 20 },
  cardHeightPx: { min: 48, max: 260, step: 4 },
  imageSizePx: { min: 32, max: 140, step: 2 },
  cardGapPx: { min: 4, max: 32, step: 2 },
  desktopColumns: { min: 1, max: 4, step: 1 },
  tabletColumns: { min: 1, max: 3, step: 1 },
  mobileColumns: { min: 1, max: 2, step: 1 }
} as const;

export const DEFAULT_MINI_SHOP_DISPLAY_SETTINGS: MiniShopDisplaySettings = {
  sectionWidthPercent: 100,
  sectionMaxWidthPx: 1280,
  sectionMinHeightPx: 56,
  cardWidthPx: 1280,
  cardHeightPx: 52,
  imageSizePx: 44,
  cardGapPx: 12,
  desktopColumns: 1,
  tabletColumns: 1,
  mobileColumns: 1
};

export interface TopVideoAdDisplaySettings {
  videoWidthPx: number;         // 200..960 (px)
  videoHeightPx: number;        // 112..540 (px)
  bannerWidthPx: number;        // 320..1280 (px)
  bannerHeightPx: number;       // -5..120 (px)
  preserveAspectRatio: boolean; // Maintains 16:9 ratio unless unlocked
}

export const TOP_VIDEO_AD_DISPLAY_LIMITS = {
  videoWidthPx: { min: 200, max: 960, step: 10 },
  videoHeightPx: { min: 112, max: 540, step: 8 },
  bannerWidthPx: { min: 320, max: 1280, step: 20 },
  bannerHeightPx: { min: -5, max: 120, step: 1 }
} as const;

export const DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS: TopVideoAdDisplaySettings = {
  videoWidthPx: 330,
  videoHeightPx: 186,
  bannerWidthPx: 672,
  bannerHeightPx: 28,
  preserveAspectRatio: true
};

export interface TopVideoAdHeaderSpacing {
  headerMinHeightPx: number;
  sectionPaddingTopPx: number;
  sectionPaddingBottomPx: number;
  wrapperPaddingTopPx: number;
  wrapperPaddingBottomPx: number;
  wrapperGapPx: number;
  compactTier: 'normal' | 'compact' | 'ultra';
}

export const resolveTopVideoBannerHeaderSpacing = (
  rawBannerHeightPx: number
): TopVideoAdHeaderSpacing => {
  const h = clampDisplayNumber(
    rawBannerHeightPx,
    DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS.bannerHeightPx,
    TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.min,
    TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.max
  );

  if (h >= 24) {
    const padY = h >= 36 ? 4 : 3;
    return {
      headerMinHeightPx: h,
      sectionPaddingTopPx: padY,
      sectionPaddingBottomPx: padY,
      wrapperPaddingTopPx: 6,
      wrapperPaddingBottomPx: 6,
      wrapperGapPx: 6,
      compactTier: 'normal'
    };
  }

  if (h >= 0) {
    const ratio = h / 24;
    const sectionPy = Math.round(1 + ratio * 2);
    const wrapperPy = Math.round(2 + ratio * 4);
    return {
      headerMinHeightPx: h,
      sectionPaddingTopPx: sectionPy,
      sectionPaddingBottomPx: sectionPy,
      wrapperPaddingTopPx: wrapperPy,
      wrapperPaddingBottomPx: wrapperPy,
      wrapperGapPx: wrapperPy,
      compactTier: h >= 18 ? 'normal' : 'compact'
    };
  }

  // -5px .. -1px: keep minHeight non-negative while progressively eliminating padding and gap
  const remainingFraction = (h - TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.min) / 5;
  return {
    headerMinHeightPx: 0,
    sectionPaddingTopPx: 0,
    sectionPaddingBottomPx: 0,
    wrapperPaddingTopPx: h >= -2 ? 1 : 0,
    wrapperPaddingBottomPx: Math.round(remainingFraction * 2),
    wrapperGapPx: h >= -2 ? 1 : 0,
    compactTier: 'ultra'
  };
};

export const clampDisplayNumber = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
};

export const normalizeAdsDisplaySettings = (
  raw?: Partial<AdsDisplaySettings> | null
): AdsDisplaySettings => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ADS_DISPLAY_SETTINGS };
  }

  return {
    containerWidthPercent: clampDisplayNumber(
      raw.containerWidthPercent,
      DEFAULT_ADS_DISPLAY_SETTINGS.containerWidthPercent,
      ADS_DISPLAY_LIMITS.containerWidthPercent.min,
      ADS_DISPLAY_LIMITS.containerWidthPercent.max
    ),
    maxWidthPx: clampDisplayNumber(
      raw.maxWidthPx,
      DEFAULT_ADS_DISPLAY_SETTINGS.maxWidthPx,
      ADS_DISPLAY_LIMITS.maxWidthPx.min,
      ADS_DISPLAY_LIMITS.maxWidthPx.max
    ),
    containerHeightPx: clampDisplayNumber(
      raw.containerHeightPx,
      DEFAULT_ADS_DISPLAY_SETTINGS.containerHeightPx,
      ADS_DISPLAY_LIMITS.containerHeightPx.min,
      ADS_DISPLAY_LIMITS.containerHeightPx.max
    ),
    marginY: clampDisplayNumber(
      raw.marginY,
      DEFAULT_ADS_DISPLAY_SETTINGS.marginY,
      ADS_DISPLAY_LIMITS.marginY.min,
      ADS_DISPLAY_LIMITS.marginY.max
    ),
    marginX: clampDisplayNumber(
      raw.marginX,
      DEFAULT_ADS_DISPLAY_SETTINGS.marginX,
      ADS_DISPLAY_LIMITS.marginX.min,
      ADS_DISPLAY_LIMITS.marginX.max
    ),
    paddingPx: clampDisplayNumber(
      raw.paddingPx,
      DEFAULT_ADS_DISPLAY_SETTINGS.paddingPx,
      ADS_DISPLAY_LIMITS.paddingPx.min,
      ADS_DISPLAY_LIMITS.paddingPx.max
    )
  };
};

export const normalizeMiniShopDisplaySettings = (
  raw?: Partial<MiniShopDisplaySettings> | null
): MiniShopDisplaySettings => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_MINI_SHOP_DISPLAY_SETTINGS };
  }

  return {
    sectionWidthPercent: clampDisplayNumber(
      raw.sectionWidthPercent,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.sectionWidthPercent,
      MINI_SHOP_DISPLAY_LIMITS.sectionWidthPercent.min,
      MINI_SHOP_DISPLAY_LIMITS.sectionWidthPercent.max
    ),
    sectionMaxWidthPx: clampDisplayNumber(
      raw.sectionMaxWidthPx,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.sectionMaxWidthPx,
      MINI_SHOP_DISPLAY_LIMITS.sectionMaxWidthPx.min,
      MINI_SHOP_DISPLAY_LIMITS.sectionMaxWidthPx.max
    ),
    sectionMinHeightPx: clampDisplayNumber(
      raw.sectionMinHeightPx,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.sectionMinHeightPx,
      MINI_SHOP_DISPLAY_LIMITS.sectionMinHeightPx.min,
      MINI_SHOP_DISPLAY_LIMITS.sectionMinHeightPx.max
    ),
    cardWidthPx: clampDisplayNumber(
      raw.cardWidthPx,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.cardWidthPx,
      MINI_SHOP_DISPLAY_LIMITS.cardWidthPx.min,
      MINI_SHOP_DISPLAY_LIMITS.cardWidthPx.max
    ),
    cardHeightPx: clampDisplayNumber(
      raw.cardHeightPx,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.cardHeightPx,
      MINI_SHOP_DISPLAY_LIMITS.cardHeightPx.min,
      MINI_SHOP_DISPLAY_LIMITS.cardHeightPx.max
    ),
    imageSizePx: clampDisplayNumber(
      raw.imageSizePx,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.imageSizePx,
      MINI_SHOP_DISPLAY_LIMITS.imageSizePx.min,
      MINI_SHOP_DISPLAY_LIMITS.imageSizePx.max
    ),
    cardGapPx: clampDisplayNumber(
      raw.cardGapPx,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.cardGapPx,
      MINI_SHOP_DISPLAY_LIMITS.cardGapPx.min,
      MINI_SHOP_DISPLAY_LIMITS.cardGapPx.max
    ),
    desktopColumns: clampDisplayNumber(
      raw.desktopColumns,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.desktopColumns,
      MINI_SHOP_DISPLAY_LIMITS.desktopColumns.min,
      MINI_SHOP_DISPLAY_LIMITS.desktopColumns.max
    ),
    tabletColumns: clampDisplayNumber(
      raw.tabletColumns,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.tabletColumns,
      MINI_SHOP_DISPLAY_LIMITS.tabletColumns.min,
      MINI_SHOP_DISPLAY_LIMITS.tabletColumns.max
    ),
    mobileColumns: clampDisplayNumber(
      raw.mobileColumns,
      DEFAULT_MINI_SHOP_DISPLAY_SETTINGS.mobileColumns,
      MINI_SHOP_DISPLAY_LIMITS.mobileColumns.min,
      MINI_SHOP_DISPLAY_LIMITS.mobileColumns.max
    )
  };
};

export const resolveMiniShopColumnsForWidth = (
  settings: MiniShopDisplaySettings,
  viewportWidth: number
): number => {
  const normalized = normalizeMiniShopDisplaySettings(settings);
  if (viewportWidth < 640) return normalized.mobileColumns;
  if (viewportWidth < 1024) return normalized.tabletColumns;
  return normalized.desktopColumns;
};

export const getMiniShopVisibleSlice = (
  products: MiniShopProduct[],
  startIndex: number,
  columnCount: number
): MiniShopProduct[] => {
  if (!Array.isArray(products) || products.length === 0) return [];
  const count = Math.max(1, Math.min(columnCount, products.length));
  if (products.length <= count) return products;
  const safeStart = ((startIndex % products.length) + products.length) % products.length;
  const slice: MiniShopProduct[] = [];
  for (let i = 0; i < count; i++) {
    slice.push(products[(safeStart + i) % products.length]);
  }
  return slice;
};

export const normalizeTopVideoAdDisplaySettings = (
  raw?: Partial<TopVideoAdDisplaySettings> | null
): TopVideoAdDisplaySettings => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS };
  }

  const preserveAspectRatio =
    typeof raw.preserveAspectRatio === 'boolean'
      ? raw.preserveAspectRatio
      : DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS.preserveAspectRatio;

  const videoWidthPx = clampDisplayNumber(
    raw.videoWidthPx,
    DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS.videoWidthPx,
    TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.min,
    TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.max
  );

  const rawHeight = clampDisplayNumber(
    raw.videoHeightPx,
    preserveAspectRatio
      ? Math.round((videoWidthPx * 9) / 16)
      : DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS.videoHeightPx,
    TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.min,
    TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.max
  );

  const videoHeightPx = preserveAspectRatio
    ? clampDisplayNumber(
        Math.round((videoWidthPx * 9) / 16),
        rawHeight,
        TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.min,
        TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.max
      )
    : rawHeight;

  const bannerWidthPx = clampDisplayNumber(
    raw.bannerWidthPx,
    DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS.bannerWidthPx,
    TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.min,
    TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.max
  );

  const bannerHeightPx = clampDisplayNumber(
    raw.bannerHeightPx,
    DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS.bannerHeightPx,
    TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.min,
    TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.max
  );

  return {
    videoWidthPx,
    videoHeightPx,
    bannerWidthPx,
    bannerHeightPx,
    preserveAspectRatio
  };
};
