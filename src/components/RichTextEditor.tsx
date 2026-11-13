import React, { useRef, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Undo2,
  Redo2,
  RemoveFormatting,
  Code,
  Upload,
  X,
  Loader2,
  Lock,
  Unlock,
  Maximize2,
  Trash2
} from 'lucide-react';
import { uploadAndOptimizeBlogImage } from '../services/blogService';
import { BlogImageAlignment, BlogImageSizePreset } from '../types/blog';

export const EDITOR_FONT_FAMILIES = [
  { label: 'Default (Lora Editorial)', value: "'Lora', Georgia, serif" },
  { label: 'Playfair Display (Serif)', value: "'Playfair Display', Georgia, serif" },
  { label: 'EB Garamond (Classic Serif)', value: "'EB Garamond', Georgia, serif" },
  { label: 'Merriweather (Readable Serif)', value: "'Merriweather', Georgia, serif" },
  { label: 'Georgia (System Serif)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Poppins (Clean Sans)', value: "'Poppins', system-ui, sans-serif" },
  { label: 'Montserrat (Geometric Sans)', value: "'Montserrat', system-ui, sans-serif" },
  { label: 'Open Sans (Neutral Sans)', value: "'Open Sans', system-ui, sans-serif" },
  { label: 'Lato (Modern Sans)', value: "'Lato', system-ui, sans-serif" },
  { label: 'Fira Code (Monospace)', value: "'Fira Code', monospace" }
] as const;

export const EDITOR_FONT_SIZES = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '34px', value: '34px' }
] as const;

export const IMAGE_SIZE_PRESETS: Record<Exclude<BlogImageSizePreset, 'custom'>, number> = {
  small: 300,
  medium: 500,
  large: 760
};

export function computeProportionalHeight(
  width: number,
  naturalWidth: number,
  naturalHeight: number
): number {
  const safeW = Math.max(60, Math.round(width));
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return Math.round(safeW * 0.625);
  }
  return Math.max(40, Math.round((safeW * naturalHeight) / naturalWidth));
}

export function computeProportionalWidth(
  height: number,
  naturalWidth: number,
  naturalHeight: number
): number {
  const safeH = Math.max(40, Math.round(height));
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return Math.round(safeH * 1.6);
  }
  return Math.max(60, Math.round((safeH * naturalWidth) / naturalHeight));
}

export interface ArticleImageFigureOptions {
  src: string;
  alt?: string;
  width: number;
  height: number;
  sizePreset: BlogImageSizePreset;
  alignment: BlogImageAlignment;
  lockAspectRatio: boolean;
}

export function buildBlogFigureStyle(
  alignment: BlogImageAlignment,
  sizePreset: BlogImageSizePreset,
  width: number
): string {
  const marginCss =
    alignment === 'left'
      ? '1.25rem auto 1.25rem 0'
      : alignment === 'right'
      ? '1.25rem 0 1.25rem auto'
      : '1.5rem auto';
  const widthCss = sizePreset === 'large' ? '100%' : `${Math.max(60, Math.round(width))}px`;
  return `width:${widthCss};max-width:100%;margin:${marginCss};text-align:${alignment};display:block;`;
}

export function buildBlogImgStyle(
  sizePreset: BlogImageSizePreset,
  width: number,
  height: number,
  lockAspectRatio: boolean
): string {
  const safeW = Math.max(60, Math.round(width));
  const safeH = Math.max(40, Math.round(height));
  const widthCss = sizePreset === 'large' ? '100%' : `${safeW}px`;
  const heightCss = lockAspectRatio
    ? `height:auto;aspect-ratio:${safeW} / ${safeH};`
    : `height:${safeH}px;`;
  return `width:${widthCss};max-width:100%;${heightCss}object-fit:cover;border-radius:0.75rem;display:block;`;
}

