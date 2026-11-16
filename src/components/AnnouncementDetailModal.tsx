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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 pr-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-teal-50 border border-teal-200 shadow-2xs shrink-0">
            <Bell className="w-6 h-6 text-teal-700" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
              ISEZERANO ONLINE
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              News Alert &amp; Announcement
            </h3>
          </div>
        </div>

        {/* Public announcement view (no reader login required) */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatDate(announcement.createdAt)}</span>
            </span>

            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-teal-50 font-semibold text-teal-800 border border-teal-200/60">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>{announcement.senderName || 'ISEZERANO Editorial'}</span>
            </span>

            {(announcement.priority === 'high' || announcement.priority === 'urgent') && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                Urgent
              </span>
            )}
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {announcement.title}
            </h2>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-normal">
            {announcement.body}
          </div>

          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
