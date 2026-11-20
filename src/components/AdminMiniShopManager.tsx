import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  MessageCircle,
  Monitor,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Tablet,
  Trash2,
  X
} from 'lucide-react';
import { MiniShopProduct } from '../types/platform';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { DisplayNumericControl } from './DisplayNumericControl';
import { AdminShopVideoManager } from './AdminShopVideoManager';
import {
  DEFAULT_MINI_SHOP_DISPLAY_SETTINGS,
  MINI_SHOP_DISPLAY_LIMITS,
  MiniShopDisplaySettings,
  getMiniShopVisibleSlice,
  normalizeMiniShopDisplaySettings,
  resolveMiniShopColumnsForWidth
} from '../utils/displaySettingsUtils';
import {
  deleteMiniShopProduct,
  reorderMiniShopProducts,
  saveMiniShopProduct,
  subscribeToAllMiniShopProductsForAdmin,
  toggleMiniShopProductActive,
  uploadMiniShopProductImage
} from '../services/miniShopService';
import {
  buildMiniShopTelHref,
  buildMiniShopWhatsAppUrl,
  filterActiveMiniShopProducts,
  MINI_SHOP_DESCRIPTION_MAX,
  MINI_SHOP_PRICE_MAX,
  MINI_SHOP_TITLE_MAX
} from '../utils/miniShopUtils';

