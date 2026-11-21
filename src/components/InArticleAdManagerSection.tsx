import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code,
  Eye,
  FileText,
  Globe,
  Layers,
  Monitor,
  Save,
  Smartphone,
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import {
  AdProviderId,
  DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS,
  GlobalAdScriptConfig,
  IN_ARTICLE_PARAGRAPH_LIMITS,
  InArticleAdSlotConfig,
  InArticleAdSlotKey,
  InArticleAdsSettings
} from '../types/platform';
import {
  AD_DISCLOSURE_LABEL_OPTIONS,
  AD_PROVIDER_OPTIONS,
  analyzeAdCodeSnippet,
  clampInArticleParagraph,
  formatDeviceVisibilitySummary,
  getProviderDisplayName,
  hasRenderableAdCode
} from '../utils/inArticleAdUtils';

interface InArticleAdManagerSectionProps {
  inArticleAds: InArticleAdsSettings;
  globalScripts: GlobalAdScriptConfig;
  isSaving: boolean;
  onUpdateSlot: (slotKey: InArticleAdSlotKey, patch: Partial<InArticleAdSlotConfig>) => void;
  onSaveSlot: (slotKey: InArticleAdSlotKey) => Promise<void> | void;
  onUpdateGlobalScripts: (patch: Partial<GlobalAdScriptConfig>) => void;
  onSaveGlobalScripts: () => Promise<void> | void;
}

const SLOT_METADATA: ReadonlyArray<{
  key: InArticleAdSlotKey;
  positionNumber: number;
  title: string;
  description: string;
}> = [
  {
    key: 'slot1',
    positionNumber: 3,
    title: '3. In-Article Ad Slot 1 (After Paragraph 3)',
    description:
      'Appears inside published news articles immediately after paragraph 3 (or your chosen paragraph) on eligible stories.'
  },
  {
    key: 'slot2',
    positionNumber: 4,
    title: '4. In-Article Ad Slot 2 (After Paragraph 7)',
    description:
      'Appears deeper inside medium and long-form articles after paragraph 7. Automatically skipped cleanly on shorter stories.'
  },
  {
    key: 'slot3',
    positionNumber: 5,
    title: '5. In-Article Ad Slot 3 (After Paragraph 11)',
    description:
      'Appears toward the lower third of long-form articles after paragraph 11 without ever placing two ads adjacent to each other.'
  }
];

