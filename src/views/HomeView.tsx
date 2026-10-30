import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Share2, 
  Clock, 
  Calendar, 
  Eye, 
  ArrowRight, 
  ExternalLink, 
  Copy, 
  Check, 
  TrendingUp, 
  Flame, 
  BookOpen, 
  Sparkles, 
  Newspaper,
  Tag,
  ChevronRight,
  School,
  MapPin,
  MessageCircle,
  Twitter
} from 'lucide-react';
import { HeroSlider } from '../components/HeroSlider';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { subscribeToBlogPosts } from '../services/blogService';
import { BlogPost, BLOG_CATEGORIES } from '../types/blog';
import { formatPublicationDate } from '../utils/dateUtils';
import { normalizeAndUpgradeThumbnailUrl, getSafeFallbackThumbnail } from '../utils/thumbnailUtils';

const CANONICAL_BASE_URL = 'https://ais-pre-a7az4u6j4emzxaw3vwjczy-591146875574.europe-west2.run.app';

interface HomeViewProps {
  onNavigate: (page: any) => void;
  savedPlansCount?: number;
  onSelectBlogPost?: (slug: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  onNavigate, 
  onSelectBlogPost 
}) => {
  const { colors, typography, branding } = useWebsiteDesign();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    // Real-time Firestore subscription across all devices
    const unsubscribe = subscribeToBlogPosts((allPosts) => {
      setPosts(allPosts);
      setIsLoading(false);
    }, false); // only published articles for public readers

    return () => {
      unsubscribe();
    };
  }, []);

  const handleArticleClick = (slug: string) => {
    if (onSelectBlogPost) {
      onSelectBlogPost(slug);
    } else {
      onNavigate('blog_post');
    }
  };

  const handleShareWhatsApp = (e: React.MouseEvent, post: BlogPost) => {
    e.stopPropagation();
    const url = `${CANONICAL_BASE_URL}/blog/${post.slug}`;
    const text = encodeURIComponent(`📰 ${post.title} — Read on ISEZERANO ONLINE: ${url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTwitter = (e: React.MouseEvent, post: BlogPost) => {
    e.stopPropagation();
    const url = `${CANONICAL_BASE_URL}/blog/${post.slug}`;
    const text = encodeURIComponent(post.title);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const handleCopyLink = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const url = `${CANONICAL_BASE_URL}/blog/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  // Filter posts by category and search query
  const filteredPosts = posts.filter((p) => {
    const matchesCategory = selectedCategory === 'All Categories' || p.category === selectedCategory;
    const matchesQuery = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesQuery;
  });

  // Featured lead story (first post) and secondary top stories
  const leadStory = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const secondaryStories = filteredPosts.slice(1, 3);
  const streamStories = filteredPosts.slice(3);

  // Popular / Trending stories (sorted by views descending)
  const popularStories = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  // Current formatted date in Kigali / Rwanda context
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      
      {/* 1. DIGITAL NEWSPAPER MASTHEAD BANNER */}
      <section className="border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
          
          {/* Top Ticker: Date, Location, and Edition */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-medium text-slate-500 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="font-semibold text-slate-800">{todayFormatted}</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center space-x-1 text-slate-600">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>Buyoga Sector, Rulindo District, Rwanda</span>
              </span>
            </div>

            <div className="flex items-center space-x-3 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-bold border border-teal-200">
                Official Digital Press
              </span>
              <span className="text-slate-400">GS GITUMBA Community Journal</span>
            </div>
          </div>

          {/* Newspaper Name & Branding Headline */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-2">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                <span className="text-xs font-bold tracking-widest uppercase text-teal-800">
                  Daily Digital Edition
                </span>
              </div>
              <h1 
                className="font-serif tracking-tight font-extrabold text-slate-950 text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
                style={{ color: colors.headingPrimary }}
              >
                {branding?.platformTitle || 'ISEZERANO ONLINE'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl font-serif italic">
                {branding?.platformSubtitle || 'GS GITUMBA'} — Pedagogical Innovations, Educational Guidance, and Rwanda Community News
              </p>
            </div>

            {/* Quick Article Search Bar */}
            <div className="w-full md:w-80 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search headlines, topics..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all font-medium text-slate-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Navigation Bar */}
          <div className="pt-2 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-t border-slate-100">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/90 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* 2. HOMEPAGE HERO PHOTO SLIDER & BREAKING ANNOUNCEMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <HeroSlider onNavigate={onNavigate} />
      </section>

      {/* 3. EDITORIAL NEWSPAPER FRONT PAGE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {isLoading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
            <Newspaper className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading latest stories...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
            <Newspaper className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No news articles match your filter</h3>
            <p className="text-xs text-slate-500">Try selecting "All Categories" or adjusting your search keyword.</p>
            <button
              type="button"
              onClick={() => { setSelectedCategory('All Categories'); setSearchQuery(''); }}
              className="mt-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* FRONT PAGE LEAD STORY (TOP OF THE FOLD) */}
            {leadStory && (
              <div 
                onClick={() => handleArticleClick(leadStory.slug)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  
                  {/* Lead Story Image */}
                  <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-full min-h-[300px] overflow-hidden bg-slate-900">
                    <img
                      src={normalizeAndUpgradeThumbnailUrl(leadStory.thumbnailUrl) || getSafeFallbackThumbnail(leadStory.category)}
                      alt={leadStory.title}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-md uppercase tracking-wider">
                        {leadStory.category}
                      </span>
                    </div>
                  </div>

                  {/* Lead Story Content */}
                  <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        {(() => {
                          const dateInfo = formatPublicationDate(leadStory.publishedAt);
                          return (
                            <>
                              <span className="font-semibold text-slate-700">{dateInfo?.formattedDate}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-teal-700 font-bold">{dateInfo?.relativeTime}</span>
                            </>
                          );
                        })()}
                        <span className="text-slate-300">•</span>
                        <span className="inline-flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{leadStory.readTimeMinutes || 4} min read</span>
                        </span>
                      </div>

                      <h2 className="font-serif text-2xl sm:text-3xl font-extrabold text-slate-950 group-hover:text-teal-800 transition-colors leading-tight">
                        {leadStory.title}
                      </h2>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {leadStory.excerpt || leadStory.title}
                      </p>

                      <div className="pt-2 flex items-center space-x-2 text-xs text-slate-700">
                        <span className="font-semibold">{leadStory.author?.name || 'GS GITUMBA Editorial'}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{leadStory.author?.role || 'Pedagogical Lead'}</span>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="inline-flex items-center space-x-1 text-xs sm:text-sm font-bold text-teal-700 group-hover:text-teal-900">
                        <span>Read Full Story</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>

                      {/* Social Share Buttons */}
                      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleShareWhatsApp(e, leadStory)}
                          className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                          title="Share on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleShareTwitter(e, leadStory)}
                          className="p-2 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 transition-colors cursor-pointer"
                          title="Share on X"
                        >
                          <Twitter className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(e, leadStory.slug)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedSlug === leadStory.slug ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* SECONDARY TOP STORIES (2-COLUMN EDITORIAL) */}
            {secondaryStories.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secondaryStories.map((post) => {
                  const dateInfo = formatPublicationDate(post.publishedAt);
                  return (
                    <article
                      key={post.id}
                      onClick={() => handleArticleClick(post.slug)}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="relative h-48 w-full rounded-xl overflow-hidden bg-slate-900">
                          <img
                            src={normalizeAndUpgradeThumbnailUrl(post.thumbnailUrl) || getSafeFallbackThumbnail(post.category)}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                          />
                          <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 backdrop-blur-xs text-white">
                            {post.category}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                          <span>{dateInfo?.formattedDate}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-teal-700 font-semibold">{dateInfo?.relativeTime}</span>
                        </div>

                        <h3 className="font-serif text-lg font-bold text-slate-950 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                          {post.title}
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {post.excerpt || post.title}
                        </p>
                      </div>

                      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-teal-700 flex items-center space-x-1">
                          <span>Read article</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>

                        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleShareWhatsApp(e, post)}
                            className="p-1.5 rounded-md hover:bg-emerald-50 text-emerald-700 transition-colors cursor-pointer"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCopyLink(e, post.slug)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title="Copy Link"
                          >
                            {copiedSlug === post.slug ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* MAIN TWO-COLUMN NEWSPAPER SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
              
              {/* LEFT COLUMN: LATEST NEWS STREAM (8 COLS) */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
                  <div className="flex items-center space-x-2">
                    <Newspaper className="w-5 h-5 text-teal-700" />
                    <h3 className="font-serif text-xl font-bold text-slate-950">
                      {selectedCategory === 'All Categories' ? 'Latest News & Articles' : selectedCategory}
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
                  </span>
                </div>

                {streamStories.length === 0 && filteredPosts.length <= 3 ? (
                  <p className="text-xs text-slate-500 py-4">All articles are shown in the featured stories above.</p>
                ) : (
                  <div className="divide-y divide-slate-100 space-y-4">
                    {streamStories.map((post) => {
                      const dateInfo = formatPublicationDate(post.publishedAt);
                      return (
                        <article
                          key={post.id}
                          onClick={() => handleArticleClick(post.slug)}
                          className="pt-4 first:pt-0 group cursor-pointer flex flex-col sm:flex-row gap-4 items-start justify-between"
                        >
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                              <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                                {post.category}
                              </span>
                              <span>{dateInfo?.formattedDate}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-teal-700 font-medium">{dateInfo?.relativeTime}</span>
                            </div>

                            <h4 className="font-serif text-base sm:text-lg font-bold text-slate-950 group-hover:text-teal-800 transition-colors leading-snug">
                              {post.title}
                            </h4>

                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {post.excerpt || post.title}
                            </p>

                            <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                              <span>By {post.author?.name || 'GS GITUMBA'}</span>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <Eye className="w-3 h-3 text-slate-400" />
                                <span>{post.views || 0} views</span>
                              </span>
                            </div>
                          </div>

                          {/* Thumbnail */}
                          {post.thumbnailUrl && (
                            <div className="w-full sm:w-40 sm:h-28 h-44 rounded-xl overflow-hidden shrink-0 bg-slate-900">
                              <img
                                src={normalizeAndUpgradeThumbnailUrl(post.thumbnailUrl) || getSafeFallbackThumbnail(post.category)}
                                alt={post.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: POPULAR & EDITORIAL DESK (4 COLS) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Popular / Most Read Widget */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <TrendingUp className="w-4 h-4 text-rose-600" />
                    <h4 className="font-serif text-sm font-bold text-slate-950 uppercase tracking-wider">
                      Most Read Stories
                    </h4>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {popularStories.map((post, idx) => (
                      <div
                        key={post.id}
                        onClick={() => handleArticleClick(post.slug)}
                        className="py-3 first:pt-0 last:pb-0 flex items-start space-x-3 cursor-pointer group"
                      >
                        <span className="font-serif text-2xl font-extrabold text-slate-300 group-hover:text-teal-700 transition-colors w-6 shrink-0 leading-none pt-1">
                          {idx + 1}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 group-hover:text-teal-800 transition-colors leading-snug line-clamp-2">
                            {post.title}
                          </h5>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                            <span>{post.category}</span>
                            <span>•</span>
                            <span>{post.views || 0} reads</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GS GITUMBA Community & Campus Desk */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white rounded-2xl p-6 shadow-md space-y-4">
                  <div className="flex items-center space-x-2 text-teal-400">
                    <School className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wider">GS GITUMBA Community Desk</span>
                  </div>
                  
                  <h4 className="font-serif text-lg font-bold text-white leading-snug">
                    Authentic Rwandan Pedagogical Journalism
                  </h4>
                  
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ISEZERANO ONLINE is published at Groupe Scolaire GITUMBA (Buyoga Sector, Rulindo District). Our goal is to connect teachers, learners, and community members with credible pedagogical insights and national curriculum guidance.
                  </p>

                  <div className="pt-2 text-xs text-slate-400 space-y-1 border-t border-slate-800">
                    <p>📍 Location: Buyoga, Rulindo District, Rwanda</p>
                    <p>✉️ Inquiries: twizerefelix90@gmail.com</p>
                  </div>
                </div>

                {/* Categories Overview */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <h4 className="font-serif text-sm font-bold text-slate-950 uppercase tracking-wider pb-2 border-b border-slate-100">
                    Explore Topics
                  </h4>
                  <div className="space-y-1.5">
                    {BLOG_CATEGORIES.filter(c => c !== 'All Categories').map((cat) => {
                      const count = posts.filter(p => p.category === cat).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setSelectedCategory(cat); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-800 transition-colors cursor-pointer"
                        >
                          <span>{cat}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </>
        )}

      </section>

    </div>
  );
};
