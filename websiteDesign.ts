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
  platformTitle: string;          // Main platform title in header, footer, meta
  platformSubtitle: string;       // Subtitle (e.g. GS GITUMBA)
  schoolName: string;             // School name
  schoolLocation: string;         // School location (Sector, District, Province)
  headerAnnouncement: string;     // Top banner announcement text
  headerAnnouncementEnabled: boolean; // Whether top announcement is active
  footerTagline: string;          // Footer description/tagline
  footerCopyright: string;        // Copyright statement in footer
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

export interface WebsiteDesignSettings {
  branding: WebsiteBrandingSettings;
  colors: WebsiteColorSettings;
  typography: WebsiteTypographySettings;
  logo: WebsiteLogoSettings;
  announcements?: AnnouncementStripSettings;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_WEBSITE_BRANDING: WebsiteBrandingSettings = {
  platformTitle: 'ISEZERANO ONLINE',
  platformSubtitle: 'GS GITUMBA',
  schoolName: 'GS GITUMBA',
  schoolLocation: 'Buyoga Sector, Rulindo District, Northern Province, Rwanda',
  headerAnnouncement: 'Welcome to Term 2! Prepare official Rwanda CBC Lesson Plans with confidence.',
  headerAnnouncementEnabled: false,
  footerTagline: 'Developed by a Rwandan teacher serving at GS GITUMBA (Buyoga Sector, Rulindo District, Northern Province) to support fellow educators in preparing well-structured CBC lesson plans aligned with REB & MINEDUC standards.',
  footerCopyright: '© 2026 ISEZERANO ONLINE – GS GITUMBA. All rights reserved.'
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
  lineHeight: 'normal'
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
  logoUrl: '/isezerano-online-logo.jpg',
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

export const DEFAULT_WEBSITE_DESIGN: WebsiteDesignSettings = {
  branding: DEFAULT_WEBSITE_BRANDING,
  colors: DEFAULT_WEBSITE_COLORS,
  typography: DEFAULT_WEBSITE_TYPOGRAPHY,
  logo: DEFAULT_WEBSITE_LOGO,
  announcements: DEFAULT_ANNOUNCEMENT_STRIP,
  updatedAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'system'
};
