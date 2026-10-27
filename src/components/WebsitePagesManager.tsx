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
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  RefreshCw,
  Edit3,
  Globe,
  BookOpen,
  HelpCircle,
  Undo2,
  Check
} from 'lucide-react';
import { EditablePageId, WebsitePageContent, PageSection, ContactExtraData } from '../types/websitePages';
import { 
  getAllPagesContent, 
  getPageContent, 
  savePageContent, 
  restorePageDefaults,
  DEFAULT_PAGES_CONTENT 
} from '../services/websitePagesService';
import { useAuth } from '../context/AuthContext';

export const WebsitePagesManager: React.FC = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<Record<EditablePageId, WebsitePageContent> | null>(null);
  const [activePageId, setActivePageId] = useState<EditablePageId>('about');
  const [editingPage, setEditingPage] = useState<WebsitePageContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadAllPages();
  }, []);

  const loadAllPages = async () => {
    setIsLoading(true);
    try {
      const data = await getAllPagesContent();
      setPages(data);
      setEditingPage(JSON.parse(JSON.stringify(data[activePageId])));
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to load website pages:', err);
      showMessage('error', 'Failed to load page content. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const handleSelectPage = (id: EditablePageId) => {
    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes on this page. Are you sure you want to discard them and switch pages?'
      );
      if (!confirmSwitch) return;
    }

    setActivePageId(id);
    if (pages && pages[id]) {
      setEditingPage(JSON.parse(JSON.stringify(pages[id])));
    }
    setHasUnsavedChanges(false);
    setViewMode('edit');
  };

  const handleFieldChange = <K extends keyof WebsitePageContent>(key: K, value: WebsitePageContent[K]) => {
    if (!editingPage) return;
    setEditingPage({
      ...editingPage,
      [key]: value
    });
    setHasUnsavedChanges(true);
  };

  const handleHighlightChange = (field: string, value: any) => {
    if (!editingPage) return;
    const current = editingPage.highlightBox || {
      enabled: true,
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

  // Section Management
  const handleSectionChange = (sectionIndex: number, field: keyof PageSection, value: any) => {
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
      title: 'New Content Section',
      content: 'Write the section description and detailed information here...',
      bullets: []
    };
    setEditingPage({
      ...editingPage,
      sections: [...editingPage.sections, newSection]
    });
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

  // Bullets in section
  const handleAddBullet = (sectionIndex: number) => {
    if (!editingPage) return;
    const section = editingPage.sections[sectionIndex];
    const bullets = section.bullets || [];
    handleSectionChange(sectionIndex, 'bullets', [...bullets, 'New bullet point item']);
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

  // Save / Publish
  const handleSave = async (publish: boolean = true) => {
    if (!editingPage) return;
    setIsSaving(true);
    setStatusMessage(null);

    const adminUid = user?.uid || 'admin-user';
    try {
      const res = await savePageContent(editingPage, adminUid, publish);
      if (res.success) {
        showMessage('success', `"${editingPage.pageName}" published live successfully! Public visitors can now see your latest content.`);
        setHasUnsavedChanges(false);
        // Refresh local cache representation
        setPages(prev => prev ? { ...prev, [editingPage.id]: editingPage } : null);
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

  // Restore Default Content
  const handleRestoreDefaults = async () => {
    if (!editingPage) return;
    const confirmRestore = window.confirm(
      `Are you sure you want to restore the "${editingPage.pageName}" page to its original default content? Any custom text will be replaced with standard GS GITUMBA content.`
    );
    if (!confirmRestore) return;

    setIsSaving(true);
    const adminUid = user?.uid || 'admin-user';
    try {
      const res = await restorePageDefaults(editingPage.id, adminUid);
      if (res.success) {
        const fresh = DEFAULT_PAGES_CONTENT[editingPage.id];
        setEditingPage(JSON.parse(JSON.stringify(fresh)));
        setPages(prev => prev ? { ...prev, [editingPage.id]: fresh } : null);
        setHasUnsavedChanges(false);
        showMessage('success', `"${editingPage.pageName}" restored to original defaults!`);
      } else {
        showMessage('error', res.error || 'Failed to restore defaults.');
      }
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error restoring defaults');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel unsaved edits
  const handleCancelEdits = () => {
    if (!pages || !editingPage) return;
    setEditingPage(JSON.parse(JSON.stringify(pages[activePageId])));
    setHasUnsavedChanges(false);
    showMessage('success', 'Unsaved changes reverted to last published version.');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Loading website pages manager...</p>
      </div>
    );
  }

  if (!editingPage) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Page content not found. Please refresh.</p>
        <button
          onClick={loadAllPages}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          Reload Pages
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg border border-teal-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-2 border border-teal-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Secure CMS • Admin Restricted Write</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Website Pages & Content Manager
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Edit and publish content for <span className="text-teal-300 font-semibold">About Us, Contact Us, Privacy Policy</span>, and <span className="text-teal-300 font-semibold">Terms & Conditions</span>. Changes take effect on the public website immediately upon publishing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Unsaved Changes</span>
            </span>
          )}

          <div className="inline-flex p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'edit'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Page</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'preview'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Preview</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Publishing...' : 'Publish Live'}</span>
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

      {/* Page Selection Tab Bar */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs flex flex-wrap gap-2">
        {[
          { id: 'about', label: 'About Us', icon: BookOpen, desc: 'School background, mission & CBC purpose' },
          { id: 'contact', label: 'Contact Us', icon: Phone, desc: 'Address, phone, hours & inquiry form intro' },
          { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, desc: 'Local storage, offline safety & teacher data' },
          { id: 'terms', label: 'Terms & Conditions', icon: FileText, desc: 'Pedagogical terms & copyright rules' }
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = activePageId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectPage(item.id as EditablePageId)}
              className={`flex-1 min-w-[200px] p-3 rounded-xl text-left transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-teal-50/70 border-teal-500 text-teal-950 shadow-xs ring-1 ring-teal-500'
                  : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">{item.label}</h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Workspace (Edit vs Preview) */}
      {viewMode === 'edit' ? (
        <div className="space-y-6">
          {/* Metadata Card: Page Header Details */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-teal-600" />
                <span>Page Header & Metadata — {editingPage.pageName}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Last updated: {new Date(editingPage.lastUpdated).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Page Badge / Tagline Pill
                </label>
                <input
                  type="text"
                  value={editingPage.badge || ''}
                  onChange={(e) => handleFieldChange('badge', e.target.value)}
                  placeholder="e.g. About ISEZERANO ONLINE"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Main Page Heading (H1)
                </label>
                <input
                  type="text"
                  value={editingPage.title || ''}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="e.g. Supporting Rwandan Educators in Standardized Lesson Planning"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-bold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Page Subtitle & Introduction
                </label>
                <textarea
                  rows={2}
                  value={editingPage.subtitle || ''}
                  onChange={(e) => handleFieldChange('subtitle', e.target.value)}
                  placeholder="Brief introductory summary shown beneath the main page heading"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-normal leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Highlight Box Section (if enabled) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Featured Highlight Box (Navy Callout Card)
                </h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPage.highlightBox?.enabled ?? true}
                  onChange={(e) => handleHighlightChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                <span className="ml-2 text-xs font-semibold text-slate-600">
                  {editingPage.highlightBox?.enabled ? 'Active' : 'Disabled'}
                </span>
              </label>
            </div>

            {editingPage.highlightBox?.enabled && (
              <div className="space-y-3 bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-teal-300 mb-1">
                      Box Label / Pill
                    </label>
                    <input
                      type="text"
                      value={editingPage.highlightBox.badge || ''}
                      onChange={(e) => handleHighlightChange('badge', e.target.value)}
                      placeholder="e.g. Built by a Rwandan Teacher"
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-200 mb-1">
                      Highlight Box Title
                    </label>
                    <input
                      type="text"
                      value={editingPage.highlightBox.title || ''}
                      onChange={(e) => handleHighlightChange('title', e.target.value)}
                      placeholder="e.g. From the Classroom of GS GITUMBA"
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white font-bold focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">
                    Highlight Content Narrative
                  </label>
                  <textarea
                    rows={3}
                    value={editingPage.highlightBox.content || ''}
                    onChange={(e) => handleHighlightChange('content', e.target.value)}
                    placeholder="Detailed explanation of the school origin, context, or special notice..."
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-teal-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contact Specific Data (Rendered only for Contact Us page) */}
          {editingPage.id === 'contact' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                <span>School Contact & Address Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">School / Institution</label>
                  <input
                    type="text"
                    value={editingPage.contactData?.schoolName || ''}
                    onChange={(e) => handleContactDataChange('schoolName', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Address</label>
                  <input
                    type="text"
                    value={editingPage.contactData?.address || ''}
                    onChange={(e) => handleContactDataChange('address', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Administrator Email</label>
                  <input
                    type="email"
                    value={editingPage.contactData?.email || ''}
                    onChange={(e) => handleContactDataChange('email', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingPage.contactData?.phone || ''}
                    onChange={(e) => handleContactDataChange('phone', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Rwanda</label>
                  <input
                    type="text"
                    value={editingPage.contactData?.whatsapp || ''}
                    onChange={(e) => handleContactDataChange('whatsapp', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office Hours</label>
                  <input
                    type="text"
                    value={editingPage.contactData?.workingHours || ''}
                    onChange={(e) => handleContactDataChange('workingHours', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content Sections Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Page Sections ({editingPage.sections.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Structured paragraphs, bullet lists, and guidance points visible to public visitors.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSection}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Section</span>
              </button>
            </div>

            {editingPage.sections.map((section, sIndex) => (
              <div 
                key={section.id || sIndex}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4 relative group"
              >
                {/* Section Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-900 font-bold text-xs flex items-center justify-center">
                      {sIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => handleSectionChange(sIndex, 'title', e.target.value)}
                      placeholder="Section Title"
                      className="text-sm font-bold text-slate-900 px-2 py-1 rounded-lg border border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-hidden w-full sm:w-80"
                    />
                  </div>

                  <div className="flex items-center space-x-1 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={sIndex === 0}
                      onClick={() => handleMoveSection(sIndex, 'up')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={sIndex === editingPage.sections.length - 1}
                      onClick={() => handleMoveSection(sIndex, 'down')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sIndex)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer ml-1"
                      title="Delete section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Section Content Area */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Body Narrative / Paragraphs
                  </label>
                  <textarea
                    rows={4}
                    value={section.content}
                    onChange={(e) => handleSectionChange(sIndex, 'content', e.target.value)}
                    placeholder="Enter paragraphs and detailed information for this section..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-teal-500 leading-relaxed text-slate-800"
                  />
                </div>

                {/* Bullet Points List within Section */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Key Points & Bullets ({section.bullets?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAddBullet(sIndex)}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bullet</span>
                    </button>
                  </div>

                  {section.bullets && section.bullets.length > 0 && (
                    <div className="space-y-2 pl-2">
                      {section.bullets.map((bullet, bIndex) => (
                        <div key={bIndex} className="flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => handleBulletChange(sIndex, bIndex, e.target.value)}
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteBullet(sIndex, bIndex)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Remove bullet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar at Bottom */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
                title="Reset to default original content"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Defaults</span>
              </button>

              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleCancelEdits}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Cancel Edits</span>
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
                <span>Preview Before Publishing</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Publishing...' : 'Publish Live Updates'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* LIVE PREVIEW MODE */
        <div className="space-y-6">
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2 font-medium">
              <Eye className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Live Preview Mode:</strong> This is an exact preview of how the published "{editingPage.pageName}" page appears to public visitors and teachers.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg text-xs"
            >
              Back to Editor
            </button>
          </div>

          {/* Render Preview Container */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-10 border border-slate-200 space-y-12">
            {/* Header */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              {editingPage.badge && (
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                  <span>{editingPage.badge}</span>
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                {editingPage.title}
              </h1>
              {editingPage.subtitle && (
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
                  {editingPage.subtitle}
                </p>
              )}
            </div>

            {/* Highlight Box Preview */}
            {editingPage.highlightBox?.enabled && (
              <div className="bg-slate-900 rounded-2xl p-6 sm:p-10 border border-slate-800 text-white shadow-sm space-y-4 max-w-5xl mx-auto">
                {editingPage.highlightBox.badge && (
                  <div className="flex items-center space-x-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>{editingPage.highlightBox.badge}</span>
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {editingPage.highlightBox.title}
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal whitespace-pre-line">
                  {editingPage.highlightBox.content}
                </p>
              </div>
            )}

            {/* Contact Details Preview (if Contact Page) */}
            {editingPage.id === 'contact' && editingPage.contactData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2 text-teal-700 font-bold text-xs uppercase">
                    <MapPin className="w-4 h-4" />
                    <span>Location</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{editingPage.contactData.schoolName}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{editingPage.contactData.address}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2 text-teal-700 font-bold text-xs uppercase">
                    <Phone className="w-4 h-4" />
                    <span>Contact Info</span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold">Phone: {editingPage.contactData.phone}</p>
                  <p className="text-xs text-teal-700 font-semibold">WhatsApp: +{editingPage.contactData.whatsapp}</p>
                  <p className="text-xs text-slate-600">Email: {editingPage.contactData.email}</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center space-x-2 text-teal-700 font-bold text-xs uppercase">
                    <Clock className="w-4 h-4" />
                    <span>Service Hours</span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold">{editingPage.contactData.workingHours}</p>
                  <p className="text-xs text-slate-500">Official Academic Hours</p>
                </div>
              </div>
            )}

            {/* Sections Preview */}
            <div className="space-y-6 max-w-5xl mx-auto">
              {editingPage.sections.map((section, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span>{section.title}</span>
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 pt-2">
                      {section.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">{bullet}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Preview Action */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Publish These Changes Live</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
