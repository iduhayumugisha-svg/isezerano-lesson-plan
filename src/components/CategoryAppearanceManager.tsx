import React, { useState, useEffect } from 'react';
import {
  Type,
  Palette,
  Save,
  RotateCcw,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Minus,
  Plus,
  Sparkles,
  Tag,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { BlogCategory, DEFAULT_AI_BLOG_CATEGORIES } from '../types/blog';
import { subscribeToBlogCategories, mergeCategoriesForDisplay } from '../services/blogService';
import {
  CATEGORY_FONT_SIZE_MAX,
  CATEGORY_FONT_SIZE_MIN,
  CategoryFontWeight,
  DEFAULT_ALL_NEWS_LABEL,
  clampCategoryFontSize,
  normalizeCategoryNavSettings,
  resolveAllNewsLabel,
  resolveCategoryNavItemStyle
} from '../utils/categoryStyleUtils';

const TEXT_SWATCHES = ['#0f172a', '#334155', '#0f766e', '#1d4ed8', '#991b1b', '#7c2d12', '#ffffff'];
const BG_SWATCHES = ['transparent', '#f1f5f9', '#f0fdfa', '#ccfbf1', '#e0f2fe', '#fef3c7', '#0f766e', '#0f172a'];

export const CategoryAppearanceManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    draftSettings,
    isDraftDirty,
    isPublishing,
    updateDraftBranding,
    updateDraftCategoryNav,
    updateIndividualCategoryStyle,
    resetIndividualCategoryStyle,
    resetAllIndividualCategoryStyles,
    resetSectionToDefault,
    cancelDraft,
    publishSettings
  } = useWebsiteDesign();

  const [rawCategories, setRawCategories] = useState<BlogCategory[]>(DEFAULT_AI_BLOG_CATEGORIES);
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  const [selectedIndividualKey, setSelectedIndividualKey] = useState<string>('All Categories');
  const [previewSelectedKey, setPreviewSelectedKey] = useState<string>('All Categories');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = subscribeToBlogCategories((fetched, initialized) => {
      setRawCategories(fetched);
      setCategoriesInitialized(initialized);
    });
    return () => unsub();
  }, []);

  if (!isAdmin) {
    return null;
  }

  const categories = mergeCategoriesForDisplay(rawCategories, categoriesInitialized, []);
  const categoryNav = normalizeCategoryNavSettings(draftSettings.categoryNav);
  const allNewsInputValue =
    draftSettings.branding?.allNewsLabel !== undefined
      ? draftSettings.branding.allNewsLabel
      : DEFAULT_ALL_NEWS_LABEL;
  const effectiveAllNewsLabel = resolveAllNewsLabel(draftSettings.branding);

  const editableCategoryItems = [
    { key: 'All Categories', displayLabel: effectiveAllNewsLabel, isAllNews: true },
    ...categories.map((cat) => ({ key: cat.name, displayLabel: cat.name, isAllNews: false }))
  ];

  const isIndividualMode = categoryNav.mode === 'individual';
  const activeOverride = isIndividualMode
    ? categoryNav.perCategory[selectedIndividualKey] || {}
    : {};

  const currentFontSize = clampCategoryFontSize(
    isIndividualMode && activeOverride.fontSize !== undefined
      ? activeOverride.fontSize
      : categoryNav.fontSize
  );
  const currentFontWeight: CategoryFontWeight =
    isIndividualMode && activeOverride.fontWeight !== undefined
      ? activeOverride.fontWeight
      : categoryNav.fontWeight;
  const currentTextColor =
    isIndividualMode && activeOverride.textColor !== undefined
      ? activeOverride.textColor
      : categoryNav.textColor;
  const currentBackgroundColor =
    isIndividualMode && activeOverride.backgroundColor !== undefined
      ? activeOverride.backgroundColor
      : categoryNav.backgroundColor;
  const currentActiveTextColor =
    isIndividualMode && activeOverride.activeTextColor !== undefined
      ? activeOverride.activeTextColor
      : categoryNav.activeTextColor;
  const currentActiveBgColor =
    isIndividualMode && activeOverride.activeBackgroundColor !== undefined
      ? activeOverride.activeBackgroundColor
      : categoryNav.activeBackgroundColor;

  const updateFontSize = (nextSize: number) => {
    const clamped = clampCategoryFontSize(nextSize);
    if (isIndividualMode) {
      updateIndividualCategoryStyle(selectedIndividualKey, { fontSize: clamped });
    } else {
      updateDraftCategoryNav({ fontSize: clamped });
    }
  };

  const updateFontWeight = (weight: CategoryFontWeight) => {
    if (isIndividualMode) {
      updateIndividualCategoryStyle(selectedIndividualKey, { fontWeight: weight });
    } else {
      updateDraftCategoryNav({ fontWeight: weight });
    }
  };

  const updateTextColor = (color: string) => {
    if (isIndividualMode) {
      updateIndividualCategoryStyle(selectedIndividualKey, { textColor: color });
    } else {
      updateDraftCategoryNav({ textColor: color });
    }
  };

  const updateBackgroundColor = (color: string) => {
    if (isIndividualMode) {
      updateIndividualCategoryStyle(selectedIndividualKey, { backgroundColor: color });
    } else {
      updateDraftCategoryNav({ backgroundColor: color });
    }
  };

  const updateActiveTextColor = (color: string) => {
    if (isIndividualMode) {
      updateIndividualCategoryStyle(selectedIndividualKey, { activeTextColor: color });
    } else {
      updateDraftCategoryNav({ activeTextColor: color });
    }
  };

  const updateActiveBackgroundColor = (color: string) => {
    if (isIndividualMode) {
      updateIndividualCategoryStyle(selectedIndividualKey, { activeBackgroundColor: color });
    } else {
      updateDraftCategoryNav({ activeBackgroundColor: color });
    }
  };

  const handlePublish = async () => {
    setStatusMessage(null);
    const labelToSave = resolveAllNewsLabel(draftSettings.branding);
    const result = await publishSettings(
      `Updated category bar settings ("${labelToSave}", ${categoryNav.fontSize}px, ${categoryNav.fontWeight})`
    );
    if (result.success) {
      setStatusMessage({
        type: 'success',
        text: 'Category label, typography & color settings saved persistently to Cloud Firestore!'
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: result.error || 'Failed to save category settings.'
      });
    }
  };

  const previewContainerWidth =
    previewViewport === 'mobile'
      ? 'max-w-[360px]'
      : previewViewport === 'tablet'
        ? 'max-w-[700px]'
        : 'w-full';

  const weightOptions: { value: CategoryFontWeight; label: string; sample: string }[] = [
    { value: 'normal', label: 'Normal', sample: '400' },
    { value: 'medium', label: 'Medium', sample: '500' },
    { value: 'bold', label: 'Bold', sample: '700' }
  ];

  const overrideCount = Object.keys(categoryNav.perCategory || {}).length;

  return (
    <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
              Category Navigation &amp; Label Customization
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mt-1">
            Editable &ldquo;{effectiveAllNewsLabel}&rdquo; Label, Category Fonts &amp; Colors
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Rename the default primary news category label and customize category font sizes, weights, and colors across Desktop, Tablet, and Mobile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isDraftDirty && (
            <button
              type="button"
              onClick={cancelDraft}
              disabled={isPublishing}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Discard Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              updateDraftBranding({ allNewsLabel: DEFAULT_ALL_NEWS_LABEL });
              resetSectionToDefault('categoryNav');
            }}
            disabled={isPublishing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Saving...' : 'Save Category Settings'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 1. EDITABLE "ALL NEWS" LABEL */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Primary Category Name (Replaces Default &ldquo;All News&rdquo;)</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Displayed as the first category tab in the public header navigation, three-dot menu, and news archive tabs.
            </p>
          </div>
          {allNewsInputValue.trim() !== DEFAULT_ALL_NEWS_LABEL && (
            <button
              type="button"
              onClick={() => updateDraftBranding({ allNewsLabel: DEFAULT_ALL_NEWS_LABEL })}
              className="text-[11px] font-semibold text-teal-700 hover:underline self-start sm:self-auto cursor-pointer"
            >
              Restore &ldquo;All News&rdquo;
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
          <input
            type="text"
            maxLength={40}
            value={allNewsInputValue}
            onChange={(e) => updateDraftBranding({ allNewsLabel: e.target.value })}
            placeholder="e.g., Amakuru Yose, Latest Headlines, Front Page..."
            aria-label="Primary category label"
            className="w-full px-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600"
          />
          <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-600">
            Live public text: <strong className="text-slate-900">{effectiveAllNewsLabel}</strong>
          </div>
        </div>
      </div>

      {/* 2. GLOBAL VS PER-CATEGORY MODE TOGGLE */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-700" />
              <span>Category Styling Mode</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Apply a consistent look to every category tab or customize individual categories separately.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => updateDraftCategoryNav({ mode: 'all' })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !isIndividualMode
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Consistent Style (All)
            </button>
            <button
              type="button"
              onClick={() => updateDraftCategoryNav({ mode: 'individual' })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isIndividualMode
                  ? 'bg-white text-teal-800 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Individual Categories{overrideCount > 0 ? ` (${overrideCount})` : ''}
            </button>
          </div>
        </div>

        {/* Individual Category Selector */}
        {isIndividualMode && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Select category to customize:
              </span>
              <div className="flex items-center gap-3">
                {Boolean(categoryNav.perCategory[selectedIndividualKey]) && (
                  <button
                    type="button"
                    onClick={() => resetIndividualCategoryStyle(selectedIndividualKey)}
                    className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                  >
                    Reset Selected to Global Default
                  </button>
                )}
                {overrideCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllIndividualCategoryStyles}
                    className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer"
                  >
                    Clear All Overrides
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {editableCategoryItems.map((item) => {
                const isSelected = selectedIndividualKey === item.key;
                const hasCustom = Boolean(categoryNav.perCategory[item.key]);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedIndividualKey(item.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer inline-flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{item.displayLabel}</span>
                    {hasCustom && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-amber-300' : 'bg-teal-600'
                        }`}
                        title="Custom override active"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. TYPOGRAPHY & COLOR CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Font Size & Font Weight */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-2.5">
            <Type className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Typography {isIndividualMode ? `(${selectedIndividualKey === 'All Categories' ? effectiveAllNewsLabel : selectedIndividualKey})` : '(All Categories)'}
            </h4>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Category Font Size</span>
              <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {currentFontSize}px
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => updateFontSize(currentFontSize - 1)}
                disabled={currentFontSize <= CATEGORY_FONT_SIZE_MIN}
                aria-label="Decrease category font size"
                className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min={CATEGORY_FONT_SIZE_MIN}
                max={CATEGORY_FONT_SIZE_MAX}
                step={1}
                value={currentFontSize}
                onChange={(e) => updateFontSize(Number(e.target.value))}
                aria-label="Category font size slider"
                className="flex-1 accent-teal-700 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => updateFontSize(currentFontSize + 1)}
                disabled={currentFontSize >= CATEGORY_FONT_SIZE_MAX}
                aria-label="Increase category font size"
                className="w-8 h-8 rounded-lg border border-slate-300 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>{CATEGORY_FONT_SIZE_MIN}px (Compact)</span>
              <span>14px (Default)</span>
              <span>{CATEGORY_FONT_SIZE_MAX}px (Large)</span>
            </div>
          </div>

          {/* Font Weight */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-800">Category Font Weight</span>
            <div className="grid grid-cols-3 gap-2">
              {weightOptions.map((opt) => {
                const selected = currentFontWeight === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateFontWeight(opt.value)}
                    className={`px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer flex flex-col items-center ${
                      selected
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      style={{
                        fontWeight: opt.value === 'bold' ? 700 : opt.value === 'medium' ? 500 : 400
                      }}
                    >
                      {opt.label}
                    </span>
                    <span className={`text-[10px] ${selected ? 'text-teal-100' : 'text-slate-400'}`}>
                      {opt.sample}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Text & Background Colors */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-200/80 pb-2.5">
            <Palette className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Category Colors (Text &amp; Background)
            </h4>
          </div>

          {/* Standard Text & Background */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentTextColor}
                  onChange={(e) => updateTextColor(e.target.value)}
                  aria-label="Category text color"
                  className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer bg-white p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={currentTextColor}
                  onChange={(e) => updateTextColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEXT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => updateTextColor(swatch)}
                    title={swatch}
                    className={`w-5 h-5 rounded-md border cursor-pointer ${
                      currentTextColor.toLowerCase() === swatch ? 'ring-2 ring-teal-600' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">Background Color</label>
                <button
                  type="button"
                  onClick={() => updateBackgroundColor('transparent')}
                  className="text-[10px] font-semibold text-teal-700 hover:underline cursor-pointer"
                >
                  Transparent
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentBackgroundColor === 'transparent' ? '#ffffff' : currentBackgroundColor}
                  onChange={(e) => updateBackgroundColor(e.target.value)}
                  aria-label="Category background color"
                  className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer bg-white p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={currentBackgroundColor}
                  onChange={(e) => updateBackgroundColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BG_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => updateBackgroundColor(swatch)}
                    title={swatch}
                    className={`w-5 h-5 rounded-md border cursor-pointer ${
                      currentBackgroundColor.toLowerCase() === swatch ? 'ring-2 ring-teal-600' : 'border-slate-300'
                    }`}
                    style={{
                      backgroundColor: swatch === 'transparent' ? '#ffffff' : swatch,
                      backgroundImage:
                        swatch === 'transparent'
                          ? 'linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%)'
                          : undefined
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Active Category Text & Background */}
          <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">Active Category Text</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentActiveTextColor}
                  onChange={(e) => updateActiveTextColor(e.target.value)}
                  aria-label="Active category text color"
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer bg-white p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={currentActiveTextColor}
                  onChange={(e) => updateActiveTextColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">Active Background</label>
                <button
                  type="button"
                  onClick={() => updateActiveBackgroundColor('transparent')}
                  className="text-[10px] font-semibold text-teal-700 hover:underline cursor-pointer"
                >
                  Transparent
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentActiveBgColor === 'transparent' ? '#f0fdfa' : currentActiveBgColor}
                  onChange={(e) => updateActiveBackgroundColor(e.target.value)}
                  aria-label="Active category background color"
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer bg-white p-0.5 shrink-0"
                />
                <input
                  type="text"
                  value={currentActiveBgColor}
                  onChange={(e) => updateActiveBackgroundColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LIVE PREVIEW BEFORE SAVING */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-teal-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Live Preview Before Saving
            </h4>
            <span className="text-[11px] text-slate-500">
              (Click any category below to test active state)
            </span>
          </div>

          <div className="inline-flex rounded-xl bg-white p-1 border border-slate-200 self-start">
            <button
              type="button"
              onClick={() => setPreviewViewport('desktop')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer ${
                previewViewport === 'desktop' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewViewport('tablet')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer ${
                previewViewport === 'tablet' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewViewport('mobile')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 cursor-pointer ${
                previewViewport === 'mobile' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        <div
          className={`mx-auto ${previewContainerWidth} rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all`}
          style={{ backgroundColor: draftSettings.colors.headerBg || '#ffffff' }}
        >
          <div className="px-4 py-2 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-900 truncate">
              {draftSettings.branding?.platformTitle || 'ISEZERANO ONLINE'}
            </span>
            <span className="text-[10px] uppercase tracking-wider">Category Bar Preview</span>
          </div>
          <div className="px-4 min-h-[48px] py-1.5 flex items-center overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 sm:gap-3 min-w-max">
              {editableCategoryItems.map((item) => {
                const isActive = previewSelectedKey === item.key;
                const itemStyle = resolveCategoryNavItemStyle(item.key, categoryNav, isActive);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setPreviewSelectedKey(item.key)}
                    style={itemStyle}
                    className="px-2.5 py-1.5 rounded-lg border-b-2 whitespace-nowrap shrink-0 transition-all cursor-pointer inline-flex items-center"
                  >
                    {item.displayLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
