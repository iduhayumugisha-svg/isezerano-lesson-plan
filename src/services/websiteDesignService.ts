import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { 
  WebsiteDesignSettings, 
  DEFAULT_WEBSITE_DESIGN 
} from '../types/websiteDesign';
import { initFirestoreIfConfigured, getFirebaseApp, CANONICAL_FIREBASE_CONFIG } from './storageService';

const DESIGN_STORAGE_KEY = 'isezerano_website_design';

export interface LogoUploadProgress {
  percent: number;
  stage: 'validating' | 'uploading' | 'saving_database' | 'complete' | 'error';
  message: string;
}

export interface LogoUploadResult {
  success: boolean;
  url?: string;
  storageBucket?: string;
  sizeBytes?: number;
  error?: string;
}

/**
 * Validates a logo file before attempting upload
 */
export const validateLogoFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml', 'image/gif'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const validExts = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];

  if (!validTypes.includes(file.type) && (!ext || !validExts.includes(ext))) {
    return { 
      valid: false, 
      error: `Invalid file format (${file.type || ext}). Please upload a valid PNG, JPG, WebP, or SVG image.` 
    };
  }

  // 5MB max logo size
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `File is too large (${sizeMb} MB). Maximum allowed logo file size is 5.0 MB.` 
    };
  }

  return { valid: true };
};

/**
 * Fetch published website appearance, typography & logo settings.
 * Checks Cloud Firestore first as source of truth, then falls back to local cache.
 */
export const getWebsiteDesignSettings = async (): Promise<WebsiteDesignSettings> => {
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
        try {
          localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore cache error
        }
        return merged;
      }
    } catch (err) {
      console.warn('Could not read website_design from Firestore, falling back to local cache:', err);
    }
  }

  // LocalStorage Cache fallback
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
 * Real-time subscription to published website design settings.
 * Ensures every visitor and admin device receives changes immediately.
 */
export const subscribeToWebsiteDesign = (
  onUpdate: (settings: WebsiteDesignSettings) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db) return () => {};

  try {
    const docRef = doc(db, 'appSettings', 'website_design');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<WebsiteDesignSettings>;
        const merged: WebsiteDesignSettings = {
          colors: { ...DEFAULT_WEBSITE_DESIGN.colors, ...(data.colors || {}) },
          typography: { ...DEFAULT_WEBSITE_DESIGN.typography, ...(data.typography || {}) },
          logo: { ...DEFAULT_WEBSITE_DESIGN.logo, ...(data.logo || {}) },
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || 'admin'
        };
        try {
          localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        onUpdate(merged);
      }
    }, (error) => {
      console.warn('website_design real-time subscription error:', error);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach website_design snapshot listener:', err);
    return () => {};
  }
};

/**
 * Save published website design settings to Firestore as the shared source of truth.
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

  // Always update local cache immediately
  try {
    localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save design settings locally:', err);
  }

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'website_design');
      await setDoc(docRef, payload, { merge: true });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish design settings to Firestore';
      return { success: false, error: message };
    }
  }

  return { success: true };
};

/**
 * Upload a logo file to Firebase Storage and save its permanent URL in Firestore.
 * Traces actual progress, handles bucket discovery, and waits for database confirmation.
 */
