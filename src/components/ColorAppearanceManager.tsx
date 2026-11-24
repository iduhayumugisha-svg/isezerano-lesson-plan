import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  Monitor as DesktopIcon,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import {
  AppearanceMode,
  BorderRadiusPreset,
  LayoutSpacingDensity,
  WebsiteColorSettings
} from '../types/websiteDesign';
import {
  APPEARANCE_THEME_PRESETS,
  BORDER_RADIUS_MAP,
  SPACING_DENSITY_MAP,
  getContrastRatio,
  getReadableContrastText,
  hexToRgba,
  isValidHexColor,
  normalizeHexColor
} from '../utils/appearanceUtils';

interface ColorAppearanceManagerProps {
  embedded?: boolean;
}

interface ColorTokenConfig {
  key: keyof WebsiteColorSettings;
  label: string;
  description: string;
}

interface ColorTokenGroup {
  id: string;
  title: string;
  description: string;
  items: ColorTokenConfig[];
}

const COLOR_TOKEN_GROUPS: ColorTokenGroup[] = [
  {
    id: 'brand',
    title: 'Brand & Accent Identity',
    description: 'Core brand identity colors driving highlights, navigation active states, and badges.',
    items: [
      { key: 'primaryColor', label: 'Primary Color', description: 'Main editorial accent & active indicator' },
      { key: 'secondaryColor', label: 'Secondary Color', description: 'Supporting structural tone & dark elements' },
      { key: 'accentColor', label: 'Accent Color', description: 'Hover states, focus rings & subtle highlights' }
    ]
  },
  {
    id: 'surfaces',
    title: 'Surfaces, Chrome & Borders',
    description: 'Page canvas, content cards, top navigation header, footer, and global dividers.',
    items: [
      { key: 'bodyBg', label: 'Website Background Color', description: 'Outer page canvas behind sections' },
      { key: 'cardBg', label: 'Content / Card Background Color', description: 'Article cards, forms & panels' },
      { key: 'headerBg', label: 'Header Background Color', description: 'Sticky top masthead & navigation bar' },
      { key: 'footerBg', label: 'Footer Background Color', description: 'Bottom site directory & copyright bar' },
      { key: 'borderColor', label: 'Border Color', description: 'Cards, inputs, dividers & table lines' }
    ]
  },
  {
    id: 'typography-actions',
    title: 'Typography, Links & Buttons',
    description: 'Primary copy ink, metadata labels, inline links, and primary call-to-action buttons.',
    items: [
      { key: 'bodyText', label: 'Main Text Color', description: 'Headings, paragraphs & primary labels' },
      { key: 'mutedText', label: 'Secondary Text Color', description: 'Dates, author captions & subtitles' },
      { key: 'linkColor', label: 'Link Color', description: 'Clickable article links & section anchors' },
      { key: 'primaryButtonBg', label: 'Button Background Color', description: 'Primary action & submit buttons' },
      { key: 'primaryButtonText', label: 'Button Text Color', description: 'Foreground label on primary buttons' }
    ]
  },
  {
    id: 'feedback-modals',
    title: 'Notifications, Status & Modals',
    description: 'Includes the Saved & Published state, error/warning alerts, and dialog overlay backdrops.',
    items: [
      { key: 'successBg', label: 'Success Notification Background Color', description: 'Background behind "Saved & Published" & success alerts' },
      { key: 'successText', label: 'Success Notification Text Color', description: 'Text/icon color inside success notifications & badges' },
      { key: 'errorBg', label: 'Error Notification Background Color', description: 'Validation errors & critical alert banners' },
      { key: 'warningBg', label: 'Warning Notification Background Color', description: 'Caution & draft notice banners' },
      { key: 'modalOverlayBg', label: 'Modal / Overlay Background Color', description: 'Backdrop tint behind dialogs & popups' }
    ]
  }
];

interface HexColorControlProps {
  tokenKey: keyof WebsiteColorSettings;
  label: string;
  description: string;
  value: string;
  onChange: (key: keyof WebsiteColorSettings, hex: string) => void;
  onReset: (key: keyof WebsiteColorSettings) => void;
  contrastWarning?: string | null;
}

