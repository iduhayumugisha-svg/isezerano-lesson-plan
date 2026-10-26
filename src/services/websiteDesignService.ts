import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { 
  WebsiteDesignSettings, 
  DEFAULT_WEBSITE_DESIGN 
} from '../types/websiteDesign';
import { initFirestoreIfConfigured, getFirebaseApp } from './storageService';

const DESIGN_STORAGE_KEY = 'isezerano_website_design';

/**
 * Fetch published website appearance, typography & logo settings.
 * Public visitors can read without an account.
 */
export const getWebsiteDesignSettings = async (): Promise<WebsiteDesignSettings> => {
  // 1. Check Cloud Firestore appSettings/website_design
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'website_design');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<WebsiteDesignSettings>;
        const merged: WebsiteDesignSettings = {
          colors: { ...DEFAULT_WEBSITE_DESIGN.colors, ...(data.colors || {}) },
          typography: { ...DEFAULT_WEBSITE_DESIGN.typography, ...(data.typography || {}) },
          logo: { ...DEFAULT_WEBSITE_DESIGN.logo, ...(data.logo || {}) },
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || 'admin'
        };
        localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Could not read website_design from Firestore, falling back to local cache:', err);
    }
  }

  // 2. LocalStorage Cache fallback
  try {
    const cached = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        colors: { ...DEFAULT_WEBSITE_DESIGN.colors, ...(parsed.colors || {}) },
        typography: { ...DEFAULT_WEBSITE_DESIGN.typography, ...(parsed.typography || {}) },
        logo: { ...DEFAULT_WEBSITE_DESIGN.logo, ...(parsed.logo || {}) },
        updatedAt: parsed.updatedAt || DEFAULT_WEBSITE_DESIGN.updatedAt,
        updatedBy: parsed.updatedBy || 'local'
      };
    }
  } catch {
    // fallback
  }

  return DEFAULT_WEBSITE_DESIGN;
};

/**
 * Save published website design settings.
 * Restricted to verified administrator in Firestore Security Rules.
 */
export const saveWebsiteDesignSettings = async (
  settings: WebsiteDesignSettings,
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  const payload: WebsiteDesignSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid
  };

  // Always save locally so client updates immediately
  try {
    localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save design settings locally:', err);
  }

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'website_design');
      await setDoc(docRef, payload);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish design settings to Firestore';
      return { success: false, error: message };
    }
  }

  return { success: true };
};

/**
 * Optimize image file on client canvas (Phone / Desktop friendly).
 * Preserves transparency for PNGs and compresses to lightweight Data URI.
 */
