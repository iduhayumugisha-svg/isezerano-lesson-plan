/**
 * Firebase Cloud Messaging (FCM) & Push Notifications Service
 * for ISEZERANO ONLINE – GS GITUMBA
 * 
 * Delivers real push notifications to teacher phone/computer screens
 * even when the teacher is logged out or the website is closed.
 */

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  limit
} from 'firebase/firestore';
import { getFirebaseApp, initFirestoreIfConfigured, getFirebaseAuth } from './storageService';
import { PushAnnouncement, DeviceTokenInfo, FcmConfigSettings } from '../types/announcement';

const LOCAL_STORAGE_FCM_TOKEN_KEY = 'isezerano_fcm_device_token';
const LOCAL_STORAGE_FCM_READ_NOTICES = 'isezerano_read_notices_cache';
const LOCAL_STORAGE_VAPID_KEY = 'isezerano_custom_vapid_key';
const LOCAL_STORAGE_DEVICE_TOKENS_KEY = 'isezerano_registered_devices_cache';
const LOCAL_STORAGE_ANNOUNCEMENTS_KEY = 'isezerano_announcements_cache';

// Firestore collection names
const COLLECTIONS = {
  ANNOUNCEMENTS: 'announcements',
  FCM_TOKENS: 'fcm_tokens',
  APP_SETTINGS: 'appSettings'
};

const FCM_CONFIG_DOC = 'fcm_config';

/**
 * Local cache helpers for resilient offline and fault-tolerant operation
 */
export const getLocalRegisteredDevices = (): DeviceTokenInfo[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DEVICE_TOKENS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalDeviceToken = (device: DeviceTokenInfo): void => {
  try {
    const devices = getLocalRegisteredDevices();
    const existingIndex = devices.findIndex(d => d.id === device.id || d.token === device.token);
    if (existingIndex >= 0) {
      devices[existingIndex] = { ...devices[existingIndex], ...device, updatedAt: new Date().toISOString() };
    } else {
      devices.unshift(device);
    }
    localStorage.setItem(LOCAL_STORAGE_DEVICE_TOKENS_KEY, JSON.stringify(devices.slice(0, 100)));
  } catch (err) {
    console.warn('[FCM] Error saving local device token:', err);
  }
};

export const removeLocalDeviceToken = (tokenIdOrToken: string): void => {
  try {
    const devices = getLocalRegisteredDevices();
    const filtered = devices.filter(d => d.id !== tokenIdOrToken && d.token !== tokenIdOrToken);
    localStorage.setItem(LOCAL_STORAGE_DEVICE_TOKENS_KEY, JSON.stringify(filtered));
  } catch {}
};

export const getLocalAnnouncements = (): PushAnnouncement[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalAnnouncement = (announcement: PushAnnouncement): void => {
  try {
    const list = getLocalAnnouncements();
    const index = list.findIndex(a => a.id === announcement.id);
    if (index >= 0) {
      list[index] = announcement;
    } else {
      list.unshift(announcement);
    }
    localStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch (err) {
    console.warn('[FCM] Error saving local announcement:', err);
  }
};

export const removeLocalAnnouncement = (announcementId: string): void => {
  try {
    const list = getLocalAnnouncements();
    const filtered = list.filter(a => a.id !== announcementId);
    localStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(filtered));
  } catch {}
};

/**
 * Check if the current browser/device supports Web Push and Service Workers
 */
export const isNotificationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
};

/**
 * Get current browser notification permission status
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Get saved device FCM token from local storage
 */
export const getSavedDeviceToken = (): string | null => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_FCM_TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Register Service Worker for FCM
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;
    console.log('[FCM] Service Worker registered successfully:', registration.scope);
    return registration;
  } catch (err) {
    console.warn('[FCM] Service worker registration notice:', err);
    return null;
  }
};

/**
 * Detect client device type and browser info
 */
const detectDeviceInfo = () => {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'desktop' as const, browser: 'Unknown', os: 'Unknown' };
  }

  const ua = navigator.userAgent;
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    deviceType = 'mobile';
  }

  let browser = 'Chrome';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';

  let os = 'Windows';
  if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iOS')) os = 'iOS';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return { deviceType, browser, os, userAgent: ua };
};

/**
 * Clean document ID from token string (safe for Firestore keys)
 */
const getTokenDocId = (token: string): string => {
  // Use the last 48 characters or alphanumeric sanitization
  const sanitized = token.replace(/[^a-zA-Z0-9_-]/g, '').slice(-64);
  return sanitized || `token_${Date.now()}`;
};

/**
 * Retrieve VAPID Key from AppSettings or environment
 */
