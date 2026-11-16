import type { CSSProperties } from 'react';
import { sanitizeHexColor } from './whatsappUtils';

export type CategoryFontWeight = 'normal' | 'medium' | 'bold';
export type CategoryStylingMode = 'all' | 'individual';

export interface CategoryItemStyle {
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  fontWeight: CategoryFontWeight;
  activeTextColor?: string;
  activeBackgroundColor?: string;
}

export interface CategoryNavAppearanceSettings {
  mode: CategoryStylingMode;
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  fontWeight: CategoryFontWeight;
  activeTextColor: string;
  activeBackgroundColor: string;
  perCategory: Record<string, Partial<CategoryItemStyle>>;
}

export const DEFAULT_ALL_NEWS_LABEL = 'All News';

export const CATEGORY_FONT_SIZE_MIN = 11;
export const CATEGORY_FONT_SIZE_MAX = 22;

export const DEFAULT_CATEGORY_NAV_APPEARANCE: CategoryNavAppearanceSettings = {
  mode: 'all',
  fontSize: 14,
  textColor: '#334155',
  backgroundColor: 'transparent',
  fontWeight: 'medium',
  activeTextColor: '#0f766e',
  activeBackgroundColor: 'transparent',
  perCategory: {}
};

const VALID_WEIGHTS: CategoryFontWeight[] = ['normal', 'medium', 'bold'];
const VALID_MODES: CategoryStylingMode[] = ['all', 'individual'];

export const clampCategoryFontSize = (
  value: unknown,
  fallback: number = DEFAULT_CATEGORY_NAV_APPEARANCE.fontSize
): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(CATEGORY_FONT_SIZE_MAX, Math.max(CATEGORY_FONT_SIZE_MIN, Math.round(numeric)));
};

export const sanitizeCategoryColor = (
  value: unknown,
  fallback: string,
  allowTransparent: boolean = false
): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (allowTransparent && trimmed.toLowerCase() === 'transparent') {
    return 'transparent';
  }
  return sanitizeHexColor(trimmed, fallback);
};

export const normalizeCategoryFontWeight = (
  value: unknown,
  fallback: CategoryFontWeight = DEFAULT_CATEGORY_NAV_APPEARANCE.fontWeight
): CategoryFontWeight => {
  if (typeof value === 'string' && VALID_WEIGHTS.includes(value as CategoryFontWeight)) {
    return value as CategoryFontWeight;
  }
  return fallback;
};

export const categoryFontWeightToCss = (weight: CategoryFontWeight): number => {
  if (weight === 'bold') return 700;
  if (weight === 'medium') return 500;
  return 400;
};

export const normalizeCategoryNavSettings = (
  raw?: Partial<CategoryNavAppearanceSettings> | null
): CategoryNavAppearanceSettings => {
  const source = raw || {};
  const mode: CategoryStylingMode = VALID_MODES.includes(source.mode as CategoryStylingMode)
    ? (source.mode as CategoryStylingMode)
    : DEFAULT_CATEGORY_NAV_APPEARANCE.mode;

  const fontSize = clampCategoryFontSize(source.fontSize, DEFAULT_CATEGORY_NAV_APPEARANCE.fontSize);
  const textColor = sanitizeCategoryColor(source.textColor, DEFAULT_CATEGORY_NAV_APPEARANCE.textColor, false);
  const backgroundColor = sanitizeCategoryColor(
    source.backgroundColor,
    DEFAULT_CATEGORY_NAV_APPEARANCE.backgroundColor,
    true
  );
  const fontWeight = normalizeCategoryFontWeight(
    source.fontWeight,
    DEFAULT_CATEGORY_NAV_APPEARANCE.fontWeight
  );
  const activeTextColor = sanitizeCategoryColor(
    source.activeTextColor,
    DEFAULT_CATEGORY_NAV_APPEARANCE.activeTextColor,
    false
  );
  const activeBackgroundColor = sanitizeCategoryColor(
    source.activeBackgroundColor,
    DEFAULT_CATEGORY_NAV_APPEARANCE.activeBackgroundColor,
    true
  );

  const normalizedPerCategory: Record<string, Partial<CategoryItemStyle>> = {};
  if (source.perCategory && typeof source.perCategory === 'object' && !Array.isArray(source.perCategory)) {
    for (const [key, item] of Object.entries(source.perCategory)) {
      const cleanKey = key.trim();
      if (!cleanKey || !item || typeof item !== 'object') continue;

      const normalizedItem: Partial<CategoryItemStyle> = {};
      if (item.fontSize !== undefined) {
        normalizedItem.fontSize = clampCategoryFontSize(item.fontSize, fontSize);
      }
      if (item.textColor !== undefined) {
        normalizedItem.textColor = sanitizeCategoryColor(item.textColor, textColor, false);
      }
      if (item.backgroundColor !== undefined) {
        normalizedItem.backgroundColor = sanitizeCategoryColor(item.backgroundColor, backgroundColor, true);
      }
      if (item.fontWeight !== undefined) {
        normalizedItem.fontWeight = normalizeCategoryFontWeight(item.fontWeight, fontWeight);
      }
      if (item.activeTextColor !== undefined) {
        normalizedItem.activeTextColor = sanitizeCategoryColor(item.activeTextColor, activeTextColor, false);
      }
      if (item.activeBackgroundColor !== undefined) {
        normalizedItem.activeBackgroundColor = sanitizeCategoryColor(
          item.activeBackgroundColor,
          activeBackgroundColor,
          true
        );
      }

      if (Object.keys(normalizedItem).length > 0) {
        normalizedPerCategory[cleanKey] = normalizedItem;
      }
    }
  }

  return {
    mode,
    fontSize,
    textColor,
    backgroundColor,
    fontWeight,
    activeTextColor,
    activeBackgroundColor,
    perCategory: normalizedPerCategory
  };
};

export const resolveAllNewsLabel = (branding?: { allNewsLabel?: string } | null): string => {
  const custom = typeof branding?.allNewsLabel === 'string' ? branding.allNewsLabel.trim() : '';
  return custom || DEFAULT_ALL_NEWS_LABEL;
};

export const resolveCategoryNavItemStyle = (
  categoryKey: string,
  settings?: Partial<CategoryNavAppearanceSettings> | null,
  isActive: boolean = false
): CSSProperties => {
  const normalized = normalizeCategoryNavSettings(settings);
  const override =
    normalized.mode === 'individual' ? normalized.perCategory[categoryKey] : undefined;

  const fontSize = clampCategoryFontSize(override?.fontSize ?? normalized.fontSize);
  const fontWeight = categoryFontWeightToCss(
    normalizeCategoryFontWeight(override?.fontWeight ?? normalized.fontWeight)
  );
  const textColor = isActive
    ? override?.activeTextColor || normalized.activeTextColor
    : override?.textColor || normalized.textColor;
  const backgroundColor = isActive
    ? override?.activeBackgroundColor || normalized.activeBackgroundColor
    : override?.backgroundColor || normalized.backgroundColor;

  return {
    fontSize: `${fontSize}px`,
    fontWeight,
    color: textColor,
    backgroundColor,
    borderBottomColor: isActive ? textColor : 'transparent'
  };
};
