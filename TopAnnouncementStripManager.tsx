import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Type, 
  Palette, 
  Sliders, 
  Smartphone, 
  Monitor, 
  Link as LinkIcon, 
  Tag, 
  Clock, 
  Check, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  ExternalLink
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { TopAnnouncementTicker } from './TopAnnouncementTicker';
import { 
  AnnouncementStripSettings, 
  AnnouncementItem, 
  DEFAULT_ANNOUNCEMENT_STRIP 
} from '../types/websiteDesign';

// Curated font families for the announcement strip
const ANNOUNCEMENT_FONT_PRESETS = [
  {
    id: 'system',
    label: 'Modern Clean Sans (Inter / System UI)',
    value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  {
    id: 'times',
    label: 'Times New Roman (REB Academic Standard)',
    value: "'Times New Roman', Times, Baskerville, Georgia, serif"
  },
  {
    id: 'georgia',
    label: 'Georgia (Pedagogical Book Serif)',
    value: "Georgia, Cambria, 'Times New Roman', Times, serif"
  },
  {
    id: 'roboto',
    label: 'Roboto / Segoe UI',
    value: "Roboto, 'Segoe UI', Arial, sans-serif"
  },
  {
    id: 'mono',
    label: 'Editorial Monospace',
    value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
  }
];

// Presets for font color
const TEXT_COLOR_PRESETS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Warm Cream', hex: '#fef3c7' },
  { name: 'Soft Amber', hex: '#fde047' },
  { name: 'Cyan Ice', hex: '#cffafe' },
  { name: 'Light Slate', hex: '#f1f5f9' },
  { name: 'Dark Slate', hex: '#0f172a' }
];

// Presets for background color
const BG_COLOR_PRESETS = [
  { name: 'Brand Teal (Official)', hex: '#0f766e' },
  { name: 'Dark Navy Press', hex: '#0f172a' },
  { name: 'Academic Emerald', hex: '#064e3b' },
  { name: 'Royal Press Blue', hex: '#1e3a8a' },
  { name: 'Warm Burgundy', hex: '#831843' },
  { name: 'Deep Midnight', hex: '#020617' },
  { name: 'Rich Amber Gold', hex: '#b45309' },
  { name: 'Ruby Red Alert', hex: '#991b1b' }
];

