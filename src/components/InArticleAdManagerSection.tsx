import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Code,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Layers,
  Link2,
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
  DEFAULT_MONETAG_IN_PAGE_PUSH_CONFIG,
  GlobalAdScriptConfig,
  IN_ARTICLE_PARAGRAPH_LIMITS,
  InArticleAdFormat,
  InArticleAdSlotConfig,
  InArticleAdSlotKey,
  InArticleAdsSettings,
  InArticleDirectLinkCardConfig,
  MonetagInPagePushConfig
} from '../types/platform';
import {
  AD_DISCLOSURE_LABEL_OPTIONS,
  AD_PROVIDER_OPTIONS,
  analyzeAdCodeSnippet,
  clampInArticleParagraph,
  extractBareSafeDirectLinkUrl,
  formatDeviceVisibilitySummary,
  getProviderDisplayName,
  hasRenderableAdCode,
  isInArticleSlotRenderable,
  isSafeAdAssetOrClickUrl,
  isSafeAdScriptUrl,
  isSafeDirectLinkUrl,
  normalizeDisclosureLabel,
  normalizeInArticleAdSlotConfig
} from '../utils/inArticleAdUtils';

interface InArticleAdManagerSectionProps {
  inArticleAds: InArticleAdsSettings;
  globalScripts: GlobalAdScriptConfig;
  inPagePushAd?: MonetagInPagePushConfig;
  isSaving: boolean;
  onUpdateSlot: (slotKey: InArticleAdSlotKey, patch: Partial<InArticleAdSlotConfig>) => void;
  onSaveSlot: (slotKey: InArticleAdSlotKey) => Promise<void> | void;
  onUpdateInPagePush?: (patch: Partial<MonetagInPagePushConfig>) => void;
  onSaveInPagePush?: () => Promise<void> | void;
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
      'Appears inside published news articles immediately after paragraph 3 using either a responsive Sponsored Direct Link Card or HTML/JS Native Banner code.'
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
  inPagePushAd = DEFAULT_MONETAG_IN_PAGE_PUSH_CONFIG,
  isSaving,
  onUpdateSlot,
  onSaveSlot,
  onUpdateInPagePush,
  onSaveInPagePush,
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

  const inPagePushReady = Boolean(
    inPagePushAd.enabled &&
      inPagePushAd.scriptUrl &&
      isSafeAdScriptUrl(inPagePushAd.scriptUrl) &&
      (inPagePushAd.desktopEnabled || inPagePushAd.mobileEnabled)
  );
  const inPagePushNeedsConfig = inPagePushAd.enabled && !inPagePushReady;

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

