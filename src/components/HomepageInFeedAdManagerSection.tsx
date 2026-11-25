import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code,
  Eye,
  LayoutGrid,
  Monitor,
  Save,
  Smartphone,
  Sparkles,
  ToggleLeft
} from 'lucide-react';
import {
  AdProviderId,
  DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS,
  HOMEPAGE_IN_FEED_POSITION_LIMITS,
  HomepageInFeedAdSlotConfig,
  HomepageInFeedAdSlotKey,
  HomepageInFeedAdsSettings
} from '../types/platform';
import {
  AD_DISCLOSURE_LABEL_OPTIONS,
  AD_PROVIDER_OPTIONS,
  analyzeAdCodeSnippet,
  clampHomepageInFeedPosition,
  formatDeviceVisibilitySummary,
  getProviderDisplayName,
  hasRenderableAdCode
} from '../utils/inArticleAdUtils';

interface HomepageInFeedAdManagerSectionProps {
  homepageInFeedAds: HomepageInFeedAdsSettings;
  isSaving: boolean;
  onUpdateSlot: (
    slotKey: HomepageInFeedAdSlotKey,
    patch: Partial<HomepageInFeedAdSlotConfig>
  ) => void;
  onSaveSlot: (slotKey: HomepageInFeedAdSlotKey) => Promise<void> | void;
}

const SLOT_METADATA: ReadonlyArray<{
  key: HomepageInFeedAdSlotKey;
  title: string;
  description: string;
}> = [
  {
    key: 'slot1',
    title: '5. Homepage In-Feed Ad Slot 1',
    description:
      'Placed cleanly between published article cards near the top of your Homepage feed (default: after article 4).'
  },
  {
    key: 'slot2',
    title: '6. Homepage In-Feed Ad Slot 2',
    description:
      'Independent middle feed placement positioned between article cards on desktop and mobile (default: after article 8).'
  },
  {
    key: 'slot3',
    title: '7. Homepage In-Feed Ad Slot 3',
    description:
      'Deep homepage feed slot appearing further down between article cards (default: after article 12).'
  }
];

