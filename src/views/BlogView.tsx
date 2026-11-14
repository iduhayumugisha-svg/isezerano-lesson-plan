import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  FileText,
  Loader2,
  Eye
} from 'lucide-react';
import { BlogCategory, BlogPost, DEFAULT_AI_BLOG_CATEGORIES } from '../types/blog';
import {
  subscribeToBlogPosts,
  incrementPostViews,
  subscribeToBlogCategories,
  mergeCategoriesForDisplay
} from '../services/blogService';
import { subscribeToApprovedCommentCounts } from '../services/commentService';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { updateBlogPostSeo, resetDefaultSeo } from '../services/seoService';
import { formatPublicationDate } from '../utils/dateUtils';
import { ArticleThumbnailImage } from '../components/ArticleThumbnailImage';
import { ArticleShareButton } from '../components/ArticleShareButton';
import { ArticleCommentsSection } from '../components/ArticleCommentsSection';
import {
  extractFirstImageFromContent,
  extractPlainTextExcerpt,
  getSingleArticleThumbnailUrl
} from '../utils/thumbnailUtils';

interface BlogViewProps {
  initialSlug?: string | null;
  onSelectPostSlug?: (slug: string | null) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onReturnHome?: () => void;
  commentCounts?: Record<string, number>;
  focusComments?: boolean;
  onConsumeFocusComments?: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({
  initialSlug = null,
  onSelectPostSlug,
  selectedCategory: externalSelectedCategory,
  onSelectCategory,
  onReturnHome,
  commentCounts: externalCommentCounts,
  focusComments = false,
  onConsumeFocusComments
}) => {
  const { branding } = useWebsiteDesign();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [rawCategories, setRawCategories] = useState<BlogCategory[]>(DEFAULT_AI_BLOG_CATEGORIES);
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  const [internalCommentCounts, setInternalCommentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string>('All Categories');
  const [autoFocusCommentsForm, setAutoFocusCommentsForm] = useState(false);
  const incrementedPostIdsRef = useRef<Set<string>>(new Set());

  const usesExternalCommentCounts = externalCommentCounts !== undefined;
  const resolvedCommentCounts = usesExternalCommentCounts
    ? externalCommentCounts || {}
    : internalCommentCounts;

  const selectedCategory =
    externalSelectedCategory !== undefined ? externalSelectedCategory : internalSelectedCategory;
  const setSelectedCategory = (category: string) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    } else {
      setInternalSelectedCategory(category);
    }
  };

  useEffect(() => {
    setActiveSlug(initialSlug || null);
  }, [initialSlug]);

  useEffect(() => {
    setIsLoading(true);
    const unsubPosts = subscribeToBlogPosts((publishedPosts) => {
      setPosts(publishedPosts);
      setIsLoading(false);
    }, false);

    const unsubCategories = subscribeToBlogCategories((fetchedCats, initialized) => {
      setRawCategories(fetchedCats);
      setCategoriesInitialized(initialized);
    });

    const unsubComments = usesExternalCommentCounts
      ? () => {}
      : subscribeToApprovedCommentCounts((counts) => {
          setInternalCommentCounts(counts);
        });

    return () => {
      unsubPosts();
      unsubCategories();
      unsubComments();
    };
  }, [usesExternalCommentCounts]);

  const categories = mergeCategoriesForDisplay(rawCategories, categoriesInitialized, posts);
  const categoryTabs = [
    'All Categories',
    ...categories.map((c) => c.name),
    ...(posts.some((p) => p.category === 'Uncategorized') ? ['Uncategorized'] : [])
  ];
  const selectedCategoryObj = categories.find((c) => c.name === selectedCategory);

  useEffect(() => {
    if (selectedCategory !== 'All Categories' && !categoryTabs.includes(selectedCategory)) {
      setSelectedCategory('All Categories');
    }
  }, [selectedCategory, categoryTabs]);

  const activePost = activeSlug
    ? posts.find((p) => p.slug === activeSlug || p.id === activeSlug) || null
    : null;

  const scrollToCommentsSection = () => {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('article-comments');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setAutoFocusCommentsForm(true);
  };

  // Update SEO metadata and increment views once when opening a published article
  useEffect(() => {
    if (activePost) {
      updateBlogPostSeo(activePost, branding);
      if (!incrementedPostIdsRef.current.has(activePost.id)) {
        incrementedPostIdsRef.current.add(activePost.id);
        incrementPostViews(activePost.id);
      }
    } else {
      resetDefaultSeo(branding);
    }
  }, [activePost?.id, branding]);

