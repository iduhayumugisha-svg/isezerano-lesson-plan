import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
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
  code?: string;
  isFallbackDataUri?: boolean;
  isStorage?: boolean;
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
 * Checks local cache and Cloud Firestore, keeping whichever revision is newer.
 */
export const getWebsiteDesignSettings = async (): Promise<WebsiteDesignSettings> => {
  let localData: WebsiteDesignSettings | null = null;
  try {
    const cached = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      localData = {
        branding: { ...DEFAULT_WEBSITE_DESIGN.branding, ...(parsed.branding || {}) },
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

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'website_design');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as Partial<WebsiteDesignSettings>;
        const remoteMerged: WebsiteDesignSettings = {
          branding: { ...DEFAULT_WEBSITE_DESIGN.branding, ...(data.branding || {}) },
          colors: { ...DEFAULT_WEBSITE_DESIGN.colors, ...(data.colors || {}) },
          typography: { ...DEFAULT_WEBSITE_DESIGN.typography, ...(data.typography || {}) },
          logo: { ...DEFAULT_WEBSITE_DESIGN.logo, ...(data.logo || {}) },
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || 'admin'
        };

        // If local cache has newer saved changes than cloud document, prioritize local cache
        if (localData && localData.updatedAt && remoteMerged.updatedAt) {
          const localTime = new Date(localData.updatedAt).getTime();
          const remoteTime = new Date(remoteMerged.updatedAt).getTime();
          if (localTime > remoteTime) {
            return localData;
          }
        }

        try {
          localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(remoteMerged));
        } catch {
          // ignore cache error
        }
        return remoteMerged;
      }
    } catch (err) {
      console.warn('Could not read website_design from Firestore, using local cache:', err);
    }
  }

  if (localData) return localData;
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
          branding: { ...DEFAULT_WEBSITE_DESIGN.branding, ...(data.branding || {}) },
          colors: { ...DEFAULT_WEBSITE_DESIGN.colors, ...(data.colors || {}) },
          typography: { ...DEFAULT_WEBSITE_DESIGN.typography, ...(data.typography || {}) },
          logo: { ...DEFAULT_WEBSITE_DESIGN.logo, ...(data.logo || {}) },
          updatedAt: data.updatedAt || new Date().toISOString(),
          updatedBy: data.updatedBy || 'admin'
        };
        // Prevent stale remote snapshot from overwriting newer locally saved settings
        try {
          const localRaw = localStorage.getItem(DESIGN_STORAGE_KEY);
          if (localRaw) {
            const localData = JSON.parse(localRaw);
            if (localData?.updatedAt && merged.updatedAt) {
              const localTime = new Date(localData.updatedAt).getTime();
              const remoteTime = new Date(merged.updatedAt).getTime();
              if (localTime > remoteTime) {
                // Local version is newer than the remote snapshot, do not overwrite
                return;
              }
            }
          }
        } catch {
          // ignore cache parse error
        }

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
): Promise<{ success: boolean; error?: string; code?: string }> => {
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

  // Apply CSS variables to active document immediately
  applyDesignCssVariables(payload);

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'website_design');
      await setDoc(docRef, payload, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.error('Failed to save website_design to Firestore:', err);
      const code = err?.code || 'unknown';
      let message = err?.message || 'Failed to publish design settings to Firestore';

      if (code === 'permission-denied') {
        const auth = getAuth();
        const currentEmail = auth?.currentUser?.email;
        message = `Missing or insufficient permissions for 'appSettings/website_design'. ` +
          `Active account: ${currentEmail || 'Not signed in'}. ` +
          `Authorized administrator is twizerefelix90@gmail.com. ` +
          `If you are signed in as twizerefelix90@gmail.com, please ensure firestore.rules are deployed to project isezerano-news.`;
      }

      return { success: false, error: message, code };
    }
  }

  return { success: true };
};

/**
 * Compresses and converts an image file into an optimized base64 Data URL.
 * Preserves alpha transparency for PNGs. Ensures instant, reliable saving in Firestore Spark tier.
 */
export const compressLogoFile = (file: File, maxDimension = 512): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's a small SVG, read directly as data URL to preserve vector sharpness
    if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
      return;
    }

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
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string); // fallback to original data url
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const isPng = file.type === 'image/png' || file.name.endsWith('.png');
        const outputMime = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMime, isPng ? undefined : 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image for optimization.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
};

