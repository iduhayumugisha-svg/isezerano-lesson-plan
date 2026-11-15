import React, { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Phone,
  ShieldCheck,
  RefreshCw,
  Edit3,
  BookOpen,
  Undo2,
  MapPin,
  Clock,
  Building2,
  Mail,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Send
} from 'lucide-react';
import { EditablePageId, WebsitePageContent, PageSection, ContactExtraData } from '../types/platform';
import {
  getAllPagesContent,
  savePageContent,
  restorePageDefaults,
  DEFAULT_PAGES_CONTENT,
  hasStaticPageContent
} from '../services/websitePagesService';
import { useAuth } from '../context/AuthContext';
import { RichTextEditor } from './RichTextEditor';
import { StaticPageRichBody } from '../views/InfoPagesView';

type StaticPageId = Extract<EditablePageId, 'about' | 'contact' | 'privacy' | 'terms'>;

const STATIC_PAGE_SECTIONS: Array<{
  id: StaticPageId;
  heading: string;
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'about',
    heading: 'Edit About Us',
    title: 'About Us',
    path: '/about',
    icon: BookOpen
  },
  {
    id: 'contact',
    heading: 'Edit Contact Us',
    title: 'Contact Us',
    path: '/contact',
    icon: Phone
  },
  {
    id: 'privacy',
    heading: 'Edit Privacy Policy',
    title: 'Privacy Policy',
    path: '/privacy',
    icon: ShieldCheck
  },
  {
    id: 'terms',
    heading: 'Edit Terms & Conditions',
    title: 'Terms & Conditions',
    path: '/terms',
    icon: FileText
  }
];

