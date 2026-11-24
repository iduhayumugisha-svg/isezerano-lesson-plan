import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Reply,
  Pencil,
  Trash2,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  X,
  Lock
} from 'lucide-react';
import {
  ArticleComment,
  COMMENT_CONTENT_MAX_LENGTH,
  COMMENT_EMAIL_MAX_LENGTH,
  COMMENT_NAME_MAX_LENGTH,
  buildCommentThreads,
  canVisitorDeleteComment,
  canVisitorEditComment,
  deleteArticleComment,
  deleteArticleCommentByOwner,
  editArticleComment,
  submitArticleComment,
  subscribeToPublishedCommentsForPost
} from '../services/commentService';
import { formatPublicationDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

interface ArticleCommentsSectionProps {
  postId: string;
  postTitle: string;
  autoFocusForm?: boolean;
}

interface ReplyTarget {
  targetCommentId: string;
  rootParentId: string;
  replyToName: string;
}

export const ArticleCommentsSection: React.FC<ArticleCommentsSectionProps> = ({
  postId,
  postTitle,
  autoFocusForm = false
}) => {
  const { isAdmin } = useAuth();

  const [liveComments, setLiveComments] = useState<ArticleComment[]>([]);
  const [optimisticAdded, setOptimisticAdded] = useState<ArticleComment[]>([]);
  const [optimisticEdits, setOptimisticEdits] = useState<
    Record<string, { content: string; updatedAt: string }>
  >({});
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Top-level new comment form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Inline Reply form state
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [replyHoneypot, setReplyHoneypot] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyErrorMsg, setReplyErrorMsg] = useState<string | null>(null);

  // Inline Edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // Inline Delete Confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Expand / Collapse replies map (parentId -> boolean; omitted defaults to expanded = true)
  const [collapsedThreads, setCollapsedThreads] = useState<Record<string, boolean>>({});

  // Action feedback toast inside discussion
  const [threadNotice, setThreadNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const replyLockRef = useRef(false);

  useEffect(() => {
    setIsLoading(true);
    setLiveComments([]);
    setOptimisticAdded([]);
    setOptimisticEdits({});
    setOptimisticDeletedIds([]);
    setErrorMsg(null);
    setSuccessMsg(null);
    setReplyTarget(null);
    setEditingCommentId(null);
    setConfirmDeleteId(null);
    setThreadNotice(null);

    const unsubscribe = subscribeToPublishedCommentsForPost(
      postId,
      (items) => {
        setLiveComments(items);
        setIsLoading(false);

        const liveById = new Map(items.map((item) => [item.id, item]));
        setOptimisticAdded((prev) => prev.filter((opt) => !liveById.has(opt.id)));
        setOptimisticDeletedIds((prev) => prev.filter((delId) => liveById.has(delId)));
        setOptimisticEdits((prev) => {
          const next: Record<string, { content: string; updatedAt: string }> = {};
          for (const [id, edit] of Object.entries(prev)) {
            const liveItem = liveById.get(id);
            if (liveItem && liveItem.updatedAt !== edit.updatedAt) {
              next[id] = edit;
            }
          }
          return next;
        });
      },
      () => {
        setIsLoading(false);
        setThreadNotice((prev) =>
          prev || {
            type: 'error',
            message: 'Unable to load existing comments right now. You can still submit a new comment below.'
          }
        );
      }
    );

    return () => unsubscribe();
  }, [postId]);

  useEffect(() => {
    if (autoFocusForm) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [autoFocusForm, postId]);

  // Merge live snapshot with local instant optimistic additions/edits/deletions
  const displayedComments = useMemo(() => {
    const deletedSet = new Set(optimisticDeletedIds);
    const mergedMap = new Map<string, ArticleComment>();

    for (const c of liveComments) {
      if (!deletedSet.has(c.id)) {
        mergedMap.set(c.id, c);
      }
    }

    for (const opt of optimisticAdded) {
      if (!deletedSet.has(opt.id) && !mergedMap.has(opt.id)) {
        mergedMap.set(opt.id, opt);
      }
    }

    const result: ArticleComment[] = [];
    mergedMap.forEach((item) => {
      const editPatch = optimisticEdits[item.id];
      if (editPatch) {
        result.push({
          ...item,
          content: editPatch.content,
          updatedAt: editPatch.updatedAt,
          edited: true
        });
      } else {
        result.push(item);
      }
    });

    return result;
  }, [liveComments, optimisticAdded, optimisticEdits, optimisticDeletedIds]);

  const { topLevel, orphanThreads } = useMemo(
    () => buildCommentThreads(displayedComments),
    [displayedComments]
  );

  const totalVisibleCount = displayedComments.length;

  const showThreadNotice = (type: 'success' | 'error', msg: string) => {
    setThreadNotice({ type, message: msg });
  };

  // Submit new top-level comment (instant publishing)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setErrorMsg(null);
    setSuccessMsg(null);
    setThreadNotice(null);
    setIsSubmitting(true);

    try {
      const result = await submitArticleComment({
        postId,
        name,
        email,
        content: message,
        parentId: null,
        replyToName: null,
        honeypot
      });

      if (!result.success) {
        setErrorMsg(result.error || 'Could not publish your comment. Please try again.');
        return;
      }

      if (result.comment) {
        setOptimisticAdded((prev) => [result.comment!, ...prev]);
      }

      setName('');
      setEmail('');
      setMessage('');
      setHoneypot('');
      setSuccessMsg('Your comment has been published.');
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleOpenReplyForm = (targetComment: ArticleComment, rootParentId: string) => {
    if (replyTarget?.targetCommentId === targetComment.id) {
      setReplyTarget(null);
      return;
    }
    setEditingCommentId(null);
    setConfirmDeleteId(null);
    setReplyErrorMsg(null);
    setReplyContent('');
    setReplyHoneypot('');
    setReplyTarget({
      targetCommentId: targetComment.id,
      rootParentId,
      replyToName: targetComment.name
    });
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyTarget || replyLockRef.current || isSubmittingReply) return;

    replyLockRef.current = true;
    setReplyErrorMsg(null);
    setThreadNotice(null);
    setIsSubmittingReply(true);

    try {
      const result = await submitArticleComment({
        postId,
        name: replyName,
        email: replyEmail,
        content: replyContent,
        parentId: replyTarget.rootParentId,
        replyToName: replyTarget.replyToName,
        honeypot: replyHoneypot
      });

      if (!result.success) {
        setReplyErrorMsg(result.error || 'Could not publish your reply. Please try again.');
        return;
      }

      if (result.comment) {
        setOptimisticAdded((prev) => [...prev, result.comment!]);
      }

      // Ensure the parent thread stays expanded so the newly published reply is visible right away
      const expandedParentId = replyTarget.rootParentId;
      setCollapsedThreads((prev) => ({
        ...prev,
        [expandedParentId]: false
      }));

      setReplyName('');
      setReplyEmail('');
      setReplyContent('');
      setReplyHoneypot('');
      setReplyTarget(null);
      showThreadNotice('success', 'Your reply has been published.');
    } finally {
      replyLockRef.current = false;
      setIsSubmittingReply(false);
    }
  };

  const handleStartEdit = (comment: ArticleComment) => {
    setReplyTarget(null);
    setConfirmDeleteId(null);
    setEditErrorMsg(null);
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const handleSaveEdit = async (e: React.FormEvent, comment: ArticleComment) => {
    e.preventDefault();
    setEditErrorMsg(null);
    setThreadNotice(null);
    setIsSavingEdit(true);

    try {
      const res = await editArticleComment({
        commentId: comment.id,
        content: editingText,
        previousUpdatedAt: comment.updatedAt || comment.createdAt,
        allowAdminOverride: isAdmin && !canVisitorEditComment(comment, false),
        postId
      });

      if (!res.success) {
        setEditErrorMsg(res.error || 'Could not save your changes.');
        return;
      }

      if (res.sanitizedContent && res.updatedAt) {
        setOptimisticEdits((prev) => ({
          ...prev,
          [comment.id]: {
            content: res.sanitizedContent!,
            updatedAt: res.updatedAt!
          }
        }));
      }

      setEditingCommentId(null);
      setEditingText('');
      showThreadNotice('success', 'Comment updated.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async (
    comment: ArticleComment,
    childReplyIds: string[] = [],
    deleteThreadToo = false
  ) => {
    setDeleteErrorMsg(null);
    setThreadNotice(null);
    setIsDeletingId(comment.id);

    try {
      const ownedByVisitor = canVisitorDeleteComment(comment, false);
      let res: { success: boolean; error?: string };

      if (ownedByVisitor && !deleteThreadToo) {
        res = await deleteArticleCommentByOwner(comment.id, postId);
      } else if (isAdmin) {
        res = await deleteArticleComment(
          comment.id,
          deleteThreadToo ? childReplyIds : []
        );
      } else {
        res = {
          success: false,
          error: 'Forbidden: Only the original author of this comment may delete it.'
        };
      }

      if (!res.success) {
        setDeleteErrorMsg(res.error || 'Could not delete this comment.');
        return;
      }

      const idsToHide = deleteThreadToo ? [comment.id, ...childReplyIds] : [comment.id];
      setOptimisticDeletedIds((prev) => Array.from(new Set([...prev, ...idsToHide])));
      setConfirmDeleteId(null);
      if (replyTarget && idsToHide.includes(replyTarget.targetCommentId)) {
        setReplyTarget(null);
      }
      if (editingCommentId && idsToHide.includes(editingCommentId)) {
        setEditingCommentId(null);
      }
      showThreadNotice(
        'success',
        deleteThreadToo ? 'Comment thread deleted.' : 'Comment deleted.'
      );
    } finally {
      setIsDeletingId(null);
    }
  };

  const toggleThreadReplies = (parentId: string) => {
    setCollapsedThreads((prev) => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  const renderReplyForm = (targetComment: ArticleComment) => {
    if (!replyTarget || replyTarget.targetCommentId !== targetComment.id) return null;

    return (
      <form
        onSubmit={handleSubmitReply}
        noValidate
        className="mt-3 border p-3.5 sm:p-4 space-y-3"
        style={{
          backgroundColor: 'var(--app-primary-soft)',
          borderColor: 'var(--app-border-color)',
          borderRadius: 'var(--app-radius-card)'
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold min-w-0" style={{ color: 'var(--app-heading-primary)' }}>
            <CornerDownRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--app-primary)' }} />
            <span className="truncate">
              Replying to <span style={{ color: 'var(--app-primary)' }}>{replyTarget.replyToName}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            aria-label="Cancel reply"
            className="p-1 hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--app-muted-text)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden honeypot */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor={`reply-hp-${targetComment.id}`}>Leave blank</label>
          <input
            id={`reply-hp-${targetComment.id}`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={replyHoneypot}
            onChange={(e) => setReplyHoneypot(e.target.value)}
          />
        </div>

        {replyErrorMsg && (
          <div
            role="alert"
            className="theme-error-banner p-2.5 border text-xs font-medium flex items-start space-x-2"
            style={{ borderColor: 'var(--app-error-bg)' }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{replyErrorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`reply-name-${targetComment.id}`}
              className="block text-[11px] font-bold mb-1"
              style={{ color: 'var(--app-heading-primary)' }}
            >
              Your Name <span style={{ color: 'var(--app-error-bg)' }}>*</span>
            </label>
            <input
              id={`reply-name-${targetComment.id}`}
              type="text"
              required
              maxLength={COMMENT_NAME_MAX_LENGTH}
              value={replyName}
              onChange={(e) => setReplyName(e.target.value)}
              placeholder="Your display name"
              className="theme-input w-full px-3 py-2 text-xs sm:text-sm border"
            />
          </div>

          <div>
            <label
              htmlFor={`reply-email-${targetComment.id}`}
              className="block text-[11px] font-bold mb-1"
              style={{ color: 'var(--app-heading-primary)' }}
            >
              Email <span className="font-normal" style={{ color: 'var(--app-muted-text)' }}>(optional, never public)</span>
            </label>
            <input
              id={`reply-email-${targetComment.id}`}
              type="email"
              maxLength={COMMENT_EMAIL_MAX_LENGTH}
              value={replyEmail}
              onChange={(e) => setReplyEmail(e.target.value)}
              placeholder="name@example.com (private)"
              className="theme-input w-full px-3 py-2 text-xs sm:text-sm border"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={`reply-body-${targetComment.id}`}
              className="block text-[11px] font-bold"
              style={{ color: 'var(--app-heading-primary)' }}
            >
              Reply <span style={{ color: 'var(--app-error-bg)' }}>*</span>
            </label>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--app-muted-text)' }}>
              {replyContent.length}/{COMMENT_CONTENT_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id={`reply-body-${targetComment.id}`}
            required
            rows={3}
            maxLength={COMMENT_CONTENT_MAX_LENGTH}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={`Write a reply to ${replyTarget.replyToName}...`}
            className="theme-input w-full px-3 py-2 text-xs sm:text-sm border resize-y"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSubmittingReply}
            onClick={() => setReplyTarget(null)}
            className="px-3 py-1.5 border text-xs font-semibold hover:opacity-90 cursor-pointer"
            style={{
              backgroundColor: 'var(--app-card-bg)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-body-text)',
              borderRadius: 'var(--app-radius-btn)'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmittingReply}
            className="theme-btn-primary inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold shadow-2xs transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {isSubmittingReply ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Reply</span>
              </>
            )}
          </button>
        </div>
      </form>
    );
  };

  const renderCommentCard = (
    comment: ArticleComment,
    options: {
      isReply: boolean;
      rootParentId: string;
      childReplyIds?: string[];
    }
  ) => {
    const dateInfo = formatPublicationDate(comment.createdAt);
    const initial = (comment.name || 'R').trim().charAt(0).toUpperCase();
    const isOwner = canVisitorEditComment(comment, false);
    const canEdit = canVisitorEditComment(comment, isAdmin);
    const canDelete = canVisitorDeleteComment(comment, isAdmin);
    const isEditing = editingCommentId === comment.id;
    const isConfirmingDelete = confirmDeleteId === comment.id;
    const isBusyDeleting = isDeletingId === comment.id;
    const childRepliesCount = options.childReplyIds?.length || 0;

    return (
      <div
        key={comment.id}
        data-comment-id={comment.id}
        className={`border transition-colors ${
          options.isReply ? 'p-3.5 sm:p-4 space-y-2' : 'p-4 sm:p-5 space-y-2.5'
        }`}
        style={{
          backgroundColor: options.isReply ? 'var(--app-body-bg)' : 'var(--app-card-bg)',
          borderColor: 'var(--app-border-color)',
          color: 'var(--app-body-text)',
          borderRadius: 'var(--app-radius-card)'
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start space-x-2.5 min-w-0">
            <div
              className={`${
                options.isReply ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs'
              } rounded-full font-bold flex items-center justify-center shrink-0 mt-0.5`}
              style={
                options.isReply
                  ? { backgroundColor: 'var(--app-secondary)', color: '#ffffff' }
                  : { backgroundColor: 'var(--app-primary)', color: 'var(--app-primary-btn-text)' }
              }
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold break-words" style={{ color: 'var(--app-heading-primary)' }}>
                  {comment.name}
                </span>
                {isOwner && (
                  <span
                    className="px-1.5 py-0.5 rounded border text-[10px] font-bold"
                    style={{
                      backgroundColor: 'var(--app-primary-soft)',
                      borderColor: 'var(--app-border-color)',
                      color: 'var(--app-primary)'
                    }}
                  >
                    You
                  </span>
                )}
                {options.isReply && comment.replyToName && (
                  <span className="inline-flex items-center space-x-1 text-[11px] font-semibold" style={{ color: 'var(--app-primary)' }}>
                    <CornerDownRight className="w-3 h-3 shrink-0" />
                    <span>Replying to {comment.replyToName}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] mt-0.5" style={{ color: 'var(--app-muted-text)' }}>
                {dateInfo && (
                  <time
                    dateTime={comment.createdAt}
                    className="inline-flex items-center space-x-1"
                  >
                    <Clock className="w-3 h-3 opacity-75 shrink-0" />
                    <span>
                      {dateInfo.formattedDate} · {dateInfo.formattedTime}
                    </span>
                  </time>
                )}
                {comment.edited && (
                  <span
                    className="text-[10px] font-semibold italic"
                    style={{ color: 'var(--app-muted-text)' }}
                    title={
                      comment.updatedAt
                        ? `Edited ${comment.updatedAt}`
                        : 'Comment was edited'
                    }
                  >
                    · Edited
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body OR Inline Edit Form */}
        {isEditing ? (
          <form onSubmit={(e) => handleSaveEdit(e, comment)} className="space-y-2.5 pt-1" noValidate>
            {editErrorMsg && (
              <div
                role="alert"
                className="theme-error-banner p-2.5 border text-xs font-medium flex items-start space-x-2"
                style={{ borderColor: 'var(--app-error-bg)' }}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{editErrorMsg}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label
                htmlFor={`edit-body-${comment.id}`}
                className="text-[11px] font-bold"
                style={{ color: 'var(--app-heading-primary)' }}
              >
                Edit your {options.isReply ? 'reply' : 'comment'}
              </label>
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--app-muted-text)' }}>
                {editingText.length}/{COMMENT_CONTENT_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id={`edit-body-${comment.id}`}
              rows={3}
              maxLength={COMMENT_CONTENT_MAX_LENGTH}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              className="theme-input w-full px-3 py-2 text-xs sm:text-sm border resize-y"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => {
                  setEditingCommentId(null);
                  setEditErrorMsg(null);
                }}
                className="px-3 py-1.5 border text-xs font-semibold hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: 'var(--app-card-bg)',
                  borderColor: 'var(--app-border-color)',
                  color: 'var(--app-body-text)',
                  borderRadius: 'var(--app-radius-btn)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="theme-btn-primary inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-60 hover:opacity-90"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ color: 'var(--app-body-text)' }}>
            {comment.content}
          </p>
        )}

        {/* Inline Delete Confirmation Box */}
        {isConfirmingDelete && (
          <div
            role="alertdialog"
            aria-label="Confirm comment deletion"
            className="border p-3 space-y-2.5"
            style={{
              backgroundColor: 'var(--app-error-soft)',
              borderColor: 'var(--app-error-bg)',
              color: 'var(--app-body-text)',
              borderRadius: 'var(--app-radius-btn)'
            }}
          >
            {deleteErrorMsg && (
              <div className="text-xs font-semibold" style={{ color: 'var(--app-error-bg)' }}>{deleteErrorMsg}</div>
            )}
            <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--app-heading-primary)' }}>
              {childRepliesCount > 0
                ? `This comment has ${childRepliesCount} ${
                    childRepliesCount === 1 ? 'reply' : 'replies'
                  }. Deleting your comment will remove its text while keeping the replies visible in the thread.`
                : `Are you sure you want to permanently delete this ${
                    options.isReply ? 'reply' : 'comment'
                  }?`}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={isBusyDeleting}
                onClick={() => {
                  setConfirmDeleteId(null);
                  setDeleteErrorMsg(null);
                }}
                className="px-3 py-1.5 border text-xs font-semibold hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: 'var(--app-card-bg)',
                  borderColor: 'var(--app-border-color)',
                  color: 'var(--app-body-text)',
                  borderRadius: 'var(--app-radius-btn)'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBusyDeleting}
                onClick={() => handleConfirmDelete(comment, options.childReplyIds, false)}
                className="theme-error-banner inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-60 hover:opacity-90"
              >
                {isBusyDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Confirm Delete</span>
                )}
              </button>
              {isAdmin && childRepliesCount > 0 && (
                <button
                  type="button"
                  disabled={isBusyDeleting}
                  onClick={() => handleConfirmDelete(comment, options.childReplyIds, true)}
                  className="theme-error-banner inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold cursor-pointer disabled:opacity-60 hover:opacity-90"
                >
                  <span>Delete Comment &amp; {childRepliesCount} Replies</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action Strip: Reply + Owner/Admin Edit & Delete */}
        {!isEditing && !isConfirmingDelete && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleOpenReplyForm(comment, options.rootParentId)}
              className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-bold hover:opacity-80 py-0.5 cursor-pointer"
              style={{ color: 'var(--app-primary)' }}
            >
              <Reply className="w-3.5 h-3.5" />
              <span>
                {replyTarget?.targetCommentId === comment.id ? 'Close Reply' : 'Reply'}
              </span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => handleStartEdit(comment)}
                className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-semibold hover:opacity-80 py-0.5 cursor-pointer"
                style={{ color: 'var(--app-muted-text)' }}
              >
                <Pencil className="w-3 h-3" />
                <span>Edit</span>
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  setReplyTarget(null);
                  setEditingCommentId(null);
                  setDeleteErrorMsg(null);
                  setConfirmDeleteId(comment.id);
                }}
                className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-semibold hover:opacity-80 py-0.5 cursor-pointer"
                style={{ color: 'var(--app-error-bg)' }}
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}

        {/* Inline Reply Box beneath this item */}
        {renderReplyForm(comment)}
      </div>
    );
  };

  return (
    <section
      id="article-comments"
      aria-labelledby="article-comments-heading"
      className="pt-8 border-t space-y-6 scroll-mt-36 sm:scroll-mt-40"
      style={{ borderColor: 'var(--app-border-color)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <MessageSquare className="w-5 h-5 shrink-0" style={{ color: 'var(--app-primary)' }} />
          <h2
            id="article-comments-heading"
            className="font-serif text-xl sm:text-2xl font-bold"
            style={{ color: 'var(--app-heading-primary)' }}
          >
            Comments &amp; Discussion ({totalVisibleCount})
          </h2>
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--app-muted-text)' }}>
          No account required · Published instantly
        </span>
      </div>

      {/* Public Comment Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="theme-card border p-4 sm:p-6 space-y-4 shadow-2xs"
        noValidate
      >
        <div className="space-y-1">
          <h3 className="text-sm font-bold" style={{ color: 'var(--app-heading-primary)' }}>
            Join the conversation on &ldquo;{postTitle}&rdquo;
          </h3>
          <p className="text-xs" style={{ color: 'var(--app-muted-text)' }}>
            Write your comment below and click Send. Comments appear immediately.
          </p>
        </div>

        {/* Hidden honeypot field for basic bot spam protection */}
        <div className="sr-only" aria-hidden="true">
          <label htmlFor={`comment-hp-${postId}`}>Leave this field blank</label>
          <input
            id={`comment-hp-${postId}`}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="theme-error-banner p-3 border text-xs font-medium flex items-start space-x-2"
            style={{ borderColor: 'var(--app-error-bg)' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="theme-success-banner p-3 border text-xs font-medium flex items-start space-x-2"
            style={{ borderColor: 'var(--app-success-bg)' }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`comment-name-${postId}`}
              className="block text-xs font-bold mb-1"
              style={{ color: 'var(--app-heading-primary)' }}
            >
              Display Name <span style={{ color: 'var(--app-error-bg)' }}>*</span>
            </label>
            <input
              ref={nameInputRef}
              id={`comment-name-${postId}`}
              type="text"
              required
              maxLength={COMMENT_NAME_MAX_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="theme-input w-full px-3.5 py-2.5 text-sm border"
            />
          </div>

          <div>
            <label
              htmlFor={`comment-email-${postId}`}
              className="block text-xs font-bold mb-1"
              style={{ color: 'var(--app-heading-primary)' }}
            >
              Email <span className="font-normal" style={{ color: 'var(--app-muted-text)' }}>(optional)</span>
            </label>
            <input
              id={`comment-email-${postId}`}
              type="email"
              maxLength={COMMENT_EMAIL_MAX_LENGTH}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Private email (never shown publicly)"
              className="theme-input w-full px-3.5 py-2.5 text-sm border"
            />
            <p className="mt-1 inline-flex items-center space-x-1 text-[11px]" style={{ color: 'var(--app-muted-text)' }}>
              <Lock className="w-3 h-3 opacity-75 shrink-0" />
              <span>Optional — never displayed publicly</span>
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={`comment-body-${postId}`}
              className="block text-xs font-bold"
              style={{ color: 'var(--app-heading-primary)' }}
            >
              Comment <span style={{ color: 'var(--app-error-bg)' }}>*</span>
            </label>
            <span className="text-[11px] tabular-nums" style={{ color: 'var(--app-muted-text)' }}>
              {message.length}/{COMMENT_CONTENT_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id={`comment-body-${postId}`}
            required
            rows={4}
            maxLength={COMMENT_CONTENT_MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your comment..."
            className="theme-input w-full px-3.5 py-2.5 text-sm border resize-y"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="theme-btn-primary inline-flex items-center space-x-2 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-2xs transition-opacity hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Comment</span>
              </>
            )}
          </button>
        </div>
      </form>

      {threadNotice && (
        <div
          role="status"
          className={`p-3 border text-xs font-medium flex items-center justify-between gap-2 ${
            threadNotice.type === 'success' ? 'theme-success-banner' : 'theme-error-banner'
          }`}
          style={{
            borderColor: threadNotice.type === 'success' ? 'var(--app-success-bg)' : 'var(--app-error-bg)'
          }}
        >
          <span className="flex items-center space-x-2">
            {threadNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{threadNotice.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setThreadNotice(null)}
            aria-label="Dismiss notice"
            className="opacity-80 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Threaded Comments List */}
      {isLoading ? (
        <div className="py-6 text-center text-xs flex items-center justify-center space-x-2" style={{ color: 'var(--app-muted-text)' }}>
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--app-primary)' }} />
          <span>Loading comments...</span>
        </div>
      ) : totalVisibleCount === 0 ? (
        <div
          className="border p-6 text-center text-xs sm:text-sm"
          style={{
            backgroundColor: 'var(--app-card-bg)',
            borderColor: 'var(--app-border-color)',
            color: 'var(--app-muted-text)',
            borderRadius: 'var(--app-radius-card)'
          }}
        >
          No comments yet for this article. Be the first reader to share your thoughts above.
        </div>
      ) : (
        <div className="space-y-4">
          {topLevel.map(({ comment, replies }) => {
            const isCollapsed = Boolean(collapsedThreads[comment.id]);
            const childReplyIds = replies.map((r) => r.id);

            return (
              <div key={comment.id} className="space-y-2.5">
                {renderCommentCard(comment, {
                  isReply: false,
                  rootParentId: comment.id,
                  childReplyIds
                })}

                {replies.length > 0 && (
                  <div
                    className="ml-3 sm:ml-8 pl-3 sm:pl-4 border-l-2 space-y-2.5"
                    style={{ borderColor: 'var(--app-primary)' }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleThreadReplies(comment.id)}
                      className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold hover:opacity-80 py-0.5 cursor-pointer"
                      style={{ color: 'var(--app-primary)' }}
                    >
                      {isCollapsed ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>
                            View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        </>
                      ) : (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>
                            Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        </>
                      )}
                    </button>

                    {!isCollapsed && (
                      <div className="space-y-2.5">
                        {replies.map((reply) =>
                          renderCommentCard(reply, {
                            isReply: true,
                            rootParentId: comment.id
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Preserved Replies whose parent comment was removed */}
          {orphanThreads.map(({ parentId, replies }) => {
            const isCollapsed = Boolean(collapsedThreads[parentId]);
            return (
              <div key={`orphan_${parentId}`} className="space-y-2.5">
                <div
                  className="border border-dashed px-4 py-3 text-xs italic"
                  style={{
                    backgroundColor: 'var(--app-body-bg)',
                    borderColor: 'var(--app-border-color)',
                    color: 'var(--app-muted-text)',
                    borderRadius: 'var(--app-radius-card)'
                  }}
                >
                  Original comment was removed by its author.
                </div>

                <div
                  className="ml-3 sm:ml-8 pl-3 sm:pl-4 border-l-2 space-y-2.5"
                  style={{ borderColor: 'var(--app-border-color)' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleThreadReplies(parentId)}
                    className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold hover:opacity-80 py-0.5 cursor-pointer"
                    style={{ color: 'var(--app-heading-primary)' }}
                  >
                    {isCollapsed ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>
                          View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>
                          Hide {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </span>
                      </>
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2.5">
                      {replies.map((reply) =>
                        renderCommentCard(reply, {
                          isReply: true,
                          rootParentId: reply.id
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
