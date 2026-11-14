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
  }
};

// ==================== ANNOUNCEMENTS & FCM TYPES ====================
export interface PushAnnouncement {
  id: string;
  title: string;
  body: string;
  sender: string;
  senderName: string;
  createdAt: string;
  target: 'all_teachers' | string;
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

// ==================== SLIDER TYPES ====================
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

// ==================== TEACHER PROFILE TYPES ====================
export type TeacherGender = 'Gabo' | 'Gore' | 'Other' | '';

export interface TeacherProfile {
  id?: string;
  ownerUid: string;
  email: string;
  fullName: string;
  phone: string;
  gender: TeacherGender;
  schoolName: string;
  qualification: string;
  subjectsTaught: string[];
  classesTaught: string[];
  experienceYears?: string;
  district?: string;
  sector?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const RWANDA_CBC_SUBJECTS = [
  'Kinyarwanda',
  'English',
  'Mathematics',
  'Science & Elementary Technology (SET)',
  'Social and Religious Studies (SRS)',
  'Creative Arts',
  'Physical Education',
  'French',
  'Biology',
  'Chemistry',
  'Physics',
  'Geography',
  'History & Citizenship',
  'Entrepreneurship',
  'Information & Communication Technology (ICT)',
  'Literature in English',
  'General Studies & Communication'
];

export const RWANDA_EDUCATION_CLASSES = [
  'N1', 'N2', 'N3',
  'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6'
];

export const TEACHING_QUALIFICATIONS = [
  'A2 – Secondary Teacher Certificate (TTC)',
  'A1 – Higher Education Diploma in Education',
  'A0 – Bachelor of Education (B.Ed)',
  'Postgraduate Diploma in Education (PGDE)',
  'Master of Education (M.Ed)',
  'Bachelor of Science / Arts with Education',
  'PhD in Education',
  'Other Professional Certificate'
];

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
  highlightBox?: PageHighlightBox;
  sections: PageSection[];
  contactData?: ContactExtraData;
  isPublished: boolean;
  lastUpdated: string;
  updatedBy: string;
}
