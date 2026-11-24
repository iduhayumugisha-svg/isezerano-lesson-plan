import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MessageSquare,
  User,
  FileText,
  Newspaper
} from 'lucide-react';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { BlogCategory, BlogPost, DEFAULT_AI_BLOG_CATEGORIES } from '../types/blog';
import {
  subscribeToBlogPosts,
  subscribeToBlogCategories,
  mergeCategoriesForDisplay
} from '../services/blogService';
import { subscribeToApprovedCommentCounts } from '../services/commentService';
import { ArticleThumbnailImage } from '../components/ArticleThumbnailImage';
import { ArticleShareButton } from '../components/ArticleShareButton';
import { formatPublicationDate } from '../utils/dateUtils';
import {
  getSingleArticleThumbnailUrl,
  extractPlainTextExcerpt
} from '../utils/thumbnailUtils';
import { resolveAllNewsLabel } from '../utils/categoryStyleUtils';
import { scrollMainContentToTop } from '../utils/scrollUtils';
import { AdsSettings, DEFAULT_ADS_SETTINGS } from '../types/platform';
import {
  getAdsSettings,
  getCachedAdsSettingsSync,
  subscribeToAdsSettings
} from '../services/siteSettingsService';
import { buildHomepageAdPlan } from '../utils/homepageAdInjector';
import { HomepageInFeedAdSlot } from '../components/HomepageInFeedAdSlot';

interface HomeViewProps {
  onNavigate: (page: any) => void;
  posts?: BlogPost[];
  categories?: BlogCategory[];
  commentCounts?: Record<string, number>;
  isNewsLoading?: boolean;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onOpenArticle?: (post: BlogPost) => void;
  onOpenArticleComments?: (post: BlogPost) => void;
}