export const compressLogoImage = (
  file: File,
  maxDimension = 512,
  quality = 0.90
): Promise<{ dataUrl: string; sizeKb: number; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file must be an image (PNG, JPG, WebP, SVG).'));
      return;
    }

    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to create canvas rendering context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // If PNG, keep transparent background; else fill white
        if (!isPng) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const mime = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        const approxSizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);

        resolve({ dataUrl, sizeKb: approxSizeKb, mimeType: mime });
      };

      img.onerror = () => {
        reject(new Error('Failed to load logo image file.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read logo image file from storage.'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Upload logo file:
 * 1. Checks Firebase Storage first. If active and accessible, uploads to storage bucket.
 * 2. If Firebase Storage is unavailable (Spark free tier or unconfigured bucket),
 *    falls back to client-side compressed Data URL stored directly in Firestore/LocalStorage.
 * Returns the final URL or Data URL.
 */
export const uploadWebsiteLogo = async (
  file: File
): Promise<{ url: string; storageType: 'firebase-storage' | 'base64-firestore'; sizeKb: number }> => {
  const { dataUrl, sizeKb } = await compressLogoImage(file, 512, 0.9);

  const app = getFirebaseApp();
  if (app) {
    try {
      const storage = getStorage(app);
      const ext = file.name.split('.').pop() || 'png';
      const storageRef = ref(storage, `website_assets/logos/logo_${Date.now()}.${ext}`);
      
      await uploadString(storageRef, dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      return {
        url: downloadUrl,
        storageType: 'firebase-storage',
        sizeKb
      };
    } catch (storageErr) {
      console.warn('Firebase Storage upload failed, utilizing direct optimized storage:', storageErr);
    }
  }

  // Practical 100% free fallback: Store optimized dataUrl in Firestore document
  return {
    url: dataUrl,
    storageType: 'base64-firestore',
    sizeKb
  };
};

/**
 * Dynamically updates the browser tab favicon with the new logo
 */
export const updateBrowserFavicon = (logoUrl: string): void => {
  if (typeof document === 'undefined') return;

  try {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = logoUrl;
  } catch (e) {
    console.warn('Favicon update warning:', e);
  }
};

/**
 * Injects dynamic CSS variables into the document style sheet
 */
export const applyDesignCssVariables = (settings: WebsiteDesignSettings): void => {
  if (typeof document === 'undefined') return;

  let styleTag = document.getElementById('isezerano-custom-design') as HTMLStyleElement;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'isezerano-custom-design';
    document.head.appendChild(styleTag);
  }

  const { colors, typography, logo } = settings;

  const fontLineHeight = typography.lineHeight === 'tight' 
    ? '1.25' 
    : typography.lineHeight === 'relaxed' 
      ? '1.75' 
      : '1.5';

  const headingWeightValue = typography.headingWeight === 'bold' 
    ? '700' 
    : typography.headingWeight === 'semibold' 
      ? '600' 
      : typography.headingWeight === 'medium' 
        ? '500' 
        : '400';

  const bodyWeightValue = typography.bodyWeight === 'medium' ? '500' : '400';

  styleTag.textContent = `
    :root {
      /* Colors */
      --app-header-bg: ${colors.headerBg};
      --app-header-text: ${colors.headerText};
      --app-header-border: ${colors.headerBorder};
      --app-nav-link-hover: ${colors.navLinkHover};
      --app-nav-link-active: ${colors.navLinkActive};

      --app-body-bg: ${colors.bodyBg};
      --app-body-text: ${colors.bodyText};
      --app-muted-text: ${colors.mutedText};

      --app-card-bg: ${colors.cardBg};
      --app-card-border: ${colors.cardBorder};
      --app-accent-bg: ${colors.accentBg};

      --app-primary-btn-bg: ${colors.primaryButtonBg};
      --app-primary-btn-text: ${colors.primaryButtonText};
      --app-secondary-btn-bg: ${colors.secondaryButtonBg};
      --app-secondary-btn-text: ${colors.secondaryButtonText};
      --app-link-color: ${colors.linkColor};
      --app-form-input-border: ${colors.formInputBorder};
      --app-form-focus-ring: ${colors.formFocusRing};

      --app-footer-bg: ${colors.footerBg};
      --app-footer-heading-text: ${colors.footerHeadingText};
      --app-footer-body-text: ${colors.footerBodyText};
      --app-footer-link-color: ${colors.footerLinkColor};

      --app-heading-primary: ${colors.headingPrimary};
      --app-heading-secondary: ${colors.headingSecondary};

      --app-sidebar-bg: ${colors.sidebarBg};
      --app-sidebar-text: ${colors.sidebarText};
      --app-accent-badge-bg: ${colors.accentBadgeBg};
      --app-accent-badge-text: ${colors.accentBadgeText};

      /* Typography */
      --app-font-family: ${typography.fontFamily};
      --app-heading-font-family: ${typography.headingFontFamily};

      --app-font-size-title: ${typography.websiteTitleSize}px;
      --app-font-size-subtitle: ${typography.websiteSubtitleSize}px;
      --app-font-size-nav: ${typography.navMenuSize}px;
      --app-font-size-h1: ${typography.h1Size}px;
      --app-font-size-h2: ${typography.h2Size}px;
      --app-font-size-h3: ${typography.h3Size}px;
      --app-font-size-body: ${typography.bodySize}px;
      --app-font-size-button: ${typography.buttonSize}px;
      --app-font-size-footer: ${typography.footerSize}px;

      --app-heading-weight: ${headingWeightValue};
      --app-body-weight: ${bodyWeightValue};
      --app-line-height: ${fontLineHeight};

      /* Logo */
      --app-logo-height: ${logo.displayHeight}px;
      --app-logo-fit: ${logo.displayFit};
    }

    body {
      background-color: var(--app-body-bg) !important;
      color: var(--app-body-text) !important;
      font-family: var(--app-font-family) !important;
      font-size: var(--app-font-size-body);
      line-height: var(--app-line-height);
      font-weight: var(--app-body-weight);
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: var(--app-heading-font-family) !important;
      font-weight: var(--app-heading-weight) !important;
    }
  `;

  // Update favicon if requested
  if (logo.updateFavicon && logo.logoUrl) {
    updateBrowserFavicon(logo.logoUrl);
  }
};
