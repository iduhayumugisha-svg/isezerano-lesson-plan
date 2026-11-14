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
  Loader2,
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

interface HomeViewProps {
  onNavigate: (page: any) => void;
  savedPlansCount?: number;
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
  const { colors, branding } = useWebsiteDesign();

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

  const usesExternalPosts = externalPosts !== undefined;
  const usesExternalCategories = externalCategories !== undefined;
  const usesExternalCommentCounts = externalCommentCounts !== undefined;

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Front Page Tier Slices (when showing All News without search)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-8 sm:space-y-10">
      {/* Newsroom Edition Bar & Search */}
      <section className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center space-x-1.5 font-bold uppercase tracking-widest text-teal-800">
            <Newspaper className="w-3.5 h-3.5" />
            <span>
              {activeCategory === 'All Categories' ? 'Front Page' : activeCategory}
            </span>
          </span>
          {todayFormatted && (
            <>
              <span className="text-slate-300">·</span>
              <time className="text-slate-600 font-medium">{todayFormatted}</time>
            </>
          )}
          <span className="text-slate-300">·</span>
          <span className="text-slate-500 tabular-nums">
            {resolvedPosts.length} {resolvedPosts.length === 1 ? 'article' : 'articles'} published
          </span>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search news & articles..."
            aria-label="Search news and articles"
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* Optional Administrator Notice Banner */}
      {(customHeadline || customNote) && (
        <section className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-2xs">
          {customHeadline && (
            <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-900 tracking-tight">
              {customHeadline}
            </h2>
          )}
          {customNote && (
            <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
              {customNote}
            </p>
          )}
        </section>
      )}

      {/* Main Newspaper Feed */}
      {isLoading && resolvedPosts.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-7 h-7 text-teal-700 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Loading latest news articles...</p>
        </div>
      ) : resolvedPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-slate-400 mx-auto" />
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            No News Articles Published Yet
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
            Published articles from the editorial newsroom will appear here automatically.
          </p>
        </div>
      ) : isFiltering ? (
        /* ==================== CATEGORY / SEARCH RESULTS VIEW ==================== */
        <section className="space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  handleSelectCat('All Categories');
                }}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Front Page</span>
              </button>
              <h1
                className="font-serif text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ color: colors.headingPrimary }}
              >
                {activeCategory !== 'All Categories'
                  ? activeCategory
                  : `Search: "${searchQuery.trim()}"`}
              </h1>
              {activeCategoryObj?.description && (
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {activeCategoryObj.description}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500 tabular-nums shrink-0">
              {filteredPosts.length} {filteredPosts.length === 1 ? 'story' : 'stories'}
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <h2 className="font-serif text-xl font-bold text-slate-900">
                No matching stories found
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                There are no published articles matching your current selection yet.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  handleSelectCat('All Categories');
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                <span>View All News</span>
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Spotlight first story in category */}
              {(() => {
                const topStory = filteredPosts[0];
                const topThumb = getSingleArticleThumbnailUrl(topStory);
                const topDate = formatPublicationDate(topStory.publishedAt || topStory.updatedAt);

                return (
                  <article
                    onClick={() => handleOpenPost(topStory)}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-600/60 hover:shadow-md transition-all grid grid-cols-1 lg:grid-cols-12 cursor-pointer"
                  >
                    <div className="lg:col-span-7 aspect-[16/10] bg-slate-100 overflow-hidden">
                      <ArticleThumbnailImage
                        src={topThumb}
                        alt={topStory.thumbnailAlt || topStory.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                    <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                          <span className="font-bold uppercase tracking-wider text-teal-800">
                            {topStory.category}
                          </span>
                          {topDate && (
                            <>
                              <span className="text-slate-300">·</span>
                              <time dateTime={topStory.publishedAt}>{topDate.formattedDate}</time>
                            </>
                          )}
                        </div>
                        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-tight">
                          {topStory.title}
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                          {topStory.excerpt || extractPlainTextExcerpt(topStory.content, 220)}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {topStory.author?.name || 'ISEZERANO Newsroom'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenComments(e, topStory)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Comments"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="tabular-nums">{resolvedCommentCounts[topStory.id] || 0}</span>
                          </button>
                          <ArticleShareButton post={topStory} variant="compact" />
                          <span className="inline-flex items-center space-x-1 font-bold text-teal-800 ml-1">
                            <span>Read</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })()}

              {/* Remaining stories in category */}
              {filteredPosts.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.slice(1).map((post) => {
                    const thumb = getSingleArticleThumbnailUrl(post);
                    const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);

                    return (
                      <article
                        key={post.id}
                        onClick={() => handleOpenPost(post)}
                        className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-600/60 hover:shadow-md transition-all flex flex-col cursor-pointer"
                      >
                        <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                          <ArticleThumbnailImage
                            src={thumb}
                            alt={post.thumbnailAlt || post.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                              <span className="font-bold text-teal-800">{post.category}</span>
                              {dateInfo && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                                </>
                              )}
                            </div>
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                              {post.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                              {post.excerpt || extractPlainTextExcerpt(post.content, 150)}
                            </p>
                          </div>
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                            <span className="font-medium text-slate-700 truncate">
                              {post.author?.name || 'ISEZERANO Newsroom'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => handleOpenComments(e, post)}
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
          )}
        </section>
      ) : (
        /* ==================== FRONT PAGE NEWSPAPER EDITION ==================== */
        <div className="space-y-10 sm:space-y-12">
          {/* TIER 1: LEAD FEATURED STORY + LATEST HEADLINES WIRE */}
          {leadPost && (
            <section aria-label="Featured news" className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              {/* Lead Featured Story (Left 7 or 12 cols if only 1 story exists) */}
              <article
                onClick={() => handleOpenPost(leadPost)}
                className={`group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-600/60 hover:shadow-md transition-all flex flex-col cursor-pointer ${
                  headlineWirePosts.length > 0 ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'
                }`}
              >
                <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                  <ArticleThumbnailImage
                    src={getSingleArticleThumbnailUrl(leadPost)}
                    alt={leadPost.thumbnailAlt || leadPost.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>
                <div className="p-5 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                      <span className="font-bold uppercase tracking-wider text-teal-800">
                        {leadPost.category}
                      </span>
                      {(() => {
                        const leadDate = formatPublicationDate(
                          leadPost.publishedAt || leadPost.updatedAt
                        );
                        return leadDate ? (
                          <>
                            <span className="text-slate-300">·</span>
                            <time
                              dateTime={leadPost.publishedAt}
                              className="inline-flex items-center space-x-1"
                            >
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{leadDate.formattedDateFull}</span>
                            </time>
                          </>
                        ) : null;
                      })()}
                    </div>

                    <h1
                      className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold group-hover:text-teal-800 transition-colors leading-[1.15] tracking-tight"
                      style={{ color: colors.headingPrimary }}
                    >
                      {leadPost.title}
                    </h1>

                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed line-clamp-3">
                      {leadPost.excerpt || extractPlainTextExcerpt(leadPost.content, 240)}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center space-x-1.5 font-medium text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{leadPost.author?.name || 'ISEZERANO Newsroom'}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleOpenComments(e, leadPost)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Comments"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Comment</span>
                        <span className="tabular-nums font-semibold">
                          ({resolvedCommentCounts[leadPost.id] || 0})
                        </span>
                      </button>
                      <ArticleShareButton post={leadPost} variant="compact" />
                      <span className="inline-flex items-center space-x-1 font-bold text-teal-800 group-hover:translate-x-0.5 transition-transform ml-1">
                        <span>Read story</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </article>

              {/* Latest Headlines Wire (Right 5 or 4 cols) */}
              {headlineWirePosts.length > 0 && (
                <aside className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col justify-between">
                  <div>
                    <div className="border-b-2 border-slate-900 pb-2.5 mb-1 flex items-center justify-between">
                      <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-900">
                        Latest Headlines
                      </h2>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Recent
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {headlineWirePosts.map((post) => {
                        const thumb = getSingleArticleThumbnailUrl(post);
                        const dateInfo = formatPublicationDate(
                          post.publishedAt || post.updatedAt
                        );

                        return (
                          <article
                            key={post.id}
                            onClick={() => handleOpenPost(post)}
                            className="group py-4 first:pt-3 last:pb-1 flex items-start gap-3.5 cursor-pointer"
                          >
                            <div className="w-24 h-[72px] sm:w-28 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200/70">
                              <ArticleThumbnailImage
                                src={thumb}
                                alt={post.thumbnailAlt || post.title}
                                compact={true}
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500">
                                <span className="font-bold uppercase tracking-wide text-teal-800">
                                  {post.category}
                                </span>
                                {dateInfo && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                                  </>
                                )}
                              </div>
                              <h3 className="font-serif text-sm sm:text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                                {post.title}
                              </h3>
                              <div className="flex items-center justify-between gap-2 pt-0.5 text-xs text-slate-500">
                                <span className="truncate">
                                  {post.author?.name || 'ISEZERANO Newsroom'}
                                </span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenComments(e, post)}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs font-medium text-slate-600 hover:text-teal-800 hover:bg-slate-100 transition-colors cursor-pointer"
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
                        );
                      })}
                    </div>
                  </div>
                </aside>
              )}
            </section>
          )}

          {/* TIER 2: MORE LATEST ARTICLES GRID */}
          {recentGridPosts.length > 0 && (
            <section className="space-y-5">
              <div className="border-t-2 border-slate-900 pt-3 flex items-center justify-between">
                <h2
                  className="font-serif text-xl sm:text-2xl font-bold tracking-tight"
                  style={{ color: colors.headingPrimary }}
                >
                  Latest News
                </h2>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Editorial Feed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentGridPosts.map((post) => {
                  const thumb = getSingleArticleThumbnailUrl(post);
                  const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);

                  return (
                    <article
                      key={post.id}
                      onClick={() => handleOpenPost(post)}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-600/60 hover:shadow-md transition-all flex flex-col cursor-pointer"
                    >
                      <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <ArticleThumbnailImage
                          src={thumb}
                          alt={post.thumbnailAlt || post.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                            <span className="font-bold text-teal-800">{post.category}</span>
                            {dateInfo && (
                              <>
                                <span className="text-slate-300">·</span>
                                <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                              </>
                            )}
                          </div>
                          <h3 className="font-serif text-lg sm:text-xl font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                            {post.excerpt || extractPlainTextExcerpt(post.content, 145)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700 truncate">
                            {post.author?.name || 'ISEZERANO Newsroom'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleOpenComments(e, post)}
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
            </section>
          )}

          {/* TIER 3: CATEGORY-BASED NEWS SECTIONS */}
          {categorySections.map(({ category, articles }) => (
            <section key={category.id || category.name} className="space-y-5">
              <div className="border-t-2 border-slate-900 pt-3.5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h2
                    className="font-serif text-xl sm:text-2xl font-bold tracking-tight"
                    style={{ color: colors.headingPrimary }}
                  >
                    {category.name}
                  </h2>
                  {category.description && (
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5 max-w-2xl">
                      {category.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectCat(category.name)}
                  className="inline-flex items-center space-x-1 text-xs font-bold text-teal-800 hover:text-teal-950 cursor-pointer shrink-0"
                >
                  <span>View all ({articles.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.slice(0, 3).map((post) => {
                  const thumb = getSingleArticleThumbnailUrl(post);
                  const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);

                  return (
                    <article
                      key={post.id}
                      onClick={() => handleOpenPost(post)}
                      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-600/60 hover:shadow-md transition-all flex flex-col cursor-pointer"
                    >
                      <div className="aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <ArticleThumbnailImage
                          src={thumb}
                          alt={post.thumbnailAlt || post.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                            <span className="font-bold text-teal-800">{post.category}</span>
                            {dateInfo && (
                              <>
                                <span className="text-slate-300">·</span>
                                <time dateTime={post.publishedAt}>{dateInfo.formattedDate}</time>
                              </>
                            )}
                          </div>
                          <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                            {post.excerpt || extractPlainTextExcerpt(post.content, 130)}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700 truncate">
                            {post.author?.name || 'ISEZERANO Newsroom'}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleOpenComments(e, post)}
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
            </section>
          ))}
        </div>
      )}

      {/* Clean Newspaper Colophon / Institutional Footnote */}
      <footer className="text-center pt-6 border-t border-slate-200 text-xs text-slate-500">
        {branding?.showWebsiteName !== false && (
          <p className="font-semibold text-slate-700">
            {branding?.platformTitle || 'ISEZERANO ONLINE'}
            {branding?.platformSubtitle ? ` • ${branding.platformSubtitle}` : ''}
          </p>
        )}
        {branding?.showWebsiteDescription !== false && branding?.websiteDescription?.trim() && (
          <p className="text-xs text-slate-500 mt-1 max-w-2xl mx-auto">
            {branding.websiteDescription}
          </p>
        )}
        <p className="text-[11px] text-slate-400 mt-0.5">
          {branding?.schoolLocation || 'Buyoga Sector, Rulindo District, Northern Province, Rwanda'}
        </p>
      </footer>
    </div>
  );
};

