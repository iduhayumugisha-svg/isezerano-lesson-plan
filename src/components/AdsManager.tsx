import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
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
  Film,
  Link2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import {
  AdSlotConfig,
  AdsSettings,
  DEFAULT_ADS_SETTINGS,
  DEFAULT_TOP_VIDEO_AD_CONFIG,
  GlobalAdScriptConfig,
  HomepageInFeedAdSlotConfig,
  HomepageInFeedAdSlotKey,
  InArticleAdSlotConfig,
  InArticleAdSlotKey,
  TopVideoAdConfig,
  TopVideoAdDisplaySettings
} from '../types/platform';
import { getAdsSettings, saveAdsSettings } from '../services/siteSettingsService';
import {
  createTopVideoAdConfigFromUrl,
  normalizeTopVideoAdConfig,
  parseVimeoVideoUrl
} from '../services/shopVideoService';
import { useAuth } from '../context/AuthContext';
import { DisplayNumericControl } from './DisplayNumericControl';
import { InArticleAdManagerSection } from './InArticleAdManagerSection';
import { HomepageInFeedAdManagerSection } from './HomepageInFeedAdManagerSection';
import {
  ADS_DISPLAY_LIMITS,
  AdsDisplaySettings,
  DEFAULT_ADS_DISPLAY_SETTINGS,
  DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS,
  TOP_VIDEO_AD_DISPLAY_LIMITS,
  clampDisplayNumber,
  normalizeAdsDisplaySettings,
  normalizeTopVideoAdDisplaySettings,
  resolveTopVideoBannerHeaderSpacing
} from '../utils/displaySettingsUtils';
import {
  analyzeAdCodeSnippet,
  hasRenderableAdCode,
  isSafeAdAssetOrClickUrl,
  normalizeGlobalAdScriptConfig,
  normalizeHomepageInFeedAdSlotConfig,
  normalizeHomepageInFeedAdsSettings,
  normalizeInArticleAdSlotConfig,
  normalizeInArticleAdsSettings
} from '../utils/inArticleAdUtils';

const LazyShopVimeoPlayer = lazy(() =>
  import('./ShopVimeoPlayer').then((m) => ({ default: m.ShopVimeoPlayer }))
);

