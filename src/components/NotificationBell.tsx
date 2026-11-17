import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  Smartphone,
  Clock,
  ChevronRight,
  Volume2,
  CheckCircle2
} from 'lucide-react';
import { PushAnnouncement } from '../types/platform';
import {
  subscribeToAnnouncements,
  getReadNoticeIds,
  markNoticeAsRead,
  getNotificationPermission,
  requestPushPermissionAndGetToken,
  showLocalTestNotification,
  getSavedDeviceToken
} from '../services/fcmService';
import { useAuth } from '../context/AuthContext';

interface NotificationBellProps {
  onSelectAnnouncement?: (announcement: PushAnnouncement) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onSelectAnnouncement
}) => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<PushAnnouncement[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => getReadNoticeIds());
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<string>(() => getNotificationPermission());
  const [isEnabling, setIsEnabling] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time announcements
  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((items) => {
      setAnnouncements(items);
    });
    return () => unsubscribe();
  }, []);

  // Update permission status
  useEffect(() => {
    setPermission(getNotificationPermission());
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = announcements.filter((a) => !readIds.includes(a.id)).length;

  const handleOpenNotice = (announcement: PushAnnouncement) => {
    markNoticeAsRead(announcement.id);
    setReadIds(getReadNoticeIds());
    setIsOpen(false);
    if (onSelectAnnouncement) {
      onSelectAnnouncement(announcement);
    }
  };

  const handleMarkAllRead = () => {
    announcements.forEach((a) => markNoticeAsRead(a.id));
    setReadIds(getReadNoticeIds());
  };

  // Auto-sync device token if notification permission is already granted
  useEffect(() => {
    if (permission === 'granted') {
      const savedToken = getSavedDeviceToken();
      if (!savedToken) {
        requestPushPermissionAndGetToken(user).catch(() => {});
      }
    }
  }, [user, permission]);

  const handleEnablePush = async () => {
    setIsEnabling(true);
    setFeedback(null);
    const res = await requestPushPermissionAndGetToken(user);
    setIsEnabling(false);
    setPermission(getNotificationPermission());

    if (res.success) {
      setFeedback('Breaking news alerts are enabled on this device!');
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback(res.error || 'Could not enable push notifications on this browser.');
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const hasDeviceToken = Boolean(getSavedDeviceToken());

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="News Alerts & Announcements"
        title="News Alerts & Announcements"
        className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-teal-700 text-white border-teal-700 shadow-md ring-2 ring-teal-400/40'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
        }`}
      >
        <Bell className="w-4 h-4 sm:w-5 sm:h-5" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-5.5rem)] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-slate-800"
          role="dialog"
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-xl bg-teal-50 text-teal-700">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  News Alerts
                </h4>
                <p className="text-[10px] text-slate-400">
                  {unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'All alerts caught up'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer flex items-center space-x-1"
                title="Mark all as read"
              >
                <Check className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Real Push Notifications Device Permission Card */}
          <div className="p-3 mx-3 mt-2 rounded-2xl bg-gradient-to-r from-teal-50 via-slate-50 to-teal-50 border border-teal-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                <span className="text-[11px] font-black text-slate-900">
                  Breaking News Push Alerts
                </span>
              </div>

              {permission === 'granted' && hasDeviceToken ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Enabled</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                  Not enabled
                </span>
              )}
            </div>

            <p className="text-[10px] text-slate-600 leading-snug">
              Receive instant breaking news alerts from ISEZERANO ONLINE directly on your phone or desktop. No account required.
            </p>

            {permission !== 'granted' || !hasDeviceToken ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isEnabling}
                className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-extrabold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{isEnabling ? 'Enabling...' : 'Enable Breaking News Alerts'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  showLocalTestNotification(
                    'ISEZERANO ONLINE',
                    'News alerts are active and working on this device.'
                  );
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Volume2 className="w-3 h-3 text-teal-600" />
                <span>Test Alert Preview</span>
              </button>
            )}

            {feedback && (
              <div className="text-[10px] font-bold text-teal-800 bg-white p-1.5 rounded-lg border border-teal-200">
                {feedback}
              </div>
            )}
          </div>

          {/* Announcements List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2 px-1">
            {announcements.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  No news alerts published yet.
                </p>
              </div>
            ) : (
              announcements.map((item) => {
                const isRead = readIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenNotice(item)}
                    className={`p-3 rounded-2xl mx-2 my-1 transition-all cursor-pointer flex items-start space-x-3 hover:bg-teal-50/50 ${
                      !isRead ? 'bg-teal-50/30 font-semibold' : 'bg-white opacity-85'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-teal-50 border border-teal-200">
                        <Bell className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-900 truncate pr-2">
                          {item.title}
                        </h5>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                        {item.body}
                      </p>

                      <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(item.createdAt)}</span>
                        {(item.priority === 'high' || item.priority === 'urgent') && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-800">
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
