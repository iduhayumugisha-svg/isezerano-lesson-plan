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
        className="mt-3 rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 sm:p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-900 min-w-0">
            <CornerDownRight className="w-3.5 h-3.5 text-teal-700 shrink-0" />
            <span className="truncate">
              Replying to <span className="text-teal-700">{replyTarget.replyToName}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            aria-label="Cancel reply"
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
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
            className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-start space-x-2"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
            <span>{replyErrorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`reply-name-${targetComment.id}`}
              className="block text-[11px] font-bold text-slate-800 mb-1"
            >
              Your Name <span className="text-rose-600">*</span>
            </label>
            <input
              id={`reply-name-${targetComment.id}`}
              type="text"
              required
              maxLength={COMMENT_NAME_MAX_LENGTH}
              value={replyName}
              onChange={(e) => setReplyName(e.target.value)}
              placeholder="Your display name"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor={`reply-email-${targetComment.id}`}
              className="block text-[11px] font-bold text-slate-800 mb-1"
            >
              Email <span className="font-normal text-slate-500">(optional, never public)</span>
            </label>
            <input
              id={`reply-email-${targetComment.id}`}
              type="email"
              maxLength={COMMENT_EMAIL_MAX_LENGTH}
              value={replyEmail}
              onChange={(e) => setReplyEmail(e.target.value)}
              placeholder="name@example.com (private)"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={`reply-body-${targetComment.id}`}
              className="block text-[11px] font-bold text-slate-800"
            >
              Reply <span className="text-rose-600">*</span>
            </label>
            <span className="text-[10px] text-slate-400 tabular-nums">
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
            className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSubmittingReply}
            onClick={() => setReplyTarget(null)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmittingReply}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
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
        className={`rounded-xl border transition-colors ${
          options.isReply
            ? 'bg-slate-50/75 border-slate-200/90 p-3.5 sm:p-4 space-y-2'
            : 'bg-white border-slate-200 p-4 sm:p-5 space-y-2.5'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start space-x-2.5 min-w-0">
            <div
              className={`${
                options.isReply ? 'w-7 h-7 text-[11px] bg-slate-700' : 'w-8 h-8 text-xs bg-teal-800'
              } rounded-full text-white font-bold flex items-center justify-center shrink-0 mt-0.5`}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 break-words">
                  {comment.name}
                </span>
                {isOwner && (
                  <span className="px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">
                    You
                  </span>
                )}
                {options.isReply && comment.replyToName && (
                  <span className="inline-flex items-center space-x-1 text-[11px] text-teal-700 font-semibold">
                    <CornerDownRight className="w-3 h-3 shrink-0" />
                    <span>Replying to {comment.replyToName}</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                {dateInfo && (
                  <time
                    dateTime={comment.createdAt}
                    className="inline-flex items-center space-x-1"
                  >
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>
                      {dateInfo.formattedDate} · {dateInfo.formattedTime}
                    </span>
                  </time>
                )}
                {comment.edited && (
                  <span
                    className="text-[10px] font-semibold text-slate-500 italic"
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
                className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-start space-x-2"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{editErrorMsg}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <label
                htmlFor={`edit-body-${comment.id}`}
                className="text-[11px] font-bold text-slate-700"
              >
                Edit your {options.isReply ? 'reply' : 'comment'}
              </label>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {editingText.length}/{COMMENT_CONTENT_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id={`edit-body-${comment.id}`}
              rows={3}
              maxLength={COMMENT_CONTENT_MAX_LENGTH}
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-teal-400 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => {
                  setEditingCommentId(null);
                  setEditErrorMsg(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
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
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        )}

        {/* Inline Delete Confirmation Box */}
        {isConfirmingDelete && (
          <div
            role="alertdialog"
            aria-label="Confirm comment deletion"
            className="rounded-lg border border-rose-200 bg-rose-50/90 p-3 space-y-2.5"
          >
            {deleteErrorMsg && (
              <div className="text-xs font-semibold text-rose-800">{deleteErrorMsg}</div>
            )}
            <p className="text-xs text-rose-950 font-medium leading-relaxed">
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
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBusyDeleting}
                onClick={() => handleConfirmDelete(comment, options.childReplyIds, false)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
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
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
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
              className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-bold text-teal-800 hover:text-teal-600 py-0.5 cursor-pointer"
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
                className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 py-0.5 cursor-pointer"
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
                className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-semibold text-rose-700 hover:text-rose-500 py-0.5 cursor-pointer"
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
      className="pt-8 border-t border-slate-200 space-y-6 scroll-mt-36 sm:scroll-mt-40"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <MessageSquare className="w-5 h-5 text-teal-700 shrink-0" />
          <h2
            id="article-comments-heading"
            className="font-serif text-xl sm:text-2xl font-bold text-slate-900"
          >
            Comments &amp; Discussion ({totalVisibleCount})
          </h2>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          No account required · Published instantly
        </span>
      </div>

      {/* Public Comment Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-4 shadow-2xs"
        noValidate
      >
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">
            Join the conversation on &ldquo;{postTitle}&rdquo;
          </h3>
          <p className="text-xs text-slate-500">
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
            className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-start space-x-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-start space-x-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={`comment-name-${postId}`}
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Display Name <span className="text-rose-600">*</span>
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
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div>
            <label
              htmlFor={`comment-email-${postId}`}
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Email <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id={`comment-email-${postId}`}
              type="email"
              maxLength={COMMENT_EMAIL_MAX_LENGTH}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Private email (never shown publicly)"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
            <p className="mt-1 inline-flex items-center space-x-1 text-[11px] text-slate-500">
              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Optional — never displayed publicly</span>
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={`comment-body-${postId}`}
              className="block text-xs font-bold text-slate-800"
            >
              Comment <span className="text-rose-600">*</span>
            </label>
            <span className="text-[11px] text-slate-400 tabular-nums">
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
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-y"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs sm:text-sm font-bold shadow-2xs transition-colors disabled:opacity-60 cursor-pointer"
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
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            threadNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span className="flex items-center space-x-2">
            {threadNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{threadNotice.message}</span>
          </span>
          <button
            type="button"
            onClick={() => setThreadNotice(null)}
            aria-label="Dismiss notice"
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Threaded Comments List */}
      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
          <span>Loading comments...</span>
        </div>
      ) : totalVisibleCount === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-6 text-center text-xs sm:text-sm text-slate-500">
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
                  <div className="ml-3 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-teal-200 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => toggleThreadReplies(comment.id)}
                      className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-teal-800 hover:text-teal-600 py-0.5 cursor-pointer"
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
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-500 italic">
                  Original comment was removed by its author.
                </div>

                <div className="ml-3 sm:ml-8 pl-3 sm:pl-4 border-l-2 border-slate-300 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => toggleThreadReplies(parentId)}
                    className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs font-bold text-slate-700 hover:text-slate-900 py-0.5 cursor-pointer"
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
