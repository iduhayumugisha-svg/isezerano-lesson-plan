import type {
  AppearanceMode,
  BorderRadiusPreset,
  LayoutSpacingDensity,
  WebsiteAppearanceSettings,
  WebsiteColorSettings
} from '../types/websiteDesign';

export interface AppearanceThemePreset {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  colors: Partial<WebsiteColorSettings>;
  borderRadius?: BorderRadiusPreset;
  spacing?: LayoutSpacingDensity;
}

export const DEFAULT_APPEARANCE_SETTINGS: WebsiteAppearanceSettings = {
  mode: 'light',
  presetId: 'official-teal-light',
  borderRadius: 'medium',
  spacing: 'comfortable'
};

export const BORDER_RADIUS_MAP: Record<
  BorderRadiusPreset,
  {
    label: string;
    card: string;
    button: string;
    input: string;
    modal: string;
    pill: string;
  }
> = {
  none: { label: 'Sharp (0px)', card: '0px', button: '0px', input: '0px', modal: '0px', pill: '0px' },
  small: { label: 'Subtle (4px)', card: '6px', button: '4px', input: '4px', modal: '8px', pill: '4px' },
  medium: { label: 'Editorial (12px)', card: '12px', button: '8px', input: '8px', modal: '16px', pill: '9999px' },
  large: { label: 'Modern (16px)', card: '16px', button: '12px', input: '12px', modal: '20px', pill: '9999px' },
  rounded: { label: 'Pill Soft (24px)', card: '24px', button: '16px', input: '14px', modal: '24px', pill: '9999px' }
};

export const SPACING_DENSITY_MAP: Record<
  LayoutSpacingDensity,
  {
    label: string;
    cardPadding: string;
    sectionGap: string;
    gridGap: string;
    headerPaddingY: string;
  }
> = {
  compact: {
    label: 'Compact',
    cardPadding: '0.875rem',
    sectionGap: '1.25rem',
    gridGap: '0.75rem',
    headerPaddingY: '0.5rem'
  },
  comfortable: {
    label: 'Comfortable',
    cardPadding: '1.5rem',
    sectionGap: '2rem',
    gridGap: '1.25rem',
    headerPaddingY: '0.875rem'
  }
};

export const isValidHexColor = (value: string): boolean => {
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test((value || '').trim());
};

export const normalizeHexColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const normalized = normalizeHexColor(hex, '#0f172a');
  const num = parseInt(normalized.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
};

export const hexToRgba = (hex: string, alpha: number): string => {
  const { r, g, b } = hexToRgb(hex);
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
};

