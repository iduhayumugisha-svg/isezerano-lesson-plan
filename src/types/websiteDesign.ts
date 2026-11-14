import {
  WhatsAppButtonPosition,
  WhatsAppButtonSize,
  WhatsAppButtonShape,
  WhatsAppButtonDisplayMode,
  WhatsAppContactSettings,
  DEFAULT_WHATSAPP_CONTACT
} from '../utils/whatsappUtils';

export type {
  WhatsAppButtonPosition,
  WhatsAppButtonSize,
  WhatsAppButtonShape,
  WhatsAppButtonDisplayMode,
  WhatsAppContactSettings
};
export { DEFAULT_WHATSAPP_CONTACT };

export interface WebsiteColorSettings {
  // Header and Navigation Bar
  headerBg: string;           // Header background color
  headerText: string;         // Header title and text
  headerBorder: string;       // Border below header
  navLinkHover: string;       // Navigation link hover tint
  navLinkActive: string;      // Active navigation item highlight

  // Website Body and Page Background
  bodyBg: string;             // Overall page background
  bodyText: string;           // Standard body text
  mutedText: string;          // Muted labels and subtitles

  // Main Content Sections and Cards
  cardBg: string;             // Cards, panels and containers
  cardBorder: string;         // Borders of content cards
  accentBg: string;           // Highlighted pill or alert background

  // Buttons, Links, and Forms
  primaryButtonBg: string;    // Main CTA buttons (Dashboard, Save, Export)
  primaryButtonText: string;  // Text on primary buttons
  secondaryButtonBg: string;  // Secondary buttons
  secondaryButtonText: string;// Text on secondary buttons
  linkColor: string;          // Hyperlinks
  formInputBorder: string;    // Form input borders
  formFocusRing: string;      // Form input focus outline color

  // Footer Background and Footer Text
  footerBg: string;           // Footer background
  footerHeadingText: string;  // Footer section headings
  footerBodyText: string;     // Footer descriptions and body
  footerLinkColor: string;    // Footer links and staff badge

  // Headings and Paragraph Text
  headingPrimary: string;     // H1 and main section headings
  headingSecondary: string;   // H2, H3 and sub-headings

  // Sidebars and Additional Sections
  sidebarBg: string;          // Side drawer or menu background
  sidebarText: string;        // Sidebar text
  accentBadgeBg: string;      // Badge backgrounds
  accentBadgeText: string;    // Badge text
}

export interface WebsiteTypographySettings {
  // Font Families
  fontFamily: string;         // Body font family (e.g., Times New Roman, Georgia, Inter, etc.)
  headingFontFamily: string;  // Headings font family

  // Font Sizes (in px, with strict responsive scaling)
  websiteTitleSize: number;   // Header platform title (16px - 32px)
  websiteSubtitleSize: number;// Header subtitle (10px - 18px)
  navMenuSize: number;        // Top navigation links (12px - 18px)
  h1Size: number;             // Main page title (24px - 48px)
  h2Size: number;             // Section headings (18px - 36px)
  h3Size: number;             // Sub-headings (14px - 24px)
  bodySize: number;           // Paragraph and table body (13px - 20px)
  buttonSize: number;         // Buttons and form inputs (12px - 18px)
  footerSize: number;         // Footer text and copyright (11px - 16px)

  // Typography Weights & Line Spacing
  headingWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  bodyWeight: 'normal' | 'medium';
  lineHeight: 'tight' | 'normal' | 'relaxed';

  // Global Website Font Scale (Ingano y'Inyuguti kuri Website Yose)
  fontScale: number;          // Relative scale factor (0.80 to 1.50, default: 1.0)
  fontSizePreset: 'small' | 'normal' | 'medium' | 'large' | 'extra-large';
}

export interface WebsiteLogoSettings {
  logoUrl: string;            // URL or base64 data URI of the logo
  isCustomLogo: boolean;      // True if user uploaded/selected custom logo
  displayHeight: number;      // Height in px (28px - 84px)
  displayFit: 'contain' | 'cover'; // Aspect ratio fit style
  borderRadius: 'rounded-xl' | 'rounded-lg' | 'rounded-full' | 'rounded-none';
  altText: string;            // Accessible alt description
  showInHeader: boolean;      // Show in top navigation bar
  showInFooter: boolean;      // Show in footer brand section
  showInAdminGateway: boolean;// Show in admin login card
  showInSidebar: boolean;     // Show in mobile drawer and sidebar
  updateFavicon: boolean;     // Dynamically sync browser tab favicon
}

