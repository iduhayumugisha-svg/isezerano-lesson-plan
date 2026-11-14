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
  MessageSquare,
  ShieldCheck,
  XCircle,
  Tag,
  FolderKanban
} from 'lucide-react';
import { BlogCategory, BlogPost, DEFAULT_AI_BLOG_CATEGORIES } from '../types/blog';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToBlogPosts,
  saveBlogPost,
  setBlogPostPublicationStatus,
  deleteBlogPost,
  uploadAndOptimizeBlogImage,
  calculateReadingTime,
  generateSlug,
  subscribeToBlogCategories,
  mergeCategoriesForDisplay,
  saveBlogCategory,
  deleteBlogCategory,
  updatePostCategory
} from '../services/blogService';
import {
  ArticleComment,
  CommentModerationStatus,
  subscribeToAllCommentsForAdmin,
  moderateArticleComment,
  deleteArticleComment
} from '../services/commentService';
import { RichTextEditor } from './RichTextEditor';
import { formatPublicationDate } from '../utils/dateUtils';
import {
  extractFirstImageFromContent,
  extractFirstImageMetaFromContent,
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
  thumbnailIsCustomOverride: boolean;
  status: 'published' | 'draft';
  publishedAt: string;
  views: number;
}

const createEmptyDraft = (
  adminName: string,
  adminEmail?: string,
  defaultCategory: string = DEFAULT_AI_BLOG_CATEGORIES[0].name
): EditorDraft => ({
  id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  title: '',
  slug: '',
  category: defaultCategory,
  authorName: adminName || (adminEmail ? adminEmail.split('@')[0] : 'GS GITUMBA Admin'),
  authorRole: 'Administrator',
  excerpt: '',
  content: '',
  thumbnailUrl: '',
  thumbnailAlt: '',
  thumbnailIsCustomOverride: false,
  status: 'draft',
  publishedAt: '',
  views: 0
});