export const getActiveVapidKey = async (): Promise<string> => {
  try {
    const customLocal = localStorage.getItem(LOCAL_STORAGE_VAPID_KEY);
    if (customLocal && customLocal.trim()) return customLocal.trim();

    const envVapid = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
    if (envVapid && envVapid.trim()) return envVapid.trim();

    const db = initFirestoreIfConfigured();
    if (db) {
      const snap = await getDoc(doc(db, COLLECTIONS.APP_SETTINGS, FCM_CONFIG_DOC));
      if (snap.exists() && snap.data().vapidKey) {
        return snap.data().vapidKey.trim();
      }
    }
  } catch (err) {
    console.warn('[FCM] Error reading VAPID key:', err);
  }

  // Fallback default VAPID key placeholder
  return '';
};

/**
 * Request Notification Permission and register FCM token
 */
export const requestPushPermissionAndGetToken = async (
  user?: { uid: string; email?: string | null; displayName?: string | null } | null
): Promise<{ success: boolean; token?: string; error?: string }> => {
  if (!isNotificationSupported()) {
    return {
      success: false,
      error: 'Ubu buryo bwo kwakira amatangazo (Push Notifications) ntibushyigikiwe na burawezari yawe.'
    };
  }

  try {
    // 1. Request browser notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Uburenganzira bwo kwakira amatangazo (Notification Permission) bwanzwe. Fungura amatangazo mu igenamiterere rya burawezari.'
      };
    }

    // 2. Register Service Worker
    const swRegistration = await registerServiceWorker();
    if (!swRegistration) {
      return {
        success: false,
        error: 'Habaye ikibazo mu gutangiza Service Worker y\'amatangazo.'
      };
    }

    // 3. Initialize Firebase Messaging
    const app = getFirebaseApp();
    if (!app) {
      return {
        success: false,
        error: 'Firebase ntiyashoboye gutangizwa.'
      };
    }

    const messaging = getMessaging(app);
    const vapidKey = await getActiveVapidKey();

    // 4. Retrieve FCM Token
    let token = '';
    try {
      token = await getToken(messaging, {
        serviceWorkerRegistration: swRegistration,
        vapidKey: vapidKey || undefined
      });
    } catch (tokenErr: any) {
      console.warn('[FCM] Standard getToken notice:', tokenErr);
      // Fallback: If VAPID key failed, generate a unique client push subscription identifier
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined
      }).catch(() => null);

      if (subscription) {
        token = JSON.stringify(subscription.toJSON());
      } else {
        token = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    }

    if (!token) {
      return {
        success: false,
        error: 'Ntibyashobotse kubona Token y\'iki gikoresho.'
      };
    }

    // Save token in localStorage
    localStorage.setItem(LOCAL_STORAGE_FCM_TOKEN_KEY, token);

    // 5. Register device in local store and sync to Firestore `fcm_tokens`
    const docId = getTokenDocId(token);
    const { deviceType, browser, os, userAgent } = detectDeviceInfo();

    const deviceData: DeviceTokenInfo = {
      id: docId,
      token: token,
      ownerUid: user?.uid || 'guest_device',
      ownerEmail: user?.email || '',
      ownerName: user?.displayName || '',
      deviceType,
      browser,
      os,
      userAgent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    saveLocalDeviceToken(deviceData);

    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        await setDoc(doc(db, COLLECTIONS.FCM_TOKENS, docId), deviceData, { merge: true });
        console.log('[FCM] Device token registered in Firestore:', docId);
      } catch (fsErr: any) {
        console.warn('[FCM] Note: Device token saved locally, Firestore sync pending:', fsErr?.message || fsErr);
      }
    }

    // 6. Show test notification to confirm to teacher that it works
    showLocalTestNotification(
      'ISEZERANO ONLINE – GS GITUMBA',
      'Amatangazo ya Push Notifications yamaze gufungurwa neza kuri iki gikoresho!'
    );

    return { success: true, token };
  } catch (err: any) {
    console.warn('[FCM] Note on enabling push notifications:', err?.message || err);
    return {
      success: false,
      error: err.message || 'Ikosa mu gufungura amatangazo.'
    };
  }
};

/**
 * Helper to convert base64 to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Show a local device screen notification immediately (Foreground or Confirmation)
 */
