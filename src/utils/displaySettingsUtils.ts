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
