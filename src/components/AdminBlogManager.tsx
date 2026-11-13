import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  Save,
  Send,
  Archive,
  X,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  BookOpen
} from 'lucide-react';
import { BlogPost, BLOG_CATEGORIES, BLOG_WRITE_CATEGORIES } from '../types/blog';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToBlogPosts,
  saveBlogPost,
  setBlogPostPublicationStatus,
  deleteBlogPost,
  uploadAndOptimizeBlogImage,
  calculateReadingTime,
  generateSlug
} from '../services/blogService';
import { RichTextEditor } from './RichTextEditor';
import { formatPublicationDate } from '../utils/dateUtils';
import {
  extractPlainTextExcerpt,
  getSingleArticleThumbnailUrl,
  isValidPersistentImageSrc
} from '../utils/thumbnailUtils';

interface EditorDraft {
  id: string;
  title: string;
  slug: string;
  category: string;
  authorName: string;
  authorRole: string;
  excerpt: string;
  content: string;
  thumbnailUrl: string;
  thumbnailAlt: string;
  thumbnailStorageMode?: 'firebase_storage' | 'firestore_embedded';
  status: 'published' | 'draft';
  publishedAt: string;
  views: number;
}

const createEmptyDraft = (adminName: string, adminEmail?: string): EditorDraft => ({
  id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  slug: '',
  category: BLOG_WRITE_CATEGORIES[0],
  authorName: adminName || (adminEmail ? adminEmail.split('@')[0] : 'GS GITUMBA Admin'),
  authorRole: 'Administrator',
  excerpt: '',
  content: '',
  thumbnailUrl: '',
  thumbnailAlt: '',
  status: 'draft',
  publishedAt: '',
  views: 0
});

