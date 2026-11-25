import React, { useEffect, useMemo, useState } from 'react';
import { 
  Megaphone, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  Image as ImageIcon, 
  Eye, 
  ShieldCheck, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  SlidersHorizontal,
  Video,
  Minus,
  Plus,
  AlertTriangle,
  Layers
} from 'lucide-react';
import {
  AdSlotConfig,
  AdsSettings,
  DEFAULT_ADS_SETTINGS,
  FloatingVideoAdConfig,
  GlobalAdScriptConfig,
  HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC,
  HomepageInFeedAdSlotConfig,
  HomepageInFeedAdSlotKey,
  InArticleAdSlotConfig,
  InArticleAdSlotKey,
  MonetagInPagePushConfig,
  MonetagVignetteConfig
} from '../types/platform';
import { getAdsSettings, saveAdsSettings } from '../services/siteSettingsService';
import { useAuth } from '../context/AuthContext';
import { InArticleAdManagerSection } from './InArticleAdManagerSection';
import { HomepageInFeedAdManagerSection } from './HomepageInFeedAdManagerSection';
import {
  ADS_DISPLAY_LIMITS,
  AdsDisplaySettings,
  DEFAULT_ADS_DISPLAY_SETTINGS,
  normalizeAdsDisplaySettings
} from '../utils/displaySettingsUtils';
import {
  analyzeAdCodeSnippet,
  extractBareSafeDirectLinkUrl,
  formatDeviceVisibilitySummary,
  hasRenderableAdCode,
  isSafeAdAssetOrClickUrl,
  isSafeAdScriptUrl,
  normalizeFloatingVideoAdConfig,
  normalizeGlobalAdScriptConfig,
  normalizeHomepageInFeedAdSlotConfig,
  normalizeHomepageInFeedAdsSettings,
  normalizeInArticleAdSlotConfig,
  normalizeInArticleAdsSettings,
  normalizeInPagePushAdConfig,
  normalizeStandardAdSlotConfig,
  normalizeVignetteAdConfig
} from '../utils/inArticleAdUtils';

