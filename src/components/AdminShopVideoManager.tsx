import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Film,
  Link2,
  Loader2,
  Save,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebsiteDesign } from '../context/WebsiteDesignContext';
import {
  createShopVideoConfigFromUrl,
  parseVimeoVideoUrl
} from '../services/shopVideoService';
import { ShopVimeoPlayer } from './ShopVimeoPlayer';

export const AdminShopVideoManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const { shopVideo, saveShopVideoConfig, isPublishing } = useWebsiteDesign();

  const [vimeoUrlInput, setVimeoUrlInput] = useState<string>(
    () => shopVideo?.vimeoLink || (shopVideo?.videoId ? `https://vimeo.com/${shopVideo.videoId}` : '')
  );
  const [videoTitleInput, setVideoTitleInput] = useState<string>(() => shopVideo?.title || '');
  const [publishEnabled, setPublishEnabled] = useState<boolean>(
    () => (shopVideo ? shopVideo.published : true)
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [confirmRemove, setConfirmRemove] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (shopVideo) {
      setVimeoUrlInput(shopVideo.vimeoLink || `https://vimeo.com/${shopVideo.videoId}`);
      setVideoTitleInput(shopVideo.title || '');
      setPublishEnabled(shopVideo.published);
    } else {
      setVimeoUrlInput('');
      setVideoTitleInput('');
      setPublishEnabled(true);
    }
  }, [shopVideo?.videoId, shopVideo?.vimeoLink, shopVideo?.title, shopVideo?.published]);

  const parsedPreview = useMemo(() => {
    if (!vimeoUrlInput.trim()) return null;
    return parseVimeoVideoUrl(vimeoUrlInput);
  }, [vimeoUrlInput]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-rose-200 text-center text-sm text-rose-700 font-semibold">
        Administrator authentication required to manage Shop Featured Video.
      </div>
    );
  }

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setConfirmRemove(false);

    const built = createShopVideoConfigFromUrl({
      url: vimeoUrlInput,
      title: videoTitleInput,
      published: publishEnabled,
      existing: shopVideo
    });

    if (!built.success || !built.video) {
      setFeedback({
        type: 'error',
        text: built.error || 'Please enter a valid Vimeo Video URL.'
      });
      return;
    }

    setIsSaving(true);
    const saveRes = await saveShopVideoConfig(built.video);
    setIsSaving(false);

    if (!saveRes.success) {
      setFeedback({
        type: 'error',
        text: saveRes.error || 'Failed to save Shop Featured Video to Cloud Firestore.'
      });
      return;
    }

    setVimeoUrlInput(built.video.vimeoLink || `https://vimeo.com/${built.video.videoId}`);
    setVideoTitleInput(built.video.title);
    setFeedback({
      type: 'success',
      text: built.video.published
        ? `Featured video (ID: ${built.video.videoId}) saved and published above Shop products.`
        : `Featured video (ID: ${built.video.videoId}) saved as Unpublished Draft.`
    });
  };

  const handleTogglePublished = async () => {
    if (!shopVideo) return;
    setFeedback(null);
    setConfirmRemove(false);
    setIsSaving(true);

    const nextPublished = !shopVideo.published;
    const res = await saveShopVideoConfig({
      ...shopVideo,
      title: videoTitleInput.trim() || shopVideo.title,
      published: nextPublished,
      updatedAt: new Date().toISOString()
    });
    setIsSaving(false);

    if (!res.success) {
      setFeedback({
        type: 'error',
        text: res.error || 'Failed to update Shop Featured Video visibility.'
      });
      return;
    }

    setPublishEnabled(nextPublished);
    setFeedback({
      type: 'success',
      text: nextPublished
        ? 'Featured video is now Published and visible above Shop products.'
        : 'Featured video is now Unpublished (hidden from public Shop visitors).'
    });
  };

  const handleRemoveVideo = async () => {
    setFeedback(null);
    setIsSaving(true);
    const res = await saveShopVideoConfig(null);
    setIsSaving(false);
    setConfirmRemove(false);

    if (!res.success) {
      setFeedback({
        type: 'error',
        text: res.error || 'Failed to remove Shop Featured Video.'
      });
      return;
    }

    setVimeoUrlInput('');
    setVideoTitleInput('');
    setPublishEnabled(true);
    setFeedback({
      type: 'success',
      text: 'Featured video removed from the Shop.'
    });
  };

  const busy = isSaving || isPublishing;

  return (
    <div
      data-testid="admin-shop-video-manager"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-700 uppercase tracking-wider">
            <Film className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Shop Featured Video (Vimeo Embed)</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
            Shop Featured Video
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Paste any Vimeo video link (such as https://vimeo.com/1248666228) to embed and display it above products on the Shop page.
          </p>
        </div>

        {shopVideo && (
          <span
            data-testid="admin-shop-video-visibility-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border shrink-0 self-start sm:self-auto ${
              shopVideo.published
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            {shopVideo.published ? (
              <>
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Published in Shop</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Unpublished (Draft)</span>
              </>
            )}
          </span>
        )}
      </div>

      {/* Action Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-bold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-rose-300 bg-rose-50 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
            aria-label="Dismiss video notification"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Vimeo URL Form */}
      <form
        onSubmit={handleSaveVideo}
        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7">
            <label
              htmlFor="admin-shop-video-url"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Vimeo Video URL
            </label>
            <div className="relative">
              <Link2
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="admin-shop-video-url"
                data-testid="admin-shop-video-url-input"
                type="url"
                value={vimeoUrlInput}
                onChange={(e) => {
                  setVimeoUrlInput(e.target.value);
                  if (feedback?.type === 'error') setFeedback(null);
                }}
                disabled={busy}
                placeholder="https://vimeo.com/1248666228"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              />
            </div>
            {parsedPreview && (
              <p
                data-testid="admin-shop-video-url-status"
                className={`mt-1.5 text-[11px] font-semibold ${
                  parsedPreview.valid ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {parsedPreview.valid
                  ? `Valid Vimeo link — Extracted Video ID: ${parsedPreview.videoId}`
                  : parsedPreview.error}
              </p>
            )}
          </div>

          <div className="md:col-span-5">
            <label
              htmlFor="admin-shop-video-title"
              className="block text-xs font-bold text-slate-800 mb-1"
            >
              Video Title (Optional)
            </label>
            <input
              id="admin-shop-video-title"
              data-testid="admin-shop-video-title-input"
              type="text"
              maxLength={120}
              value={videoTitleInput}
              onChange={(e) => setVideoTitleInput(e.target.value)}
              disabled={busy}
              placeholder="e.g. Featured Shop Video"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={publishEnabled}
              onChange={(e) => setPublishEnabled(e.target.checked)}
              disabled={busy}
              data-testid="admin-shop-video-publish-checkbox"
              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs font-bold text-slate-700">
              Publish publicly above Shop products
            </span>
          </label>

          <button
            type="submit"
            disabled={busy || !vimeoUrlInput.trim()}
            data-testid="admin-shop-video-save-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-teal-700 hover:bg-teal-600 text-white shadow-xs disabled:opacity-55 cursor-pointer transition-colors"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" aria-hidden="true" />
                <span>{shopVideo ? 'Update Video' : 'Save Video'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Saved Video Preview & Quick Actions */}
      {shopVideo ? (
        <div
          data-testid="admin-shop-video-preview-card"
          className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-extrabold text-slate-900 truncate">
                {shopVideo.title}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Vimeo ID: <span className="font-mono font-semibold">{shopVideo.videoId}</span>
                {shopVideo.vimeoLink ? ` · ${shopVideo.vimeoLink}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePublished}
                disabled={busy}
                data-testid="admin-shop-video-publish-toggle"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors disabled:opacity-50 ${
                  shopVideo.published
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                    : 'bg-teal-700 hover:bg-teal-600 text-white'
                }`}
              >
                {shopVideo.published ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Unpublish</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Publish in Shop</span>
                  </>
                )}
              </button>

              {!confirmRemove ? (
                <button
                  type="button"
                  onClick={() => setConfirmRemove(true)}
                  disabled={busy}
                  data-testid="admin-shop-video-remove-btn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Remove Video</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-lg px-2 py-1">
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    disabled={busy}
                    data-testid="admin-shop-video-confirm-remove"
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    Confirm Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    disabled={busy}
                    className="px-2 py-1 rounded bg-white text-slate-700 text-[11px] font-semibold border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <ShopVimeoPlayer video={shopVideo} autoPlay={false} />
        </div>
      ) : (
        <div className="py-7 px-4 text-center space-y-1.5 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Film className="w-7 h-7 text-slate-400 mx-auto" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-700">No Shop featured video saved yet.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Paste a Vimeo link above and click &ldquo;Save Video&rdquo; to embed it above products on the Shop page.
          </p>
        </div>
      )}
    </div>
  );
};
