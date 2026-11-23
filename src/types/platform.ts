import {
  AdsDisplaySettings,
  DEFAULT_ADS_DISPLAY_SETTINGS,
  TopVideoAdDisplaySettings,
  DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS
} from '../utils/displaySettingsUtils';

export type { AdsDisplaySettings, TopVideoAdDisplaySettings };
export {
  DEFAULT_ADS_DISPLAY_SETTINGS,
  DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS
};

// ==================== ADS TYPES ====================
export type AdPlacement = 'above_footer';
export type AdType = 'code' | 'banner';
export type AdProviderId = 'monetag' | 'adscod' | 'other';
export type InArticleAdSlotKey = 'slot1' | 'slot2' | 'slot3';
export type InArticleAdFormat = 'code' | 'direct_link';
export type HomepageInFeedAdSlotKey = 'slot1' | 'slot2' | 'slot3';

export interface AdSlotConfig {
  enabled: boolean;
  type: AdType;
  code: string; // HTML, Script snippet, Google AdSense
  imageUrl?: string;
  linkUrl?: string;
  altText?: string;
  label?: string; // e.g. "Advertisement" or "Sponsored"
}

export interface InArticleDirectLinkCardConfig {
  directLinkUrl: string;
  headline: string;
  description?: string;
  thumbnailUrl?: string;
  ctaText: string;
  disclosureLabel?: 'Advertisement' | 'Sponsored' | 'Kwamamaza';
}

export interface InArticleAdSlotConfig {
  enabled: boolean;
  provider: AdProviderId;
  providerLabel?: string; // Optional custom network label when provider === 'other'
  adFormat?: InArticleAdFormat; // 'code' (HTML/JS embed) or 'direct_link' (responsive sponsored card)
  code: string;
  directLinkCard?: InArticleDirectLinkCardConfig;
  afterParagraph: number; // Clamped integer 1..50 (defaults: 3, 7, 11)
  mobileEnabled: boolean;
  desktopEnabled: boolean;
  label?: string; // e.g. "Advertisement", "Sponsored", or "Kwamamaza"
  updatedAt?: string;
}

export interface InArticleAdsSettings {
  slot1: InArticleAdSlotConfig;
  slot2: InArticleAdSlotConfig;
  slot3: InArticleAdSlotConfig;
}

export interface HomepageInFeedAdSlotConfig {
  enabled: boolean;
  provider: AdProviderId;
  providerLabel?: string; // Optional custom network label when provider === 'other'
  code: string;
  afterPost: number; // Clamped integer 1..50 (defaults: 4, 8, 12)
  mobileEnabled: boolean;
  desktopEnabled: boolean;
  label?: string; // e.g. "Advertisement" or "Kwamamaza"
  updatedAt?: string;
}

export interface HomepageInFeedAdsSettings {
  slot1: HomepageInFeedAdSlotConfig;
  slot2: HomepageInFeedAdSlotConfig;
  slot3: HomepageInFeedAdSlotConfig;
}

export interface GlobalAdScriptConfig {
  enabled: boolean;
  provider: AdProviderId;
  providerLabel?: string;
  code: string; // Single-execution site-wide head tags (e.g., Monetag verification meta, in-page/non-popup native tags)
  mobileEnabled: boolean;
  desktopEnabled: boolean;
  updatedAt?: string;
}

export const IN_ARTICLE_PARAGRAPH_LIMITS = {
  min: 1,
  max: 50
} as const;

export const DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS: Record<InArticleAdSlotKey, number> = {
  slot1: 3,
  slot2: 7,
  slot3: 11
};

export const HOMEPAGE_IN_FEED_POSITION_LIMITS = {
  min: 1,
  max: 50
} as const;

export const DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS: Record<HomepageInFeedAdSlotKey, number> = {
  slot1: 4,
  slot2: 8,
  slot3: 12
};

export interface MonetagVignetteConfig {
  enabled: boolean;
  zoneId: string;
  scriptUrl: string;
  mobileEnabled: boolean;
  desktopEnabled: boolean;
  updatedAt?: string;
}

export interface MonetagInPagePushConfig {
  enabled: boolean;
  zoneId: string;
  scriptUrl: string;
  mobileEnabled: boolean;
  desktopEnabled: boolean;
  updatedAt?: string;
}