/**
 * Validates whether a public image URL is reachable and can be rendered by an img tag.
 */
export const validateImageUrl = (url: string): Promise<{ valid: boolean; error?: string }> => {
  return new Promise((resolve) => {
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/'))) {
      resolve({ valid: false, error: 'Please enter a valid HTTP, HTTPS, or Data URI image address.' });
      return;
    }

    const img = new Image();
    const timeout = setTimeout(() => {
      img.onload = null;
      img.onerror = null;
      resolve({ valid: false, error: 'Image URL timed out after 7 seconds. Ensure the link is publicly accessible.' });
    }, 7000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve({ valid: true });
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve({ valid: false, error: 'Unable to load image from this URL. Please verify the URL points directly to an image file.' });
    };

    img.src = url;
  });
};

/**
 * Upload a logo file to Firebase Storage and save its permanent URL in Firestore.
 * If Firebase Storage is unavailable (e.g. bucket not provisioned in project isezerano-news),
 * it seamlessly converts the logo into an optimized base64 image and saves it directly to Firestore,
 * ensuring the admin is NEVER blocked from updating the website logo.
 */
export const uploadAndSaveWebsiteLogo = async (
  file: File,
  adminUid: string,
  onProgress?: (progress: LogoUploadProgress) => void
): Promise<LogoUploadResult> => {
  // 1. Validation
  onProgress?.({
    percent: 10,
    stage: 'validating',
    message: 'Validating image file format and dimensions...'
  });

  const validation = validateLogoFile(file);
  if (!validation.valid) {
    const errorMsg = validation.error || 'Invalid file.';
    onProgress?.({ percent: 0, stage: 'error', message: errorMsg });
    return { success: false, error: errorMsg, code: 'validation/invalid-file' };
  }

  // 2. Authentication check
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    const errorMsg = 'Authentication required: You must be signed in with the authorized administrator account (twizerefelix90@gmail.com) to upload logos.';
    onProgress?.({ percent: 0, stage: 'error', message: errorMsg });
    return { success: false, error: errorMsg, code: 'auth/unauthenticated' };
  }

  const app = getFirebaseApp();
  const bucketName = CANONICAL_FIREBASE_CONFIG.storageBucket || 'isezerano-news.firebasestorage.app';

  const rawExt = file.name.split('.').pop()?.toLowerCase() || 'png';
  const cleanExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
  const fileName = `logo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
  const storagePath = `website_assets/logos/${fileName}`;

  let finalUrl: string | null = null;
  let usedStorageBucket: string | undefined = undefined;
  let isFallbackDataUri = false;
  let storageErrorNotice: string | null = null;

  // 3. Attempt Firebase Storage upload with a strict 8-second timeout
  if (app) {
    try {
      onProgress?.({
        percent: 25,
        stage: 'uploading',
        message: `Attempting upload to Firebase Storage bucket (${bucketName})...`
      });

      const storage = getStorage(app, `gs://${bucketName}`);
      const storageRef = ref(storage, storagePath);

      const metadata = {
        contentType: file.type || `image/${cleanExt}`,
        customMetadata: {
          uploadedBy: currentUser.email || adminUid,
          uploadedAt: new Date().toISOString(),
          originalName: file.name
        }
      };

      // Strict 8-second timeout guard to prevent hanging at 15%
      const uploadPromise = uploadBytes(storageRef, file, metadata);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const timeoutErr: any = new Error(`Connection to Firebase Storage bucket (${bucketName}) timed out after 8s.`);
          timeoutErr.code = 'storage/timeout';
          reject(timeoutErr);
        }, 8000);
      });

      onProgress?.({
        percent: 50,
        stage: 'uploading',
        message: 'Uploading image bytes to Firebase Cloud Storage...'
      });

      const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
      finalUrl = await getDownloadURL(uploadResult.ref);
      usedStorageBucket = bucketName;

      onProgress?.({
        percent: 80,
        stage: 'saving_database',
        message: 'Cloud Storage upload successful. Saving logo to Firestore...'
      });
    } catch (storageErr: any) {
      console.warn('Firebase Storage upload failed or bucket unprovisioned:', storageErr?.code || storageErr?.message);
      const errCode = storageErr?.code || 'storage/error';
      
      if (errCode === 'storage/bucket-not-found' || storageErr?.status === 404) {
        storageErrorNotice = `Cloud Storage bucket "${bucketName}" is not yet created in Firebase Console for project isezerano-news.`;
      } else if (errCode === 'storage/unauthorized') {
        storageErrorNotice = `Firebase Storage access was unauthorized. Check storage.rules for project isezerano-news.`;
      } else if (errCode === 'storage/timeout') {
        storageErrorNotice = `Firebase Storage bucket connection timed out (bucket may not be initialized).`;
      } else {
        storageErrorNotice = storageErr?.message || 'Firebase Storage upload failed.';
      }
    }
  }

  // 4. Automatic Cloud Fallback: If Firebase Storage failed or bucket doesn't exist,
  // compress image and store directly in Firestore `appSettings/website_design.logo.logoUrl`.
  // This guarantees the admin's logo update works 100% of the time and never freezes.
  if (!finalUrl) {
    onProgress?.({
      percent: 65,
      stage: 'uploading',
      message: 'Optimizing and preparing image for direct Cloud Firestore storage...'
    });

    try {
      finalUrl = await compressLogoFile(file, 512);
      isFallbackDataUri = true;
    } catch (compressionErr: any) {
      const errorMsg = `Failed to process image: ${compressionErr?.message || 'Compression error'}`;
      onProgress?.({ percent: 0, stage: 'error', message: errorMsg });
      return { success: false, error: errorMsg, code: 'image/compression-failed' };
    }
  }

  // 5. Save logo URL to Cloud Firestore `appSettings/website_design`
  onProgress?.({
    percent: 88,
    stage: 'saving_database',
    message: 'Publishing logo settings to Cloud Firestore database...'
  });

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const currentSettings = await getWebsiteDesignSettings();
      const updatedSettings: WebsiteDesignSettings = {
        ...currentSettings,
        logo: {
          ...currentSettings.logo,
          logoUrl: finalUrl,
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
        updateBrowserFavicon(finalUrl);
      }

      const successMessage = isFallbackDataUri
        ? 'Logo successfully optimized and published to Cloud Firestore! (Storage bucket was not found, so it was saved directly to the database).'
        : 'Logo successfully uploaded to Firebase Storage and published across the website!';

      onProgress?.({
        percent: 100,
        stage: 'complete',
        message: successMessage
      });

      return {
        success: true,
        url: finalUrl,
        storageBucket: usedStorageBucket,
        sizeBytes: file.size,
        isFallbackDataUri,
        isStorage: !isFallbackDataUri,
        error: storageErrorNotice || undefined
      };
    } catch (dbErr: any) {
      console.error('Failed to save logo to Firestore appSettings/website_design:', dbErr);
      const isPermissionDenied = dbErr?.code === 'permission-denied';
      const dbErrorMsg = isPermissionDenied
        ? `Permission denied saving to Firestore 'appSettings/website_design'. Ensure you are signed in as twizerefelix90@gmail.com and firestore.rules are deployed.`
        : `Database save error: ${dbErr?.message || 'Could not write to Firestore'}`;

      onProgress?.({
        percent: 0,
        stage: 'error',
        message: dbErrorMsg
      });

      return { 
        success: false, 
        error: dbErrorMsg, 
        code: dbErr?.code || 'firestore/error',
        url: finalUrl 
      };
    }
  }

  // If no DB configured, update local cache
  try {
    const currentSettings = await getWebsiteDesignSettings();
    const updatedSettings: WebsiteDesignSettings = {
      ...currentSettings,
      logo: {
        ...currentSettings.logo,
        logoUrl: finalUrl,
        isCustomLogo: true
      },
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid
    };
    localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(updatedSettings));
    if (updatedSettings.logo.updateFavicon) {
      updateBrowserFavicon(finalUrl);
    }
  } catch {
    // ignore
  }

  onProgress?.({
    percent: 100,
    stage: 'complete',
    message: 'Logo saved locally.'
  });

  return {
    success: true,
    url: finalUrl,
    storageBucket: usedStorageBucket,
    sizeBytes: file.size,
    isFallbackDataUri
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
