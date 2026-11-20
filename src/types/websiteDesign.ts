import {
  WhatsAppButtonPosition,
  WhatsAppButtonSize,
  WhatsAppButtonShape,
  WhatsAppButtonDisplayMode,
  WhatsAppContactSettings,
  DEFAULT_WHATSAPP_CONTACT
} from '../utils/whatsappUtils';
import {
  CategoryFontWeight,
  CategoryStylingMode,
  CategoryItemStyle,
  CategoryNavAppearanceSettings,
  DEFAULT_ALL_NEWS_LABEL,
  DEFAULT_CATEGORY_NAV_APPEARANCE
} from '../utils/categoryStyleUtils';
import {
  MiniShopDisplaySettings,
  DEFAULT_MINI_SHOP_DISPLAY_SETTINGS
} from '../utils/displaySettingsUtils';

export type {
  WhatsAppButtonPosition,
  WhatsAppButtonSize,
  WhatsAppButtonShape,
  WhatsAppButtonDisplayMode,
  WhatsAppContactSettings,
  CategoryFontWeight,
  CategoryStylingMode,
  CategoryItemStyle,
  CategoryNavAppearanceSettings,
  MiniShopDisplaySettings
};
export {
  DEFAULT_WHATSAPP_CONTACT,
  DEFAULT_ALL_NEWS_LABEL,
  DEFAULT_CATEGORY_NAV_APPEARANCE,
  DEFAULT_MINI_SHOP_DISPLAY_SETTINGS
};

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

  // Website Name Dedicated Typography Controls
  websiteNameFontFamily: string; // Dedicated font family for public Website Name display
  websiteNameSize: number;       // Base desktop font size in px for Website Name (scales responsively on mobile)
  websiteNameColor: string;      // Dedicated font color hex for Website Name

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
  platformSubtitle: string;       // Subtitle (e.g. News & Information Portal)
  websiteDescription: string;     // Public website description displayed in branding & SEO metadata
  allNewsLabel?: string;          // Editable public label replacing default "All News"
  showWebsiteName: boolean;       // Visibility toggle: show/hide website name on public website
  showWebsiteDescription: boolean;// Visibility toggle: show/hide website description on public website
  footerTagline: string;          // Footer description/tagline
  footerCopyright: string;        // Copyright statement in footer
  homepageWelcomeHeadline?: string; // Optional custom administrator headline
  homepageCustomNote?: string;      // Optional custom administrator note/content
}

