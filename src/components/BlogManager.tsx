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
  Clock
} from 'lucide-react';
import { BlogPost, BLOG_CATEGORIES } from '../types/blog';
import { 
  getBlogPosts, 
  saveBlogPost, 
  deleteBlogPost, 
  generateSlug, 
  calculateReadingTime 
} from '../services/blogService';
import { RichTextEditor } from './RichTextEditor';
import { useAuth } from '../context/AuthContext';
import { formatPublicationDate } from '../utils/dateUtils';

interface BlogManagerProps {
  onViewLivePost?: (slug: string) => void;
}

export const BlogManager: React.FC<BlogManagerProps> = ({ onViewLivePost }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All Categories');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPosts();

    const handleSync = () => {
      loadPosts();
    };
    window.addEventListener('blog_posts_updated', handleSync);
    return () => {
      window.removeEventListener('blog_posts_updated', handleSync);
    };
  }, []);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const all = await getBlogPosts(true); // include drafts for admin
      setPosts(all);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNew = () => {
    const newPost: BlogPost = {
      id: `post-${Date.now()}`,
      title: '',
      slug: '',
      content: '<p>Start writing your pedagogical article or school announcement here...</p>',
      excerpt: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
      category: 'CBC Curriculum',
      author: {
        name: user?.email ? user.email.split('@')[0] : 'GS GITUMBA Editorial Team',
        role: 'Pedagogical Lead & Teacher'
      },
      publishedAt: '', // Drafts do not have a fake publication date
      status: 'draft',
      views: 0
    };
    setEditingPost(newPost);
    setActiveView('editor');
  };

  const handleEditPost = (post: BlogPost) => {
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
      if (res.success) {
        setPosts(prev => prev.filter(p => p.id !== id));
        await loadPosts();
      } else {
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
            ? '🎉 Article published live to the website!' 
            : '✅ Draft saved successfully!'
        });
        await loadPosts();
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
              <button
                type="button"
                onClick={handleStartNew}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Write New Article</span>
              </button>
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
                {BLOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
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
              <button
                type="button"
                onClick={handleStartNew}
                className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-600 cursor-pointer"
              >
                Create First Post
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Article</th>
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
                          <div className="flex items-center space-x-3">
                            {post.thumbnailUrl && (
                              <img 
                                src={post.thumbnailUrl} 
                                alt={post.title} 
                                className="w-12 h-10 object-cover rounded-lg shrink-0 border border-slate-200"
                              />
                            )}
                            <div className="min-w-0">
                              <h5 className="font-bold text-slate-900 truncate">{post.title}</h5>
                              <p className="text-[11px] text-teal-700 font-mono truncate">/blog/{post.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
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
                Craft a comprehensive pedagogical guide or school update with rich formatting and SEO social cards.
              </p>
            </div>

            <div className="flex items-center space-x-2">
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
              <label className="block text-xs font-bold text-slate-800">Category</label>
              <select
                value={editingPost.category}
                onChange={(e) => setEditingPost(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {BLOG_CATEGORIES.filter(c => c !== 'All Categories').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Featured Image Thumbnail URL */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Featured Thumbnail Image URL (HTTPS for WhatsApp & Social Cards)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={editingPost.thumbnailUrl}
                  onChange={(e) => setEditingPost(prev => prev ? ({ ...prev, thumbnailUrl: e.target.value }) : null)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {editingPost.thumbnailUrl && (
                <div className="mt-2 flex items-center space-x-3">
                  <img 
                    src={editingPost.thumbnailUrl} 
                    alt="Thumbnail preview"
                    className="w-20 h-14 object-cover rounded-lg border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-[11px] text-slate-500">
                    This thumbnail will appear on WhatsApp, Facebook, Telegram, and X cards when shared.
                  </span>
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

    </div>
  );
};