export const getRelativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (hex1: string, hex2: string): number => {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getReadableContrastText = (bgHex: string): string => {
  const darkText = '#0f172a';
  const lightText = '#ffffff';
  return getContrastRatio(bgHex, lightText) >= getContrastRatio(bgHex, darkText)
    ? lightText
    : darkText;
};

export const DEFAULT_LIGHT_COLORS: WebsiteColorSettings = {
  primaryColor: '#0f766e',
  secondaryColor: '#0f172a',
  accentColor: '#14b8a6',
  borderColor: '#e2e8f0',
  successBg: '#0d9488',
  successText: '#ffffff',
  errorBg: '#dc2626',
  warningBg: '#d97706',
  modalOverlayBg: '#090e1a',

  headerBg: '#ffffff',
  headerText: '#0f172a',
  headerBorder: '#e2e8f0',
  navLinkHover: '#0d9488',
  navLinkActive: '#0f766e',

  bodyBg: '#f8fafc',
  bodyText: '#1e293b',
  mutedText: '#64748b',

  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  accentBg: '#f0fdfa',

  primaryButtonBg: '#0f766e',
  primaryButtonText: '#ffffff',
  secondaryButtonBg: '#0f172a',
  secondaryButtonText: '#ffffff',
  linkColor: '#0f766e',
  formInputBorder: '#cbd5e1',
  formFocusRing: '#14b8a6',

  footerBg: '#090e1a',
  footerHeadingText: '#ffffff',
  footerBodyText: '#94a3b8',
  footerLinkColor: '#2dd4bf',

  headingPrimary: '#0f172a',
  headingSecondary: '#334155',

  sidebarBg: '#0f172a',
  sidebarText: '#ffffff',
  accentBadgeBg: '#ccfbf1',
  accentBadgeText: '#115e59'
};

export const DEFAULT_DARK_COLORS: WebsiteColorSettings = {
  primaryColor: '#14b8a6',
  secondaryColor: '#1e293b',
  accentColor: '#2dd4bf',
  borderColor: '#1e293b',
  successBg: '#059669',
  successText: '#ffffff',
  errorBg: '#dc2626',
  warningBg: '#d97706',
  modalOverlayBg: '#020617',

  headerBg: '#0f172a',
  headerText: '#f8fafc',
  headerBorder: '#1e293b',
  navLinkHover: '#2dd4bf',
  navLinkActive: '#14b8a6',

  bodyBg: '#090e1a',
  bodyText: '#e2e8f0',
  mutedText: '#94a3b8',

  cardBg: '#111827',
  cardBorder: '#1e293b',
  accentBg: '#132a2c',

  primaryButtonBg: '#0d9488',
  primaryButtonText: '#ffffff',
  secondaryButtonBg: '#1e293b',
  secondaryButtonText: '#f8fafc',
  linkColor: '#2dd4bf',
  formInputBorder: '#334155',
  formFocusRing: '#2dd4bf',

  footerBg: '#050811',
  footerHeadingText: '#f8fafc',
  footerBodyText: '#94a3b8',
  footerLinkColor: '#2dd4bf',

  headingPrimary: '#f8fafc',
  headingSecondary: '#cbd5e1',

  sidebarBg: '#050811',
  sidebarText: '#f8fafc',
  accentBadgeBg: '#134e4a',
  accentBadgeText: '#99f6e4'
};

export const APPEARANCE_THEME_PRESETS: AppearanceThemePreset[] = [
  {
    id: 'official-teal-light',
    name: 'Official Teal Press',
    description: 'Signature crisp white broadsheet with deep newsroom teal accents.',
    mode: 'light',
    colors: DEFAULT_LIGHT_COLORS
  },
  {
    id: 'broadsheet-navy-light',
    name: 'Classic Broadsheet Navy',
    description: 'Authoritative slate-navy editorial masthead with cobalt links.',
    mode: 'light',
    colors: {
      ...DEFAULT_LIGHT_COLORS,
      primaryColor: '#1e3a8a',
      secondaryColor: '#0f172a',
      accentColor: '#3b82f6',
      borderColor: '#cbd5e1',
      headerBorder: '#cbd5e1',
      cardBorder: '#cbd5e1',
      navLinkHover: '#2563eb',
      navLinkActive: '#1e3a8a',
      accentBg: '#eff6ff',
      primaryButtonBg: '#1e3a8a',
      primaryButtonText: '#ffffff',
      linkColor: '#1d4ed8',
      formFocusRing: '#3b82f6',
      footerBg: '#0f172a',
      footerLinkColor: '#93c5fd',
      accentBadgeBg: '#dbeafe',
      accentBadgeText: '#1e40af',
      successBg: '#059669',
      successText: '#ffffff'
    }
  },
  {
    id: 'archival-sepia-light',
    name: 'Warm Archival Paper',
    description: 'Soft warm cream paper canvas with espresso ink and terracotta accents.',
    mode: 'light',
    colors: {
      ...DEFAULT_LIGHT_COLORS,
      primaryColor: '#9a3412',
      secondaryColor: '#451a03',
      accentColor: '#d97706',
      bodyBg: '#faf7f2',
      cardBg: '#ffffff',
      headerBg: '#fdfbf7',
      headerText: '#292524',
      bodyText: '#292524',
      mutedText: '#78716c',
      headingPrimary: '#1c1917',
      headingSecondary: '#44403c',
      borderColor: '#e7e5e4',
      headerBorder: '#e7e5e4',
      cardBorder: '#e7e5e4',
      formInputBorder: '#d6d3d1',
      navLinkHover: '#b45309',
      navLinkActive: '#9a3412',
      accentBg: '#fffbeb',
      primaryButtonBg: '#9a3412',
      primaryButtonText: '#ffffff',
      secondaryButtonBg: '#292524',
      secondaryButtonText: '#ffffff',
      linkColor: '#9a3412',
      formFocusRing: '#d97706',
      footerBg: '#1c1917',
      footerLinkColor: '#fbbf24',
      accentBadgeBg: '#fef3c7',
      accentBadgeText: '#92400e',
      successBg: '#15803d',
      successText: '#ffffff'
    }
  },
  {
    id: 'emerald-civic-light',
    name: 'Civic Forest Emerald',
    description: 'Fresh civic green editorial palette tuned for regional news coverage.',
    mode: 'light',
    colors: {
      ...DEFAULT_LIGHT_COLORS,
      primaryColor: '#047857',
      secondaryColor: '#064e3b',
      accentColor: '#10b981',
      navLinkHover: '#059669',
      navLinkActive: '#047857',
      accentBg: '#ecfdf5',
      primaryButtonBg: '#047857',
      primaryButtonText: '#ffffff',
      linkColor: '#047857',
      formFocusRing: '#10b981',
      footerBg: '#022c22',
      footerLinkColor: '#6ee7b7',
      accentBadgeBg: '#d1fae5',
      accentBadgeText: '#065f46',
      successBg: '#047857',
      successText: '#ffffff'
    }
  },
  {
    id: 'midnight-slate-dark',
    name: 'Midnight Slate Dark',
    description: 'Low-glare dark newsroom canvas with bright teal readability accents.',
    mode: 'dark',
    colors: DEFAULT_DARK_COLORS
  },
  {
    id: 'obsidian-amber-dark',
    name: 'Obsidian Gold Night',
    description: 'True charcoal-black night reading mode with warm gold highlights.',
    mode: 'dark',
    colors: {
      ...DEFAULT_DARK_COLORS,
      primaryColor: '#f59e0b',
      secondaryColor: '#27272a',
      accentColor: '#fbbf24',
      borderColor: '#27272a',
      headerBg: '#121215',
      headerText: '#fafafa',
      headerBorder: '#27272a',
      bodyBg: '#09090b',
      bodyText: '#e4e4e7',
      mutedText: '#a1a1aa',
      cardBg: '#141418',
      cardBorder: '#27272a',
      accentBg: '#27200f',
      navLinkHover: '#fbbf24',
      navLinkActive: '#f59e0b',
      primaryButtonBg: '#d97706',
      primaryButtonText: '#ffffff',
      secondaryButtonBg: '#27272a',
      secondaryButtonText: '#fafafa',
      linkColor: '#fbbf24',
      formInputBorder: '#3f3f46',
      formFocusRing: '#f59e0b',
      footerBg: '#050507',
      footerLinkColor: '#fbbf24',
      headingPrimary: '#fafafa',
      headingSecondary: '#d4d4d8',
      accentBadgeBg: '#451a03',
      accentBadgeText: '#fde68a',
      successBg: '#16a34a',
      successText: '#ffffff'
    }
  }
];

export const normalizeColorSettings = (
  raw?: Partial<WebsiteColorSettings>
): WebsiteColorSettings => {
  const input = raw || {};
  const primaryColor = normalizeHexColor(
    input.primaryColor ?? input.primaryButtonBg,
    DEFAULT_LIGHT_COLORS.primaryColor
  );
  const secondaryColor = normalizeHexColor(
    input.secondaryColor ?? input.secondaryButtonBg,
    DEFAULT_LIGHT_COLORS.secondaryColor
  );
  const accentColor = normalizeHexColor(
    input.accentColor ?? input.formFocusRing ?? input.navLinkHover,
    DEFAULT_LIGHT_COLORS.accentColor
  );
  const borderColor = normalizeHexColor(
    input.borderColor ?? input.cardBorder ?? input.headerBorder,
    DEFAULT_LIGHT_COLORS.borderColor
  );

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    borderColor,
    successBg: normalizeHexColor(input.successBg, DEFAULT_LIGHT_COLORS.successBg),
    successText: normalizeHexColor(input.successText, DEFAULT_LIGHT_COLORS.successText),
    errorBg: normalizeHexColor(input.errorBg, DEFAULT_LIGHT_COLORS.errorBg),
    warningBg: normalizeHexColor(input.warningBg, DEFAULT_LIGHT_COLORS.warningBg),
    modalOverlayBg: normalizeHexColor(input.modalOverlayBg, DEFAULT_LIGHT_COLORS.modalOverlayBg),

    headerBg: normalizeHexColor(input.headerBg, DEFAULT_LIGHT_COLORS.headerBg),
    headerText: normalizeHexColor(input.headerText, DEFAULT_LIGHT_COLORS.headerText),
    headerBorder: normalizeHexColor(input.headerBorder ?? borderColor, DEFAULT_LIGHT_COLORS.headerBorder),
    navLinkHover: normalizeHexColor(input.navLinkHover ?? accentColor, DEFAULT_LIGHT_COLORS.navLinkHover),
    navLinkActive: normalizeHexColor(input.navLinkActive ?? primaryColor, DEFAULT_LIGHT_COLORS.navLinkActive),

    bodyBg: normalizeHexColor(input.bodyBg, DEFAULT_LIGHT_COLORS.bodyBg),
    bodyText: normalizeHexColor(input.bodyText, DEFAULT_LIGHT_COLORS.bodyText),
    mutedText: normalizeHexColor(input.mutedText, DEFAULT_LIGHT_COLORS.mutedText),

    cardBg: normalizeHexColor(input.cardBg, DEFAULT_LIGHT_COLORS.cardBg),
    cardBorder: normalizeHexColor(input.cardBorder ?? borderColor, DEFAULT_LIGHT_COLORS.cardBorder),
    accentBg: normalizeHexColor(input.accentBg, DEFAULT_LIGHT_COLORS.accentBg),

    primaryButtonBg: normalizeHexColor(input.primaryButtonBg ?? primaryColor, DEFAULT_LIGHT_COLORS.primaryButtonBg),
    primaryButtonText: normalizeHexColor(input.primaryButtonText, DEFAULT_LIGHT_COLORS.primaryButtonText),
    secondaryButtonBg: normalizeHexColor(input.secondaryButtonBg ?? secondaryColor, DEFAULT_LIGHT_COLORS.secondaryButtonBg),
    secondaryButtonText: normalizeHexColor(input.secondaryButtonText, DEFAULT_LIGHT_COLORS.secondaryButtonText),
    linkColor: normalizeHexColor(input.linkColor ?? primaryColor, DEFAULT_LIGHT_COLORS.linkColor),
    formInputBorder: normalizeHexColor(input.formInputBorder ?? borderColor, DEFAULT_LIGHT_COLORS.formInputBorder),
    formFocusRing: normalizeHexColor(input.formFocusRing ?? accentColor, DEFAULT_LIGHT_COLORS.formFocusRing),

    footerBg: normalizeHexColor(input.footerBg, DEFAULT_LIGHT_COLORS.footerBg),
    footerHeadingText: normalizeHexColor(input.footerHeadingText, DEFAULT_LIGHT_COLORS.footerHeadingText),
    footerBodyText: normalizeHexColor(input.footerBodyText, DEFAULT_LIGHT_COLORS.footerBodyText),
    footerLinkColor: normalizeHexColor(input.footerLinkColor, DEFAULT_LIGHT_COLORS.footerLinkColor),

    headingPrimary: normalizeHexColor(input.headingPrimary ?? input.headerText, DEFAULT_LIGHT_COLORS.headingPrimary),
    headingSecondary: normalizeHexColor(input.headingSecondary ?? input.bodyText, DEFAULT_LIGHT_COLORS.headingSecondary),

    sidebarBg: normalizeHexColor(input.sidebarBg, DEFAULT_LIGHT_COLORS.sidebarBg),
    sidebarText: normalizeHexColor(input.sidebarText, DEFAULT_LIGHT_COLORS.sidebarText),
    accentBadgeBg: normalizeHexColor(input.accentBadgeBg, DEFAULT_LIGHT_COLORS.accentBadgeBg),
    accentBadgeText: normalizeHexColor(input.accentBadgeText, DEFAULT_LIGHT_COLORS.accentBadgeText)
  };
};