export interface WebsiteBrandingSettings {
  platformTitle: string;          // Main website name in header, footer, meta
  platformSubtitle: string;       // Subtitle (e.g. GS GITUMBA)
  websiteDescription: string;     // Public website description displayed in branding & SEO metadata
  showWebsiteName: boolean;       // Visibility toggle: show/hide website name on public website
  showWebsiteDescription: boolean;// Visibility toggle: show/hide website description on public website
  schoolName: string;             // School name
  schoolLocation: string;         // School location (Sector, District, Province)
  headerAnnouncement: string;     // Top banner announcement text
  headerAnnouncementEnabled: boolean; // Whether top announcement is active
  footerTagline: string;          // Footer description/tagline
  footerCopyright: string;        // Copyright statement in footer
  homepageWelcomeHeadline?: string; // Optional custom administrator headline
  homepageCustomNote?: string;      // Optional custom administrator note/content
  lessonPlanCardTitle?: string;    // Custom title for Lesson Plan card
  lessonPlanCardDescription?: string; // Custom description for Lesson Plan card
  reportCardTitle?: string;        // Custom title for Report Card card
  reportCardDescription?: string;  // Custom description for Report Card card
}

export interface AnnouncementItem {
  id: string;
  text: string;
  linkUrl?: string; // Optional internal (/blog/slug) or external URL
  badge?: string;   // Optional badge (e.g. "AMAKURU", "UBUREZI", "URWANDA", "CBC")
  active?: boolean; // Whether this specific message is active
}

export interface AnnouncementStripSettings {
  enabled: boolean;
  messages: AnnouncementItem[];
  
  // Animation & Behavior
  transitionEffect: 'slide' | 'fade'; // Slide or Fade animation
  rotationIntervalSeconds: number;     // Seconds between auto-rotations (e.g. 5)
  pauseOnHover: boolean;
  showDismissButton: boolean;
  showNavigationArrows: boolean;
  showBadgePill: boolean;

  // Typography & Appearance
  fontSize: number;                   // In px: 11px to 18px (default 13)
  fontFamily: string;                 // Font family string
  textColor: string;                  // Hex code, e.g. #ffffff
  backgroundColor: string;            // Hex code, e.g. #0f766e
  textAlign: 'left' | 'center' | 'right';
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  heightPadding: 'compact' | 'normal' | 'spacious';
}

export type SectionType = 
  | 'masthead' 
  | 'hero' 
  | 'quick_tools' 
  | 'school_profile' 
  | 'announcement_banner' 
  | 'callout' 
  | 'rich_text' 
  | 'custom_cards' 
  | 'faq' 
  | 'contact_card';

export interface SectionCardItem {
  id: string;
  title: string;
  description: string;
  badge?: string;
  icon?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonStyle?: 'primary' | 'secondary' | 'amber' | 'outline';
  items?: string[];
}

export interface SectionCustomContent {
  headline?: string;
  subheadline?: string;
  bodyText?: string;
  badgeText?: string;
  bgStyle?: 'default' | 'white' | 'slate_dark' | 'teal_gradient' | 'amber_soft' | 'blue_soft';
  textColor?: string;
  customBgColor?: string;
  customTextColor?: string;
  imageUrl?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  cards?: SectionCardItem[];
  itemsList?: string[];
}

export interface HomepageSectionConfig {
  id: string;
  type?: SectionType;
  label: string;
  description: string;
  enabled: boolean;
  order: number;
  options?: Record<string, boolean>;
  content?: SectionCustomContent;
}

