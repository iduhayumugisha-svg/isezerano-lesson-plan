import {
  AdsDisplaySettings,
  DEFAULT_ADS_DISPLAY_SETTINGS,
  MiniShopDisplaySettings,
  DEFAULT_MINI_SHOP_DISPLAY_SETTINGS
} from '../utils/displaySettingsUtils';

export type { AdsDisplaySettings, MiniShopDisplaySettings };
export { DEFAULT_ADS_DISPLAY_SETTINGS, DEFAULT_MINI_SHOP_DISPLAY_SETTINGS };

// ==================== ADS TYPES ====================
export type AdPlacement = 'below_header' | 'above_footer';
export type AdType = 'code' | 'banner';

export interface AdSlotConfig {
  enabled: boolean;
  type: AdType;
  code: string; // HTML, Script snippet, Google AdSense
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
  label?: string; // e.g. "Advertisement" or "Sponsored"
}

export interface AdsSettings {
  masterEnabled: boolean; // Master toggle: false by default
  belowHeaderAd: AdSlotConfig;
  aboveFooterAd: AdSlotConfig;
  displaySettings?: AdsDisplaySettings;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_ADS_SETTINGS: AdsSettings = {
  masterEnabled: false,
  belowHeaderAd: {
    enabled: false,
    type: 'banner',
    code: '',
    imageUrl: '',
    linkUrl: '',
    altText: 'Advertisement',
    label: 'Advertisement'
  },
  aboveFooterAd: {
    enabled: false,
    type: 'banner',
    code: '',
    imageUrl: '',
    linkUrl: '',
    altText: 'Advertisement',
    label: 'Advertisement'
  },
  displaySettings: DEFAULT_ADS_DISPLAY_SETTINGS
};

// ==================== AUTH & FIREBASE CONNECTION TYPES ====================
export type NavPage = 'home' | 'blog' | 'about' | 'contact' | 'privacy' | 'terms';
export type SaasNavPage = NavPage | 'admin';

export type UserRole = 'admin';
export type UserStatus = 'active' | 'inactive';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseConnectionConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
  enabled: boolean;
}

// ==================== ANNOUNCEMENTS & FCM TYPES ====================
export interface PushAnnouncement {
  id: string;
  title: string;
  body: string;
  sender: string;
  senderName: string;
  createdAt: string;
  target: 'all_readers' | string;
  targetCount: number;
  priority: 'normal' | 'high' | 'urgent';
  requiresAuth: boolean;
  actionUrl?: string;
  status: 'sent' | 'pending';
  icon?: string;
}

export interface DeviceTokenInfo {
  id: string;
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

export const DEFAULT_VAPID_KEY = 'BCw07Y8f_isezerano_default_vapid_key_placeholder';

// ==================== SLIDER & PRESET IMAGE TYPES ====================
export interface HeroSlide {
  id: string;
  headline: string;
  description: string;
  imageUrl: string;
  buttonText?: string;
  buttonLink?: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PresetImage {
  id: string;
  title: string;
  category: string;
  url: string;
}

// ==================== WEBSITE PAGES TYPES ====================
export type EditablePageId = 'home' | 'about' | 'contact' | 'privacy' | 'terms';

export interface PageSection {
  id: string;
  title: string;
  content: string;
  bullets?: string[];
  callout?: string;
}

export interface PageHighlightBox {
  enabled: boolean;
  badge?: string;
  title: string;
  content: string;
}

export interface ContactExtraData {
  schoolName: string;
  address: string;
  email: string;
  phone: string;
  whatsapp: string;
  workingHours: string;
}

export interface WebsitePageContent {
  id: EditablePageId;
  pageName: string;
  badge: string;
  title: string;
  subtitle: string;
  bodyHtml?: string;
  showContactForm?: boolean;
  highlightBox?: PageHighlightBox;
  sections: PageSection[];
  contactData?: ContactExtraData;
  isPublished: boolean;
  lastUpdated: string;
  updatedBy: string;
}

// ==================== MINI SHOP / PRODUCT SHOWCASE TYPES ====================
export interface MiniShopProduct {
  id: string;
  title: string;
  description: string;
  price?: string;
  imageUrl: string;
  imageStorageMode?: 'firebase_storage' | 'firestore_embedded';
  whatsappNumber?: string;
  phoneNumber?: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