export const createDefaultInArticleDirectLinkCardConfig = (): InArticleDirectLinkCardConfig => ({
  directLinkUrl: '',
  headline: '',
  description: '',
  thumbnailUrl: '',
  ctaText: '',
  disclosureLabel: 'Sponsored'
});

export const createDefaultInArticleSlotConfig = (
  slotKey: InArticleAdSlotKey
): InArticleAdSlotConfig => ({
  enabled: false,
  provider: 'monetag',
  providerLabel: '',
  adFormat: 'code',
  code: '',
  directLinkCard: createDefaultInArticleDirectLinkCardConfig(),
  afterParagraph: DEFAULT_IN_ARTICLE_SLOT_PARAGRAPHS[slotKey],
  mobileEnabled: true,
  desktopEnabled: true,
  label: 'Advertisement'
});

export const DEFAULT_IN_ARTICLE_ADS_SETTINGS: InArticleAdsSettings = {
  slot1: createDefaultInArticleSlotConfig('slot1'),
  slot2: createDefaultInArticleSlotConfig('slot2'),
  slot3: createDefaultInArticleSlotConfig('slot3')
};

export const createDefaultHomepageInFeedSlotConfig = (
  slotKey: HomepageInFeedAdSlotKey
): HomepageInFeedAdSlotConfig => ({
  enabled: false,
  provider: 'monetag',
  providerLabel: '',
  code: '',
  afterPost: DEFAULT_HOMEPAGE_IN_FEED_SLOT_POSITIONS[slotKey],
  mobileEnabled: true,
  desktopEnabled: true,
  label: 'Advertisement'
});

export const DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS: HomepageInFeedAdsSettings = {
  slot1: createDefaultHomepageInFeedSlotConfig('slot1'),
  slot2: createDefaultHomepageInFeedSlotConfig('slot2'),
  slot3: createDefaultHomepageInFeedSlotConfig('slot3')
};

export const DEFAULT_GLOBAL_AD_SCRIPT_CONFIG: GlobalAdScriptConfig = {
  enabled: false,
  provider: 'monetag',
  providerLabel: '',
  code: '',
  mobileEnabled: true,
  desktopEnabled: true
};

export const DEFAULT_MONETAG_VIGNETTE_CONFIG: MonetagVignetteConfig = {
  enabled: false,
  zoneId: '',
  scriptUrl: '',
  mobileEnabled: true,
  desktopEnabled: true
};

export const DEFAULT_MONETAG_IN_PAGE_PUSH_CONFIG: MonetagInPagePushConfig = {
  enabled: false,
  zoneId: '',
  scriptUrl: '',
  mobileEnabled: true,
  desktopEnabled: true
};

export interface TopVideoAdConfig {
  enabled: boolean;
  vimeoUrl: string;
  videoId: string;
  playerEmbedUrl: string;
  title: string;
  label?: string;
  displaySettings?: TopVideoAdDisplaySettings;
  updatedAt?: string;
}

export const DEFAULT_TOP_VIDEO_AD_CONFIG: TopVideoAdConfig = {
  enabled: false,
  vimeoUrl: '',
  videoId: '',
  playerEmbedUrl: '',
  title: '',
  label: 'Sponsored Video',
  displaySettings: DEFAULT_TOP_VIDEO_AD_DISPLAY_SETTINGS
};

export interface AdsSettings {
  masterEnabled: boolean; // Master toggle: false by default
  /** @deprecated Removed from UI & layout; kept optional only for legacy Firestore migration */
  belowHeaderAd?: AdSlotConfig;
  aboveFooterAd: AdSlotConfig;
  vignetteAd?: MonetagVignetteConfig;
  inPagePushAd?: MonetagInPagePushConfig;
  inArticleAds?: InArticleAdsSettings;
  homepageInFeedAds?: HomepageInFeedAdsSettings;
  globalScripts?: GlobalAdScriptConfig;
  aboveHeaderVideoAd?: TopVideoAdConfig;
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
  vignetteAd: DEFAULT_MONETAG_VIGNETTE_CONFIG,
  inPagePushAd: DEFAULT_MONETAG_IN_PAGE_PUSH_CONFIG,
  inArticleAds: DEFAULT_IN_ARTICLE_ADS_SETTINGS,
  homepageInFeedAds: DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS,
  globalScripts: DEFAULT_GLOBAL_AD_SCRIPT_CONFIG,
  aboveHeaderVideoAd: DEFAULT_TOP_VIDEO_AD_CONFIG,
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