export const AdsManager: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [floatingVideoStatus, setFloatingVideoStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getAdsSettings(true);
      setSettings({
        ...data,
        belowHeaderAd: {
          ...DEFAULT_ADS_SETTINGS.belowHeaderAd!,
          enabled: false,
          code: ''
        },
        aboveFooterAd: normalizeStandardAdSlotConfig(
          data.aboveFooterAd,
          DEFAULT_ADS_SETTINGS.aboveFooterAd,
          true
        ),
        vignetteAd: normalizeVignetteAdConfig(data.vignetteAd),
        inPagePushAd: normalizeInPagePushAdConfig(data.inPagePushAd),
        inArticleAds: normalizeInArticleAdsSettings(data.inArticleAds),
        homepageInFeedAds: normalizeHomepageInFeedAdsSettings(data.homepageInFeedAds),
        globalScripts: normalizeGlobalAdScriptConfig(data.globalScripts),
        floatingVideoAd: normalizeFloatingVideoAdConfig(data.floatingVideoAd),
        displaySettings: normalizeAdsDisplaySettings(data.displaySettings)
      });
    } catch (err) {
      console.error('Error loading ads settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payloadToSave: AdsSettings = {
        ...settings,
        belowHeaderAd: {
          ...DEFAULT_ADS_SETTINGS.belowHeaderAd!,
          enabled: false,
          code: ''
        },
        aboveFooterAd: normalizeStandardAdConfigForSave(settings.aboveFooterAd),
        vignetteAd: normalizeVignetteAdConfig(settings.vignetteAd),
        inPagePushAd: normalizeInPagePushAdConfig(settings.inPagePushAd),
        inArticleAds: normalizeInArticleAdsSettings(settings.inArticleAds),
        homepageInFeedAds: normalizeHomepageInFeedAdsSettings(settings.homepageInFeedAds),
        globalScripts: normalizeGlobalAdScriptConfig(settings.globalScripts),
        floatingVideoAd: normalizeFloatingVideoAdConfig(settings.floatingVideoAd),
        displaySettings: normalizeAdsDisplaySettings(settings.displaySettings)
      };
      const result = await saveAdsSettings(payloadToSave, user.uid);
      if (result.success) {
        setSettings(payloadToSave);
        if (result.isLocalFallback) {
          setStatusMessage({
            type: 'success',
            text: 'Ad settings saved and applied locally! (Will sync to all devices once Firestore rules are published).'
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: 'Ad settings, in-article slots & display sizes saved successfully across all devices!'
          });
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || 'Failed to save ad settings.'
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Unexpected error saving ad settings.'
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const updateAboveFooter = (patch: Partial<AdSlotConfig>) => {
    setSettings(prev => ({
      ...prev,
      aboveFooterAd: { ...prev.aboveFooterAd, ...patch }
    }));
  };

  const currentVignetteAd = normalizeVignetteAdConfig(settings.vignetteAd);
  const currentInPagePushAd = normalizeInPagePushAdConfig(settings.inPagePushAd);
  const currentFloatingVideo = normalizeFloatingVideoAdConfig(settings.floatingVideoAd);
  const currentInArticleAds = normalizeInArticleAdsSettings(settings.inArticleAds, false);
  const currentHomepageInFeedAds = normalizeHomepageInFeedAdsSettings(
    settings.homepageInFeedAds,
    false
  );
  const currentGlobalScripts = normalizeGlobalAdScriptConfig(settings.globalScripts, false);

  const updateFloatingVideoAd = (patch: Partial<FloatingVideoAdConfig>) => {
    setSettings(prev => ({
      ...prev,
      floatingVideoAd: normalizeFloatingVideoAdConfig({
        ...normalizeFloatingVideoAdConfig(prev.floatingVideoAd),
        ...patch
      })
    }));
  };

  const updateVignetteAd = (patch: Partial<MonetagVignetteConfig>) => {
    setSettings(prev => ({
      ...prev,
      vignetteAd: normalizeVignetteAdConfig({
        ...normalizeVignetteAdConfig(prev.vignetteAd),
        ...patch
      })
    }));
  };

  const updateInPagePushAd = (patch: Partial<MonetagInPagePushConfig>) => {
    setSettings(prev => ({
      ...prev,
      inPagePushAd: normalizeInPagePushAdConfig({
        ...normalizeInPagePushAdConfig(prev.inPagePushAd),
        ...patch
      })
    }));
  };

  const updateInArticleSlot = (
    slotKey: InArticleAdSlotKey,
    patch: Partial<InArticleAdSlotConfig>
  ) => {
    setSettings(prev => {
      const normalized = normalizeInArticleAdsSettings(prev.inArticleAds, false);
      const updatedSlot = normalizeInArticleAdSlotConfig(
        slotKey,
        {
          ...normalized[slotKey],
          ...patch
        },
        false
      );
      return {
        ...prev,
        inArticleAds: {
          ...normalized,
          [slotKey]: updatedSlot
        }
      };
    });
  };

  const updateHomepageInFeedSlot = (
    slotKey: HomepageInFeedAdSlotKey,
    patch: Partial<HomepageInFeedAdSlotConfig>
  ) => {
    setSettings(prev => {
      const normalized = normalizeHomepageInFeedAdsSettings(prev.homepageInFeedAds, false);
      const updatedSlot = normalizeHomepageInFeedAdSlotConfig(
        slotKey,
        {
          ...normalized[slotKey],
          ...patch
        },
        false
      );
      return {
        ...prev,
        homepageInFeedAds: {
          ...normalized,
          [slotKey]: updatedSlot
        }
      };
    });
  };

  const updateGlobalScripts = (patch: Partial<GlobalAdScriptConfig>) => {
    setSettings(prev => {
      const normalized = normalizeGlobalAdScriptConfig(prev.globalScripts, false);
      return {
        ...prev,
        globalScripts: normalizeGlobalAdScriptConfig(
          {
            ...normalized,
            ...patch
          },
          false
        )
      };
    });
  };

  const persistCurrentSettingsSection = async (successLabel: string) => {
    if (!user) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payloadToSave: AdsSettings = {
        ...settings,
        belowHeaderAd: {
          ...DEFAULT_ADS_SETTINGS.belowHeaderAd!,
          enabled: false,
          code: ''
        },
        aboveFooterAd: normalizeStandardAdConfigForSave(settings.aboveFooterAd),
        vignetteAd: normalizeVignetteAdConfig(settings.vignetteAd),
        inPagePushAd: normalizeInPagePushAdConfig(settings.inPagePushAd),
        inArticleAds: normalizeInArticleAdsSettings(settings.inArticleAds),
        homepageInFeedAds: normalizeHomepageInFeedAdsSettings(settings.homepageInFeedAds),
        globalScripts: normalizeGlobalAdScriptConfig(settings.globalScripts),
        floatingVideoAd: normalizeFloatingVideoAdConfig(settings.floatingVideoAd),
        displaySettings: normalizeAdsDisplaySettings(settings.displaySettings)
      };
      const result = await saveAdsSettings(payloadToSave, user.uid);
      if (result.success) {
        setSettings(payloadToSave);
        const msg = {
          type: 'success' as const,
          text: result.isLocalFallback
            ? `${successLabel} saved locally (syncs once Firestore rules are active).`
            : `${successLabel} saved successfully across all devices!`
        };
        setStatusMessage(msg);
        if (successLabel === 'HilltopAds MultiTag Video Slider') {
          setFloatingVideoStatus(msg);
          setTimeout(() => setFloatingVideoStatus(null), 5000);
        }
      } else {
        const errMsg = {
          type: 'error' as const,
          text: result.error || `Failed to save ${successLabel}.`
        };
        setStatusMessage(errMsg);
        if (successLabel === 'HilltopAds MultiTag Video Slider') {
          setFloatingVideoStatus(errMsg);
        }
      }
    } catch (err: any) {
      const errMsg = {
        type: 'error' as const,
        text: err?.message || `Unexpected error saving ${successLabel}.`
      };
      setStatusMessage(errMsg);
      if (successLabel === 'HilltopAds MultiTag Video Slider') {
        setFloatingVideoStatus(errMsg);
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const displaySettings: AdsDisplaySettings = normalizeAdsDisplaySettings(settings.displaySettings);

  const updateDisplaySetting = <K extends keyof AdsDisplaySettings>(
    key: K,
    value: AdsDisplaySettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      displaySettings: normalizeAdsDisplaySettings({
        ...normalizeAdsDisplaySettings(prev.displaySettings),
        [key]: value
      })
    }));
  };

  const handleResetDisplayDefaults = () => {
    setSettings(prev => ({
      ...prev,
      displaySettings: { ...DEFAULT_ADS_DISPLAY_SETTINGS }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mr-2" />
        <span className="text-sm font-semibold text-slate-700">Loading Ads Settings...</span>
      </div>
    );
  }

  const previewSampleBanner =
    (settings.aboveFooterAd.type === 'banner' && settings.aboveFooterAd.imageUrl) || '';

  const previewFrameWidth =
    previewViewport === 'mobile' ? 340 : previewViewport === 'tablet' ? 680 : 960;

  const vignetteReady = Boolean(
    currentVignetteAd.enabled &&
      currentVignetteAd.scriptUrl &&
      isSafeAdScriptUrl(currentVignetteAd.scriptUrl) &&
      (currentVignetteAd.desktopEnabled || currentVignetteAd.mobileEnabled)
  );
  const vignetteNeedsConfig = currentVignetteAd.enabled && !vignetteReady;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 sm:p-8 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              <Megaphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Monetization & Partner Banners</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Ads & Sponsorship Management
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Manage HilltopAds MultiTag Video Slider, Monetag Vignette Banner overlays, In-Page Push, In-Article Sponsored Direct Link cards, Homepage In-Feed slots, and Above Website Footer banners cleanly without any below-header clutter box.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Ads Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Ads Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' 
              : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Master Toggle Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span>Master Ads Enablement</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              settings.masterEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
            }`}>
              {settings.masterEnabled ? 'ACTIVE ON SITE' : 'DISABLED'}
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            When disabled, all ad slots on the website are completely hidden with zero layout impact. Enable this to start showing your configured banners or scripts.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSettings(prev => ({ ...prev, masterEnabled: !prev.masterEnabled }))}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-2 transition-all cursor-pointer ${
            settings.masterEnabled
              ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {settings.masterEnabled ? (
            <>
              <ToggleRight className="w-4 h-4" />
              <span>Ads are Enabled</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4" />
              <span>Ads are Disabled (Default)</span>
            </>
          )}
        </button>
      </div>

      {/* HilltopAds MultiTag Video Slider (Floating Video Advertisement) */}
      <div
        data-testid="ads-floating-video-manager"
        className="bg-white p-6 rounded-2xl border-2 border-indigo-200/80 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              <Video className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Floating Video Advertisement</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>HilltopAds MultiTag Video Slider</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  currentFloatingVideo.enabled && settings.masterEnabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentFloatingVideo.enabled
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {currentFloatingVideo.enabled && settings.masterEnabled
                  ? 'ACTIVE SITE-WIDE'
                  : currentFloatingVideo.enabled
                  ? 'ENABLED (MASTER OFF)'
                  : 'DISABLED'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
              Loads the official HilltopAds MultiTag Video Slider script asynchronously across public pages (never on <code className="font-mono">/admin</code>, never duplicated across navigation).
            </p>
          </div>

          <button
            type="button"
            onClick={() => updateFloatingVideoAd({ enabled: !currentFloatingVideo.enabled })}
            data-testid="ads-floating-video-enable-toggle"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-center shrink-0 ${
              currentFloatingVideo.enabled
                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {currentFloatingVideo.enabled ? (
              <>
                <ToggleRight className="w-4 h-4" aria-hidden="true" />
                <span>Video Slider Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" aria-hidden="true" />
                <span>Video Slider Disabled</span>
              </>
            )}
          </button>
        </div>

        {/* Bundled Popup / Popunder Restriction Disclosure */}
        <div
          data-testid="ads-floating-video-popunder-notice"
          className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-bold">
              Bundled Popup / Popunder Restriction (Disabled by Default)
            </p>
            <p className="leading-relaxed text-amber-900">
              HilltopAds MultiTag Video Slider combines two formats inside the same script tag: a bottom-right floating <strong>Video Slider</strong> and a delayed <strong>Popunder/Popup</strong> (~1-minute delay by default). HilltopAds does not provide a client-side <code className="font-mono">s.settings</code> flag or self-service switch to disable popunders independently. It remains disabled by default; to run only the Video Slider without popunders, ask your HilltopAds account manager to disable popunder on this zone or request a standalone Video Slider zone before enabling.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Placement Name
            </span>
            <p className="text-xs font-bold text-slate-900">Floating Video Advertisement</p>
          </div>

          <div className="space-y-1 md:col-span-2">
            <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Official HilltopAds Script Tag (<code className="font-mono lowercase">s.settings = {'{}'}</code>)
            </span>
            <p className="text-[11px] font-mono text-slate-700 break-all bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
              {HILLTOPADS_MULTITAG_VIDEO_SLIDER_SCRIPT_SRC}
            </p>
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-slate-500">
              Fixed HilltopAds 300×100 header banner, 300×250 article banner, and Monetag placements remain active and untouched.
            </span>

            <button
              type="button"
              onClick={() => persistCurrentSettingsSection('HilltopAds MultiTag Video Slider')}
              disabled={isSaving}
              data-testid="ads-floating-video-save"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Save Video Slider Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {floatingVideoStatus && (
          <div
            data-testid="ads-floating-video-status"
            role="status"
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-semibold ${
              floatingVideoStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {floatingVideoStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            <span>{floatingVideoStatus.text}</span>
          </div>
        )}
      </div>

      {/* Advertisement Display Settings Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Layout &amp; Sizing Controls</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              Advertisement Display Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Adjust advertisement container width, height, maximum width, and spacing without altering ad scripts or distorting banner image aspect ratios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetDisplayDefaults}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sliders & +/- Numeric Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <DisplayNumericControl
            id="ads-container-width-percent"
            label="Container Width"
            description="Percentage width of the ad slot container."
            value={displaySettings.containerWidthPercent}
            min={ADS_DISPLAY_LIMITS.containerWidthPercent.min}
            max={ADS_DISPLAY_LIMITS.containerWidthPercent.max}
            step={ADS_DISPLAY_LIMITS.containerWidthPercent.step}
            unit="%"
            onChange={(val) => updateDisplaySetting('containerWidthPercent', val)}
          />

          <DisplayNumericControl
            id="ads-max-width-px"
            label="Maximum Area Width"
            description="Caps the ad container width on wide screens."
            value={displaySettings.maxWidthPx}
            min={ADS_DISPLAY_LIMITS.maxWidthPx.min}
            max={ADS_DISPLAY_LIMITS.maxWidthPx.max}
            step={ADS_DISPLAY_LIMITS.maxWidthPx.step}
            unit="px"
            onChange={(val) => updateDisplaySetting('maxWidthPx', val)}
          />

          <DisplayNumericControl
            id="ads-container-height-px"
            label="Container Height"
            description="Max banner height & ad area vertical size."
            value={displaySettings.containerHeightPx}
            min={ADS_DISPLAY_LIMITS.containerHeightPx.min}
            max={ADS_DISPLAY_LIMITS.containerHeightPx.max}
            step={ADS_DISPLAY_LIMITS.containerHeightPx.step}
            unit="px"
            onChange={(val) => updateDisplaySetting('containerHeightPx', val)}
          />

          <DisplayNumericControl
            id="ads-margin-y-px"
            label="Vertical Margin"
            description="Top & bottom outer space around ad containers."
            value={displaySettings.marginY}
            min={ADS_DISPLAY_LIMITS.marginY.min}
            max={ADS_DISPLAY_LIMITS.marginY.max}
            step={ADS_DISPLAY_LIMITS.marginY.step}
            unit="px"
            onChange={(val) => updateDisplaySetting('marginY', val)}
          />

          <DisplayNumericControl
            id="ads-margin-x-px"
            label="Horizontal Margin"
            description="Left & right outer inset around ads."
            value={displaySettings.marginX}
            min={ADS_DISPLAY_LIMITS.marginX.min}
            max={ADS_DISPLAY_LIMITS.marginX.max}
            step={ADS_DISPLAY_LIMITS.marginX.step}
            unit="px"
            onChange={(val) => updateDisplaySetting('marginX', val)}
          />

          <DisplayNumericControl
            id="ads-padding-px"
            label="Inner Padding"
            description="Breathing room inside the advertisement card."
            value={displaySettings.paddingPx}
            min={ADS_DISPLAY_LIMITS.paddingPx.min}
            max={ADS_DISPLAY_LIMITS.paddingPx.max}
            step={ADS_DISPLAY_LIMITS.paddingPx.step}
            unit="px"
            onChange={(val) => updateDisplaySetting('paddingPx', val)}
          />
        </div>

        {(displaySettings.containerWidthPercent < 70 || displaySettings.maxWidthPx < 480) && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              <strong>Narrow Width Notice:</strong> Container Width ({displaySettings.containerWidthPercent}%) / Max Width ({displaySettings.maxWidthPx}px) is very compact. On 360px mobile screens, {displaySettings.containerWidthPercent}% renders at ~{Math.round((360 * displaySettings.containerWidthPercent) / 100)}px wide, which may squeeze landscape ad banners. Recommended defaults: 90–100% width and 728–970px max width.
            </span>
          </div>
        )}

        {/* Live Responsive Preview Before Saving */}
        <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Eye className="w-4 h-4 text-teal-700" />
              <span>Live Preview Before Saving</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal">
                ({displaySettings.containerWidthPercent}% · max {displaySettings.maxWidthPx}px · h {displaySettings.containerHeightPx}px)
              </span>
            </div>

            <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
              {(
                [
                  { id: 'desktop', label: 'Desktop', icon: Monitor },
                  { id: 'tablet', label: 'Tablet', icon: Tablet },
                  { id: 'mobile', label: 'Mobile', icon: Smartphone }
                ] as const
              ).map((vp) => {
                const Icon = vp.icon;
                const active = previewViewport === vp.id;
                return (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => setPreviewViewport(vp.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{vp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full overflow-x-auto bg-white rounded-xl border border-slate-200 p-3">
            <div
              className="mx-auto border border-dashed border-slate-300 rounded-lg bg-slate-50/70 transition-all overflow-hidden"
              style={{ width: `${previewFrameWidth}px`, maxWidth: '100%' }}
            >
              <div
                className="mx-auto max-w-full transition-all"
                style={{
                  width: `${displaySettings.containerWidthPercent}%`,
                  maxWidth: `${displaySettings.maxWidthPx}px`,
                  marginTop: `${displaySettings.marginY}px`,
                  marginBottom: `${displaySettings.marginY}px`,
                  paddingLeft: `clamp(0px, ${displaySettings.marginX}px, 12%)`,
                  paddingRight: `clamp(0px, ${displaySettings.marginX}px, 12%)`
                }}
              >
                <div
                  className="bg-slate-50 border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col"
                  style={{
                    padding: `${displaySettings.paddingPx}px`,
                    minHeight: `${displaySettings.containerHeightPx}px`
                  }}
                >
                  <div className="shrink-0 flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/70 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>{settings.aboveFooterAd.label || 'Sponsored Content'}</span>
                    </span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                      AD
                    </span>
                  </div>

                  {previewSampleBanner ? (
                    <div className="flex-1 flex justify-center items-center w-full">
                      <img
                        src={previewSampleBanner}
                        alt="Live Ad Size Preview"
                        className="w-auto max-w-full h-auto object-contain mx-auto rounded-lg"
                        style={{
                          maxHeight: `${Math.max(40, displaySettings.containerHeightPx - displaySettings.paddingPx * 2 - 28)}px`
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="flex-1 w-full rounded-lg border border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-center px-4 py-3 text-slate-500"
                      style={{
                        minHeight: `${Math.max(44, displaySettings.containerHeightPx - displaySettings.paddingPx * 2 - 34)}px`
                      }}
                    >
                      <span className="text-xs font-bold text-slate-700">
                        Above-Footer Ad Preview ({previewViewport})
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        Width {displaySettings.containerWidthPercent}% · Max {displaySettings.maxWidthPx}px · Height {displaySettings.containerHeightPx}px · Aspect Ratio Preserved
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placement 1: Dedicated Monetag Vignette Banner (Site-Wide Overlay) */}
      <div
        data-testid="ads-vignette-manager"
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Monetag Vignette Banner Overlay Integration</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>1. Monetag Vignette Banner (Site-Wide Overlay)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  vignetteReady
                    ? 'bg-emerald-100 text-emerald-800'
                    : vignetteNeedsConfig
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {vignetteReady
                  ? 'ACTIVE SITE-WIDE'
                  : vignetteNeedsConfig
                  ? 'ENABLED · NEEDS SCRIPT URL'
                  : 'DISABLED'}
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">
              Runs Monetag Vignette Banner cleanly once per session across public SPA navigation with native frequency capping and dismissal. Never boxed inside the header area and never executed on <code className="font-mono">/admin</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => updateVignetteAd({ enabled: !currentVignetteAd.enabled })}
            data-testid="ads-vignette-enable-toggle"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-center shrink-0 ${
              currentVignetteAd.enabled
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {currentVignetteAd.enabled ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Vignette Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Vignette Disabled</span>
              </>
            )}
          </button>
        </div>

        {vignetteNeedsConfig && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Vignette Banner is enabled, but requires a valid HTTPS Vignette script URL (e.g. <code className="font-mono">https://n6wxm.com/vignette.min.js</code>) before activating on public pages.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="space-y-1.5">
            <label htmlFor="ads-vignette-zone" className="block text-xs font-bold text-slate-700">
              Monetag Vignette Zone ID
            </label>
            <input
              id="ads-vignette-zone"
              data-testid="ads-vignette-zone-input"
              type="text"
              inputMode="numeric"
              value={currentVignetteAd.zoneId}
              onChange={(e) =>
                updateVignetteAd({ zoneId: e.target.value.replace(/\D/g, '').slice(0, 20) })
              }
              placeholder="e.g. 12322670"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="ads-vignette-url" className="block text-xs font-bold text-slate-700">
              Vignette Script URL (HTTPS)
            </label>
            <input
              id="ads-vignette-url"
              data-testid="ads-vignette-script-input"
              type="url"
              value={currentVignetteAd.scriptUrl}
              onChange={(e) => updateVignetteAd({ scriptUrl: e.target.value })}
              placeholder="https://n6wxm.com/vignette.min.js"
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentVignetteAd.desktopEnabled}
                  onChange={(e) => updateVignetteAd({ desktopEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <Monitor className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Desktop</span>
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentVignetteAd.mobileEnabled}
                  onChange={(e) => updateVignetteAd({ mobileEnabled: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <Smartphone className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Mobile</span>
              </label>

              <span className="text-[11px] text-slate-500">
                {formatDeviceVisibilitySummary(
                  currentVignetteAd.mobileEnabled,
                  currentVignetteAd.desktopEnabled
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => persistCurrentSettingsSection('Monetag Vignette Banner')}
              disabled={isSaving}
              data-testid="ads-vignette-save"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Save Vignette Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Placement 2: Above Footer (Below Post Ads) */}
      <AdPlacementCard
        placementTitle="2. Above Website Footer"
        placementDescription="Below Post Ads position: displayed immediately above the bottom website footer when a custom banner image or custom HTML/script is configured (collapses cleanly when empty)."
        config={settings.aboveFooterAd}
        onChange={updateAboveFooter}
      />

      {/* Placements 3, 4, 5 & In-Page Push & Global Site-Wide Scripts */}
      <InArticleAdManagerSection
        inArticleAds={currentInArticleAds}
        globalScripts={currentGlobalScripts}
        inPagePushAd={currentInPagePushAd}
        isSaving={isSaving}
        onUpdateSlot={updateInArticleSlot}
        onSaveSlot={(slotKey) =>
          persistCurrentSettingsSection(
            slotKey === 'slot1'
              ? 'In-Article Ad Slot 1'
              : slotKey === 'slot2'
              ? 'In-Article Ad Slot 2'
              : 'In-Article Ad Slot 3'
          )
        }
        onUpdateInPagePush={updateInPagePushAd}
        onSaveInPagePush={() => persistCurrentSettingsSection('Monetag In-Page Push')}
        onUpdateGlobalScripts={updateGlobalScripts}
        onSaveGlobalScripts={() => persistCurrentSettingsSection('Global Site-Wide Scripts')}
      />

      {/* Placements 6, 7, 8: Homepage In-Feed Ads */}
      <HomepageInFeedAdManagerSection
        homepageInFeedAds={currentHomepageInFeedAds}
        isSaving={isSaving}
        onUpdateSlot={updateHomepageInFeedSlot}
        onSaveSlot={(slotKey) =>
          persistCurrentSettingsSection(
            slotKey === 'slot1'
              ? 'Homepage In-Feed Ad Slot 1'
              : slotKey === 'slot2'
              ? 'Homepage In-Feed Ad Slot 2'
              : 'Homepage In-Feed Ad Slot 3'
          )
        }
      />

      {/* Security & Sandbox Info */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3 text-xs text-slate-600">
        <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Security & Sandboxing: </span>
          <span>
            Ad configurations can only be modified by the authorized administrator ({user?.email || 'twizerefelix90@gmail.com'}). Scripts execute within dedicated containers and are never exposed to public write access.
          </span>
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual placement card
interface AdPlacementCardProps {
  placementTitle: string;
  placementDescription: string;
  config: AdSlotConfig;
  onChange: (patch: Partial<AdSlotConfig>) => void;
}

const AdPlacementCard: React.FC<AdPlacementCardProps> = ({
  placementTitle,
  placementDescription,
  config,
  onChange
}) => {
  const hasBannerReady =
    config.type === 'banner' && isSafeAdAssetOrClickUrl(config.imageUrl);
  const bareDirectLink = useMemo(
    () => extractBareSafeDirectLinkUrl(config.code || ''),
    [config.code]
  );
  const hasCodeReady =
    config.type === 'code' && !bareDirectLink && hasRenderableAdCode(config.code);
  const isReadyToRender = config.enabled && (hasBannerReady || hasCodeReady);
  const needsConfiguration = config.enabled && !isReadyToRender;
  const codeAnalysis = useMemo(
    () => analyzeAdCodeSnippet(config.code || ''),
    [config.code]
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      {/* Placement Header & Enable Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h4 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            <span>{placementTitle}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                isReadyToRender
                  ? 'bg-emerald-100 text-emerald-800'
                  : needsConfiguration
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isReadyToRender
                ? hasBannerReady
                  ? 'ACTIVE · BANNER READY'
                  : 'ACTIVE · CODE READY'
                : needsConfiguration
                ? config.type === 'banner'
                  ? 'ENABLED · NEEDS BANNER URL'
                  : 'ENABLED · NEEDS AD CODE'
                : 'DISABLED'}
            </span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{placementDescription}</p>
        </div>

        <button
          type="button"
          onClick={() => onChange({ enabled: !config.enabled })}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-center ${
            config.enabled
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {config.enabled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Placement Enabled</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-3.5 h-3.5" />
              <span>Placement Disabled</span>
            </>
          )}
        </button>
      </div>

      {needsConfiguration && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            This placement is switched <strong>ON</strong>, but no{' '}
            {config.type === 'banner' ? 'valid HTTPS banner image URL' : 'advertising script/HTML code'}{' '}
            is currently entered. Public pages hide empty containers until you add your code or banner URL and click <strong>Save Ads Settings</strong>.
          </span>
        </div>
      )}

      {/* Ad Format Selector */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Ad Format Type:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => onChange({ type: 'banner' })}
            className={`p-3 rounded-xl border text-xs font-bold inline-flex items-center space-x-2 transition-all cursor-pointer ${
              config.type === 'banner'
                ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-2xs ring-1 ring-teal-600'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-teal-600" />
            <span>Image Banner (Clickable Link)</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ type: 'code' })}
            className={`p-3 rounded-xl border text-xs font-bold inline-flex items-center space-x-2 transition-all cursor-pointer ${
              config.type === 'code'
                ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-2xs ring-1 ring-teal-600'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Code className="w-4 h-4 text-teal-600" />
            <span>Custom Script / AdSense / HTML</span>
          </button>
        </div>
      </div>

      {/* Format 1 Fields: Banner */}
      {config.type === 'banner' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700">
              Banner Image URL (HTTPS):
            </label>
            <input
              type="url"
              value={config.imageUrl || ''}
              onChange={(e) => onChange({ imageUrl: e.target.value })}
              placeholder="https://example.com/banner-ad-728x90.jpg"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Destination Click URL:
            </label>
            <input
              type="url"
              value={config.linkUrl || ''}
              onChange={(e) => onChange({ linkUrl: e.target.value })}
              placeholder="https://partner-website.com"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Ad Label / Alt Text:
            </label>
            <input
              type="text"
              value={config.altText || ''}
              onChange={(e) => onChange({ altText: e.target.value })}
              placeholder="Sponsor Name / Banner Alt Text"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Banner Preview */}
          {config.imageUrl && (
            <div className="sm:col-span-2 pt-2 border-t border-slate-200">
              <span className="block text-[11px] font-semibold text-slate-500 mb-1">Banner Preview:</span>
              <div className="p-2 bg-white rounded-lg border border-slate-200 flex justify-center">
                <img 
                  src={config.imageUrl} 
                  alt={config.altText || 'Preview'} 
                  className="max-h-28 object-contain rounded"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Format 2 Fields: Custom Script / Code */}
      {config.type === 'code' && (
        <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700">
              Paste Ad Embed Code or HTML:
            </label>
            <span className="text-[11px] text-slate-400 font-mono">HTML / JS / Monetag / AdSense</span>
          </div>
          <textarea
            rows={5}
            value={config.code || ''}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder={`<!-- Paste Monetag / AdSense / Ad Network HTML & Script here -->\n<script async src="https://..."></script>`}
            className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-teal-300 focus:ring-2 focus:ring-teal-500"
          />
          {bareDirectLink && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Bare Direct Link URLs (<code className="font-mono">{bareDirectLink}</code>) are hidden here so raw URLs do not appear as text. Use HTML/JS banner code here, or use <strong>In-Article Direct Link Ad Cards</strong> in Slots 1–3.
              </span>
            </div>
          )}
          {codeAnalysis.warnings.length > 0 && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{codeAnalysis.warnings[0]}</span>
            </div>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Note: Scripts will be executed safely in the dedicated ad slot container for website visitors when ads are enabled.
          </p>
        </div>
      )}
    </div>
  );
};

function normalizeStandardAdConfigForSave(config: AdSlotConfig): AdSlotConfig {
  return normalizeStandardAdSlotConfig(config, DEFAULT_ADS_SETTINGS.aboveFooterAd, true);
}

interface DisplayNumericControlProps {
  id: string;
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (nextValue: number) => void;
}

const DisplayNumericControl: React.FC<DisplayNumericControlProps> = ({
  id,
  label,
  description,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange
}) => {
  const [draftInput, setDraftInput] = React.useState<string>(String(value));
  const [isEditingNumber, setIsEditingNumber] = React.useState(false);

  React.useEffect(() => {
    if (!isEditingNumber) {
      setDraftInput(String(value));
    }
  }, [value, isEditingNumber]);

  const clamp = (raw: number) => Math.min(max, Math.max(min, Math.round(raw)));

  const handleDecrement = () => {
    const next = clamp(value - step);
    setDraftInput(String(next));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = clamp(value + step);
    setDraftInput(String(next));
    onChange(next);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraftInput(raw);
    if (raw.trim() === '' || raw.trim() === '-') {
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    if (parsed >= min && parsed <= max) {
      onChange(clamp(parsed));
    }
  };

  const commitDraftInput = () => {
    setIsEditingNumber(false);
    if (draftInput.trim() === '' || draftInput.trim() === '-') {
      setDraftInput(String(value));
      return;
    }
    const parsed = Number(draftInput);
    if (!Number.isFinite(parsed)) {
      setDraftInput(String(value));
      return;
    }
    const next = clamp(parsed);
    setDraftInput(String(next));
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <label htmlFor={id} className="block text-xs font-bold text-slate-900">
            {label}
          </label>
          {description && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        <span className="text-xs font-mono font-bold text-slate-700 tabular-nums shrink-0">
          {value}
          {unit}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const next = clamp(Number(e.target.value));
            setDraftInput(String(next));
            onChange(next);
          }}
          className="flex-1 min-w-0 accent-teal-700 cursor-pointer h-2"
        />

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-teal-600"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shrink-0">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={isEditingNumber ? draftInput : String(value)}
            onFocus={() => {
              setIsEditingNumber(true);
              setDraftInput(String(value));
            }}
            onChange={handleNumberChange}
            onBlur={commitDraftInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitDraftInput();
              }
            }}
            aria-label={`${label} numeric value (${unit})`}
            className="w-16 px-2 py-1.5 text-xs font-mono font-bold text-slate-900 tabular-nums text-right focus:outline-none"
          />
          <span className="px-1.5 py-1.5 text-[11px] font-mono text-slate-500 bg-slate-100 border-l border-slate-200 select-none">
            {unit}
          </span>
        </div>
      </div>
    </div>
  );
};
