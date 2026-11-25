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