export const AdminMiniShopManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    miniShopDisplay,
    saveMiniShopDisplaySettings,
    isPublishing: isPublishingDisplay
  } = useWebsiteDesign();
  const [products, setProducts] = useState<MiniShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Display size settings state
  const [draftDisplay, setDraftDisplay] = useState<MiniShopDisplaySettings>(() =>
    normalizeMiniShopDisplaySettings(miniShopDisplay)
  );
  const [isDisplayDirty, setIsDisplayDirty] = useState(false);
  const [displayFeedback, setDisplayFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Form state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | undefined>(undefined);
  const [editingDisplayOrder, setEditingDisplayOrder] = useState<number>(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageStorageMode, setImageStorageMode] = useState<
    'firebase_storage' | 'firestore_embedded' | undefined
  >(undefined);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [active, setActive] = useState(true);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const formCardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isDisplayDirty) {
      setDraftDisplay(normalizeMiniShopDisplaySettings(miniShopDisplay));
    }
  }, [miniShopDisplay, isDisplayDirty]);

  useEffect(() => {
    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsub = subscribeToAllMiniShopProductsForAdmin((fetched, err) => {
      setProducts(fetched);
      setLoadError(err || null);
      setIsLoading(false);
    });

    return () => unsub();
  }, [isAdmin, reloadNonce]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-rose-200 text-center text-sm text-rose-700 font-semibold">
        Administrator authentication required to manage Mini Shop products.
      </div>
    );
  }

  const activeProducts = filterActiveMiniShopProducts(products);

  const resetForm = () => {
    setEditingProductId(null);
    setEditingCreatedAt(undefined);
    setEditingDisplayOrder(products.length);
    setTitle('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setImageStorageMode(undefined);
    setWhatsappNumber('');
    setPhoneNumber('');
    setActive(true);
    setUploadNotice(null);
    setUploadProgressText(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedback(null);
    setUploadNotice(null);
    setIsUploadingImage(true);
    setUploadProgressText('Optimizing image...');

    const res = await uploadMiniShopProductImage(file, (pct, stage) => {
      setUploadProgressText(`${stage || 'Uploading'} (${pct}%)`);
    });

    setIsUploadingImage(false);
    setUploadProgressText(null);

    if (!res.success || !res.url) {
      setFeedback({
        type: 'error',
        text: res.error || 'Could not process the selected image.'
      });
      return;
    }

    setImageUrl(res.url);
    setImageStorageMode(res.storageMode);
    if (res.fallbackNotice) {
      setUploadNotice(res.fallbackNotice);
    }
  };

  const handleEditProduct = (prod: MiniShopProduct) => {
    setFeedback(null);
    setConfirmDeleteId(null);
    setEditingProductId(prod.id);
    setEditingCreatedAt(prod.createdAt);
    setEditingDisplayOrder(prod.displayOrder);
    setTitle(prod.title);
    setDescription(prod.description);
    setPrice(prod.price || '');
    setImageUrl(prod.imageUrl);
    setImageStorageMode(prod.imageStorageMode);
    setWhatsappNumber(prod.whatsappNumber || '');
    setPhoneNumber(prod.phoneNumber || '');
    setActive(prod.active);
    setUploadNotice(null);

    formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    const targetOrder = editingProductId ? editingDisplayOrder : products.length;
    const result = await saveMiniShopProduct({
      id: editingProductId || undefined,
      title,
      description,
      price,
      imageUrl,
      imageStorageMode,
      whatsappNumber,
      phoneNumber,
      active,
      displayOrder: targetOrder,
      createdAt: editingCreatedAt
    });

    setIsSaving(false);

    if (!result.success) {
      setFeedback({
        type: 'error',
        text: result.error || 'Failed to save product.'
      });
      return;
    }

    setFeedback({
      type: 'success',
      text: editingProductId
        ? `"${result.product?.title}" updated successfully.`
        : `"${result.product?.title}" added to the Mini Shop.`
    });
    resetForm();
  };

  const handleToggleActive = async (prod: MiniShopProduct) => {
    setFeedback(null);
    setBusyProductId(prod.id);
    const res = await toggleMiniShopProductActive(prod, !prod.active);
    setBusyProductId(null);

    if (!res.success) {
      setFeedback({ type: 'error', text: res.error || 'Failed to update status.' });
      return;
    }

    setFeedback({
      type: 'success',
      text: !prod.active
        ? `"${prod.title}" is now Active on the public Mini Shop bar.`
        : `"${prod.title}" is now Hidden (inactive).`
    });
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= products.length) return;

    const reordered = [...products];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setBusyProductId(moved.id);
    const res = await reorderMiniShopProducts(reordered);
    setBusyProductId(null);

    if (!res.success) {
      setFeedback({ type: 'error', text: res.error || 'Failed to reorder products.' });
    }
  };

  const handleConfirmDelete = async (prod: MiniShopProduct) => {
    setFeedback(null);
    setBusyProductId(prod.id);
    const res = await deleteMiniShopProduct(prod.id);
    setBusyProductId(null);
    setConfirmDeleteId(null);

    if (!res.success) {
      setFeedback({ type: 'error', text: res.error || 'Failed to delete product.' });
      return;
    }

    if (editingProductId === prod.id) {
      resetForm();
    }

    setFeedback({
      type: 'success',
      text: `"${prod.title}" has been permanently removed.`
    });
  };

  const previewWaUrl = buildMiniShopWhatsAppUrl(whatsappNumber, title || 'Sample Product');
  const previewTelUrl = buildMiniShopTelHref(phoneNumber);

  const updateDisplayField = <K extends keyof MiniShopDisplaySettings>(
    key: K,
    val: MiniShopDisplaySettings[K]
  ) => {
    setDraftDisplay((prev) =>
      normalizeMiniShopDisplaySettings({
        ...prev,
        [key]: val
      })
    );
    setIsDisplayDirty(true);
    setDisplayFeedback(null);
  };

  const handleResetDisplayDefaults = () => {
    setDraftDisplay({ ...DEFAULT_MINI_SHOP_DISPLAY_SETTINGS });
    setIsDisplayDirty(true);
    setDisplayFeedback(null);
  };

  const handleSaveDisplaySettings = async () => {
    setDisplayFeedback(null);
    const result = await saveMiniShopDisplaySettings(draftDisplay);
    if (result.success) {
      setIsDisplayDirty(false);
      setDisplayFeedback({
        type: 'success',
        text: 'Mini Shop display settings saved to Cloud Firestore!'
      });
    } else {
      setDisplayFeedback({
        type: 'error',
        text: result.error || 'Failed to save Mini Shop display settings.'
      });
    }
  };

  const previewViewportWidth =
    previewViewport === 'mobile' ? 340 : previewViewport === 'tablet' ? 768 : 1120;
  const previewCols = resolveMiniShopColumnsForWidth(draftDisplay, previewViewportWidth);
  const previewSourceProducts: MiniShopProduct[] =
    activeProducts.length > 0
      ? activeProducts
      : [
          {
            id: 'preview-sample-1',
            title: 'Sample Product 1',
            description: 'Concise highlight shown in the Mini Shop bar',
            price: '25,000 RWF',
            imageUrl: '',
            whatsappNumber: '+250788000000',
            phoneNumber: '0788000000',
            active: true,
            displayOrder: 0,
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'preview-sample-2',
            title: 'Sample Product 2',
            description: 'Second showcase item preview',
            price: '45,000 RWF',
            imageUrl: '',
            whatsappNumber: '+250788000000',
            phoneNumber: '0788000000',
            active: true,
            displayOrder: 1,
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'preview-sample-3',
            title: 'Sample Product 3',
            description: 'Third showcase item preview',
            price: '15,000 RWF',
            imageUrl: '',
            whatsappNumber: '+250788000000',
            phoneNumber: '0788000000',
            active: true,
            displayOrder: 2,
            createdAt: '',
            updatedAt: ''
          },
          {
            id: 'preview-sample-4',
            title: 'Sample Product 4',
            description: 'Fourth showcase item preview',
            price: '60,000 RWF',
            imageUrl: '',
            whatsappNumber: '+250788000000',
            phoneNumber: '0788000000',
            active: true,
            displayOrder: 3,
            createdAt: '',
            updatedAt: ''
          }
        ];
  const previewVisibleProducts = getMiniShopVisibleSlice(previewSourceProducts, 0, previewCols);

  return (
    <div className="space-y-6">
      {/* Header Status Summary Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Fixed Top Bar Above Website Header</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Mini Shop &amp; Product Showcase
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Manage products featured inside the fixed Mini Shop bar pinned permanently at the top of public pages above the main website header. When zero products are active, the bar hides automatically with zero blank space.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-extrabold text-amber-300">{activeProducts.length}</div>
            <div className="text-[11px] font-semibold text-slate-300">Active Public</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-extrabold text-white">{products.length}</div>
            <div className="text-[11px] font-semibold text-slate-300">Total Saved</div>
          </div>
        </div>
      </div>

      {/* Feedback & Errors */}
      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-800 text-white text-[11px] font-bold shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Shop Featured Vimeo Video Manager */}
      <AdminShopVideoManager />

      {/* Mini Shop Display Settings Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Responsive Bar &amp; Card Sizing</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              Mini Shop Display Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control section dimensions, card sizing, proportional product thumbnail size, card spacing, and columns per screen size without modifying your products.
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
              onClick={handleSaveDisplaySettings}
              disabled={isPublishingDisplay}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs cursor-pointer transition-colors disabled:opacity-60"
            >
              {isPublishingDisplay ? (
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

        {displayFeedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 ${
              displayFeedback.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-rose-300 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{displayFeedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setDisplayFeedback(null)}
              className="p-1 rounded hover:bg-black/5 cursor-pointer"
              aria-label="Dismiss display settings feedback"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <DisplayNumericControl
            id="minishop-section-width-percent"
            label="Section Width"
            description="Overall Mini Shop inner bar width percentage."
            value={draftDisplay.sectionWidthPercent}
            min={MINI_SHOP_DISPLAY_LIMITS.sectionWidthPercent.min}
            max={MINI_SHOP_DISPLAY_LIMITS.sectionWidthPercent.max}
            step={MINI_SHOP_DISPLAY_LIMITS.sectionWidthPercent.step}
            unit="%"
            onChange={(val) => updateDisplayField('sectionWidthPercent', val)}
          />

          <DisplayNumericControl
            id="minishop-section-max-width-px"
            label="Section Max Width"
            description="Maximum width of the Mini Shop showcase bar."
            value={draftDisplay.sectionMaxWidthPx}
            min={MINI_SHOP_DISPLAY_LIMITS.sectionMaxWidthPx.min}
            max={MINI_SHOP_DISPLAY_LIMITS.sectionMaxWidthPx.max}
            step={MINI_SHOP_DISPLAY_LIMITS.sectionMaxWidthPx.step}
            unit="px"
            onChange={(val) => updateDisplayField('sectionMaxWidthPx', val)}
          />

          <DisplayNumericControl
            id="minishop-section-min-height-px"
            label="Display Bar Height"
            description="Minimum overall height of the Mini Shop bar."
            value={draftDisplay.sectionMinHeightPx}
            min={MINI_SHOP_DISPLAY_LIMITS.sectionMinHeightPx.min}
            max={MINI_SHOP_DISPLAY_LIMITS.sectionMinHeightPx.max}
            step={MINI_SHOP_DISPLAY_LIMITS.sectionMinHeightPx.step}
            unit="px"
            onChange={(val) => updateDisplayField('sectionMinHeightPx', val)}
          />

          <DisplayNumericControl
            id="minishop-card-width-px"
            label="Product Card Width"
            description="Maximum width of each product showcase card."
            value={draftDisplay.cardWidthPx}
            min={MINI_SHOP_DISPLAY_LIMITS.cardWidthPx.min}
            max={MINI_SHOP_DISPLAY_LIMITS.cardWidthPx.max}
            step={MINI_SHOP_DISPLAY_LIMITS.cardWidthPx.step}
            unit="px"
            onChange={(val) => updateDisplayField('cardWidthPx', val)}
          />

          <DisplayNumericControl
            id="minishop-card-height-px"
            label="Product Card Height"
            description="Minimum height of each product showcase card."
            value={draftDisplay.cardHeightPx}
            min={MINI_SHOP_DISPLAY_LIMITS.cardHeightPx.min}
            max={MINI_SHOP_DISPLAY_LIMITS.cardHeightPx.max}
            step={MINI_SHOP_DISPLAY_LIMITS.cardHeightPx.step}
            unit="px"
            onChange={(val) => updateDisplayField('cardHeightPx', val)}
          />

          <DisplayNumericControl
            id="minishop-image-size-px"
            label="Product Image Size"
            description="Square proportional thumbnail size (no distortion)."
            value={draftDisplay.imageSizePx}
            min={MINI_SHOP_DISPLAY_LIMITS.imageSizePx.min}
            max={MINI_SHOP_DISPLAY_LIMITS.imageSizePx.max}
            step={MINI_SHOP_DISPLAY_LIMITS.imageSizePx.step}
            unit="px"
            onChange={(val) => updateDisplayField('imageSizePx', val)}
          />

          <DisplayNumericControl
            id="minishop-card-gap-px"
            label="Spacing Between Cards"
            description="Gap between product cards in multi-column layout."
            value={draftDisplay.cardGapPx}
            min={MINI_SHOP_DISPLAY_LIMITS.cardGapPx.min}
            max={MINI_SHOP_DISPLAY_LIMITS.cardGapPx.max}
            step={MINI_SHOP_DISPLAY_LIMITS.cardGapPx.step}
            unit="px"
            onChange={(val) => updateDisplayField('cardGapPx', val)}
          />

          <DisplayNumericControl
            id="minishop-desktop-cols"
            label="Desktop Columns"
            description="Products displayed side-by-side on desktop (≥1024px)."
            value={draftDisplay.desktopColumns}
            min={MINI_SHOP_DISPLAY_LIMITS.desktopColumns.min}
            max={MINI_SHOP_DISPLAY_LIMITS.desktopColumns.max}
            step={MINI_SHOP_DISPLAY_LIMITS.desktopColumns.step}
            unit="col"
            onChange={(val) => updateDisplayField('desktopColumns', val)}
          />

          <DisplayNumericControl
            id="minishop-tablet-cols"
            label="Tablet Columns"
            description="Products displayed side-by-side on tablet (640–1023px)."
            value={draftDisplay.tabletColumns}
            min={MINI_SHOP_DISPLAY_LIMITS.tabletColumns.min}
            max={MINI_SHOP_DISPLAY_LIMITS.tabletColumns.max}
            step={MINI_SHOP_DISPLAY_LIMITS.tabletColumns.step}
            unit="col"
            onChange={(val) => updateDisplayField('tabletColumns', val)}
          />

          <DisplayNumericControl
            id="minishop-mobile-cols"
            label="Mobile Columns"
            description="Products displayed side-by-side on mobile (<640px)."
            value={draftDisplay.mobileColumns}
            min={MINI_SHOP_DISPLAY_LIMITS.mobileColumns.min}
            max={MINI_SHOP_DISPLAY_LIMITS.mobileColumns.max}
            step={MINI_SHOP_DISPLAY_LIMITS.mobileColumns.step}
            unit="col"
            onChange={(val) => updateDisplayField('mobileColumns', val)}
          />
        </div>

        {/* Live Mini Shop Display Preview */}
        <div className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Eye className="w-4 h-4 text-teal-700" />
              <span>Live Preview Before Saving</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal">
                ({previewCols} col · img {draftDisplay.imageSizePx}px · card {draftDisplay.cardWidthPx}×{draftDisplay.cardHeightPx}px)
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
                const isSelected = previewViewport === vp.id;
                return (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => setPreviewViewport(vp.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                      isSelected
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

          <div className="w-full overflow-x-auto bg-slate-200/70 rounded-xl border border-slate-200 p-3">
            <div
              className="mx-auto bg-transparent overflow-hidden transition-all"
              style={{ width: `${previewViewportWidth}px`, maxWidth: '100%' }}
            >
              <div
                className="mx-auto bg-slate-950 text-white rounded-lg border border-slate-800 shadow-md max-w-full px-3 py-2 flex flex-col justify-center min-w-0 transition-all"
                style={{
                  width: `${draftDisplay.sectionWidthPercent}%`,
                  maxWidth: `${draftDisplay.sectionMaxWidthPx}px`,
                  minHeight: `${draftDisplay.sectionMinHeightPx}px`
                }}
              >
                <div
                  className="w-full min-w-0"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${previewCols}, minmax(0, 1fr))`,
                    gap: `${draftDisplay.cardGapPx}px`
                  }}
                >
                  {previewVisibleProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="w-full max-w-full mx-auto rounded-xl bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 min-w-0 transition-all"
                      style={{
                        maxWidth: `${draftDisplay.cardWidthPx}px`,
                        minHeight: `${draftDisplay.cardHeightPx}px`
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="rounded-lg overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 flex items-center justify-center"
                          style={{
                            width: `${draftDisplay.imageSizePx}px`,
                            height: `${draftDisplay.imageSizePx}px`
                          }}
                        >
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.title}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <ShoppingBag className="w-4 h-4 text-amber-300" aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-extrabold text-white truncate">
                              {prod.title}
                            </span>
                            {prod.price && (
                              <span className="shrink-0 text-[10px] font-extrabold text-amber-300 bg-amber-500/15 border border-amber-400/35 px-1.5 py-0.5 rounded">
                                {prod.price}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 truncate">{prod.description}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-[#25D366] text-slate-950">
                        WhatsApp
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Product Form */}
      <div
        ref={formCardRef}
        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              {editingProductId ? 'Edit Showcase Product' : 'Add New Showcase Product'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter real seller contact numbers only — no phone number is ever auto-generated or invented.
            </p>
          </div>
          {editingProductId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Image Picker Column */}
            <div className="lg:col-span-4 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                Product Image *
              </label>

              <div className="aspect-square max-w-[220px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex flex-col items-center justify-center relative">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl('');
                        setImageStorageMode(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      title="Remove selected image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="p-4 text-center space-y-2 text-slate-500">
                    <ImagePlus className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-xs font-semibold">Upload crisp square or landscape photo</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileSelect}
                className="hidden"
                id="mini-shop-image-upload"
              />

              <label
                htmlFor="mini-shop-image-upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer transition-colors"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{uploadProgressText || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>{imageUrl ? 'Replace Image' : 'Select Product Image'}</span>
                  </>
                )}
              </label>

              {uploadNotice && (
                <p className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-2.5 py-1.5 font-medium">
                  {uploadNotice}
                </p>
              )}
            </div>

            {/* Product Details Fields */}
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Product Title / Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={MINI_SHOP_TITLE_MAX}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. HP EliteBook 840 G8 Core i7"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="text-[11px] text-slate-400 mt-1 text-right">
                    {title.length}/{MINI_SHOP_TITLE_MAX}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Price (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={MINI_SHOP_PRICE_MAX}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 450,000 RWF"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Short Product Description *
                </label>
                <textarea
                  required
                  rows={2}
                  maxLength={MINI_SHOP_DESCRIPTION_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Concise highlights visitors immediately see in the top showcase bar..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
                <div className="text-[11px] text-slate-400 mt-1 text-right">
                  {description.length}/{MINI_SHOP_DESCRIPTION_MAX}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Seller&apos;s WhatsApp Number (International)
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. +250788000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Include country code with + for WhatsApp chat link.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Seller&apos;s Telephone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +250788000000 or 0788000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Used directly by the Call button (`tel:` action).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Active — display publicly in the fixed Mini Shop bar
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSaving || isUploadingImage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-sm disabled:opacity-60 cursor-pointer transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{editingProductId ? 'Update Product' : 'Add Product to Mini Shop'}</span>
                    </>
                  )}
                </button>
              </div>

              {(previewWaUrl || previewTelUrl) && (
                <div className="bg-slate-950 text-white rounded-xl p-3 text-xs space-y-1.5 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Configured Contact Actions Preview
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {previewWaUrl && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] text-slate-950 font-bold text-[11px]">
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp Ready</span>
                      </span>
                    )}
                    {previewTelUrl && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold text-[11px]">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call: {previewTelUrl.replace(/^tel:/, '')}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Product Inventory & Order List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Configured Showcase Products ({products.length})
            </h3>
            <p className="text-xs text-slate-500">
              Visitors cycle through Active products using the &ldquo;Komeza&rdquo; button in the order listed below.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-600">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            <span>Loading Mini Shop inventory...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/70">
            <ShoppingBag className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No Mini Shop products configured yet.</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add your first product above to display the fixed Mini Shop bar above the public website header. Until an active product exists, the bar remains completely hidden.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((prod, idx) => {
              const isBusy = busyProductId === prod.id;
              const isConfirmingDelete = confirmDeleteId === prod.id;

              return (
                <div
                  key={prod.id}
                  className={`rounded-xl border p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    prod.active
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-200 bg-slate-50 opacity-85'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 truncate">
                          {prod.title}
                        </h4>
                        {prod.price && (
                          <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {prod.price}
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            prod.active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {prod.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">{prod.description}</p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600 font-medium">
                        {prod.whatsappNumber && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp: {prod.whatsappNumber}</span>
                          </span>
                        )}
                        {prod.phoneNumber && (
                          <span className="inline-flex items-center gap-1 text-teal-800 font-bold">
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call: {prod.phoneNumber}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <button
                        type="button"
                        disabled={idx === 0 || isBusy}
                        onClick={() => handleMove(idx, 'up')}
                        className="p-2 hover:bg-slate-100 text-slate-700 disabled:opacity-35 cursor-pointer"
                        title="Move earlier in rotation"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === products.length - 1 || isBusy}
                        onClick={() => handleMove(idx, 'down')}
                        className="p-2 hover:bg-slate-100 text-slate-700 border-l border-slate-200 disabled:opacity-35 cursor-pointer"
                        title="Move later in rotation"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleActive(prod)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                        prod.active
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {prod.active ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleEditProduct(prod)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {!isConfirmingDelete ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(prod.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-lg px-2 py-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleConfirmDelete(prod)}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded bg-white text-slate-700 text-[11px] font-semibold border border-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
