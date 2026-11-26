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

export const getPublicShareOrigin = (): string => DEFAULT_CANONICAL_ORIGIN;

export const normalizePublicShareOrigin = (origin?: string): string => {
  const candidate = (origin || '').trim().replace(/\/+$/, '');
  if (!candidate) return DEFAULT_CANONICAL_ORIGIN;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'isezerano.online') {
      return DEFAULT_CANONICAL_ORIGIN;
    }
  } catch {
    // fallback to canonical origin
  }
  return DEFAULT_CANONICAL_ORIGIN;
};

export const getCanonicalArticleUrl = (slugOrId: string, origin?: string): string => {
  const base = normalizePublicShareOrigin(origin);
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
            ? 'inline-flex items-center space-x-1.5 px-3 py-1.5 border text-xs font-semibold hover:opacity-90 transition-all cursor-pointer'
            : 'inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer'
        }
        style={
          variant === 'button'
            ? {
                backgroundColor: 'var(--app-card-bg)',
                borderColor: 'var(--app-border-color)',
                color: 'var(--app-body-text)',
                borderRadius: 'var(--app-radius-btn)'
              }
            : {
                color: 'var(--app-muted-text)',
                borderRadius: 'var(--app-radius-btn)'
              }
        }
      >
        <Share2 className="w-3.5 h-3.5" style={variant === 'button' ? { color: 'var(--app-primary)' } : undefined} />
        <span>Share</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Share options"
          className={`theme-card absolute bottom-full mb-2 ${
            align === 'left' ? 'left-0' : 'right-0'
          } z-40 w-52 border shadow-lg p-1.5 space-y-0.5 text-left`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border-b mb-1" style={{ color: 'var(--app-muted-text)', borderColor: 'var(--app-border-color)' }}>
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
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--app-body-text)' }}
          >
            <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
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
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--app-body-text)' }}
          >
            <Globe className="w-4 h-4 text-blue-500 shrink-0" />
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
            className="flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: 'var(--app-body-text)' }}
          >
            <SendIcon className="w-4 h-4 text-sky-500 shrink-0" />
            <span>Telegram</span>
          </a>

          <button
            role="menuitem"
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer"
            style={{ color: 'var(--app-body-text)' }}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--app-primary)' }} />
                <span style={{ color: 'var(--app-primary)' }}>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" style={{ color: 'var(--app-muted-text)' }} />
                <span>Copy article link</span>
              </>
            )}
          </button>

          {supportsNativeShare && (
            <button
              role="menuitem"
              type="button"
              onClick={handleNativeShare}
              className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold hover:opacity-80 border-t mt-1 pt-2 transition-opacity cursor-pointer"
              style={{ color: 'var(--app-body-text)', borderColor: 'var(--app-border-color)' }}
            >
              <Share2 className="w-4 h-4 shrink-0" style={{ color: 'var(--app-primary)' }} />
              <span>More share options</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
