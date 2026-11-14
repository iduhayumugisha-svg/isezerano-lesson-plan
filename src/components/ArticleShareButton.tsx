import React, { useState, useEffect, useRef } from 'react';
import { Share2, Copy, Check, MessageCircle, Send as SendIcon, Globe } from 'lucide-react';
import { BlogPost } from '../types/blog';
import { DEFAULT_CANONICAL_ORIGIN } from '../services/seoService';

export interface ArticleShareLinks {
  canonicalUrl: string;
  whatsappUrl: string;
  facebookUrl: string;
  telegramUrl: string;
}

export const getPublicShareOrigin = (): string => {
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    !window.location.hostname.startsWith('ais-dev-')
  ) {
    return window.location.origin;
  }
  return DEFAULT_CANONICAL_ORIGIN;
};

export const getCanonicalArticleUrl = (slugOrId: string, origin?: string): string => {
  const base = (origin || getPublicShareOrigin()).replace(/\/+$/, '');
  const cleanSlug = encodeURIComponent((slugOrId || '').trim());
  return `${base}/blog/${cleanSlug}`;
};

export const buildArticleShareLinks = (
  post: Pick<BlogPost, 'slug' | 'id' | 'title'>,
  origin?: string
): ArticleShareLinks => {
  const canonicalUrl = getCanonicalArticleUrl(post.slug || post.id, origin);
  const title = (post.title || 'ISEZERANO ONLINE').trim();

  return {
    canonicalUrl,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`${title}\n${canonicalUrl}`)}`,
    facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`,
    telegramUrl: `https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(title)}`
  };
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }
  return false;
};

const isTouchSharePreferred = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function') return false;
  return Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
};

interface ArticleShareButtonProps {
  post: Pick<BlogPost, 'slug' | 'id' | 'title'>;
  variant?: 'compact' | 'button';
  align?: 'left' | 'right';
}

export const ArticleShareButton: React.FC<ArticleShareButtonProps> = ({
  post,
  variant = 'compact',
  align = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const shareLinks = buildArticleShareLinks(post);
  const supportsNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isTouchSharePreferred() && !isOpen) {
      try {
        await navigator.share({
          title: post.title,
          text: post.title,
          url: shareLinks.canonicalUrl
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        // Fallback to popover menu if Web Share API fails
      }
    }

    setIsOpen((prev) => !prev);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyTextToClipboard(shareLinks.canonicalUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1400);
    }
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supportsNativeShare) return;
    try {
      await navigator.share({
        title: post.title,
        text: post.title,
        url: shareLinks.canonicalUrl
      });
      setIsOpen(false);
    } catch {
      // ignore abort or blocked share dialog
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={handleToggleShare}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Share ${post.title}`}
        title="Share article"
        className={
          variant === 'button'
            ? 'inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-teal-800 hover:border-teal-300 hover:bg-teal-50/40 transition-colors cursor-pointer'
            : 'inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-100 transition-colors cursor-pointer'
        }
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>Share</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Share options"
          className={`absolute bottom-full mb-2 ${
            align === 'left' ? 'left-0' : 'right-0'
          } z-40 w-52 rounded-xl bg-white border border-slate-200 shadow-lg p-1.5 space-y-0.5 text-left`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
            Share Article
          </div>

          <a
            role="menuitem"
            href={shareLinks.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>WhatsApp</span>
          </a>

          <a
            role="menuitem"
            href={shareLinks.facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
          >
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Facebook</span>
          </a>

          <a
            role="menuitem"
            href={shareLinks.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-800 transition-colors"
          >
            <SendIcon className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Telegram</span>
          </a>

          <button
            role="menuitem"
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Copy article link</span>
              </>
            )}
          </button>

          {supportsNativeShare && (
            <button
              role="menuitem"
              type="button"
              onClick={handleNativeShare}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border-t border-slate-100 mt-1 pt-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-teal-700 shrink-0" />
              <span>More share options</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
