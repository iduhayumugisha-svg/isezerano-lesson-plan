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
  Loader2
} from 'lucide-react';
import { uploadAndOptimizeBlogImage } from '../services/blogService';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastEmittedHtmlRef = useRef<string>(value || '');

  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(value || '');
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>(EDITOR_FONT_FAMILIES[0].value);
  const [selectedFontSize, setSelectedFontSize] = useState<string>('16px');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageAlt, setImageAlt] = useState('');
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const [inlineImageError, setInlineImageError] = useState<string | null>(null);

  // Ensure Enter creates clean <p> elements inside contentEditable
  useEffect(() => {
    if (typeof document !== 'undefined') {
      try {
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch {
        // ignore if unsupported
      }
    }
  }, []);

  // Only reset DOM content when parent provides an external value change (e.g. loading another article)
  useEffect(() => {
    const incoming = value || '';
    if (incoming !== lastEmittedHtmlRef.current) {
      lastEmittedHtmlRef.current = incoming;
      setRawHtml(incoming);
      if (editorRef.current && editorRef.current.innerHTML !== incoming) {
        editorRef.current.innerHTML = incoming;
      }
    }
  }, [value]);

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

  /**
   * Applies inline CSS styles (font-family or font-size) reliably to the current text selection
   * without corrupting paragraph structure or relying on legacy <font size="3"> attributes.
   */
  const applyInlineStyleToSelection = (styleProp: 'fontFamily' | 'fontSize', styleValue: string) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    editorRef.current?.focus();
    restoreSavedSelection();

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    if (range.collapsed) {
      // Create a styled zero-width-space span so typing immediately adopts the chosen font/size
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
        // Fallback if selection crosses block boundaries
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

      const captionText = (imageAlt.trim() || file.name.replace(/\.[^/.]+$/, '')).replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const imgHtml = `
        <figure style="margin:1.5rem 0;text-align:center;">
          <img src="${result.url}" alt="${captionText}" style="max-width:100%;max-height:480px;width:auto;margin:0 auto;border-radius:0.75rem;object-fit:cover;display:block;" />
          ${imageAlt.trim() ? `<figcaption style="font-size:0.75rem;color:#64748b;margin-top:0.5rem;font-style:italic;">${captionText}</figcaption>` : ''}
        </figure>
        <p></p>
      `;

      editorRef.current?.focus();
      restoreSavedSelection();
      document.execCommand('insertHTML', false, imgHtml);
      emitChange();
      setImageAlt('');
      setIsImageModalOpen(false);
    } catch (err: unknown) {
      setInlineImageError(err instanceof Error ? err.message : 'Failed to insert image.');
    } finally {
      setIsUploadingInlineImage(false);
    }
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

        {/* Inserts: Link, Device Photo Upload (when enabled), Divider */}
        <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-300">
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
            onClick={() => {
              setInlineImageError(null);
              setIsImageModalOpen(true);
            }}
            className="p-1.5 rounded hover:bg-slate-200 text-teal-700 cursor-pointer"
            title="Upload Photo Inside Article"
            aria-label="Upload Photo Inside Article"
          >
            <ImageIcon className="w-3.5 h-3.5" />
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
        <div
          ref={editorRef}
          contentEditable
          onInput={emitChange}
          onKeyUp={saveCurrentSelection}
          onMouseUp={saveCurrentSelection}
          className="blog-rich-editor-surface p-5 sm:p-6 focus:outline-none text-slate-900 leading-relaxed text-base max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-3"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
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
        <span className="text-[11px] text-slate-400">Press Enter to start a new paragraph</span>
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

      {/* Insert Inline Image Modal (Device Upload Only — No Image URL input) */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-teal-700" />
                <span>Insert Photo from Device</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Photo Caption / Alt Text (optional):
                </label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Describe this photo"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              {inlineImageError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {inlineImageError}
                </div>
              )}

              <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2.5">
                <p className="text-xs font-medium text-slate-700">
                  Select a photo directly from your phone or computer
                </p>
                <button
                  type="button"
                  disabled={isUploadingInlineImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isUploadingInlineImage ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Optimizing & inserting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Image File</span>
                    </>
                  )}
                </button>
                {hideImageUrlInput && (
                  <p className="text-[11px] text-slate-500">
                    Images are automatically resized for fast loading across phones and computers.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