export const InArticleAdManagerSection: React.FC<InArticleAdManagerSectionProps> = ({
  inArticleAds,
  globalScripts,
  isSaving,
  onUpdateSlot,
  onSaveSlot,
  onUpdateGlobalScripts,
  onSaveGlobalScripts
}) => {
  const [swStatus, setSwStatus] = useState<'checking' | 'present' | 'missing'>('checking');

  useEffect(() => {
    if (typeof fetch !== 'function' || typeof window === 'undefined') {
      setSwStatus('missing');
      return;
    }
    let active = true;
    fetch('/sw.js', { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        if (!active) return;
        setSwStatus(res.ok ? 'present' : 'missing');
      })
      .catch(() => {
        if (active) setSwStatus('missing');
      });
    return () => {
      active = false;
    };
  }, []);

  const globalAnalysis = useMemo(
    () => analyzeAdCodeSnippet(globalScripts.code),
    [globalScripts.code]
  );

  return (
    <div className="space-y-6" data-testid="ads-multi-provider-section">
      {/* Three Independent In-Article Positions (Slots 1, 2, 3) */}
      {SLOT_METADATA.map((meta) => {
        const slot = inArticleAds[meta.key];
        return (
          <InArticleSlotCard
            key={meta.key}
            slotKey={meta.key}
            slot={slot}
            title={meta.title}
            description={meta.description}
            defaultParagraph={DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS[meta.key]}
            isSaving={isSaving}
            onChange={(patch) => onUpdateSlot(meta.key, patch)}
            onSave={() => onSaveSlot(meta.key)}
          />
        );
      })}

      {/* Site-Wide Global Head & Monetag Scripts (Multitag, OnClick, Vignette, In-Page Push, Meta Verification) */}
      <div
        data-testid="ads-global-scripts-manager"
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Site-Wide Head &amp; Push Format Integration</span>
            </div>
            <h4 className="text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Global Site-Wide Ad &amp; Verification Scripts</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  globalScripts.enabled && hasRenderableAdCode(globalScripts.code)
                    ? 'bg-emerald-100 text-emerald-800'
                    : globalScripts.enabled
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {globalScripts.enabled && hasRenderableAdCode(globalScripts.code)
                  ? 'ACTIVE ONCE GLOBALLY'
                  : globalScripts.enabled
                  ? 'ENABLED · NEEDS SCRIPT CODE'
                  : 'DISABLED'}
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
              Use this panel for Monetag or network formats that belong in <code className="font-mono text-slate-700">&lt;head&gt;</code> once site-wide (Multitag, OnClick/Popunder, Vignette Banner, In-Page Push, or ownership <code className="font-mono text-slate-700">&lt;meta&gt;</code> verification tags). Executed at most once on public pages and never duplicated per article or loaded on <code className="font-mono text-slate-700">/admin</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onUpdateGlobalScripts({ enabled: !globalScripts.enabled })}
            data-testid="ads-global-scripts-enable-toggle"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-center shrink-0 ${
              globalScripts.enabled
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {globalScripts.enabled ? (
              <>
                <ToggleRight className="w-4 h-4" aria-hidden="true" />
                <span>Global Scripts Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" aria-hidden="true" />
                <span>Global Scripts Disabled</span>
              </>
            )}
          </button>
        </div>

        {globalScripts.enabled && !hasRenderableAdCode(globalScripts.code) && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Global scripts are switched <strong>ON</strong>, but no script or verification meta tag has been entered yet. Paste your Monetag Multitag / OnClick / Push / <code className="font-mono">&lt;meta&gt;</code> code below and click <strong>Save Global Scripts</strong>.
            </span>
          </div>
        )}

        {/* Service Worker & Supported Format Status Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
              <span>Root Service Worker (/sw.js)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  swStatus === 'present'
                    ? 'bg-emerald-100 text-emerald-800'
                    : swStatus === 'checking'
                    ? 'bg-slate-100 text-slate-600'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {swStatus === 'present'
                  ? 'AVAILABLE AT /sw.js'
                  : swStatus === 'checking'
                  ? 'CHECKING...'
                  : 'NOT DETECTED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Push notification workers run from root <code className="font-mono">/sw.js</code> on production HTTPS hosting and are never duplicated inside individual articles.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900">Device Scope for Global Tag</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalScripts.desktopEnabled}
                  onChange={(e) => onUpdateGlobalScripts({ desktopEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <Monitor className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Desktop</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalScripts.mobileEnabled}
                  onChange={(e) => onUpdateGlobalScripts({ mobileEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <Smartphone className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Mobile</span>
              </label>

              <span className="text-[11px] text-slate-500 ml-auto font-medium">
                {formatDeviceVisibilitySummary(
                  globalScripts.mobileEnabled,
                  globalScripts.desktopEnabled
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Provider & Code Input */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="ads-global-provider"
                className="block text-xs font-bold text-slate-700"
              >
                Global Script Provider
              </label>
              <select
                id="ads-global-provider"
                value={globalScripts.provider}
                onChange={(e) =>
                  onUpdateGlobalScripts({ provider: e.target.value as AdProviderId })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
              >
                {AD_PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {globalScripts.provider === 'other' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="ads-global-provider-label"
                  className="block text-xs font-bold text-slate-700"
                >
                  Custom Network Name
                </label>
                <input
                  id="ads-global-provider-label"
                  type="text"
                  maxLength={40}
                  value={globalScripts.providerLabel || ''}
                  onChange={(e) => onUpdateGlobalScripts({ providerLabel: e.target.value })}
                  placeholder="e.g. Monetag / Adsterra / Custom"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="ads-global-scripts-code"
                className="block text-xs font-bold text-slate-700"
              >
                Global Head Script or Verification Meta Tag
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                Single-run &lt;head&gt; execution
              </span>
            </div>
            <textarea
              id="ads-global-scripts-code"
              data-testid="ads-global-scripts-code"
              rows={4}
              value={globalScripts.code}
              onChange={(e) => onUpdateGlobalScripts({ code: e.target.value })}
              placeholder={`<!-- Paste Monetag Multitag, OnClick, Vignette, In-Page Push, or <meta name="monetag" ...> verification tag here -->`}
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-teal-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {(globalAnalysis.hasUnsafeUrls || globalAnalysis.hasBareJavaScript) && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{globalAnalysis.warnings[0]}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500">
              Executes once on public site pages via HTTPS-validated tag injection; never runs inside Admin pages.
            </span>

            <button
              type="button"
              onClick={onSaveGlobalScripts}
              disabled={isSaving}
              data-testid="ads-global-scripts-save"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Save Global Scripts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface InArticleSlotCardProps {
  slotKey: InArticleAdSlotKey;
  slot: InArticleAdSlotConfig;
  title: string;
  description: string;
  defaultParagraph: number;
  isSaving: boolean;
  onChange: (patch: Partial<InArticleAdSlotConfig>) => void;
  onSave: () => Promise<void> | void;
}

const InArticleSlotCard: React.FC<InArticleSlotCardProps> = ({
  slotKey,
  slot,
  title,
  description,
  defaultParagraph,
  isSaving,
  onChange,
  onSave
}) => {
  const [showPreview, setShowPreview] = useState(true);
  const analysis = useMemo(() => analyzeAdCodeSnippet(slot.code), [slot.code]);
  const providerDisplay = getProviderDisplayName(slot.provider, slot.providerLabel);
  const hasSlotCodeReady = hasRenderableAdCode(slot.code);
  const isSlotReadyOnArticles = slot.enabled && hasSlotCodeReady;
  const needsSlotCode = slot.enabled && !hasSlotCodeReady;

  return (
    <div
      data-testid={`ads-in-article-${slotKey}-card`}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
    >
      {/* Header + Enable Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dynamic In-Article Placement · After Paragraph {slot.afterParagraph}</span>
          </div>
          <h4 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{title}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isSlotReadyOnArticles
                  ? 'bg-emerald-100 text-emerald-800'
                  : needsSlotCode
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isSlotReadyOnArticles
                ? 'ACTIVE ON ARTICLES'
                : needsSlotCode
                ? 'ENABLED · NEEDS AD CODE'
                : 'DISABLED'}
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => onChange({ enabled: !slot.enabled })}
          data-testid={`ads-in-article-${slotKey}-enable-toggle`}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-center shrink-0 ${
            slot.enabled
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {slot.enabled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Slot Enabled</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Slot Disabled</span>
            </>
          )}
        </button>
      </div>

      {needsSlotCode && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            This slot is switched <strong>ON</strong>, but its advertising code box is currently empty. Articles hide empty slots until you paste your {providerDisplay} HTML/script code below and click <strong>Save</strong>.
          </span>
        </div>
      )}

      {/* Controls Grid: Provider, Paragraph Position, Label, Mobile/Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Provider Selector */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label
            htmlFor={`ads-${slotKey}-provider`}
            className="block text-xs font-bold text-slate-800"
          >
            Ad Provider / Network
          </label>
          <select
            id={`ads-${slotKey}-provider`}
            data-testid={`ads-in-article-${slotKey}-provider`}
            value={slot.provider}
            onChange={(e) => onChange({ provider: e.target.value as AdProviderId })}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500"
          >
            {AD_PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          {slot.provider === 'other' && (
            <input
              type="text"
              maxLength={40}
              value={slot.providerLabel || ''}
              onChange={(e) => onChange({ providerLabel: e.target.value })}
              placeholder="Network name (e.g. AdSense)"
              aria-label={`Custom provider label for ${slotKey}`}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          )}

          {slot.provider === 'adscod' && (
            <p className="text-[11px] text-slate-500 leading-snug">
              Paste your official Adscod embed snippet below (legacy placement IDs kept only as admin reference: Banner <code className="font-mono">fa638e17...</code>, Inline <code className="font-mono">59311ecd...</code>).
            </p>
          )}
        </div>

        {/* Paragraph Insertion Position */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`ads-${slotKey}-paragraph`}
              className="block text-xs font-bold text-slate-800"
            >
              Insert After Paragraph #
            </label>
            <span className="text-[10px] font-mono text-slate-500">
              Default: {defaultParagraph}
            </span>
          </div>
          <input
            id={`ads-${slotKey}-paragraph`}
            data-testid={`ads-in-article-${slotKey}-paragraph`}
            type="number"
            min={IN_ARTICLE_PARAGRAPH_LIMITS.min}
            max={IN_ARTICLE_PARAGRAPH_LIMITS.max}
            value={slot.afterParagraph}
            onChange={(e) =>
              onChange({
                afterParagraph: clampInArticleParagraph(e.target.value, defaultParagraph)
              })
            }
            className="w-full px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-[11px] text-slate-500 leading-snug">
            Shows after paragraph {slot.afterParagraph} when an article has at least {slot.afterParagraph + 1} paragraphs.
          </p>
        </div>

        {/* Device Targeting */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="block text-xs font-bold text-slate-800">
            Device Visibility
          </span>
          <div className="space-y-1.5 pt-0.5">
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                <span>Desktop</span>
              </span>
              <input
                type="checkbox"
                checked={slot.desktopEnabled}
                data-testid={`ads-in-article-${slotKey}-desktop`}
                onChange={(e) => onChange({ desktopEnabled: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </label>

            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                <span>Mobile</span>
              </span>
              <input
                type="checkbox"
                checked={slot.mobileEnabled}
                data-testid={`ads-in-article-${slotKey}-mobile`}
                onChange={(e) => onChange({ mobileEnabled: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </label>
          </div>
        </div>

        {/* Disclosure Label */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label
            htmlFor={`ads-${slotKey}-label`}
            className="block text-xs font-bold text-slate-800"
          >
            Disclosure Label
          </label>
          <input
            id={`ads-${slotKey}-label`}
            data-testid={`ads-in-article-${slotKey}-label`}
            type="text"
            maxLength={40}
            value={slot.label || ''}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Advertisement"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {AD_DISCLOSURE_LABEL_OPTIONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange({ label: preset })}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                  slot.label === preset
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ad Code Textarea */}
      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={`ads-${slotKey}-code`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800"
          >
            <Code className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
            <span>Advertising Code ({providerDisplay})</span>
          </label>
          <span className="text-[11px] font-mono text-slate-500">
            HTML / JS Embed / Native Banner
          </span>
        </div>

        <textarea
          id={`ads-${slotKey}-code`}
          data-testid={`ads-in-article-${slotKey}-code`}
          rows={4}
          value={slot.code}
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder={`<!-- Paste ${providerDisplay} in-article ad unit, native banner HTML, or script snippet here -->`}
          className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-teal-300 focus:ring-2 focus:ring-teal-500"
        />

        {analysis.isLikelyGlobalScript && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              This snippet looks like a global site-wide/head tag (Multitag, Vignette, Popunder, Zone Tag, or Verification Meta). Consider placing site-wide tags in the <strong>Global Site-Wide Ad &amp; Verification Scripts</strong> panel below so they load once cleanly instead of per-article.
            </span>
          </div>
        )}

        {(analysis.hasUnsafeUrls || analysis.hasBareJavaScript) && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{analysis.warnings[0]}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-800 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showPreview ? 'Hide Placement Preview' : 'Show Placement Preview'}</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            data-testid={`ads-in-article-${slotKey}-save`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Save {slotKey === 'slot1' ? 'Slot 1' : slotKey === 'slot2' ? 'Slot 2' : 'Slot 3'}</span>
          </button>
        </div>
      </div>

      {/* Placement Live Wireframe Preview */}
      {showPreview && (
        <div
          data-testid={`ads-in-article-${slotKey}-preview`}
          className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800">
            <span className="inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>Article Reading Placement Preview</span>
            </span>
            <span className="text-[11px] font-mono font-normal text-slate-500">
              After Paragraph {slot.afterParagraph} · {providerDisplay} ·{' '}
              {formatDeviceVisibilitySummary(slot.mobileEnabled, slot.desktopEnabled)}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs text-slate-600">
            <p className="leading-relaxed border-l-2 border-slate-200 pl-3 text-slate-500">
              <strong className="text-slate-700">Paragraph {slot.afterParagraph}:</strong> ...Story body text completes its paragraph cleanly before any ad container appears...
            </p>

            {isSlotReadyOnArticles ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" aria-hidden="true" />
                    <span>{slot.label?.trim() || 'Advertisement'}</span>
                  </span>
                  <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[9px]">
                    AD · {providerDisplay}
                  </span>
                </div>
                <div className="py-3 px-2 rounded-lg bg-white border border-dashed border-slate-300 text-center text-[11px] text-slate-600">
                  Configured {providerDisplay} snippet ready ({slot.code.trim().length} chars ·{' '}
                  {formatDeviceVisibilitySummary(slot.mobileEnabled, slot.desktopEnabled)})
                </div>
              </div>
            ) : (
              <div className="py-2 px-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center text-[11px] text-slate-500">
                Slot currently collapsed cleanly (enable slot and add code above to activate).
              </div>
            )}

            <p className="leading-relaxed border-l-2 border-slate-200 pl-3 text-slate-500">
              <strong className="text-slate-700">Paragraph {slot.afterParagraph + 1}:</strong> Article narrative continues seamlessly below the container without touching images, captions, or headings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