export const AdminBlogManager: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Editor state
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [draft, setDraft] = useState<EditorDraft>(() =>
    createEmptyDraft(user?.displayName || 'GS GITUMBA Admin', user?.email)
  );
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  // Photo upload state
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(null);

  // Save / action feedback
  const [isSaving, setIsSaving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Preview & Delete confirmation modals
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToBlogPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setIsLoading(false);
    }, true);

    return () => unsub();
  }, []);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Administrator Access Required</h3>
        <p className="text-xs text-slate-600">
          Only verified administrator twizerefelix90@gmail.com can manage Blog articles.
        </p>
      </div>
    );
  }

  const showBanner = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    if (type === 'success') {
      setTimeout(() => setStatusBanner(null), 5000);
    }
  };

  const handleStartNewArticle = () => {
    setDraft(createEmptyDraft(user?.displayName || 'GS GITUMBA Admin', user?.email));
    setIsEditingExisting(false);
    setStorageNotice(null);
    setStatusBanner(null);
    setMode('editor');
  };

  const handleEditArticle = (post: BlogPost) => {
    setDraft({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category || BLOG_WRITE_CATEGORIES[0],
      authorName: post.author?.name || user?.displayName || 'GS GITUMBA Admin',
      authorRole: post.author?.role || 'Administrator',
      excerpt: post.excerpt || '',
      content: post.content || '',
      thumbnailUrl: getSingleArticleThumbnailUrl(post),
      thumbnailAlt: post.thumbnailAlt || post.title,
      thumbnailStorageMode: post.thumbnailStorageMode,
      status: post.status,
      publishedAt: post.publishedAt || '',
      views: typeof post.views === 'number' ? post.views : 0
    });
    setIsEditingExisting(true);
    setStorageNotice(null);
    setStatusBanner(null);
    setMode('editor');
  };

  const handleThumbnailFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingThumb(true);
    setUploadPercent(10);
    setUploadStage('Reading image from device...');
    setStatusBanner(null);
    setStorageNotice(null);

    try {
      const result = await uploadAndOptimizeBlogImage(file, 'thumbnail', (pct, stage) => {
        setUploadPercent(pct);
        if (stage) setUploadStage(stage);
      });

      if (!result.success || !result.url) {
        showBanner('error', result.error || 'Failed to load image from device.');
        return;
      }

      setDraft((prev) => ({
        ...prev,
        thumbnailUrl: result.url!,
        thumbnailStorageMode: result.storageMode,
        thumbnailAlt: prev.thumbnailAlt || prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));

      if (result.fallbackNotice) {
        setStorageNotice(result.fallbackNotice);
      } else {
        setStorageNotice(null);
      }
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Unexpected error uploading image.');
    } finally {
      setIsUploadingThumb(false);
      setUploadPercent(0);
      setUploadStage('');
    }
  };

  const buildPostFromDraft = (targetStatus: 'published' | 'draft'): BlogPost => ({
    id: draft.id,
    title: draft.title.trim(),
    slug: draft.slug ? generateSlug(draft.slug) : generateSlug(draft.title),
    content: draft.content,
    excerpt: draft.excerpt.trim() || extractPlainTextExcerpt(draft.content, 160),
    thumbnailUrl: draft.thumbnailUrl,
    thumbnailAlt: draft.thumbnailAlt.trim() || draft.title.trim(),
    thumbnailStorageMode: draft.thumbnailStorageMode,
    category: draft.category,
    author: {
      name: draft.authorName.trim() || 'GS GITUMBA Editorial',
      role: draft.authorRole.trim() || 'Administrator',
      email: user?.email || undefined
    },
    publishedAt:
      targetStatus === 'published'
        ? draft.publishedAt || new Date().toISOString()
        : draft.publishedAt || '',
    updatedAt: new Date().toISOString(),
    status: targetStatus,
    views: draft.views,
    readTimeMinutes: calculateReadingTime(draft.content || '')
  });

  const handleSaveArticle = async (targetStatus: 'published' | 'draft') => {
    if (!isValidPersistentImageSrc(draft.thumbnailUrl)) {
      showBanner('error', 'Step 1 required: Select and upload a photo from your device first.');
      return;
    }
    if (!draft.title.trim()) {
      showBanner('error', 'Please enter an article title.');
      return;
    }
    const plainBody = extractPlainTextExcerpt(draft.content, 400);
    if (!plainBody) {
      showBanner('error', 'Please write the article content before saving.');
      return;
    }

    setIsSaving(true);
    setStatusBanner(null);

    try {
      const payload = buildPostFromDraft(targetStatus);
      const res = await saveBlogPost(payload, user?.uid);
      if (!res.success || !res.post) {
        showBanner('error', res.error || 'Could not save article.');
        return;
      }

      showBanner(
        'success',
        targetStatus === 'published'
          ? 'Article published to the public Blog.'
          : 'Article saved as draft.'
      );
      setMode('list');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewDraft = () => {
    const previewCandidate = buildPostFromDraft(draft.status);
    setPreviewPost({
      ...previewCandidate,
      title: previewCandidate.title || 'Untitled Article Preview',
      publishedAt: previewCandidate.publishedAt || new Date().toISOString()
    });
  };

  const handleTogglePublication = async (post: BlogPost) => {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    const res = await setBlogPostPublicationStatus(post, nextStatus);
    if (res.success) {
      showBanner(
        'success',
        nextStatus === 'published'
          ? `"${post.title}" is now published on the public Blog.`
          : `"${post.title}" was unpublished and moved to Drafts.`
      );
    } else {
      showBanner('error', res.error || 'Failed to update publication status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeletePost) return;
    setIsDeleting(true);
    try {
      const res = await deleteBlogPost(confirmDeletePost.id, user?.uid);
      if (res.success) {
        showBanner('success', `"${confirmDeletePost.title}" has been permanently deleted.`);
        setConfirmDeletePost(null);
      } else {
        showBanner('error', res.error || 'Failed to delete article.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list for Dashboard
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !searchQuery.trim() ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.author?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      categoryFilter === 'All Categories' || post.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);

  const hasPhotoUploaded = isValidPersistentImageSrc(draft.thumbnailUrl);

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {statusBanner && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-start space-x-2.5 border ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {statusBanner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{statusBanner.message}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {mode === 'list' ? (
        <>
          {/* Dashboard Header & Primary CTA */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Blog Articles Dashboard
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Create, edit, preview, publish, unpublish, and manage articles stored in Cloud Firestore.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartNewArticle}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Write New Article</span>
            </button>
          </div>

          {/* 4-Card KPI Strip (Tabular Numerals) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Articles
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {posts.length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                Published Live
              </div>
              <div className="mt-1.5 text-2xl font-bold text-emerald-700 tabular-nums">
                {publishedCount}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                Drafts
              </div>
              <div className="mt-1.5 text-2xl font-bold text-amber-700 tabular-nums">
                {draftCount}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Total Reads
              </div>
              <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {totalViews}
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles by title, content summary, or author..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                {BLOG_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by publication status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published Only</option>
                <option value="draft">Drafts Only</option>
              </select>
            </div>
          </div>

          {/* Articles List */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading Blog articles from Firestore...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {posts.length === 0 ? 'No articles created yet' : 'No matching articles'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {posts.length === 0
                  ? 'Start by uploading a photo from your device and writing your first article.'
                  : 'Try adjusting your search keywords or category/status filters.'}
              </p>
              {posts.length === 0 && (
                <button
                  type="button"
                  onClick={handleStartNewArticle}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Article</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPosts.map((post) => {
                const thumbSrc = getSingleArticleThumbnailUrl(post);
                const dateInfo = formatPublicationDate(post.publishedAt || post.updatedAt);

                return (
                  <article
                    key={post.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start space-x-4 min-w-0 flex-1">
                      {/* Article Thumbnail */}
                      <div className="w-24 h-18 sm:w-32 sm:h-22 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={post.thumbnailAlt || post.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      {/* Article Metadata */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
                          <span
                            className={`inline-flex items-center space-x-1 font-bold ${
                              post.status === 'published' ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {post.status === 'published' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            <span>{post.status === 'published' ? 'Published' : 'Draft'}</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="font-semibold text-teal-800">{post.category}</span>
                          {dateInfo && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-slate-500">{dateInfo.formattedDate}</span>
                            </>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-500 tabular-nums">
                            {post.views || 0} views
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                          {post.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {post.excerpt || extractPlainTextExcerpt(post.content, 140)}
                        </p>
                      </div>
                    </div>

                    {/* Article Row Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => setPreviewPost(post)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        title="Preview Article"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditArticle(post)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer"
                        title="Edit Article"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTogglePublication(post)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                          post.status === 'published'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {post.status === 'published' ? (
                          <>
                            <Archive className="w-3.5 h-3.5" />
                            <span>Unpublish</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeletePost(post)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                        title="Delete Article"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ================= ARTICLE EDITOR (STEP 1 PHOTO -> PREVIEW -> STEP 2 TITLE & CONTENT) ================= */
        <div className="space-y-6">
          {/* Top Editor Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                title="Back to Blog Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {isEditingExisting ? 'Edit Article' : 'Write New Article'}
                </h2>
                <p className="text-xs text-slate-500">
                  Step 1: Choose photo from your device · Step 2: Enter title & formatted content
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewDraft}
                disabled={!hasPhotoUploaded && !draft.title.trim()}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveArticle('draft')}
                disabled={isSaving || !hasPhotoUploaded}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveArticle('published')}
                disabled={isSaving || !hasPhotoUploaded}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Publishing...' : 'Publish Article'}</span>
              </button>
            </div>
          </div>

          {/* STEP 1: DEVICE PHOTO UPLOAD & PREVIEW (NO IMAGE URL FIELD) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Step 1 of 2
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Select Featured Photo from Your Device
                </h3>
                <p className="text-xs text-slate-500">
                  Choose a photo directly from your phone or computer. An instant preview appears below before saving.
                </p>
              </div>

              {hasPhotoUploaded && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    disabled={isUploadingThumb}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Change Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        thumbnailUrl: '',
                        thumbnailStorageMode: undefined
                      }))
                    }
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={thumbInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleThumbnailFileSelected}
              className="hidden"
            />

            {isUploadingThumb ? (
              <div className="p-8 rounded-xl border border-dashed border-teal-300 bg-teal-50/40 text-center space-y-3">
                <Loader2 className="w-6 h-6 text-teal-700 animate-spin mx-auto" />
                <div className="text-xs font-semibold text-slate-800">{uploadStage}</div>
                <div className="max-w-xs mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 transition-all duration-200"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              </div>
            ) : hasPhotoUploaded ? (
              <div className="space-y-3">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-80 flex items-center justify-center">
                  <img
                    src={draft.thumbnailUrl}
                    alt={draft.thumbnailAlt || draft.title || 'Selected featured photo preview'}
                    className="w-full max-h-80 object-cover"
                  />
                </div>

                {storageNotice && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    {storageNotice}
                  </p>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Image Description / Alt Text (optional)
                  </label>
                  <input
                    type="text"
                    value={draft.thumbnailAlt}
                    onChange={(e) => setDraft((prev) => ({ ...prev, thumbnailAlt: e.target.value }))}
                    placeholder="Describe the photo for accessibility"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="w-full p-8 sm:p-10 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-600 hover:bg-teal-50/20 transition-colors text-center space-y-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900">
                    Click to select a photo from your phone or computer
                  </div>
                  <p className="text-xs text-slate-500">
                    Supports JPG, PNG, WebP, or GIF. No external image URLs needed.
                  </p>
                </div>
              </button>
            )}
          </section>

          {/* STEP 2: ARTICLE TITLE, DETAILS & FORMATTED CONTENT */}
          <section
            className={`bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 transition-opacity ${
              !hasPhotoUploaded ? 'opacity-60' : 'opacity-100'
            }`}
          >
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                  Step 2 of 2
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Article Title & Content
                </h3>
              </div>
              {!hasPhotoUploaded && (
                <span className="text-xs font-medium text-amber-700">
                  Select a featured photo in Step 1 above first.
                </span>
              )}
            </div>

            {!hasPhotoUploaded ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Upload a photo from your device in Step 1 to enter your article title and begin writing.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Article Title
                  </label>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        title: e.target.value,
                        slug: isEditingExisting ? prev.slug : generateSlug(e.target.value)
                      }))
                    }
                    placeholder="Enter your article headline..."
                    className="w-full px-4 py-2.5 text-sm sm:text-base font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Category
                    </label>
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                    >
                      {BLOG_WRITE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Author Name
                    </label>
                    <input
                      type="text"
                      value={draft.authorName}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, authorName: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Author Role
                    </label>
                    <input
                      type="text"
                      value={draft.authorRole}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, authorRole: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Short Summary / Excerpt (optional — auto-generated from content if left blank)
                  </label>
                  <textarea
                    rows={2}
                    value={draft.excerpt}
                    onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
                    placeholder="Brief 1–2 sentence overview displayed in the article list..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Article Content
                  </label>
                  <RichTextEditor
                    value={draft.content}
                    onChange={(html) => setDraft((prev) => ({ ...prev, content: html }))}
                    hideImageUrlInput={true}
                    minHeight="400px"
                  />
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* PREVIEW MODAL BEFORE PUBLISHING */}
      {previewPost && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-semibold">
                <Eye className="w-4 h-4 text-teal-400" />
                <span>Article Preview ({previewPost.status === 'published' ? 'Published' : 'Draft'})</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="text-slate-300 hover:text-white p-1 cursor-pointer"
                aria-label="Close Preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {getSingleArticleThumbnailUrl(previewPost) && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={getSingleArticleThumbnailUrl(previewPost)}
                    alt={previewPost.thumbnailAlt || previewPost.title}
                    className="w-full max-h-[420px] object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              <header className="space-y-3 border-b border-slate-200 pb-5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                  <span className="font-bold text-teal-800">{previewPost.category}</span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{previewPost.author.name}</span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {formatPublicationDate(previewPost.publishedAt)?.formattedDateFull ||
                        'Preview Date'}
                    </span>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center space-x-1">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{previewPost.readTimeMinutes || 1} min read</span>
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  {previewPost.title}
                </h1>
              </header>

              <div
                className="blog-article-body text-slate-800 leading-relaxed space-y-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2.5 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_blockquote]:border-l-2 [&_blockquote]:border-teal-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-600"
                dangerouslySetInnerHTML={{ __html: previewPost.content }}
              />
            </div>

            <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setPreviewPost(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDeletePost && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Article?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-slate-900">"{confirmDeletePost.title}"</strong>? This action removes the article and its thumbnail from Cloud Firestore.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeletePost(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