export type SectionType = 
  | 'masthead' 
  | 'hero' 
  | 'editorial_profile' 
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
  path: string; // 'home' | 'blog' | 'about' | 'contact' | 'privacy' | 'terms' | 'admin' or custom URL
  isExternal?: boolean;
  icon?: string; // 'Home' | 'BookOpen' | 'Award' | 'ShieldCheck' | 'FileText' | 'User' | 'Compass' | 'MapPin'
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
  categoryNav?: CategoryNavAppearanceSettings;
  homepageSections?: HomepageSectionConfig[];
  navigationMenus?: NavigationMenuItem[];
  whatsappContact?: WhatsAppContactSettings;
  miniShopDisplay?: MiniShopDisplaySettings;
  versionHistory?: WebsiteDesignVersion[];
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_WEBSITE_BRANDING: WebsiteBrandingSettings = {
  platformTitle: 'ISEZERANO ONLINE',
  platformSubtitle: 'News & Information Portal',
  websiteDescription: 'ISEZERANO ONLINE – Independent digital news, breaking updates, features, and community information.',
  allNewsLabel: DEFAULT_ALL_NEWS_LABEL,
  showWebsiteName: true,
  showWebsiteDescription: true,
  footerTagline: 'ISEZERANO ONLINE – Independent digital news, timely reporting, and public announcements.',
  footerCopyright: '© 2026 ISEZERANO ONLINE. All rights reserved.',
  homepageWelcomeHeadline: '',
  homepageCustomNote: ''
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
  websiteNameFontFamily: "'Times New Roman', Times, Baskerville, Georgia, serif",
  websiteNameSize: 26,
  websiteNameColor: '#0f172a',
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

export const DEFAULT_WEBSITE_LOGO: WebsiteLogoSettings = {
  logoUrl: '',
  isCustomLogo: false,
  displayHeight: 48,
  displayFit: 'cover',
  borderRadius: 'rounded-xl',
  altText: 'ISEZERANO ONLINE Logo',
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
    id: 'nav-blog',
    label: 'All News',
    path: 'blog',
    icon: 'FileText',
    enabled: true,
    order: 2,
    location: 'both'
  },
  {
    id: 'nav-contact',
    label: 'Contact Us',
    path: 'contact',
    icon: 'MapPin',
    enabled: true,
    order: 3,
    location: 'footer'
  },
  {
    id: 'nav-privacy',
    label: 'Privacy Policy',
    path: 'privacy',
    icon: 'ShieldCheck',
    enabled: true,
    order: 4,
    location: 'footer'
  },
  {
    id: 'nav-terms',
    label: 'Terms & Conditions',
    path: 'terms',
    icon: 'FileText',
    enabled: true,
    order: 5,
    location: 'footer'
  },
  {
    id: 'nav-admin',
    label: 'Admin Portal',
    path: 'admin',
    icon: 'ShieldCheck',
    enabled: true,
    order: 6,
    location: 'both'
  }
];

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSectionConfig[] = [
  {
    id: 'masthead',
    type: 'masthead',
    label: 'Portal Masthead Banner',
    description: 'Header branding, edition date, and portal tagline',
    enabled: true,
    order: 1,
    options: {
      showDateTicker: true,
      showEditorialBadge: true
    },
    content: {
      headline: 'ISEZERANO ONLINE',
      subheadline: 'News & Information Portal',
      badgeText: 'Independent Digital Newsroom',
      bodyText: 'ISEZERANO ONLINE — Timely journalism, breaking stories, and public updates.'
    }
  },
  {
    id: 'hero',
    type: 'hero',
    label: 'Lead Story & Featured Headlines',
    description: 'Top breaking news spotlight and editorial highlights',
    enabled: true,
    order: 2,
    options: {
      showAllNewsButton: true
    },
    content: {
      headline: 'ISEZERANO ONLINE — Independent Digital News & Information',
      badgeText: 'Newsroom Desk • Breaking Updates',
      bodyText: 'Read verified reporting, special features, community updates, and live coverage freely across desktop and mobile.',
      primaryButtonText: 'Browse All News',
      primaryButtonLink: 'blog',
      secondaryButtonText: 'Contact Newsroom',
      secondaryButtonLink: 'contact',
      itemsList: [
        'Free public access with no login required',
        'Organized news categories and fast article search',
        'Mobile-optimized reading and instant social sharing'
      ]
    }
  },
  {
    id: 'editorial_profile',
    type: 'editorial_profile',
    label: 'About the Newsroom',
    description: 'Editorial mission and public contact links',
    enabled: true,
    order: 3,
    options: {
      showAboutButton: true,
      showContactButton: true
    },
    content: {
      headline: 'ISEZERANO ONLINE Editorial Desk',
      badgeText: 'Editorial Information',
      bodyText: 'Delivering accurate, timely news coverage, analysis, and public information across Rwanda and beyond.',
      primaryButtonText: 'Contact Us',
      primaryButtonLink: 'contact',
      secondaryButtonText: 'About Us',
      secondaryButtonLink: 'about'
    }
  }
];

export const DEFAULT_WEBSITE_DESIGN: WebsiteDesignSettings = {
  branding: DEFAULT_WEBSITE_BRANDING,
  colors: DEFAULT_WEBSITE_COLORS,
  typography: DEFAULT_WEBSITE_TYPOGRAPHY,
  logo: DEFAULT_WEBSITE_LOGO,
  categoryNav: DEFAULT_CATEGORY_NAV_APPEARANCE,
  homepageSections: DEFAULT_HOMEPAGE_SECTIONS,
  navigationMenus: DEFAULT_NAVIGATION_MENUS,
  whatsappContact: DEFAULT_WHATSAPP_CONTACT,
  miniShopDisplay: DEFAULT_MINI_SHOP_DISPLAY_SETTINGS,
  versionHistory: [],
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'system'
};

