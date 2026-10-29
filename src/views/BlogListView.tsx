import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Tag, 
  Calendar, 
  Clock, 
  Eye, 
  ArrowRight, 
  BookOpen, 
  Sparkles,
  ChevronRight,
  User,
  Share2
} from 'lucide-react';
import { BlogPost, BLOG_CATEGORIES } from '../types/blog';
import { getBlogPosts } from '../services/blogService';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import { formatPublicationDate } from '../utils/dateUtils';

interface BlogListViewProps {
  onSelectPost: (slug: string) => void;
  onNavigate: (page: any) => void;
}

export const BlogListView: React.FC<BlogListViewProps> = ({ onSelectPost, onNavigate }) => {
  const { colors, branding } = useWebsiteDesign();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');

  const loadPublishedPosts = () => {
    getBlogPosts(false).then((data) => {
      setPosts(data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadPublishedPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const handleSync = () => {
      loadPublishedPosts();
    };
    window.addEventListener('blog_posts_updated', handleSync);
    return () => {
      window.removeEventListener('blog_posts_updated', handleSync);
    };
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCat = 
      selectedCategory === 'All Categories' || post.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const featuredPost = filteredPosts.length > 0 ? filteredPosts[0] : null;
  const remainingPosts = filteredPosts.length > 0 ? filteredPosts.slice(1) : [];

  return (
    <div className="w-full">
      {/* 1. Hero Header */}
      <section 
        className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b"
        style={{
          backgroundColor: colors.headerBg,
          borderColor: colors.headerBorder,
          color: colors.headerText
        }}
      >
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-700 border border-teal-500/20">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Official Pedagogical Journal & News</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            GS GITUMBA Educational Journal & Articles
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Pedagogical guidance, Competence-Based Curriculum (CBC) instructional schemes, inspection updates, and academic milestones from GS GITUMBA in Rulindo District.
          </p>

          {/* Search & Category Filter Bar */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search articles, CBC schemes, teaching strategies..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 bg-white text-slate-900 shadow-2xs"
              />
            </div>
          </div>

          {/* Category Chips Scroll */}
          <div className="flex items-center space-x-2 overflow-x-auto pt-2 pb-1 scrollbar-none">
            {BLOG_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Main Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-xs sm:text-sm">
            Loading articles...
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No articles found</h3>
            <p className="text-xs text-slate-500">
              No published articles match "{searchTerm}". Try clearing your search query or choosing another category.
            </p>
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setSelectedCategory('All Categories'); }}
              className="px-4 py-2 text-xs font-bold bg-teal-700 text-white rounded-lg hover:bg-teal-600"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured Article Banner */}
            {featuredPost && (
              <div 
                onClick={() => onSelectPost(featuredPost.slug)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group grid grid-cols-1 lg:grid-cols-12 gap-0"
              >
                <div className="lg:col-span-7 h-56 sm:h-72 lg:h-auto relative overflow-hidden bg-slate-900">
                  <img
                    src={featuredPost.thumbnailUrl}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-600 text-white shadow-xs">
                      {featuredPost.category}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      {(() => {
                        const dateInfo = formatPublicationDate(featuredPost.publishedAt);
                        if (!dateInfo) return null;
                        return (
                          <span className="flex items-center space-x-1" title={`${dateInfo.formattedDateFull} at ${dateInfo.formattedTime}`}>
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dateInfo.formattedDate}</span>
                            <span className="text-teal-700 font-semibold">({dateInfo.relativeTime})</span>
                          </span>
                        );
                      })()}
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{featuredPost.readTimeMinutes || 4} min read</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>{featuredPost.views || 0} views</span>
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-2xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug">
                      {featuredPost.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {featuredPost.author?.avatarUrl ? (
                        <img 
                          src={featuredPost.author.avatarUrl} 
                          alt={featuredPost.author.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <span className="block text-xs font-bold text-slate-900 leading-tight">
                          {featuredPost.author?.name || 'Editorial Team'}
                        </span>
                        <span className="block text-[11px] text-slate-500 leading-none">
                          {featuredPost.author?.role || 'Educator'}
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-teal-700 group-hover:translate-x-1 transition-transform">
                      <span>Read Article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Remaining Articles Grid */}
            {remainingPosts.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center space-x-2">
                  <span>More Pedagogical Insights & School Updates</span>
                  <span className="text-xs text-slate-500 font-normal">({remainingPosts.length} articles)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remainingPosts.map((post) => (
                    <article
                      key={post.id}
                      onClick={() => onSelectPost(post.slug)}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                    >
                      <div>
                        <div className="h-44 sm:h-48 relative overflow-hidden bg-slate-900">
                          <img
                            src={post.thumbnailUrl}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-xs text-white">
                              {post.category}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 space-y-2.5">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {(() => {
                              const dateInfo = formatPublicationDate(post.publishedAt);
                              if (!dateInfo) return null;
                              return (
                                <span title={`${dateInfo.formattedDateFull} at ${dateInfo.formattedTime}`}>
                                  {dateInfo.formattedDate} ({dateInfo.relativeTime})
                                </span>
                              );
                            })()}
                            <span>•</span>
                            <span>{post.readTimeMinutes || 3} min read</span>
                            <span>•</span>
                            <span>{post.views || 0} views</span>
                          </div>

                          <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
                            {post.title}
                          </h4>

                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>

                      <div className="p-5 pt-0 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {post.author?.name || 'GS GITUMBA Team'}
                        </span>
                        <span className="font-bold text-teal-700 inline-flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                          <span>Read</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