export const HomepageInFeedAdManagerSection: React.FC<HomepageInFeedAdManagerSectionProps> = ({
  homepageInFeedAds,
  isSaving,
  onUpdateSlot,
  onSaveSlot
}) => {
  return (
    <div data-testid="ads-homepage-in-feed-section" className="space-y-6">
      {/* Dedicated Section Header */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-sm border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-200 text-xs font-semibold border border-teal-400/30">
              <LayoutGrid className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
              <span>HOMEPAGE IN-FEED ADS</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              HOMEPAGE IN-FEED ADS
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Manage three independent advertising containers displayed cleanly between article cards on the public Homepage and Category feeds across Desktop and Mobile. Completely independent from Header Ads, Below-Post Ads, and In-Article Slots 1–3, and collapses cleanly when disabled or empty.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-200 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 shrink-0">
            <Monitor className="w-4 h-4 text-teal-300" aria-hidden="true" />
            <Smartphone className="w-4 h-4 text-teal-300" aria-hidden="true" />
            <span className="font-semibold">3 Independent Feed Positions</span>
          </div>
        </div>
      </div>

      {/* Independent Cards for Slot 1, Slot 2, Slot 3 */}
      {SLOT_METADATA.map((meta) => (
        <HomepageInFeedSlotCard
          key={meta.key}
          slotKey={meta.key}
          slot={homepageInFeedAds[meta.key]}
          title={meta.title}
          description={meta.description}
          defaultPosition={DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS[meta.key]}
          isSaving={isSaving}
          onChange={(patch) => onUpdateSlot(meta.key, patch)}
          onSave={() => onSaveSlot(meta.key)}
        />
      ))}
    </div>
  );
};

interface HomepageInFeedSlotCardProps {
  slotKey: HomepageInFeedAdSlotKey;
  slot: HomepageInFeedAdSlotConfig;
  title: string;
  description: string;
  defaultPosition: number;
  isSaving: boolean;
  onChange: (patch: Partial<HomepageInFeedAdSlotConfig>) => void;
  onSave: () => Promise<void> | void;
}

const HomepageInFeedSlotCard: React.FC<HomepageInFeedSlotCardProps> = ({
  slotKey,
  slot,
  title,
  description,
  defaultPosition,
  isSaving,
  onChange,
  onSave
}) => {
  const [showPreview, setShowPreview] = useState(true);
  const analysis = useMemo(() => analyzeAdCodeSnippet(slot.code), [slot.code]);
  const providerDisplay = getProviderDisplayName(slot.provider, slot.providerLabel);
  const hasSlotCodeReady = hasRenderableAdCode(slot.code);
  const isSlotReadyOnFeed = slot.enabled && hasSlotCodeReady;
  const needsSlotCode = slot.enabled && !hasSlotCodeReady;

  return (
    <div
      data-testid={`ads-homepage-in-feed-${slotKey}-card`}
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
    >
      {/* Card Header + Enable Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 uppercase tracking-wider">
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Homepage Feed Placement · After Article {slot.afterPost}</span>
          </div>
          <h4 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{title}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isSlotReadyOnFeed
                  ? 'bg-emerald-100 text-emerald-800'
                  : needsSlotCode
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isSlotReadyOnFeed
                ? 'ACTIVE ON HOMEPAGE'
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
          data-testid={`ads-homepage-in-feed-${slotKey}-enable-toggle`}
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
            This slot is switched <strong>ON</strong>, but its advertising code box is currently empty. The homepage hides empty slots cleanly until you paste your {providerDisplay} HTML/script code below and click <strong>Save</strong>.
          </span>
        </div>
      )}

      {/* Controls Grid: Provider, After Article #, Device Targeting, Disclosure Label */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Provider Selector */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label
            htmlFor={`ads-home-${slotKey}-provider`}
            className="block text-xs font-bold text-slate-800"
          >
            Ad Provider / Network
          </label>
          <select
            id={`ads-home-${slotKey}-provider`}
            data-testid={`ads-homepage-in-feed-${slotKey}-provider`}
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
              aria-label={`Custom provider label for homepage ${slotKey}`}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          )}
        </div>

        {/* Feed Article Position */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={`ads-home-${slotKey}-position`}
              className="block text-xs font-bold text-slate-800"
            >
              Insert After Article #
            </label>
            <span className="text-[10px] font-mono text-slate-500">
              Default: {defaultPosition}
            </span>
          </div>
          <input
            id={`ads-home-${slotKey}-position`}
            data-testid={`ads-homepage-in-feed-${slotKey}-position`}
            type="number"
            min={HOMEPAGE_IN_FEED_POSITION_LIMITS.min}
            max={HOMEPAGE_IN_FEED_POSITION_LIMITS.max}
            value={slot.afterPost}
            onChange={(e) =>
              onChange({
                afterPost: clampHomepageInFeedPosition(e.target.value, defaultPosition)
              })
            }
            className="w-full px-3 py-2 text-xs sm:text-sm font-bold border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-[11px] text-slate-500 leading-snug">
            Renders cleanly after article card {slot.afterPost} when at least {slot.afterPost} published stories appear in the feed.
          </p>
        </div>

        {/* Device Targeting */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="block text-xs font-bold text-slate-800">Device Visibility</span>
          <div className="space-y-1.5 pt-0.5">
            <label className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer">
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                <span>Desktop</span>
              </span>
              <input
                type="checkbox"
                checked={slot.desktopEnabled}
                data-testid={`ads-homepage-in-feed-${slotKey}-desktop`}
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
                data-testid={`ads-homepage-in-feed-${slotKey}-mobile`}
                onChange={(e) => onChange({ mobileEnabled: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
            </label>
          </div>
        </div>

        {/* Disclosure Label */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <label
            htmlFor={`ads-home-${slotKey}-label`}
            className="block text-xs font-bold text-slate-800"
          >
            Disclosure Label
          </label>
          <input
            id={`ads-home-${slotKey}-label`}
            data-testid={`ads-homepage-in-feed-${slotKey}-label`}
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

      {/* Ad Code Input */}
      <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label
            htmlFor={`ads-home-${slotKey}-code`}
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
          id={`ads-home-${slotKey}-code`}
          data-testid={`ads-homepage-in-feed-${slotKey}-code`}
          rows={4}
          value={slot.code}
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder={`<!-- Paste ${providerDisplay} native banner or homepage in-feed script snippet here (OnClick/Popunder tags are blocked automatically) -->`}
          className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-teal-300 focus:ring-2 focus:ring-teal-500"
        />

        {analysis.isLikelyGlobalScript && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              This snippet looks like a global site-wide/head tag. Consider placing site-wide tags in the <strong>Global Site-Wide Ad &amp; Verification Scripts</strong> panel above instead of repeating them in the feed.
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
            data-testid={`ads-homepage-in-feed-${slotKey}-save`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              Save {slotKey === 'slot1' ? 'Feed Slot 1' : slotKey === 'slot2' ? 'Feed Slot 2' : 'Feed Slot 3'}
            </span>
          </button>
        </div>
      </div>

      {/* Placement Live Wireframe Preview */}
      {showPreview && (
        <div
          data-testid={`ads-homepage-in-feed-${slotKey}-preview`}
          className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800">
            <span className="inline-flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>Homepage Article Feed Placement Preview</span>
            </span>
            <span className="text-[11px] font-mono font-normal text-slate-500">
              After Article {slot.afterPost} · {providerDisplay} ·{' '}
              {formatDeviceVisibilitySummary(slot.mobileEnabled, slot.desktopEnabled)}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
              <strong className="text-slate-800">Article Card #{slot.afterPost}:</strong> Headline, summary &amp; thumbnail card renders cleanly above this slot.
            </div>

            {isSlotReadyOnFeed ? (
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
                  Configured {providerDisplay} feed snippet ready ({slot.code.trim().length} chars ·{' '}
                  {formatDeviceVisibilitySummary(slot.mobileEnabled, slot.desktopEnabled)})
                </div>
              </div>
            ) : (
              <div className="py-2 px-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center text-[11px] text-slate-500">
                Slot currently collapsed cleanly (enable slot and add code above to activate).
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
              <strong className="text-slate-800">Article Card #{slot.afterPost + 1}:</strong> Next story card continues seamlessly below with zero overlap.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
