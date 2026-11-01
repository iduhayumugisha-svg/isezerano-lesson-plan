import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  Layers
} from 'lucide-react';
import { AdsSettings, DEFAULT_ADS_SETTINGS, AdSlotConfig } from '../types/ads';
import { getAdsSettings, saveAdsSettings } from '../services/adsService';
import { useAuth } from '../context/AuthContext';

export const AdsManager: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdsSettings>(DEFAULT_ADS_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await getAdsSettings();
      setSettings(data);
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
      const result = await saveAdsSettings(settings, user.uid);
      if (result.success) {
        if (result.isLocalFallback) {
          setStatusMessage({
            type: 'success',
            text: '✅ Ad settings saved and applied locally! (Will sync to all devices once Firestore rules are published).'
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: '🎉 Ad settings saved successfully to Cloud Firestore across all devices!'
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mr-2" />
        <span className="text-sm font-semibold text-slate-700">Loading Ads Settings...</span>
      </div>
    );
  }

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

      {/* Placement 1: Below Header */}
      <AdPlacementCard
        placementTitle="1. Below Website Header"
        placementDescription="Displayed directly beneath the top navigation bar across all pages. Highest visibility for announcements, partner banners, and top leaderboard ads."
        config={settings.belowHeaderAd}
        onChange={updateBelowHeader}
      />

      {/* Placement 2: Above Footer */}
      <AdPlacementCard
        placementTitle="2. Above Website Footer"
        placementDescription="Displayed immediately above the bottom website footer. Ideal for sponsored content, community notices, and educational affiliate links."
        config={settings.aboveFooterAd}
        onChange={updateAboveFooter}
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
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      {/* Placement Header & Enable Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h4 className="text-base font-bold text-slate-900">{placementTitle}</h4>
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
            <span className="text-[11px] text-slate-400 font-mono">HTML / JS / AdSense</span>
          </div>
          <textarea
            rows={5}
            value={config.code || ''}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder={`<!-- Paste Google AdSense or Ad Network Script here -->\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>\n<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-..." data-ad-slot="..." data-ad-format="auto"></ins>`}
            className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-900 text-teal-300 focus:ring-2 focus:ring-teal-500"
          />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Note: Scripts will be executed safely in the dedicated ad slot container for website visitors when ads are enabled.
          </p>
        </div>
      )}
    </div>
  );
};