export const WebsitePagesManager: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [pages, setPages] = useState<Record<EditablePageId, WebsitePageContent> | null>(null);
  const [activePageId, setActivePageId] = useState<StaticPageId>('about');
  const [editingPage, setEditingPage] = useState<WebsitePageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingSwitchId, setPendingSwitchId] = useState<StaticPageId | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [showExtraBlocks, setShowExtraBlocks] = useState(false);

  const loadAllPages = async () => {
    setIsLoading(true);
    try {
      const data = await getAllPagesContent();
      setPages(data);
      const selected = data[activePageId] || DEFAULT_PAGES_CONTENT[activePageId];
      setEditingPage(JSON.parse(JSON.stringify(selected)));
      setShowExtraBlocks((selected.sections?.length || 0) > 0 || Boolean(selected.highlightBox?.enabled));
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load website pages:', err);
      showMessage('error', 'Failed to load page content. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadAllPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">Administrator Authorization Required</h3>
        <p className="text-xs text-slate-600">
          Only the authorized platform administrator may edit and publish website pages.
        </p>
      </div>
    );
  }

  const showMessage = (type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const applySelectedPage = (id: StaticPageId) => {
    setPendingSwitchId(null);
    setConfirmClearOpen(false);
    setActivePageId(id);
    if (pages && pages[id]) {
      const copy: WebsitePageContent = JSON.parse(JSON.stringify(pages[id]));
      setEditingPage(copy);
      setShowExtraBlocks((copy.sections?.length || 0) > 0 || Boolean(copy.highlightBox?.enabled));
    }
    setHasUnsavedChanges(false);
    setViewMode('edit');
  };

  const handleSelectPage = (id: StaticPageId) => {
    if (id === activePageId) return;
    if (hasUnsavedChanges) {
      setPendingSwitchId(id);
      return;
    }
    applySelectedPage(id);
  };

  const handleFieldChange = <K extends keyof WebsitePageContent>(key: K, value: WebsitePageContent[K]) => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      [key]: value
    });
    setHasUnsavedChanges(true);
  };

  const handleHighlightChange = (field: string, value: string | boolean) => {
    if (!editingPage) return;
    const current = editingPage.highlightBox || {
      enabled: false,
      badge: '',
      title: '',
      content: ''
    };
    setEditingPage({
      ...editingPage,
      highlightBox: {
        ...current,
        [field]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleContactDataChange = (field: keyof ContactExtraData, value: string) => {
    if (!editingPage) return;
    const current = editingPage.contactData || {
      schoolName: '',
      address: '',
      email: '',
      phone: '',
      whatsapp: '',
      workingHours: ''
    };
    setEditingPage({
      ...editingPage,
      contactData: {
        ...current,
        [field]: value
      }
    });
    setHasUnsavedChanges(true);
  };

  const handleSectionChange = (sectionIndex: number, field: keyof PageSection, value: string | string[]) => {
    if (!editingPage) return;
    const updatedSections = [...editingPage.sections];
    updatedSections[sectionIndex] = {
      ...updatedSections[sectionIndex],
      [field]: value
    };
    setEditingPage({
      ...editingPage,
      sections: updatedSections
    });
    setHasUnsavedChanges(true);
  };

  const handleAddSection = () => {
    if (!editingPage) return;
    const newSection: PageSection = {
      id: `section-${Date.now()}`,
      title: '',
      content: '',
      bullets: []
    };
    setEditingPage({
      ...editingPage,
      sections: [...editingPage.sections, newSection]
    });
    setShowExtraBlocks(true);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSection = (index: number) => {
    if (!editingPage) return;
    const updatedSections = editingPage.sections.filter((_, i) => i !== index);
    setEditingPage({
      ...editingPage,
      sections: updatedSections
    });
    setHasUnsavedChanges(true);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!editingPage) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= editingPage.sections.length) return;

    const updatedSections = [...editingPage.sections];
    const temp = updatedSections[index];
    updatedSections[index] = updatedSections[targetIndex];
    updatedSections[targetIndex] = temp;

    setEditingPage({
      ...editingPage,
      sections: updatedSections
    });
    setHasUnsavedChanges(true);
  };

  const handleAddBullet = (sectionIndex: number) => {
    if (!editingPage) return;
    const section = editingPage.sections[sectionIndex];
    const bullets = section.bullets || [];
    handleSectionChange(sectionIndex, 'bullets', [...bullets, '']);
  };

  const handleBulletChange = (sectionIndex: number, bulletIndex: number, value: string) => {
    if (!editingPage) return;
    const section = editingPage.sections[sectionIndex];
    const bullets = [...(section.bullets || [])];
    bullets[bulletIndex] = value;
    handleSectionChange(sectionIndex, 'bullets', bullets);
  };

  const handleDeleteBullet = (sectionIndex: number, bulletIndex: number) => {
    if (!editingPage) return;
    const section = editingPage.sections[sectionIndex];
    const bullets = (section.bullets || []).filter((_, i) => i !== bulletIndex);
    handleSectionChange(sectionIndex, 'bullets', bullets);
  };

  const handleSave = async () => {
    if (!editingPage) return;
    setIsSaving(true);
    setStatusMessage(null);

    const adminUid = user?.uid || user?.email || 'admin-user';
    const hasContent = hasStaticPageContent(editingPage);
    try {
      const res = await savePageContent(editingPage, adminUid, hasContent);
      if (res.success) {
        const savedCopy: WebsitePageContent = {
          ...editingPage,
          isPublished: hasContent,
          lastUpdated: new Date().toISOString(),
          updatedBy: adminUid
        };
        setEditingPage(savedCopy);
        setPages((prev) => (prev ? { ...prev, [editingPage.id]: savedCopy } : null));
        setHasUnsavedChanges(false);
        setConfirmClearOpen(false);
        setPendingSwitchId(null);

        if (res.warning) {
          showMessage('success', `"${editingPage.pageName}" saved! ${res.warning}`);
        } else {
          showMessage(
            'success',
            `"${editingPage.pageName}" updated successfully! Visitors can see the latest content immediately.`
          );
        }
      } else {
        showMessage('error', res.error || 'Failed to save page changes.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving page';
      showMessage('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearPageContent = async () => {
    if (!editingPage || !isAdmin) return;
    setIsSaving(true);
    const adminUid = user?.uid || user?.email || 'admin-user';
    try {
      const res = await restorePageDefaults(editingPage.id, adminUid);
      if (res.success) {
        const fresh: WebsitePageContent = JSON.parse(JSON.stringify(DEFAULT_PAGES_CONTENT[editingPage.id]));
        setEditingPage(fresh);
        setPages((prev) => (prev ? { ...prev, [editingPage.id]: fresh } : null));
        setHasUnsavedChanges(false);
        setConfirmClearOpen(false);
        setShowExtraBlocks(false);
        showMessage('success', `"${editingPage.pageName}" content cleared. The public page is now empty.`);
      } else {
        showMessage('error', res.error || 'Failed to clear page content.');
      }
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error clearing page content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdits = () => {
    if (!pages || !editingPage) return;
    const reverted: WebsitePageContent = JSON.parse(JSON.stringify(pages[activePageId]));
    setEditingPage(reverted);
    setHasUnsavedChanges(false);
    setPendingSwitchId(null);
    setConfirmClearOpen(false);
    showMessage('success', 'Unsaved changes discarded.');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Loading Website Pages editor...</p>
      </div>
    );
  }

  if (!editingPage) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Page content not found. Please refresh.</p>
        <button
          type="button"
          onClick={loadAllPages}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          Reload Pages
        </button>
      </div>
    );
  }

  const activeMeta =
    STATIC_PAGE_SECTIONS.find((section) => section.id === activePageId) || STATIC_PAGE_SECTIONS[0];
  const previewHasContent = hasStaticPageContent(editingPage);
  const contactData = editingPage.contactData || {
    schoolName: '',
    address: '',
    email: '',
    phone: '',
    whatsapp: '',
    workingHours: ''
  };
  const hasContactDetails = Boolean(
    contactData.schoolName?.trim() ||
      contactData.address?.trim() ||
      contactData.phone?.trim() ||
      contactData.whatsapp?.trim() ||
      contactData.email?.trim() ||
      contactData.workingHours?.trim()
  );
  const validSections = (editingPage.sections || []).filter(
    (s) =>
      Boolean(s.title?.trim()) ||
      Boolean(s.content?.trim()) ||
      (Array.isArray(s.bullets) && s.bullets.some((b) => Boolean(b?.trim())))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2 border border-teal-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Website Pages • Admin Only</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Website Pages</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Manage content for <span className="text-teal-300 font-semibold">About Us</span>,{' '}
            <span className="text-teal-300 font-semibold">Contact Us</span>,{' '}
            <span className="text-teal-300 font-semibold">Privacy Policy</span>, and{' '}
            <span className="text-teal-300 font-semibold">Terms &amp; Conditions</span>. Saved changes appear live without redeploying.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Unsaved Changes</span>
            </span>
          )}

          <div className="inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'edit' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'preview' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save / Update'}</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center space-x-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{statusMessage.message}</span>
        </div>
      )}

      {/* Unsaved Switch Confirmation */}
      {pendingSwitchId && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="font-semibold">
            You have unsaved changes on "{editingPage.pageName}". Discard unsaved edits and switch section?
          </span>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setPendingSwitchId(null)}
              className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 font-bold hover:bg-amber-100 cursor-pointer"
            >
              Stay Here
            </button>
            <button
              type="button"
              onClick={() => applySelectedPage(pendingSwitchId)}
              className="px-3 py-1.5 rounded-lg bg-amber-700 text-white font-bold hover:bg-amber-800 cursor-pointer"
            >
              Discard &amp; Switch
            </button>
          </div>
        </div>
      )}

      {/* Four Static Page Editing Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STATIC_PAGE_SECTIONS.map((item) => {
          const Icon = item.icon;
          const isSelected = activePageId === item.id;
          const pageObj = pages?.[item.id];
          const isPopulated = pageObj ? hasStaticPageContent(pageObj) : false;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectPage(item.id)}
              className={`p-4 rounded-2xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-2 ${
                isSelected
                  ? 'bg-teal-50/80 border-teal-600 text-teal-950 shadow-xs ring-1 ring-teal-500'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isPopulated
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isPopulated ? 'Published' : 'Empty'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold leading-snug">{item.heading}</h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">{item.path}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Workspace: Edit or Preview */}
      {viewMode === 'edit' ? (
        <div className="space-y-6">
          {/* Selected Section Header + Optional Page Heading */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">{activeMeta.heading}</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {editingPage.lastUpdated
                  ? `Last saved: ${new Date(editingPage.lastUpdated).toLocaleString()}`
                  : 'Not published yet (currently empty)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Page Heading (Optional — defaults to "{activeMeta.title}")
                </label>
                <input
                  type="text"
                  value={editingPage.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder={`Optional heading (e.g. ${activeMeta.title})`}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Page Label / Badge (Optional)
                </label>
                <input
                  type="text"
                  value={editingPage.badge || ''}
                  onChange={(e) => handleFieldChange('badge', e.target.value)}
                  placeholder="Optional label"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Page Subtitle / Intro (Optional)
                </label>
                <input
                  type="text"
                  value={editingPage.subtitle || ''}
                  onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                  placeholder="Optional short intro shown under the page heading"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Large Rich Text Content Editor */}
            <div className="space-y-2 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                  Page Content (Rich Text Editor — Headings, Paragraphs, Lists &amp; Links)
                </label>
                <span className="text-[11px] text-slate-500">
                  Write or paste formatted content directly below
                </span>
              </div>

              <RichTextEditor
                key={editingPage.id}
                value={editingPage.bodyHtml || ''}
                onChange={(html) => handleFieldChange('bodyHtml', html)}
                placeholder={`Write or paste your ${activeMeta.title} content here (headings, paragraphs, lists, links)...`}
                minHeight="440px"
              />
            </div>
          </div>

          {/* Optional Contact Us Structured Details & Visitor Form Toggle */}
          {editingPage.id === 'contact' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>Optional Contact Fields &amp; Inquiry Form</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Leave blank if you prefer to put all contact details inside the rich text editor above.
                  </p>
                </div>

                <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPage.showContactForm)}
                    onChange={(e) => handleFieldChange('showContactForm', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    Show Contact Inquiry Form on Public Page
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Organization</label>
                  <input
                    type="text"
                    value={contactData.schoolName || ''}
                    onChange={(e) => handleContactDataChange('schoolName', e.target.value)}
                    placeholder="Optional organization name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={contactData.address || ''}
                    onChange={(e) => handleContactDataChange('address', e.target.value)}
                    placeholder="Optional physical address"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={contactData.email || ''}
                    onChange={(e) => handleContactDataChange('email', e.target.value)}
                    placeholder="Optional contact email"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={contactData.phone || ''}
                    onChange={(e) => handleContactDataChange('phone', e.target.value)}
                    placeholder="Optional phone number"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={contactData.whatsapp || ''}
                    onChange={(e) => handleContactDataChange('whatsapp', e.target.value)}
                    placeholder="Optional WhatsApp number"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Working Hours</label>
                  <input
                    type="text"
                    value={contactData.workingHours || ''}
                    onChange={(e) => handleContactDataChange('workingHours', e.target.value)}
                    placeholder="Optional office hours"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional Advanced Blocks (Highlight Callout & Structured Sections) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExtraBlocks((prev) => !prev)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Additional Structured Blocks (Optional Callout Box &amp; Cards)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Optional cards shown below the rich text body if enabled.
                </p>
              </div>
              {showExtraBlocks ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showExtraBlocks && (
              <div className="p-6 pt-2 border-t border-slate-100 space-y-6">
                {/* Optional Highlight Box */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Callout Highlight Box</span>
                    </span>
                    <label className="inline-flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingPage.highlightBox?.enabled)}
                        onChange={(e) => handleHighlightChange('enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs font-semibold text-slate-600">
                        {editingPage.highlightBox?.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  {editingPage.highlightBox?.enabled && (
                    <div className="space-y-3 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editingPage.highlightBox.badge || ''}
                          onChange={(e) => handleHighlightChange('badge', e.target.value)}
                          placeholder="Optional callout badge"
                          className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                        />
                        <input
                          type="text"
                          value={editingPage.highlightBox.title || ''}
                          onChange={(e) => handleHighlightChange('title', e.target.value)}
                          placeholder="Callout title"
                          className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                        />
                      </div>
                      <textarea
                        rows={3}
                        value={editingPage.highlightBox.content || ''}
                        onChange={(e) => handleHighlightChange('content', e.target.value)}
                        placeholder="Callout text..."
                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200"
                      />
                    </div>
                  )}
                </div>

                {/* Optional Structured Sections */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Structured Cards ({editingPage.sections.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Card Section</span>
                    </button>
                  </div>

                  {editingPage.sections.map((section, sIndex) => (
                    <div
                      key={section.id || sIndex}
                      className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => handleSectionChange(sIndex, 'title', e.target.value)}
                          placeholder="Card Heading"
                          className="text-xs font-bold text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 bg-white w-full sm:w-80"
                        />
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            disabled={sIndex === 0}
                            onClick={() => handleMoveSection(sIndex, 'up')}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={sIndex === editingPage.sections.length - 1}
                            onClick={() => handleMoveSection(sIndex, 'down')}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sIndex)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={3}
                        value={section.content}
                        onChange={(e) => handleSectionChange(sIndex, 'content', e.target.value)}
                        placeholder="Card body text..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      />

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">
                            Bullet Points ({section.bullets?.length || 0})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddBullet(sIndex)}
                            className="text-[11px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                          >
                            + Add Bullet
                          </button>
                        </div>
                        {section.bullets?.map((bullet, bIndex) => (
                          <div key={bIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => handleBulletChange(sIndex, bIndex, e.target.value)}
                              placeholder="Bullet item..."
                              className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteBullet(sIndex, bIndex)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inline Clear Confirmation */}
          {confirmClearOpen && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="font-semibold">
                Clear all saved content for "{editingPage.pageName}"? Visitors will see an empty page until you publish new content.
              </span>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-800 font-bold hover:bg-rose-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearPageContent}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg bg-rose-700 text-white font-bold hover:bg-rose-800 cursor-pointer"
                >
                  Confirm Clear Page Content
                </button>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Page Content</span>
              </button>

              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleCancelEdits}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Discard Changes</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Page</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save / Update'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* PREVIEW MODE */
        <div className="space-y-6">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2 font-medium">
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Visitor Preview ({activeMeta.title}):</strong> This shows exactly how the page looks to website visitors.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs cursor-pointer self-start sm:self-auto"
            >
              Back to Editor
            </button>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 sm:p-10 border border-slate-200 space-y-8">
            {!previewHasContent ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="border-b border-slate-200 pb-6 text-center sm:text-left">
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    {activeMeta.title}
                  </h1>
                </div>
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-2xs text-center">
                  <p className="text-sm text-slate-600">
                    No content has been published for this page yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                  {editingPage.badge?.trim() && (
                    <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
                      <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                      <span>{editingPage.badge}</span>
                    </div>
                  )}
                  <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                    {editingPage.title?.trim() || activeMeta.title}
                  </h1>
                  {editingPage.subtitle?.trim() && (
                    <p className="text-base text-slate-700 leading-relaxed font-normal">
                      {editingPage.subtitle}
                    </p>
                  )}
                </div>

                <StaticPageRichBody html={editingPage.bodyHtml} />

                {editingPage.highlightBox?.enabled &&
                  (editingPage.highlightBox.badge?.trim() ||
                    editingPage.highlightBox.title?.trim() ||
                    editingPage.highlightBox.content?.trim()) && (
                    <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-800 text-white shadow-sm space-y-3">
                      {editingPage.highlightBox.badge?.trim() && (
                        <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                          <Sparkles className="w-4 h-4 text-teal-400" />
                          <span>{editingPage.highlightBox.badge}</span>
                        </div>
                      )}
                      {editingPage.highlightBox.title?.trim() && (
                        <h2 className="text-xl font-bold text-white">{editingPage.highlightBox.title}</h2>
                      )}
                      {editingPage.highlightBox.content?.trim() && (
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                          {editingPage.highlightBox.content}
                        </p>
                      )}
                    </div>
                  )}

                {editingPage.id === 'contact' && hasContactDetails && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                    <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                      Contact Information
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                      {contactData.schoolName?.trim() && (
                        <div className="flex items-start space-x-2.5">
                          <Building2 className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <span>{contactData.schoolName}</span>
                        </div>
                      )}
                      {contactData.address?.trim() && (
                        <div className="flex items-start space-x-2.5">
                          <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <span>{contactData.address}</span>
                        </div>
                      )}
                      {contactData.phone?.trim() && (
                        <div className="flex items-start space-x-2.5">
                          <Phone className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <span>{contactData.phone}</span>
                        </div>
                      )}
                      {contactData.whatsapp?.trim() && (
                        <div className="flex items-start space-x-2.5">
                          <MessageSquare className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <span>{contactData.whatsapp}</span>
                        </div>
                      )}
                      {contactData.email?.trim() && (
                        <div className="flex items-start space-x-2.5">
                          <Mail className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <span>{contactData.email}</span>
                        </div>
                      )}
                      {contactData.workingHours?.trim() && (
                        <div className="flex items-start space-x-2.5">
                          <Clock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                          <span>{contactData.workingHours}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editingPage.id === 'contact' && editingPage.showContactForm && (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-800">Contact Inquiry Form Enabled</span>
                      <span className="inline-flex items-center space-x-1 text-teal-700 font-semibold">
                        <Send className="w-3.5 h-3.5" />
                        <span>Visible to visitors</span>
                      </span>
                    </div>
                  </div>
                )}

                {validSections.length > 0 && (
                  <div className="space-y-4">
                    {validSections.map((section, idx) => {
                      const validBullets = (section.bullets || []).filter((b) => Boolean(b?.trim()));
                      return (
                        <div
                          key={section.id || idx}
                          className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3"
                        >
                          {section.title?.trim() && (
                            <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                          )}
                          {section.content?.trim() && (
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                              {section.content}
                            </p>
                          )}
                          {validBullets.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-slate-600">
                              {validBullets.map((bullet, bIdx) => (
                                <li key={bIdx}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save / Update'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

