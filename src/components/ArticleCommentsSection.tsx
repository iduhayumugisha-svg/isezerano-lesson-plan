import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';
import {
  ArticleComment,
  COMMENT_CONTENT_MAX_LENGTH,
  COMMENT_NAME_MAX_LENGTH,
  submitArticleComment,
  subscribeToApprovedCommentsForPost
} from '../services/commentService';
import { formatPublicationDate } from '../utils/dateUtils';

interface ArticleCommentsSectionProps {
  postId: string;
  postTitle: string;
  autoFocusForm?: boolean;
}

export const ArticleCommentsSection: React.FC<ArticleCommentsSectionProps> = ({
  postId,
  postTitle,
  autoFocusForm = false
}) => {
  const [approvedComments, setApprovedComments] = useState<ArticleComment[]>([]);
  const [sessionPendingComments, setSessionPendingComments] = useState<ArticleComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setSessionPendingComments([]);
    setErrorMsg(null);
    setSuccessMsg(null);

    const unsubscribe = subscribeToApprovedCommentsForPost(postId, (items) => {
      setApprovedComments(items);
      setIsLoading(false);
    });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const result = await submitArticleComment({
        postId,
        name,
        content: message,
        honeypot
      });

      if (!result.success) {
        setErrorMsg(result.error || 'Could not send your message. Please try again.');
        return;
      }

      if (result.comment) {
        setSessionPendingComments((prev) => [result.comment!, ...prev]);
      }

      setName('');
      setMessage('');
      setHoneypot('');
      setSuccessMsg(
        'Your message has been submitted and is awaiting administrator review before appearing publicly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show session-submitted pending comments that haven't yet appeared in approvedComments
  const approvedIds = new Set(approvedComments.map((c) => c.id));
  const pendingToShow = sessionPendingComments.filter((c) => !approvedIds.has(c.id));
  const displayedComments = [...pendingToShow, ...approvedComments];

  return (
    <section
      id="article-comments"
      aria-labelledby="article-comments-heading"
      className="pt-8 border-t border-slate-200 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <MessageSquare className="w-5 h-5 text-teal-700" />
          <h2
            id="article-comments-heading"
            className="font-serif text-xl sm:text-2xl font-bold text-slate-900"
          >
            Reader Messages &amp; Comments ({approvedComments.length})
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          No account required
        </span>
      </div>

      {/* Reader Comment Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs"
        noValidate
      >
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">
            Leave a message about &ldquo;{postTitle}&rdquo;
          </h3>
          <p className="text-xs text-slate-500">
            Share your thoughts or questions with our newsroom and community. Messages are reviewed for safety before public display.
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

        <div>
          <label
            htmlFor={`comment-name-${postId}`}
            className="block text-xs font-bold text-slate-800 mb-1"
          >
            Name <span className="text-rose-600">*</span>
          </label>
          <input
            ref={nameInputRef}
            id={`comment-name-${postId}`}
            type="text"
            required
            maxLength={COMMENT_NAME_MAX_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor={`comment-body-${postId}`}
              className="block text-xs font-bold text-slate-800"
            >
              Message <span className="text-rose-600">*</span>
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
            placeholder="Write your message or comment..."
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
                <span>Send Message</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Submitted Comments List */}
      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
          <span>Loading comments...</span>
        </div>
      ) : displayedComments.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-6 text-center text-xs sm:text-sm text-slate-500">
          No messages yet for this article. Be the first reader to leave a message above.
        </div>
      ) : (
        <div className="space-y-3">
          {displayedComments.map((comment) => {
            const dateInfo = formatPublicationDate(comment.createdAt);
            const isPendingLocal = comment.status === 'pending';
            const initial = (comment.name || 'R').trim().charAt(0).toUpperCase();

            return (
              <div
                key={comment.id}
                className={`rounded-xl border p-4 sm:p-5 space-y-2.5 ${
                  isPendingLocal
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {initial}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900">
                        {comment.name}
                      </div>
                      {dateInfo && (
                        <time
                          dateTime={comment.createdAt}
                          className="inline-flex items-center space-x-1 text-[11px] text-slate-500"
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {dateInfo.formattedDate} · {dateInfo.formattedTime}
                          </span>
                        </time>
                      )}
                    </div>
                  </div>

                  {isPendingLocal && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                      Pending approval
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
