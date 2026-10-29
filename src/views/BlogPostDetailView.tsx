import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Eye, 
  User, 
  ArrowLeft, 
  Share2, 
  Check, 
  Copy, 
  BookOpen, 
  MessageCircle, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { BlogPost } from '../types/blog';
import { getBlogPostBySlug, getBlogPosts, incrementPostViews } from '../services/blogService';
import { updateBlogPostSeo, resetDefaultSeo } from '../services/seoService';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { useAuth } from '../context/AuthContext';
import { formatPublicationDate } from '../utils/dateUtils';

interface BlogPostDetailViewProps {
  slug: string;
  onNavigate: (page: any) => void;
  onSelectPost: (slug: string) => void;
}

export const BlogPostDetailView: React.FC<BlogPostDetailViewProps> = ({
  slug,
  onNavigate,
  onSelectPost
}) => {
  const { colors, typography } = useWebsiteDesign();
  const { isAdmin } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadArticle = async () => {
      const found = await getBlogPostBySlug(slug, isAdmin);
      if (!isMounted) return;

      setPost(found);
      setIsLoading(false);

      if (found) {
        // 1. Update dynamic SEO, OpenGraph, Twitter Cards, and Schema.org
        updateBlogPostSeo(found);

        // 2. Increment view counter with session debounce to prevent duplicate render increments
        const sessionKey = `isezerano_viewed_post_${found.id}`;
        let shouldIncrement = false;
        try {
          if (typeof sessionStorage !== 'undefined') {
            if (!sessionStorage.getItem(sessionKey)) {
              sessionStorage.setItem(sessionKey, Date.now().toString());
              shouldIncrement = true;
            }
          }
        } catch {
          shouldIncrement = true;
        }

        if (shouldIncrement) {
          incrementPostViews(found.id).then((freshCount) => {
            if (isMounted && typeof freshCount === 'number') {
              setPost(prev => prev && prev.id === found.id ? { ...prev, views: freshCount } : prev);
            }
          });
        }

        // 3. Load related posts from same category
        getBlogPosts(false).then((all) => {
          if (!isMounted) return;
          const related = all.filter(p => p.id !== found.id && (p.category === found.category || true)).slice(0, 3);
          setRelatedPosts(related);
        });
      }
    };

    loadArticle();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Listen to sync updates from admin editor
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ post?: BlogPost; deletedId?: string }>;
      if (customEvent.detail?.deletedId && post?.id === customEvent.detail.deletedId) {
        setPost(null);
      } else if (customEvent.detail?.post && customEvent.detail.post.slug === slug) {
        setPost(customEvent.detail.post);
      }
    };
    window.addEventListener('blog_posts_updated', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('blog_posts_updated', handleSync);
      resetDefaultSeo();
    };
  }, [slug, isAdmin]);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-a7az4u6j4emzxaw3vwjczy-591146875574.europe-west2.run.app';
  const postUrl = `${originUrl}/blog/${slug}`;

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(postUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-500 text-sm">
        Loading article...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Article Not Found</h2>
        <p className="text-xs text-slate-600">
          The requested article may have been unpublished or moved.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('blog')}
          className="px-4 py-2 text-xs font-bold bg-teal-700 text-white rounded-xl hover:bg-teal-600 cursor-pointer"
        >
          Return to Blog
        </button>
      </div>
    );
  }

  const shareText = `${post.title} – Read on ISEZERANO ONLINE: ${postUrl}`;

  return (
    <article className="w-full pb-16">
      
      {/* 1. Header & Navigation Breadcrumb */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        <button
          type="button"
          onClick={() => onNavigate('blog')}
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors cursor-pointer mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Articles & School Journal</span>
        </button>

        {/* Category Badge & Meta Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
            {post.category}
          </span>
          {(() => {
            const dateInfo = formatPublicationDate(post.publishedAt);
            if (!dateInfo) {
              return post.status === 'draft' ? (
                <>
                  <span>•</span>
                  <span className="italic text-amber-600 font-semibold">Draft Preview</span>
                </>
              ) : null;
            }
            return (
              <>
                <span>•</span>
                <span className="flex items-center space-x-1" title={`${dateInfo.formattedDateFull} at ${dateInfo.formattedTime}`}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{dateInfo.formattedDate}</span>
                  <span className="text-teal-700 font-medium">({dateInfo.relativeTime})</span>
                </span>
              </>
            );
          })()}
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{post.readTimeMinutes || 4} min read</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{post.views || 0} views</span>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          {post.title}
        </h1>

        {/* Excerpt Lead */}
        <p className="text-sm sm:text-lg text-slate-600 font-medium leading-relaxed mb-6">
          {post.excerpt}
        </p>

        {/* Author Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-slate-200 mb-8">
          <div className="flex items-center space-x-3">
            {post.author?.avatarUrl ? (
              <img 
                src={post.author.avatarUrl} 
                alt={post.author.name}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                <User className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="block text-xs sm:text-sm font-bold text-slate-900">
                {post.author?.name || 'GS GITUMBA Editorial Team'}
              </span>
              <span className="block text-[11px] text-slate-500">
                {post.author?.role || 'Educator & Pedagogical Lead'}
              </span>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">Share:</span>
            
            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xs transition-all hover:scale-105"
              title="Share on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </a>

            {/* Facebook */}
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-all hover:scale-105"
              title="Share on Facebook"
            >
              <Share2 className="w-4 h-4" />
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-2xs transition-all hover:scale-105"
              title="Share on Telegram"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* X / Twitter */}
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(postUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-900 hover:bg-black text-white shadow-2xs transition-all hover:scale-105"
              title="Share on X (Twitter)"
            >
              <span className="w-4 h-4 flex items-center justify-center font-bold text-xs">𝕏</span>
            </a>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                copiedLink 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Copy link to clipboard"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Featured Thumbnail */}
        {post.thumbnailUrl && (
          <div className="rounded-2xl overflow-hidden mb-8 shadow-sm border border-slate-200">
            <img
              src={post.thumbnailUrl}
              alt={post.thumbnailAlt || post.title}
              className="w-full h-auto max-h-[480px] object-cover"
            />
            {post.thumbnailAlt && (
              <p className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-100 italic">
                {post.thumbnailAlt}
              </p>
            )}
          </div>
        )}

        {/* 2. Article Content Body (Rich Text) */}
        <div 
          className="prose prose-slate sm:prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:leading-relaxed prose-p:text-slate-700 prose-blockquote:border-l-4 prose-blockquote:border-teal-600 prose-blockquote:bg-teal-50/50 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-a:text-teal-700 prose-a:font-semibold prose-a:underline hover:prose-a:text-teal-800 prose-img:rounded-xl prose-img:shadow-sm"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* 3. Bottom Share Bar & Tags */}
        <div className="mt-12 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">Tags:</span>
            {post.tags && post.tags.length > 0 ? (
              post.tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                  #{tag}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                #{post.category}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Article Link'}</span>
            </button>
          </div>
        </div>

        {/* 4. Related Articles */}
        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Related Educational Articles</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedPosts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => onSelectPost(rel.slug)}
                  className="p-4 bg-white rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-xs transition-all cursor-pointer group space-y-2"
                >
                  <img
                    src={rel.thumbnailUrl}
                    alt={rel.title}
                    className="w-full h-28 object-cover rounded-lg"
                  />
                  <span className="text-[10px] font-bold text-teal-700 uppercase">
                    {rel.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-700 line-clamp-2 leading-snug">
                    {rel.title}
                  </h4>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </article>
  );
};