export function buildBlogFigureHtml(opts: ArticleImageFigureOptions): string {
  const safeAlt = (opts.alt || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeW = Math.max(60, Math.round(opts.width));
  const safeH = Math.max(40, Math.round(opts.height));
  const figureStyle = buildBlogFigureStyle(opts.alignment, opts.sizePreset, safeW);
  const imgStyle = buildBlogImgStyle(opts.sizePreset, safeW, safeH, opts.lockAspectRatio);
  const captionHtml = opts.alt?.trim()
    ? `<figcaption style="font-size:0.75rem;color:#64748b;margin-top:0.5rem;font-style:italic;text-align:${opts.alignment};">${safeAlt}</figcaption>`
    : '';

  return `<figure data-blog-figure="true" data-align="${opts.alignment}" data-size-preset="${opts.sizePreset}" style="${figureStyle}"><img src="${opts.src}" alt="${safeAlt}" data-size-preset="${opts.sizePreset}" data-align="${opts.alignment}" data-width="${safeW}" data-height="${safeH}" data-proportional="${opts.lockAspectRatio ? 'true' : 'false'}" style="${imgStyle}" />${captionHtml}</figure>`;
}

interface ImageConfigState {
  src: string;
  alt: string;
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
  sizePreset: BlogImageSizePreset;
  alignment: BlogImageAlignment;
  lockAspectRatio: boolean;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  hideImageUrlInput?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your article content across clear paragraphs...',
  minHeight = '380px',
  hideImageUrlInput = true
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastEmittedHtmlRef = useRef<string>('');
  const selectedImgRef = useRef<HTMLImageElement | null>(null);

  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(value || '');
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>(EDITOR_FONT_FAMILIES[0].value);
  const [selectedFontSize, setSelectedFontSize] = useState<string>('16px');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  // Inline Image Insert & Resize Modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [editingExistingImg, setEditingExistingImg] = useState(false);
  const [pendingImg, setPendingImg] = useState<ImageConfigState | null>(null);
  const [imageAltInput, setImageAltInput] = useState('');
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const [inlineImageError, setInlineImageError] = useState<string | null>(null);

  // Selected image inside contentEditable for quick & visual on-canvas resizing
  const [selectedImgState, setSelectedImgState] = useState<{
    width: number;
    height: number;
    naturalWidth: number;
    naturalHeight: number;
    sizePreset: BlogImageSizePreset;
    alignment: BlogImageAlignment;
    lockAspectRatio: boolean;
    overlayRect: { top: number; left: number; width: number; height: number } | null;
  } | null>(null);

  // Visual drag resize state inside editor canvas
  const canvasDragRef = useRef<{
    startX: number;
    startWidth: number;
    naturalWidth: number;
    naturalHeight: number;
    lockAspectRatio: boolean;
    alignment: BlogImageAlignment;
  } | null>(null);

  // Visual drag resize state inside image modal preview
  const modalPreviewRef = useRef<HTMLDivElement>(null);
  const modalDragRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const incoming = value || '';
    if (incoming !== lastEmittedHtmlRef.current) {
      lastEmittedHtmlRef.current = incoming;
      setRawHtml(incoming);
      if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== incoming) {
        editorRef.current.innerHTML = incoming;
      }
      selectedImgRef.current = null;
      setSelectedImgState(null);
    } else if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== incoming) {
      // Ensure editor canvas populates when mounting with an existing article or returning from HTML mode
      editorRef.current.innerHTML = incoming;
    }
  }, [value, isHtmlMode]);

  const computeOverlayRect = (img: HTMLImageElement) => {
    if (!editorWrapperRef.current) return null;
    const wrapRect = editorWrapperRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (imgRect.width === 0 && imgRect.height === 0) return null;
    return {
      top: imgRect.top - wrapRect.top,
      left: imgRect.left - wrapRect.left,
      width: imgRect.width,
      height: imgRect.height
    };
  };

  const syncSelectedImgStateFromDom = (img: HTMLImageElement) => {
    const naturalW = img.naturalWidth || parseInt(img.getAttribute('data-width') || '500', 10) || 500;
    const naturalH = img.naturalHeight || parseInt(img.getAttribute('data-height') || '320', 10) || 320;
    const attrW = parseInt(img.getAttribute('data-width') || '', 10);
    const renderedW = Math.round(img.getBoundingClientRect().width) || attrW || Math.min(500, naturalW);
    const attrH = parseInt(img.getAttribute('data-height') || '', 10);
    const renderedH = Math.round(img.getBoundingClientRect().height) || attrH || computeProportionalHeight(renderedW, naturalW, naturalH);
    const preset = (img.getAttribute('data-size-preset') as BlogImageSizePreset) || 'medium';
    const fig = img.closest('figure');
    const align =
      ((img.getAttribute('data-align') || fig?.getAttribute('data-align')) as BlogImageAlignment) || 'center';
    const proportional = img.getAttribute('data-proportional') !== 'false';

    setSelectedImgState({
      width: attrW || renderedW,
      height: attrH || renderedH,
      naturalWidth: naturalW,
      naturalHeight: naturalH,
      sizePreset: preset,
      alignment: align,
      lockAspectRatio: proportional,
      overlayRect: computeOverlayRect(img)
    });
  };

  // Reposition selected image highlight overlay on resize/scroll
  useEffect(() => {
    if (!selectedImgRef.current) return;
    const refreshOverlay = () => {
      if (selectedImgRef.current && editorRef.current?.contains(selectedImgRef.current)) {
        const rect = computeOverlayRect(selectedImgRef.current);
        setSelectedImgState((prev) => (prev ? { ...prev, overlayRect: rect } : null));
      }
    };
    window.addEventListener('resize', refreshOverlay);
    return () => window.removeEventListener('resize', refreshOverlay);
  }, [selectedImgState?.width, selectedImgState?.height, selectedImgState?.alignment]);

  const saveCurrentSelection = () => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSavedSelection = () => {
    if (typeof window === 'undefined' || !savedRangeRef.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const emitChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastEmittedHtmlRef.current = html;
    setRawHtml(html);
    onChange(html);
  };

  const executeCommand = (command: string, arg?: string) => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    restoreSavedSelection();
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      // ignore
    }
    document.execCommand(command, false, arg);
    saveCurrentSelection();
    emitChange();
  };

  const applyInlineStyleToSelection = (styleProp: 'fontFamily' | 'fontSize', styleValue: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    editorRef.current?.focus();
    restoreSavedSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) {
      const span = document.createElement('span');
      span.style[styleProp] = styleValue;
      span.appendChild(document.createTextNode('\u200B'));
      range.insertNode(span);
      const newRange = document.createRange();
      newRange.setStart(span.firstChild!, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      const span = document.createElement('span');
      span.style[styleProp] = styleValue;
      try {
        const extracted = range.extractContents();
        span.appendChild(extracted);
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(newRange);
      } catch {
        if (styleProp === 'fontFamily') {
          document.execCommand('fontName', false, styleValue);
        } else {
          document.execCommand('fontSize', false, '4');
          const fonts = editorRef.current?.querySelectorAll('font[size="4"]');
          fonts?.forEach((f) => {
            const replacement = document.createElement('span');
            replacement.style.fontSize = styleValue;
            replacement.innerHTML = f.innerHTML;
            f.replaceWith(replacement);
          });
        }
      }
    }

    saveCurrentSelection();
    emitChange();
  };

  const handleFontFamilyChange = (family: string) => {
    setSelectedFontFamily(family);
    applyInlineStyleToSelection('fontFamily', family);
  };

  const handleFontSizeChange = (size: string) => {
    setSelectedFontSize(size);
    applyInlineStyleToSelection('fontSize', size);
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:') && !url.startsWith('/')) {
      url = `https://${url}`;
    }

    editorRef.current?.focus();
    restoreSavedSelection();
    if (linkText.trim()) {
      const safeUrl = url.replace(/"/g, '&quot;');
      const safeText = linkText.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const linkHtml = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#0f766e;text-decoration:underline;font-weight:600;">${safeText}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
    } else {
      document.execCommand('createLink', false, url);
    }

    setLinkUrl('');
    setLinkText('');
    setIsLinkModalOpen(false);
    emitChange();
  };

  // Load natural dimensions of uploaded image so default aspect ratio is strictly preserved
  const probeImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => {
        resolve({
          width: probe.naturalWidth || 800,
          height: probe.naturalHeight || 500
        });
      };
      probe.onerror = () => resolve({ width: 800, height: 500 });
      probe.src = src;
    });
  };

  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setInlineImageError(null);
    setIsUploadingInlineImage(true);

    try {
      const result = await uploadAndOptimizeBlogImage(file, 'inline');
      if (!result.success || !result.url) {
        setInlineImageError(result.error || 'Could not process the selected image.');
        return;
      }

      const dims = await probeImageDimensions(result.url);
      const defaultW = Math.min(IMAGE_SIZE_PRESETS.medium, dims.width);
      const defaultH = computeProportionalHeight(defaultW, dims.width, dims.height);

      setPendingImg({
        src: result.url,
        alt: imageAltInput.trim() || file.name.replace(/\.[^/.]+$/, ''),
        naturalWidth: dims.width,
        naturalHeight: dims.height,
        width: defaultW,
        height: defaultH,
        sizePreset: 'medium',
        alignment: 'center',
        lockAspectRatio: true
      });
      if (!imageAltInput.trim()) {
        setImageAltInput(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: unknown) {
      setInlineImageError(err instanceof Error ? err.message : 'Failed to load image.');
    } finally {
      setIsUploadingInlineImage(false);
    }
  };

  // Apply sizing/alignment changes directly to an already-inserted <img> inside the editor DOM
  const applySettingsToDomImg = (
    img: HTMLImageElement,
    opts: {
      width: number;
      height: number;
      sizePreset: BlogImageSizePreset;
      alignment: BlogImageAlignment;
      lockAspectRatio: boolean;
      alt?: string;
    }
  ) => {
    const safeW = Math.max(60, Math.round(opts.width));
    const safeH = Math.max(40, Math.round(opts.height));

    img.setAttribute('data-size-preset', opts.sizePreset);
    img.setAttribute('data-align', opts.alignment);
    img.setAttribute('data-width', String(safeW));
    img.setAttribute('data-height', String(safeH));
    img.setAttribute('data-proportional', opts.lockAspectRatio ? 'true' : 'false');
    if (opts.alt !== undefined) {
      img.setAttribute('alt', opts.alt);
    }

    img.setAttribute(
      'style',
      buildBlogImgStyle(opts.sizePreset, safeW, safeH, opts.lockAspectRatio)
    );

    const existingFig = img.closest('figure');
    if (existingFig) {
      existingFig.setAttribute('data-blog-figure', 'true');
      existingFig.setAttribute('data-align', opts.alignment);
      existingFig.setAttribute('data-size-preset', opts.sizePreset);
      existingFig.setAttribute(
        'style',
        buildBlogFigureStyle(opts.alignment, opts.sizePreset, safeW)
      );
      const captionEl = existingFig.querySelector('figcaption');
      if (captionEl) {
        if (opts.alt !== undefined) {
          if (opts.alt.trim()) {
            captionEl.textContent = opts.alt.trim();
            (captionEl as HTMLElement).style.textAlign = opts.alignment;
          } else {
            captionEl.remove();
          }
        } else {
          (captionEl as HTMLElement).style.textAlign = opts.alignment;
        }
      }
    }

    emitChange();
    requestAnimationFrame(() => {
      if (selectedImgRef.current === img) {
        syncSelectedImgStateFromDom(img);
      }
    });
  };

  const handleConfirmPendingImage = () => {
    if (!pendingImg) return;
    const altVal = imageAltInput.trim();

    if (editingExistingImg && selectedImgRef.current && editorRef.current?.contains(selectedImgRef.current)) {
      applySettingsToDomImg(selectedImgRef.current, {
        width: pendingImg.width,
        height: pendingImg.height,
        sizePreset: pendingImg.sizePreset,
        alignment: pendingImg.alignment,
        lockAspectRatio: pendingImg.lockAspectRatio,
        alt: altVal
      });
    } else {
      const figureHtml =
        buildBlogFigureHtml({
          src: pendingImg.src,
          alt: altVal,
          width: pendingImg.width,
          height: pendingImg.height,
          sizePreset: pendingImg.sizePreset,
          alignment: pendingImg.alignment,
          lockAspectRatio: pendingImg.lockAspectRatio
        }) + '<p></p>';

      editorRef.current?.focus();
      restoreSavedSelection();
      document.execCommand('insertHTML', false, figureHtml);
      emitChange();
    }

    setPendingImg(null);
    setEditingExistingImg(false);
    setImageAltInput('');
    setIsImageModalOpen(false);
  };

  const openModalForNewImage = () => {
    setInlineImageError(null);
    setEditingExistingImg(false);
    setPendingImg(null);
    setImageAltInput('');
    setIsImageModalOpen(true);
  };

  const openModalToCustomizeSelectedImage = () => {
    const img = selectedImgRef.current;
    if (!img || !selectedImgState) return;
    setInlineImageError(null);
    setEditingExistingImg(true);
    setImageAltInput(img.getAttribute('alt') || '');
    setPendingImg({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      naturalWidth: selectedImgState.naturalWidth,
      naturalHeight: selectedImgState.naturalHeight,
      width: selectedImgState.width,
      height: selectedImgState.height,
      sizePreset: selectedImgState.sizePreset,
      alignment: selectedImgState.alignment,
      lockAspectRatio: selectedImgState.lockAspectRatio
    });
    setIsImageModalOpen(true);
  };

  const handlePendingPresetChange = (preset: BlogImageSizePreset) => {
    if (!pendingImg) return;
    if (preset === 'custom') {
      setPendingImg({ ...pendingImg, sizePreset: 'custom' });
      return;
    }
    const targetW = IMAGE_SIZE_PRESETS[preset];
    const targetH = pendingImg.lockAspectRatio
      ? computeProportionalHeight(targetW, pendingImg.naturalWidth, pendingImg.naturalHeight)
      : pendingImg.height;
    setPendingImg({
      ...pendingImg,
      sizePreset: preset,
      width: targetW,
      height: targetH
    });
  };

  const handlePendingWidthChange = (rawW: number) => {
    if (!pendingImg) return;
    const clampedW = Math.max(60, Math.min(1200, Math.round(rawW || 60)));
    const nextH = pendingImg.lockAspectRatio
      ? computeProportionalHeight(clampedW, pendingImg.naturalWidth, pendingImg.naturalHeight)
      : pendingImg.height;
    setPendingImg({
      ...pendingImg,
      sizePreset: 'custom',
      width: clampedW,
      height: nextH
    });
  };

  const handlePendingHeightChange = (rawH: number) => {
    if (!pendingImg) return;
    const clampedH = Math.max(40, Math.min(1200, Math.round(rawH || 40)));
    const nextW = pendingImg.lockAspectRatio
      ? computeProportionalWidth(clampedH, pendingImg.naturalWidth, pendingImg.naturalHeight)
      : pendingImg.width;
    setPendingImg({
      ...pendingImg,
      sizePreset: 'custom',
      width: nextW,
      height: clampedH
    });
  };

  // Visual drag resize inside Modal Preview
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (modalDragRef.current && pendingImg) {
        const dx = e.clientX - modalDragRef.current.startX;
        handlePendingWidthChange(modalDragRef.current.startWidth + dx);
      }
      if (canvasDragRef.current && selectedImgRef.current) {
        const dx = e.clientX - canvasDragRef.current.startX;
        const maxEditorW = editorRef.current ? Math.max(240, editorRef.current.clientWidth - 48) : 760;
        const nextW = Math.max(80, Math.min(maxEditorW, Math.round(canvasDragRef.current.startWidth + dx)));
        const nextH = canvasDragRef.current.lockAspectRatio
          ? computeProportionalHeight(nextW, canvasDragRef.current.naturalWidth, canvasDragRef.current.naturalHeight)
          : selectedImgState?.height || computeProportionalHeight(nextW, canvasDragRef.current.naturalWidth, canvasDragRef.current.naturalHeight);
        applySettingsToDomImg(selectedImgRef.current, {
          width: nextW,
          height: nextH,
          sizePreset: 'custom',
          alignment: canvasDragRef.current.alignment,
          lockAspectRatio: canvasDragRef.current.lockAspectRatio
        });
      }
    };

    const handlePointerUp = () => {
      modalDragRef.current = null;
      canvasDragRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  });

  // Handle clicking inside the editor to detect image selection
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'IMG' && editorRef.current?.contains(target)) {
      const img = target as HTMLImageElement;
      selectedImgRef.current = img;
      syncSelectedImgStateFromDom(img);
    } else {
      selectedImgRef.current = null;
      setSelectedImgState(null);
      saveCurrentSelection();
    }
  };

  const handleSelectedQuickPreset = (preset: Exclude<BlogImageSizePreset, 'custom'>) => {
    const img = selectedImgRef.current;
    if (!img || !selectedImgState) return;
    const targetW = IMAGE_SIZE_PRESETS[preset];
    const targetH = selectedImgState.lockAspectRatio
      ? computeProportionalHeight(targetW, selectedImgState.naturalWidth, selectedImgState.naturalHeight)
      : selectedImgState.height;
    applySettingsToDomImg(img, {
      width: targetW,
      height: targetH,
      sizePreset: preset,
      alignment: selectedImgState.alignment,
      lockAspectRatio: selectedImgState.lockAspectRatio
    });
  };

  const handleSelectedAlignment = (alignment: BlogImageAlignment) => {
    const img = selectedImgRef.current;
    if (!img || !selectedImgState) return;
    applySettingsToDomImg(img, {
      width: selectedImgState.width,
      height: selectedImgState.height,
      sizePreset: selectedImgState.sizePreset,
      alignment,
      lockAspectRatio: selectedImgState.lockAspectRatio
    });
  };

  const handleRemoveSelectedImage = () => {
    const img = selectedImgRef.current;
    if (!img) return;
    const fig = img.closest('figure');
    if (fig && editorRef.current?.contains(fig)) {
      fig.remove();
    } else {
      img.remove();
    }
    selectedImgRef.current = null;
    setSelectedImgState(null);
    emitChange();
  };

  const handleRawHtmlChange = (newHtml: string) => {
    lastEmittedHtmlRef.current = newHtml;
    setRawHtml(newHtml);
    onChange(newHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = newHtml;
    }
  };

  const plainText = rawHtml.replace(/<[^>]*>/g, ' ').replace(/\u200B/g, '').trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = plainText.length;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-teal-600 focus-within:border-teal-600 transition-all">
      {/* Formatting Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1.5 select-none text-slate-700">
        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-300">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('undo')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Undo"
            aria-label="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('redo')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Redo"
            aria-label="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Font Family & Font Size Controls */}
        <div className="flex items-center space-x-1.5 pr-1.5 border-r border-slate-300">
          <select
            aria-label="Font Family"
            title="Font Family"
            value={selectedFontFamily}
            onMouseDown={saveCurrentSelection}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="h-7 px-2 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer max-w-[160px]"
          >
            {EDITOR_FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Font Size"
            title="Font Size"
            value={selectedFontSize}
            onMouseDown={saveCurrentSelection}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="h-7 px-2 text-xs font-medium bg-white border border-slate-300 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer tabular-nums"
          >
            {EDITOR_FONT_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Headings & Paragraph */}
        <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-300">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('formatBlock', '<h1>')}
            className="px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('formatBlock', '<h2>')}
            className="px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('formatBlock', '<h3>')}
            className="px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('formatBlock', '<p>')}
            className="px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Normal Paragraph"
          >
            P
          </button>
        </div>

        {/* Bold / Italic / Underline / Strikethrough */}
        <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-300">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
            title="Bold (Ctrl+B)"
            aria-label="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded hover:bg-slate-200 italic text-slate-800 cursor-pointer"
            title="Italic (Ctrl+I)"
            aria-label="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded hover:bg-slate-200 underline text-slate-800 cursor-pointer"
            title="Underline (Ctrl+U)"
            aria-label="Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded hover:bg-slate-200 line-through text-slate-800 cursor-pointer"
            title="Strikethrough"
            aria-label="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Text Alignment: Left, Center, Right, Justify */}
        <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-300">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Align Left"
            aria-label="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Align Center"
            aria-label="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Align Right"
            aria-label="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('justifyFull')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Justify Text"
            aria-label="Align Justify"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lists & Blockquote */}
        <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-300">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Bulleted List"
            aria-label="Bulleted List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Numbered List"
            aria-label="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Blockquote"
            aria-label="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inserts: Link, Device Photo Upload + Resize, Divider */}
        <div className="flex items-center space-x-1 pr-1.5 border-r border-slate-300">
          <button
            type="button"
            onMouseDown={() => saveCurrentSelection()}
            onClick={() => setIsLinkModalOpen(true)}
            className="p-1.5 rounded hover:bg-slate-200 text-teal-700 cursor-pointer"
            title="Insert Hyperlink"
            aria-label="Insert Hyperlink"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={() => saveCurrentSelection()}
            onClick={openModalForNewImage}
            className="px-2 py-1 rounded hover:bg-teal-100 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold cursor-pointer inline-flex items-center space-x-1"
            title="Insert & Resize Image from Device"
            aria-label="Insert Image from Device"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Insert Photo</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('insertHorizontalRule')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Insert Horizontal Divider"
            aria-label="Insert Horizontal Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clear Formatting & HTML Source */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
            title="Clear Formatting"
            aria-label="Clear Formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsHtmlMode(!isHtmlMode)}
            className={`px-2 py-1 text-xs font-semibold rounded cursor-pointer transition-colors inline-flex items-center space-x-1 ${
              isHtmlMode ? 'bg-teal-700 text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Toggle HTML Source"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{isHtmlMode ? 'Visual' : 'HTML'}</span>
          </button>
        </div>
      </div>

      {/* Selected Image Contextual Resize & Alignment Toolbar (appears when an inserted image is clicked) */}
      {!isHtmlMode && selectedImgState && (
        <div className="bg-teal-50/80 border-b border-teal-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-teal-900 mr-1">Image Size:</span>
            {(['small', 'medium', 'large'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSelectedQuickPreset(preset)}
                className={`px-2 py-1 rounded font-semibold capitalize cursor-pointer border ${
                  selectedImgState.sizePreset === preset
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {preset}
              </button>
            ))}

            <button
              type="button"
              onClick={openModalToCustomizeSelectedImage}
              className={`px-2 py-1 rounded font-semibold cursor-pointer border inline-flex items-center space-x-1 ${
                selectedImgState.sizePreset === 'custom'
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>Custom ({selectedImgState.width}×{selectedImgState.height})</span>
            </button>

            <input
              type="range"
              aria-label="Visual image width slider"
              min={100}
              max={800}
              value={Math.min(800, Math.max(100, selectedImgState.width))}
              onChange={(e) => {
                const img = selectedImgRef.current;
                if (!img) return;
                const w = Number(e.target.value);
                const h = selectedImgState.lockAspectRatio
                  ? computeProportionalHeight(w, selectedImgState.naturalWidth, selectedImgState.naturalHeight)
                  : selectedImgState.height;
                applySettingsToDomImg(img, {
                  width: w,
                  height: h,
                  sizePreset: 'custom',
                  alignment: selectedImgState.alignment,
                  lockAspectRatio: selectedImgState.lockAspectRatio
                });
              }}
              className="w-24 accent-teal-700 cursor-pointer ml-1"
              title="Drag to resize image visually"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-teal-900">Align:</span>
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() => handleSelectedAlignment(align)}
                className={`p-1.5 rounded border cursor-pointer ${
                  selectedImgState.alignment === align
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
                title={`Align Image ${align}`}
                aria-label={`Align Image ${align}`}
              >
                {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
              </button>
            ))}

            <button
              type="button"
              onClick={handleRemoveSelectedImage}
              className="ml-1 inline-flex items-center space-x-1 px-2 py-1 rounded border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
              title="Remove selected image"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Writing Area */}
      {isHtmlMode ? (
        <textarea
          value={rawHtml}
          onChange={(e) => handleRawHtmlChange(e.target.value)}
          className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-300 focus:outline-none"
          style={{ minHeight }}
          placeholder="Edit HTML..."
        />
      ) : (
        <div ref={editorWrapperRef} className="relative">
          <div
            ref={editorRef}
            contentEditable
            onInput={emitChange}
            onClick={handleEditorClick}
            onKeyUp={saveCurrentSelection}
            onMouseUp={saveCurrentSelection}
            className="blog-rich-editor-surface p-5 sm:p-6 focus:outline-none text-slate-900 leading-relaxed text-base max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_blockquote]:border-y [&_blockquote]:border-slate-200 [&_blockquote]:py-3 [&_blockquote]:px-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-4 [&_img]:cursor-pointer"
            style={{ minHeight }}
            data-placeholder={placeholder}
          />

          {/* Interactive On-Canvas Drag Handle Overlay for Selected Image */}
          {selectedImgState?.overlayRect && (
            <div
              className="pointer-events-none absolute border-2 border-teal-600 rounded-xl"
              style={{
                top: selectedImgState.overlayRect.top,
                left: selectedImgState.overlayRect.left,
                width: selectedImgState.overlayRect.width,
                height: selectedImgState.overlayRect.height
              }}
            >
              <button
                type="button"
                aria-label="Drag to resize image visually"
                title="Drag corner to resize image"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  canvasDragRef.current = {
                    startX: e.clientX,
                    startWidth: selectedImgState.width,
                    naturalWidth: selectedImgState.naturalWidth,
                    naturalHeight: selectedImgState.naturalHeight,
                    lockAspectRatio: selectedImgState.lockAspectRatio,
                    alignment: selectedImgState.alignment
                  };
                }}
                className="pointer-events-auto absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-teal-700 border-2 border-white shadow-md cursor-nwse-resize flex items-center justify-center"
              />
            </div>
          )}
        </div>
      )}

      {/* Footer Stats Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center space-x-4 tabular-nums">
          <span>
            Words: <strong className="text-slate-800">{wordCount}</strong>
          </span>
          <span>
            Characters: <strong className="text-slate-800">{charCount}</strong>
          </span>
          <span>
            Est. read time: <strong className="text-slate-800">{Math.max(1, Math.ceil(wordCount / 200))} min</strong>
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          Tip: Click any inserted photo to resize or align it
        </span>
      </div>

      {/* Hidden device image input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLocalImageUpload}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />

      {/* Insert Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <LinkIcon className="w-4 h-4 text-teal-700" />
                <span>Insert Link</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link URL:
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Text (optional):
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link label"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-teal-700 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 cursor-pointer"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert & Resize Photo Modal (Device Upload Only — No Image URL input) */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 overflow-y-auto p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 border border-slate-200 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-teal-700" />
                <span>{editingExistingImg ? 'Resize & Align Article Photo' : 'Insert & Size Photo from Device'}</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsImageModalOpen(false);
                  setPendingImg(null);
                  setEditingExistingImg(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                aria-label="Close image dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!pendingImg ? (
              <div className="space-y-4">
                {inlineImageError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                    {inlineImageError}
                  </div>
                )}

                <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-3">
                  <p className="text-xs sm:text-sm font-semibold text-slate-800">
                    Choose a photo directly from your phone or computer
                  </p>
                  <button
                    type="button"
                    disabled={isUploadingInlineImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                  >
                    {isUploadingInlineImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Preparing photo...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Select Photo File</span>
                      </>
                    )}
                  </button>
                  {hideImageUrlInput && (
                    <p className="text-[11px] text-slate-500">
                      After selecting a photo, you can choose Small, Medium, Large, or Custom dimensions and alignment before inserting.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Size Presets & Alignment Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preset Size Buttons */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Size Preset
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['small', 'medium', 'large', 'custom'] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handlePendingPresetChange(preset)}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize border transition-colors cursor-pointer ${
                            pendingImg.sizePreset === preset
                              ? 'bg-teal-700 text-white border-teal-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alignment Buttons */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Image Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => setPendingImg({ ...pendingImg, alignment: align })}
                          className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize border transition-colors cursor-pointer inline-flex items-center justify-center space-x-1 ${
                            pendingImg.alignment === align
                              ? 'bg-teal-700 text-white border-teal-700'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                          {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                          {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                          <span>{align}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Width, Height, Aspect Ratio Lock & Visual Resize Slider */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[110px]">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        min={60}
                        max={1200}
                        value={pendingImg.width}
                        onChange={(e) => handlePendingWidthChange(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-semibold tabular-nums border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextLock = !pendingImg.lockAspectRatio;
                        const nextH = nextLock
                          ? computeProportionalHeight(pendingImg.width, pendingImg.naturalWidth, pendingImg.naturalHeight)
                          : pendingImg.height;
                        setPendingImg({
                          ...pendingImg,
                          lockAspectRatio: nextLock,
                          height: nextH
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer ${
                        pendingImg.lockAspectRatio
                          ? 'bg-teal-50 border-teal-300 text-teal-900'
                          : 'bg-white border-slate-300 text-slate-600'
                      }`}
                      title="Toggle proportional aspect ratio lock"
                    >
                      {pendingImg.lockAspectRatio ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Proportional</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Free Ratio</span>
                        </>
                      )}
                    </button>

                    <div className="flex-1 min-w-[110px]">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        min={40}
                        max={1200}
                        value={pendingImg.height}
                        onChange={(e) => handlePendingHeightChange(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-semibold tabular-nums border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>Visual Resize Slider</span>
                      <span className="tabular-nums font-semibold text-slate-800">
                        {pendingImg.sizePreset === 'large'
                          ? `Full width (${pendingImg.width}×${pendingImg.height}px)`
                          : `${pendingImg.width} × ${pendingImg.height}px`}
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Resize image width"
                      min={100}
                      max={800}
                      value={Math.min(800, Math.max(100, pendingImg.width))}
                      onChange={(e) => handlePendingWidthChange(Number(e.target.value))}
                      className="w-full accent-teal-700 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Interactive Live Visual Preview (shows alignment + drag handle) */}
                <div
                  ref={modalPreviewRef}
                  className="border border-slate-200 rounded-xl bg-slate-100/70 p-4 overflow-hidden"
                >
                  <div className="text-[11px] font-semibold text-slate-500 mb-2">
                    Live Preview (drag bottom-right corner handle to resize visually)
                  </div>
                  <div
                    className="relative inline-block max-w-full"
                    style={{
                      display: 'block',
                      width: pendingImg.sizePreset === 'large' ? '100%' : `${pendingImg.width}px`,
                      maxWidth: '100%',
                      marginLeft: pendingImg.alignment === 'left' ? '0' : 'auto',
                      marginRight: pendingImg.alignment === 'right' ? '0' : 'auto'
                    }}
                  >
                    <img
                      src={pendingImg.src}
                      alt={imageAltInput || 'Preview'}
                      style={{
                        width: '100%',
                        maxWidth: '100%',
                        height: pendingImg.lockAspectRatio ? 'auto' : `${Math.min(320, pendingImg.height)}px`,
                        aspectRatio: pendingImg.lockAspectRatio
                          ? `${pendingImg.width} / ${pendingImg.height}`
                          : undefined,
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '0.75rem',
                        display: 'block'
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Drag handle to resize preview"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        modalDragRef.current = {
                          startX: e.clientX,
                          startWidth: pendingImg.width
                        };
                      }}
                      className="absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-teal-700 border-2 border-white shadow cursor-nwse-resize"
                      title="Drag to resize"
                    />
                  </div>
                </div>

                {/* Caption / Alt Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Caption / Alt Text (optional)
                  </label>
                  <input
                    type="text"
                    value={imageAltInput}
                    onChange={(e) => setImageAltInput(e.target.value)}
                    placeholder="Describe this photo"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {pendingImg && !editingExistingImg ? (
                <button
                  type="button"
                  onClick={() => setPendingImg(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Choose Another Photo
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImageModalOpen(false);
                    setPendingImg(null);
                    setEditingExistingImg(false);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                {pendingImg && (
                  <button
                    type="button"
                    onClick={handleConfirmPendingImage}
                    className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-600 text-white rounded-xl cursor-pointer"
                  >
                    {editingExistingImg ? 'Apply Size & Alignment' : 'Insert Image'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
