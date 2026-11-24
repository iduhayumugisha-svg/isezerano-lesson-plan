import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { AdsSettings } from '../types/platform';
import {
  subscribeToBlogPosts,
  incrementPostViews,
  subscribeToBlogCategories,
  mergeCategoriesForDisplay
} from '../services/blogService';
import { subscribeToApprovedCommentCounts } from '../services/commentService';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { updateBlogPostSeo, resetDefaultSeo } from '../services/seoService';
import { formatPublicationDate } from '../utils/dateUtils';
import { ArticleThumbnailImage } from '../components/ArticleThumbnailImage';
import { ArticleShareButton } from '../components/ArticleShareButton';
import { ArticleCommentsSection } from '../components/ArticleCommentsSection';
import { InArticleAdSlot } from '../components/InArticleAdSlot';
import { buildArticleRenderSegments } from '../utils/articleAdInjector';
import {
  extractFirstImageFromContent,
  extractPlainTextExcerpt,
  getSingleArticleThumbnailUrl
} from '../utils/thumbnailUtils';
import { resolveAllNewsLabel, resolveCategoryNavItemStyle } from '../utils/categoryStyleUtils';
import { scrollMainContentToTop } from '../utils/scrollUtils';

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
  const { branding, categoryNav } = useWebsiteDesign();
  const allNewsLabel = resolveAllNewsLabel(branding);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [rawCategories, setRawCategories] = useState<BlogCategory[]>(DEFAULT_AI_BLOG_CATEGORIES);
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  const [internalCommentCounts, setInternalCommentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string>('All Categories');
  const [autoFocusCommentsForm, setAutoFocusCommentsForm] = useState(false);
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(() => getCachedAdsSettingsSync());
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
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

  useEffect(() => {
    let active = true;
    getAdsSettings()
      .then((fresh) => {
        if (active) setAdsSettings(fresh);
      })
      .catch(() => {
        // fail gracefully without disrupting article reading
      });
    const unsubAds = subscribeToAdsSettings((fresh) => {
      if (active) setAdsSettings(fresh);
    });

    if (typeof window === 'undefined') {
      return () => {
        active = false;
        unsubAds();
      };
    }

    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);

    return () => {
      active = false;
      unsubAds();
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

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

  const articleRenderPlan = useMemo(
    () =>
      buildArticleRenderSegments({
        html: activePost?.content || '',
        adsSettings,
        deviceType: isMobileViewport ? 'mobile' : 'desktop'
      }),
    [activePost?.content, adsSettings, isMobileViewport]
  );

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
      scrollMainContentToTop('auto');
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
    scrollMainContentToTop('auto');
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
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--app-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--app-muted-text)' }}>Loading article...</p>
        </div>
      );
    }

    if (!activePost) {
      return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center space-y-4">
          <FileText className="w-10 h-10 mx-auto" style={{ color: 'var(--app-muted-text)' }} />
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--app-heading-primary)' }}>
            Article Not Found
          </h1>
          <p className="text-sm" style={{ color: 'var(--app-muted-text)' }}>
            This article may have been unpublished or removed.
          </p>
          <button
            type="button"
            onClick={closeArticle}
            className="theme-btn-primary inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-bold hover:opacity-90 cursor-pointer transition-opacity"
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
      <article className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-10 sm:pt-7 sm:pb-12 space-y-7">
        {/* Top Back Navigation, Comments Shortcut & Share */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeArticle}
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold hover:opacity-80 transition-opacity cursor-pointer"
            style={{ color: 'var(--app-body-text)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to News</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={scrollToCommentsSection}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 border text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--app-card-bg)',
                borderColor: 'var(--app-border-color)',
                color: 'var(--app-body-text)',
                borderRadius: 'var(--app-radius-btn)'
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" style={{ color: 'var(--app-primary)' }} />
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
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-sm" style={{ color: 'var(--app-muted-text)' }}>
            <span className="font-bold" style={{ color: 'var(--app-primary)' }}>{activePost.category}</span>
            <span className="opacity-50">·</span>
            <span className="inline-flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 opacity-75" />
              <span className="font-medium" style={{ color: 'var(--app-heading-primary)' }}>
                {activePost.author?.name || 'ISEZERANO Editorial'}
              </span>
              {activePost.author?.role && (
                <span style={{ color: 'var(--app-muted-text)' }}>({activePost.author.role})</span>
              )}
            </span>
            {dateInfo && (
              <>
                <span className="opacity-50">·</span>
                <time
                  dateTime={activePost.publishedAt}
                  className="inline-flex items-center space-x-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 opacity-75" />
                  <span>{dateInfo.formattedDateFull}</span>
                </time>
              </>
            )}
            <span className="opacity-50">·</span>
            <button
              type="button"
              onClick={scrollToCommentsSection}
              className="inline-flex items-center space-x-1 hover:opacity-80 font-medium cursor-pointer tabular-nums"
              style={{ color: 'var(--app-muted-text)' }}
            >
              <MessageSquare className="w-3.5 h-3.5 opacity-75" />
              <span>
                {resolvedCommentCounts[activePost.id] || 0}{' '}
                {(resolvedCommentCounts[activePost.id] || 0) === 1 ? 'comment' : 'comments'}
              </span>
            </button>
            <span className="opacity-50">·</span>
            <span className="inline-flex items-center space-x-1 tabular-nums">
              <Eye className="w-3.5 h-3.5 opacity-75" />
              <span>{activePost.views || 0}</span>
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-4xl font-bold leading-tight tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
            {activePost.title}
          </h1>
        </header>

        {/* Featured Image Banner (only when distinct from the first body image so Admin-resized first images aren't duplicated) */}
        {showSeparateBanner && (
          <figure
            className="overflow-hidden border aspect-[16/9]"
            style={{
              borderColor: 'var(--app-border-color)',
              backgroundColor: 'var(--app-accent-bg)',
              borderRadius: 'var(--app-radius-card)'
            }}
          >
            <ArticleThumbnailImage
              src={featuredThumb}
              alt={activePost.thumbnailAlt || activePost.title}
              priority={true}
              className="w-full h-full object-cover"
            />
          </figure>
        )}

        {/* Full Multi-Paragraph Formatted Content + Non-Destructive In-Article Ad Slots 1, 2, 3 */}
        <div
          data-testid="blog-article-body"
          className="blog-article-body text-base sm:text-[17px] leading-[1.75] space-y-5 [&_h1]:font-serif [&_h1]:text-2xl sm:[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-3 [&_h2]:font-serif [&_h2]:text-xl sm:[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-7 [&_h2]:mb-2.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_li]:mb-1.5 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-6 [&_a]:underline"
        >
          {articleRenderPlan.segments.map((segment) =>
            segment.type === 'html' ? (
              <div
                key={segment.key}
                className="space-y-5"
                dangerouslySetInnerHTML={{ __html: segment.html }}
              />
            ) : (
              <InArticleAdSlot
                key={segment.key}
                slotId={segment.slotId}
                slotConfig={segment.slotConfig}
                articleId={activePost.id}
              />
            )
          )}
        </div>

        {/* Article Action Bar: Leave a Message & Share */}
        <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--app-border-color)' }}>
          <button
            type="button"
            onClick={scrollToCommentsSection}
            className="inline-flex items-center space-x-2 px-4 py-2 border text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
            style={{
              backgroundColor: 'var(--app-primary-soft)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-primary)',
              borderRadius: 'var(--app-radius-btn)'
            }}
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
          <section className="pt-8 border-t space-y-5" style={{ borderColor: 'var(--app-border-color)' }}>
            <h2 className="font-serif text-xl sm:text-2xl font-bold" style={{ color: 'var(--app-heading-primary)' }}>
              Related Articles
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 'var(--app-space-gap)' }}>
              {relatedPosts.map((related) => {
                const relThumb = getSingleArticleThumbnailUrl(related);
                const relDate = formatPublicationDate(related.publishedAt || related.updatedAt);

                return (
                  <article
                    key={related.id}
                    onClick={() => openArticle(related)}
                    className="group theme-card border overflow-hidden hover:shadow-sm transition-all flex flex-col cursor-pointer"
                  >
                    <div
                      className="aspect-[16/10] w-full overflow-hidden border-b"
                      style={{ backgroundColor: 'var(--app-accent-bg)', borderColor: 'var(--app-border-color)' }}
                    >
                      <ArticleThumbnailImage
                        src={relThumb}
                        alt={related.thumbnailAlt || related.title || 'Article placeholder'}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-1.5 text-[11px]" style={{ color: 'var(--app-muted-text)' }}>
                          <span className="font-bold" style={{ color: 'var(--app-primary)' }}>{related.category}</span>
                          {relDate && (
                            <>
                              <span className="opacity-50">·</span>
                              <span>{relDate.formattedDate}</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-serif text-base font-bold transition-colors leading-snug line-clamp-2" style={{ color: 'var(--app-heading-primary)' }}>
                          {related.title}
                        </h3>
                      </div>
                      <div
                        className="pt-2 border-t flex items-center justify-between gap-2 text-xs"
                        style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openArticle(related, true);
                          }}
                          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
                          style={{ color: 'var(--app-muted-text)' }}
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
        <div className="pt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--app-border-color)' }}>
          <button
            type="button"
            onClick={closeArticle}
            className="inline-flex items-center space-x-2 px-4 py-2.5 border text-xs font-bold hover:opacity-90 cursor-pointer transition-opacity"
            style={{
              backgroundColor: 'var(--app-card-bg)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-heading-primary)',
              borderRadius: 'var(--app-radius-btn)'
            }}
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
  const portalSubtitleLabel = branding?.platformSubtitle?.trim() || 'Newsroom';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-10 sm:pt-7 sm:pb-12 space-y-7">
      {/* Editorial Section Header */}
      <div className="border-b pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4" style={{ borderColor: 'var(--app-border-color)' }}>
        <div className="space-y-1.5">
          {(siteNameLabel || portalSubtitleLabel) && (
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--app-primary)' }}>
              {[siteNameLabel, portalSubtitleLabel].filter(Boolean).join(' · ')}
            </div>
          )}
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
            News &amp; Editorial Articles
          </h1>
          {branding?.showWebsiteDescription !== false && branding?.websiteDescription?.trim() && (
            <p className="text-xs sm:text-sm max-w-2xl" style={{ color: 'var(--app-muted-text)' }}>
              {branding.websiteDescription}
            </p>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--app-muted-text)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles..."
            className="theme-input w-full pl-10 pr-4 py-2.5 text-sm border"
          />
        </div>
      </div>

      {/* Category Filter Tabs (Live Firestore categories) */}
      <div className="space-y-2.5">
        <div className="overflow-x-auto border-b py-1.5 no-scrollbar" style={{ borderColor: 'var(--app-border-color)' }}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-max">
            {categoryTabs.map((category) => {
              const active = selectedCategory === category;
              const displayLabel = category === 'All Categories' ? allNewsLabel : category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  style={resolveCategoryNavItemStyle(category, categoryNav, active)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg border-b-2 whitespace-nowrap shrink-0 transition-all cursor-pointer inline-flex items-center"
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>

        {selectedCategoryObj?.description && (
          <p className="text-xs" style={{ color: 'var(--app-muted-text)' }}>
            <strong style={{ color: 'var(--app-heading-primary)' }}>{selectedCategoryObj.name}:</strong>{' '}
            {selectedCategoryObj.description}
          </p>
        )}
      </div>

      {/* Blog Articles Feed */}
      {isLoading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--app-primary)' }} />
          <p className="text-sm" style={{ color: 'var(--app-muted-text)' }}>Loading published articles...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="theme-card border p-12 text-center space-y-2.5">
          <FileText className="w-8 h-8 mx-auto" style={{ color: 'var(--app-muted-text)' }} />
          <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--app-heading-primary)' }}>
            {posts.length === 0 ? 'No articles published yet' : 'No matching articles found'}
          </h2>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--app-muted-text)' }}>
            {posts.length === 0
              ? 'Published breaking news, special reports, and announcements will appear here.'
              : 'Try selecting another category or clearing your search filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--app-space-gap)' }}>
          {filteredPosts.map((post) => {
            const thumbSrc = getSingleArticleThumbnailUrl(post);
            const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);

            return (
              <article
                key={post.id}
                onClick={() => openArticle(post)}
                className="group theme-card border overflow-hidden hover:shadow-md transition-all flex flex-col cursor-pointer"
              >
                {/* Article's Own Thumbnail */}
                <div
                  className="aspect-[16/10] w-full overflow-hidden border-b"
                  style={{ backgroundColor: 'var(--app-accent-bg)', borderColor: 'var(--app-border-color)' }}
                >
                  <ArticleThumbnailImage
                    src={thumbSrc}
                    alt={post.thumbnailAlt || post.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>

                {/* Card Body */}
                <div
                  className="flex-1 flex flex-col justify-between space-y-4"
                  style={{ padding: 'var(--app-space-card)' }}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--app-muted-text)' }}>
                      <span className="font-bold" style={{ color: 'var(--app-primary)' }}>{post.category}</span>
                      {dateInfo && (
                        <>
                          <span className="opacity-50">·</span>
                          <span>{dateInfo.formattedDate}</span>
                        </>
                      )}
                    </div>

                    <h2 className="font-serif text-lg sm:text-xl font-bold transition-colors leading-snug line-clamp-2" style={{ color: 'var(--app-heading-primary)' }}>
                      {post.title}
                    </h2>

                    <p className="text-xs sm:text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--app-muted-text)' }}>
                      {post.excerpt || extractPlainTextExcerpt(post.content, 150)}
                    </p>
                  </div>

                  <div
                    className="pt-3 border-t flex items-center justify-between gap-2 text-xs"
                    style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
                  >
                    <span className="font-medium truncate" style={{ color: 'var(--app-body-text)' }}>
                      {post.author?.name || 'ISEZERANO Editorial'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openArticle(post, true);
                        }}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ color: 'var(--app-muted-text)' }}
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