const HexColorControl: React.FC<HexColorControlProps> = ({
  tokenKey,
  label,
  description,
  value,
  onChange,
  onReset,
  contrastWarning
}) => {
  const [hexDraft, setHexDraft] = useState(value);
  const [invalidHex, setInvalidHex] = useState(false);

  useEffect(() => {
    setHexDraft(value);
    setInvalidHex(false);
  }, [value]);

  const handleTextChange = (raw: string) => {
    setHexDraft(raw);
    const trimmed = raw.trim();
    if (isValidHexColor(trimmed)) {
      setInvalidHex(false);
      onChange(tokenKey, normalizeHexColor(trimmed, value));
    } else {
      setInvalidHex(true);
    }
  };

  const handleBlur = () => {
    if (!isValidHexColor(hexDraft)) {
      setHexDraft(value);
      setInvalidHex(false);
    }
  };

  const pickerValue = normalizeHexColor(value, '#0f766e');

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-900 leading-snug">{label}</div>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => onReset(tokenKey)}
          title={`Reset ${label} to default`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-0.5">
        <label className="relative flex items-center shrink-0 cursor-pointer" title={`Pick ${label}`}>
          <input
            type="color"
            aria-label={`${label} picker`}
            value={pickerValue}
            onChange={(e) => {
              const nextHex = normalizeHexColor(e.target.value, value);
              setHexDraft(nextHex);
              setInvalidHex(false);
              onChange(tokenKey, nextHex);
            }}
            className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
          />
        </label>

        <input
          type="text"
          aria-label={`${label} HEX`}
          value={hexDraft}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleBlur}
          maxLength={7}
          placeholder="#0f766e"
          className={`flex-1 min-w-0 px-2.5 py-2 text-xs font-mono font-semibold rounded-lg border bg-white text-slate-900 uppercase tracking-wide ${
            invalidHex
              ? 'border-rose-500 ring-1 ring-rose-300'
              : 'border-slate-300 focus:border-teal-600 focus:outline-none'
          }`}
        />
      </div>

      {invalidHex && (
        <p className="text-[10px] font-semibold text-rose-600">
          Enter a valid 6-digit HEX code (e.g. #0f766e).
        </p>
      )}
      {contrastWarning && !invalidHex && (
        <p className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{contrastWarning}</span>
        </p>
      )}
    </div>
  );
};

