import React from 'react';
import {
  Bell,
  X,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { PushAnnouncement } from '../types/platform';

interface AnnouncementDetailModalProps {
  announcement: PushAnnouncement | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead?: (id: string) => void;
}

export const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  announcement,
  isOpen,
  onClose,
  onMarkRead
}) => {
  if (!isOpen || !announcement) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handleClose = () => {
    if (onMarkRead && announcement.id) {
      onMarkRead(announcement.id);
    }
    onClose();
  };

  return (
    <div
      className="theme-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="theme-modal-card max-w-lg w-full p-6 sm:p-7 shadow-2xl border space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: 'var(--app-muted-text)' }}
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="flex items-center space-x-3 border-b pb-4 pr-10" style={{ borderColor: 'var(--app-border-color)' }}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-2xs shrink-0"
            style={{ backgroundColor: 'var(--app-primary-soft)', borderColor: 'var(--app-border-color)', color: 'var(--app-primary)' }}
          >
            <Bell className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: 'var(--app-primary)' }}>
              ISEZERANO ONLINE
            </span>
            <h3 className="text-base sm:text-lg font-black leading-snug" style={{ color: 'var(--app-heading-primary)' }}>
              News Alert &amp; Announcement
            </h3>
          </div>
        </div>

        {/* Public announcement view (no reader login required) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px]" style={{ color: 'var(--app-muted-text)' }}>
            <span
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-semibold border"
              style={{ backgroundColor: 'var(--app-body-bg)', borderColor: 'var(--app-border-color)', color: 'var(--app-body-text)' }}
            >
              <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--app-muted-text)' }} />
              <span>{formatDate(announcement.createdAt)}</span>
            </span>

            <span
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full font-semibold border"
              style={{ backgroundColor: 'var(--app-primary-soft)', borderColor: 'var(--app-border-color)', color: 'var(--app-primary)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{announcement.senderName || 'ISEZERANO Editorial'}</span>
            </span>

            {(announcement.priority === 'high' || announcement.priority === 'urgent') && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{ backgroundColor: 'var(--app-error-bg)', color: 'var(--app-error-text)' }}
              >
                Urgent
              </span>
            )}
          </div>

          <div>
            <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--app-heading-primary)' }}>
              {announcement.title}
            </h2>
          </div>

          <div
            className="p-4 border text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal"
            style={{
              backgroundColor: 'var(--app-body-bg)',
              borderColor: 'var(--app-border-color)',
              color: 'var(--app-body-text)',
              borderRadius: 'var(--app-radius-card)'
            }}
          >
            {announcement.body}
          </div>

          <div className="flex items-center justify-end pt-2 border-t" style={{ borderColor: 'var(--app-border-color)' }}>
            <button
              type="button"
              onClick={handleClose}
              className="theme-btn-primary px-4 py-2 text-xs font-extrabold transition-all shadow-xs cursor-pointer active:scale-95 hover:opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