export const normalizeAppearanceSettings = (
  raw?: Partial<WebsiteAppearanceSettings>
): WebsiteAppearanceSettings => {
  const mode: AppearanceMode =
    raw?.mode === 'light' || raw?.mode === 'dark' || raw?.mode === 'system'
      ? raw.mode
      : DEFAULT_APPEARANCE_SETTINGS.mode;

  const borderRadius: BorderRadiusPreset =
    raw?.borderRadius === 'none' ||
    raw?.borderRadius === 'small' ||
    raw?.borderRadius === 'medium' ||
    raw?.borderRadius === 'large' ||
    raw?.borderRadius === 'rounded'
      ? raw.borderRadius
      : DEFAULT_APPEARANCE_SETTINGS.borderRadius;

  const spacing: LayoutSpacingDensity =
    raw?.spacing === 'compact' || raw?.spacing === 'comfortable'
      ? raw.spacing
      : DEFAULT_APPEARANCE_SETTINGS.spacing;

  const presetId =
    typeof raw?.presetId === 'string' && raw.presetId.trim()
      ? raw.presetId.trim()
      : DEFAULT_APPEARANCE_SETTINGS.presetId;

  return { mode, presetId, borderRadius, spacing };
};

export const resolveEffectiveAppearanceMode = (
  mode: AppearanceMode,
  systemPrefersDark: boolean
): 'light' | 'dark' => {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
};

