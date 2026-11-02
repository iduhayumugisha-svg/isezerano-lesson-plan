import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Globe, 
  Sparkles, 
  ExternalLink,
  ArrowLeft,
  Image as ImageIcon,
  Tag,
  Calendar,
  User,
  Share2,
  Clock,
  ShieldCheck,
  Info,
  X,
  Copy,
  Check
} from 'lucide-react';
import { BlogPost } from '../types/blog';
import { NewsCategory, DEFAULT_NEWS_CATEGORIES } from '../types/category';
import { subscribeToNewsCategories } from '../services/categoryService';
import { 
  getBlogPosts, 
  saveBlogPost, 
  deleteBlogPost, 
  generateSlug, 
  calculateReadingTime,
  subscribeToBlogPosts,
  seedInitialPostsToFirestore,
  auditAndRepairAllFirestoreBlogPosts
} from '../services/blogService';
import { 
  isValidHttpsImageUrl, 
  normalizeAndUpgradeThumbnailUrl, 
  extractFirstImageFromContent, 
  getSafeFallbackThumbnail,
  GlobalAuditReport 
} from '../utils/thumbnailUtils';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../context/AuthContext';
import { formatPublicationDate } from '../utils/dateUtils';

const CANONICAL_BASE_URL = 'https://isezerano.online';

interface BlogManagerProps {
  onViewLivePost?: (slug: string) => void;
}

