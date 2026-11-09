import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Smartphone,
  Users,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Radio,
  Clock,
  Sparkles,
  Info,
  Laptop
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  sendPushAnnouncement,
  deletePushAnnouncement,
  subscribeAnnouncements,
  getAllRegisteredDeviceTokens,
  saveFcmVapidKey,
  getFcmVapidKey,
  sendLocalTestNotification,
  isPushNotificationSupported
} from '../services/fcmService';
import { PushAnnouncement, DeviceTokenInfo } from '../types/announcement';

interface AdminNotificationManagerProps {
  onSelectAnnouncement?: (announcement: PushAnnouncement) => void;
}

export const AdminNotificationManager: React.FC<AdminNotificationManagerProps> = ({
  onSelectAnnouncement
}) => {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === 'twizerefelix90@gmail.com';

  const [announcements, setAnnouncements] = useState<PushAnnouncement[]>([]);
  const [deviceTokens, setDeviceTokens] = useState<DeviceTokenInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = useState<boolean>(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('high');
  const [targetAudience, setTargetAudience] = useState<'all' | 'teachers'>('teachers');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [vapidKey, setVapidKey] = useState('');
  const [vapidSaved, setVapidSaved] = useState(false);
  const [supported, setSupported] = useState(true);

  // Check Web Push support on mount
  useEffect(() => {
    setSupported(isPushNotificationSupported());
    const currentKey = getFcmVapidKey();
    if (currentKey) {
      setVapidKey(currentKey);
    }
  }, []);

  // Subscribe to real-time announcements
  useEffect(() => {
    const unsubscribe = subscribeAnnouncements((items) => {
      setAnnouncements(items);
    });
    return () => unsubscribe();
  }, []);

  // Fetch registered devices
  const refreshDevices = async () => {
    if (!isAdmin) {
      setLoadingDevices(false);
      return;
    }
    setLoadingDevices(true);
    try {
      const tokens = await getAllRegisteredDeviceTokens();
      setDeviceTokens(tokens);
    } catch (err) {
      console.warn('Could not fetch device tokens:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      refreshDevices();
    }
  }, [isAdmin]);

  // Save VAPID key
  const handleSaveVapid = (e: React.FormEvent) => {
    e.preventDefault();
    saveFcmVapidKey(vapidKey.trim());
    setVapidSaved(true);
    setTimeout(() => setVapidSaved(false), 3000);
  };

  // Dispatch push announcement
  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setSendResult({
        success: false,
        message: 'Only authorized administrator (twizerefelix90@gmail.com) can broadcast notifications.'
      });
      return;
    }

    if (!title.trim() || !body.trim()) {
      setSendResult({
        success: false,
        message: 'Please provide both announcement title and message body.'
      });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const result = await sendPushAnnouncement(
        {
          title: title.trim(),
          body: body.trim(),
          priority,
          targetAudience
        },
        user?.email || 'twizerefelix90@gmail.com',
        user?.displayName || 'Administrator'
      );

      if (result.success) {
        setTitle('');
        setBody('');
        setSendResult({
          success: true,
          message: `Push announcement broadcasted successfully! Delivered to ${result.deliveredCount} registered device(s).`
        });
        refreshDevices();
      } else {
        setSendResult({
          success: false,
          message: result.error || 'Failed to dispatch push notification.'
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'An unexpected error occurred while sending notification.'
      });
    } finally {
      setIsSending(false);
    }
  };

  // Test local notification
  const handleTestLocal = async () => {
    const success = await sendLocalTestNotification(
      'Test Alert: ISEZERANO ONLINE',
      'This is an instant preview test of how your announcement appears on device screens.'
    );
    if (!success) {
      setSendResult({
        success: false,
        message: 'Notification permission not granted yet. Please allow notifications in your browser first.'
      });
    }
  };

  // Delete announcement
  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Are you sure you want to delete this notification record?')) {
      try {
        await deletePushAnnouncement(id);
      } catch (err) {
        console.warn('Delete notice error:', err);
      }
    }
  };

  // Unique teachers count from tokens
  const uniqueTeachersCount = new Set(deviceTokens.map((t) => t.ownerEmail).filter(Boolean)).size;

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
        <h3 className="text-lg font-bold">Access Restricted</h3>
        <p className="text-sm mt-1">
          Only the designated administrator (<strong>twizerefelix90@gmail.com</strong>) has permission
          to manage push notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner / System Status */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-400/30">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              Real Push Notifications (FCM)
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Broadcast System & Device Manager
            </h2>
            <p className="text-emerald-100/80 text-sm max-w-2xl">
              Send announcements directly to teacher phone and computer screens via Firebase Cloud
              Messaging. Notifications reach devices even when teachers are logged out or the website is closed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTestLocal}
              type="button"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl backdrop-blur-sm border border-white/20 transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              Preview On My Screen
            </button>
            <button
              onClick={refreshDevices}
              type="button"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDevices ? 'animate-spin' : ''}`} />
              Refresh Devices
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-emerald-700/50">
          <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40">
            <div className="text-emerald-300 text-xs font-medium flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Registered Devices
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 text-white">
              {deviceTokens.length}
            </div>
            <div className="text-[11px] text-emerald-200/60 mt-0.5">Active push targets</div>
          </div>

          <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40">
            <div className="text-emerald-300 text-xs font-medium flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Connected Teachers
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 text-white">
              {uniqueTeachersCount}
            </div>
            <div className="text-[11px] text-emerald-200/60 mt-0.5">Multi-device accounts</div>
          </div>

          <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40">
            <div className="text-emerald-300 text-xs font-medium flex items-center gap-1.5">
              <Bell className="w-4 h-4" /> Announcements Sent
            </div>
            <div className="text-2xl sm:text-3xl font-black mt-1 text-white">
              {announcements.length}
            </div>
            <div className="text-[11px] text-emerald-200/60 mt-0.5">Stored in Firestore</div>
          </div>

          <div className="bg-emerald-950/40 rounded-2xl p-4 border border-emerald-800/40">
            <div className="text-emerald-300 text-xs font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Auth Gate
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-emerald-200">
              Active
            </div>
            <div className="text-[11px] text-emerald-200/60 mt-0.5">Login required upon click</div>
          </div>
        </div>
      </div>

      {/* Main Broadcast Composer & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Broadcast Composer (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    Compose Push Announcement
                  </h3>
                  <p className="text-xs text-slate-500">
                    Delivered with ISEZERANO ONLINE branding and school logo
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                Admin: {user?.email}
              </span>
            </div>

            <form onSubmit={handleSendAnnouncement} className="mt-6 space-y-5">
              {/* Target & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="teachers">All Registered Teachers ({deviceTokens.length} devices)</option>
                    <option value="all">Entire School Community (Public)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="normal">Standard Announcement</option>
                    <option value="high">High Priority (Audible alert)</option>
                    <option value="urgent">Urgent / Immediate Action Required</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Staff Meeting Tomorrow at 8:00 AM or Term Reports Due"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Announcement Message *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete details. When teachers click the screen notification, they will be prompted to log in before viewing this full announcement."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                  <span>HTML / markdown supported in web view</span>
                  <span>{body.length} characters</span>
                </div>
              </div>

              {/* Status Alert */}
              {sendResult && (
                <div
                  className={`p-4 rounded-xl text-sm flex items-start gap-3 ${
                    sendResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {sendResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{sendResult.success ? 'Success' : 'Notice'}</p>
                    <p className="text-xs mt-0.5">{sendResult.message}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-slate-400" />
                  Notification appears instantly on online & lockscreen devices.
                </div>
                <button
                  type="submit"
                  disabled={isSending || !title.trim() || !body.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold px-7 py-3 rounded-xl transition-all shadow-md active:scale-95"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Broadcasting via FCM...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Broadcast Real Push Notification
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Past Announcements Feed */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800">
                    Sent Announcements History
                  </h4>
                  <p className="text-xs text-slate-500">
                    Live synchronization with all teachers & devices
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                {announcements.length} records
              </span>
            </div>

            {announcements.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium">No announcements broadcasted yet.</p>
                <p className="text-xs mt-0.5">Use the form above to dispatch your first push notification.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-4">
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    className="py-4 hover:bg-slate-50/60 rounded-xl px-2 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            item.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : item.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <h5 className="text-sm font-bold text-slate-800 hover:text-emerald-700 cursor-pointer"
                          onClick={() => onSelectAnnouncement?.(item)}
                        >
                          {item.title}
                        </h5>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {item.body}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>By {item.senderName || item.sender}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">
                          Target: {item.target === 'all_teachers' ? 'All Teachers' : item.target}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => onSelectAnnouncement?.(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        Preview Gate
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: FCM Settings & Connected Devices (1 col) */}
        <div className="space-y-6">
          {/* FCM VAPID Configuration Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  FCM Web Push Config
                </h4>
                <p className="text-[11px] text-slate-500">Firebase Cloud Messaging key</p>
              </div>
            </div>

            <form onSubmit={handleSaveVapid} className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Web Push Certificate (VAPID Key)
              </label>
              <textarea
                rows={3}
                placeholder="Paste VAPID public key from Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates"
                value={vapidKey}
                onChange={(e) => setVapidKey(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-mono rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />

              {vapidSaved && (
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Key updated successfully!
                </div>
              )}

              <div className="pt-1 flex items-center justify-between">
                <a
                  href="https://console.firebase.google.com/project/isezerano-news/settings/cloudmessaging"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  Firebase Console <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="submit"
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Save Key
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-amber-50/70 rounded-xl border border-amber-200/50 text-[11px] text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Note on Token Generation
              </div>
              <p>
                When VAPID key is configured, browsers generate verified tokens that route through Google FCM servers. A default key is pre-bundled for ISEZERANO ONLINE.
              </p>
            </div>
          </div>

          {/* Registered Devices List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-bold text-slate-800">
                  Registered Devices ({deviceTokens.length})
                </h4>
              </div>
              <button
                onClick={refreshDevices}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingDevices ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading devices...
              </div>
            ) : deviceTokens.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Smartphone className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                <p>No devices registered yet.</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Teachers register automatically when they click &apos;Enable Push Notifications&apos; in the header bell.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto mt-2 pr-1 space-y-1">
                {deviceTokens.map((dev) => (
                  <div key={dev.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {dev.deviceType === 'mobile' || dev.os === 'Android' || dev.os === 'iOS' ? (
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        {dev.ownerName || 'Teacher'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                        Active
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {dev.ownerEmail || 'Anonymous'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                      {dev.browser} • {dev.os}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