export interface NavigationMenuItem {
  id: string;
  label: string;
  path: string; // 'home' | 'dashboard' | 'create' | 'saved' | 'nursery' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin' | 'profile' or custom URL
  isExternal?: boolean;
  icon?: string; // 'Home' | 'BookOpen' | 'Award' | 'ShieldCheck' | 'FileText' | 'GraduationCap' | 'User' | 'Compass' | 'MapPin'
  badge?: string;
  badgeColor?: 'teal' | 'amber' | 'blue' | 'rose';
  enabled: boolean;
  order: number;
  openInNewTab?: boolean;
  location: 'header' | 'footer' | 'both';
}

export interface WebsiteDesignVersion {
  id: string;
  timestamp: string;
  publishedBy: string;
  note?: string;
  snapshot: WebsiteDesignSettings;
}

export interface WebsiteDesignSettings {
  branding: WebsiteBrandingSettings;
  colors: WebsiteColorSettings;
  typography: WebsiteTypographySettings;
  logo: WebsiteLogoSettings;
  announcements?: AnnouncementStripSettings;
  homepageSections?: HomepageSectionConfig[];
  navigationMenus?: NavigationMenuItem[];
  whatsappContact?: WhatsAppContactSettings;
  versionHistory?: WebsiteDesignVersion[];
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_WEBSITE_BRANDING: WebsiteBrandingSettings = {
  platformTitle: 'ISEZERANO ONLINE',
  platformSubtitle: 'GS GITUMBA',
  websiteDescription: 'ISEZERANO ONLINE – Rwanda CBC lesson planning, nursery report cards, education resources and articles for teachers and educators.',
  showWebsiteName: true,
  showWebsiteDescription: true,
  schoolName: 'GS GITUMBA',
  schoolLocation: 'Buyoga Sector, Rulindo District, Northern Province, Rwanda',
  headerAnnouncement: '',
  headerAnnouncementEnabled: false,
  footerTagline: 'GS GITUMBA, Buyoga Sector, Rulindo District, Northern Province, Rwanda.',
  footerCopyright: '© 2026 ISEZERANO ONLINE – GS GITUMBA. All rights reserved.',
  homepageWelcomeHeadline: '',
  homepageCustomNote: '',
  lessonPlanCardTitle: 'Lesson Plan',
  lessonPlanCardDescription: '',
  reportCardTitle: 'Report Card',
  reportCardDescription: ''
};

export const DEFAULT_WEBSITE_COLORS: WebsiteColorSettings = {
  headerBg: '#ffffff',
  headerText: '#0f172a',
  headerBorder: '#e2e8f0',
  navLinkHover: '#0d9488',
  navLinkActive: '#0f766e',

  bodyBg: '#f8fafc',
  bodyText: '#1e293b',
  mutedText: '#64748b',

  cardBg: '#ffffff',
  cardBorder: '#e2e8f0',
  accentBg: '#f0fdfa',

  primaryButtonBg: '#0f766e',
  primaryButtonText: '#ffffff',
  secondaryButtonBg: '#0f172a',
  secondaryButtonText: '#ffffff',
  linkColor: '#0f766e',
  formInputBorder: '#cbd5e1',
  formFocusRing: '#14b8a6',

  footerBg: '#090e1a',
  footerHeadingText: '#ffffff',
  footerBodyText: '#94a3b8',
  footerLinkColor: '#2dd4bf',

  headingPrimary: '#0f172a',
  headingSecondary: '#334155',

  sidebarBg: '#0f172a',
  sidebarText: '#ffffff',
  accentBadgeBg: '#ccfbf1',
  accentBadgeText: '#115e59'
};

export const DEFAULT_WEBSITE_TYPOGRAPHY: WebsiteTypographySettings = {
  fontFamily: "'Times New Roman', Times, Baskerville, Georgia, serif",
  headingFontFamily: "'Times New Roman', Times, Baskerville, Georgia, serif",
  websiteTitleSize: 20,
  websiteSubtitleSize: 12,
  navMenuSize: 14,
  h1Size: 36,
  h2Size: 24,
  h3Size: 18,
  bodySize: 15,
  buttonSize: 14,
  footerSize: 13,
  headingWeight: 'bold',
  bodyWeight: 'normal',
  lineHeight: 'normal',
  fontScale: 1.0,
  fontSizePreset: 'normal'
};

export const DEFAULT_ANNOUNCEMENT_STRIP: AnnouncementStripSettings = {
  enabled: true,
  messages: [
    {
      id: 'ann-1',
      text: 'Ikaze kuri ISEZERANO ONLINE – Soma amakuru yizewe kandi utegure imfashanyigisho za CBC!',
      badge: 'AMAKURU',
      active: true
    },
    {
      id: 'ann-2',
      text: 'Urubuga rw’umwimerere rwubatswe na mwarimu wa GS GITUMBA (Buyoga, Rulindo) gufasha abarezi b’u Rwanda.',
      badge: 'UBUREZI',
      active: true
    },
    {
      id: 'ann-3',
      text: 'Integanyanyigisho na Porogaramu y’Amasomo byubahirije amabwiriza ya REB & MINEDUC 2026.',
      badge: 'CBC 2026',
      active: true
    }
  ],
  transitionEffect: 'slide',
  rotationIntervalSeconds: 5,
  pauseOnHover: true,
  showDismissButton: true,
  showNavigationArrows: true,
  showBadgePill: true,
  fontSize: 13,
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  textColor: '#ffffff',
  backgroundColor: '#0f766e',
  textAlign: 'center',
  fontWeight: 'semibold',
  heightPadding: 'normal'
};

export const DEFAULT_WEBSITE_LOGO: WebsiteLogoSettings = {
  logoUrl: '',
  isCustomLogo: false,
  displayHeight: 48,
  displayFit: 'cover',
  borderRadius: 'rounded-xl',
  altText: 'ISEZERANO ONLINE – GS GITUMBA Logo',
  showInHeader: true,
  showInFooter: true,
  showInAdminGateway: true,
  showInSidebar: true,
  updateFavicon: true
};

export const DEFAULT_NAVIGATION_MENUS: NavigationMenuItem[] = [
  {
    id: 'nav-home',
    label: 'Ahabanza (Home)',
    path: 'home',
    enabled: true,
    order: 1,
    location: 'both'
  },
  {
    id: 'nav-lesson-prep',
    label: 'Lesson Preparation',
    path: 'dashboard',
    icon: 'BookOpen',
    badge: 'CBC',
    badgeColor: 'teal',
    enabled: true,
    order: 2,
    location: 'both'
  },
  {
    id: 'nav-report-cards',
    label: 'Report Cards',
    path: 'nursery',
    icon: 'Award',
    badge: 'N1-N3',
    badgeColor: 'amber',
    enabled: true,
    order: 3,
    location: 'both'
  },
  {
    id: 'nav-blog',
    label: 'Blog & Articles',
    path: 'blog',
    icon: 'FileText',
    enabled: true,
    order: 4,
    location: 'both'
  },
  {
    id: 'nav-about',
    label: 'Ibyerekeye GS GITUMBA',
    path: 'about',
    icon: 'Compass',
    enabled: true,
    order: 5,
    location: 'footer'
  },
  {
    id: 'nav-contact',
    label: 'Twandikire (Contact)',
    path: 'contact',
    icon: 'MapPin',
    enabled: true,
    order: 6,
    location: 'footer'
  },
  {
    id: 'nav-admin',
    label: 'Admin Portal',
    path: 'admin',
    icon: 'ShieldCheck',
    enabled: true,
    order: 7,
    location: 'both'
  }
];

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  {
    id: 'masthead',
    type: 'masthead',
    label: "Umutwe w'Urubuga (Institutional Masthead Banner)",
    description: "Ikirango cy'ikigo, itariki y'uyu munsi, akarere, n'amazina y'ishuri hejuru",
    enabled: true,
    order: 1,
    options: {
      showDateLocationTicker: true,
      showInstitutionalBadge: true
    },
    content: {
      headline: 'ISEZERANO ONLINE',
      subheadline: 'GS GITUMBA',
      badgeText: "Urubuga rw'Uburezi • Imfashanyigisho za CBC n'Indangamanota",
      bodyText: "GS GITUMBA — Imfashanyigisho za CBC n'Indangamanota z'Inshuke mu Rwanda"
    }
  },
  {
    id: 'hero',
    type: 'hero',
    label: "Hero Banner: Ikaze & Buto zo Gutangira (Welcome & CTA)",
    description: "Ibaruwa y'ikaze, ubusobanuro bw'urubuga, na buto zihutisha mwarimu kugana ku masomo cyangwa indangamanota",
    enabled: true,
    order: 2,
    options: {
      showLessonPlanButton: true,
      showReportCardsButton: true,
      showDashboardButton: true,
      showGuaranteeBadges: true
    },
    content: {
      headline: "Urubuga rw'Abarimu: Gutegura Amasomo (CBC) n'Indangamanota z'Abanyeshuri ku Buntu",
      badgeText: "GS GITUMBA • Umurenge wa Buyoga, Akarere ka Rulindo",
      bodyText: "Ikaze kuri ISEZERANO ONLINE. Umwarimu cyangwa undi wese akoresha ibice byose bya Lesson Preparation na Report Cards ku buntu nta kiguzi, nta konti cyangwa ijambobanga asabwe.",
      primaryButtonText: "Tangira Gutegura Isomo (Lesson Plan)",
      primaryButtonLink: "create",
      secondaryButtonText: "Indangamanota z'Inshuke (Report Cards)",
      secondaryButtonLink: "nursery",
      itemsList: [
        "Nta konti cyangwa password bikenewe",
        "Byubahirije amabwiriza ya REB & MINEDUC",
        "Bikora neza kuri Telefoni no kuri Mudasobwa"
      ]
    }
  },
  {
    id: 'quick_tools',
    type: 'quick_tools',
    label: "Ibikoresho Byihuse: Lesson Preparation & Report Cards",
    description: "Amakarita abiri y'ingenzi: Gutegura Amasomo ya CBC (inkingi 8) n'Indangamanota z'inshuke (ibipimo 22)",
    enabled: true,
    order: 3,
    options: {
      showLessonPlannerCard: true,
      showReportCardsCard: true
    },
    content: {
      headline: "Hitamo Igice Ushaka Gukoresha Ako Kanya",
      badgeText: "Ibikoresho by'Ingenzi ku Barezi (Primary Teacher Tools)",
      bodyText: "Kanda kuri kimwe muri ibi bice bibiri kugira ngo utangire gutegura amasomo yawe cyangwa gutegura indangamanota z'abanyeshuri b'inshuke."
    }
  },
  {
    id: 'school_profile',
    type: 'school_profile',
    label: "Amakuru y'Ikigo cy'Amashuri (School Profile & Credentials)",
    description: "Amakuru ya GS GITUMBA, amarembo y'itumanaho, n'ibisobanuro by'umwimerere w'urubuga",
    enabled: true,
    order: 4,
    options: {
      showAboutButton: true,
      showContactButton: true
    },
    content: {
      headline: "Groupe Scolaire GITUMBA – Umurenge wa Buyoga",
      badgeText: "Amakuru y'Ikigo cy'Amashuri (School Profile)",
      bodyText: "Urubuga rwa ISEZERANO ONLINE rwateguwe n'umwarimu wigisha muri GS GITUMBA (Akarere ka Rulindo, Intara y'Amajyaruguru) hagamijwe korohereza abarezi bose b'u Rwanda kubona ibikoresho by'uburezi byujuje ubuziranenge bwa REB na MINEDUC ku buntu.",
      primaryButtonText: "Twandikire cyangwa Duhamagare",
      primaryButtonLink: "contact",
      secondaryButtonText: "Ibyerekeye GS GITUMBA (About Us)",
      secondaryButtonLink: "about"
    }
  }
];

export const DEFAULT_WEBSITE_DESIGN: WebsiteDesignSettings = {
  branding: DEFAULT_WEBSITE_BRANDING,
  colors: DEFAULT_WEBSITE_COLORS,
  typography: DEFAULT_WEBSITE_TYPOGRAPHY,
  logo: DEFAULT_WEBSITE_LOGO,
  announcements: DEFAULT_ANNOUNCEMENT_STRIP,
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
  navigationMenus: DEFAULT_NAVIGATION_MENUS,
  whatsappContact: DEFAULT_WHATSAPP_CONTACT,
  versionHistory: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'system'
};