const getPostTimestamp = (post: BlogPost): number =>
  new Date(post.publishedAt || post.updatedAt || 0).getTime() || 0;

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  posts: externalPosts,
  categories: externalCategories,
  commentCounts: externalCommentCounts,
  isNewsLoading: externalLoading,
  selectedCategory: externalSelectedCategory,
  onSelectCategory,
  onOpenArticle,
  onOpenArticleComments
}) => {
  const { colors, branding, typography } = useWebsiteDesign();
  const allNewsLabel = resolveAllNewsLabel(branding);

  // Fallback self-subscriptions if HomeView is mounted standalone
  const [internalPosts, setInternalPosts] = useState<BlogPost[]>([]);
  const [internalRawCategories, setInternalRawCategories] = useState<BlogCategory[]>(
    DEFAULT_AI_BLOG_CATEGORIES
  );
  const [internalCategoriesInitialized, setInternalCategoriesInitialized] = useState(false);
  const [internalCommentCounts, setInternalCommentCounts] = useState<Record<string, number>>({});
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalSelectedCategory, setInternalSelectedCategory] = useState('All Categories');
  const [searchQuery, setSearchQuery] = useState('');
  const [adsSettings, setAdsSettings] = useState<AdsSettings>(() => getCachedAdsSettingsSync());
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  const usesExternalPosts = externalPosts !== undefined;
  const usesExternalCategories = externalCategories !== undefined;
  const usesExternalCommentCounts = externalCommentCounts !== undefined;

  useEffect(() => {
    let active = true;
    getAdsSettings()
      .then((fresh) => {
        if (active) setAdsSettings(fresh);
      })
      .catch(() => {
        // fail silently on ads settings fetch errors
      });
    const unsubAds = subscribeToAdsSettings((fresh) => {
      if (active) setAdsSettings(fresh);
    });

    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsMobileViewport(window.innerWidth < 768);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      active = false;
      unsubAds();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    if (usesExternalPosts && usesExternalCategories && usesExternalCommentCounts) return;

    const unsubPosts = usesExternalPosts
      ? () => {}
      : subscribeToBlogPosts((publishedPosts) => {
          setInternalPosts(publishedPosts);
          setInternalLoading(false);
        }, false);

    const unsubCats = usesExternalCategories
      ? () => {}
      : subscribeToBlogCategories((fetchedCats, initialized) => {
          setInternalRawCategories(fetchedCats);
          setInternalCategoriesInitialized(initialized);
        });

    const unsubComments = usesExternalCommentCounts
      ? () => {}
      : subscribeToApprovedCommentCounts((counts) => {
          setInternalCommentCounts(counts);
        });

    return () => {
      unsubPosts();
      unsubCats();
      unsubComments();
    };
  }, [usesExternalPosts, usesExternalCategories, usesExternalCommentCounts]);

  const resolvedPosts = useMemo(() => {
    const list = usesExternalPosts ? externalPosts || [] : internalPosts;
    return [...list].sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));
  }, [usesExternalPosts, externalPosts, internalPosts]);

  const resolvedCategories = useMemo(() => {
    if (usesExternalCategories) return externalCategories || [];
    return mergeCategoriesForDisplay(
      internalRawCategories,
      internalCategoriesInitialized,
      resolvedPosts
    );
  }, [
    usesExternalCategories,
    externalCategories,
    internalRawCategories,
    internalCategoriesInitialized,
    resolvedPosts
  ]);

  const resolvedCommentCounts = usesExternalCommentCounts
    ? externalCommentCounts || {}
    : internalCommentCounts;

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;
  const activeCategory =
    externalSelectedCategory !== undefined ? externalSelectedCategory : internalSelectedCategory;

  const handleSelectCat = (category: string) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    } else {
      setInternalSelectedCategory(category);
    }
    scrollMainContentToTop('auto');
  };

  const handleOpenPost = (post: BlogPost) => {
    if (onOpenArticle) {
      onOpenArticle(post);
      return;
    }
    onNavigate('blog');
  };

  const handleOpenComments = (e: React.MouseEvent, post: BlogPost) => {
    e.stopPropagation();
    if (onOpenArticleComments) {
      onOpenArticleComments(post);
      return;
    }
    if (onOpenArticle) {
      onOpenArticle(post);
      return;
    }
    onNavigate('blog');
  };

  const customHeadline = branding?.homepageWelcomeHeadline || '';
  const customNote = branding?.homepageCustomNote || '';

  const todayFormatted = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return '';
    }
  }, []);

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const isFiltering = activeCategory !== 'All Categories' || trimmedQuery.length > 0;

  const filteredPosts = useMemo(() => {
    return resolvedPosts.filter((post) => {
      const matchesCat =
        activeCategory === 'All Categories' ||
        (post.category || '').trim().toLowerCase() === activeCategory.trim().toLowerCase();
      if (!matchesCat) return false;
      if (!trimmedQuery) return true;
      return (
        post.title.toLowerCase().includes(trimmedQuery) ||
        (post.excerpt || '').toLowerCase().includes(trimmedQuery) ||
        (post.category || '').toLowerCase().includes(trimmedQuery) ||
        (post.author?.name || '').toLowerCase().includes(trimmedQuery)
      );
    });
  }, [resolvedPosts, activeCategory, trimmedQuery]);

  const activeCategoryObj = resolvedCategories.find(
    (c) => c.name.toLowerCase() === activeCategory.toLowerCase()
  );

  // Front Page Tier Slices (when showing default unfiltered front page without search)
  const leadPost = resolvedPosts[0] || null;
  const headlineWirePosts = resolvedPosts.slice(1, 5);
  const recentGridPosts = resolvedPosts.slice(5, 11);

  const categorySections = useMemo(() => {
    return resolvedCategories
      .map((cat) => {
        const articles = resolvedPosts.filter(
          (p) => (p.category || '').trim().toLowerCase() === cat.name.trim().toLowerCase()
        );
        return { category: cat, articles };
      })
      .filter((section) => section.articles.length > 0);
  }, [resolvedCategories, resolvedPosts]);

  const frontPageOffsets = useMemo(() => {
    const tier1Count = (leadPost ? 1 : 0) + headlineWirePosts.length;
    const tier2Count = recentGridPosts.length;
    const sectionStarts: number[] = [];
    let runningCount = tier1Count + tier2Count;
    for (const sec of categorySections) {
      sectionStarts.push(runningCount);
      runningCount += Math.min(3, sec.articles.length);
    }
    return {
      tier1Count,
      tier2Start: tier1Count,
      sectionStarts,
      totalRenderedFrontPageCards: runningCount
    };
  }, [leadPost, headlineWirePosts.length, recentGridPosts.length, categorySections]);

  const activeFeedCardCount = isFiltering
    ? filteredPosts.length
    : frontPageOffsets.totalRenderedFrontPageCards;

  const homepageAdPlan = useMemo(
    () =>
      buildHomepageAdPlan({
        totalPosts: activeFeedCardCount,
        adsSettings: adsSettings || DEFAULT_ADS_SETTINGS,
        deviceType: isMobileViewport ? 'mobile' : 'desktop'
      }),
    [activeFeedCardCount, adsSettings, isMobileViewport]
  );

  const feedContextKey = isFiltering
    ? `filtered:${activeCategory}:${trimmedQuery}`
    : 'frontpage';

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3.5 pb-6 sm:pt-5 sm:pb-8 flex flex-col"
      style={{ gap: 'var(--app-space-section)' }}
    >
      {/* Newsroom Edition Bar & Search */}
      <section
        className="border-b pb-4 min-h-[108px] md:min-h-[54px] flex flex-col md:flex-row md:items-center justify-between gap-3"
        style={{ borderColor: 'var(--app-border-color)' }}
      >
        <div
          className="flex flex-wrap items-center content-start gap-x-2.5 gap-y-1 text-xs min-h-[36px] md:min-h-0"
          style={{ color: 'var(--app-muted-text)' }}
        >
          <span
            className="inline-flex items-center space-x-1.5 font-bold uppercase tracking-widest"
            style={{ color: 'var(--app-primary)' }}
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>
              {activeCategory === 'All Categories' ? 'Front Page' : activeCategory}
            </span>
          </span>
          {todayFormatted && (
            <>
              <span className="opacity-45">·</span>
              <time className="font-medium" style={{ color: 'var(--app-body-text)' }}>{todayFormatted}</time>
            </>
          )}
          <span className="opacity-45">·</span>
          <span className="tabular-nums" style={{ color: 'var(--app-muted-text)' }}>
            {resolvedPosts.length} {resolvedPosts.length === 1 ? 'article' : 'articles'} published
          </span>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 lg:w-80">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--app-muted-text)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news & articles..."
            aria-label="Search news and articles"
            className="theme-input w-full pl-9 pr-8 py-2 text-xs sm:text-sm border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 hover:opacity-80 cursor-pointer"
              style={{ color: 'var(--app-muted-text)' }}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* Optional Administrator Notice Banner */}
      {(customHeadline || customNote) && (
        <section
          className="theme-card border px-5 py-4 shadow-2xs"
          style={{ borderRadius: 'var(--app-radius-card)' }}
        >
          {customHeadline && (
            <h2
              className="text-lg sm:text-xl font-serif font-bold tracking-tight"
              style={{ color: 'var(--app-heading-primary)' }}
            >
              {customHeadline}
            </h2>
          )}
          {customNote && (
            <p
              className="text-xs sm:text-sm mt-1 leading-relaxed"
              style={{ color: 'var(--app-muted-text)' }}
            >
              {customNote}
            </p>
          )}
        </section>
      )}

      {/* Main Newspaper Feed */}
      {isLoading && resolvedPosts.length === 0 ? (
        <div
          key="home-loading-skeleton"
          role="status"
          aria-busy="true"
          aria-label="Loading latest news articles"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 animate-pulse"
        >
          <div className="lg:col-span-7 xl:col-span-8 theme-card border overflow-hidden">
            <div className="aspect-[16/9] w-full bg-slate-200/80 dark:bg-slate-800" />
            <div className="p-5 sm:p-7 space-y-4">
              <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-8 w-11/12 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="lg:col-span-5 xl:col-span-4 theme-card border p-5 sm:p-6 space-y-4">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="flex items-start gap-3.5 pt-3 border-t" style={{ borderColor: 'var(--app-border-color)' }}>
                <div className="w-24 h-[72px] sm:w-28 sm:h-20 shrink-0 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : resolvedPosts.length === 0 ? (
        <div key="home-empty" className="theme-card border p-12 text-center space-y-3">
          <FileText className="w-10 h-10 mx-auto" style={{ color: 'var(--app-muted-text)' }} />
          <h1 className="font-serif text-2xl font-bold" style={{ color: 'var(--app-heading-primary)' }}>
            No News Articles Published Yet
          </h1>
          <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--app-muted-text)' }}>
            Published articles from the editorial newsroom will appear here automatically.
          </p>
        </div>
      ) : isFiltering ? (
        /* ==================== CATEGORY / SEARCH RESULTS VIEW ==================== */
        <section key="home-filtered" className="space-y-7">
          <div
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-5"
            style={{ borderColor: 'var(--app-border-color)' }}
          >
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  handleSelectCat('All Categories');
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-bold hover:opacity-80 cursor-pointer"
                style={{ color: 'var(--app-link-color)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Front Page</span>
              </button>
              <h1
                className="font-serif text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ color: 'var(--app-heading-primary)' }}
              >
                {activeCategory !== 'All Categories'
                  ? activeCategory
                  : `Search: "${searchQuery.trim()}"`}
              </h1>
              {activeCategoryObj?.description && (
                <p className="text-sm max-w-2xl leading-relaxed" style={{ color: 'var(--app-muted-text)' }}>
                  {activeCategoryObj.description}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: 'var(--app-muted-text)' }}>
              {filteredPosts.length} {filteredPosts.length === 1 ? 'story' : 'stories'}
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="theme-card border p-12 text-center space-y-3">
              <FileText className="w-8 h-8 mx-auto" style={{ color: 'var(--app-muted-text)' }} />
              <h2 className="font-serif text-xl font-bold" style={{ color: 'var(--app-heading-primary)' }}>
                No matching stories found
              </h2>
              <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--app-muted-text)' }}>
                There are no published articles matching your current selection yet.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  handleSelectCat('All Categories');
                }}
                className="theme-btn-primary inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                <span>View {allNewsLabel}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Spotlight first story in category */}
              {(() => {
                const topStory = filteredPosts[0];
                const topThumb = getSingleArticleThumbnailUrl(topStory);
                const topDate = formatPublicationDate(topStory.publishedAt || topStory.updatedAt);
                const adAfterFirst = homepageAdPlan.placementsByPosition[1];

                return (
                  <React.Fragment key={`filtered-top-${topStory.id}`}>
                    <article
                      onClick={() => handleOpenPost(topStory)}
                      className="group theme-card border overflow-hidden hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-12 cursor-pointer"
                    >
                      <div className="lg:col-span-7 aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <ArticleThumbnailImage
                          src={topThumb}
                          alt={topStory.thumbnailAlt || topStory.title}
                          priority={true}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                      <div
                        className="lg:col-span-5 flex flex-col justify-between space-y-4"
                        style={{ padding: 'var(--app-space-card)' }}
                      >
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--app-muted-text)' }}>
                            <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--app-primary)' }}>
                              {topStory.category}
                            </span>
                            {topDate && (
                              <>
                                <span className="opacity-45">·</span>
                                <time dateTime={topStory.publishedAt}>{topDate.formattedDate}</time>
                              </>
                            )}
                          </div>
                          <h2
                            className="font-serif text-2xl sm:text-3xl font-bold transition-colors leading-tight"
                            style={{ color: 'var(--app-heading-primary)' }}
                          >
                            {topStory.title}
                          </h2>
                          <p className="text-sm leading-relaxed line-clamp-4" style={{ color: 'var(--app-muted-text)' }}>
                            {topStory.excerpt || extractPlainTextExcerpt(topStory.content, 220)}
                          </p>
                        </div>
                        <div
                          className="pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
                          style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
                        >
                          <span className="font-medium" style={{ color: 'var(--app-body-text)' }}>
                            {topStory.author?.name || 'ISEZERANO Newsroom'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleOpenComments(e, topStory)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-colors cursor-pointer"
                              style={{ color: 'var(--app-muted-text)' }}
                              title="Comments"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="tabular-nums">{resolvedCommentCounts[topStory.id] || 0}</span>
                            </button>
                            <ArticleShareButton post={topStory} variant="compact" />
                            <span
                              className="inline-flex items-center space-x-1 font-bold ml-1"
                              style={{ color: 'var(--app-link-color)' }}
                            >
                              <span>Read</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>

                    {adAfterFirst && (
                      <HomepageInFeedAdSlot
                        slotId={adAfterFirst.slotId}
                        slotConfig={adAfterFirst.slotConfig}
                        feedContext={feedContextKey}
                      />
                    )}
                  </React.Fragment>
                );
              })()}

              {/* Remaining stories in category */}
              {filteredPosts.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--app-space-gap)' }}>
                  {filteredPosts.slice(1).map((post, idx) => {
                    const thumb = getSingleArticleThumbnailUrl(post);
                    const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);
                    const feedPosition = idx + 2;
                    const adAfterCard = homepageAdPlan.placementsByPosition[feedPosition];

                    return (
                      <React.Fragment key={post.id}>
                        <article
                          onClick={() => handleOpenPost(post)}
                          className="group theme-card border overflow-hidden hover:shadow-md transition-all flex flex-col cursor-pointer"
                        >
                          <div
                            className="aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-b"
                            style={{ borderColor: 'var(--app-border-color)' }}
                          >
                            <ArticleThumbnailImage
                              src={thumb}
                              alt={post.thumbnailAlt || post.title}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                          </div>
                          <div
                            className="flex-1 flex flex-col justify-between space-y-4"
                            style={{ padding: 'var(--app-space-card)' }}
                          >
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--app-muted-text)' }}>
                                <span className="font-bold" style={{ color: 'var(--app-primary)' }}>{post.category}</span>
                                {dateInfo && (
                                  <>
                                    <span className="opacity-45">·</span>
                                    <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                                  </>
                                )}
                              </div>
                              <h3
                                className="font-serif text-lg sm:text-xl font-bold transition-colors leading-snug line-clamp-2"
                                style={{ color: 'var(--app-heading-primary)' }}
                              >
                                {post.title}
                              </h3>
                              <p className="text-xs sm:text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--app-muted-text)' }}>
                                {post.excerpt || extractPlainTextExcerpt(post.content, 150)}
                              </p>
                            </div>
                            <div
                              className="pt-3 border-t flex items-center justify-between gap-2 text-xs"
                              style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
                            >
                              <span className="font-medium truncate" style={{ color: 'var(--app-body-text)' }}>
                                {post.author?.name || 'ISEZERANO Newsroom'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenComments(e, post)}
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-colors cursor-pointer"
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

                        {adAfterCard && (
                          <div className="col-span-full">
                            <HomepageInFeedAdSlot
                              slotId={adAfterCard.slotId}
                              slotConfig={adAfterCard.slotConfig}
                              feedContext={feedContextKey}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        /* ==================== FRONT PAGE NEWSPAPER EDITION ==================== */
        <div key="home-frontpage-feed" className="flex flex-col" style={{ gap: 'var(--app-space-section)' }}>
          {/* TIER 1: LEAD FEATURED STORY + LATEST HEADLINES WIRE */}
          {leadPost && (
            <section aria-label="Featured news" className="grid grid-cols-1 lg:grid-cols-12" style={{ gap: 'var(--app-space-gap)' }}>
              {/* Lead Featured Story (Left 7 or 12 cols if only 1 story exists) */}
              <div
                className={`flex flex-col gap-6 ${
                  headlineWirePosts.length > 0 ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'
                }`}
              >
                <article
                  onClick={() => handleOpenPost(leadPost)}
                  className="group theme-card border overflow-hidden hover:shadow-md transition-all flex flex-col cursor-pointer flex-1"
                >
                  <div
                    className="aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-b"
                    style={{ borderColor: 'var(--app-border-color)' }}
                  >
                    <ArticleThumbnailImage
                      src={getSingleArticleThumbnailUrl(leadPost)}
                      alt={leadPost.thumbnailAlt || leadPost.title}
                      priority={true}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                  <div
                    className="flex-1 flex flex-col justify-between space-y-4"
                    style={{ padding: 'var(--app-space-card)' }}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs" style={{ color: 'var(--app-muted-text)' }}>
                        <span className="font-bold uppercase tracking-wider" style={{ color: 'var(--app-primary)' }}>
                          {leadPost.category}
                        </span>
                        {(() => {
                          const leadDate = formatPublicationDate(
                            leadPost.publishedAt || leadPost.updatedAt
                          );
                          return leadDate ? (
                            <>
                              <span className="opacity-45">·</span>
                              <time
                                dateTime={leadPost.publishedAt}
                                className="inline-flex items-center space-x-1"
                              >
                                <Calendar className="w-3.5 h-3.5 opacity-75" />
                                <span>{leadDate.formattedDateFull}</span>
                              </time>
                            </>
                          ) : null;
                        })()}
                      </div>

                      <h1
                        className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold transition-colors leading-[1.15] tracking-tight"
                        style={{ color: 'var(--app-heading-primary)' }}
                      >
                        {leadPost.title}
                      </h1>

                      <p className="text-sm sm:text-base leading-relaxed line-clamp-3" style={{ color: 'var(--app-muted-text)' }}>
                        {leadPost.excerpt || extractPlainTextExcerpt(leadPost.content, 240)}
                      </p>
                    </div>

                    <div
                      className="pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-xs"
                      style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
                    >
                      <span className="inline-flex items-center space-x-1.5 font-medium" style={{ color: 'var(--app-body-text)' }}>
                        <User className="w-3.5 h-3.5 opacity-75" />
                        <span>{leadPost.author?.name || 'ISEZERANO Newsroom'}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleOpenComments(e, leadPost)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-colors cursor-pointer"
                          style={{ color: 'var(--app-muted-text)' }}
                          title="Comments"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Comment</span>
                          <span className="tabular-nums font-semibold">
                            ({resolvedCommentCounts[leadPost.id] || 0})
                          </span>
                        </button>
                        <ArticleShareButton post={leadPost} variant="compact" />
                        <span
                          className="inline-flex items-center space-x-1 font-bold group-hover:translate-x-0.5 transition-transform ml-1"
                          style={{ color: 'var(--app-link-color)' }}
                        >
                          <span>Read story</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </article>

                {homepageAdPlan.placementsByPosition[1] && (
                  <HomepageInFeedAdSlot
                    slotId={homepageAdPlan.placementsByPosition[1].slotId}
                    slotConfig={homepageAdPlan.placementsByPosition[1].slotConfig}
                    feedContext={feedContextKey}
                  />
                )}
              </div>

              {/* Latest Headlines Wire (Right 5 or 4 cols) */}
              {headlineWirePosts.length > 0 && (
                <aside
                  className="lg:col-span-5 xl:col-span-4 theme-card border flex flex-col justify-between"
                  style={{ padding: 'var(--app-space-card)' }}
                >
                  <div>
                    <div
                      className="border-b-2 pb-2.5 mb-1 flex items-center justify-between"
                      style={{ borderColor: 'var(--app-heading-primary)' }}
                    >
                      <h2
                        className="text-xs font-extrabold uppercase tracking-widest"
                        style={{ color: 'var(--app-heading-primary)' }}
                      >
                        Latest Headlines
                      </h2>
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--app-muted-text)' }}
                      >
                        Recent
                      </span>
                    </div>

                    <div className="divide-y" style={{ borderColor: 'var(--app-border-color)' }}>
                      {headlineWirePosts.map((post, idx) => {
                        const thumb = getSingleArticleThumbnailUrl(post);
                        const dateInfo = formatPublicationDate(
                          post.publishedAt || post.updatedAt
                        );
                        const feedPosition = idx + 2;
                        const isLastWireItem = idx === headlineWirePosts.length - 1;
                        const adAfterWire = !isLastWireItem
                          ? homepageAdPlan.placementsByPosition[feedPosition]
                          : undefined;

                        return (
                          <React.Fragment key={post.id}>
                            <article
                              onClick={() => handleOpenPost(post)}
                              className="group py-4 first:pt-3 last:pb-1 flex items-start gap-3.5 cursor-pointer"
                              style={{ borderColor: 'var(--app-border-color)' }}
                            >
                              <div
                                className="w-24 h-[72px] sm:w-28 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border"
                                style={{ borderColor: 'var(--app-border-color)' }}
                              >
                                <ArticleThumbnailImage
                                  src={thumb}
                                  alt={post.thumbnailAlt || post.title}
                                  compact={true}
                                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                />
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-x-1.5 text-[11px]" style={{ color: 'var(--app-muted-text)' }}>
                                  <span className="font-bold uppercase tracking-wide" style={{ color: 'var(--app-primary)' }}>
                                    {post.category}
                                  </span>
                                  {dateInfo && (
                                    <>
                                      <span className="opacity-45">·</span>
                                      <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                                    </>
                                  )}
                                </div>
                                <h3
                                  className="font-serif text-sm sm:text-base font-bold transition-colors leading-snug line-clamp-2"
                                  style={{ color: 'var(--app-heading-primary)' }}
                                >
                                  {post.title}
                                </h3>
                                <div className="flex items-center justify-between gap-2 pt-0.5 text-xs" style={{ color: 'var(--app-muted-text)' }}>
                                  <span className="truncate">
                                    {post.author?.name || 'ISEZERANO Newsroom'}
                                  </span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenComments(e, post)}
                                      className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs font-medium hover:opacity-80 transition-colors cursor-pointer"
                                      style={{ color: 'var(--app-muted-text)' }}
                                      title="Comments"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      <span className="tabular-nums">
                                        {resolvedCommentCounts[post.id] || 0}
                                      </span>
                                    </button>
                                    <ArticleShareButton post={post} variant="compact" />
                                  </div>
                                </div>
                              </div>
                            </article>

                            {adAfterWire && (
                              <div className="py-3">
                                <HomepageInFeedAdSlot
                                  slotId={adAfterWire.slotId}
                                  slotConfig={adAfterWire.slotConfig}
                                  feedContext={feedContextKey}
                                />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </aside>
              )}

              {/* End of Tier 1 boundary (e.g., After Article #5) spans full width cleanly */}
              {headlineWirePosts.length > 0 &&
                homepageAdPlan.placementsByPosition[frontPageOffsets.tier1Count] && (
                  <div className="col-span-full">
                    <HomepageInFeedAdSlot
                      slotId={homepageAdPlan.placementsByPosition[frontPageOffsets.tier1Count].slotId}
                      slotConfig={
                        homepageAdPlan.placementsByPosition[frontPageOffsets.tier1Count].slotConfig
                      }
                      feedContext={feedContextKey}
                    />
                  </div>
                )}
            </section>
          )}

          {/* TIER 2: MORE LATEST ARTICLES GRID */}
          {recentGridPosts.length > 0 && (
            <section className="space-y-5">
              <div
                className="border-t-2 pt-3 flex items-center justify-between"
                style={{ borderColor: 'var(--app-heading-primary)' }}
              >
                <h2
                  className="font-serif text-xl sm:text-2xl font-bold tracking-tight"
                  style={{ color: 'var(--app-heading-primary)' }}
                >
                  Latest News
                </h2>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--app-muted-text)' }}>
                  Editorial Feed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--app-space-gap)' }}>
                {recentGridPosts.map((post, idx) => {
                  const thumb = getSingleArticleThumbnailUrl(post);
                  const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);
                  const feedPosition = frontPageOffsets.tier2Start + idx + 1;
                  const adAfterCard = homepageAdPlan.placementsByPosition[feedPosition];

                  return (
                    <React.Fragment key={post.id}>
                      <article
                        onClick={() => handleOpenPost(post)}
                        className="group theme-card border overflow-hidden hover:shadow-md transition-all flex flex-col cursor-pointer"
                      >
                        <div
                          className="aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-b"
                          style={{ borderColor: 'var(--app-border-color)' }}
                        >
                          <ArticleThumbnailImage
                            src={thumb}
                            alt={post.thumbnailAlt || post.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        </div>
                        <div
                          className="flex-1 flex flex-col justify-between space-y-4"
                          style={{ padding: 'var(--app-space-card)' }}
                        >
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--app-muted-text)' }}>
                              <span className="font-bold" style={{ color: 'var(--app-primary)' }}>{post.category}</span>
                              {dateInfo && (
                                <>
                                  <span className="opacity-45">·</span>
                                  <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                                </>
                              )}
                            </div>
                            <h3
                              className="font-serif text-lg sm:text-xl font-bold transition-colors leading-snug line-clamp-2"
                              style={{ color: 'var(--app-heading-primary)' }}
                            >
                              {post.title}
                            </h3>
                            <p className="text-xs sm:text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--app-muted-text)' }}>
                              {post.excerpt || extractPlainTextExcerpt(post.content, 145)}
                            </p>
                          </div>
                          <div
                            className="pt-3 border-t flex items-center justify-between gap-2 text-xs"
                            style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
                          >
                            <span className="font-medium truncate" style={{ color: 'var(--app-body-text)' }}>
                              {post.author?.name || 'ISEZERANO Newsroom'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleOpenComments(e, post)}
                                className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-colors cursor-pointer"
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

                      {adAfterCard && (
                        <div className="col-span-full">
                          <HomepageInFeedAdSlot
                            slotId={adAfterCard.slotId}
                            slotConfig={adAfterCard.slotConfig}
                            feedContext={feedContextKey}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </section>
          )}

          {/* TIER 3: CATEGORY-BASED NEWS SECTIONS */}
          {categorySections.map(({ category, articles }, sectionIdx) => {
            const sectionStart = frontPageOffsets.sectionStarts[sectionIdx] || 0;

            return (
              <section key={category.id || category.name} className="space-y-5 offscreen-section">
                <div
                  className="border-t-2 pt-3.5 flex flex-col sm:flex-row sm:items-end justify-between gap-2"
                  style={{ borderColor: 'var(--app-heading-primary)' }}
                >
                  <div>
                    <h2
                      className="font-serif text-xl sm:text-2xl font-bold tracking-tight"
                      style={{ color: 'var(--app-heading-primary)' }}
                    >
                      {category.name}
                    </h2>
                    {category.description && (
                      <p className="text-xs sm:text-sm mt-0.5 max-w-2xl" style={{ color: 'var(--app-muted-text)' }}>
                        {category.description}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectCat(category.name)}
                    className="inline-flex items-center space-x-1 text-xs font-bold hover:opacity-80 cursor-pointer shrink-0"
                    style={{ color: 'var(--app-link-color)' }}
                  >
                    <span>View all ({articles.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--app-space-gap)' }}>
                  {articles.slice(0, 3).map((post, idx) => {
                    const thumb = getSingleArticleThumbnailUrl(post);
                    const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);
                    const feedPosition = sectionStart + idx + 1;
                    const adAfterCard = homepageAdPlan.placementsByPosition[feedPosition];

                    return (
                      <React.Fragment key={post.id}>
                        <article
                          onClick={() => handleOpenPost(post)}
                          className="group theme-card border overflow-hidden hover:shadow-md transition-all flex flex-col cursor-pointer"
                        >
                          <div
                            className="aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden border-b"
                            style={{ borderColor: 'var(--app-border-color)' }}
                          >
                            <ArticleThumbnailImage
                              src={thumb}
                              alt={post.thumbnailAlt || post.title}
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            />
                          </div>
                          <div
                            className="flex-1 flex flex-col justify-between space-y-3"
                            style={{ padding: 'var(--app-space-card)' }}
                          >
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--app-muted-text)' }}>
                                <span className="font-bold" style={{ color: 'var(--app-primary)' }}>{post.category}</span>
                                {dateInfo && (
                                  <>
                                    <span className="opacity-45">·</span>
                                    <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                                  </>
                                )}
                              </div>
                              <h3
                                className="font-serif text-lg font-bold transition-colors leading-snug line-clamp-2"
                                style={{ color: 'var(--app-heading-primary)' }}
                              >
                                {post.title}
                              </h3>
                              <p className="text-xs sm:text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--app-muted-text)' }}>
                                {post.excerpt || extractPlainTextExcerpt(post.content, 130)}
                              </p>
                            </div>
                            <div
                              className="pt-3 border-t flex items-center justify-between gap-2 text-xs"
                              style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
                            >
                              <span className="font-medium truncate" style={{ color: 'var(--app-body-text)' }}>
                                {post.author?.name || 'ISEZERANO Newsroom'}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenComments(e, post)}
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium hover:opacity-80 transition-colors cursor-pointer"
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

                        {adAfterCard && (
                          <div className="col-span-full">
                            <HomepageInFeedAdSlot
                              slotId={adAfterCard.slotId}
                              slotConfig={adAfterCard.slotConfig}
                              feedContext={feedContextKey}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Clean Newspaper Colophon / Institutional Footnote */}
      <footer
        className="text-center pt-6 border-t text-xs"
        style={{ borderColor: 'var(--app-border-color)', color: 'var(--app-muted-text)' }}
      >
        {branding?.showWebsiteName !== false && (
          <p className="font-semibold" style={{ color: 'var(--app-body-text)' }}>
            <span
              className="font-extrabold"
              style={{
                fontFamily:
                  typography?.websiteNameFontFamily ||
                  "'Times New Roman', Times, Baskerville, Georgia, serif",
                color: `var(--app-website-name-color, ${typography?.websiteNameColor || colors.headerText || '#0f172a'})`,
                fontSize: `clamp(13px, 3vw, ${Math.min(
                  Math.max(14, Math.round((Number(typography?.websiteNameSize) || 26) * 0.65)),
                  24
                )}px)`
              }}
            >
              {branding?.platformTitle || 'ISEZERANO ONLINE'}
            </span>
            {branding?.platformSubtitle ? ` • ${branding.platformSubtitle}` : ''}
          </p>
        )}
        {branding?.showWebsiteDescription !== false && branding?.websiteDescription?.trim() && (
          <p className="text-xs mt-1 max-w-2xl mx-auto" style={{ color: 'var(--app-muted-text)' }}>
            {branding.websiteDescription}
          </p>
        )}
        <p className="text-[11px] mt-0.5 opacity-85" style={{ color: 'var(--app-muted-text)' }}>
          {branding?.footerTagline || 'Independent Digital News & Information Portal'}
        </p>
      </footer>
    </div>
  );
};