export const TopAnnouncementStripManager: React.FC = () => {
  const {
    draftSettings,
    updateDraftAnnouncements,
    addAnnouncementMessage,
    updateAnnouncementMessage,
    deleteAnnouncementMessage,
    reorderAnnouncementMessage,
    resetSectionToDefault,
    publishSettings,
    isPublishing,
    isDraftDirty
  } = useWebsiteDesign();

  const announcements: AnnouncementStripSettings = draftSettings.announcements || DEFAULT_ANNOUNCEMENT_STRIP;

  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newText, setNewText] = useState('');
  const [newBadge, setNewBadge] = useState('AMAKURU');
  const [newLink, setNewLink] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setSaveStatus({ type, message });
    setTimeout(() => setSaveStatus(null), 6000);
  };

  const handleSave = async () => {
    try {
      const result = await publishSettings();
      if (result.success) {
        showFeedback(
          'success',
          '🎉 Top Announcement Strip settings saved and published to Cloud Firestore! Visible live across all devices.'
        );
      } else {
        showFeedback('error', result.error || 'Failed to publish announcement settings.');
      }
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Error publishing settings');
    }
  };

  const handleAddNewMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    addAnnouncementMessage(newText, newBadge, newLink);
    setNewText('');
    setNewLink('');
    setShowAddForm(false);
    showFeedback('success', 'New announcement added to draft!');
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Interactive Announcement Ticker</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            Top Announcement Strip & Dynamic Ticker
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Display rotating headlines, breaking press releases, and pedagogical announcements at the very top of every website page. Customize fonts, colors, and transitions, and save them globally to Firebase.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              resetSectionToDefault('announcements');
              showFeedback('success', 'Announcement strip restored to defaults in draft.');
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Restore default announcements"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isPublishing}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer ${
              isDraftDirty 
                ? 'bg-teal-700 hover:bg-teal-600 ring-2 ring-teal-500/30' 
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {isPublishing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Publishing to Cloud...</span>
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

      {/* Status Feedback Banner */}
      {saveStatus && (
        <div 
          className={`p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed transition-all ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          {saveStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{saveStatus.message}</span>
        </div>
      )}

      {/* 2. Interactive Live Preview Frame */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
            <Eye className="w-4 h-4 text-teal-400" />
            <span>Live Interactive Preview</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Live updates as you edit
            </span>
          </div>

          {/* Device Toggle */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1.5 transition-colors cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-teal-600 text-white shadow-2xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile Phone</span>
            </button>
          </div>
        </div>

        {/* Live Ticker Preview Container */}
        <div className="pt-2 flex justify-center">
          <div 
            className={`w-full transition-all duration-300 overflow-hidden rounded-xl border border-slate-700 shadow-md ${
              previewDevice === 'mobile' ? 'max-w-sm' : 'max-w-full'
            }`}
          >
            {announcements.enabled ? (
              <TopAnnouncementTicker 
                overrideSettings={announcements} 
                isPreview={true} 
              />
            ) : (
              <div className="p-4 text-center bg-slate-800 text-slate-400 text-xs italic">
                Announcement strip is currently disabled. Toggle &quot;Enable Strip&quot; below to make it visible.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Master Ticker Controls & Behavior */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
        
        {/* Toggle 1: Master Enable / Disable */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <span className="block text-xs font-bold text-slate-800">
              Announcement Strip Visibility
            </span>
            <span className="block text-[11px] text-slate-500">
              Show or hide the top announcement strip across the website.
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
            <input
              type="checkbox"
              checked={announcements.enabled}
              onChange={(e) => updateDraftAnnouncements({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        {/* Toggle 2: Animation Transition Effect */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <label className="block text-xs font-bold text-slate-800">
            Transition Animation Effect
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateDraftAnnouncements({ transitionEffect: 'slide' })}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                announcements.transitionEffect === 'slide'
                  ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Smooth Vertical Slide
            </button>
            <button
              type="button"
              onClick={() => updateDraftAnnouncements({ transitionEffect: 'fade' })}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                announcements.transitionEffect === 'fade'
                  ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Cross-Fade Transition
            </button>
          </div>
        </div>

        {/* Rotation Speed & Interval */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Message Rotation Speed
            </label>
            <span className="text-xs font-mono font-bold text-teal-700">
              {announcements.rotationIntervalSeconds || 5} seconds
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {[3, 5, 7, 10].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => updateDraftAnnouncements({ rotationIntervalSeconds: sec })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  announcements.rotationIntervalSeconds === sec
                    ? 'border-teal-600 bg-teal-700 text-white font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>
          <input
            type="range"
            min="2"
            max="15"
            step="1"
            value={announcements.rotationIntervalSeconds || 5}
            onChange={(e) => updateDraftAnnouncements({ rotationIntervalSeconds: parseInt(e.target.value, 10) })}
            className="w-full accent-teal-600 cursor-pointer mt-1"
          />
        </div>

        {/* Display Toggles */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Display Preferences
          </label>
          <div className="grid grid-cols-2 gap-2 text-slate-700">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={announcements.pauseOnHover}
                onChange={(e) => updateDraftAnnouncements({ pauseOnHover: e.target.checked })}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-[11px]">Pause on hover</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={announcements.showNavigationArrows !== false}
                onChange={(e) => updateDraftAnnouncements({ showNavigationArrows: e.target.checked })}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-[11px]">Arrows (Next/Prev)</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={announcements.showBadgePill !== false}
                onChange={(e) => updateDraftAnnouncements({ showBadgePill: e.target.checked })}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-[11px]">Category badges</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={announcements.showDismissButton !== false}
                onChange={(e) => updateDraftAnnouncements({ showDismissButton: e.target.checked })}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="text-[11px]">Dismiss (X) button</span>
            </label>
          </div>
        </div>

      </div>

      {/* 4. Typography & Color Controls */}
      <div className="space-y-6">
        <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-teal-700" />
            <h4 className="text-sm font-bold text-slate-900">
              Announcement Strip Typography & Colors
            </h4>
          </div>
          <span className="text-xs text-slate-500">Live styling applied across all devices</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* A. Font Family */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Font Family (Typeface)
            </label>
            <select
              value={announcements.fontFamily || ANNOUNCEMENT_FONT_PRESETS[0].value}
              onChange={(e) => updateDraftAnnouncements({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white text-slate-800 font-semibold"
            >
              {ANNOUNCEMENT_FONT_PRESETS.map((font) => (
                <option key={font.id} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Matches academic publication or clean modern digital style.
            </p>
          </div>

          {/* B. Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Font Size
              </label>
              <span className="text-xs font-mono font-bold text-teal-700">
                {announcements.fontSize || 13}px
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              {[11, 12, 13, 14, 15, 16].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => updateDraftAnnouncements({ fontSize: sz })}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    announcements.fontSize === sz
                      ? 'border-teal-600 bg-teal-700 text-white font-bold'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="11"
              max="18"
              step="1"
              value={announcements.fontSize || 13}
              onChange={(e) => updateDraftAnnouncements({ fontSize: parseInt(e.target.value, 10) })}
              className="w-full accent-teal-600 cursor-pointer"
            />
          </div>

          {/* C. Text Alignment & Weight */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              Text Alignment & Weight
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => updateDraftAnnouncements({ textAlign: 'left' })}
                className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  announcements.textAlign === 'left'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Left Align"
              >
                <AlignLeft className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Left</span>
              </button>

              <button
                type="button"
                onClick={() => updateDraftAnnouncements({ textAlign: 'center' })}
                className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  announcements.textAlign === 'center'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Center Align"
              >
                <AlignCenter className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Center</span>
              </button>

              <button
                type="button"
                onClick={() => updateDraftAnnouncements({ textAlign: 'right' })}
                className={`flex-1 py-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                  announcements.textAlign === 'right'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Right Align"
              >
                <AlignRight className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Right</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              {(['medium', 'semibold', 'bold'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => updateDraftAnnouncements({ fontWeight: w })}
                  className={`flex-1 py-1 text-[11px] capitalize rounded-md border transition-all cursor-pointer ${
                    (announcements.fontWeight || 'semibold') === w
                      ? 'border-teal-600 bg-teal-700 text-white font-bold'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* D. Font Color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Font Color
              </label>
              <span className="text-xs font-mono text-slate-600 uppercase">
                {announcements.textColor || '#ffffff'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={announcements.textColor || '#ffffff'}
                onChange={(e) => updateDraftAnnouncements({ textColor: e.target.value })}
                className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
              />
              <input
                type="text"
                value={announcements.textColor || '#ffffff'}
                onChange={(e) => updateDraftAnnouncements({ textColor: e.target.value })}
                className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white"
                placeholder="#ffffff"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center space-x-1.5 pt-1">
              {TEXT_COLOR_PRESETS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => updateDraftAnnouncements({ textColor: color.hex })}
                  className="w-6 h-6 rounded-md border border-slate-300 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* E. Background Color */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Background Color
              </label>
              <span className="text-xs font-mono text-slate-600 uppercase">
                {announcements.backgroundColor || '#0f766e'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={announcements.backgroundColor || '#0f766e'}
                onChange={(e) => updateDraftAnnouncements({ backgroundColor: e.target.value })}
                className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white shrink-0"
              />
              <input
                type="text"
                value={announcements.backgroundColor || '#0f766e'}
                onChange={(e) => updateDraftAnnouncements({ backgroundColor: e.target.value })}
                className="w-40 px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white"
                placeholder="#0f766e"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {BG_COLOR_PRESETS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => updateDraftAnnouncements({ backgroundColor: c.hex })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center space-x-1.5 transition-transform hover:scale-102 cursor-pointer ${
                    announcements.backgroundColor === c.hex 
                      ? 'ring-2 ring-teal-500 font-bold border-teal-500' 
                      : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: c.hex, color: '#ffffff' }}
                >
                  <span className="w-2 h-2 rounded-full bg-white/70" />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* 5. Multiple Announcement Messages Manager */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Announcement Messages List ({announcements.messages.length})
            </h4>
            <p className="text-xs text-slate-500">
              Add multiple announcements that rotate automatically in the ticker. Reorder or pause individual messages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Announcement</span>
          </button>
        </div>

        {/* Modal / Card Form to Add New Message */}
        {showAddForm && (
          <form 
            onSubmit={handleAddNewMessage}
            className="bg-slate-50 p-5 rounded-2xl border-2 border-teal-500/50 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-teal-900 flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5 text-teal-600" />
                <span>New Announcement Message</span>
              </span>
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Message Content (Required)
              </label>
              <textarea
                rows={2}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. Abanyeshuri n'Abarimu ba GS GITUMBA bakiriwe mu gihembwe cya kabiri..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Tag / Category Badge
                </label>
                <input
                  type="text"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  placeholder="e.g. AMAKURU, UBUREZI, CBC 2026"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white uppercase font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Clickable Destination URL (Optional)
                </label>
                <input
                  type="text"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="e.g. /blog/post-slug, /dashboard, https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-600 rounded-lg shadow-sm cursor-pointer"
              >
                Add Announcement
              </button>
            </div>
          </form>
        )}

        {/* List of Messages */}
        <div className="space-y-3">
          {announcements.messages.map((msg, index) => (
            <div 
              key={msg.id}
              className={`p-4 rounded-xl border transition-all ${
                msg.active !== false 
                  ? 'bg-white border-slate-200 shadow-2xs' 
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                
                {/* Left: Reorder, Index, Badge & Text */}
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  
                  {/* Reorder Up/Down */}
                  <div className="flex flex-col space-y-0.5 shrink-0 pt-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => reorderAnnouncementMessage(msg.id, 'up')}
                      className={`p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${
                        index === 0 ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                      title="Move up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === announcements.messages.length - 1}
                      onClick={() => reorderAnnouncementMessage(msg.id, 'down')}
                      className={`p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${
                        index === announcements.messages.length - 1 ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                      title="Move down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Index badge */}
                  <span className="text-xs font-mono font-bold text-slate-400 shrink-0 mt-1">
                    #{index + 1}
                  </span>

                  {/* Content Inputs */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={msg.badge || ''}
                        onChange={(e) => updateAnnouncementMessage(msg.id, { badge: e.target.value.toUpperCase() })}
                        placeholder="TAG"
                        className="w-24 px-2 py-1 text-[11px] font-extrabold uppercase rounded border border-slate-300 focus:ring-1 focus:ring-teal-500 bg-slate-50"
                        title="Category badge (e.g. AMAKURU)"
                      />
                      <input
                        type="text"
                        value={msg.text}
                        onChange={(e) => updateAnnouncementMessage(msg.id, { text: e.target.value })}
                        placeholder="Announcement message..."
                        className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <LinkIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={msg.linkUrl || ''}
                        onChange={(e) => updateAnnouncementMessage(msg.id, { linkUrl: e.target.value })}
                        placeholder="Link URL (e.g. /blog/post-slug or https://...)"
                        className="flex-1 px-2 py-1 text-[11px] font-mono text-slate-600 rounded border border-slate-200 focus:ring-1 focus:ring-teal-500 bg-slate-50/50"
                      />
                    </div>
                  </div>

                </div>

                {/* Right: Actions (Active Toggle & Delete) */}
                <div className="flex items-center space-x-3 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={msg.active !== false}
                      onChange={(e) => updateAnnouncementMessage(msg.id, { active: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-[11px]">{msg.active !== false ? 'Active' : 'Paused'}</span>
                  </label>

                  {announcements.messages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteAnnouncementMessage(msg.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete announcement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Bottom Sticky Save Action Bar */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 p-6 rounded-b-2xl">
        <div className="text-xs text-slate-500">
          {isDraftDirty ? (
            <span className="text-amber-700 font-semibold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              <span>You have unsaved announcement changes. Click &quot;Save &amp; Publish Announcements&quot; to push live.</span>
            </span>
          ) : (
            <span>All announcement changes are synced with Cloud Firestore.</span>
          )}
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPublishing}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            {isPublishing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Publishing to Cloud...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save &amp; Publish Announcements</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
};