export const ColorAppearanceManager: React.FC<ColorAppearanceManagerProps> = ({ embedded = false }) => {
  const { isAdmin } = useAuth();
  const {
    colors,
    appearance,
    effectiveMode,
    branding,
    isDraftDirty,
    isPreviewingDraft,
    isPublishing,
    updateDraftColors,
    updateDraftAppearance,
    applyAppearancePreset,
    setAppearanceMode,
    setPreviewingDraft,
    resetSectionToDefault,
    resetSingleField,
    cancelDraft,
    publishSettings
  } = useWebsiteDesign();

  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Administrator Access Required</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Color &amp; Appearance customization is restricted to authorized administrators.
        </p>
      </div>
    );
  }

  const handleSave = async () => {
    setStatusFeedback(null);
    const res = await publishSettings('Updated Color & Appearance customization settings');
    if (res.success) {
      setStatusFeedback({
        type: 'success',
        message: 'Appearance settings saved & published globally across ISEZERANO ONLINE.'
      });
    } else {
      setStatusFeedback({
        type: 'error',
        message: res.error || 'Could not publish appearance settings.'
      });
    }
  };

  const handleResetAll = () => {
    resetSectionToDefault('appearance');
    setStatusFeedback({
      type: 'success',
      message: 'Theme reset to Official Teal Light default in draft. Click "Save Appearance Settings" to publish.'
    });
  };

  const radiusTokens = BORDER_RADIUS_MAP[appearance.borderRadius] || BORDER_RADIUS_MAP.medium;
  const spacingTokens = SPACING_DENSITY_MAP[appearance.spacing] || SPACING_DENSITY_MAP.comfortable;
  const errorFg = getReadableContrastText(colors.errorBg);
  const warningFg = getReadableContrastText(colors.warningBg);

  const getContrastWarning = (key: keyof WebsiteColorSettings): string | null => {
    if (key === 'bodyText' && getContrastRatio(colors.bodyText, colors.bodyBg) < 4.5) {
      return 'Low contrast against Website Background Color';
    }
    if (key === 'primaryButtonText' && getContrastRatio(colors.primaryButtonText, colors.primaryButtonBg) < 4.5) {
      return 'Low contrast on Button Background Color';
    }
    if (key === 'successText' && getContrastRatio(colors.successText, colors.successBg) < 4.5) {
      return 'Low contrast on Success Notification Background';
    }
    return null;
  };

  return (
    <div className="space-y-6" data-testid="color-appearance-manager">
      {/* Top Command Bar */}
      {!embedded && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
                <Palette className="w-3.5 h-3.5 text-teal-600" />
                <span>Global Theme &amp; Design System</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Color &amp; Appearance
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                Customize all 18 global colors, Light/Dark/System mode, ready-made presets, corner radii, and layout density across the entire website.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewingDraft(!isPreviewingDraft)}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isPreviewingDraft
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {isPreviewingDraft ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{isPreviewingDraft ? 'Exit Live Preview' : 'Preview Changes'}</span>
              </button>

              {isDraftDirty && (
                <button
                  type="button"
                  onClick={cancelDraft}
                  disabled={isPublishing}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <span>Discard Draft</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleResetAll}
                disabled={isPublishing}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isPublishing}
                style={
                  !isDraftDirty && !isPublishing
                    ? { backgroundColor: colors.successBg, color: colors.successText }
                    : undefined
                }
                className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer ${
                  isDraftDirty
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'hover:opacity-95'
                }`}
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Appearance...</span>
                  </>
                ) : isDraftDirty ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Appearance Settings</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved &amp; Published</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {statusFeedback && (
            <div
              role="status"
              style={
                statusFeedback.type === 'success'
                  ? { backgroundColor: colors.successBg, color: colors.successText }
                  : { backgroundColor: colors.errorBg, color: errorFg }
              }
              className="p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs"
            >
              <div className="flex items-center space-x-2">
                {statusFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusFeedback.message}</span>
              </div>
              <span className="text-[11px] opacity-90 uppercase tracking-wider shrink-0">
                {statusFeedback.type === 'success' ? 'Saved & Published' : 'Error'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Split Workspace: Controls + Sticky Live Interactive Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Controls */}
        <div className="xl:col-span-7 space-y-6">
          {/* 1. Appearance Mode, Corner Radius & Spacing Density */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Appearance Mode &amp; Structural Geometry</h3>
                <p className="text-xs text-slate-500">
                  Choose Light, Dark, or System Default mode plus global corner radius and layout density.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 shrink-0">
                Active: {effectiveMode === 'dark' ? 'Dark' : 'Light'}
                {appearance.mode === 'system' ? ' (System)' : ''}
              </span>
            </div>

            {/* Light / Dark / System Default */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Appearance Mode
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'light' as AppearanceMode, label: 'Light Mode', icon: Sun, desc: 'Bright paper surface' },
                  { id: 'dark' as AppearanceMode, label: 'Dark Mode', icon: Moon, desc: 'Low-glare dark canvas' },
                  { id: 'system' as AppearanceMode, label: 'System Default', icon: Monitor, desc: 'Follows device OS' }
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = appearance.mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAppearanceMode(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-teal-500/30'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
                        {active && <Check className="w-3.5 h-3.5 text-teal-400" />}
                      </div>
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className={`text-[10px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Border Radius & Spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Border Radius Customization
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(BORDER_RADIUS_MAP) as BorderRadiusPreset[]).map((key) => {
                    const item = BORDER_RADIUS_MAP[key];
                    const active = appearance.borderRadius === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateDraftAppearance({ borderRadius: key })}
                        className={`px-2.5 py-2 border text-xs font-semibold transition-all cursor-pointer text-center ${
                          active
                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                        style={{ borderRadius: item.button }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Layout Spacing / Density
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(SPACING_DENSITY_MAP) as LayoutSpacingDensity[]).map((key) => {
                    const item = SPACING_DENSITY_MAP[key];
                    const active = appearance.spacing === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateDraftAppearance({ spacing: key })}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{item.label}</div>
                        <div className={`text-[10px] mt-0.5 ${active ? 'text-teal-100' : 'text-slate-500'}`}>
                          {key === 'compact' ? 'Denser newsroom cards' : 'Spacious editorial breathing room'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Ready-Made Color Themes / Presets */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Ready-Made Color Themes &amp; Presets</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Apply a curated Light or Dark palette with balanced WCAG contrast, then fine-tune any token below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {APPEARANCE_THEME_PRESETS.map((preset) => {
                const selected = appearance.presetId === preset.id;
                const pPrimary = preset.colors.primaryColor || '#0f766e';
                const pBody = preset.colors.bodyBg || '#f8fafc';
                const pCard = preset.colors.cardBg || '#ffffff';
                const pFooter = preset.colors.footerBg || '#090e1a';
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyAppearancePreset(preset.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-2 ${
                      selected
                        ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-500/25 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center -space-x-1">
                        {[pPrimary, pBody, pCard, pFooter].map((hex, i) => (
                          <span
                            key={i}
                            className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          preset.mode === 'dark'
                            ? 'bg-slate-800 text-slate-100'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {preset.mode}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{preset.name}</div>
                      <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{preset.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. All 18 Global Color Customization Fields */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Global Color Customization (18 Tokens)</h3>
                <p className="text-xs text-slate-500">
                  Pick a swatch or type any valid #RRGGBB HEX value. Changes preview live across cards, menus, forms, and notifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => resetSectionToDefault('colors')}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Colors</span>
              </button>
            </div>

            {COLOR_TOKEN_GROUPS.map((group) => (
              <div key={group.id} className="space-y-3 pt-2 first:pt-0">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">{group.title}</h4>
                  <p className="text-[11px] text-slate-500">{group.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.items.map((item) => (
                    <HexColorControl
                      key={item.key}
                      tokenKey={item.key}
                      label={item.label}
                      description={item.description}
                      value={colors[item.key]}
                      onChange={(k, hex) => updateDraftColors({ [k]: hex })}
                      onReset={(k) => resetSingleField('colors', k)}
                      contrastWarning={getContrastWarning(item.key)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Live Interactive Preview */}
        <div className="xl:col-span-5 xl:sticky xl:top-24 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Live Theme Preview
                </h3>
                <p className="text-[11px] text-slate-500">Updates immediately as you edit colors, radius &amp; spacing</p>
              </div>
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewViewport('desktop')}
                  aria-label="Desktop preview"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                    previewViewport === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  <DesktopIcon className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewViewport('mobile')}
                  aria-label="Mobile preview"
                  className={`px-2 py-1 rounded-md text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                    previewViewport === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Preview Viewport Frame */}
            <div className="p-4 bg-slate-100 flex justify-center">
              <div
                data-testid="appearance-live-preview-canvas"
                className={`w-full transition-all border overflow-hidden shadow-md ${
                  previewViewport === 'mobile' ? 'max-w-[340px]' : 'max-w-full'
                }`}
                style={{
                  backgroundColor: colors.bodyBg,
                  color: colors.bodyText,
                  borderColor: colors.borderColor,
                  borderRadius: radiusTokens.card
                }}
              >
                {/* Simulated Header & Navigation */}
                <div
                  className="px-4 py-3 border-b flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: colors.headerBg,
                    color: colors.headerText,
                    borderColor: colors.borderColor
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-6 h-6 flex items-center justify-center text-[10px] font-extrabold shrink-0"
                      style={{
                        backgroundColor: colors.primaryColor,
                        color: colors.primaryButtonText,
                        borderRadius: radiusTokens.button
                      }}
                    >
                      IO
                    </span>
                    <span className="text-xs font-extrabold truncate">
                      {branding.platformTitle || 'ISEZERANO ONLINE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-semibold">
                    <span style={{ color: colors.primaryColor }}>Home</span>
                    {previewViewport === 'desktop' && (
                      <>
                        <span style={{ color: colors.bodyText }}>All News</span>
                        <span style={{ color: colors.linkColor }}>Contact</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Simulated Content Canvas */}
                <div
                  className="space-y-3"
                  style={{ padding: spacingTokens.cardPadding }}
                >
                  {/* Simulated Article Card */}
                  <div
                    className="border space-y-2.5"
                    style={{
                      backgroundColor: colors.cardBg,
                      borderColor: colors.borderColor,
                      borderRadius: radiusTokens.card,
                      padding: spacingTokens.cardPadding
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: colors.accentColor,
                          color: getReadableContrastText(colors.accentColor),
                          borderRadius: radiusTokens.pill
                        }}
                      >
                        Top Story
                      </span>
                      <span className="text-[10px]" style={{ color: colors.mutedText }}>
                        2 mins ago
                      </span>
                    </div>

                    <h4 className="text-sm font-bold leading-snug" style={{ color: colors.bodyText }}>
                      Editorial Masthead &amp; Live Color Synchronization
                    </h4>

                    <p className="text-xs leading-relaxed" style={{ color: colors.mutedText }}>
                      Typography, cards, links, buttons, and notifications stay readable in every theme.{' '}
                      <span className="underline font-semibold" style={{ color: colors.linkColor }}>
                        Read full story
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span
                        className="px-3 py-1.5 text-xs font-bold inline-block"
                        style={{
                          backgroundColor: colors.primaryButtonBg,
                          color: colors.primaryButtonText,
                          borderRadius: radiusTokens.button
                        }}
                      >
                        Primary Button
                      </span>
                      <span
                        className="px-3 py-1.5 text-xs font-bold inline-block border"
                        style={{
                          backgroundColor: colors.secondaryColor,
                          color: getReadableContrastText(colors.secondaryColor),
                          borderColor: colors.borderColor,
                          borderRadius: radiusTokens.button
                        }}
                      >
                        Secondary
                      </span>
                    </div>
                  </div>

                  {/* Simulated Notifications (Success Saved & Published + Error + Warning) */}
                  <div className="space-y-2">
                    <div
                      data-testid="preview-success-notification"
                      className="px-3 py-2 flex items-center justify-between text-xs font-bold shadow-2xs"
                      style={{
                        backgroundColor: colors.successBg,
                        color: colors.successText,
                        borderRadius: radiusTokens.button
                      }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Success Notification</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wider opacity-95">
                        Saved &amp; Published
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className="px-2.5 py-2 text-[11px] font-bold flex items-center gap-1.5"
                        style={{
                          backgroundColor: colors.errorBg,
                          color: errorFg,
                          borderRadius: radiusTokens.button
                        }}
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Error Alert</span>
                      </div>

                      <div
                        className="px-2.5 py-2 text-[11px] font-bold flex items-center gap-1.5"
                        style={{
                          backgroundColor: colors.warningBg,
                          color: warningFg,
                          borderRadius: radiusTokens.button
                        }}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Warning Alert</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Modal / Overlay Preview */}
                  <div
                    className="p-3 border"
                    style={{
                      backgroundColor: hexToRgba(colors.modalOverlayBg, 0.72),
                      borderColor: colors.borderColor,
                      borderRadius: radiusTokens.modal
                    }}
                  >
                    <div
                      className="p-2.5 border shadow-sm flex items-center justify-between gap-2"
                      style={{
                        backgroundColor: colors.cardBg,
                        color: colors.bodyText,
                        borderColor: colors.borderColor,
                        borderRadius: radiusTokens.input
                      }}
                    >
                      <span className="text-[11px] font-bold">Modal Dialog Over Overlay</span>
                      <span
                        className="text-[10px] px-2 py-0.5 font-bold"
                        style={{
                          backgroundColor: colors.primaryButtonBg,
                          color: colors.primaryButtonText,
                          borderRadius: radiusTokens.button
                        }}
                      >
                        Close
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Footer */}
                <div
                  className="px-4 py-3 text-[11px] flex items-center justify-between gap-2"
                  style={{
                    backgroundColor: colors.footerBg,
                    color: getReadableContrastText(colors.footerBg)
                  }}
                >
                  <span className="font-bold truncate">{branding.platformTitle || 'ISEZERANO ONLINE'}</span>
                  <span style={{ color: colors.accentColor }}>© 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
