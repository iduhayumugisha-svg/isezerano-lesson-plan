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
  FileText,
  X,
  ArrowUp,
  ArrowDown,
  EyeOff,
  LayoutGrid,
  ToggleLeft,
  ToggleRight,
  Plus,
  Edit2,
  History,
  Menu as MenuIcon,
  ListOrdered,
  FileCheck
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { 
  DEFAULT_WEBSITE_COLORS, 
  DEFAULT_WEBSITE_TYPOGRAPHY, 
  DEFAULT_WEBSITE_LOGO,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_NAVIGATION_MENUS,
  WebsiteColorSettings,
  WebsiteTypographySettings,
  WebsiteLogoSettings,
  HomepageSectionConfig,
  NavigationMenuItem,
  SectionType,
  SectionCustomContent,
  WebsiteDesignVersion
} from '../types/websiteDesign';
import { LogoUploadProgress, validateImageUrl } from '../services/websiteDesignService';
import { TopAnnouncementStripManager } from './TopAnnouncementStripManager';

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

// Curated professional font families freely available for education, publishing, and CBC lesson planning
const FONT_PRESETS = [
  // Serifs
  { 
    id: 'times', 
    label: 'Times New Roman (REB Academic Standard)', 
    category: 'Serif',
    value: "'Times New Roman', Times, Baskerville, Georgia, serif",
    sample: 'The quick brown fox jumps over the lazy dog'
  },
  { 
    id: 'georgia', 
    label: 'Georgia (Pedagogical Book Serif)', 
    category: 'Serif',
    value: "Georgia, Cambria, 'Times New Roman', Times, serif",
    sample: 'Amakuru meza ku burezi bwiteganyirijwe mu Rwanda'
  },
  { 
    id: 'garamond', 
    label: 'EB Garamond (Classical Literature)', 
    category: 'Serif',
    value: "'EB Garamond', Garamond, 'Palatino Linotype', serif",
    sample: 'Competence-Based Curriculum pedagogical documentation'
  },
  { 
    id: 'merriweather', 
    label: 'Merriweather (Editorial & Long-form)', 
    category: 'Serif',
    value: "'Merriweather', Georgia, 'Times New Roman', serif",
    sample: 'Integanyanyigisho y’u Rwanda yubakiye ku bushobozi'
  },
  { 
    id: 'playfair', 
    label: 'Playfair Display (Prestigious Headline)', 
    category: 'Serif',
    value: "'Playfair Display', Georgia, 'Times New Roman', serif",
    sample: 'Groupe Scolaire GITUMBA — Urubuga rw’Uburezi'
  },
  { 
    id: 'lora', 
    label: 'Lora (Contemporary Book Serif)', 
    category: 'Serif',
    value: "'Lora', Georgia, 'Times New Roman', serif",
    sample: 'Professional educational planning and assessment'
  },
  { 
    id: 'baskerville', 
    label: 'Baskerville (Refined Classical)', 
    category: 'Serif',
    value: "Baskerville, 'Baskerville Old Face', 'Hoefler Text', Garamond, serif",
    sample: 'Pedagogical clarity and structured lesson preparation'
  },
  { 
    id: 'palatino', 
    label: 'Palatino Linotype (Book Antiqua)', 
    category: 'Serif',
    value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
    sample: 'Inyandiko zizewe z’amasomo n’indangamanota z’abanyeshuri'
  },
  // Sans-Serifs
  { 
    id: 'inter', 
    label: 'Inter (Modern Clean Sans)', 
    category: 'Sans-Serif',
    value: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sample: 'Clear digital interfaces for modern classroom teachers'
  },
  { 
    id: 'roboto', 
    label: 'Roboto (Google Editorial Sans)', 
    category: 'Sans-Serif',
    value: "Roboto, system-ui, -apple-system, sans-serif",
    sample: 'Efficient, readable typography across phone and computer screens'
  },
  { 
    id: 'opensans', 
    label: 'Open Sans (Friendly & Legible)', 
    category: 'Sans-Serif',
    value: "'Open Sans', system-ui, -apple-system, sans-serif",
    sample: 'Uburezi bufite ireme ku bana b’inshuke n’abanyeshuri bose'
  },
  { 
    id: 'montserrat', 
    label: 'Montserrat (Geometric Modern)', 
    category: 'Sans-Serif',
    value: "Montserrat, system-ui, -apple-system, sans-serif",
    sample: 'ISEZERANO ONLINE — GS GITUMBA Buyoga Rulindo'
  },
  { 
    id: 'poppins', 
    label: 'Poppins (Friendly Geometric)', 
    category: 'Sans-Serif',
    value: "Poppins, system-ui, -apple-system, sans-serif",
    sample: 'Modern layout designed for teachers and administrators'
  },
  { 
    id: 'lato', 
    label: 'Lato (Warm & Balanced)', 
    category: 'Sans-Serif',
    value: "Lato, system-ui, -apple-system, sans-serif",
    sample: 'Balanced proportions with high legibility for reports'
  },
  { 
    id: 'segoe', 
    label: 'Segoe UI (Microsoft Standard)', 
    category: 'Sans-Serif',
    value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    sample: 'Standard clean interface typography on Windows PCs'
  },
  { 
    id: 'arial', 
    label: 'Arial / Helvetica (Universal Neutral)', 
    category: 'Sans-Serif',
    value: "Arial, Helvetica, sans-serif",
    sample: 'Universal compatibility across every device and browser'
  },
  { 
    id: 'trebuchet', 
    label: 'Trebuchet MS (Humanist Sans)', 
    category: 'Sans-Serif',
    value: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif",
    sample: 'Dynamic humanistic sans-serif for school documents'
  },
  // Monospace
  { 
    id: 'fira', 
    label: 'Fira Code (Technical Monospace)', 
    category: 'Monospace',
    value: "'Fira Code', Consolas, Monaco, 'Courier New', monospace",
    sample: 'Structured pedagogical standards: REB CBC 8-Columns'
  }
];