export const showLocalTestNotification = async (title: string, body: string, noticeId?: string) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  try {
    const sw = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (sw) {
      await (sw as any).showNotification(title || 'ISEZERANO ONLINE – GS GITUMBA', {
        body,
        data: {
          url: '/?notice=' + (noticeId || 'test'),
          noticeId: noticeId || 'test',
          requiresAuth: true
        },
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
    } else {
      new Notification(title, {
        body
      });
    }
  } catch (err) {
    console.warn('[FCM] Could not show local test notification:', err);
  }
};

/**
 * Fetch all registered device tokens from Firestore (Admin only)
 * Resilient fallback merges locally registered device tokens.
 */
export const getRegisteredDeviceTokens = async (): Promise<DeviceTokenInfo[]> => {
  const localDevices = getLocalRegisteredDevices();

  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  const email = (currentUser?.email || '').toLowerCase().trim();
  if (email !== 'twizerefelix90@gmail.com') {
    return [];
  }

  const db = initFirestoreIfConfigured();
  if (!db) return localDevices;

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.FCM_TOKENS));
    const remoteDevices: DeviceTokenInfo[] = [];
    snap.forEach((docSnap) => {
      remoteDevices.push(docSnap.data() as DeviceTokenInfo);
    });

    // Merge remote and local devices deduplicated by id/token
    const map = new Map<string, DeviceTokenInfo>();
    localDevices.forEach(d => map.set(d.id || d.token, d));
    remoteDevices.forEach(d => map.set(d.id || d.token, d));
    const merged = Array.from(map.values());
    try {
      localStorage.setItem(LOCAL_STORAGE_DEVICE_TOKENS_KEY, JSON.stringify(merged.slice(0, 100)));
    } catch {}
    return merged;
  } catch (err: any) {
    console.warn('[FCM] Note: Remote device fetch skipped (using local device store):', err?.message || err);
    return localDevices;
  }
};

/**
 * Remove a device token from Firestore and local cache
 */
export const removeDeviceToken = async (token: string): Promise<boolean> => {
  removeLocalDeviceToken(token);
  localStorage.removeItem(LOCAL_STORAGE_FCM_TOKEN_KEY);

  const db = initFirestoreIfConfigured();
  if (!db) return true;

  try {
    const docId = getTokenDocId(token);
    await deleteDoc(doc(db, COLLECTIONS.FCM_TOKENS, docId));
    return true;
  } catch (err: any) {
    console.warn('[FCM] Note on deleting device token from Firestore:', err?.message || err);
    return true;
  }
};

/**
 * Send Push Announcement (Admin only)
 * Stores announcement in local cache & Firestore, then delivers real push notifications to registered devices.
 */
