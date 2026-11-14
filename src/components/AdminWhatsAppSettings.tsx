import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  MessageCircle,
  Monitor,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Smartphone,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import {
  DEFAULT_WHATSAPP_CONTACT,
  WhatsAppButtonDisplayMode,
  WhatsAppButtonPosition,
  WhatsAppButtonShape,
  WhatsAppButtonSize,
  WhatsAppContactSettings
} from '../types/websiteDesign';
import {
  buildWhatsAppChatUrl,
  formatWhatsAppDisplayNumber,
  normalizeWhatsAppSettings,
  validateAndNormalizeWhatsAppNumber
} from '../utils/whatsappUtils';
import { WhatsAppButtonView } from './WhatsAppFloatingButton';

const BG_COLOR_PRESETS = [
  { label: 'WhatsApp Green', value: '#25D366' },
  { label: 'Deep WhatsApp', value: '#128C7E' },
  { label: 'Editorial Teal', value: '#0f766e' },
  { label: 'Newspaper Ink', value: '#0f172a' }
];

const TEXT_COLOR_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Dark Ink', value: '#0f172a' }
];

export const AdminWhatsAppSettings: React.FC = () => {
  const { isAdmin } = useAuth();
  const { whatsappContact, saveWhatsAppContactSettings, isPublishing } = useWebsiteDesign();

  const [draft, setDraft] = useState<WhatsAppContactSettings>(() =>
    normalizeWhatsAppSettings(whatsappContact)
  );
  const [phoneInput, setPhoneInput] = useState<string>(whatsappContact.phoneNumber);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isDirty) {
      const synced = normalizeWhatsAppSettings(whatsappContact);
      setDraft(synced);
      setPhoneInput(synced.phoneNumber);
    }
  }, [whatsappContact, isDirty]);

  const phoneValidation = useMemo(
    () => validateAndNormalizeWhatsAppNumber(phoneInput),
    [phoneInput]
  );

  const previewSettings: WhatsAppContactSettings = useMemo(() => {
    const normalizedPreviewPhone = phoneValidation.valid
      ? phoneValidation.normalized
      : draft.phoneNumber;
    return {
      ...draft,
      phoneNumber: normalizedPreviewPhone
    };
  }, [draft, phoneValidation]);

  const generatedLink = useMemo(() => {
    if (!phoneValidation.valid) return '';
    return buildWhatsAppChatUrl(phoneValidation.normalized, draft.defaultMessage);
  }, [phoneValidation, draft.defaultMessage]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-8 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Administrator Access Required</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Only the authorized administrator can inspect or modify WhatsApp Contact Settings.
        </p>
      </div>
    );
  }

  const updateField = <K extends keyof WhatsAppContactSettings>(
    key: K,
    value: WhatsAppContactSettings[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setFeedback(null);
  };

  const handlePhoneChange = (value: string) => {
    setPhoneInput(value);
    setIsDirty(true);
    setFeedback(null);
    const check = validateAndNormalizeWhatsAppNumber(value);
    if (check.valid) {
      setDraft((prev) => ({ ...prev, phoneNumber: check.normalized }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const check = validateAndNormalizeWhatsAppNumber(phoneInput);
    if (!check.valid) {
      setFeedback({
        type: 'error',
        message: check.error || 'Please enter a valid WhatsApp phone number with country code.'
      });
      return;
    }

    const cleanButtonText = draft.buttonText.trim() || DEFAULT_WHATSAPP_CONTACT.buttonText;
    const payload: WhatsAppContactSettings = {
      ...draft,
      phoneNumber: check.normalized,
      buttonText: cleanButtonText,
      defaultMessage: draft.defaultMessage.trim()
    };

    const result = await saveWhatsAppContactSettings(payload);
    if (result.success) {
      setDraft(payload);
      setPhoneInput(payload.phoneNumber);
      setIsDirty(false);
      setFeedback({
        type: 'success',
        message: `WhatsApp Contact Settings saved! Public website updated to ${formatWhatsAppDisplayNumber(payload.phoneNumber)}.`
      });
    } else {
      setFeedback({
        type: 'error',
        message: result.error || 'Failed to save WhatsApp Contact Settings.'
      });
    }
  };

  const handleDiscard = () => {
    const current = normalizeWhatsAppSettings(whatsappContact);
    setDraft(current);
    setPhoneInput(current.phoneNumber);
    setIsDirty(false);
    setFeedback(null);
  };

  const handleResetDefaults = () => {
    setDraft({ ...DEFAULT_WHATSAPP_CONTACT });
    setPhoneInput(DEFAULT_WHATSAPP_CONTACT.phoneNumber);
    setIsDirty(true);
    setFeedback(null);
  };

  const handleCopyGeneratedLink = () => {
    if (!generatedLink || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                WhatsApp Contact Settings
              </h2>
              <p className="text-xs text-slate-600">
                Manage the public WhatsApp support phone number, visibility, greeting message, and button design.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block text-[11px]">Active Saved Number</span>
            <span className="font-mono font-bold text-slate-900">
              {formatWhatsAppDisplayNumber(whatsappContact.phoneNumber)}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-500 font-medium block text-[11px]">Public Status</span>
            <span className={`font-bold ${whatsappContact.enabled ? 'text-emerald-700' : 'text-slate-600'}`}>
              {whatsappContact.enabled ? 'Enabled on Website' : 'Disabled (Hidden)'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Split Workspace: Controls + Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings Form */}
        <form
          onSubmit={handleSave}
          className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6"
        >
          {/* 1. Feature Enable / Disable Switch */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Public WhatsApp Contact Button
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Turn off to temporarily hide the WhatsApp button across all public pages.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              aria-label="Enable or disable WhatsApp contact feature"
              onClick={() => updateField('enabled', !draft.enabled)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            >
              {draft.enabled ? (
                <>
                  <ToggleRight className="w-7 h-7 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">Enabled</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-7 h-7 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">Disabled</span>
                </>
              )}
            </button>
          </div>

          {/* 2. Phone Number Management */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="whatsapp-phone-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                WhatsApp Phone Number (With Country Code)
              </label>
              <input
                id="whatsapp-phone-input"
                type="tel"
                value={phoneInput}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+2507XXXXXXXX"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 transition-all ${
                  phoneValidation.valid
                    ? 'border-slate-300 focus:ring-teal-500 bg-white'
                    : 'border-red-400 focus:ring-red-400 bg-red-50/40'
                }`}
              />
              {!phoneValidation.valid ? (
                <p className="mt-1.5 text-xs font-medium text-red-600 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{phoneValidation.error}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-600">
                  Stored format: <code className="font-mono font-bold text-slate-900">{phoneValidation.normalized}</code>
                  {' · '}
                  WhatsApp link digits: <code className="font-mono text-slate-800">{phoneValidation.waMeDigits}</code>
                </p>
              )}
            </div>

            {generatedLink && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="block text-[11px] font-semibold text-slate-500">
                    Generated WhatsApp Link Preview
                  </span>
                  <span className="block text-xs font-mono text-teal-800 truncate">
                    {generatedLink}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyGeneratedLink}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    title="Test link in a new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 3. Button Text & Optional Default Greeting Message */}
          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label
                htmlFor="whatsapp-button-text"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Button Text
              </label>
              <input
                id="whatsapp-button-text"
                type="text"
                value={draft.buttonText}
                onChange={(e) => updateField('buttonText', e.target.value)}
                placeholder="Twandikire kuri WhatsApp"
                maxLength={60}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="whatsapp-default-message"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
              >
                Optional Default Greeting Message
              </label>
              <textarea
                id="whatsapp-default-message"
                rows={2}
                value={draft.defaultMessage}
                onChange={(e) => updateField('defaultMessage', e.target.value)}
                placeholder="Leave blank for a clean link without pre-filled message, or enter a greeting..."
                maxLength={280}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Automatically pre-fills the chat box when a visitor clicks the button.
              </p>
            </div>
          </div>

          {/* 4. Appearance & Layout Customization */}
          <div className="space-y-5 pt-3 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Button Appearance &amp; Layout
            </h3>

            {/* Colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Background Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    aria-label="Button background color picker"
                    value={draft.backgroundColor}
                    onChange={(e) => updateField('backgroundColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    aria-label="Button background hex color"
                    value={draft.backgroundColor}
                    onChange={(e) => updateField('backgroundColor', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {BG_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => updateField('backgroundColor', preset.value)}
                      title={preset.label}
                      className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded-md border text-[11px] font-medium cursor-pointer ${
                        draft.backgroundColor.toLowerCase() === preset.value.toLowerCase()
                          ? 'border-slate-900 bg-slate-100 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/15"
                        style={{ backgroundColor: preset.value }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Text Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    aria-label="Button text color picker"
                    value={draft.textColor}
                    onChange={(e) => updateField('textColor', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    aria-label="Button text hex color"
                    value={draft.textColor}
                    onChange={(e) => updateField('textColor', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono text-slate-900"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {TEXT_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => updateField('textColor', preset.value)}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer ${
                        draft.textColor.toLowerCase() === preset.value.toLowerCase()
                          ? 'border-slate-900 bg-slate-100 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300"
                        style={{ backgroundColor: preset.value }}
                      />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Position, Display Mode, Size, Shape */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Position / Alignment
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'bottom-left', label: 'Bottom Left' },
                      { id: 'bottom-right', label: 'Bottom Right' }
                    ] as { id: WhatsAppButtonPosition; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField('position', opt.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        draft.position === opt.id
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Display Mode
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'floating', label: 'Floating Overlay' },
                      { id: 'normal', label: 'Normal Button' }
                    ] as { id: WhatsAppButtonDisplayMode; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField('displayMode', opt.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        draft.displayMode === opt.id
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Button Size
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'small', label: 'Small' },
                      { id: 'medium', label: 'Medium' },
                      { id: 'large', label: 'Large' }
                    ] as { id: WhatsAppButtonSize; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField('size', opt.id)}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        draft.size === opt.id
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1.5">
                  Button Shape
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'rounded', label: 'Rounded' },
                      { id: 'pill', label: 'Pill' }
                    ] as { id: WhatsAppButtonShape; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField('shape', opt.id)}
                      className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                        draft.shape === opt.id
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Icon Visibility Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2.5">
                {draft.showIcon ? (
                  <Eye className="w-4 h-4 text-teal-700" />
                ) : (
                  <EyeOff className="w-4 h-4 text-slate-500" />
                )}
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    WhatsApp Icon Visibility
                  </span>
                  <span className="block text-[11px] text-slate-600">
                    Show or hide the WhatsApp logo beside the button text.
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.showIcon}
                aria-label="Toggle WhatsApp icon visibility"
                onClick={() => updateField('showIcon', !draft.showIcon)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                  draft.showIcon
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {draft.showIcon ? 'Shown' : 'Hidden'}
              </button>
            </div>
          </div>

          {/* 5. Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
              {isDirty && (
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <span>Discard Unsaved</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isPublishing || !phoneValidation.valid}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              {isPublishing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isPublishing ? 'Saving Settings...' : 'Save WhatsApp Settings'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Live Interactive Preview BEFORE Saving */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Preview</h3>
              <p className="text-xs text-slate-600">
                Inspect changes live before saving to the website.
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
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
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                  previewDevice === 'mobile'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
            </div>
          </div>

          {/* Preview Stage */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 flex justify-center">
            <div
              className={`relative bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 ${
                previewDevice === 'mobile' ? 'w-72 min-h-[340px]' : 'w-full min-h-[340px]'
              }`}
            >
              {/* Simulated Newspaper Page Wireframe */}
              <div>
                <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider uppercase">
                    ISEZERANO ONLINE
                  </span>
                  <span className="text-[10px] text-slate-300">
                    {previewDevice === 'mobile' ? 'Mobile' : 'Desktop'}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="h-3 w-28 bg-teal-100 rounded" />
                  <div className="h-5 w-4/5 bg-slate-200 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="h-16 bg-slate-100 rounded-lg border border-slate-200" />
                    <div className="h-16 bg-slate-100 rounded-lg border border-slate-200" />
                  </div>
                </div>
              </div>

              {/* Disabled Banner OR Live Button */}
              {!previewSettings.enabled ? (
                <div className="m-4 p-3 rounded-xl bg-slate-100 border border-dashed border-slate-300 text-center text-xs text-slate-600 font-medium">
                  WhatsApp contact button is currently disabled and hidden on the public website.
                </div>
              ) : previewSettings.displayMode === 'normal' ? (
                <WhatsAppButtonView settings={previewSettings} previewMode={true} />
              ) : (
                <div className="h-20 relative">
                  <WhatsAppButtonView settings={previewSettings} previewMode={true} />
                </div>
              )}
            </div>
          </div>

          {/* Preview Summary Details */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Status</span>
              <span className="font-bold text-slate-900">
                {previewSettings.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Number</span>
              <span className="font-mono font-bold text-slate-900">
                {phoneValidation.valid ? phoneValidation.normalized : 'Invalid number'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Mode &amp; Position</span>
              <span className="font-semibold text-slate-900">
                {previewSettings.displayMode === 'floating' ? 'Floating' : 'Normal'} •{' '}
                {previewSettings.position === 'bottom-left' ? 'Bottom Left' : 'Bottom Right'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Style</span>
              <span className="font-semibold text-slate-900 capitalize">
                {previewSettings.size} • {previewSettings.shape} •{' '}
                {previewSettings.showIcon ? 'Icon On' : 'Text Only'}
              </span>
            </div>
            {isDirty && (
              <div className="pt-2 border-t border-slate-200 text-amber-800 font-semibold">
                You have unsaved preview changes. Click &ldquo;Save WhatsApp Settings&rdquo; to publish.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