  // Scroll cleanly to comments when navigated via a card Comment button or #article-comments hash
  useEffect(() => {
    if (!activePost) return;
    const hashPointsToComments =
      typeof window !== 'undefined' && window.location.hash === '#article-comments';
    if (focusComments || hashPointsToComments) {
      const timer = setTimeout(() => {
        scrollToCommentsSection();
        onConsumeFocusComments?.();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [activePost?.id, focusComments]);

  const openArticle = (post: BlogPost, openAtComments = false) => {
    setAutoFocusCommentsForm(openAtComments);
    setActiveSlug(post.slug);
    onSelectPostSlug?.(post.slug);
    if (openAtComments) {
      setTimeout(() => {
        scrollToCommentsSection();
      }, 150);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const closeArticle = () => {
    setAutoFocusCommentsForm(false);
    setActiveSlug(null);
    if (onReturnHome) {
      onReturnHome();
    } else {
      onSelectPostSlug?.(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredPosts = posts.filter((post) => {
    const matchesCat =
      selectedCategory === 'All Categories' || post.category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.author?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  // ================= FULL ARTICLE READING VIEW =================
  if (activeSlug) {
    if (isLoading) {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-3">
          <Loader2 className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading article...</p>
        </div>
      );
    }

    if (!activePost) {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Article Not Found
          </h1>
          <p className="text-sm text-slate-600">
            This article may have been unpublished or removed.
          </p>
          <button
            type="button"
            onClick={closeArticle}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Articles</span>
          </button>
        </div>
      );
    }

    const featuredThumb = getSingleArticleThumbnailUrl(activePost);
    const firstBodyImg = extractFirstImageFromContent(activePost.content);
    const showSeparateBanner = Boolean(
      featuredThumb && (!firstBodyImg || featuredThumb !== firstBodyImg)
    );
    const dateInfo = formatPublicationDate(activePost.publishedAt || activePost.updatedAt);

    // Related articles: prioritize same category, then most recent (max 3)
    const relatedPosts = posts
      .filter((p) => p.id !== activePost.id)
      .sort((a, b) => {
        const aSameCat = a.category === activePost.category ? 1 : 0;
        const bSameCat = b.category === activePost.category ? 1 : 0;
        if (aSameCat !== bSameCat) return bSameCat - aSameCat;
        return new Date(b.publishedAt || b.updatedAt || 0).getTime() -
          new Date(a.publishedAt || a.updatedAt || 0).getTime();
      })
      .slice(0, 3);

    return (
      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Top Back Navigation, Comments Shortcut & Share */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeArticle}
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-teal-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to News</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollToCommentsSection}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:text-teal-800 hover:border-teal-300 hover:bg-teal-50/40 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments</span>
              <span className="tabular-nums font-bold">
                ({resolvedCommentCounts[activePost.id] || 0})
              </span>
            </button>
            <ArticleShareButton post={activePost} variant="button" />
          </div>
        </div>

        {/* Article Header */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm text-slate-600">
            <span className="font-bold text-teal-800">{activePost.category}</span>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium text-slate-800">
                {activePost.author?.name || 'GS GITUMBA Editorial'}
              </span>
              {activePost.author?.role && (
                <span className="text-slate-500">({activePost.author.role})</span>
              )}
            </span>
            {dateInfo && (
              <>
                <span className="text-slate-300">·</span>
                <time
                  dateTime={activePost.publishedAt}
                  className="inline-flex items-center space-x-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dateInfo.formattedDateFull}</span>
                </time>
              </>
            )}
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={scrollToCommentsSection}
              className="inline-flex items-center space-x-1 text-slate-600 hover:text-teal-800 font-medium cursor-pointer tabular-nums"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {resolvedCommentCounts[activePost.id] || 0}{' '}
                {(resolvedCommentCounts[activePost.id] || 0) === 1 ? 'comment' : 'comments'}
              </span>
            </button>
            <span className="text-slate-300">·</span>
            <span className="inline-flex items-center space-x-1 tabular-nums">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{activePost.views || 0}</span>
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-slate-900 leading-tight tracking-tight">
            {activePost.title}
          </h1>
        </header>

        {/* Featured Image Banner (only when distinct from the first body image so Admin-resized first images aren't duplicated) */}
        {showSeparateBanner && (
          <figure className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[16/9]">
            <ArticleThumbnailImage
              src={featuredThumb}
              alt={activePost.thumbnailAlt || activePost.title}
              className="w-full h-full object-cover"
            />
          </figure>
        )}

        {/* Full Multi-Paragraph Formatted Content (preserves Admin-selected image sizes and alignments) */}
        <div
          className="blog-article-body text-slate-800 text-base sm:text-[17px] leading-[1.75] space-y-5 [&_h1]:font-serif [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-8 [&_h1]:mb-3 [&_h2]:font-serif [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-7 [&_h2]:mb-2.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_li]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-teal-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-6 [&_a]:text-teal-700 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: activePost.content }}
        />

        {/* Article Action Bar: Leave a Message & Share */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={scrollToCommentsSection}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-50 border border-teal-200 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Write a Comment ({resolvedCommentCounts[activePost.id] || 0})</span>
          </button>
          <ArticleShareButton post={activePost} variant="button" />
        </div>

        {/* Reader Messages / Comments Section */}
        <ArticleCommentsSection
          postId={activePost.id}
          postTitle={activePost.title}
          autoFocusForm={autoFocusCommentsForm}
        />

        {/* Related Articles Section (each displays its own correct thumbnail) */}
        {relatedPosts.length > 0 && (
          <section className="pt-8 border-t border-slate-200 space-y-5">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {relatedPosts.map((related) => {
                const relThumb = getSingleArticleThumbnailUrl(related);
                const relDate = formatPublicationDate(related.publishedAt || related.updatedAt);

                return (
                  <article
                    key={related.id}
                    onClick={() => openArticle(related)}
                    className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-teal-600/60 hover:shadow-sm transition-all flex flex-col cursor-pointer"
                  >
                    <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                      <ArticleThumbnailImage
                        src={relThumb}
                        alt={related.thumbnailAlt || related.title || 'Article placeholder'}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500">
                          <span className="font-bold text-teal-800">{related.category}</span>
                          {relDate && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span>{relDate.formattedDate}</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-serif text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                          {related.title}
                        </h3>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openArticle(related, true);
                          }}
                          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Comments"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="tabular-nums">
                            {resolvedCommentCounts[related.id] || 0}
                          </span>
                        </button>
                        <ArticleShareButton post={related} variant="compact" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Bottom Return Link */}
        <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={closeArticle}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>View All Published Articles</span>
          </button>
        </div>
      </article>
    );
  }

  // ================= PUBLIC BLOG INDEX VIEW =================
  const siteNameLabel =
    branding?.showWebsiteName !== false
      ? branding?.platformTitle?.trim() || 'ISEZERANO ONLINE'
      : '';
  const schoolSubtitleLabel = branding?.platformSubtitle?.trim() || 'GS GITUMBA';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Editorial Section Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          {(siteNameLabel || schoolSubtitleLabel) && (
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
              {[siteNameLabel, schoolSubtitleLabel].filter(Boolean).join(' · ')}
            </div>
          )}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            School Blog &amp; Educational Articles
          </h1>
          {branding?.showWebsiteDescription !== false && branding?.websiteDescription?.trim() && (
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              {branding.websiteDescription}
            </p>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>
      </div>

      {/* Category Filter Tabs (Live Firestore categories) */}
      <div className="space-y-2.5">
        <div className="flex items-center space-x-5 overflow-x-auto border-b border-slate-200 pb-0.5 no-scrollbar">
          {categoryTabs.map((category) => {
            const active = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`pb-3 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-teal-700 text-teal-800 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {selectedCategoryObj?.description && (
          <p className="text-xs text-slate-600">
            <strong className="text-slate-800">{selectedCategoryObj.name}:</strong>{' '}
            {selectedCategoryObj.description}
          </p>
        )}
      </div>

      {/* Blog Articles Feed */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading published articles...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2.5">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="font-serif text-xl font-bold text-slate-900">
            {posts.length === 0 ? 'No articles published yet' : 'No matching articles found'}
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {posts.length === 0
              ? 'Published school news, announcements, and educational articles will appear here.'
              : 'Try selecting another category or clearing your search filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const thumbSrc = getSingleArticleThumbnailUrl(post);
            const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);

            return (
              <article
                key={post.id}
                onClick={() => openArticle(post)}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-600/60 hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                {/* Article's Own Thumbnail */}
                <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                  <ArticleThumbnailImage
                    src={thumbSrc}
                    alt={post.thumbnailAlt || post.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span className="font-bold text-teal-800">{post.category}</span>
                      {dateInfo && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>{dateInfo.formattedDate}</span>
                        </>
                      )}
                    </div>

                    <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                      {post.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {post.excerpt || extractPlainTextExcerpt(post.content, 150)}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700 truncate">
                      {post.author?.name || 'GS GITUMBA Editorial'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openArticle(post, true);
                        }}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View or write comments"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="tabular-nums">{resolvedCommentCounts[post.id] || 0}</span>
                      </button>
                      <ArticleShareButton post={post} variant="compact" />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