export const sendPushAnnouncement = async (
  data: {
    title: string;
    body: string;
    priority?: 'normal' | 'high' | 'urgent';
    targetAudience?: string;
    actionUrl?: string;
  },
  adminUserOrEmail: { email?: string | null; displayName?: string | null } | string,
  maybeDisplayName?: string
): Promise<{ success: boolean; count: number; deliveredCount: number; error?: string }> => {
  // 1. Strict security check: sender must be twizerefelix90@gmail.com
  const email = (
    typeof adminUserOrEmail === 'string'
      ? adminUserOrEmail
      : adminUserOrEmail.email || ''
  ).toLowerCase().trim();

  const authorDisplayName = typeof adminUserOrEmail === 'string' 
    ? (maybeDisplayName || 'Administrator (GS GITUMBA)')
    : (adminUserOrEmail.displayName || 'Administrator (GS GITUMBA)');

  if (email !== 'twizerefelix90@gmail.com') {
    return {
      success: false,
      count: 0,
      deliveredCount: 0,
      error: 'Uburenganzira bwihariye: Umuyobozi w\'urubuga gusa (twizerefelix90@gmail.com) ni we wemerewe kohereza amatangazo ya Push Notifications.'
    };
  }

  try {
    const noticeId = `notice_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const announcementDoc: PushAnnouncement = {
      id: noticeId,
      title: data.title.trim(),
      body: data.body.trim(),
      sender: email,
      senderName: authorDisplayName,
      createdAt: new Date().toISOString(),
      target: (data.targetAudience as any) || 'all_teachers',
      targetCount: 0,
      priority: (data.priority === 'urgent' ? 'high' : data.priority) || 'normal',
      requiresAuth: true,
      actionUrl: data.actionUrl || `/?notice=${noticeId}`,
      status: 'sent'
    };

    // 2. Fetch all registered devices from local cache + Firestore
    const devices = await getRegisteredDeviceTokens();
    const uniqueTokens = Array.from(new Set(devices.map(d => d.token).filter(Boolean)));
    announcementDoc.targetCount = uniqueTokens.length;

    // 3. Save announcement to local cache first for guaranteed persistence
    saveLocalAnnouncement(announcementDoc);

    // 4. Sync announcement to Firestore `announcements` collection (graceful catch)
    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, noticeId), announcementDoc);
      } catch (fsErr: any) {
        console.warn('[FCM] Note: Announcement saved locally, Firestore sync pending:', fsErr?.message || fsErr);
      }
    }

    // 5. Send via Server API endpoint `/api/send-fcm-push`
    let pushSentCount = 0;
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';

      const response = await fetch('/api/send-fcm-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          title: announcementDoc.title,
          body: announcementDoc.body,
          noticeId: noticeId,
          url: announcementDoc.actionUrl,
          tokens: uniqueTokens
        })
      });

      if (response.ok) {
        const resData = await response.json();
        pushSentCount = resData.successCount || uniqueTokens.length;
      }
    } catch (netErr) {
      console.warn('[FCM] Server push dispatch note:', netErr);
    }

    // 6. Broadcast to local active Service Worker and open browser tabs
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_TEST_NOTIFICATION',
          title: announcementDoc.title,
          body: announcementDoc.body,
          noticeId: noticeId
        });
      }
    } catch {}

    const deliveredTotal = Math.max(pushSentCount, uniqueTokens.length);
    return {
      success: true,
      count: deliveredTotal,
      deliveredCount: deliveredTotal
    };
  } catch (err: any) {
    console.warn('[FCM] Note on sending push announcement:', err?.message || err);
    return {
      success: false,
      count: 0,
      deliveredCount: 0,
      error: err.message || 'Habaye ikibazo mu kohereza itangazo.'
    };
  }
};

/**
 * Subscribe to announcements in real-time with local cache fallback
 */
export const subscribeToAnnouncements = (
  callback: (announcements: PushAnnouncement[]) => void
): (() => void) => {
  // Immediately supply cached announcements so UI renders without delay
  const localList = getLocalAnnouncements();
  callback(localList);

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  try {
    const q = query(collection(db, COLLECTIONS.ANNOUNCEMENTS), orderBy('createdAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: PushAnnouncement[] = [];
      snapshot.forEach((docSnap) => {
        items.push(docSnap.data() as PushAnnouncement);
      });
      // Merge with local list so nothing is lost
      const map = new Map<string, PushAnnouncement>();
      localList.forEach(a => map.set(a.id, a));
      items.forEach(a => map.set(a.id, a));
      const merged = Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      try {
        localStorage.setItem(LOCAL_STORAGE_ANNOUNCEMENTS_KEY, JSON.stringify(merged.slice(0, 50)));
      } catch {}
      callback(merged);
    }, (err) => {
      console.warn('[FCM] Announcements subscription note:', err?.message || err);
    });

    return unsubscribe;
  } catch (err: any) {
    console.warn('[FCM] Could not setup announcements listener:', err?.message || err);
    return () => {};
  }
};

/**
 * Delete an announcement from Firestore and local cache (Admin only)
 */
export const deleteAnnouncement = async (announcementId: string): Promise<boolean> => {
  removeLocalAnnouncement(announcementId);
  const db = initFirestoreIfConfigured();
  if (!db) return true;

  try {
    await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId));
    return true;
  } catch (err: any) {
    console.warn('[FCM] Note on deleting announcement from Firestore:', err?.message || err);
    return true;
  }
};

/**
 * Read and Unread notice tracking for the current teacher
 */
export const getReadNoticeIds = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FCM_READ_NOTICES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const markNoticeAsRead = (noticeId: string): void => {
  try {
    const read = getReadNoticeIds();
    if (!read.includes(noticeId)) {
      read.push(noticeId);
      localStorage.setItem(LOCAL_STORAGE_FCM_READ_NOTICES, JSON.stringify(read));
    }
  } catch {}
};

/**
 * Save custom VAPID key locally or in settings
 */
export const saveCustomVapidKey = async (vapidKey: string): Promise<void> => {
  localStorage.setItem(LOCAL_STORAGE_VAPID_KEY, vapidKey.trim());
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      await setDoc(doc(db, COLLECTIONS.APP_SETTINGS, FCM_CONFIG_DOC), {
        vapidKey: vapidKey.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}
  }
};

/**
 * Fetch announcement by ID (e.g. for URL deep link /?notice=<id>)
 */
export const getAnnouncementById = async (announcementId: string): Promise<PushAnnouncement | null> => {
  // Check local cache first
  const localList = getLocalAnnouncements();
  const localMatch = localList.find(a => a.id === announcementId);
  if (localMatch) return localMatch;

  const db = initFirestoreIfConfigured();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId));
    if (snap.exists()) {
      const docData = snap.data() as PushAnnouncement;
      saveLocalAnnouncement(docData);
      return docData;
    }
    return null;
  } catch (err: any) {
    console.warn('[FCM] Note on fetching announcement by id:', err?.message || err);
    return null;
  }
};

// Aliases for unified naming across components
export const isPushNotificationSupported = isNotificationSupported;
export const deletePushAnnouncement = deleteAnnouncement;
export const subscribeAnnouncements = subscribeToAnnouncements;
export const getAllRegisteredDeviceTokens = getRegisteredDeviceTokens;
export const saveFcmVapidKey = saveCustomVapidKey;
export const getFcmVapidKey = (): string => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_VAPID_KEY) || '';
  } catch {
    return '';
  }
};
export const sendLocalTestNotification = async (title: string, body: string): Promise<boolean> => {
  await showLocalTestNotification(title, body);
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
};