export const AdsManager: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [topVideoUrlInput, setTopVideoUrlInput] = useState('');
  const [topVideoTitleInput, setTopVideoTitleInput] = useState('');
  const [topVideoLabelInput, setTopVideoLabelInput] = useState('Sponsored Video');
  const [confirmRemoveTopVideo, setConfirmRemoveTopVideo] = useState(false);
  const [topVideoFeedback, setTopVideoFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getAdsSettings(true);
      const normalizedTopVideo = normalizeTopVideoAdConfig(data.aboveHeaderVideoAd);
      setSettings({
        ...data,
        inArticleAds: normalizeInArticleAdsSettings(data.inArticleAds),
        homepageInFeedAds: normalizeHomepageInFeedAdsSettings(data.homepageInFeedAds),
        globalScripts: normalizeGlobalAdScriptConfig(data.globalScripts),
        aboveHeaderVideoAd: normalizedTopVideo,
        displaySettings: normalizeAdsDisplaySettings(data.displaySettings)
      });
      setTopVideoUrlInput(normalizedTopVideo.vimeoUrl || '');
      setTopVideoTitleInput(normalizedTopVideo.title || '');
      setTopVideoLabelInput(normalizedTopVideo.label || 'Sponsored Video');
    } catch (err) {
      console.error('Error loading ads settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const parsedTopVideoUrl = useMemo(() => {
    if (!topVideoUrlInput.trim()) return null;
    return parseVimeoVideoUrl(topVideoUrlInput);
  }, [topVideoUrlInput]);

  const currentTopVideo: TopVideoAdConfig = normalizeTopVideoAdConfig(settings.aboveHeaderVideoAd);
  const currentTopVideoDisplay: TopVideoAdDisplaySettings = normalizeTopVideoAdDisplaySettings(
    currentTopVideo.displaySettings
  );
  const previewHeaderSpacing = resolveTopVideoBannerHeaderSpacing(
    currentTopVideoDisplay.bannerHeightPx
  );

  const updateTopVideoDisplay = (
    key: keyof TopVideoAdDisplaySettings,
    value: number | boolean
  ) => {
    setSettings((prev) => {
      const existingTop = normalizeTopVideoAdConfig(prev.aboveHeaderVideoAd);
      const prevDisplay = normalizeTopVideoAdDisplaySettings(existingTop.displaySettings);
      let nextRaw: TopVideoAdDisplaySettings = { ...prevDisplay };

      if (key === 'preserveAspectRatio') {
        const locked = Boolean(value);
        nextRaw.preserveAspectRatio = locked;
        if (locked) {
          nextRaw.videoHeightPx = clampDisplayNumber(
            Math.round((prevDisplay.videoWidthPx * 9) / 16),
            prevDisplay.videoHeightPx,
            TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.min,
            TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.max
          );
        }
      } else if (key === 'videoWidthPx') {
        const widthPx = clampDisplayNumber(
          value,
          prevDisplay.videoWidthPx,
          TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.min,
          TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.max
        );
        nextRaw.videoWidthPx = widthPx;
        if (prevDisplay.preserveAspectRatio) {
          nextRaw.videoHeightPx = clampDisplayNumber(
            Math.round((widthPx * 9) / 16),
            prevDisplay.videoHeightPx,
            TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.min,
            TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.max
          );
        }
      } else if (key === 'videoHeightPx') {
        const heightPx = clampDisplayNumber(
          value,
          prevDisplay.videoHeightPx,
          TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.min,
          TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.max
        );
        nextRaw.videoHeightPx = heightPx;
        if (prevDisplay.preserveAspectRatio) {
          nextRaw.videoWidthPx = clampDisplayNumber(
            Math.round((heightPx * 16) / 9),
            prevDisplay.videoWidthPx,
            TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.min,
            TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.max
          );
        }
      } else if (key === 'bannerWidthPx') {
        nextRaw.bannerWidthPx = clampDisplayNumber(
          value,
          prevDisplay.bannerWidthPx,
          TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.min,
          TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.max
        );
      } else if (key === 'bannerHeightPx') {
        nextRaw.bannerHeightPx = clampDisplayNumber(
          value,
          prevDisplay.bannerHeightPx,
          TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.min,
          TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.max
        );
      }

      const normalizedNextDisplay = normalizeTopVideoAdDisplaySettings(nextRaw);
      return {
        ...prev,
        aboveHeaderVideoAd: {
          ...existingTop,
          displaySettings: normalizedNextDisplay
        }
      };
    });
  };

  const handleResetTopVideoDisplay = () => {
    setSettings((prev) => {
      const existingTop = normalizeTopVideoAdConfig(prev.aboveHeaderVideoAd);
      return {
        ...prev,
        aboveHeaderVideoAd: {
          ...existingTop,
          displaySettings: { ...DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS }
        }
      };
    });
  };

  const previewTopVideo: TopVideoAdConfig | null = useMemo(() => {
    if (parsedTopVideoUrl?.valid && parsedTopVideoUrl.videoId && parsedTopVideoUrl.playerEmbedUrl) {
      return {
        enabled: currentTopVideo.enabled,
        vimeoUrl: parsedTopVideoUrl.canonicalUrl || topVideoUrlInput.trim(),
        videoId: parsedTopVideoUrl.videoId,
        playerEmbedUrl: parsedTopVideoUrl.playerEmbedUrl,
        title: topVideoTitleInput.trim(),
        label: topVideoLabelInput.trim() || 'Sponsored Video',
        displaySettings: currentTopVideoDisplay
      };
    }
    if (currentTopVideo.videoId && currentTopVideo.playerEmbedUrl) {
      return {
        ...currentTopVideo,
        displaySettings: currentTopVideoDisplay
      };
    }
    return null;
  }, [
    parsedTopVideoUrl,
    topVideoUrlInput,
    topVideoTitleInput,
    topVideoLabelInput,
    currentTopVideo,
    currentTopVideoDisplay
  ]);

  const persistTopVideoAd = async (
    nextTopVideo: TopVideoAdConfig,
    successText: string
  ) => {
    if (!user) return;
    setIsSaving(true);
    setTopVideoFeedback(null);
    setStatusMessage(null);
    try {
      const normalizedTop = normalizeTopVideoAdConfig({
        ...nextTopVideo,
        displaySettings: normalizeTopVideoAdDisplaySettings(
          nextTopVideo.displaySettings || currentTopVideoDisplay
        )
      });
      const payloadToSave: AdsSettings = {
        ...settings,
        inArticleAds: normalizeInArticleAdsSettings(settings.inArticleAds),
        homepageInFeedAds: normalizeHomepageInFeedAdsSettings(settings.homepageInFeedAds),
        globalScripts: normalizeGlobalAdScriptConfig(settings.globalScripts),
        aboveHeaderVideoAd: normalizedTop,
        displaySettings: normalizeAdsDisplaySettings(settings.displaySettings)
      };
      const result = await saveAdsSettings(payloadToSave, user.uid);
      if (result.success) {
        setSettings(payloadToSave);
        setTopVideoFeedback({
          type: 'success',
          text: result.isLocalFallback
            ? `${successText} (Saved locally; syncs across devices once Firestore rules are active).`
            : successText
        });
      } else {
        setTopVideoFeedback({
          type: 'error',
          text: result.error || 'Failed to save top-of-site video advertisement.'
        });
      }
    } catch (err: any) {
      setTopVideoFeedback({
        type: 'error',
        text: err?.message || 'Unexpected error saving video advertisement.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTopVideoAd = async () => {
    setTopVideoFeedback(null);
    setConfirmRemoveTopVideo(false);

    const built = createTopVideoAdConfigFromUrl({
      url: topVideoUrlInput,
      enabled: currentTopVideo.videoId ? currentTopVideo.enabled : true,
      title: topVideoTitleInput,
      label: topVideoLabelInput,
      displaySettings: currentTopVideoDisplay
    });

    if (!built.success || !built.videoAd) {
      setTopVideoFeedback({
        type: 'error',
        text: built.error || 'Please paste a valid Vimeo Video URL.'
      });
      return;
    }

    setTopVideoUrlInput(built.videoAd.vimeoUrl);
    await persistTopVideoAd(
      built.videoAd,
      built.videoAd.enabled
        ? `Top-of-site Vimeo video ad (ID: ${built.videoAd.videoId}, ${currentTopVideoDisplay.videoWidthPx}×${currentTopVideoDisplay.videoHeightPx}px) saved and enabled above the Header.`
        : `Top-of-site Vimeo video ad (ID: ${built.videoAd.videoId}) saved (currently disabled).`
    );
  };

  const handleToggleTopVideoEnabled = async () => {
    setTopVideoFeedback(null);
    setConfirmRemoveTopVideo(false);
    const nextEnabled = !currentTopVideo.enabled;

    if (nextEnabled) {
      const urlSource = topVideoUrlInput.trim() || currentTopVideo.vimeoUrl;
      const built = createTopVideoAdConfigFromUrl({
        url: urlSource,
        enabled: true,
        title: topVideoTitleInput,
        label: topVideoLabelInput,
        displaySettings: currentTopVideoDisplay
      });
      if (!built.success || !built.videoAd) {
        setTopVideoFeedback({
          type: 'error',
          text: built.error || 'Paste a valid Vimeo Video URL before enabling the top video ad.'
        });
        return;
      }
      setTopVideoUrlInput(built.videoAd.vimeoUrl);
      await persistTopVideoAd(
        built.videoAd,
        `Top-of-site video ad enabled above the Header (ID: ${built.videoAd.videoId}).`
      );
      return;
    }

    const updated: TopVideoAdConfig = {
      ...currentTopVideo,
      enabled: false,
      title: topVideoTitleInput.trim(),
      label: topVideoLabelInput.trim() || 'Sponsored Video',
      displaySettings: currentTopVideoDisplay,
      updatedAt: new Date().toISOString()
    };
    await persistTopVideoAd(updated, 'Top-of-site video advertisement disabled.');
  };

  const handleRemoveTopVideoAd = async () => {
    setConfirmRemoveTopVideo(false);
    setTopVideoUrlInput('');
    setTopVideoTitleInput('');
    setTopVideoLabelInput('Sponsored Video');
    await persistTopVideoAd(
      { ...DEFAULT_TOP_VIDEO_AD_CONFIG, updatedAt: new Date().toISOString() },
      'Top-of-site video advertisement removed.'
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setStatusMessage(null);
    try {
      let resolvedTopVideo = normalizeTopVideoAdConfig({
        ...settings.aboveHeaderVideoAd,
        displaySettings: currentTopVideoDisplay
      });
      if (topVideoUrlInput.trim()) {
        const builtTop = createTopVideoAdConfigFromUrl({
          url: topVideoUrlInput,
          enabled: resolvedTopVideo.enabled,
          title: topVideoTitleInput,
          label: topVideoLabelInput,
          displaySettings: currentTopVideoDisplay
        });
        if (builtTop.success && builtTop.videoAd) {
          resolvedTopVideo = builtTop.videoAd;
        }
      }

      const payloadToSave: AdsSettings = {
        ...settings,
        inArticleAds: normalizeInArticleAdsSettings(settings.inArticleAds),
        homepageInFeedAds: normalizeHomepageInFeedAdsSettings(settings.homepageInFeedAds),
        globalScripts: normalizeGlobalAdScriptConfig(settings.globalScripts),
        aboveHeaderVideoAd: resolvedTopVideo,
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

  const updateBelowHeader = (patch: Partial<AdSlotConfig>) => {
    setSettings(prev => ({
      ...prev,
      belowHeaderAd: { ...prev.belowHeaderAd, ...patch }
    }));
  };

  const updateAboveFooter = (patch: Partial<AdSlotConfig>) => {
    setSettings(prev => ({
      ...prev,
      aboveFooterAd: { ...prev.aboveFooterAd, ...patch }
    }));
  };

  const currentInArticleAds = normalizeInArticleAdsSettings(settings.inArticleAds, false);
  const currentHomepageInFeedAds = normalizeHomepageInFeedAdsSettings(
    settings.homepageInFeedAds,
    false
  );
  const currentGlobalScripts = normalizeGlobalAdScriptConfig(settings.globalScripts, false);

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
        inArticleAds: normalizeInArticleAdsSettings(settings.inArticleAds),
        homepageInFeedAds: normalizeHomepageInFeedAdsSettings(settings.homepageInFeedAds),
        globalScripts: normalizeGlobalAdScriptConfig(settings.globalScripts),
        aboveHeaderVideoAd: normalizeTopVideoAdConfig({
          ...settings.aboveHeaderVideoAd,
          displaySettings: currentTopVideoDisplay
        }),
        displaySettings: normalizeAdsDisplaySettings(settings.displaySettings)
      };
      const result = await saveAdsSettings(payloadToSave, user.uid);
      if (result.success) {
        setSettings(payloadToSave);
        setStatusMessage({
          type: 'success',
          text: result.isLocalFallback
            ? `${successLabel} saved locally (syncs once Firestore rules are active).`
            : `${successLabel} saved successfully across all devices!`
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || `Failed to save ${successLabel}.`
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || `Unexpected error saving ${successLabel}.`
      });
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
    (settings.belowHeaderAd.type === 'banner' && settings.belowHeaderAd.imageUrl) ||
    (settings.aboveFooterAd.type === 'banner' && settings.aboveFooterAd.imageUrl) ||
    '';

  const previewFrameWidth =
    previewViewport === 'mobile' ? 340 : previewViewport === 'tablet' ? 680 : 960;

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
              Configure advertisements and sponsorship placements directly below the website header and above the footer. Supports Google AdSense scripts, ad network embeds, and direct graphic banners. Ads remain completely disabled by default until turned on.
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

      {/* Site-Wide Vimeo Video Advertisement (Above Header) */}
      <div
        data-testid="ads-top-video-manager"
        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              <Film className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Site-Wide Above Header Placement</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Top-of-Site Vimeo Video Advertisement (Above Header)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  currentTopVideo.enabled && currentTopVideo.videoId
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {currentTopVideo.enabled && currentTopVideo.videoId ? 'ACTIVE ABOVE HEADER' : 'DISABLED'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Displayed at the very top of every public page above the Website Header using the official Vimeo player. Leaves all header, in-article, and footer ad slots unchanged.
            </p>
          </div>

          <button
            type="button"
            onClick={handleToggleTopVideoEnabled}
            disabled={isSaving}
            data-testid="ads-top-video-enable-toggle"
            className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-center disabled:opacity-50 ${
              currentTopVideo.enabled
                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-500'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {currentTopVideo.enabled ? (
              <>
                <ToggleRight className="w-4 h-4" aria-hidden="true" />
                <span>Video Ad Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" aria-hidden="true" />
                <span>Video Ad Disabled</span>
              </>
            )}
          </button>
        </div>

        {topVideoFeedback && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-semibold ${
              topVideoFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {topVideoFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
            )}
            <span>{topVideoFeedback.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="md:col-span-6 space-y-1.5">
            <label
              htmlFor="ads-top-video-url"
              className="block text-xs font-bold text-slate-800"
            >
              Vimeo Video URL
            </label>
            <div className="relative">
              <Link2
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="ads-top-video-url"
                data-testid="ads-top-video-url-input"
                type="url"
                value={topVideoUrlInput}
                onChange={(e) => {
                  setTopVideoUrlInput(e.target.value);
                  if (topVideoFeedback?.type === 'error') setTopVideoFeedback(null);
                }}
                disabled={isSaving}
                placeholder="https://vimeo.com/1248666228"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
              />
            </div>
            {parsedTopVideoUrl && (
              <p
                data-testid="ads-top-video-url-status"
                className={`text-[11px] font-semibold ${
                  parsedTopVideoUrl.valid ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {parsedTopVideoUrl.valid
                  ? `Valid Vimeo link — Extracted Video ID: ${parsedTopVideoUrl.videoId}`
                  : parsedTopVideoUrl.error}
              </p>
            )}
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label
              htmlFor="ads-top-video-title"
              className="block text-xs font-bold text-slate-800"
            >
              Video Title (Optional)
            </label>
            <input
              id="ads-top-video-title"
              data-testid="ads-top-video-title-input"
              type="text"
              maxLength={120}
              value={topVideoTitleInput}
              onChange={(e) => setTopVideoTitleInput(e.target.value)}
              disabled={isSaving}
              placeholder="e.g. Featured Sponsor"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label
              htmlFor="ads-top-video-label"
              className="block text-xs font-bold text-slate-800"
            >
              Badge Label
            </label>
            <input
              id="ads-top-video-label"
              data-testid="ads-top-video-label-input"
              type="text"
              maxLength={40}
              value={topVideoLabelInput}
              onChange={(e) => setTopVideoLabelInput(e.target.value)}
              disabled={isSaving}
              placeholder="Sponsored Video"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-500">
              Attempts muted autoplay on page load with Play/Pause, Sound On/Off, Replay, and Speed controls.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentTopVideo.videoId && (
                !confirmRemoveTopVideo ? (
                  <button
                    type="button"
                    onClick={() => setConfirmRemoveTopVideo(true)}
                    disabled={isSaving}
                    data-testid="ads-top-video-remove-btn"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Remove Video Ad</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-xl px-2 py-1">
                    <button
                      type="button"
                      onClick={handleRemoveTopVideoAd}
                      disabled={isSaving}
                      data-testid="ads-top-video-confirm-remove"
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      Confirm Remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveTopVideo(false)}
                      disabled={isSaving}
                      className="px-2 py-1 rounded-lg bg-white text-slate-700 text-[11px] font-semibold border border-slate-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={handleSaveTopVideoAd}
                disabled={isSaving || !topVideoUrlInput.trim()}
                data-testid="ads-top-video-save-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Save Video Ad</span>
              </button>
            </div>
          </div>
        </div>

        {/* Top Video Ad Size & Header Dimensions Controls */}
        <div
          data-testid="ads-top-video-size-controls"
          className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                Top Video Ad &amp; Surrounding Header Dimensions
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure the exact size of the centered video player and its surrounding top banner/header across desktop and mobile.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={currentTopVideoDisplay.preserveAspectRatio}
                  onChange={(e) => updateTopVideoDisplay('preserveAspectRatio', e.target.checked)}
                  data-testid="ads-top-video-aspect-toggle"
                  className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Maintain 16:9 Ratio</span>
              </label>

              <button
                type="button"
                onClick={handleResetTopVideoDisplay}
                data-testid="ads-top-video-reset-sizes"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Reset Sizes</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DisplayNumericControl
              id="ads-top-video-width-px"
              label="Video Width"
              description="Width of the centered Vimeo video player (scales to 100% on narrow screens)."
              value={currentTopVideoDisplay.videoWidthPx}
              min={TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.min}
              max={TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.max}
              step={TOP_VIDEO_AD_DISPLAY_LIMITS.videoWidthPx.step}
              unit="px"
              onChange={(val) => updateTopVideoDisplay('videoWidthPx', val)}
            />

            <DisplayNumericControl
              id="ads-top-video-height-px"
              label="Video Height"
              description={
                currentTopVideoDisplay.preserveAspectRatio
                  ? 'Linked to Video Width to preserve 16:9 aspect ratio.'
                  : 'Custom video stage height (16:9 lock disabled).'
              }
              value={currentTopVideoDisplay.videoHeightPx}
              min={TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.min}
              max={TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.max}
              step={TOP_VIDEO_AD_DISPLAY_LIMITS.videoHeightPx.step}
              unit="px"
              onChange={(val) => updateTopVideoDisplay('videoHeightPx', val)}
            />

            <DisplayNumericControl
              id="ads-top-video-banner-width-px"
              label="Banner / Header Width"
              description="Width of the framed banner header surrounding the video."
              value={currentTopVideoDisplay.bannerWidthPx}
              min={TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.min}
              max={TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.max}
              step={TOP_VIDEO_AD_DISPLAY_LIMITS.bannerWidthPx.step}
              unit="px"
              onChange={(val) => updateTopVideoDisplay('bannerWidthPx', val)}
            />

            <DisplayNumericControl
              id="ads-top-video-banner-height-px"
              label="Banner / Header Height"
              description="Vertical height & spacing of the header strip above the video (-5px to 120px; negative values tighten padding and spacing cleanly)."
              value={currentTopVideoDisplay.bannerHeightPx}
              min={TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.min}
              max={TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.max}
              step={TOP_VIDEO_AD_DISPLAY_LIMITS.bannerHeightPx.step}
              unit="px"
              onChange={(val) => updateTopVideoDisplay('bannerHeightPx', val)}
            />
          </div>
        </div>

        {/* Live Admin Video Preview Reflecting Exact Saved/Pending Dimensions */}
        <div
          data-testid="ads-top-video-preview"
          className="rounded-xl border border-slate-200 bg-slate-100/70 p-4 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-teal-700" aria-hidden="true" />
              <span>
                Top Banner &amp; Video Size Preview{' '}
                {previewTopVideo ? `(Vimeo ID: ${previewTopVideo.videoId})` : '(Wireframe)'}
              </span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-normal">
              Banner {currentTopVideoDisplay.bannerWidthPx}×{currentTopVideoDisplay.bannerHeightPx}px · Video{' '}
              {currentTopVideoDisplay.videoWidthPx}×{currentTopVideoDisplay.videoHeightPx}px{' '}
              {currentTopVideoDisplay.preserveAspectRatio ? '(16:9)' : '(Custom)'}
            </span>
          </div>

          <div
            className="w-full overflow-x-auto bg-slate-950/95 rounded-xl px-2 border border-slate-800"
            style={{
              paddingTop: `${Math.max(2, previewHeaderSpacing.sectionPaddingTopPx)}px`,
              paddingBottom: `${Math.max(2, previewHeaderSpacing.sectionPaddingBottomPx)}px`
            }}
          >
            <div
              className="w-full max-w-full mx-auto bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 sm:px-3.5 transition-all flex flex-col"
              style={{
                maxWidth: `${currentTopVideoDisplay.bannerWidthPx}px`,
                paddingTop: `${previewHeaderSpacing.wrapperPaddingTopPx}px`,
                paddingBottom: `${previewHeaderSpacing.wrapperPaddingBottomPx}px`,
                gap: `${previewHeaderSpacing.wrapperGapPx}px`
              }}
            >
              <div
                className="flex items-center justify-between gap-2 text-[11px] text-white"
                style={{ minHeight: `${previewHeaderSpacing.headerMinHeightPx}px` }}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`rounded bg-amber-400 text-slate-950 font-extrabold uppercase ${
                      previewHeaderSpacing.compactTier === 'ultra'
                        ? 'px-1 py-0 text-[8px] leading-[11px]'
                        : previewHeaderSpacing.compactTier === 'compact'
                        ? 'px-1.5 py-0 text-[9px] leading-[13px]'
                        : 'px-1.5 py-0.5 text-[9px] leading-none'
                    }`}
                  >
                    AD
                  </span>
                  <span
                    className={`font-bold text-amber-300 uppercase ${
                      previewHeaderSpacing.compactTier === 'ultra'
                        ? 'text-[9px] leading-[11px]'
                        : previewHeaderSpacing.compactTier === 'compact'
                        ? 'text-[10px] leading-[13px]'
                        : 'text-[10px] sm:text-[11px] leading-none'
                    }`}
                  >
                    {topVideoLabelInput.trim() || 'Sponsored Video'}
                  </span>
                  {topVideoTitleInput.trim() && (
                    <span
                      className={`text-slate-200 truncate ${
                        previewHeaderSpacing.compactTier === 'ultra'
                          ? 'text-[9px] leading-[11px]'
                          : 'text-[11px]'
                      }`}
                    >
                      · {topVideoTitleInput.trim()}
                    </span>
                  )}
                </div>
                <span
                  className={`rounded-md bg-slate-950 border border-slate-700 text-slate-300 font-bold ${
                    previewHeaderSpacing.compactTier === 'ultra'
                      ? 'px-1.5 py-0 text-[9px] leading-[12px]'
                      : previewHeaderSpacing.compactTier === 'compact'
                      ? 'px-1.5 py-[1px] text-[9px] leading-[13px]'
                      : 'px-2 py-0.5 text-[10px]'
                  }`}
                >
                  Minimize
                </span>
              </div>

              <div
                className={`w-full max-w-full mx-auto transition-all ${
                  !currentTopVideoDisplay.preserveAspectRatio
                    ? '[&_[data-testid=shop-vimeo-player]>div:first-child]:!aspect-auto [&_[data-testid=shop-vimeo-player]>div:first-child]:!h-[var(--top-ad-video-height)] [&_[data-testid=shop-vimeo-mount]>div]:!pt-0 [&_[data-testid=shop-vimeo-mount]>div]:!h-full'
                    : ''
                }`}
                style={{
                  width: '100%',
                  maxWidth: `${currentTopVideoDisplay.videoWidthPx}px`,
                  ...(!currentTopVideoDisplay.preserveAspectRatio
                    ? ({ '--top-ad-video-height': `${currentTopVideoDisplay.videoHeightPx}px` } as React.CSSProperties)
                    : {})
                }}
              >
                {previewTopVideo ? (
                  <Suspense
                    fallback={
                      <div
                        className={`w-full rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-slate-300 ${
                          currentTopVideoDisplay.preserveAspectRatio ? 'aspect-video' : ''
                        }`}
                        style={
                          !currentTopVideoDisplay.preserveAspectRatio
                            ? { height: `${currentTopVideoDisplay.videoHeightPx}px` }
                            : undefined
                        }
                      >
                        Loading Vimeo preview...
                      </div>
                    }
                  >
                    <LazyShopVimeoPlayer
                      video={{
                        videoId: previewTopVideo.videoId,
                        playerEmbedUrl: previewTopVideo.playerEmbedUrl,
                        title: previewTopVideo.title || previewTopVideo.label || 'Sponsored Video'
                      }}
                      autoPlay={false}
                      compact={true}
                      playerLabel="Top Video Ad"
                      fallbackNote="Check that the Vimeo link is public or embeddable."
                    />
                  </Suspense>
                ) : (
                  <div
                    className={`w-full rounded-xl border border-dashed border-slate-600 bg-slate-950 flex flex-col items-center justify-center text-center px-3 text-slate-400 ${
                      currentTopVideoDisplay.preserveAspectRatio ? 'aspect-video' : ''
                    }`}
                    style={
                      !currentTopVideoDisplay.preserveAspectRatio
                        ? { height: `${currentTopVideoDisplay.videoHeightPx}px` }
                        : undefined
                    }
                  >
                    <span className="text-[11px] font-bold text-slate-200">
                      Video Area ({currentTopVideoDisplay.videoWidthPx}×{currentTopVideoDisplay.videoHeightPx}px)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Paste a Vimeo URL above and click &ldquo;Save Video Ad&rdquo; to preview live video
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
                      <span>{settings.belowHeaderAd.label || 'Partner Announcement'}</span>
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
                        Below-Header &amp; Above-Footer Ad Preview ({previewViewport})
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

      {/* Placement 1: Below Header (Header Ads) */}
      <AdPlacementCard
        placementTitle="1. Below Website Header"
        placementDescription="Header Ads position: displayed directly beneath the top navigation bar across website pages using your image banner or ad network HTML/script code (collapses cleanly when empty)."
        config={settings.belowHeaderAd}
        onChange={updateBelowHeader}
      />

      {/* Placement 2: Above Footer (Below Post Ads) */}
      <AdPlacementCard
        placementTitle="2. Above Website Footer"
        placementDescription="Below Post Ads position: displayed immediately above the bottom website footer when a custom banner image or custom HTML/script is configured (collapses cleanly when empty)."
        config={settings.aboveFooterAd}
        onChange={updateAboveFooter}
      />

      {/* Placements 3, 4, 5 & Global Site-Wide Scripts */}
      <InArticleAdManagerSection
        inArticleAds={currentInArticleAds}
        globalScripts={currentGlobalScripts}
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
  const hasCodeReady =
    config.type === 'code' && hasRenderableAdCode(config.code);
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
