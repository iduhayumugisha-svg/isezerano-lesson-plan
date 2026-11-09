/**
 * Type definitions for Push Notifications and Announcements (FCM)
 * in ISEZERANO ONLINE – GS GITUMBA
 */

export interface PushAnnouncement {
  id: string;
  title: string;
  body: string;
  sender: string; // e.g. twizerefelix90@gmail.com
  senderName: string;
  createdAt: string; // ISO 8601
  target: 'all_teachers' | string;
  targetCount: number;
  priority: 'normal' | 'high' | 'urgent';
  requiresAuth: boolean;
  actionUrl?: string;
  status: 'sent' | 'pending';
  icon?: string;
}

export interface DeviceTokenInfo {
  id: string; // Encoded token key
  token: string;
  ownerUid: string;
  ownerEmail: string;
  ownerName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
}

export interface FcmConfigSettings {
  vapidKey: string;
  fcmEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

// Canonical Public VAPID Key placeholder or default
export const DEFAULT_VAPID_KEY = 'BCw07Y8f_isezerano_default_vapid_key_placeholder';