/**
 * Resolves the effective runtime colors taking Light / Dark / System Default mode into account.
 * In `system` mode, if stored surface luminance conflicts with OS preference, derives harmonious
 * surface tokens from the corresponding Light/Dark default palette while preserving brand & alert customizations.
 */
export const resolveEffectiveColors = (
  rawColors: WebsiteColorSettings,
  appearance: WebsiteAppearanceSettings,
  systemPrefersDark: boolean
): { effectiveMode: 'light' | 'dark'; colors: WebsiteColorSettings } => {
  const colors = normalizeColorSettings(rawColors);
  const effectiveMode = resolveEffectiveAppearanceMode(appearance.mode, systemPrefersDark);

  if (appearance.mode === 'system') {
    const bodyLum = getRelativeLuminance(colors.bodyBg);
    if (effectiveMode === 'dark' && bodyLum > 0.35) {
      return {
        effectiveMode: 'dark',
        colors: {
          ...DEFAULT_DARK_COLORS,
          primaryColor: colors.primaryColor === DEFAULT_LIGHT_COLORS.primaryColor ? DEFAULT_DARK_COLORS.primaryColor : colors.primaryColor,
          accentColor: colors.accentColor === DEFAULT_LIGHT_COLORS.accentColor ? DEFAULT_DARK_COLORS.accentColor : colors.accentColor,
          primaryButtonBg: colors.primaryButtonBg === DEFAULT_LIGHT_COLORS.primaryButtonBg ? DEFAULT_DARK_COLORS.primaryButtonBg : colors.primaryButtonBg,
          primaryButtonText: colors.primaryButtonText,
          successBg: colors.successBg,
          successText: colors.successText,
          errorBg: colors.errorBg,
          warningBg: colors.warningBg,
          modalOverlayBg: colors.modalOverlayBg
        }
      };
    }
    if (effectiveMode === 'light' && bodyLum < 0.2) {
      return {
        effectiveMode: 'light',
        colors: {
          ...DEFAULT_LIGHT_COLORS,
          primaryColor: colors.primaryColor === DEFAULT_DARK_COLORS.primaryColor ? DEFAULT_LIGHT_COLORS.primaryColor : colors.primaryColor,
          accentColor: colors.accentColor === DEFAULT_DARK_COLORS.accentColor ? DEFAULT_LIGHT_COLORS.accentColor : colors.accentColor,
          primaryButtonBg: colors.primaryButtonBg === DEFAULT_DARK_COLORS.primaryButtonBg ? DEFAULT_LIGHT_COLORS.primaryButtonBg : colors.primaryButtonBg,
          primaryButtonText: colors.primaryButtonText,
          successBg: colors.successBg,
          successText: colors.successText,
          errorBg: colors.errorBg,
          warningBg: colors.warningBg,
          modalOverlayBg: colors.modalOverlayBg
        }
      };
    }
  }

  return { effectiveMode, colors };
};
