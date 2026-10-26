import React, { useState, useRef } from 'react';
import { 
  Palette, 
  Type, 
  Image as ImageIcon, 
  Eye, 
  Save, 
  RotateCcw, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Sparkles, 
  Smartphone, 
  Monitor, 
  Check, 
  ExternalLink, 
  Sliders, 
  RefreshCw, 
  HelpCircle,
  Undo2,
  Layers,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { 
  DEFAULT_WEBSITE_COLORS, 
  DEFAULT_WEBSITE_TYPOGRAPHY, 
  DEFAULT_WEBSITE_LOGO,
  WebsiteColorSettings,
  WebsiteTypographySettings,
  WebsiteLogoSettings
} from '../types/websiteDesign';
import { uploadWebsiteLogo } from '../services/websiteDesignService';

// Preset educational palettes for 1-click theme switching
const PALETTE_PRESETS: { name: string; description: string; colors: Partial<WebsiteColorSettings> }[] = [
  {
    name: 'Official GS GITUMBA (Teal & Navy)',
    description: 'The standard authentic pedagogical palette of ISEZERANO ONLINE',
    colors: { ...DEFAULT_WEBSITE_COLORS }
  },
  {
    name: 'Academic Emerald & Slate',
    description: 'Refined green campus feel with high-contrast slate text',
    colors: {
      headerBg: '#ffffff',
      headerText: '#064e3b',
      headerBorder: '#d1fae5',
      navLinkHover: '#059669',
      navLinkActive: '#047857',
      primaryButtonBg: '#059669',
      primaryButtonText: '#ffffff',
      secondaryButtonBg: '#064e3b',
      footerBg: '#022c22',
      footerHeadingText: '#ffffff',
      footerBodyText: '#a7f3d0',
      footerLinkColor: '#34d399',
      headingPrimary: '#064e3b',
      headingSecondary: '#047857',
      accentBg: '#ecfdf5',
      accentBadgeBg: '#d1fae5',
      accentBadgeText: '#065f46'
    }
  },
  {
    name: 'Royal Academic Blue',
    description: 'Distinguished university & MINEDUC inspection tone',
    colors: {
      headerBg: '#ffffff',
      headerText: '#1e3a8a',
      headerBorder: '#dbeafe',
      navLinkHover: '#2563eb',
      navLinkActive: '#1d4ed8',
      primaryButtonBg: '#1d4ed8',
      primaryButtonText: '#ffffff',
      secondaryButtonBg: '#1e3a8a',
      footerBg: '#0f172a',
      footerHeadingText: '#ffffff',
      footerBodyText: '#93c5fd',
      footerLinkColor: '#60a5fa',
      headingPrimary: '#1e3a8a',
      headingSecondary: '#1d4ed8',
      accentBg: '#eff6ff',
      accentBadgeBg: '#dbeafe',
      accentBadgeText: '#1e40af'
    }
  },
  {
    name: 'Warm Pedagogical Burgundy',
    description: 'Prestigious classical boarding school elegance',
    colors: {
      headerBg: '#ffffff',
      headerText: '#831843',
      headerBorder: '#fbcfe8',
      navLinkHover: '#be185d',
      navLinkActive: '#9d174d',
      primaryButtonBg: '#be185d',
      primaryButtonText: '#ffffff',
      secondaryButtonBg: '#701a75',
      footerBg: '#500724',
      footerHeadingText: '#ffffff',
      footerBodyText: '#fbcfe8',
      footerLinkColor: '#f472b6',
      headingPrimary: '#831843',
      headingSecondary: '#9d174d',
      accentBg: '#fdf2f8',
      accentBadgeBg: '#fce7f3',
      accentBadgeText: '#9d174d'
    }
  }
];

// Curated font families suitable for education and CBC lesson planning
const FONT_PRESETS = [
  { 
    id: 'times', 
    label: 'Times New Roman (REB Academic Standard)', 
    value: "'Times New Roman', Times, Baskerville, Georgia, serif",
    sample: 'The quick brown fox jumps over the lazy dog'
  },
  { 
    id: 'georgia', 
    label: 'Georgia (Pedagogical Book Serif)', 
    value: "Georgia, Cambria, 'Times New Roman', Times, serif",
    sample: 'Amakuru meza ku burezi bwiteganyirijwe mu Rwanda'
  },
  { 
    id: 'inter', 
    label: 'Modern Clean Sans (Inter / System UI)', 
    value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sample: 'Clear digital interfaces for modern classroom teachers'
  },
  { 
    id: 'garamond', 
    label: 'EB Garamond / Classical Literature', 
    value: "'EB Garamond', Garamond, 'Palatino Linotype', serif",
    sample: 'Competence-Based Curriculum pedagogical documentation'
  }
];

export const WebsiteDesignManager: React.FC = () => {
  const {
    draftSettings,
    publishedSettings,
    isDraftDirty,
    isPublishing,
    updateDraftColors,
    updateDraftTypography,
    updateDraftLogo,
    resetSectionToDefault,
    resetSingleField,
    cancelDraft,
    publishSettings,
    setPreviewingDraft,
    isPreviewingDraft
  } = useWebsiteDesign();

  const [activeTab, setActiveTab] = useState<'logo' | 'colors' | 'typography' | 'preview'>('logo');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Logo upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [confirmResetLogo, setConfirmResetLogo] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showCustomUrlBox, setShowCustomUrlBox] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  // Handle Logo Upload from Phone or Computer
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showStatus('error', 'Please choose a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }

    setIsUploading(true);
    setUploadNote('Optimizing and uploading logo image...');
    try {
      const result = await uploadWebsiteLogo(file);
      updateDraftLogo({
        logoUrl: result.url,
        isCustomLogo: true
      });
      setUploadNote(`Logo uploaded successfully (${result.sizeKb} KB via ${result.storageType === 'firebase-storage' ? 'Firebase Storage' : 'Fast Firestore Direct Storage'}).`);
      showStatus('success', 'Logo image uploaded! Preview it below and click "Publish Changes" to make it live.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      showStatus('error', message);
      setUploadNote(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle setting custom HTTPS URL
  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    if (!customUrlInput.startsWith('http://') && !customUrlInput.startsWith('https://') && !customUrlInput.startsWith('/')) {
      showStatus('error', 'Please enter a valid HTTPS URL (e.g. https://example.com/logo.png)');
      return;
    }
    updateDraftLogo({
      logoUrl: customUrlInput.trim(),
      isCustomLogo: true
    });
    setCustomUrlInput('');
    setShowCustomUrlBox(false);
    showStatus('success', 'Custom logo URL applied to draft!');
  };

  // Restore Default Logo with Confirmation
  const handleRestoreDefaultLogo = () => {
    updateDraftLogo({
      logoUrl: DEFAULT_WEBSITE_LOGO.logoUrl,
      isCustomLogo: false,
      displayHeight: DEFAULT_WEBSITE_LOGO.displayHeight,
      displayFit: DEFAULT_WEBSITE_LOGO.displayFit,
      borderRadius: DEFAULT_WEBSITE_LOGO.borderRadius
    });
    setConfirmResetLogo(false);
    showStatus('success', 'Original default ISEZERANO ONLINE logo restored to draft.');
  };

  // Handle Publish All Draft Changes
  const handlePublish = async () => {
    const res = await publishSettings();
    if (res.success) {
      showStatus('success', '🎉 All design, typography & logo changes are published and live across the entire website!');
    } else {
      showStatus('error', res.error || 'Failed to publish changes.');
    }
  };

  // Handle Reset All Settings with Confirmation
  const handleResetAll = () => {
    resetSectionToDefault('all');
    setConfirmResetAll(false);
    showStatus('success', 'All website appearance, typography & logo settings reset to defaults in draft.');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-teal-950 p-6 sm:p-8 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
              <Palette className="w-3.5 h-3.5 text-teal-400" />
              <span>Administrator Appearance & Branding Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Website Design, Typography & Logo Manager
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Customize colors, font families, responsive text sizes, and the official school logo directly from your phone or computer. All changes are saved to Firebase and take effect instantly on the real website.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isDraftDirty && (
              <button
                type="button"
                onClick={cancelDraft}
                disabled={isPublishing}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20"
                title="Discard uncommitted draft changes"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Discard Draft</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                isDraftDirty 
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 animate-pulse' 
                  : 'bg-teal-600 hover:bg-teal-500 text-white'
              }`}
            >
              {isPublishing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isDraftDirty ? 'Publish Draft Changes' : 'Saved & Published'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center space-x-2 animate-in fade-in ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' 
              : 'bg-red-500/20 border-red-400/40 text-red-200'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl overflow-x-auto shadow-2xs">
        <div className="flex space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'logo'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>1. Website Logo</span>
            {draftSettings.logo.isCustomLogo && (
              <span className="w-2 h-2 rounded-full bg-teal-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colors')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'colors'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>2. Colors & Appearance</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('typography')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'typography'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>3. Typography & Sizing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>4. Live Preview</span>
          </button>
        </div>

        {/* Global Reset Button */}
        <div className="shrink-0 pb-1">
          <button
            type="button"
            onClick={() => setConfirmResetAll(true)}
            className="text-xs font-semibold text-slate-500 hover:text-red-700 inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
            title="Reset all design settings to original defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset All</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal: Reset All Settings */}
      {confirmResetAll && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset All Website Design Settings?</h3>
                <p className="text-xs text-slate-500">This will restore original defaults for colors, fonts, and the logo.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your uncommitted draft changes will be replaced with the default ISEZERANO ONLINE layout. Click &quot;Confirm Reset&quot; to proceed.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetAll(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Confirm Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Restore Default Logo */}
      {confirmResetLogo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Restore Original Website Logo?</h3>
                <p className="text-xs text-slate-500">Reverts to the official Bible & Cross logo.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to restore the original default ISEZERANO ONLINE logo image?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetLogo(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Keep Custom Logo
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaultLogo}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm cursor-pointer"
              >
                Yes, Restore Default Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: WEBSITE LOGO MANAGER */}
      {activeTab === 'logo' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          
          {/* Logo Section Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Official Website Logo Management</h3>
              <p className="text-xs text-slate-500">
                Upload a school crest, Bible image, or institution logo. The logo applies consistently across the header, footer, admin portal, and printed lesson plans.
              </p>
            </div>

            {draftSettings.logo.isCustomLogo && (
              <button
                type="button"
                onClick={() => setConfirmResetLogo(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Restore Original Default Logo</span>
              </button>
            )}
          </div>

          {/* Current Logo Preview Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-slate-200 shadow-2xs text-center space-y-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Current Active Logo
              </div>
              
              <div 
                className={`overflow-hidden bg-slate-900 border border-slate-200 shadow-md flex items-center justify-center ${draftSettings.logo.borderRadius}`}
                style={{
                  height: `${draftSettings.logo.displayHeight}px`,
                  width: `${draftSettings.logo.displayHeight}px`
                }}
              >
                <img 
                  src={draftSettings.logo.logoUrl} 
                  alt={draftSettings.logo.altText || 'Website Logo'} 
                  className={`w-full h-full object-${draftSettings.logo.displayFit}`}
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  draftSettings.logo.isCustomLogo 
                    ? 'bg-teal-100 text-teal-800 border border-teal-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {draftSettings.logo.isCustomLogo ? 'Custom Uploaded Logo' : 'Official Default Logo'}
                </span>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                  {draftSettings.logo.logoUrl}
                </p>
              </div>
            </div>

            {/* Upload & Replacement Controls */}
            <div className="md:col-span-7 space-y-4">
              <h4 className="text-sm font-bold text-slate-800">Upload or Replace Website Logo</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose an image from your device. Supported formats: PNG (with transparency), JPEG, WebP, or SVG. The image is optimized automatically for desktop and mobile screens.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden" 
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Image...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Choose Image from Device</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomUrlBox(prev => !prev)}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Use Public Image URL</span>
                </button>
              </div>

              {uploadNote && (
                <p className="text-xs text-teal-700 font-medium">
                  {uploadNote}
                </p>
              )}

              {/* Custom Image URL Form */}
              {showCustomUrlBox && (
                <form onSubmit={handleApplyCustomUrl} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Paste Direct HTTPS Image URL:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="url" 
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Logo Geometry & Fitting Controls */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">Logo Sizing & Display Alignment</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Height Slider */}
              <div className="space-y-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Display Height</span>
                  <span className="font-mono text-teal-800 font-bold">{draftSettings.logo.displayHeight}px</span>
                </div>
                <input 
                  type="range"
                  min="28"
                  max="80"
                  step="2"
                  value={draftSettings.logo.displayHeight}
                  onChange={(e) => updateDraftLogo({ displayHeight: Number(e.target.value) })}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400">Scale from 28px (compact) to 80px (prominent)</span>
              </div>

              {/* Fit Option */}
              <div className="space-y-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-semibold text-slate-700">
                  Aspect Ratio Fit
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => updateDraftLogo({ displayFit: 'cover' })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      draftSettings.logo.displayFit === 'cover'
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Cover (Fill)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDraftLogo({ displayFit: 'contain' })}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      draftSettings.logo.displayFit === 'contain'
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    Contain (Full)
                  </button>
                </div>
                <span className="text-[10px] text-slate-400">Preserves original logo proportions</span>
              </div>

              {/* Border Rounding */}
              <div className="space-y-1.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <label className="block text-xs font-semibold text-slate-700">
                  Corner Styling
                </label>
                <select
                  value={draftSettings.logo.borderRadius}
                  onChange={(e) => updateDraftLogo({ borderRadius: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white cursor-pointer"
                >
                  <option value="rounded-xl">Rounded Square (Default)</option>
                  <option value="rounded-lg">Slightly Rounded</option>
                  <option value="rounded-full">Circular Emblem</option>
                  <option value="rounded-none">Sharp Square</option>
                </select>
                <span className="text-[10px] text-slate-400">Controls container corner radius</span>
              </div>
            </div>
          </div>

          {/* Visibility Checkboxes */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">Logo Visibility Across Branding Locations</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={draftSettings.logo.showInHeader}
                  onChange={(e) => updateDraftLogo({ showInHeader: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Top Header & Navigation</span>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={draftSettings.logo.showInFooter}
                  onChange={(e) => updateDraftLogo({ showInFooter: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Footer Brand Section</span>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={draftSettings.logo.showInAdminGateway}
                  onChange={(e) => updateDraftLogo({ showInAdminGateway: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Admin Login Gateway</span>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={draftSettings.logo.updateFavicon}
                  onChange={(e) => updateDraftLogo({ updateFavicon: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Sync Browser Favicon</span>
              </label>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: WEBSITE APPEARANCE & COLORS */}
      {activeTab === 'colors' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Website Color System</h3>
              <p className="text-xs text-slate-500">
                Customize colors using native color pickers or hexadecimal values (#RRGGBB). Choose a curated educational preset or fine-tune individual components.
              </p>
            </div>

            <button
              type="button"
              onClick={() => resetSectionToDefault('colors')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Colors to Default</span>
            </button>
          </div>

          {/* 1-Click Educational Palettes */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1-Click Academic Color Themes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PALETTE_PRESETS.map((p, idx) => (
                <div 
                  key={idx}
                  onClick={() => updateDraftColors(p.colors)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer bg-slate-50/50 hover:bg-teal-50/30 group"
                >
                  <div className="flex items-center space-x-1.5 mb-2">
                    <span 
                      className="w-4 h-4 rounded-full border border-black/10" 
                      style={{ backgroundColor: p.colors.primaryButtonBg || '#0f766e' }} 
                    />
                    <span 
                      className="w-4 h-4 rounded-full border border-black/10" 
                      style={{ backgroundColor: p.colors.secondaryButtonBg || '#0f172a' }} 
                    />
                    <span 
                      className="w-4 h-4 rounded-full border border-black/10" 
                      style={{ backgroundColor: p.colors.footerBg || '#090e1a' }} 
                    />
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 group-hover:text-teal-800">{p.name}</h5>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Color Groups */}
          <div className="space-y-6 pt-4 border-t border-slate-100">
            
            {/* Group 1: Header and Navigation */}
            <ColorGroupSection
              title="1. Header & Navigation Bar"
              description="Top banner, navigation menu background, text, and active link states"
              fields={[
                { key: 'headerBg', label: 'Header Background', value: draftSettings.colors.headerBg },
                { key: 'headerText', label: 'Header Text & Title', value: draftSettings.colors.headerText },
                { key: 'headerBorder', label: 'Header Border', value: draftSettings.colors.headerBorder },
                { key: 'navLinkHover', label: 'Nav Link Hover Tint', value: draftSettings.colors.navLinkHover },
                { key: 'navLinkActive', label: 'Active Page Highlight', value: draftSettings.colors.navLinkActive },
              ]}
              onChange={(key, val) => updateDraftColors({ [key]: val })}
              onReset={(key) => resetSingleField('colors', key)}
            />

            {/* Group 2: Body and Page Background */}
            <ColorGroupSection
              title="2. Body & Background"
              description="Overall website page canvas, main paragraphs, and secondary labels"
              fields={[
                { key: 'bodyBg', label: 'Page Background', value: draftSettings.colors.bodyBg },
                { key: 'bodyText', label: 'Body Text Color', value: draftSettings.colors.bodyText },
                { key: 'mutedText', label: 'Muted Labels & Metadata', value: draftSettings.colors.mutedText },
              ]}
              onChange={(key, val) => updateDraftColors({ [key]: val })}
              onReset={(key) => resetSingleField('colors', key)}
            />

            {/* Group 3: Cards and Main Content */}
            <ColorGroupSection
              title="3. Cards & Content Sections"
              description="Lesson planning workspace cards, feature panels, and tables"
              fields={[
                { key: 'cardBg', label: 'Card Background', value: draftSettings.colors.cardBg },
                { key: 'cardBorder', label: 'Card Border Line', value: draftSettings.colors.cardBorder },
                { key: 'accentBg', label: 'Highlighted Container Fill', value: draftSettings.colors.accentBg },
              ]}
              onChange={(key, val) => updateDraftColors({ [key]: val })}
              onReset={(key) => resetSingleField('colors', key)}
            />

            {/* Group 4: Buttons, Links & Forms */}
            <ColorGroupSection
              title="4. Buttons, Links & Forms"
              description="Action triggers, submit buttons, links, and text input outlines"
              fields={[
                { key: 'primaryButtonBg', label: 'Primary Button Background', value: draftSettings.colors.primaryButtonBg },
                { key: 'primaryButtonText', label: 'Primary Button Text', value: draftSettings.colors.primaryButtonText },
                { key: 'secondaryButtonBg', label: 'Secondary Button', value: draftSettings.colors.secondaryButtonBg },
                { key: 'linkColor', label: 'Hyperlinks', value: draftSettings.colors.linkColor },
                { key: 'formInputBorder', label: 'Form Input Border', value: draftSettings.colors.formInputBorder },
                { key: 'formFocusRing', label: 'Form Focus Highlight', value: draftSettings.colors.formFocusRing },
              ]}
              onChange={(key, val) => updateDraftColors({ [key]: val })}
              onReset={(key) => resetSingleField('colors', key)}
            />

            {/* Group 5: Footer & Copyright */}
            <ColorGroupSection
              title="5. Footer & Information Bar"
              description="Bottom website footer background, column headers, and links"
              fields={[
                { key: 'footerBg', label: 'Footer Background', value: draftSettings.colors.footerBg },
                { key: 'footerHeadingText', label: 'Footer Headings', value: draftSettings.colors.footerHeadingText },
                { key: 'footerBodyText', label: 'Footer Description Text', value: draftSettings.colors.footerBodyText },
                { key: 'footerLinkColor', label: 'Footer Links & Badges', value: draftSettings.colors.footerLinkColor },
              ]}
              onChange={(key, val) => updateDraftColors({ [key]: val })}
              onReset={(key) => resetSingleField('colors', key)}
            />

            {/* Group 6: Headings and Accents */}
            <ColorGroupSection
              title="6. Headings & Sidebars"
              description="H1/H2 titles, sidebar drawers, and status badges"
              fields={[
                { key: 'headingPrimary', label: 'Main Heading H1', value: draftSettings.colors.headingPrimary },
                { key: 'headingSecondary', label: 'Section Heading H2', value: draftSettings.colors.headingSecondary },
                { key: 'sidebarBg', label: 'Sidebar Background', value: draftSettings.colors.sidebarBg },
                { key: 'accentBadgeBg', label: 'Badge Background', value: draftSettings.colors.accentBadgeBg },
                { key: 'accentBadgeText', label: 'Badge Text', value: draftSettings.colors.accentBadgeText },
              ]}
              onChange={(key, val) => updateDraftColors({ [key]: val })}
              onReset={(key) => resetSingleField('colors', key)}
            />

          </div>

        </div>
      )}

      {/* TAB 3: TYPOGRAPHY & SIZING */}
      {activeTab === 'typography' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Typography & Font Sizing Manager</h3>
              <p className="text-xs text-slate-500">
                Adjust font families, font sizes, weights, and line heights with built-in responsive boundaries to keep the website clean and legible on phones and laptops.
              </p>
            </div>

            <button
              type="button"
              onClick={() => resetSectionToDefault('typography')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Typography to Default</span>
            </button>
          </div>

          {/* Font Family Selection */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Primary Font Family</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FONT_PRESETS.map((f) => (
                <div
                  key={f.id}
                  onClick={() => updateDraftTypography({ fontFamily: f.value, headingFontFamily: f.value })}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    draftSettings.typography.fontFamily === f.value
                      ? 'border-teal-600 bg-teal-50/40 shadow-xs ring-1 ring-teal-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900">{f.label}</span>
                    {draftSettings.typography.fontFamily === f.value && (
                      <Check className="w-4 h-4 text-teal-600" />
                    )}
                  </div>
                  <p 
                    className="text-xs text-slate-600 truncate"
                    style={{ fontFamily: f.value }}
                  >
                    {f.sample}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Font Sizing Sliders with Limits */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">Responsive Font Sizing Controls</h4>
            <p className="text-xs text-slate-500">
              Each size slider includes safe minimum and maximum limits to preserve table layout and phone responsiveness.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FontSizeSlider
                label="Website Title (Header)"
                value={draftSettings.typography.websiteTitleSize}
                min={16}
                max={30}
                onChange={(val) => updateDraftTypography({ websiteTitleSize: val })}
                onReset={() => resetSingleField('typography', 'websiteTitleSize')}
              />

              <FontSizeSlider
                label="Website Subtitle"
                value={draftSettings.typography.websiteSubtitleSize}
                min={10}
                max={16}
                onChange={(val) => updateDraftTypography({ websiteSubtitleSize: val })}
                onReset={() => resetSingleField('typography', 'websiteSubtitleSize')}
              />

              <FontSizeSlider
                label="Top Navigation Menu"
                value={draftSettings.typography.navMenuSize}
                min={12}
                max={18}
                onChange={(val) => updateDraftTypography({ navMenuSize: val })}
                onReset={() => resetSingleField('typography', 'navMenuSize')}
              />

              <FontSizeSlider
                label="Page Main Title (H1)"
                value={draftSettings.typography.h1Size}
                min={24}
                max={44}
                onChange={(val) => updateDraftTypography({ h1Size: val })}
                onReset={() => resetSingleField('typography', 'h1Size')}
              />

              <FontSizeSlider
                label="Section Headings (H2)"
                value={draftSettings.typography.h2Size}
                min={18}
                max={32}
                onChange={(val) => updateDraftTypography({ h2Size: val })}
                onReset={() => resetSingleField('typography', 'h2Size')}
              />

              <FontSizeSlider
                label="Paragraphs & Table Body"
                value={draftSettings.typography.bodySize}
                min={13}
                max={18}
                onChange={(val) => updateDraftTypography({ bodySize: val })}
                onReset={() => resetSingleField('typography', 'bodySize')}
              />

              <FontSizeSlider
                label="Buttons & Form Controls"
                value={draftSettings.typography.buttonSize}
                min={12}
                max={17}
                onChange={(val) => updateDraftTypography({ buttonSize: val })}
                onReset={() => resetSingleField('typography', 'buttonSize')}
              />

              <FontSizeSlider
                label="Footer Text"
                value={draftSettings.typography.footerSize}
                min={11}
                max={15}
                onChange={(val) => updateDraftTypography({ footerSize: val })}
                onReset={() => resetSingleField('typography', 'footerSize')}
              />
            </div>
          </div>

          {/* Font Weights and Line Height */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800">Font Weight & Line Spacing</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Heading Weight</label>
                <select
                  value={draftSettings.typography.headingWeight}
                  onChange={(e) => updateDraftTypography({ headingWeight: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white cursor-pointer"
                >
                  <option value="normal">Normal (400)</option>
                  <option value="medium">Medium (500)</option>
                  <option value="semibold">Semi-Bold (600)</option>
                  <option value="bold">Bold (700 - Default)</option>
                </select>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Body Weight</label>
                <select
                  value={draftSettings.typography.bodyWeight}
                  onChange={(e) => updateDraftTypography({ bodyWeight: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white cursor-pointer"
                >
                  <option value="normal">Normal (400 - Default)</option>
                  <option value="medium">Medium (500)</option>
                </select>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">Line Spacing</label>
                <select
                  value={draftSettings.typography.lineHeight}
                  onChange={(e) => updateDraftTypography({ lineHeight: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white cursor-pointer"
                >
                  <option value="tight">Tight (1.25)</option>
                  <option value="normal">Normal (1.5 - Default)</option>
                  <option value="relaxed">Relaxed (1.75)</option>
                </select>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 4: LIVE PREVIEW (Desktop & Mobile Simulation) */}
      {activeTab === 'preview' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Preview Viewport Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Live Website Preview</h3>
              <p className="text-xs text-slate-500">
                Inspect how your custom colors, typography, and logo look before publishing live to the public website.
              </p>
            </div>

            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === 'desktop'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile Phone</span>
              </button>
            </div>
          </div>

          {/* Interactive Mock Viewport */}
          <div className="flex justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
            <div 
              className={`transition-all duration-300 rounded-2xl overflow-hidden shadow-xl border border-slate-300 ${
                previewDevice === 'mobile' 
                  ? 'max-w-sm w-full ring-8 ring-slate-800' 
                  : 'w-full'
              }`}
              style={{
                backgroundColor: draftSettings.colors.bodyBg,
                color: draftSettings.colors.bodyText,
                fontFamily: draftSettings.typography.fontFamily
              }}
            >
              
              {/* Preview Header */}
              <div 
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{
                  backgroundColor: draftSettings.colors.headerBg,
                  borderColor: draftSettings.colors.headerBorder,
                  color: draftSettings.colors.headerText
                }}
              >
                <div className="flex items-center space-x-2.5">
                  {draftSettings.logo.showInHeader && (
                    <div 
                      className={`overflow-hidden shrink-0 ${draftSettings.logo.borderRadius}`}
                      style={{
                        height: `${Math.min(draftSettings.logo.displayHeight, 42)}px`,
                        width: `${Math.min(draftSettings.logo.displayHeight, 42)}px`
                      }}
                    >
                      <img 
                        src={draftSettings.logo.logoUrl} 
                        alt="Logo Preview" 
                        className={`w-full h-full object-${draftSettings.logo.displayFit}`}
                      />
                    </div>
                  )}
                  <div>
                    <h5 
                      className="font-bold leading-tight"
                      style={{ fontSize: `${draftSettings.typography.websiteTitleSize}px` }}
                    >
                      ISEZERANO ONLINE
                    </h5>
                    <span 
                      className="text-slate-500 block"
                      style={{ fontSize: `${draftSettings.typography.websiteSubtitleSize}px` }}
                    >
                      GS GITUMBA
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center space-x-3 text-xs font-semibold">
                  <span style={{ color: draftSettings.colors.navLinkActive }}>Home</span>
                  <span className="text-slate-500">Dashboard</span>
                  <span className="text-slate-500">Lesson Plans</span>
                </div>
              </div>

              {/* Preview Hero / Content Area */}
              <div className="p-5 sm:p-8 space-y-5">
                <div className="space-y-2">
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block"
                    style={{
                      backgroundColor: draftSettings.colors.accentBadgeBg,
                      color: draftSettings.colors.accentBadgeText
                    }}
                  >
                    Rwanda CBC Education Platform
                  </span>
                  
                  <h1 
                    className="font-bold tracking-tight"
                    style={{
                      fontSize: `${draftSettings.typography.h1Size}px`,
                      color: draftSettings.colors.headingPrimary,
                      fontFamily: draftSettings.typography.headingFontFamily
                    }}
                  >
                    Empowering Rwandan Educators
                  </h1>

                  <p 
                    className="max-w-xl leading-relaxed"
                    style={{ 
                      fontSize: `${draftSettings.typography.bodySize}px`,
                      color: draftSettings.colors.bodyText 
                    }}
                  >
                    Prepared for primary and secondary school teachers at GS GITUMBA to formulate official 8-column Competence-Based Curriculum (CBC) lesson plans aligned with REB standards.
                  </p>
                </div>

                {/* Buttons Preview */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold shadow-xs"
                    style={{
                      backgroundColor: draftSettings.colors.primaryButtonBg,
                      color: draftSettings.colors.primaryButtonText,
                      fontSize: `${draftSettings.typography.buttonSize}px`
                    }}
                  >
                    Generate Lesson Plan
                  </button>

                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-xs font-bold"
                    style={{
                      backgroundColor: draftSettings.colors.secondaryButtonBg,
                      color: draftSettings.colors.secondaryButtonText,
                      fontSize: `${draftSettings.typography.buttonSize}px`
                    }}
                  >
                    View CBC Subjects
                  </button>
                </div>

                {/* Sample Card */}
                <div 
                  className="p-4 rounded-xl border shadow-2xs space-y-2"
                  style={{
                    backgroundColor: draftSettings.colors.cardBg,
                    borderColor: draftSettings.colors.cardBorder
                  }}
                >
                  <h3 
                    className="font-bold text-sm"
                    style={{ color: draftSettings.colors.headingSecondary }}
                  >
                    Sample REB CBC Pedagogical Card
                  </h3>
                  <p 
                    className="text-xs leading-relaxed"
                    style={{ 
                      fontSize: `${draftSettings.typography.bodySize - 1}px`,
                      color: draftSettings.colors.bodyText 
                    }}
                  >
                    Generic competences: Critical thinking, problem-solving, and communication in Kinyarwanda and English.
                  </p>
                  <a 
                    href="#preview" 
                    className="text-xs font-semibold underline inline-block"
                    style={{ color: draftSettings.colors.linkColor }}
                  >
                    Learn more about CBC inspection standards →
                  </a>
                </div>
              </div>

              {/* Preview Footer */}
              <div 
                className="p-5 border-t text-xs space-y-3"
                style={{
                  backgroundColor: draftSettings.colors.footerBg,
                  color: draftSettings.colors.footerBodyText
                }}
              >
                <div className="flex items-center space-x-2">
                  {draftSettings.logo.showInFooter && (
                    <div 
                      className={`overflow-hidden ${draftSettings.logo.borderRadius}`}
                      style={{
                        height: `${Math.min(draftSettings.logo.displayHeight, 32)}px`,
                        width: `${Math.min(draftSettings.logo.displayHeight, 32)}px`
                      }}
                    >
                      <img 
                        src={draftSettings.logo.logoUrl} 
                        alt="Footer Logo" 
                        className={`w-full h-full object-${draftSettings.logo.displayFit}`}
                      />
                    </div>
                  )}
                  <h6 
                    className="font-bold"
                    style={{ 
                      color: draftSettings.colors.footerHeadingText,
                      fontSize: `${draftSettings.typography.footerSize}px`
                    }}
                  >
                    ISEZERANO ONLINE – GS GITUMBA
                  </h6>
                </div>
                <p 
                  className="leading-relaxed opacity-90"
                  style={{ fontSize: `${draftSettings.typography.footerSize - 1}px` }}
                >
                  Buyoga Sector, Rulindo District, Northern Province, Rwanda.
                </p>
              </div>

            </div>
          </div>

          {/* Bottom Publishing Bar */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-slate-600">
              Satisfied with the live look? Click <strong>Publish Changes</strong> to deploy to the live website.
            </span>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer shrink-0"
            >
              {isPublishing ? 'Publishing...' : 'Publish Design Changes'}
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

// Reusable Color Group Component with Hex & Picker Inputs
interface ColorField {
  key: keyof WebsiteColorSettings;
  label: string;
  value: string;
}

const ColorGroupSection: React.FC<{
  title: string;
  description: string;
  fields: ColorField[];
  onChange: (key: keyof WebsiteColorSettings, value: string) => void;
  onReset: (key: string) => void;
}> = ({ title, description, fields, onChange, onReset }) => {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div 
            key={f.key}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between space-x-3"
          >
            <div className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-slate-700 truncate">{f.label}</span>
              <div className="flex items-center space-x-2 mt-1">
                <input 
                  type="text" 
                  value={f.value}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className="w-20 px-1.5 py-0.5 text-xs font-mono font-semibold uppercase border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => onReset(f.key)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Reset this color"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Native Color Picker Circle */}
            <label className="relative w-8 h-8 rounded-full border border-slate-300 shadow-2xs overflow-hidden cursor-pointer shrink-0 block">
              <input 
                type="color" 
                value={f.value.startsWith('#') && f.value.length === 7 ? f.value : '#ffffff'}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <span 
                className="block w-full h-full" 
                style={{ backgroundColor: f.value }} 
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

// Reusable Font Size Slider Component
const FontSizeSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  onReset: () => void;
}> = ({ label, value, min, max, onChange, onReset }) => {
  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
        <span className="truncate pr-1">{label}</span>
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="font-mono text-teal-800 font-bold">{value}px</span>
          <button
            type="button"
            onClick={onReset}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Reset to default"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>
      <input 
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-teal-600 cursor-pointer"
      />
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>{min}px</span>
        <span>{max}px</span>
      </div>
    </div>
  );
};