export const WebsiteDesignManager: React.FC = () => {
  const {
    draftSettings,
    publishedSettings,
    isDraftDirty,
    isPublishing,
    updateDraftBranding,
    updateDraftColors,
    updateDraftTypography,
    updateDraftLogo,
    homepageSections,
    updateDraftHomepageSections,
    addHomepageSection,
    updateHomepageSection,
    deleteHomepageSection,
    reorderHomepageSection,
    toggleHomepageSection,
    updateHomepageSectionOption,
    updateHomepageSectionContent,
    resetHomepageSectionsToDefault,
    navigationMenus,
    addNavigationMenuItem,
    updateNavigationMenuItem,
    deleteNavigationMenuItem,
    reorderNavigationMenuItem,
    toggleNavigationMenuItem,
    resetNavigationMenusToDefault,
    versionHistory,
    restoreVersion,
    undoDraftChanges,
    resetSectionToDefault,
    resetSingleField,
    cancelDraft,
    publishSettings,
    uploadLogoFile,
    removeLogoFile,
    setPreviewingDraft,
    isPreviewingDraft
  } = useWebsiteDesign();

  const [activeTab, setActiveTab] = useState<'branding' | 'announcements' | 'logo' | 'colors' | 'typography' | 'layout' | 'menus' | 'preview' | 'history'>('branding');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Section Editing Modal State
  const [editingSection, setEditingSection] = useState<HomepageSectionConfig | null>(null);
  const [isAddingSection, setIsAddingSection] = useState<boolean>(false);
  const [newSectionType, setNewSectionType] = useState<SectionType>('callout');
  const [newSectionLabel, setNewSectionLabel] = useState<string>('');
  const [newSectionHeadline, setNewSectionHeadline] = useState<string>('');
  const [newSectionBody, setNewSectionBody] = useState<string>('');
  const [newSectionBadge, setNewSectionBadge] = useState<string>('');
  const [newSectionBg, setNewSectionBg] = useState<'default' | 'white' | 'slate_dark' | 'teal_gradient' | 'amber_soft' | 'blue_soft'>('teal_gradient');
  const [newSectionBtnText, setNewSectionBtnText] = useState<string>('');
  const [newSectionBtnLink, setNewSectionBtnLink] = useState<string>('dashboard');

  // Navigation Menu Item Editing State
  const [isAddingNavMenu, setIsAddingNavMenu] = useState<boolean>(false);
  const [editingNavMenu, setEditingNavMenu] = useState<NavigationMenuItem | null>(null);
  const [newNavLabel, setNewNavLabel] = useState<string>('');
  const [newNavPath, setNewNavPath] = useState<string>('home');
  const [newNavIcon, setNewNavIcon] = useState<string>('BookOpen');
  const [newNavBadge, setNewNavBadge] = useState<string>('');
  const [newNavBadgeColor, setNewNavBadgeColor] = useState<'teal' | 'amber' | 'blue' | 'rose'>('teal');
  const [newNavLocation, setNewNavLocation] = useState<'header' | 'footer' | 'both'>('both');
  const [newNavExternal, setNewNavExternal] = useState<boolean>(false);

  // Version Restore State
  const [selectedVersionToRestore, setSelectedVersionToRestore] = useState<WebsiteDesignVersion | null>(null);
  const [publishSummaryInput, setPublishSummaryInput] = useState<string>('');
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);

  // Logo upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<LogoUploadProgress | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [confirmResetLogo, setConfirmResetLogo] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [urlTestStatus, setUrlTestStatus] = useState<{ status: 'idle' | 'testing' | 'valid' | 'invalid'; message?: string; previewUrl?: string }>({ status: 'idle' });
  const [activeUploadMethod, setActiveUploadMethod] = useState<'upload' | 'url'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 6000);
  };

  // Handle Logo Upload to Firebase Storage with Cloud Firestore fallback
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress({
      percent: 10,
      stage: 'validating',
      message: 'Validating image file...'
    });
    setUploadNote(null);

    try {
      const result = await uploadLogoFile(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success && result.url) {
        if (result.isFallbackDataUri) {
          setUploadNote('Logo saved directly to Cloud Firestore. Live across all visitor devices!');
          showStatus('success', '🎉 Logo optimized and published to Cloud Firestore! Visible live across the entire website.');
        } else {
          setUploadNote(`Firebase Storage Permanent URL: ${result.url}`);
          showStatus('success', '🎉 Logo uploaded to Firebase Storage and published live across the website!');
        }
      } else {
        const errorText = result.error || 'Upload failed.';
        showStatus('error', errorText);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadProgress({
        percent: 0,
        stage: 'error',
        message
      });
      showStatus('error', message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Test custom public image URL
  const handleTestCustomUrl = async () => {
    if (!customUrlInput.trim()) {
      setUrlTestStatus({ status: 'invalid', message: 'Please enter an image URL to test.' });
      return;
    }

    setIsTestingUrl(true);
    setUrlTestStatus({ status: 'testing', message: 'Testing image accessibility...' });

    const trimmedUrl = customUrlInput.trim();
    const result = await validateImageUrl(trimmedUrl);

    setIsTestingUrl(false);
    if (result.valid) {
      setUrlTestStatus({ 
        status: 'valid', 
        message: 'Image verified successfully! Link is public and ready to apply.',
        previewUrl: trimmedUrl 
      });
    } else {
      setUrlTestStatus({ 
        status: 'invalid', 
        message: result.error || 'Failed to load image from this URL.' 
      });
    }
  };

  // Handle setting custom HTTPS URL
  const handleApplyCustomUrl = async (publishImmediately: boolean = false) => {
    if (!customUrlInput.trim()) {
      showStatus('error', 'Please enter an image URL.');
      return;
    }

    const trimmedUrl = customUrlInput.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('data:image/')) {
      showStatus('error', 'Please enter a valid HTTP or HTTPS image URL (e.g. https://example.com/logo.png)');
      return;
    }

    updateDraftLogo({
      logoUrl: trimmedUrl,
      isCustomLogo: true
    });

    if (publishImmediately) {
      const publishRes = await publishSettings();
      if (publishRes.success) {
        showStatus('success', '🎉 Custom logo URL published live to Cloud Firestore across all devices!');
      } else {
        showStatus('error', publishRes.error || 'Failed to publish to Cloud Firestore.');
      }
    } else {
      showStatus('success', 'Custom logo URL applied to draft. Click "Publish Changes" to make it live across all devices.');
    }
  };

  // Restore Default / Remove Logo and immediately update Firestore
  const handleRestoreDefaultLogo = async () => {
    setConfirmResetLogo(false);
    const res = await removeLogoFile();
    if (res.success) {
      showStatus('success', 'Uploaded website logo removed and updated in Cloud Firestore.');
    } else {
      showStatus('error', res.error || 'Could not remove website logo.');
    }
  };

  // Handle Publish All Draft Changes
  const handlePublish = async () => {
    const res = await publishSettings();
    if (res.success) {
      showStatus('success', 'Website branding, name, description, design, and logo changes published live to Cloud Firestore!');
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
            onClick={() => setActiveTab('branding')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'branding'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Branding & Identity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'announcements'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>2. Top Announcement Strip</span>
            {draftSettings.announcements?.enabled && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

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
            <span>3. Website Logo</span>
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
            <span>4. Colors & Appearance</span>
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
            <span>5. Typography & Sizing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'layout'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>6. Sections & Content</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menus')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'menus'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MenuIcon className="w-4 h-4 text-teal-600" />
            <span>7. Navigation Menus</span>
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
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>8. Live Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold inline-flex items-center space-x-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4 text-amber-600" />
            <span>9. Version History</span>
            {(versionHistory?.length || 0) > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-extrabold">
                {versionHistory.length}
              </span>
            )}
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
                <p className="text-xs text-slate-500">Reverts to the default school platform branding.</p>
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

      {/* TAB 1: BRANDING & IDENTITY */}
      {activeTab === 'branding' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Website Name, Description, Header Logo &amp; Visibility</h3>
              <p className="text-xs text-slate-500">
                Edit the website name, description, visibility toggles, and top header logo. Saved changes update the live header, footer, browser title, and SEO metadata.
              </p>
            </div>

            <button
              type="button"
              onClick={() => resetSectionToDefault('branding')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Restore Default Branding</span>
            </button>
          </div>

          {/* Website Name & Description with Independent Visibility Toggles */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Website Name + Visibility Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Website Name (Main Header Title &amp; Browser Tab)
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draftSettings.branding?.showWebsiteName !== false}
                    onClick={() =>
                      updateDraftBranding({
                        showWebsiteName: !(draftSettings.branding?.showWebsiteName !== false)
                      })
                    }
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      draftSettings.branding?.showWebsiteName !== false
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                  >
                    {draftSettings.branding?.showWebsiteName !== false ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Name Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Name Hidden</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={draftSettings.branding?.platformTitle ?? ''}
                  onChange={(e) => updateDraftBranding({ platformTitle: e.target.value })}
                  placeholder="ISEZERANO ONLINE"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-bold"
                />
                <p className="text-[11px] text-slate-500">
                  Displayed to the right of the header logo, in the footer, and in browser tab/SEO titles.
                </p>
              </div>

              {/* Platform Subtitle */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  School Subtitle Label (Optional)
                </label>
                <input
                  type="text"
                  value={draftSettings.branding?.platformSubtitle ?? ''}
                  onChange={(e) => updateDraftBranding({ platformSubtitle: e.target.value })}
                  placeholder="GS GITUMBA"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold"
                />
                <p className="text-[11px] text-slate-500">
                  Sub-brand label displayed beneath the website name when the website name is visible.
                </p>
              </div>

              {/* Website Description + Independent Visibility Toggle */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-800">
                    Website Description (Public Branding &amp; SEO Meta Description)
                  </label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draftSettings.branding?.showWebsiteDescription !== false}
                    onClick={() =>
                      updateDraftBranding({
                        showWebsiteDescription: !(draftSettings.branding?.showWebsiteDescription !== false)
                      })
                    }
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      draftSettings.branding?.showWebsiteDescription !== false
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                  >
                    {draftSettings.branding?.showWebsiteDescription !== false ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Description Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Description Hidden</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={draftSettings.branding?.websiteDescription ?? ''}
                  onChange={(e) => updateDraftBranding({ websiteDescription: e.target.value })}
                  placeholder="Official Rwanda Competence-Based Curriculum (CBC) lesson planning, nursery report cards, and school blog."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-500">
                  Shown on the public website when Description Visible is enabled, and automatically synced to SEO metadata (`&lt;meta name=&quot;description&quot;&gt;` &amp; OpenGraph).
                </p>
              </div>
            </div>

            {/* Quick Header Branding Preview + Logo Upload */}
            <div className="pt-4 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Header Layout Preview (Logo Left → Website Name → Description)
                </span>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 min-w-0">
                  {draftSettings.logo.showInHeader && draftSettings.logo.logoUrl ? (
                    <div
                      className={`shrink-0 overflow-hidden bg-white border border-slate-200 flex items-center justify-center ${draftSettings.logo.borderRadius}`}
                      style={{
                        height: `${Math.min(Math.max(draftSettings.logo.displayHeight || 44, 32), 56)}px`,
                        width: `${Math.min(Math.max(draftSettings.logo.displayHeight || 44, 32), 56)}px`
                      }}
                    >
                      <img
                        src={draftSettings.logo.logoUrl}
                        alt={draftSettings.logo.altText || 'Header logo'}
                        className={`w-full h-full ${draftSettings.logo.displayFit === 'contain' ? 'object-contain p-0.5' : 'object-cover'}`}
                      />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0">
                    {draftSettings.branding?.showWebsiteName !== false ? (
                      <>
                        <div className="font-serif font-extrabold text-sm sm:text-base text-slate-900 truncate">
                          {draftSettings.branding?.platformTitle || 'ISEZERANO ONLINE'}
                        </div>
                        {draftSettings.branding?.platformSubtitle && (
                          <div className="text-[11px] font-semibold uppercase tracking-wider text-teal-700 truncate">
                            {draftSettings.branding.platformSubtitle}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-[11px] italic text-slate-400">(Website name hidden)</div>
                    )}
                    {draftSettings.branding?.showWebsiteDescription !== false && draftSettings.branding?.websiteDescription?.trim() ? (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {draftSettings.branding.websiteDescription}
                      </div>
                    ) : draftSettings.branding?.showWebsiteDescription === false ? (
                      <div className="text-[11px] italic text-slate-400">(Website description hidden)</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading Logo...' : draftSettings.logo.logoUrl ? 'Replace Header Logo' : 'Upload Logo from Device'}</span>
                </button>
                {draftSettings.logo.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setConfirmResetLogo(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Logo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveTab('logo')}
                  className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Logo Sizing</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Official School Name
              </label>
              <input
                type="text"
                value={draftSettings.branding?.schoolName || ''}
                onChange={(e) => updateDraftBranding({ schoolName: e.target.value })}
                placeholder="GS GITUMBA"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500">Official name of the school institution.</p>
            </div>

            {/* School Location */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                School Geographical Location
              </label>
              <input
                type="text"
                value={draftSettings.branding?.schoolLocation || ''}
                onChange={(e) => updateDraftBranding({ schoolLocation: e.target.value })}
                placeholder="Buyoga Sector, Rulindo District, Northern Province, Rwanda"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500">District, sector, and province in Rwanda.</p>
            </div>
          </div>

          {/* Top Announcement Strip Gateway Card */}
          <div className="bg-gradient-to-r from-teal-50 via-slate-50 to-emerald-50 p-5 rounded-2xl border border-teal-200 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-teal-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                  Top Announcement Strip &amp; Animated Ticker
                </h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto ${
                draftSettings.announcements?.enabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {draftSettings.announcements?.enabled ? 'Strip Visible (Live)' : 'Strip Hidden'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Manage multiple rotating announcements, customize font size, typeface, colors, sliding or fading transitions, and rotation speed.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 font-medium">
                {draftSettings.announcements?.messages?.length || 0} announcement message(s) configured
              </span>

              <button
                type="button"
                onClick={() => setActiveTab('announcements')}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <span>Customize Announcement Ticker &amp; Fonts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Administrator Homepage Text & Content Controls */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-2xs">
            <div className="border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-teal-700" />
                <span>Homepage Custom Content &amp; Titles (Admin Controlled)</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Manage what visitors see on the public homepage. AI-generated promotional text has been removed. You have full control over any text shown. Leave fields empty if you want visitors to see strictly the clean Lesson Plan and Report Card tools.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Custom Welcome Headline (Optional)
                </label>
                <input
                  type="text"
                  value={draftSettings.branding?.homepageWelcomeHeadline || ''}
                  onChange={(e) => updateDraftBranding({ homepageWelcomeHeadline: e.target.value })}
                  placeholder="e.g. Ikaze kuri GS GITUMBA (Leave empty to omit)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Custom Administrator Note / Message (Optional)
                </label>
                <input
                  type="text"
                  value={draftSettings.branding?.homepageCustomNote || ''}
                  onChange={(e) => updateDraftBranding({ homepageCustomNote: e.target.value })}
                  placeholder="e.g. Term 2 CBC preparation is now active"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Lesson Plan Card Title
                </label>
                <input
                  type="text"
                  value={draftSettings.branding?.lessonPlanCardTitle || ''}
                  onChange={(e) => updateDraftBranding({ lessonPlanCardTitle: e.target.value })}
                  placeholder="Lesson Plan"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Report Card Card Title
                </label>
                <input
                  type="text"
                  value={draftSettings.branding?.reportCardTitle || ''}
                  onChange={(e) => updateDraftBranding({ reportCardTitle: e.target.value })}
                  placeholder="Report Card"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Lesson Plan Custom Subtext (Optional)
                </label>
                <input
                  type="text"
                  value={draftSettings.branding?.lessonPlanCardDescription || ''}
                  onChange={(e) => updateDraftBranding({ lessonPlanCardDescription: e.target.value })}
                  placeholder="Optional custom note written by admin for lesson planning..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Report Card Custom Subtext (Optional)
                </label>
                <input
                  type="text"
                  value={draftSettings.branding?.reportCardDescription || ''}
                  onChange={(e) => updateDraftBranding({ reportCardDescription: e.target.value })}
                  placeholder="Optional custom note written by admin for report cards..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Copy */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Footer Tagline & Mission Narrative
              </label>
              <textarea
                rows={3}
                value={draftSettings.branding?.footerTagline || ''}
                onChange={(e) => updateDraftBranding({ footerTagline: e.target.value })}
                placeholder="Brief description about the platform origin at GS GITUMBA"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Footer Copyright Statement
              </label>
              <input
                type="text"
                value={draftSettings.branding?.footerCopyright || ''}
                onChange={(e) => updateDraftBranding({ footerCopyright: e.target.value })}
                placeholder="© 2026 ISEZERANO ONLINE – GS GITUMBA. All rights reserved."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-mono text-[11px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TOP ANNOUNCEMENT STRIP MANAGER */}
      {activeTab === 'announcements' && (
        <TopAnnouncementStripManager />
      )}

      {/* TAB 3: WEBSITE LOGO MANAGER */}
      {activeTab === 'logo' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
          
          {/* Logo Section Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Official Website Logo Management</h3>
              <p className="text-xs text-slate-500">
                Upload a school crest or institution logo. The logo applies consistently across the header, footer, admin portal, and printed lesson plans.
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
                className={`overflow-hidden bg-white border border-slate-200 shadow-md flex items-center justify-center ${draftSettings.logo.borderRadius}`}
                style={{
                  height: `${draftSettings.logo.displayHeight}px`,
                  width: `${draftSettings.logo.displayHeight}px`
                }}
              >
                {draftSettings.logo.logoUrl ? (
                  <img 
                    src={draftSettings.logo.logoUrl} 
                    alt={draftSettings.logo.altText || 'Website Logo'} 
                    className={`w-full h-full object-${draftSettings.logo.displayFit}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-5 h-5 opacity-60" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                  draftSettings.logo.logoUrl 
                    ? 'bg-teal-100 text-teal-800 border border-teal-200' 
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {draftSettings.logo.logoUrl ? 'Uploaded Logo Active' : 'No Logo Uploaded'}
                </span>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                  {draftSettings.logo.logoUrl ? `${draftSettings.logo.logoUrl.slice(0, 48)}...` : 'Upload a PNG, JPG, WebP, or SVG logo'}
                </p>
              </div>
            </div>

            {/* Upload & Replacement Controls */}
            <div className="md:col-span-7 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-sm font-bold text-slate-800">Choose Logo Source</h4>
                <div className="flex items-center space-x-1 p-0.5 bg-slate-200/70 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveUploadMethod('upload')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activeUploadMethod === 'upload'
                        ? 'bg-white text-teal-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Upload from Device
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveUploadMethod('url')}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      activeUploadMethod === 'url'
                        ? 'bg-white text-teal-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Public Image URL
                  </button>
                </div>
              </div>

              {/* METHOD 1: UPLOAD FROM DEVICE */}
              {activeUploadMethod === 'upload' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Choose an image from your device. Supported formats: PNG (with transparency), JPEG, WebP, or SVG (max 5 MB). The logo is saved permanently to Firebase and updates across the entire website.
                  </p>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleLogoFileChange}
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden" 
                  />

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Uploading & Processing Logo...</span>
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
                      onClick={() => setActiveUploadMethod('url')}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Switch to Public Image URL</span>
                    </button>
                  </div>

                  {/* Upload Progress Bar & Live Status */}
                  {uploadProgress && (
                    <div className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                      uploadProgress.stage === 'error'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : uploadProgress.stage === 'complete'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-teal-50 border-teal-200 text-teal-900'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center space-x-2">
                          {uploadProgress.stage === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          ) : uploadProgress.stage === 'complete' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <RefreshCw className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
                          )}
                          <span>
                            {uploadProgress.stage === 'validating' && '1. Validating Logo Format'}
                            {uploadProgress.stage === 'uploading' && `2. Cloud Upload (${uploadProgress.percent}%)`}
                            {uploadProgress.stage === 'saving_database' && '3. Saving to Cloud Firestore Database'}
                            {uploadProgress.stage === 'complete' && 'Logo Published Successfully'}
                            {uploadProgress.stage === 'error' && 'Upload Failed'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px]">{uploadProgress.percent}%</span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            uploadProgress.stage === 'error'
                              ? 'bg-rose-500'
                              : uploadProgress.stage === 'complete'
                              ? 'bg-emerald-600'
                              : 'bg-teal-600'
                          }`}
                          style={{ width: `${Math.max(5, uploadProgress.percent)}%` }}
                        />
                      </div>

                      <p className="text-xs leading-relaxed">
                        {uploadProgress.message}
                      </p>

                      {uploadProgress.stage === 'error' && (
                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 cursor-pointer shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Logo Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveUploadMethod('url')}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-white text-rose-800 text-xs font-semibold hover:bg-rose-100 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Use Public Image URL Instead</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {uploadNote && !uploadProgress && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Logo Status: </span>
                        <span>{uploadNote}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* METHOD 2: USE PUBLIC IMAGE URL (SEPARATE VALIDATED OPTION) */}
              {activeUploadMethod === 'url' && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Use Public Image URL (Direct Web Address)
                      </h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Link any publicly hosted image URL (HTTPS) for the school crest or institution logo.
                      </p>
                    </div>
                    <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-md border border-teal-200">
                      Validated Link Option
                    </span>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Direct Image URL (PNG, JPG, WebP, SVG):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input 
                        type="url" 
                        value={customUrlInput}
                        onChange={(e) => {
                          setCustomUrlInput(e.target.value);
                          if (urlTestStatus.status !== 'idle') {
                            setUrlTestStatus({ status: 'idle' });
                          }
                        }}
                        placeholder="https://example.com/images/school-logo.png"
                        className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleTestCustomUrl}
                        disabled={isTestingUrl || !customUrlInput.trim()}
                        className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isTestingUrl ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing...</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Test Image</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* URL Test Feedback & Preview */}
                  {urlTestStatus.status !== 'idle' && (
                    <div className={`p-3 rounded-xl border text-xs flex items-start space-x-2.5 ${
                      urlTestStatus.status === 'valid'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : urlTestStatus.status === 'invalid'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-sky-50 border-sky-300 text-sky-800'
                    }`}>
                      {urlTestStatus.status === 'valid' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : urlTestStatus.status === 'invalid' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      ) : (
                        <RefreshCw className="w-4 h-4 text-sky-600 animate-spin shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <p className="font-semibold">{urlTestStatus.message}</p>
                        {urlTestStatus.status === 'valid' && urlTestStatus.previewUrl && (
                          <div className="mt-2 flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center overflow-hidden">
                              <img 
                                src={urlTestStatus.previewUrl} 
                                alt="Tested Logo" 
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[11px] text-emerald-700">Preview renders clearly</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Apply Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleApplyCustomUrl(true)}
                      disabled={!customUrlInput.trim() || isPublishing}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Apply & Publish Live Immediately</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApplyCustomUrl(false)}
                      disabled={!customUrlInput.trim()}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                    >
                      <span>Apply to Draft Only</span>
                    </button>
                  </div>
                </div>
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
                Guhindura ingano y'inyuguti (Font Size) kuri website yose, amoko y'inyuguti, n'imiterere y'inyandiko kuri mudasobwa no kuri telefoni.
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

          {/* PRIORITY FEATURE: GLOBAL WEBSITE FONT SCALE (INGANO Y'INYUGUTI KURI WEBSITE YOSE) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-teal-50/80 via-white to-slate-50 border-2 border-teal-600/40 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-100 pb-3">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold mb-1">
                  <Type className="w-3.5 h-3.5 text-teal-700" />
                  <span>Ingano y'Inyuguti Rusange (Global Font Size)</span>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  Kongera cyangwa Kugabanya Ingano y'Inyuguti kuri Website Yose
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Iyi setting ihita igabanya cyangwa yongera ingano y'amagambo yose agaragara ku rubuga (Home, Lesson Plans, Report Cards, Footer) kuri mudasobwa na telefoni.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-bold text-slate-500">Gipimo kiriho:</span>
                <span className="px-3 py-1 rounded-xl bg-teal-700 text-white font-mono font-extrabold text-sm shadow-xs">
                  {Math.round((draftSettings.typography.fontScale || 1.0) * 100)}%
                </span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Hitamo Ingano Byihuse (Quick Presets):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: 'Ntoya', scale: 0.88, preset: 'small', desc: '88% (Compact)' },
                  { label: 'Bisanzwe', scale: 1.0, preset: 'normal', desc: '100% (Default)' },
                  { label: 'Nini', scale: 1.12, preset: 'medium', desc: '112% (Medium)' },
                  { label: 'Nini Cyane', scale: 1.25, preset: 'large', desc: '125% (Large)' },
                  { label: 'Ikinyuranye', scale: 1.40, preset: 'extra-large', desc: '140% (XL)' }
                ].map((item) => {
                  const currentScale = draftSettings.typography.fontScale || 1.0;
                  const isCurrent = Math.abs(currentScale - item.scale) < 0.04;
                  return (
                    <button
                      key={item.preset}
                      type="button"
                      onClick={() => updateDraftTypography({ 
                        fontScale: item.scale, 
                        fontSizePreset: item.preset as any 
                      })}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-teal-700 text-white border-teal-700 shadow-md ring-2 ring-teal-400/40 font-bold'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className={`text-[10px] ${isCurrent ? 'text-teal-100' : 'text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Slider with Increment / Decrement Buttons */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Hindura Ingano Buhoro Buhoro (Fine-tune Scale):</span>
                <span className="font-mono text-teal-800 font-bold">
                  {Math.round((draftSettings.typography.fontScale || 1.0) * 100)}% (x{(draftSettings.typography.fontScale || 1.0).toFixed(2)})
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    const current = draftSettings.typography.fontScale || 1.0;
                    const next = Math.max(0.80, Math.round((current - 0.05) * 100) / 100);
                    updateDraftTypography({ fontScale: next });
                  }}
                  className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                  title="Gabanya ingano y'inyuguti (-5%)"
                >
                  -
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min="80"
                    max="150"
                    step="5"
                    value={Math.round((draftSettings.typography.fontScale || 1.0) * 100)}
                    onChange={(e) => {
                      const scale = Number(e.target.value) / 100;
                      updateDraftTypography({ fontScale: scale });
                    }}
                    className="w-full accent-teal-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 px-0.5 mt-1 font-mono">
                    <span>80% (Ntoya)</span>
                    <span>100% (Bisanzwe)</span>
                    <span>120% (Nini)</span>
                    <span>150% (Nini Cyane)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const current = draftSettings.typography.fontScale || 1.0;
                    const next = Math.min(1.50, Math.round((current + 0.05) * 100) / 100);
                    updateDraftTypography({ fontScale: next });
                  }}
                  className="w-9 h-9 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs active:scale-95"
                  title="Ongera ingano y'inyuguti (+5%)"
                >
                  +
                </button>
              </div>
            </div>

            {/* Live Visual Preview Box */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Icyitegererezo cy'inyuguti mu buryo bugaragara ako kanya (Live Preview)</span>
              </span>
              <div 
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1 transition-all"
                style={{ fontSize: `${15 * (draftSettings.typography.fontScale || 1.0)}px` }}
              >
                <p className="font-bold text-slate-900 leading-snug">
                  ISEZERANO ONLINE – GS GITUMBA (Buyoga Sector, Rulindo District)
                </p>
                <p className="text-slate-600 leading-relaxed text-[0.9em]">
                  Urubuga rwo gutegura imfashanyigisho z'amasomo (CBC Lesson Plans) n'indangamanota z'abanyeshuri (Nursery Report Cards).
                </p>
              </div>
            </div>
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
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-900">{f.label}</span>
                      {f.category && (
                        <span className="text-[10px] text-slate-500 font-mono">({f.category})</span>
                      )}
                    </div>
                    {draftSettings.typography.fontFamily === f.value && (
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
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

      {/* TAB 6: WEBSITE SECTIONS & HOMEPAGE LAYOUT MANAGEMENT */}
      {activeTab === 'layout' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-xs font-bold text-indigo-750 uppercase tracking-wider">
                  No-Code Section Management • Imiterere y'Ibice by'Urubuga
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Guhindura, Kwimura, no Kongera Ibice by'Urubuga (Website Sections & Content)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Ongeramo ibice bishya (Announcements, Callout Cards, Rich Text, FAQs), hindura imitwe y'amagambo n'ibisobanuro, hindura urutonde rw'uko bikurikirana, cyangwa uhishe igice udashaka ko kigaragara.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewSectionLabel('');
                  setNewSectionHeadline('');
                  setNewSectionBody('');
                  setNewSectionBadge('');
                  setNewSectionBtnText('');
                  setNewSectionBtnLink('dashboard');
                  setIsAddingSection(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ongeramo Igice Gishya (Add Section)</span>
              </button>

              <button
                type="button"
                onClick={resetHomepageSectionsToDefault}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                title="Subiza ibice byose ku myanya yabyo y'umwimerere"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Subiza Ku Bisanzwe</span>
              </button>
            </div>
          </div>

          {/* Modal / Panel: Add New Custom Section */}
          {isAddingSection && (
            <div className="p-5 sm:p-6 rounded-2xl bg-indigo-50/60 border-2 border-indigo-200 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-indigo-700" />
                  <h4 className="text-sm font-bold text-indigo-950">Ongeramo Igice Gishya kuri Website (Add New Section)</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="p-1 rounded-lg hover:bg-indigo-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ubwoko bw'Igice (Section Type)</label>
                  <select
                    value={newSectionType}
                    onChange={(e) => setNewSectionType(e.target.value as SectionType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium cursor-pointer"
                  >
                    <option value="callout">Callout Banner (Ubutumwa buhebuje bufite buto)</option>
                    <option value="announcement_banner">Announcement Strip (Itegeko cyangwa itangazo)</option>
                    <option value="rich_text">Rich Text / Itangazo rirerire (Editorial / Text)</option>
                    <option value="custom_cards">Custom Cards Grid (Amakarita 3 y'amasomo/amakuru)</option>
                    <option value="faq">FAQ (Ibibazo Bikunze Kubazwa)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Izina ry'Igice (Admin Label)</label>
                  <input
                    type="text"
                    value={newSectionLabel}
                    onChange={(e) => setNewSectionLabel(e.target.value)}
                    placeholder="urugero: Itangazo rya Guhembwa cyangwa CBC Tips"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ikimenyetso / Badge Text (Optional)</label>
                  <input
                    type="text"
                    value={newSectionBadge}
                    onChange={(e) => setNewSectionBadge(e.target.value)}
                    placeholder="urugero: AMAKURU MASHYA cyangwa CBC 2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Umutwe w'Amagambo (Headline / Title)</label>
                  <input
                    type="text"
                    value={newSectionHeadline}
                    onChange={(e) => setNewSectionHeadline(e.target.value)}
                    placeholder="urugero: Ikaze ku Masomo y'Igihembwe cya Kabiri muri GS GITUMBA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ibara ry'Inyuma (Background Style)</label>
                  <select
                    value={newSectionBg}
                    onChange={(e) => setNewSectionBg(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer"
                  >
                    <option value="teal_gradient">Teal Gradient (Official)</option>
                    <option value="slate_dark">Slate Dark (Modern)</option>
                    <option value="white">White Minimal</option>
                    <option value="amber_soft">Soft Amber</option>
                    <option value="blue_soft">Soft Sky Blue</option>
                  </select>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block font-bold text-slate-800 mb-1">Ubusobanuro cyangwa Inyandiko (Body Text)</label>
                  <textarea
                    rows={3}
                    value={newSectionBody}
                    onChange={(e) => setNewSectionBody(e.target.value)}
                    placeholder="Andika amagambo yose ushaka ko agaragara muri iki gice..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Inyandiko kuri Buto (Button Label)</label>
                  <input
                    type="text"
                    value={newSectionBtnText}
                    onChange={(e) => setNewSectionBtnText(e.target.value)}
                    placeholder="urugero: Kanda Hano / Tangira"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Aho Buto Ijyana Umusomyi (Button Link / Page)</label>
                  <select
                    value={newSectionBtnLink}
                    onChange={(e) => setNewSectionBtnLink(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer"
                  >
                    <option value="dashboard">Teacher Dashboard</option>
                    <option value="create">Lesson Preparation (Create Plan)</option>
                    <option value="saved">Saved Schemes / Amasomo Yabitswe</option>
                    <option value="nursery">Nursery Report Cards</option>
                    <option value="about">About GS GITUMBA</option>
                    <option value="contact">Contact Us</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newSectionLabel.trim()) {
                      showStatus('error', "Shyiramo izina ry'igice (Admin Label) mbere yo kubika.");
                      return;
                    }
                    const newId = `sec-custom-${Date.now()}`;
                    const currentMaxOrder = (draftSettings.homepageSections || []).reduce((max, s) => Math.max(max, s.order), 0);

                    const newSec: HomepageSectionConfig = {
                      id: newId,
                      type: newSectionType,
                      label: newSectionLabel.trim(),
                      description: `Custom ${newSectionType} section created by admin`,
                      enabled: true,
                      order: currentMaxOrder + 1,
                      content: {
                        headline: newSectionHeadline.trim(),
                        bodyText: newSectionBody.trim(),
                        badgeText: newSectionBadge.trim(),
                        bgStyle: newSectionBg,
                        primaryButtonText: newSectionBtnText.trim() || undefined,
                        primaryButtonLink: newSectionBtnLink,
                        cards: newSectionType === 'custom_cards' ? [
                          { id: 'c1', title: 'Icyiciro cya 1', description: 'Amakuru n\'imfashanyigisho z\'amasomo', badge: 'REB' },
                          { id: 'c2', title: 'Icyiciro cya 2', description: 'Integanyanyigisho za CBC 2026', badge: 'CBC' },
                          { id: 'c3', title: 'Icyiciro cya 3', description: 'Gusuzuma no gutanga amanota', badge: 'EVAL' }
                        ] : newSectionType === 'faq' ? [
                          { id: 'f1', title: 'Uburyo bwo gutegura isomo rya CBC?', description: 'Kanda kuri Lesson Preparation uhitemo ibipimo bya REB.' },
                          { id: 'f2', title: 'Ese raporo z\'inshuke zirasaba amafaranga?', description: 'Oya, byose bikoreshwa ku buntu 100% nta kiguzi.' }
                        ] : undefined
                      }
                    };

                    addHomepageSection(newSec);
                    setIsAddingSection(false);
                    showStatus('success', `Igice "${newSec.label}" cyongerewe neza! Kanda "Publish Draft Changes" ngo kigaragare ku rubuga.`);
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Ongeramo Igice
                </button>
              </div>
            </div>
          )}

          {/* Modal / Editor: Edit Section Content */}
          {editingSection && (
            <div className="p-5 sm:p-6 rounded-2xl bg-amber-50/60 border-2 border-amber-300 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center space-x-2">
                  <Edit2 className="w-4 h-4 text-amber-800" />
                  <h4 className="text-sm font-bold text-amber-950">
                    Guhindura Inyandiko n'Imiterere: {editingSection.label}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="p-1 rounded-lg hover:bg-amber-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Izina ry'Igice (Section Label)</label>
                  <input
                    type="text"
                    value={editingSection.label}
                    onChange={(e) => setEditingSection({ ...editingSection, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ikimenyetso cyo Hejuru (Badge Text)</label>
                  <input
                    type="text"
                    value={editingSection.content?.badgeText || ''}
                    onChange={(e) => setEditingSection({
                      ...editingSection,
                      content: { ...editingSection.content, badgeText: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Umutwe w'Amagambo (Headline)</label>
                  <input
                    type="text"
                    value={editingSection.content?.headline || ''}
                    onChange={(e) => setEditingSection({
                      ...editingSection,
                      content: { ...editingSection.content, headline: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-800 mb-1">Ubusobanuro burambuye (Body Text / Narrative)</label>
                  <textarea
                    rows={4}
                    value={editingSection.content?.bodyText || ''}
                    onChange={(e) => setEditingSection({
                      ...editingSection,
                      content: { ...editingSection.content, bodyText: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Inyandiko kuri Buto ya 1 (Button 1 Text)</label>
                  <input
                    type="text"
                    value={editingSection.content?.primaryButtonText || ''}
                    onChange={(e) => setEditingSection({
                      ...editingSection,
                      content: { ...editingSection.content, primaryButtonText: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Aho Buto ya 1 Igana (Button 1 Target)</label>
                  <input
                    type="text"
                    value={editingSection.content?.primaryButtonLink || ''}
                    onChange={(e) => setEditingSection({
                      ...editingSection,
                      content: { ...editingSection.content, primaryButtonLink: e.target.value }
                    })}
                    placeholder="dashboard, create, nursery, about, contact..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateHomepageSection(editingSection.id, {
                      label: editingSection.label,
                      content: editingSection.content
                    });
                    setEditingSection(null);
                    showStatus('success', `Inyandiko z'igice "${editingSection.label}" zahinduwe neza muri Draft.`);
                  }}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm cursor-pointer"
                >
                  Bika Impinduka z'Iki Gice
                </button>
              </div>
            </div>
          )}

          {/* Sections List */}
          <div className="space-y-4">
            {(() => {
              const currentSections = [...(draftSettings.homepageSections || DEFAULT_HOMEPAGE_SECTIONS)];
              currentSections.sort((a, b) => a.order - b.order);

              return currentSections.map((sec, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === currentSections.length - 1;
                const isCustom = sec.id.startsWith('sec-custom-');

                return (
                  <div
                    key={sec.id}
                    className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                      sec.enabled
                        ? 'border-slate-200 bg-white shadow-2xs hover:border-indigo-300'
                        : 'border-slate-200 bg-slate-50/70 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Position badge, title & description */}
                      <div className="flex items-start space-x-3.5">
                        <div className={`w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 ${
                          sec.enabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-200 text-slate-600'
                        }`}>
                          #{idx + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {sec.label}
                            </h4>
                            {isCustom && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-extrabold border border-indigo-200">
                                Custom
                              </span>
                            )}
                            {sec.enabled ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                                Visible / Biragaragara
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                Hidden / Byahishwe
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {sec.content?.headline || sec.description}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions (Edit Content, Move Up, Move Down, Toggle Show/Hide, Delete) */}
                      <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                        {/* Edit Content */}
                        <button
                          type="button"
                          onClick={() => setEditingSection(sec)}
                          className="p-2 rounded-xl text-xs font-bold border border-slate-300 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-colors cursor-pointer text-slate-700"
                          title="Hindura inyandiko n'amagambo by'iki gice (Edit Text/Content)"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => reorderHomepageSection(sec.id, 'up')}
                          disabled={isFirst}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isFirst
                              ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                              : 'text-slate-700 border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300'
                          }`}
                          title="Imura ujyane hejuru (Move Up)"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => reorderHomepageSection(sec.id, 'down')}
                          disabled={isLast}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isLast
                              ? 'text-slate-300 border-slate-200 bg-slate-50 cursor-not-allowed'
                              : 'text-slate-700 border-slate-300 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300'
                          }`}
                          title="Imura ujyane hasi (Move Down)"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        {/* Toggle Visibility */}
                        <button
                          type="button"
                          onClick={() => toggleHomepageSection(sec.id)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            sec.enabled
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-teal-600 hover:bg-teal-500 text-white'
                          }`}
                          title={sec.enabled ? 'Hisha iki gice kuri website' : 'Garagaza iki gice kuri website'}
                        >
                          {sec.enabled ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hisha</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Garagaza</span>
                            </>
                          )}
                        </button>

                        {/* Delete Custom Section */}
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Urashaka gusiba igice "${sec.label}" burundu muri draft?`)) {
                                deleteHomepageSection(sec.id);
                                showStatus('success', `Igice "${sec.label}" cyasibwe muri draft.`);
                              }
                            }}
                            className="p-2 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Siba iki gice (Delete Section)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Section Options (Granular controls) */}
                    {sec.enabled && sec.options && (
                      <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {Object.entries(sec.options).map(([optKey, optVal]) => {
                          const optLabels: Record<string, string> = {
                            showDateLocationTicker: "Garagaza Itariki n'Akarere (Date & Location Ticker)",
                            showInstitutionalBadge: "Garagaza Ikimenyetso cy'Uburezi (Institutional Badge)",
                            showLessonPlanButton: "Buto ya 'Tangira Gutegura Isomo'",
                            showReportCardsButton: "Buto ya 'Indangamanota z'Inshuke'",
                            showDashboardButton: "Buto ya 'Dashboard y'Uburezi'",
                            showGuaranteeBadges: "Amagambo y'ubwishingizi (100% Free / CBC / Mobile)",
                            showLessonPlannerCard: "Ikarita ya 'Lesson Preparation (8 Inkingi)'",
                            showReportCardsCard: "Ikarita ya 'Nursery Report Cards (Ibipimo 22)'",
                            showAboutButton: "Buto ya 'Ibyerekeye GS GITUMBA (About Us)'",
                            showContactButton: "Buto ya 'Twandikire cyangwa Duhamagare'"
                          };

                          const labelText = optLabels[optKey] || optKey;

                          return (
                            <label
                              key={optKey}
                              className="flex items-center space-x-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer select-none border border-slate-200/60"
                            >
                              <input
                                type="checkbox"
                                checked={optVal}
                                onChange={(e) => updateHomepageSectionOption(sec.id, optKey, e.target.checked)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-[11px] font-medium text-slate-700">
                                {labelText}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TAB 7: NAVIGATION MENUS MANAGER */}
      {activeTab === 'menus' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <MenuIcon className="w-4 h-4 text-teal-700" />
                <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                  Navigation Menu Builder • Ibikubiye muri Menu
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Guhindura no Kongeramo Imiyoboro ya Menu (Header & Footer Links)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Cunga imiyoboro yose igaragara hejuru muri Header no hasi muri Footer. Ushobora kongeraho amashami mashya, guhindura amazina, kwimura ibice hejuru cyangwa hasi, no guhisha amashami udashaka.
              </p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setNewNavLabel('');
                  setNewNavPath('home');
                  setNewNavIcon('BookOpen');
                  setNewNavBadge('');
                  setNewNavBadgeColor('teal');
                  setNewNavLocation('both');
                  setNewNavExternal(false);
                  setIsAddingNavMenu(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ongeramo Umuyoboro Mushya (Add Menu Item)</span>
              </button>

              <button
                type="button"
                onClick={resetNavigationMenusToDefault}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Subiza Ku Bisanzwe</span>
              </button>
            </div>
          </div>

          {/* Modal / Panel: Add Navigation Menu Item */}
          {isAddingNavMenu && (
            <div className="p-5 sm:p-6 rounded-2xl bg-teal-50/70 border-2 border-teal-300 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-teal-200 pb-3">
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4 text-teal-800" />
                  <h4 className="text-sm font-bold text-teal-950">Ongeramo Umuyoboro Mushya muri Menu</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNavMenu(false)}
                  className="p-1 rounded-lg hover:bg-teal-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Izina ry'Umuyoboro (Menu Label)</label>
                  <input
                    type="text"
                    value={newNavLabel}
                    onChange={(e) => setNewNavLabel(e.target.value)}
                    placeholder="urugero: Gahunda y'Amasomo cyangwa Blog"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ipaji cyangwa URL (Target Link)</label>
                  <input
                    type="text"
                    value={newNavPath}
                    onChange={(e) => setNewNavPath(e.target.value)}
                    placeholder="home, dashboard, create, nursery, about, contact..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Aho Bizagaragara (Location)</label>
                  <select
                    value={newNavLocation}
                    onChange={(e) => setNewNavLocation(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer"
                  >
                    <option value="both">Header na Footer (Both)</option>
                    <option value="header">Hejuru muri Header gusa</option>
                    <option value="footer">Hasi muri Footer gusa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ikimenyetso cy'Inyuma (Icon)</label>
                  <select
                    value={newNavIcon}
                    onChange={(e) => setNewNavIcon(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer"
                  >
                    <option value="BookOpen">BookOpen (Igitabo)</option>
                    <option value="Award">Award (Igihembo / Nursery)</option>
                    <option value="ShieldCheck">ShieldCheck (Umutekano / Admin)</option>
                    <option value="FileText">FileText (Inyandiko)</option>
                    <option value="GraduationCap">GraduationCap (Uburezi)</option>
                    <option value="User">User (Umwirondoro)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Akarango k'Ibara (Badge / Tag)</label>
                  <input
                    type="text"
                    value={newNavBadge}
                    onChange={(e) => setNewNavBadge(e.target.value)}
                    placeholder="urugero: GISHYA, N1-N3, CBC..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Ibara ry'Akarango (Badge Color)</label>
                  <select
                    value={newNavBadgeColor}
                    onChange={(e) => setNewNavBadgeColor(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white cursor-pointer"
                  >
                    <option value="teal">Teal (Icyatsi kibisi)</option>
                    <option value="amber">Amber (Icyatsi cy'umuhondo)</option>
                    <option value="blue">Sky Blue (Ubururu)</option>
                    <option value="rose">Rose (Umutuku w'iroza)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNavMenu(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reka (Cancel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newNavLabel.trim() || !newNavPath.trim()) {
                      showStatus('error', "Shyiramo izina n'ipaji by'umuyoboro.");
                      return;
                    }
                    addNavigationMenuItem({
                      label: newNavLabel.trim(),
                      path: newNavPath.trim(),
                      location: newNavLocation,
                      icon: newNavIcon,
                      badge: newNavBadge.trim() || undefined,
                      badgeColor: newNavBadgeColor,
                      enabled: true,
                      isExternal: newNavPath.startsWith('http://') || newNavPath.startsWith('https://')
                    });
                    setIsAddingNavMenu(false);
                    showStatus('success', `Umuyoboro "${newNavLabel}" wongerewe muri menu.`);
                  }}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  Ongeramo Umuyoboro
                </button>
              </div>
            </div>
          )}

          {/* Navigation Items List */}
          <div className="space-y-3">
            {(() => {
              const currentMenus = [...(draftSettings.navigationMenus || DEFAULT_NAVIGATION_MENUS)];
              currentMenus.sort((a, b) => a.order - b.order);

              return currentMenus.map((item, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === currentMenus.length - 1;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      item.enabled
                        ? 'border-slate-200 bg-white shadow-2xs'
                        : 'border-slate-200 bg-slate-50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                        #{idx + 1}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                              {item.badge}
                            </span>
                          )}
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                            {item.location}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          Target: {item.path}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => reorderNavigationMenuItem(item.id, 'up')}
                        disabled={isFirst}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isFirst ? 'text-slate-300 border-slate-200 bg-slate-50' : 'text-slate-700 border-slate-300 hover:bg-teal-50'
                        }`}
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => reorderNavigationMenuItem(item.id, 'down')}
                        disabled={isLast}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isLast ? 'text-slate-300 border-slate-200 bg-slate-50' : 'text-slate-700 border-slate-300 hover:bg-teal-50'
                        }`}
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleNavigationMenuItem(item.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          item.enabled
                            ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                            : 'bg-teal-700 text-white hover:bg-teal-600'
                        }`}
                      >
                        {item.enabled ? 'Hisha' : 'Garagaza'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Urashaka gusiba umuyoboro "${item.label}"?`)) {
                            deleteNavigationMenuItem(item.id);
                            showStatus('success', `Umuyoboro "${item.label}" wasibwe.`);
                          }
                        }}
                        className="p-2 rounded-xl text-xs font-bold border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Delete Menu Link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* TAB 9: VERSION HISTORY & RESTORE (1-CLICK UNDO & ROLLBACK) */}
      {activeTab === 'history' && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Version Control &amp; Restore Manager
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                Amateka y'Ibyahinduwe no Gusubiza Inyuma (Undo &amp; Restore)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Buri gihe utangaje impinduka (Publish), ikoranabuhanga rya Firebase ribika ifoto y'amabara, inyuguti, ibice by'urubuga, na menu byariho. Ushobora gusubiza inyuma (Restore) igihe icyo ari cyo cyose ku kanda rimwe gusa.
              </p>
            </div>

            {isDraftDirty && (
              <button
                type="button"
                onClick={() => {
                  undoDraftChanges();
                  showStatus('success', 'Impinduka zose zo muri Draft zahanaguwe! Yasubiye ku byari bisanzwe.');
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <Undo2 className="w-4 h-4" />
                <span>Undo Unsaved Draft Changes</span>
              </button>
            )}
          </div>

          {/* Versions List */}
          <div className="space-y-3">
            {(!versionHistory || versionHistory.length === 0) ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 space-y-2">
                <History className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">Nta mateka y'impinduka arashyirwamo (No versions recorded yet)</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Iyo uhinduye ikintu ukanda "Publish Draft Changes", version ya mbere ihita ibikwa hano ku buryo bworoshye.
                </p>
              </div>
            ) : (
              versionHistory.map((ver, idx) => {
                const dateObj = new Date(ver.timestamp);
                const formattedDate = dateObj.toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={ver.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                          Snapshot #{versionHistory.length - idx}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{formattedDate}</span>
                        <span className="text-[11px] text-slate-500 font-mono">by {ver.publishedBy}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">
                        {ver.note || 'Impinduka zemejwe n\'umuyobozi w\'urubuga (twizerefelix90@gmail.com)'}
                      </p>
                      <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-500">
                        <span>Palette: <span className="font-semibold text-slate-700">{ver.snapshot.colors.primaryButtonBg}</span></span>
                        <span>•</span>
                        <span>Title: <span className="font-semibold text-slate-700">{ver.snapshot.branding.platformTitle}</span></span>
                        <span>•</span>
                        <span>Sections: <span className="font-semibold text-slate-700">{ver.snapshot.homepageSections?.length || 4}</span></span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Urashaka koko gusubiza inyuma website ku ifoto yo ku ya ${formattedDate}?`)) {
                            const res = await restoreVersion(ver);
                            if (res.success) {
                              showStatus('success', `🎉 Website yasubijwe ku buryo bwo ku ya ${formattedDate}!`);
                            } else {
                              showStatus('error', res.error || 'Failed to restore version.');
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer inline-flex items-center space-x-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Subiza Iyi Version (Restore)</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 7: LIVE PREVIEW (Desktop & Mobile Simulation) */}
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
                <div className="flex items-center space-x-2.5 min-w-0">
                  {draftSettings.logo.showInHeader && draftSettings.logo.logoUrl && (
                    <div 
                      className={`overflow-hidden shrink-0 bg-white border border-slate-200 ${draftSettings.logo.borderRadius}`}
                      style={{
                        height: `${Math.min(draftSettings.logo.displayHeight, 44)}px`,
                        width: `${Math.min(draftSettings.logo.displayHeight, 44)}px`
                      }}
                    >
                      <img 
                        src={draftSettings.logo.logoUrl} 
                        alt="Logo Preview" 
                        className={`w-full h-full object-${draftSettings.logo.displayFit}`}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    {draftSettings.branding?.showWebsiteName !== false && (
                      <>
                        <h5 
                          className="font-bold leading-tight truncate"
                          style={{ fontSize: `${draftSettings.typography.websiteTitleSize}px` }}
                        >
                          {draftSettings.branding?.platformTitle || 'ISEZERANO ONLINE'}
                        </h5>
                        {draftSettings.branding?.platformSubtitle && (
                          <span 
                            className="text-slate-500 block truncate"
                            style={{ fontSize: `${draftSettings.typography.websiteSubtitleSize}px` }}
                          >
                            {draftSettings.branding.platformSubtitle}
                          </span>
                        )}
                      </>
                    )}
                    {draftSettings.branding?.showWebsiteDescription !== false && draftSettings.branding?.websiteDescription?.trim() && (
                      <span className="text-[11px] text-slate-500 block truncate">
                        {draftSettings.branding.websiteDescription}
                      </span>
                    )}
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
                  {draftSettings.logo.showInFooter && draftSettings.logo.logoUrl && (
                    <div 
                      className={`overflow-hidden bg-white/10 ${draftSettings.logo.borderRadius}`}
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
                  {draftSettings.branding?.showWebsiteName !== false && (
                    <h6 
                      className="font-bold"
                      style={{ 
                        color: draftSettings.colors.footerHeadingText,
                        fontSize: `${draftSettings.typography.footerSize}px`
                      }}
                    >
                      {draftSettings.branding?.platformTitle || 'ISEZERANO ONLINE'} – {draftSettings.branding?.platformSubtitle || 'GS GITUMBA'}
                    </h6>
                  )}
                </div>
                {draftSettings.branding?.showWebsiteDescription !== false && (
                  <p 
                    className="leading-relaxed opacity-90"
                    style={{ fontSize: `${draftSettings.typography.footerSize - 1}px` }}
                  >
                    {draftSettings.branding?.websiteDescription || draftSettings.branding?.schoolLocation || 'Buyoga Sector, Rulindo District, Northern Province, Rwanda.'}
                  </p>
                )}
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

const normalizeHexForPicker = (hex: string): string => {
  if (!hex) return '#ffffff';
  let cleaned = hex.trim();
  if (!cleaned.startsWith('#')) cleaned = `#${cleaned}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned;
  return '#ffffff';
};

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
        {fields.map((f) => {
          const displayHex = f.value || '#ffffff';
          const pickerVal = normalizeHexForPicker(displayHex);

          return (
            <div 
              key={f.key}
              className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between space-x-3 transition-colors hover:border-slate-300"
            >
              <div className="flex-1 min-w-0">
                <span className="block text-xs font-semibold text-slate-700 truncate">{f.label}</span>
                <div className="flex items-center space-x-2 mt-1">
                  <input 
                    type="text" 
                    value={f.value}
                    onChange={(e) => {
                      let val = e.target.value.trim();
                      if (val && !val.startsWith('#') && /^[0-9A-Fa-f]{3,6}$/.test(val)) {
                        val = `#${val}`;
                      }
                      onChange(f.key, val);
                    }}
                    className="w-22 px-2 py-0.5 text-xs font-mono font-semibold uppercase border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => onReset(f.key)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded"
                    title="Reset this color"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Native Color Picker Circle */}
              <label 
                className="relative w-8 h-8 rounded-full border border-slate-300 shadow-2xs overflow-hidden cursor-pointer shrink-0 block hover:scale-105 transition-transform"
                title={`Click to pick color for ${f.label}`}
              >
                <input 
                  type="color" 
                  value={pickerVal}
                  onChange={(e) => onChange(f.key, e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
                <span 
                  className="block w-full h-full" 
                  style={{ backgroundColor: displayHex }} 
                />
              </label>
            </div>
          );
        })}
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
