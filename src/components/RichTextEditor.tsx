import React, { useRef, useState, useEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
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
  Eye, 
  Upload,
  X,
  Check
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your pedagogical article or school announcement here...',
  minHeight = '360px'
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(value);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Sync editor content with incoming value initially or when reset
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    setRawHtml(value || '');
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setRawHtml(html);
      onChange(html);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  // Insert Link Modal Submit
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
      url = `https://${url}`;
    }

    editorRef.current?.focus();
    if (linkText.trim()) {
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-teal-700 underline font-semibold hover:text-teal-800">${linkText.trim()}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
    } else {
      document.execCommand('createLink', false, url);
    }

    setLinkUrl('');
    setLinkText('');
    setIsLinkModalOpen(false);
    handleInput();
  };

  // Insert Image URL Submit
  const handleInsertImageUrl = () => {
    if (!imageUrl.trim()) return;
    const url = imageUrl.trim();
    const alt = imageAlt.trim() || 'Article illustration';
    const imgHtml = `
      <figure class="my-4 text-center">
        <img src="${url}" alt="${alt}" class="mx-auto rounded-xl max-h-[450px] w-auto shadow-sm object-cover" />
        ${alt ? `<figcaption class="text-xs text-slate-500 mt-1 italic">${alt}</figcaption>` : ''}
      </figure>
      <p></p>
    `;
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, imgHtml);

    setImageUrl('');
    setImageAlt('');
    setIsImageModalOpen(false);
    handleInput();
  };

  // Upload local image from device into Base64 Data URI
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const imgHtml = `
        <figure class="my-4 text-center">
          <img src="${base64}" alt="${file.name}" class="mx-auto rounded-xl max-h-[450px] w-auto shadow-sm object-cover" />
          <figcaption class="text-xs text-slate-500 mt-1 italic">${file.name}</figcaption>
        </figure>
        <p></p>
      `;
      editorRef.current?.focus();
      document.execCommand('insertHTML', false, imgHtml);
      handleInput();
      setIsImageModalOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRawHtmlChange = (newHtml: string) => {
    setRawHtml(newHtml);
    onChange(newHtml);
    if (editorRef.current) {
      editorRef.current.innerHTML = newHtml;
    }
  };

  // Calculate word and character counts
  const plainText = rawHtml.replace(/<[^>]*>/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = plainText.length;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all">
      {/* 1. Word-Style Formatting Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-1.5 flex flex-wrap items-center gap-1 select-none text-slate-700">
        
        {/* History: Undo / Redo */}
        <div className="flex items-center space-x-0.5 pr-1 border-r border-slate-300">
          <button
            type="button"
            onClick={() => executeCommand('undo')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('redo')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Headings Selector */}
        <div className="flex items-center space-x-0.5 px-1 border-r border-slate-300">
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h1>')}
            className="px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Heading 1"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h2>')}
            className="px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h3>')}
            className="px-2 py-1 text-xs font-bold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<p>')}
            className="px-2 py-1 text-xs font-semibold rounded hover:bg-slate-200 text-slate-800 cursor-pointer"
            title="Paragraph"
          >
            P
          </button>
        </div>

        {/* Text Decoration */}
        <div className="flex items-center space-x-0.5 px-1 border-r border-slate-300">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded hover:bg-slate-200 font-bold text-slate-800 cursor-pointer"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded hover:bg-slate-200 italic text-slate-800 cursor-pointer"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded hover:bg-slate-200 underline text-slate-800 cursor-pointer"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded hover:bg-slate-200 line-through text-slate-800 cursor-pointer"
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center space-x-0.5 px-1 border-r border-slate-300">
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lists & Quotes */}
        <div className="flex items-center space-x-0.5 px-1 border-r border-slate-300">
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Bulleted List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Inserts: Links, Images, Dividers */}
        <div className="flex items-center space-x-0.5 px-1 border-r border-slate-300">
          <button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            className="p-1.5 rounded hover:bg-slate-200 text-teal-700 cursor-pointer"
            title="Insert Hyperlink"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="p-1.5 rounded hover:bg-slate-200 text-teal-700 cursor-pointer"
            title="Insert Image (URL or Upload)"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertHorizontalRule')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-700 cursor-pointer"
            title="Insert Horizontal Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clear Formatting & HTML Source Toggle */}
        <div className="flex items-center space-x-0.5 pl-1">
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsHtmlMode(!isHtmlMode)}
            className={`px-2 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
              isHtmlMode ? 'bg-teal-700 text-white' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title="Toggle HTML Source Code"
          >
            <Code className="w-3.5 h-3.5 inline mr-1" />
            <span>{isHtmlMode ? 'Visual View' : 'HTML'}</span>
          </button>
        </div>

      </div>

      {/* 2. Main Content Area */}
      {isHtmlMode ? (
        <textarea
          value={rawHtml}
          onChange={(e) => handleRawHtmlChange(e.target.value)}
          className="w-full p-4 font-mono text-xs text-slate-800 bg-slate-900 text-emerald-300 focus:outline-none"
          style={{ minHeight }}
          placeholder="Edit raw HTML..."
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          className="p-4 sm:p-5 focus:outline-none text-slate-900 leading-relaxed font-sans text-sm prose max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
          style={{ minHeight }}
          data-placeholder={placeholder}
        />
      )}

      {/* 3. Footer Stats Bar */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center space-x-3">
          <span>Words: <strong className="text-slate-700">{wordCount}</strong></span>
          <span>Characters: <strong className="text-slate-700">{charCount}</strong></span>
          <span>Est. Reading Time: <strong className="text-slate-700">{Math.max(1, Math.ceil(wordCount / 200))} min</strong></span>
        </div>
        <span className="text-[10px] text-slate-400">Word-Formatted HTML Editor</span>
      </div>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLocalImageUpload}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Insert Link Modal */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <LinkIcon className="w-4 h-4 text-teal-600" />
                <span>Insert Web Hyperlink</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination URL (HTTPS):
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://reb.gov.rw or /blog/guide"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Text (Optional):
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g. Official REB Curriculum Portal"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-teal-700 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Image Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                <span>Insert Article Image</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Option A: Upload from computer/phone */}
              <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2">
                <p className="text-xs font-semibold text-slate-700">Upload image from device</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image File (PNG, JPG, WebP)</span>
                </button>
              </div>

              <div className="text-center text-xs text-slate-400 font-semibold uppercase">— OR ENTER URL —</div>

              {/* Option B: Enter Web Image URL */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Image Address (URL):
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Caption / Alt Text:
                  </label>
                  <input
                    type="text"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="e.g. Science lab experiment at GS GITUMBA"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertImageUrl}
                disabled={!imageUrl.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-teal-700 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50"
              >
                Insert Image
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