export const uploadAndSaveWebsiteLogo = async (
  file: File,
  adminUid: string,
  onProgress?: (progress: LogoUploadProgress) => void
): Promise<LogoUploadResult> => {
  // 1. Validation
  onProgress?.({
    percent: 5,
    stage: 'validating',
    message: 'Validating image file format and dimensions...'
  });

  const validation = validateLogoFile(file);
  if (!validation.valid) {
    const errorMsg = validation.error || 'Invalid file.';
    onProgress?.({ percent: 0, stage: 'error', message: errorMsg });
    return { success: false, error: errorMsg };
  }

  // 2. Authentication check
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    const errorMsg = 'Authentication required: You must be signed in with the authorized administrator account (twizerefelix90@gmail.com) to upload logos.';
    onProgress?.({ percent: 0, stage: 'error', message: errorMsg });
    return { success: false, error: errorMsg };
  }

  const app = getFirebaseApp();
  if (!app) {
    const errorMsg = 'Firebase App is not initialized. Please verify your internet connection.';
    onProgress?.({ percent: 0, stage: 'error', message: errorMsg });
    return { success: false, error: errorMsg };
  }

  // Candidate storage buckets for project isezerano-news
  const candidateBuckets = [
    CANONICAL_FIREBASE_CONFIG.storageBucket || 'isezerano-news.firebasestorage.app',
    'isezerano-news.appspot.com',
    'isezerano-news.firebasestorage.app'
  ];

  // Remove duplicates while preserving order
  const uniqueBuckets = Array.from(new Set(candidateBuckets));

  let lastError: Error | null = null;
  let finalDownloadUrl: string | null = null;
  let usedBucket: string | null = null;

  const rawExt = file.name.split('.').pop()?.toLowerCase() || 'png';
  const cleanExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const fileName = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
  const storagePath = `website_assets/logos/${fileName}`;

  // Try each bucket candidate
  for (const bucket of uniqueBuckets) {
    try {
      onProgress?.({
        percent: 15,
        stage: 'uploading',
        message: `Connecting to Firebase Storage bucket (${bucket})...`
      });

      const storage = getStorage(app, `gs://${bucket}`);
      const storageRef = ref(storage, storagePath);

      const metadata = {
        contentType: file.type || `image/${cleanExt}`,
        customMetadata: {
          uploadedBy: currentUser.email || adminUid,
          uploadedAt: new Date().toISOString(),
          originalName: file.name
        }
      };

      const uploadTask = uploadBytesResumable(storageRef, file, metadata);

      // Track actual byte upload progress
      finalDownloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (snapshot.totalBytes > 0) {
              const uploadPercent = Math.min(
                85,
                Math.round(15 + (snapshot.bytesTransferred / snapshot.totalBytes) * 70)
              );
              onProgress?.({
                percent: uploadPercent,
                stage: 'uploading',
                message: `Uploading logo to Firebase Storage: ${uploadPercent}% (${Math.round(snapshot.bytesTransferred / 1024)} KB / ${Math.round(snapshot.totalBytes / 1024)} KB)...`
              });
            }
          },
          (uploadError) => {
            reject(uploadError);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });

      usedBucket = bucket;
      break; // Upload succeeded, exit bucket loop
    } catch (err: any) {
      lastError = err;
      console.warn(`Storage attempt on bucket "${bucket}" failed:`, err?.code || err?.message);
      // If error is not a bucket-not-found / project configuration error, break early
      if (err?.code === 'storage/unauthorized') {
        break;
      }
    }
  }

  // If Firebase Storage failed
  if (!finalDownloadUrl) {
    let errorDetail = lastError?.message || 'Firebase Storage upload failed.';
    if ((lastError as any)?.code === 'storage/unauthorized') {
      errorDetail = 'Firebase Storage permission denied. Please verify that your account (twizerefelix90@gmail.com) is logged in and authorized.';
    } else if ((lastError as any)?.code === 'storage/bucket-not-found') {
      errorDetail = 'Storage bucket was not found in project isezerano-news. Please ensure Cloud Storage is activated in Firebase Console.';
    }

    onProgress?.({
      percent: 0,
      stage: 'error',
      message: errorDetail
    });
    return { success: false, error: errorDetail };
  }

  // 4. Save permanent URL to Firestore appSettings/website_design
  onProgress?.({
    percent: 90,
    stage: 'saving_database',
    message: 'Saving permanent logo URL to Cloud Firestore database...'
  });

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const currentSettings = await getWebsiteDesignSettings();
      const updatedSettings: WebsiteDesignSettings = {
        ...currentSettings,
        logo: {
          ...currentSettings.logo,
          logoUrl: finalDownloadUrl,
          isCustomLogo: true
        },
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.email || adminUid
      };

      const docRef = doc(db, 'appSettings', 'website_design');
      await setDoc(docRef, updatedSettings, { merge: true });

      // Cache locally
      try {
        localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(updatedSettings));
      } catch {
        // ignore
      }

      if (updatedSettings.logo.updateFavicon) {
        updateBrowserFavicon(finalDownloadUrl);
      }

      onProgress?.({
        percent: 100,
        stage: 'complete',
        message: 'Logo successfully uploaded to Firebase Storage and published across the website!'
      });

      return {
        success: true,
        url: finalDownloadUrl,
        storageBucket: usedBucket || undefined,
        sizeBytes: file.size
      };
    } catch (dbErr: any) {
      const dbErrorMsg = `Logo was uploaded to Storage, but failed to save in Firestore: ${dbErr?.message || 'Database error'}`;
      onProgress?.({
        percent: 0,
        stage: 'error',
        message: dbErrorMsg
      });
      return { success: false, error: dbErrorMsg, url: finalDownloadUrl };
    }
  }

  onProgress?.({
    percent: 100,
    stage: 'complete',
    message: 'Logo uploaded successfully.'
  });

  return {
    success: true,
    url: finalDownloadUrl,
    storageBucket: usedBucket || undefined,
    sizeBytes: file.size
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

  if (logo.updateFavicon && logo.logoUrl) {
    updateBrowserFavicon(logo.logoUrl);
  }
};