export const BlogManager: React.FC<BlogManagerProps> = ({ onViewLivePost }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [adminCategories, setAdminCategories] = useState<NewsCategory[]>(DEFAULT_NEWS_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All Categories');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Social card preview modal state
  const [previewingSocialPost, setPreviewingSocialPost] = useState<BlogPost | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Global audit modal state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<GlobalAuditReport | null>(null);
  const [thumbImageStatus, setThumbImageStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [copiedThumbUrl, setCopiedThumbUrl] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    // Real-time Firestore listener for articles across all devices
    const unsubscribePosts = subscribeToBlogPosts((all) => {
      setPosts(all);
      setIsLoading(false);
    }, true); // include drafts for admin

    // Real-time Firestore listener for categories created/configured by Admin
    const unsubscribeCats = subscribeToNewsCategories((cats) => {
      setAdminCategories(cats);
    });

    return () => {
      unsubscribePosts();
      unsubscribeCats();
    };
  }, []);

  const handleRunGlobalAudit = async () => {
    const adminUid = user?.uid || 'admin';
    setIsAuditing(true);
    try {
      const res = await auditAndRepairAllFirestoreBlogPosts(adminUid);
      if (res.success && res.report) {
        setAuditReport(res.report);
      } else {
        alert(res.error || 'Failed to complete audit of blog post thumbnails.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error running audit.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSeedPosts = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await seedInitialPostsToFirestore(user.uid);
      if (res.success) {
        setSaveStatus({
          type: 'success',
          text: `🎉 Synced ${res.count} baseline pedagogical articles to Firebase!`
        });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({
          type: 'error',
          text: res.error || 'Failed to sync starter articles to Firestore.'
        });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', text: err?.message || 'Error seeding posts.' });
    } finally {
      setIsLoading(false);
    }
  };

  const activeCategoryNames = adminCategories
    .filter(c => c.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(c => c.name);

  const handleStartNew = () => {
    const defaultCat = activeCategoryNames[0] || 'Uburezi';
    const newPost: BlogPost = {
      id: `post-${Date.now()}`,
      title: '',
      slug: '',
      content: '<p>Start writing your pedagogical article or school announcement here...</p>',
      excerpt: '',
      thumbnailUrl: '', // Starts empty so user can choose to upload from device or enter custom URL
      category: defaultCat,
      author: {
        name: user?.email ? user.email.split('@')[0] : 'GS GITUMBA Editorial Team',
        role: 'Pedagogical Lead & Teacher'
      },
      publishedAt: '', // Drafts do not have a fake publication date
      status: 'draft',
      views: 0
    };
    setThumbImageStatus('idle');
    setEditingPost(newPost);
    setActiveView('editor');
  };

  const handleEditPost = (post: BlogPost) => {
    if (!post.thumbnailUrl?.trim()) {
      setThumbImageStatus('idle');
    } else if (!isValidHttpsImageUrl(post.thumbnailUrl)) {
      setThumbImageStatus('error');
    } else {
      setThumbImageStatus('loading');
    }
    setEditingPost({ ...post });
    setActiveView('editor');
  };

  const handleDeletePost = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the post "${title}"? This cannot be undone.`)) {
      return;
    }
    const adminUid = user?.uid || 'admin';
    setIsLoading(true);
    try {
      const res = await deleteBlogPost(id, adminUid);
      if (!res.success) {
        alert(res.error || 'Failed to delete post from Firestore.');
      }
    } catch (err: any) {
      alert(err?.message || 'Error occurred while deleting post.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePost = async (statusOverride?: 'published' | 'draft') => {
    if (!editingPost || !user) return;

    if (!editingPost.title.trim()) {
      setSaveStatus({ type: 'error', text: 'Please enter a title for the blog post.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    const targetStatus = statusOverride || editingPost.status;
    const isFirstTimePublishing = targetStatus === 'published' && (!editingPost.publishedAt || editingPost.status === 'draft');
    const publishedAt = isFirstTimePublishing 
      ? new Date().toISOString() 
      : (editingPost.publishedAt || (targetStatus === 'published' ? new Date().toISOString() : ''));

    const finalPost: BlogPost = {
      ...editingPost,
      title: editingPost.title.trim(),
      thumbnailUrl: editingPost.thumbnailUrl?.trim() || getSafeFallbackThumbnail(editingPost.category),
      status: targetStatus,
      publishedAt,
      slug: editingPost.slug ? generateSlug(editingPost.slug) : generateSlug(editingPost.title),
      readTimeMinutes: calculateReadingTime(editingPost.content || '')
    };

    try {
      const res = await saveBlogPost(finalPost, user.uid);
      if (res.success) {
        setSaveStatus({
          type: 'success',
          text: targetStatus === 'published' 
            ? '🎉 Article published live! Thumbnail audited and social cards ready.' 
            : '✅ Draft saved successfully!'
        });
        setTimeout(() => {
          setSaveStatus(null);
          setActiveView('list');
        }, 1200);
      } else {
        setSaveStatus({ type: 'error', text: res.error || 'Failed to save post to Firestore.' });
      }
    } catch (err: any) {
      setSaveStatus({ type: 'error', text: err?.message || 'Error saving post.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleThumbnailUrlChange = (newUrl: string) => {
    setEditingPost(prev => prev ? ({ ...prev, thumbnailUrl: newUrl, needsImageReview: false }) : null);
    if (!newUrl.trim()) {
      setThumbImageStatus('idle');
    } else if (!isValidHttpsImageUrl(newUrl)) {
      setThumbImageStatus('error');
    } else {
      setThumbImageStatus('loading');
    }
  };

  const handleExtractFromContent = () => {
    if (!editingPost) return;
    const extracted = extractFirstImageFromContent(editingPost.content || '');
    if (extracted) {
      handleThumbnailUrlChange(extracted);
      alert('Ifoto yakuwe mu nyandiko y\'inkuru neza!');
    } else {
      alert('Nta ifoto ya HTTPS yabonetse mu nyandiko y\'inkuru.');
    }
  };

  const handleApplyCategoryFallback = () => {
    if (!editingPost) return;
    const fallback = getSafeFallbackThumbnail(editingPost.category);
    handleThumbnailUrlChange(fallback);
  };

  const filteredPosts = posts.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = 
      selectedCategoryFilter === 'All Categories' || p.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 rounded-2xl text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>Pedagogical Journal & School News Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Blog & Article Publishing Manager
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Create, edit, and publish rich-text pedagogical articles, school inspection guidelines, and news. Each post includes unique SEO slugs, social sharing cards for WhatsApp and Facebook, and rich formatting.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {activeView !== 'list' ? (
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer border border-white/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Articles</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleRunGlobalAudit}
                  disabled={isAuditing}
                  className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs sm:text-sm font-semibold border border-teal-500/30 transition-all cursor-pointer disabled:opacity-50"
                  title="Audit and repair thumbnails for all posts in Firestore"
                >
                  <ShieldCheck className={`w-4 h-4 ${isAuditing ? 'animate-spin' : 'text-teal-400'}`} />
                  <span>{isAuditing ? 'Auditing...' : 'Audit Thumbnails & SEO'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Write New Article</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Status Toast */}
        {saveStatus && (
          <div className={`mt-4 p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            saveStatus.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' 
              : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
          }`}>
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{saveStatus.text}</span>
          </div>
        )}
      </div>

      {/* 2. ARTICLES LIST VIEW */}
      {activeView === 'list' && (
        <div className="space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search articles by title, topic, or slug..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Tag className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-medium text-slate-700"
              >
                <option value="All Categories">All Categories / Byose</option>
                {activeCategoryNames.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                {/* Preserve filtering for any existing posts having legacy categories */}
                {Array.from(new Set(posts.map(p => p.category).filter(Boolean)))
                  .filter(c => !activeCategoryNames.includes(c))
                  .map(legacyCat => (
                    <option key={legacyCat} value={legacyCat}>{legacyCat} (Existing)</option>
                  ))
                }
              </select>
            </div>
          </div>

          {/* Posts Table / Grid */}
          {isLoading ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-2" />
              <span className="text-xs text-slate-500">Loading articles...</span>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="p-12 bg-white rounded-xl border border-slate-200 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No articles found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchTerm ? 'Try adjusting your search filter.' : 'Write your first school announcement or pedagogical guide.'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleStartNew}
                  className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-600 cursor-pointer"
                >
                  Create First Post
                </button>
                <button
                  type="button"
                  onClick={handleSeedPosts}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer border border-slate-700"
                >
                  Sync Starter Articles to Cloud
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Article & Thumbnail Status</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Author</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Views</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-start space-x-3">
                            {post.thumbnailUrl && (
                              <img 
                                src={normalizeAndUpgradeThumbnailUrl(post.thumbnailUrl)} 
                                alt={post.title} 
                                className="w-14 h-11 object-cover rounded-lg shrink-0 border border-slate-200 mt-0.5"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div className="min-w-0 space-y-1">
                              <h4 className="font-bold text-slate-900 truncate leading-snug" title={post.title}>
                                {post.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-mono truncate">
                                /blog/{post.slug}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {post.needsImageReview || post.thumbnailAuditStatus === 'using_fallback' ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Using safe educational fallback image">
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    <span>Safe Fallback (Review)</span>
                                  </span>
                                ) : post.thumbnailAuditStatus === 'upgraded' ? (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200" title="Optimized to high-definition 1600px resolution">
                                    <Sparkles className="w-3 h-3 text-sky-600" />
                                    <span>HD Ready (1600px)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title="Verified HTTPS thumbnail for social cards">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Social Card Ready</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {post.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-slate-700">
                          {post.author?.name || 'Editorial Team'}
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                          {(() => {
                            const dateInfo = formatPublicationDate(post.publishedAt);
                            if (post.status === 'draft') {
                              return <span className="italic text-slate-400">Unpublished draft</span>;
                            }
                            if (!dateInfo) {
                              return <span className="text-slate-400">Date pending</span>;
                            }
                            return (
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-800">{dateInfo.formattedDate}</span>
                                <span className="text-[10px] text-teal-700 font-medium">{dateInfo.relativeTime}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            post.status === 'published' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {post.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                          {post.views || 0}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => setPreviewingSocialPost(post)}
                              className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg cursor-pointer"
                              title="Preview WhatsApp & Twitter Social Card"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditPost(post)}
                              className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                              title="Edit Article"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {onViewLivePost && post.status === 'published' && (
                              <button
                                type="button"
                                onClick={() => onViewLivePost(post.slug)}
                                className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                                title="View Live Post"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id, post.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete Article"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. ARTICLE EDITOR VIEW */}
      {activeView === 'editor' && editingPost && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {editingPost.id.startsWith('post-') && !posts.some(p => p.id === editingPost.id) ? 'Create New Article' : 'Edit Article'}
              </h3>
              <p className="text-xs text-slate-500">
                Craft a comprehensive pedagogical guide or school update with rich formatting and automated SEO social cards.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setPreviewingSocialPost(editingPost)}
                className="px-3.5 py-2 rounded-xl border border-sky-300 text-xs font-semibold text-sky-800 hover:bg-sky-50 cursor-pointer inline-flex items-center space-x-1.5"
                title="Preview social sharing card"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Preview Social Card</span>
              </button>
              <button
                type="button"
                onClick={() => handleSavePost('draft')}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSavePost('published')}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Publishing...' : 'Publish Article Live'}
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Title */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Article Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editingPost.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setEditingPost(prev => prev ? ({
                    ...prev,
                    title: newTitle,
                    slug: prev.slug === generateSlug(prev.title) || !prev.slug 
                      ? generateSlug(newTitle) 
                      : prev.slug
                  }) : null);
                }}
                placeholder="e.g. Mastering the Rwanda CBC 8-Column Lesson Plan"
                className="w-full px-3.5 py-2.5 text-sm font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* SEO Slug */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                SEO URL Slug <span className="text-teal-700 font-mono text-[11px] font-normal">(/blog/{editingPost.slug || 'slug'})</span>
              </label>
              <input
                type="text"
                value={editingPost.slug}
                onChange={(e) => setEditingPost(prev => prev ? ({ ...prev, slug: generateSlug(e.target.value) }) : null)}
                placeholder="seo-friendly-article-slug"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Category / Icyiciro <span className="text-rose-500">*</span>
              </label>
              <select
                value={editingPost.category}
                onChange={(e) => setEditingPost(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-800"
              >
                {/* 1. Admin Active Categories from Firestore */}
                {activeCategoryNames.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                
                {/* 2. Safeguard: Preserve existing post category if it was legacy or disabled */}
                {editingPost.category && !activeCategoryNames.includes(editingPost.category) && (
                  <option key={editingPost.category} value={editingPost.category}>
                    {editingPost.category} (Current / Preserved)
                  </option>
                )}
              </select>
              <p className="text-[11px] text-slate-500">
                Categories are managed in Admin → Category Manager and sync in real time across all devices.
              </p>
            </div>

            {/* Featured Image Thumbnail URL (Spark Free Tier - URL Only) */}
            <div className="md:col-span-2 space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Featured Thumbnail Image / Ifoto y'Inkuru (Image URL)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Shyiramo Image URL y'ifoto (urugero: Blogger, Google Photos, Unsplash, n'izindi). Nta Firebase Storage cyangwa Cloudinary bikenerwa (bikorera kuri Firebase Spark y'ubuntu).
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleExtractFromContent}
                    className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    Extract from Content Image
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={handleApplyCategoryFallback}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:underline cursor-pointer"
                  >
                    Use Category Fallback
                  </button>
                </div>
              </div>

              {/* URL Input & Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={editingPost.thumbnailUrl}
                  onChange={(e) => handleThumbnailUrlChange(e.target.value)}
                  placeholder="https://... (Shyiramo HTTPS Image URL y'ifoto y'inkuru)"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 bg-white font-mono text-slate-800"
                />

                {/* Copy URL Button if URL exists */}
                {editingPost.thumbnailUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(editingPost.thumbnailUrl);
                      setCopiedThumbUrl(true);
                      setTimeout(() => setCopiedThumbUrl(false), 2000);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shrink-0"
                    title="Koporora URL y'ifoto"
                  >
                    {copiedThumbUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                )}

                {/* Clear URL Button */}
                {editingPost.thumbnailUrl && (
                  <button
                    type="button"
                    onClick={() => handleThumbnailUrlChange('')}
                    className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-semibold rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer shrink-0"
                    title="Siba URL"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Validation Status Notice */}
              <div className="text-[11px]">
                {thumbImageStatus === 'error' ? (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold">URL y'ifoto ntabwo ibashije gufunguka (Image Failed to Load): </span>
                      <span>Reba neza niba URL ari nzima kandi niba ifoto ifungurwa ku buryo bwa rusange (public HTTPS access). Ntukoreshe iyi URL kuko itazagaragara ku basomyi.</span>
                    </div>
                  </div>
                ) : thumbImageStatus === 'loading' ? (
                  <span className="text-sky-700 font-medium inline-flex items-center space-x-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600 shrink-0" />
                    <span>Turimo kugenzura niba ifoto ifunguka neza...</span>
                  </span>
                ) : thumbImageStatus === 'loaded' && isValidHttpsImageUrl(editingPost.thumbnailUrl) ? (
                  editingPost.thumbnailUrl.includes('googleusercontent.com') && editingPost.thumbnailUrl.includes('/s320/') ? (
                    <span className="text-sky-700 font-medium inline-flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Google Blogger image detected & verified. Automatically optimized for high resolution.</span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium inline-flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Ifoto yemejwe neza (Verified HTTPS Image). Izagaragara neza kuri homepage card, article page no kuri social sharing cards (WhatsApp, Facebook, X, Telegram).</span>
                    </span>
                  )
                ) : (
                  <span className="text-amber-700 font-medium inline-flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Nta URL y'ifoto irashyirwamo. Shyiramo HTTPS Image URL cyangwa ukande 'Extract from Content' / 'Use Category Fallback'.</span>
                  </span>
                )}
              </div>

              {/* Live Preview Card */}
              {editingPost.thumbnailUrl && (
                <div className="mt-2 flex flex-col sm:flex-row sm:items-start gap-4 pt-3 border-t border-slate-200">
                  <div className="relative group shrink-0 w-44 h-28 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shadow-xs">
                    <img 
                      src={normalizeAndUpgradeThumbnailUrl(editingPost.thumbnailUrl)} 
                      alt="Thumbnail preview"
                      className={`w-full h-full object-cover transition-opacity duration-200 ${
                        thumbImageStatus === 'loaded' ? 'opacity-100 block' : 'opacity-0 hidden'
                      }`}
                      onLoad={() => setThumbImageStatus('loaded')}
                      onError={() => setThumbImageStatus('error')}
                    />
                    {thumbImageStatus === 'loading' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-500 p-2 text-center">
                        <RefreshCw className="w-5 h-5 animate-spin text-teal-600 mb-1" />
                        <span className="text-[10px] font-medium">Kugenzura ifoto...</span>
                      </div>
                    )}
                    {thumbImageStatus === 'error' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-50 text-rose-700 p-2 text-center">
                        <AlertCircle className="w-6 h-6 text-rose-500 mb-1" />
                        <span className="text-[11px] font-bold">Ifoto ntiyabonetse</span>
                        <span className="text-[9px] text-rose-600">URL ntabwo ifunguka</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800 text-xs">Preview: Post Card & Social Media</span>
                      {thumbImageStatus === 'loaded' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px] inline-flex items-center space-x-1">
                          <Check className="w-3 h-3 text-emerald-700" />
                          <span>Verified & Ready</span>
                        </span>
                      ) : thumbImageStatus === 'loading' ? (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded font-semibold text-[10px] inline-flex items-center space-x-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-700" />
                          <span>Checking URL...</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[10px] inline-flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3 text-rose-700" />
                          <span>Invalid Image</span>
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 leading-relaxed text-[11px]">
                      Iyi foto niyo izakoreshwa nk'icyapa cy'inkuru kuri homepage, muri article yuzuye, no ku mbuga nkoranyambaga (WhatsApp, Facebook, Twitter/X, Telegram).
                    </p>
                    <div className="pt-1 flex items-center space-x-3 text-teal-700 font-medium">
                      {thumbImageStatus === 'loaded' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setPreviewingSocialPost(editingPost)}
                            className="hover:underline inline-flex items-center space-x-1 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Preview Social Card</span>
                          </button>
                          <span className="text-slate-300">•</span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => handleThumbnailUrlChange('')}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Clear URL
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Excerpt / Summary */}
            <div className="md:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  Article Excerpt / Meta Description (120–160 chars ideal)
                </label>
                <span className={`text-[10px] font-mono ${
                  editingPost.excerpt.length > 160 ? 'text-amber-600 font-bold' : 'text-slate-400'
                }`}>
                  {editingPost.excerpt.length} characters
                </span>
              </div>
              <textarea
                rows={2}
                value={editingPost.excerpt}
                onChange={(e) => setEditingPost(prev => prev ? ({ ...prev, excerpt: e.target.value }) : null)}
                placeholder="A compelling 1-2 sentence summary of the article for search results and social previews..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Author Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">Author Name</label>
              <input
                type="text"
                value={editingPost.author?.name || ''}
                onChange={(e) => setEditingPost(prev => prev ? ({
                  ...prev,
                  author: { ...prev.author, name: e.target.value }
                }) : null)}
                placeholder="e.g. Twizere Felix"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Author Role */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">Author Role / Title</label>
              <input
                type="text"
                value={editingPost.author?.role || ''}
                onChange={(e) => setEditingPost(prev => prev ? ({
                  ...prev,
                  author: { ...prev.author, role: e.target.value }
                }) : null)}
                placeholder="e.g. Head Teacher & CBC Lead"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Rich Text Editor for Content */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Article Body & Content (Word-Style Rich-Text Formatting)
            </label>
            <RichTextEditor
              value={editingPost.content}
              onChange={(html) => setEditingPost(prev => prev ? ({ ...prev, content: html }) : null)}
              placeholder="Write your article here..."
              minHeight="400px"
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveView('list')}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel & Discard Changes
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSavePost('draft')}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSavePost('published')}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                {isSaving ? 'Publishing...' : 'Publish Article Live'}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* 4. SOCIAL SHARE CARD PREVIEW MODAL */}
      {previewingSocialPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Share2 className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold">Social Share Card Preview</h3>
                  <p className="text-[11px] text-slate-300">
                    Live crawler preview for WhatsApp, Facebook, Telegram, and X
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingSocialPost(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              
              {/* WhatsApp / Telegram Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>WhatsApp & Telegram Message Preview</span>
                </span>
                <div className="max-w-md bg-emerald-950/5 border border-emerald-500/20 rounded-2xl p-3 shadow-xs">
                  <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img 
                      src={normalizeAndUpgradeThumbnailUrl(previewingSocialPost.thumbnailUrl) || getSafeFallbackThumbnail(previewingSocialPost.category)} 
                      alt={previewingSocialPost.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3.5 space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        isezerano.online
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {previewingSocialPost.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {previewingSocialPost.excerpt || previewingSocialPost.title}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Twitter / X Summary Large Image Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
                  <span>Twitter / X Large Image Card</span>
                </span>
                <div className="max-w-md bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-sm">
                  <img 
                    src={normalizeAndUpgradeThumbnailUrl(previewingSocialPost.thumbnailUrl) || getSafeFallbackThumbnail(previewingSocialPost.category)} 
                    alt={previewingSocialPost.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-3.5 space-y-1">
                    <span className="text-[10px] text-slate-400 font-mono">
                      isezerano.online
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 leading-snug line-clamp-2">
                      {previewingSocialPost.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {previewingSocialPost.excerpt || previewingSocialPost.title}
                    </p>
                  </div>
                </div>
              </div>

              {/* URL and Copy Link */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="truncate text-xs font-mono text-slate-600 w-full sm:w-auto">
                  {CANONICAL_BASE_URL}/blog/{previewingSocialPost.slug}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${CANONICAL_BASE_URL}/blog/${previewingSocialPost.slug}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 cursor-pointer flex items-center space-x-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied URL!' : 'Copy Share Link'}</span>
                </button>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewingSocialPost(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. GLOBAL AUDIT REPORT MODAL */}
      {auditReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-6 h-6 text-teal-400" />
                <div>
                  <h3 className="text-base font-bold">Global Thumbnail & SEO Audit Complete</h3>
                  <p className="text-xs text-teal-200">
                    Checked {auditReport.totalAudited} posts across the website and Firestore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditReport(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <div className="text-xl font-bold text-emerald-800">{auditReport.verifiedCount}</div>
                  <div className="text-[10px] uppercase font-bold text-emerald-600">Verified HTTPS</div>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-center">
                  <div className="text-xl font-bold text-sky-800">{auditReport.upgradedCount}</div>
                  <div className="text-[10px] uppercase font-bold text-sky-600">Upgraded to HD</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                  <div className="text-xl font-bold text-purple-800">{auditReport.extractedCount}</div>
                  <div className="text-[10px] uppercase font-bold text-purple-600">Extracted from Body</div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <div className="text-xl font-bold text-amber-800">{auditReport.needsReviewCount}</div>
                  <div className="text-[10px] uppercase font-bold text-amber-600">Review Recommended</div>
                </div>
              </div>

              {/* Per-Post Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Detailed Post Audit Results
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {auditReport.results.map((res) => (
                      <div key={res.repairedPost.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img 
                            src={res.finalUrl} 
                            alt="" 
                            className="w-10 h-8 object-cover rounded shrink-0 border border-slate-200"
                          />
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-800 truncate" title={res.repairedPost.title}>
                              {res.repairedPost.title}
                            </h5>
                            <p className="text-[11px] text-slate-500">{res.message}</p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            res.status === 'verified' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : res.status === 'upgraded'
                              ? 'bg-sky-100 text-sky-800'
                              : res.status === 'extracted_from_content'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {res.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setAuditReport(null)}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
