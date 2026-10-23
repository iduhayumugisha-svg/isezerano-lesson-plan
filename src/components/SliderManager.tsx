import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Upload, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  RefreshCw, 
  Image as ImageIcon,
  Sparkles,
  Layers,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  ChevronRight
} from 'lucide-react';
import { HeroSlide, PresetImage } from '../types/slider';
import { 
  getAllSlidesAdmin, 
  saveSlideAdmin, 
  deleteSlideAdmin, 
  saveSlidesOrderAdmin, 
  compressImageFile,
  PRESET_EDUCATION_IMAGES,
  DEFAULT_HERO_SLIDES
} from '../services/sliderService';
import { useAuth } from '../context/AuthContext';

interface SliderManagerProps {
  onClose?: () => void;
}

export const SliderManager: React.FC<SliderManagerProps> = ({ onClose }) => {
  const { user, isAdmin } = useAuth();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal / Editor State
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [previewSlide, setPreviewSlide] = useState<HeroSlide | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [imageSizeNote, setImageSizeNote] = useState<string>('');

  // Form Fields
  const [formHeadline, setFormHeadline] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formButtonText, setFormButtonText] = useState('');
  const [formButtonLink, setFormButtonLink] = useState('dashboard');
  const [formPublished, setFormPublished] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSlides();
  }, []);

  const loadSlides = async () => {
    setIsLoading(true);
    try {
      const data = await getAllSlidesAdmin();
      setSlides(data.length > 0 ? data : DEFAULT_HERO_SLIDES);
    } catch (err) {
      console.error('Error loading admin slides:', err);
      showFeedback('error', 'Could not load slider items. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingSlide(null);
    setFormHeadline('');
    setFormDescription('');
    setFormImageUrl(PRESET_EDUCATION_IMAGES[0].url);
    setFormButtonText('Go to Dashboard');
    setFormButtonLink('dashboard');
    setFormPublished(true);
    setImageSizeNote('Preset photo selected');
    setIsEditorOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormHeadline(slide.headline);
    setFormDescription(slide.description);
    setFormImageUrl(slide.imageUrl);
    setFormButtonText(slide.buttonText || 'Go to Dashboard');
    setFormButtonLink(slide.buttonLink || 'dashboard');
    setFormPublished(slide.published);
    setImageSizeNote(slide.imageUrl.startsWith('data:') ? 'Custom compressed photo' : 'Web photo URL');
    setIsEditorOpen(true);
  };

  // Image Upload handler with client-side canvas compression (100% free operation)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setImageSizeNote('Compressing image on device...');
    try {
      const compressedDataUrl = await compressImageFile(file, 1200, 800, 0.78);
      const estSizeKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
      setFormImageUrl(compressedDataUrl);
      setImageSizeNote(`Compressed successfully (~${estSizeKb} KB, 100% free storage)`);
      showFeedback('success', 'Image uploaded and optimized successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compress image';
      showFeedback('error', msg);
      setImageSizeNote('Upload failed. Please try another image.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Pick Preset Image
  const handleSelectPreset = (preset: PresetImage) => {
    setFormImageUrl(preset.url);
    setImageSizeNote(`Preset: ${preset.title}`);
  };

  // Reorder Slides
  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const updated = [...slides];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setSlides(updated);
    const res = await saveSlidesOrderAdmin(updated);
    if (res.success) {
      showFeedback('success', 'Slide order updated successfully!');
    } else {
      showFeedback('error', res.error || 'Failed to update order');
      loadSlides();
    }
  };

  // Toggle Publish Status directly
  const handleTogglePublished = async (slide: HeroSlide) => {
    const updated: HeroSlide = {
      ...slide,
      published: !slide.published,
      updatedAt: new Date().toISOString()
    };
    const res = await saveSlideAdmin(updated);
    if (res.success) {
      setSlides(prev => prev.map(s => s.id === slide.id ? updated : s));
      showFeedback('success', `Slide ${updated.published ? 'published to homepage' : 'moved to draft'}!`);
    } else {
      showFeedback('error', res.error || 'Failed to update slide status');
    }
  };

  // Delete Slide
  const handleDeleteSlide = async (slideId: string, headline: string) => {
    if (slides.length <= 1) {
      showFeedback('error', 'You must keep at least one slide for the homepage.');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete this slide: "${headline}"?`);
    if (!confirmDelete) return;

    const res = await deleteSlideAdmin(slideId);
    if (res.success) {
      setSlides(prev => prev.filter(s => s.id !== slideId));
      showFeedback('success', 'Slide deleted successfully!');
    } else {
      showFeedback('error', res.error || 'Failed to delete slide');
    }
  };

  // Save Slide from Editor Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHeadline.trim()) {
      showFeedback('error', 'Please enter a slide headline.');
      return;
    }
    if (!formDescription.trim()) {
      showFeedback('error', 'Please enter a short accompanying message.');
      return;
    }
    if (!formImageUrl.trim()) {
      showFeedback('error', 'Please upload or select an image for this slide.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const slideToSave: HeroSlide = {
        id: editingSlide ? editingSlide.id : `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        headline: formHeadline.trim(),
        description: formDescription.trim(),
        imageUrl: formImageUrl.trim(),
        buttonText: formButtonText.trim() || 'Go to Dashboard',
        buttonLink: formButtonLink.trim() || 'dashboard',
        order: editingSlide ? editingSlide.order : slides.length + 1,
        published: formPublished,
        createdAt: editingSlide ? editingSlide.createdAt : now,
        updatedAt: now
      };

      const result = await saveSlideAdmin(slideToSave);
      if (result.success) {
        showFeedback('success', editingSlide ? 'Slide updated and published!' : 'New slide created and published!');
        setIsEditorOpen(false);
        loadSlides();
      } else {
        showFeedback('error', result.error || 'Failed to save slide');
      }
    } catch (err: unknown) {
      showFeedback('error', err instanceof Error ? err.message : 'Error saving slide');
    } finally {
      setIsSaving(false);
    }
  };

  // Check Admin Authorization
  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-red-200 space-y-4">
        <ShieldCheck className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Administrator Access Required</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          Hero slider management is restricted to authorized platform administrators. Please sign in with an authorized administrator account to manage homepage slides.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Homepage Hero Slider System</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Manage Homepage Slider
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Add, edit, reorder, and publish carousel slides displayed on the ISEZERANO ONLINE homepage. 
            All uploads are compressed automatically on your device for 100% free hosting.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={loadSlides}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Refresh slides"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all cursor-pointer ring-2 ring-teal-500/20 active:scale-98"
          >
            <Plus className="w-4 h-4 text-teal-400" />
            <span>Add New Slide</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center space-x-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-teal-50 border-teal-200 text-teal-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Slides List Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Current Homepage Slides ({slides.length})
            </h3>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Drag or use arrows to reorder • Rotates every 5 seconds
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
            <p className="text-sm">Loading homepage slides...</p>
          </div>
        ) : slides.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600">No slides found.</p>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Slide</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {slides.map((slide, index) => (
              <div 
                key={slide.id || index}
                className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail + Info */}
                <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
                  {/* Order Badge & Reorder Controls */}
                  <div className="flex flex-col items-center justify-center space-y-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move slide up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold flex items-center justify-center border border-slate-200">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, 'down')}
                      disabled={index === slides.length - 1}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Move slide down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="w-20 h-14 sm:w-28 sm:h-18 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 relative group">
                    <img 
                      src={slide.imageUrl} 
                      alt={slide.headline}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewSlide(slide)}
                      className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                      title="Preview full slide"
                    >
                      <Eye className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  {/* Text Details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        slide.published 
                          ? 'bg-teal-50 text-teal-800 border-teal-200' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {slide.published ? 'Published' : 'Draft'}
                      </span>
                      {slide.buttonText && (
                        <span className="text-[11px] font-medium text-slate-500">
                          Button: <strong className="text-slate-800 font-semibold">{slide.buttonText}</strong> ({slide.buttonLink || 'dashboard'})
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {slide.headline}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {slide.description}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
                  <button
                    type="button"
                    onClick={() => setPreviewSlide(slide)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                    title="Live preview"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePublished(slide)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      slide.published
                        ? 'border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'border-teal-300 text-teal-800 bg-teal-50 hover:bg-teal-100'
                    }`}
                  >
                    {slide.published ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(slide)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSlide(slide.id, slide.headline)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: ADD / EDIT SLIDE FORM (Mobile & Desktop Responsive) */}
      {/* ============================================================== */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-auto space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  {editingSlide ? 'Edit Homepage Slide' : 'Add New Homepage Slide'}
                </h3>
                <p className="text-xs text-slate-500">
                  Upload an image from phone or computer, set headline, message, and button link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="space-y-5">
              
              {/* 1. Image Selection & Upload */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Slide Photograph / Image (100% Free Storage)
                </label>

                {/* Live Image Preview Banner */}
                {formImageUrl && (
                  <div className="relative h-40 sm:h-48 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 shadow-inner group">
                    <img 
                      src={formImageUrl} 
                      alt="Slide preview" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-3">
                      <p className="text-white text-xs font-semibold truncate drop-shadow">
                        {formHeadline || 'Slide Preview'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Upload from Phone / Computer Button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                  >
                    <Upload className={`w-4 h-4 text-teal-700 ${isCompressing ? 'animate-bounce' : ''}`} />
                    <span>{isCompressing ? 'Compressing...' : 'Upload from Phone or Computer'}</span>
                  </button>

                  {imageSizeNote && (
                    <span className="text-[11px] font-medium text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 self-center">
                      {imageSizeNote}
                    </span>
                  )}
                </div>

                {/* Pre-curated Education Presets (1-Click selection) */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Or select from curated education presets:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_EDUCATION_IMAGES.map((preset) => {
                      const isSelected = formImageUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-teal-600 ring-2 ring-teal-500/30' : 'border-slate-200 hover:border-slate-400'
                          }`}
                          title={preset.title}
                        >
                          <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-teal-900/40 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => {
                      setFormImageUrl(e.target.value);
                      setImageSizeNote('Custom image link');
                    }}
                    placeholder="Or enter direct image URL (https://...)"
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 text-slate-800"
                  />
                </div>
              </div>

              {/* 2. Slide Headline */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formHeadline}
                  onChange={(e) => setFormHeadline(e.target.value)}
                  placeholder="e.g. Empowering Rwandan Educators with Competence-Based Planning"
                  className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900"
                />
              </div>

              {/* 3. Accompanying Message / Description */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Short Accompanying Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Designed for primary and secondary teachers to prepare official REB-compliant 8-column lesson plans with ease and confidence."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-800 resize-none font-normal"
                />
              </div>

              {/* 4. Action Button Label & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={formButtonText}
                    onChange={(e) => setFormButtonText(e.target.value)}
                    placeholder="e.g. Go to Dashboard"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Destination Page / URL
                  </label>
                  <select
                    value={formButtonLink}
                    onChange={(e) => setFormButtonLink(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900 cursor-pointer"
                  >
                    <option value="dashboard">Dashboard (Application Area)</option>
                    <option value="create">Create Lesson Plan Workspace</option>
                    <option value="saved">Saved Lesson Plans</option>
                    <option value="about">About Us</option>
                    <option value="contact">Contact Us</option>
                    <option value="privacy">Privacy Policy</option>
                  </select>
                </div>
              </div>

              {/* 5. Published Status Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                    Publish immediately on Homepage
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    When active, this slide will rotate in the homepage hero carousel.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formPublished}
                  onChange={(e) => setFormPublished(e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving || isCompressing}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all cursor-pointer ring-2 ring-teal-500/20 active:scale-98"
                >
                  <Save className="w-4 h-4 text-teal-400" />
                  <span>{isSaving ? 'Saving Slide...' : editingSlide ? 'Update & Publish' : 'Save & Publish'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: LIVE SLIDE PREVIEW MODAL */}
      {/* ============================================================== */}
      {previewSlide && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-bold">Homepage Live Preview</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewSlide(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slide Visual Display */}
            <div className="relative h-[340px] sm:h-[420px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <img 
                src={previewSlide.imageUrl} 
                alt={previewSlide.headline} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/20" />
              
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 text-left z-20 space-y-3">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-semibold w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span>Rwanda CBC Education Platform</span>
                </div>
                <h2 className="text-xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                  {previewSlide.headline}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 max-w-xl font-normal leading-relaxed">
                  {previewSlide.description}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-600 shadow-md">
                    <span>{previewSlide.buttonText || 'Go to Dashboard'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewSlide(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