      {/* Dedicated Monetag In-Page Push Control Card */}
      {onUpdateInPagePush && (
        <div
          data-testid="ads-in-page-push-manager"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 uppercase tracking-wider">
                <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Monetag Floating Push Integration</span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Monetag In-Page Push Banner</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    inPagePushReady
                      ? 'bg-emerald-100 text-emerald-800'
                      : inPagePushNeedsConfig
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {inPagePushReady
                    ? 'ACTIVE SITE-WIDE'
                    : inPagePushNeedsConfig
                    ? 'ENABLED · NEEDS SCRIPT URL'
                    : 'DISABLED'}
                </span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
                Runs non-intrusive floating In-Page Push notifications once globally on public pages instead of crowding the header area. Never runs inside <code className="font-mono text-slate-700">/admin</code> and automatically blocks Popunder scripts.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onUpdateInPagePush({ enabled: !inPagePushAd.enabled })}
              data-testid="ads-in-page-push-enable-toggle"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-center shrink-0 ${
                inPagePushAd.enabled
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {inPagePushAd.enabled ? (
                <>
                  <ToggleRight className="w-4 h-4" aria-hidden="true" />
                  <span>In-Page Push Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" aria-hidden="true" />
                  <span>In-Page Push Disabled</span>
                </>
              )}
            </button>
          </div>

          {inPagePushNeedsConfig && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                In-Page Push is enabled, but requires a valid HTTPS Monetag script URL (e.g. <code className="font-mono">https://nap5k.com/tag.min.js</code>) before activating on public pages.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1.5">
              <label htmlFor="ads-inpagepush-zone" className="block text-xs font-bold text-slate-700">
                Monetag Zone ID
              </label>
              <input
                id="ads-inpagepush-zone"
                data-testid="ads-in-page-push-zone-input"
                type="text"
                inputMode="numeric"
                value={inPagePushAd.zoneId}
                onChange={(e) =>
                  onUpdateInPagePush({ zoneId: e.target.value.replace(/\D/g, '').slice(0, 20) })
                }
                placeholder="e.g. 12321969"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="ads-inpagepush-url" className="block text-xs font-bold text-slate-700">
                Monetag In-Page Push Script URL (HTTPS)
              </label>
              <input
                id="ads-inpagepush-url"
                data-testid="ads-in-page-push-script-input"
                type="url"
                value={inPagePushAd.scriptUrl}
                onChange={(e) => onUpdateInPagePush({ scriptUrl: e.target.value })}
                placeholder="https://nap5k.com/tag.min.js"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inPagePushAd.desktopEnabled}
                    onChange={(e) => onUpdateInPagePush({ desktopEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <Monitor className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>Desktop</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inPagePushAd.mobileEnabled}
                    onChange={(e) => onUpdateInPagePush({ mobileEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  <span>Mobile</span>
                </label>

                <span className="text-[11px] text-slate-500">
                  {formatDeviceVisibilitySummary(inPagePushAd.mobileEnabled, inPagePushAd.desktopEnabled)}
                </span>
              </div>

              {onSaveInPagePush && (
                <button
                  type="button"
                  onClick={onSaveInPagePush}
                  disabled={isSaving}
                  data-testid="ads-in-page-push-save"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Save In-Page Push</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Site-Wide Global Head & Verification Scripts */}
      <div
        data-testid="ads-global-scripts-manager"
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Site-Wide Head &amp; Verification Tag Integration</span>
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
              Use this panel for Monetag site ownership <code className="font-mono text-slate-700">&lt;meta name=&quot;monetag&quot; ...&gt;</code> verification tags or non-intrusive <code className="font-mono text-slate-700">&lt;head&gt;</code> tags. Vignette Banner and In-Page Push now have their own dedicated controls above. Popunder / OnClick scripts remain blocked.
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
              Global scripts are switched <strong>ON</strong>, but no valid script or verification meta tag is currently entered. Add your <code className="font-mono">&lt;meta name=&quot;monetag&quot; ...&gt;</code> verification tag or site-wide tag below, or disable if unused.
            </span>
          </div>
        )}

        {/* Service Worker & Supported Format Status Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-between gap-2">
              <span>Root Service Worker (/sw.js · Zone 12145119)</span>
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
              Push notification worker lives at root <code className="font-mono">/sw.js</code> (<code className="font-mono">5gvci.com</code>) on production HTTPS hosting and is never duplicated inside individual articles.
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
              placeholder={`<!-- Paste Monetag <meta name="monetag" ...> verification tag or approved head script here -->`}
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-teal-300 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {(globalAnalysis.hasIntrusivePopunder ||
            globalAnalysis.hasUnsafeUrls ||
            globalAnalysis.hasBareJavaScript) && (
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
  const normalizedSlot = normalizeInArticleAdSlotConfig(slotKey, slot, false);
  const formatMode: InArticleAdFormat = normalizedSlot.adFormat || 'code';
  const directCard: InArticleDirectLinkCardConfig = normalizedSlot.directLinkCard!;

  const analysis = useMemo(() => analyzeAdCodeSnippet(slot.code), [slot.code]);
  const bareUrlInCodeBox = useMemo(() => extractBareSafeDirectLinkUrl(slot.code), [slot.code]);
  const providerDisplay = getProviderDisplayName(slot.provider, slot.providerLabel);
  const isSlotReadyOnArticles = isInArticleSlotRenderable(normalizedSlot);
  const needsConfiguration = slot.enabled && !isSlotReadyOnArticles;

  const updateDirectCard = (patch: Partial<InArticleDirectLinkCardConfig>) => {
    onChange({
      adFormat: 'direct_link',
      directLinkCard: {
        ...directCard,
        ...patch
      }
    });
  };

  const hasValidDirectUrl = isSafeDirectLinkUrl(directCard.directLinkUrl);
  const hasDirectHeadline = directCard.headline.trim().length > 0;
  const hasDirectCta = directCard.ctaText.trim().length > 0;

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
            <span>
              Dynamic In-Article Placement · After Paragraph {slot.afterParagraph} ·{' '}
              {formatMode === 'direct_link' ? 'Direct Link Card' : 'HTML / JS Banner'}
            </span>
          </div>
          <h4 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{title}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isSlotReadyOnArticles
                  ? 'bg-emerald-100 text-emerald-800'
                  : needsConfiguration
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isSlotReadyOnArticles
                ? formatMode === 'direct_link'
                  ? 'ACTIVE · DIRECT LINK CARD'
                  : 'ACTIVE ON ARTICLES'
                : needsConfiguration
                ? formatMode === 'direct_link'
                  ? 'ENABLED · COMPLETE CARD FIELDS'
                  : 'ENABLED · NEEDS AD CODE'
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

      {needsConfiguration && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {formatMode === 'direct_link' ? (
              <>
                This slot is switched <strong>ON</strong> in Direct Link Card mode
                {hasValidDirectUrl ? (
                  <>
                    {' '}
                    with destination URL <code className="font-mono">{directCard.directLinkUrl}</code>,
                    but remains cleanly hidden on public articles until you enter a{' '}
                    <strong>Headline</strong> and <strong>CTA Button Text</strong> below (so no placeholder copy ever displays).
                  </>
                ) : (
                  <>
                    , but requires a valid <strong>HTTPS Direct Link URL</strong>,{' '}
                    <strong>Headline</strong>, and <strong>CTA Button Text</strong> before appearing inside articles.
                  </>
                )}
              </>
            ) : (
              <>
                This slot is switched <strong>ON</strong>, but no valid {providerDisplay} HTML/script code is currently active. Public articles hide empty slots until you paste HTML/JS banner code (or switch to <strong>Direct Link Ad Card</strong> above) and click <strong>Save</strong>.
              </>
            )}
          </span>
        </div>
      )}

      {/* Format Mode Selector: Direct Link Card vs HTML/JS Banner */}
      <div className="space-y-2">
        <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          In-Article Ad Format:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <button
            type="button"
            data-testid={`ads-in-article-${slotKey}-format-direct`}
            onClick={() => onChange({ adFormat: 'direct_link' })}
            className={`p-3 rounded-xl border text-xs font-bold inline-flex items-center space-x-2 transition-all cursor-pointer ${
              formatMode === 'direct_link'
                ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-2xs ring-1 ring-teal-600'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Link2 className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
            <span>Direct Link Sponsored Ad Card</span>
          </button>

          <button
            type="button"
            data-testid={`ads-in-article-${slotKey}-format-code`}
            onClick={() => onChange({ adFormat: 'code' })}
            className={`p-3 rounded-xl border text-xs font-bold inline-flex items-center space-x-2 transition-all cursor-pointer ${
              formatMode === 'code'
                ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-2xs ring-1 ring-teal-600'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Code className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
            <span>HTML / JS Native Banner Code</span>
          </button>
        </div>
      </div>

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
            value={formatMode === 'direct_link' ? directCard.disclosureLabel || slot.label || '' : slot.label || ''}
            onChange={(e) => {
              const nextVal = e.target.value;
              onChange({
                label: nextVal,
                ...(formatMode === 'direct_link'
                  ? {
                      directLinkCard: {
                        ...directCard,
                        disclosureLabel: normalizeDisclosureLabel(nextVal, 'Sponsored')
                      }
                    }
                  : {})
              });
            }}
            placeholder="Sponsored"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex flex-wrap gap-1.5">
            {AD_DISCLOSURE_LABEL_OPTIONS.map((preset) => {
              const currentLabel =
                formatMode === 'direct_link' ? directCard.disclosureLabel || slot.label : slot.label;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() =>
                    onChange({
                      label: preset,
                      ...(formatMode === 'direct_link'
                        ? {
                            directLinkCard: {
                              ...directCard,
                              disclosureLabel: preset
                            }
                          }
                        : {})
                    })
                  }
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer transition-colors ${
                    currentLabel === preset
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Format Mode Details: Either Direct Link Sponsored Card Fields OR HTML/JS Code Textarea */}
      {formatMode === 'direct_link' ? (
        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Link2 className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>Monetag Direct Link Ad Card Details ({providerDisplay})</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Responsive Card · rel=&quot;noopener noreferrer sponsored&quot;
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor={`ads-${slotKey}-direct-url`} className="block text-xs font-semibold text-slate-700">
                Monetag Direct Link URL (HTTPS Required) *
              </label>
              <input
                id={`ads-${slotKey}-direct-url`}
                data-testid={`ads-in-article-${slotKey}-direct-url`}
                type="url"
                value={directCard.directLinkUrl}
                onChange={(e) => updateDirectCard({ directLinkUrl: e.target.value })}
                placeholder="https://uplcm.com/4/..."
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`ads-${slotKey}-direct-headline`} className="block text-xs font-semibold text-slate-700">
                Card Headline *
              </label>
              <input
                id={`ads-${slotKey}-direct-headline`}
                data-testid={`ads-in-article-${slotKey}-direct-headline`}
                type="text"
                maxLength={120}
                value={directCard.headline}
                onChange={(e) => updateDirectCard({ headline: e.target.value })}
                placeholder="e.g. Discover Partner Resources"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`ads-${slotKey}-direct-cta`} className="block text-xs font-semibold text-slate-700">
                CTA Button Text *
              </label>
              <input
                id={`ads-${slotKey}-direct-cta`}
                data-testid={`ads-in-article-${slotKey}-direct-cta`}
                type="text"
                maxLength={40}
                value={directCard.ctaText}
                onChange={(e) => updateDirectCard({ ctaText: e.target.value })}
                placeholder="e.g. Learn More"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`ads-${slotKey}-direct-desc`} className="block text-xs font-semibold text-slate-700">
                Short Description (Optional)
              </label>
              <input
                id={`ads-${slotKey}-direct-desc`}
                data-testid={`ads-in-article-${slotKey}-direct-description`}
                type="text"
                maxLength={240}
                value={directCard.description || ''}
                onChange={(e) => updateDirectCard({ description: e.target.value })}
                placeholder="Brief one-line summary for readers"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`ads-${slotKey}-direct-thumb`} className="block text-xs font-semibold text-slate-700">
                Thumbnail Image URL (Optional HTTPS)
              </label>
              <input
                id={`ads-${slotKey}-direct-thumb`}
                data-testid={`ads-in-article-${slotKey}-direct-thumb`}
                type="url"
                value={directCard.thumbnailUrl || ''}
                onChange={(e) => updateDirectCard({ thumbnailUrl: e.target.value })}
                placeholder="https://example.com/sponsor-thumb.jpg"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {directCard.directLinkUrl.trim() && !hasValidDirectUrl && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>Please provide a safe <code className="font-mono">https://</code> Direct Link destination URL (Popunder domains remain blocked).</span>
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
      ) : (
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

          {bareUrlInCodeBox && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                This looks like a Monetag Direct Link URL (<code className="font-mono">{bareUrlInCodeBox}</code>). Switch to <strong>Direct Link Sponsored Ad Card</strong> mode above to display it as a clean clickable card instead of raw text.
              </span>
            </div>
          )}

          {analysis.isLikelyGlobalScript && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                This snippet looks like a global site-wide/head tag. Use the dedicated Vignette Banner, In-Page Push, or Global Site-Wide Scripts controls instead of embedding page overlays inside article text.
              </span>
            </div>
          )}

          {(analysis.hasIntrusivePopunder ||
            analysis.hasUnsafeUrls ||
            analysis.hasBareJavaScript) && (
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
      )}

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
              formatMode === 'direct_link' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" aria-hidden="true" />
                      <span>{directCard.disclosureLabel || slot.label || 'Sponsored'}</span>
                    </span>
                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[9px]">
                      SPONSORED
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {directCard.thumbnailUrl && isSafeAdAssetOrClickUrl(directCard.thumbnailUrl) ? (
                        <img
                          src={directCard.thumbnailUrl}
                          alt={directCard.headline}
                          className="w-16 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-teal-700" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {directCard.headline}
                        </div>
                        {directCard.description && (
                          <div className="text-[11px] text-slate-600 truncate">
                            {directCard.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-[11px] font-bold shrink-0">
                      <span>{directCard.ctaText}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              ) : (
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
              )
            ) : (
              <div className="py-2 px-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center text-[11px] text-slate-500">
                {formatMode === 'direct_link' && !hasDirectHeadline && !hasDirectCta
                  ? 'Slot currently collapsed cleanly (enter Headline, CTA Text, and valid Direct Link URL to display card).'
                  : 'Slot currently collapsed cleanly (enable slot and complete required fields above to activate).'}
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