export const AdminBlogManager: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [rawCategories, setRawCategories] = useState<BlogCategory[]>(DEFAULT_AI_BLOG_CATEGORIES);
  const [categoriesInitialized, setCategoriesInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard sub-tab & filters
  const [dashboardTab, setDashboardTab] = useState<'articles' | 'categories' | 'comments'>('articles');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Reader Comments Moderation State
  const [allComments, setAllComments] = useState<ArticleComment[]>([]);
  const [commentStatusFilter, setCommentStatusFilter] = useState<
    'all' | CommentModerationStatus
  >('all');
  const [commentSearchQuery, setCommentSearchQuery] = useState('');
  const [moderatingCommentId, setModeratingCommentId] = useState<string | null>(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<ArticleComment | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  // Category CRUD state
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<BlogCategory | null>(null);
  const [reassignCategoryTarget, setReassignCategoryTarget] = useState('Uncategorized');
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [updatingPostCategoryId, setUpdatingPostCategoryId] = useState<string | null>(null);

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
    const unsubPosts = subscribeToBlogPosts((fetchedPosts) => {
      setPosts(fetchedPosts);
      setIsLoading(false);
    }, true);

    const unsubCategories = subscribeToBlogCategories((fetchedCats, initialized) => {
      setRawCategories(fetchedCats);
      setCategoriesInitialized(initialized);
    });

    const unsubComments = isAdmin
      ? subscribeToAllCommentsForAdmin((fetchedComments) => {
          setAllComments(fetchedComments);
        })
      : () => {};

    return () => {
      unsubPosts();
      unsubCategories();
      unsubComments();
    };
  }, [isAdmin]);

  const categories = mergeCategoriesForDisplay(rawCategories, categoriesInitialized, posts);
  const categoryNames = categories.map((c) => c.name);

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
    const defaultCat = categoryNames[0] || DEFAULT_AI_BLOG_CATEGORIES[0].name;
    setDraft(createEmptyDraft(user?.displayName || 'GS GITUMBA Admin', user?.email, defaultCat));
    setIsEditingExisting(false);
    setStorageNotice(null);
    setStatusBanner(null);
    setMode('editor');
  };

  const handleEditArticle = (post: BlogPost) => {
    const resolvedThumb = getSingleArticleThumbnailUrl(post);
    const firstContentThumb = extractFirstImageFromContent(post.content);
    const isCustomOverride =
      typeof post.thumbnailIsCustomOverride === 'boolean'
        ? post.thumbnailIsCustomOverride
        : Boolean(resolvedThumb && firstContentThumb && resolvedThumb !== firstContentThumb);

    setDraft({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category || categoryNames[0] || DEFAULT_AI_BLOG_CATEGORIES[0].name,
      authorName: post.author?.name || user?.displayName || 'GS GITUMBA Admin',
      authorRole: post.author?.role || 'Administrator',
      excerpt: post.excerpt || '',
      content: post.content || '',
      thumbnailUrl: resolvedThumb,
      thumbnailAlt: post.thumbnailAlt || post.title,
      ...(post.thumbnailStorageMode ? { thumbnailStorageMode: post.thumbnailStorageMode } : {}),
      thumbnailIsCustomOverride: isCustomOverride,
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
        thumbnailIsCustomOverride: true,
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

  const handleEditorContentChange = (html: string) => {
    setDraft((prev) => {
      if (prev.thumbnailIsCustomOverride && isValidPersistentImageSrc(prev.thumbnailUrl)) {
        return { ...prev, content: html };
      }
      const firstMeta = extractFirstImageMetaFromContent(html);
      return {
        ...prev,
        content: html,
        thumbnailUrl: firstMeta?.src || '',
        thumbnailAlt:
          prev.thumbnailAlt ||
          firstMeta?.alt ||
          prev.title
      };
    });
  };

  const handleUseFirstArticleImage = () => {
    setDraft((prev) => {
      const firstMeta = extractFirstImageMetaFromContent(prev.content);
      return {
        ...prev,
        thumbnailIsCustomOverride: false,
        thumbnailUrl: firstMeta?.src || '',
        thumbnailStorageMode: undefined,
        thumbnailAlt: prev.thumbnailAlt || firstMeta?.alt || prev.title
      };
    });
    setStorageNotice(null);
  };

  const buildPostFromDraft = (targetStatus: 'published' | 'draft'): BlogPost => {
    const firstContentMeta = extractFirstImageMetaFromContent(draft.content);
    const resolvedThumbnailUrl =
      draft.thumbnailIsCustomOverride && isValidPersistentImageSrc(draft.thumbnailUrl)
        ? draft.thumbnailUrl
        : firstContentMeta?.src || (isValidPersistentImageSrc(draft.thumbnailUrl) ? draft.thumbnailUrl : '');

    const validStorageMode =
      draft.thumbnailStorageMode === 'firebase_storage' ||
      draft.thumbnailStorageMode === 'firestore_embedded'
        ? draft.thumbnailStorageMode
        : undefined;

    return {
      id: draft.id,
      title: draft.title.trim(),
      slug: draft.slug ? generateSlug(draft.slug) : generateSlug(draft.title),
      content: draft.content,
      excerpt: draft.excerpt.trim() || extractPlainTextExcerpt(draft.content, 160),
      thumbnailUrl: resolvedThumbnailUrl,
      thumbnailAlt:
        draft.thumbnailAlt.trim() || firstContentMeta?.alt || draft.title.trim(),
      ...(validStorageMode ? { thumbnailStorageMode: validStorageMode } : {}),
      thumbnailIsCustomOverride: draft.thumbnailIsCustomOverride,
      category: draft.category,
      author: {
        name: draft.authorName.trim() || 'GS GITUMBA Editorial',
        role: draft.authorRole.trim() || 'Administrator',
        ...(user?.email ? { email: user.email } : {})
      },
      publishedAt:
        targetStatus === 'published'
          ? draft.publishedAt || new Date().toISOString()
          : draft.publishedAt || '',
      updatedAt: new Date().toISOString(),
      status: targetStatus,
      views: draft.views,
      readTimeMinutes: calculateReadingTime(draft.content || '')
    };
  };

  const handleSaveArticle = async (targetStatus: 'published' | 'draft') => {
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

  // ================= CATEGORY MANAGEMENT HANDLERS =================
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setIsCategoryFormOpen(true);
    setStatusBanner(null);
  };

  const handleOpenEditCategory = (cat: BlogCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || '');
    setIsCategoryFormOpen(true);
    setStatusBanner(null);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCategory(true);
    setStatusBanner(null);
    try {
      const res = await saveBlogCategory(
        {
          id: editingCategory?.id,
          name: catName,
          description: catDescription,
          previousName: editingCategory?.name,
          isDefault: editingCategory?.isDefault
        },
        categories,
        posts
      );
      if (!res.success || !res.category) {
        showBanner('error', res.error || 'Could not save Blog category.');
        return;
      }

      const updatedMsg =
        res.updatedPostsCount && res.updatedPostsCount > 0
          ? ` Updated ${res.updatedPostsCount} article(s) to "${res.category.name}".`
          : '';
      showBanner(
        'success',
        `${editingCategory ? 'Updated' : 'Added'} category "${res.category.name}".${updatedMsg}`
      );
      if (editingCategory && categoryFilter === editingCategory.name) {
        setCategoryFilter(res.category.name);
      }
      setIsCategoryFormOpen(false);
      setEditingCategory(null);
      setCatName('');
      setCatDescription('');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handlePromptDeleteCategory = (cat: BlogCategory) => {
    const firstAlternative =
      categories.find((c) => c.id !== cat.id)?.name || 'Uncategorized';
    setReassignCategoryTarget(firstAlternative);
    setConfirmDeleteCategory(cat);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!confirmDeleteCategory) return;
    setIsDeletingCategory(true);
    try {
      const res = await deleteBlogCategory(
        confirmDeleteCategory,
        posts,
        reassignCategoryTarget
      );
      if (!res.success) {
        showBanner('error', res.error || 'Failed to delete category.');
        return;
      }
      if (categoryFilter === confirmDeleteCategory.name) {
        setCategoryFilter('All Categories');
      }
      const reassignedNote =
        res.reassignedCount && res.reassignedCount > 0
          ? ` Reassigned ${res.reassignedCount} article(s) to "${reassignCategoryTarget}".`
          : '';
      showBanner(
        'success',
        `Category "${confirmDeleteCategory.name}" deleted permanently.${reassignedNote}`
      );
      setConfirmDeleteCategory(null);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleInlinePostCategoryChange = async (post: BlogPost, newCategory: string) => {
    if (!newCategory || newCategory === post.category) return;
    setUpdatingPostCategoryId(post.id);
    try {
      const res = await updatePostCategory(post.id, newCategory);
      if (res.success) {
        showBanner('success', `Moved "${post.title}" to category "${newCategory}".`);
      } else {
        showBanner('error', res.error || 'Could not update article category.');
      }
    } finally {
      setUpdatingPostCategoryId(null);
    }
  };

  const handleModerateComment = async (
    comment: ArticleComment,
    nextStatus: CommentModerationStatus
  ) => {
    setModeratingCommentId(comment.id);
    try {
      const res = await moderateArticleComment(comment.id, nextStatus);
      if (res.success) {
        showBanner(
          'success',
          nextStatus === 'approved'
            ? `Comment by ${comment.name} approved and published.`
            : nextStatus === 'rejected'
            ? `Comment by ${comment.name} rejected and hidden.`
            : `Comment by ${comment.name} moved to pending.`
        );
      } else {
        showBanner('error', res.error || 'Could not update comment status.');
      }
    } finally {
      setModeratingCommentId(null);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!confirmDeleteComment) return;
    setIsDeletingComment(true);
    try {
      const res = await deleteArticleComment(confirmDeleteComment.id);
      if (res.success) {
        showBanner('success', `Deleted comment by ${confirmDeleteComment.name}.`);
        setConfirmDeleteComment(null);
      } else {
        showBanner('error', res.error || 'Could not delete comment.');
      }
    } finally {
      setIsDeletingComment(false);
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

  const postTitleMap = new Map(posts.map((p) => [p.id, p.title]));
  const pendingCommentsCount = allComments.filter((c) => c.status === 'pending').length;
  const approvedCommentsCount = allComments.filter((c) => c.status === 'approved').length;
  const rejectedCommentsCount = allComments.filter((c) => c.status === 'rejected').length;

  const filteredComments = allComments.filter((comment) => {
    const matchesStatus =
      commentStatusFilter === 'all' || comment.status === commentStatusFilter;
    const queryLower = commentSearchQuery.trim().toLowerCase();
    const articleTitle = (postTitleMap.get(comment.postId) || comment.postId).toLowerCase();
    const matchesQuery =
      !queryLower ||
      comment.name.toLowerCase().includes(queryLower) ||
      comment.content.toLowerCase().includes(queryLower) ||
      articleTitle.includes(queryLower);
    return matchesStatus && matchesQuery;
  });

  const publishedCount = posts.filter((p) => p.status === 'published').length;
  const draftCount = posts.filter((p) => p.status === 'draft').length;
  const totalViews = posts.reduce((acc, p) => acc + (p.views || 0), 0);

  const firstBodyImageSrc = extractFirstImageFromContent(draft.content);
  const effectiveThumbnailUrl =
    draft.thumbnailIsCustomOverride && isValidPersistentImageSrc(draft.thumbnailUrl)
      ? draft.thumbnailUrl
      : firstBodyImageSrc || (isValidPersistentImageSrc(draft.thumbnailUrl) ? draft.thumbnailUrl : '');
  const hasPhotoUploaded = isValidPersistentImageSrc(effectiveThumbnailUrl);

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
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Blog Articles &amp; Categories Dashboard
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage Blog articles, publish or unpublish content, and organize public Blog categories in Cloud Firestore.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {dashboardTab === 'categories' ? (
                  <button
                    type="button"
                    onClick={handleOpenAddCategory}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Category</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartNewArticle}
                    className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Write New Article</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sub-Tabs: Articles vs Categories vs Reader Comments */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDashboardTab('articles')}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  dashboardTab === 'articles'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Articles ({posts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab('categories')}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  dashboardTab === 'categories'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Categories ({categories.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDashboardTab('comments')}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  dashboardTab === 'comments'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments ({allComments.length})</span>
                {pendingCommentsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold tabular-nums">
                    {pendingCommentsCount} pending
                  </span>
                )}
              </button>
            </div>
          </div>

          {dashboardTab === 'comments' ? (
            /* ================= READER COMMENTS MODERATION ================= */
            <div className="space-y-4">
              {/* Comments KPI Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total Messages
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                    {allComments.length}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    Pending Review
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-amber-700 tabular-nums">
                    {pendingCommentsCount}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Approved Live
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-emerald-700 tabular-nums">
                    {approvedCommentsCount}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                    Rejected / Hidden
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-rose-700 tabular-nums">
                    {rejectedCommentsCount}
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={commentSearchQuery}
                    onChange={(e) => setCommentSearchQuery(e.target.value)}
                    placeholder="Search messages by reader name, text, or article title..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <select
                  aria-label="Filter comments by moderation status"
                  value={commentStatusFilter}
                  onChange={(e) =>
                    setCommentStatusFilter(e.target.value as 'all' | CommentModerationStatus)
                  }
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="all">All Messages ({allComments.length})</option>
                  <option value="pending">Pending ({pendingCommentsCount})</option>
                  <option value="approved">Approved ({approvedCommentsCount})</option>
                  <option value="rejected">Rejected ({rejectedCommentsCount})</option>
                </select>
              </div>

              {/* Comments Moderation List */}
              {filteredComments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">
                    {allComments.length === 0 ? 'No reader comments yet' : 'No matching comments'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {allComments.length === 0
                      ? 'Reader messages submitted on published articles will appear here for review.'
                      : 'Try clearing your search or status filter.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredComments.map((comment) => {
                    const articleTitle =
                      postTitleMap.get(comment.postId) || `Article (${comment.postId})`;
                    const dateInfo = formatPublicationDate(comment.createdAt);
                    const isBusy = moderatingCommentId === comment.id;

                    return (
                      <div
                        key={comment.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                  comment.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : comment.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <span className="capitalize">{comment.status}</span>
                              </span>
                              <span className="font-bold text-slate-900">{comment.name}</span>
                              {dateInfo && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <time
                                    dateTime={comment.createdAt}
                                    className="text-slate-500 text-[11px]"
                                  >
                                    {dateInfo.formattedDate} · {dateInfo.formattedTime}
                                  </time>
                                </>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Article:{' '}
                              <span className="font-semibold text-teal-800">{articleTitle}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {comment.status !== 'approved' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleModerateComment(comment, 'approved')}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}
                            {comment.status !== 'rejected' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleModerateComment(comment, 'rejected')}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteComment(comment)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 whitespace-pre-wrap break-words">
                          {comment.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : dashboardTab === 'categories' ? (
            /* ================= BLOG CATEGORIES MANAGER ================= */
            <div className="space-y-4">
              {isCategoryFormOpen && (
                <form
                  onSubmit={handleSaveCategory}
                  className="bg-white rounded-2xl border border-teal-200 p-5 sm:p-6 space-y-4 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Blog Category'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Categories appear immediately on the public Blog and in the article editor.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCategoryFormOpen(false)}
                      className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      aria-label="Close category form"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Category Name
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={60}
                        value={catName}
                        onChange={(e) => setCatName(e.target.value)}
                        placeholder="e.g., School News, STEM Education"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Category Description (optional)
                      </label>
                      <input
                        type="text"
                        maxLength={180}
                        value={catDescription}
                        onChange={(e) => setCatDescription(e.target.value)}
                        placeholder="Short description shown when visitors filter by this category"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  {editingCategory && catName.trim() !== editingCategory.name && (
                    <div className="text-[11px] font-medium text-teal-800 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                      {posts.filter((p) => p.category.toLowerCase() === editingCategory.name.toLowerCase()).length}{' '}
                      existing article(s) tagged with "{editingCategory.name}" will automatically update to the new category name.
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCategoryFormOpen(false)}
                      disabled={isSavingCategory}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingCategory}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingCategory ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    All Blog Categories ({categories.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Includes all default categories &amp; custom categories
                  </span>
                </div>

                {categories.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Tag className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500">No categories yet. Click "Add Category" to create one.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {categories.map((cat) => {
                      const articleCount = posts.filter(
                        (p) => (p.category || '').trim().toLowerCase() === cat.name.toLowerCase()
                      ).length;

                      return (
                        <div
                          key={cat.id}
                          className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">{cat.name}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                  cat.isDefault
                                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {cat.isDefault ? 'Default Category' : 'Custom Category'}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                                {articleCount} {articleCount === 1 ? 'article' : 'articles'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              {cat.description || 'No description set.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-white cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePromptDeleteCategory(cat)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
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
                    <option value="All Categories">All Categories</option>
                    {categoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    {posts.some((p) => p.category === 'Uncategorized') && (
                      <option value="Uncategorized">Uncategorized</option>
                    )}
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
                    const rowCategories = categoryNames.includes(post.category)
                      ? categoryNames
                      : [post.category, ...categoryNames].filter(Boolean);

                    return (
                      <article
                        key={post.id}
                        className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start space-x-4 min-w-0 flex-1">
                          {/* Article Thumbnail */}
                          <div className="w-28 aspect-[16/10] sm:w-36 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                            {thumbSrc ? (
                              <img
                                src={thumbSrc}
                                alt={post.thumbnailAlt || post.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200/70 flex flex-col items-center justify-center text-slate-400">
                                <FileText className="w-5 h-5 opacity-60" />
                              </div>
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
                              <select
                                aria-label={`Change category for ${post.title}`}
                                value={post.category || 'Uncategorized'}
                                disabled={updatingPostCategoryId === post.id}
                                onChange={(e) => handleInlinePostCategoryChange(post, e.target.value)}
                                className="text-[11px] font-semibold text-teal-800 bg-teal-50/70 border border-teal-200/80 rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                              >
                                {rowCategories.map((catNameOption) => (
                                  <option key={catNameOption} value={catNameOption}>
                                    {catNameOption}
                                  </option>
                                ))}
                                {!rowCategories.includes('Uncategorized') && (
                                  <option value="Uncategorized">Uncategorized</option>
                                )}
                              </select>
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
                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
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
          )}
        </>
      ) : (
        /* ================= ARTICLE EDITOR (AUTOMATIC FIRST-IMAGE THUMBNAIL + RESIZABLE BODY IMAGES) ================= */
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
                  Insert and resize photos inside the article — the first image automatically becomes the article thumbnail.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePreviewDraft}
                disabled={!draft.title.trim() && !extractPlainTextExcerpt(draft.content, 50) && !hasPhotoUploaded}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveArticle('draft')}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveArticle('published')}
                disabled={isSaving}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Publishing...' : 'Publish Article'}</span>
              </button>
            </div>
          </div>

          {/* ARTICLE TITLE, METADATA & FORMATTED CONTENT */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
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
                  {(categoryNames.includes(draft.category)
                    ? categoryNames
                    : [draft.category, ...categoryNames].filter(Boolean)
                  ).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  {!categoryNames.includes('Uncategorized') && draft.category !== 'Uncategorized' && (
                    <option value="Uncategorized">Uncategorized</option>
                  )}
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-800">
                  Article Content &amp; Images
                </label>
                <span className="text-[11px] text-slate-500">
                  Use the image button in the toolbar to upload photos, resize (Small, Medium, Large, Custom, or drag corner), and align Left / Center / Right.
                </span>
              </div>
              <RichTextEditor
                key={draft.id}
                value={draft.content}
                onChange={handleEditorContentChange}
                hideImageUrlInput={true}
                minHeight="420px"
              />
            </div>
          </section>

          {/* AUTOMATIC ARTICLE THUMBNAIL PREVIEW (DERIVED FROM FIRST IMAGE; NO DUPLICATE UPLOAD REQUIRED) */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Article Thumbnail Preview
                </h3>
                <p className="text-xs text-slate-500">
                  {draft.thumbnailIsCustomOverride && hasPhotoUploaded
                    ? 'Using custom cover image uploaded for cards & previews.'
                    : firstBodyImageSrc
                    ? 'Automatically set from the first image inserted into your article (no need to upload twice).'
                    : 'No image inserted yet — a clean default placeholder will display on article cards until you insert a photo.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {draft.thumbnailIsCustomOverride && (
                  <button
                    type="button"
                    onClick={handleUseFirstArticleImage}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-xs font-semibold text-teal-800 hover:bg-teal-100 cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{firstBodyImageSrc ? 'Use First Article Image' : 'Reset to Placeholder'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => thumbInputRef.current?.click()}
                  disabled={isUploadingThumb}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{draft.thumbnailIsCustomOverride ? 'Change Custom Cover' : 'Optional Custom Cover'}</span>
                </button>
              </div>
            </div>

            <input
              ref={thumbInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleThumbnailFileSelected}
              className="hidden"
            />

            {isUploadingThumb ? (
              <div className="p-6 rounded-xl border border-dashed border-teal-300 bg-teal-50/40 text-center space-y-2.5">
                <Loader2 className="w-5 h-5 text-teal-700 animate-spin mx-auto" />
                <div className="text-xs font-semibold text-slate-800">{uploadStage}</div>
                <div className="max-w-xs mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 transition-all duration-200"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">
                <div className="aspect-[16/10] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                  {hasPhotoUploaded ? (
                    <img
                      src={effectiveThumbnailUrl}
                      alt={draft.thumbnailAlt || draft.title || 'Article thumbnail preview'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200/70 flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-1">
                      <FileText className="w-6 h-6 opacity-60" />
                      <span className="text-[11px] font-medium text-slate-500">Default Placeholder</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {storageNotice && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      {storageNotice}
                    </p>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Thumbnail Description / Alt Text (optional)
                    </label>
                    <input
                      type="text"
                      value={draft.thumbnailAlt}
                      onChange={(e) => setDraft((prev) => ({ ...prev, thumbnailAlt: e.target.value }))}
                      placeholder="Describe the thumbnail image for accessibility"
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* PREVIEW MODAL BEFORE PUBLISHING */}
      {previewPost && (() => {
        const previewThumb = getSingleArticleThumbnailUrl(previewPost);
        const firstBodyImg = extractFirstImageFromContent(previewPost.content);
        const showSeparateBanner = Boolean(previewThumb && (!firstBodyImg || previewThumb !== firstBodyImg));

        return (
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
              {showSeparateBanner && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={previewThumb}
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
        );
      })()}

      {/* DELETE CATEGORY CONFIRMATION MODAL */}
      {confirmDeleteCategory && (() => {
        const affectedCount = posts.filter(
          (p) => (p.category || '').trim().toLowerCase() === confirmDeleteCategory.name.toLowerCase()
        ).length;
        const alternativeCategories = categories.filter((c) => c.id !== confirmDeleteCategory.id);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Delete Category?</h3>
                  <p className="text-xs text-slate-600">
                    Are you sure you want to permanently delete the category{' '}
                    <strong className="text-slate-900">"{confirmDeleteCategory.name}"</strong>?
                  </p>
                  {affectedCount > 0 && (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
                      {affectedCount} article{affectedCount === 1 ? '' : 's'} currently use this category. Select where to move {affectedCount === 1 ? 'it' : 'them'}:
                    </p>
                  )}
                </div>
              </div>

              {affectedCount > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Reassign Affected Articles To
                  </label>
                  <select
                    value={reassignCategoryTarget}
                    onChange={(e) => setReassignCategoryTarget(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 cursor-pointer"
                  >
                    {alternativeCategories.map((alt) => (
                      <option key={alt.id} value={alt.name}>
                        {alt.name}
                      </option>
                    ))}
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCategory(null)}
                  disabled={isDeletingCategory}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCategory}
                  disabled={isDeletingCategory}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                >
                  {isDeletingCategory ? 'Deleting...' : 'Delete Category Permanently'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DELETE ARTICLE CONFIRMATION MODAL */}
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

      {/* DELETE COMMENT CONFIRMATION MODAL */}
      {confirmDeleteComment && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Comment?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to permanently delete the message from{' '}
                  <strong className="text-slate-900">{confirmDeleteComment.name}</strong>?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteComment(null)}
                disabled={isDeletingComment}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteComment}
                disabled={isDeletingComment}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
              >
                {isDeletingComment ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
