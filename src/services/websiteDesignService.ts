import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { 
  WebsiteDesignSettings, 
  DEFAULT_WEBSITE_DESIGN,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_NAVIGATION_MENUS,
  NavigationMenuItem,
  WebsiteDesignVersion,
  MiniShopDisplaySettings
} from '../types/websiteDesign';
import { normalizeWhatsAppSettings, sanitizeHexColor } from '../utils/whatsappUtils';
import { normalizeCategoryNavSettings, resolveAllNewsLabel } from '../utils/categoryStyleUtils';
import { normalizeMiniShopDisplaySettings } from '../utils/displaySettingsUtils';
import { initFirestoreIfConfigured, getFirebaseApp, CANONICAL_FIREBASE_CONFIG } from '../config/firebase';
import { isAuthorizedAdminEmail } from './authService';

const DESIGN_STORAGE_KEY = 'isezerano_website_design';

// Cache session flag when Storage bucket is confirmed unprovisioned (404) so uploads save instantly to Firestore
let logoStorageBucketUnavailable = false;

/**
 * Recursively removes keys with `undefined` values so Firestore setDoc never rejects payloads.
 */
const stripUndefinedDeep = <T,>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
};

const mergeTypographyWithDefaults = (
  rawTypography?: Partial<WebsiteDesignSettings['typography']>,
  rawColors?: Partial<WebsiteDesignSettings['colors']>
): WebsiteDesignSettings['typography'] => {
  const merged = {
    ...DEFAULT_WEBSITE_DESIGN.typography,
    ...(rawTypography || {})
  };
  const fallbackColor = sanitizeHexColor(
    rawColors?.headerText,
    DEFAULT_WEBSITE_DESIGN.typography.websiteNameColor
  );
  const parsedSize = Number(rawTypography?.websiteNameSize);
  return {
    ...merged,
    websiteNameFontFamily:
      typeof rawTypography?.websiteNameFontFamily === 'string' && rawTypography.websiteNameFontFamily.trim()
        ? rawTypography.websiteNameFontFamily.trim()
        : DEFAULT_WEBSITE_DESIGN.typography.websiteNameFontFamily,
    websiteNameSize:
      Number.isFinite(parsedSize) && parsedSize >= 14 && parsedSize <= 48
        ? Math.round(parsedSize)
        : DEFAULT_WEBSITE_DESIGN.typography.websiteNameSize,
    websiteNameColor: sanitizeHexColor(rawTypography?.websiteNameColor, fallbackColor)
  };
};

const isRemovedLegacyNavItem = (item: Partial<NavigationMenuItem>): boolean => {
  const id = (item.id || '').trim().toLowerCase();
  const path = (item.path || '').trim().toLowerCase();
  const label = (item.label || '').trim();
  if (
    id === 'nav-about' ||
    id === 'nav-lesson-prep' ||
    id === 'nav-report-cards' ||
    path === 'about' ||
    path === 'dashboard' ||
    path === 'nursery'
  ) {
    return true;
  }
  if (/ibyerekeye|gs\s*gitumba/i.test(label)) {
    return true;
  }
  return false;
};

const normalizeNavigationMenus = (menus?: NavigationMenuItem[]): NavigationMenuItem[] => {
  const rawList = Array.isArray(menus) && menus.length > 0 ? menus : DEFAULT_NAVIGATION_MENUS;
  const list = rawList.filter((m) => !isRemovedLegacyNavItem(m));
  const hasBlog = list.some((m) => m.path === 'blog' || m.id === 'nav-blog');
  if (!hasBlog) {
    list.push({
      id: 'nav-blog',
      label: 'Blog & Articles',
      path: 'blog',
      icon: 'FileText',
      enabled: true,
      order: 4,
      location: 'both'
    });
  }
  return list;
};

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
 * Synchronously reads cached website design settings from localStorage for instant first-paint hydration.
 */
export const getCachedWebsiteDesignSettingsSync = (): WebsiteDesignSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_WEBSITE_DESIGN;
  try {
    const cached = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const mergedBranding = {
        ...DEFAULT_WEBSITE_DESIGN.branding,
        ...(parsed.branding || {}),
        allNewsLabel: resolveAllNewsLabel(parsed.branding)
      };
      return {
        branding: mergedBranding,
        colors: { ...DEFAULT_WEBSITE_DESIGN.colors, ...(parsed.colors || {}) },
        typography: mergeTypographyWithDefaults(parsed.typography, parsed.colors),
        logo: { ...DEFAULT_WEBSITE_DESIGN.logo, ...(parsed.logo || {}) },
        categoryNav: normalizeCategoryNavSettings(parsed.categoryNav),
        homepageSections: parsed.homepageSections || DEFAULT_HOMEPAGE_SECTIONS,
        navigationMenus: normalizeNavigationMenus(parsed.navigationMenus),
        whatsappContact: normalizeWhatsAppSettings(parsed.whatsappContact),
        miniShopDisplay: normalizeMiniShopDisplaySettings(parsed.miniShopDisplay),
        versionHistory: parsed.versionHistory || [],
        updatedAt: parsed.updatedAt || DEFAULT_WEBSITE_DESIGN.updatedAt,
        updatedBy: parsed.updatedBy || 'local'
      };
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_WEBSITE_DESIGN;
};

const parseDesignRestValue = (val: any): any => {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(parseDesignRestValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseDesignRestValue(v);
    }
    return out;
  }
  return undefined;
};

const DESIGN_PUBLIC_REST_URL =
  'https://firestore.googleapis.com/v1/projects/isezerano-news/databases/(default)/documents/appSettings/website_design' +
  '?mask.fieldPaths=branding&mask.fieldPaths=colors&mask.fieldPaths=typography' +
  '&mask.fieldPaths=logo&mask.fieldPaths=categoryNav&mask.fieldPaths=homepageSections' +
  '&mask.fieldPaths=navigationMenus&mask.fieldPaths=whatsappContact' +
  '&mask.fieldPaths=miniShopDisplay&mask.fieldPaths=updatedAt&mask.fieldPaths=updatedBy';

const normalizeWebsiteDesignPayload = (
  data: Partial<WebsiteDesignSettings>,
  fallbackHistory: WebsiteDesignVersion[] = []
): WebsiteDesignSettings => ({
  branding: {
    ...DEFAULT_WEBSITE_DESIGN.branding,
    ...(data.branding || {}),
    allNewsLabel: resolveAllNewsLabel(data.branding)
  },
  colors: { ...DEFAULT_WEBSITE_DESIGN.colors, ...(data.colors || {}) },
  typography: mergeTypographyWithDefaults(data.typography, data.colors),
  logo: { ...DEFAULT_WEBSITE_DESIGN.logo, ...(data.logo || {}) },
  categoryNav: normalizeCategoryNavSettings(data.categoryNav),
  homepageSections: data.homepageSections || DEFAULT_HOMEPAGE_SECTIONS,
  navigationMenus: normalizeNavigationMenus(data.navigationMenus),
  whatsappContact: normalizeWhatsAppSettings(data.whatsappContact),
  miniShopDisplay: normalizeMiniShopDisplaySettings(data.miniShopDisplay),
  versionHistory: data.versionHistory || fallbackHistory,
  updatedAt: data.updatedAt || new Date().toISOString(),
  updatedBy: data.updatedBy || 'admin'
});

/**
 * Lightweight public fetch excluding 640KB+ admin versionHistory so first-time visitors
 * only download ~16KB instead of ~846KB.
 */
export const getPublicWebsiteDesignSettings = async (): Promise<WebsiteDesignSettings> => {
  let localData: WebsiteDesignSettings | null = null;
  try {
    const cached = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (cached) {
      localData = getCachedWebsiteDesignSettingsSync();
    }
  } catch {
    // fallback
  }

  if (typeof fetch === 'function') {
    try {
      const res = await fetch(DESIGN_PUBLIC_REST_URL, { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json?.fields) {
          const parsed: Record<string, any> = {};
          for (const [k, v] of Object.entries(json.fields)) {
            parsed[k] = parseDesignRestValue(v);
          }
          const remoteMerged = normalizeWebsiteDesignPayload(
            parsed as Partial<WebsiteDesignSettings>,
            localData?.versionHistory || []
          );
          try {
            localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(remoteMerged));
          } catch {
            // ignore cache error
          }
          return remoteMerged;
        }
      }
    } catch {
      // fall through to Firestore SDK fallback
    }
  }

  return getWebsiteDesignSettings();
};

/**
 * Fetch published website appearance, typography, menus & layout settings.
 * Prefers Cloud Firestore when reachable and falls back to local cache only when offline.
 */
export const getWebsiteDesignSettings = async (): Promise<WebsiteDesignSettings> => {
  let localData: WebsiteDesignSettings | null = null;
  try {
    const cached = localStorage.getItem(DESIGN_STORAGE_KEY);
    if (cached) {
      localData = getCachedWebsiteDesignSettingsSync();
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
        const remoteMerged = normalizeWebsiteDesignPayload(data);

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
        const merged = normalizeWebsiteDesignPayload(data, data.versionHistory || []);

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
 * Creates an immutable version history snapshot for 1-click restore/undo.
 * Restricted to verified administrator in Firestore Security Rules.
 */
export const saveWebsiteDesignSettings = async (
  settings: WebsiteDesignSettings,
  adminUid: string,
  changeSummary?: string
): Promise<{ success: boolean; error?: string; code?: string; versionId?: string }> => {
  const versionId = `v_${Date.now()}`;
  const rawSnapshot: WebsiteDesignSettings = {
    branding: {
      ...settings.branding,
      allNewsLabel: resolveAllNewsLabel(settings.branding)
    },
    colors: { ...settings.colors },
    typography: { ...settings.typography },
    logo: { ...settings.logo },
    categoryNav: normalizeCategoryNavSettings(settings.categoryNav),
    homepageSections: settings.homepageSections ? JSON.parse(JSON.stringify(settings.homepageSections)) : [],
    navigationMenus: normalizeNavigationMenus(
      settings.navigationMenus ? JSON.parse(JSON.stringify(settings.navigationMenus)) : undefined
    ),
    whatsappContact: normalizeWhatsAppSettings(settings.whatsappContact),
    miniShopDisplay: normalizeMiniShopDisplaySettings(settings.miniShopDisplay),
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid
  };
  const newSnapshot = stripUndefinedDeep(rawSnapshot);

  const newVersion: WebsiteDesignVersion = {
    id: versionId,
    timestamp: new Date().toISOString(),
    publishedBy: adminUid,
    note: changeSummary || 'Website configuration updated',
    snapshot: newSnapshot
  };

  // Keep history well under Firestore's 1 MiB document size limit by pruning oversized snapshots
  const existingHistory = Array.isArray(settings.versionHistory) ? settings.versionHistory : [];
  let updatedHistory = [newVersion, ...existingHistory].slice(0, 10);

  const buildPayload = (historySlice: WebsiteDesignVersion[]): WebsiteDesignSettings =>
    stripUndefinedDeep({
      ...settings,
      branding: rawSnapshot.branding,
      categoryNav: rawSnapshot.categoryNav,
      miniShopDisplay: rawSnapshot.miniShopDisplay,
      versionHistory: historySlice,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid
    });

  let payload = buildPayload(updatedHistory);
  try {
    // Strip large embedded data-URI logos from older history snapshots first if needed
    if (JSON.stringify(payload).length > 680_000) {
      updatedHistory = updatedHistory.map((ver, idx) => {
        if (idx === 0) return ver;
        const logoUrl = ver?.snapshot?.logo?.logoUrl;
        if (typeof logoUrl === 'string' && logoUrl.startsWith('data:') && logoUrl.length > 4096) {
          return {
            ...ver,
            snapshot: {
              ...ver.snapshot,
              logo: { ...ver.snapshot.logo, logoUrl: '' }
            }
          };
        }
        return ver;
      });
      payload = buildPayload(updatedHistory);
    }
    while (updatedHistory.length > 1 && JSON.stringify(payload).length > 720_000) {
      updatedHistory = updatedHistory.slice(0, updatedHistory.length - 1);
      payload = buildPayload(updatedHistory);
    }
  } catch {
    // ignore size-estimation failure
  }

  // Apply CSS variables to active document immediately
  applyDesignCssVariables(payload);

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const auth = getAuth();
      const currentEmail = auth?.currentUser?.email;
      if (!auth?.currentUser || !isAuthorizedAdminEmail(currentEmail)) {
        return {
          success: false,
          code: 'permission-denied',
          error: `Administrator sign-in required. Active account: ${currentEmail || 'Not signed in'}. Authorized admin is twizerefelix90@gmail.com.`
        };
      }

      const docRef = doc(db, 'appSettings', 'website_design');
      await setDoc(docRef, payload, { merge: true });

      try {
        localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error('Failed to save design settings locally:', err);
      }

      // Sync lightweight site branding/logo metadata to siteSettings/branding when valid
      if (typeof payload.logo?.logoUrl === 'string' && payload.logo.logoUrl.length <= 680000) {
        try {
          await setDoc(
            doc(db, 'siteSettings', 'branding'),
            {
              logoData: payload.logo.logoUrl,
              siteName: payload.branding?.platformTitle || 'ISEZERANO ONLINE',
              siteDescription: payload.branding?.websiteDescription || '',
              showWebsiteName: payload.branding?.showWebsiteName !== false,
              showWebsiteDescription: payload.branding?.showWebsiteDescription !== false,
              updatedAt: payload.updatedAt,
              updatedBy: currentEmail || adminUid
            },
            { merge: true }
          );
        } catch {
          // Non-fatal secondary sync
        }
      }

      return { success: true, versionId };
    } catch (err: any) {
      console.error('Failed to save website_design to Firestore:', err);
      const code = err?.code || 'unknown';
      let message = err?.message || 'Failed to publish design settings to Firestore';

      if (code === 'permission-denied') {
        const auth = getAuth();
        const currentEmail = auth?.currentUser?.email;
        message = `Missing or insufficient permissions for 'appSettings/website_design'. ` +
          `Active account: ${currentEmail || 'Not signed in'}. ` +
          `Authorized administrator is twizerefelix90@gmail.com.`;
      }

      return { success: false, error: message, code };
    }
  }

  return { success: false, code: 'firestore/not-configured', error: 'Cloud Firestore is not configured.' };
};

/**
 * Lightweight Mini Shop display-size update writing only `miniShopDisplay`, `updatedAt`, and
 * `updatedBy` via Firestore merge. Avoids duplicating large versionHistory snapshots near the 1 MiB limit.
 */
export const saveMiniShopDisplayToFirestore = async (
  miniShopDisplay: MiniShopDisplaySettings,
  adminUid: string
): Promise<{ success: boolean; normalized: MiniShopDisplaySettings; updatedAt: string; error?: string; code?: string }> => {
  const normalized = normalizeMiniShopDisplaySettings(miniShopDisplay);
  const updatedAt = new Date().toISOString();

  const db = initFirestoreIfConfigured();
  if (!db) {
    return {
      success: false,
      normalized,
      updatedAt,
      code: 'firestore/not-configured',
      error: 'Cloud Firestore is not configured.'
    };
  }

  try {
    const auth = getAuth();
    const currentEmail = auth?.currentUser?.email;
    if (!auth?.currentUser || !isAuthorizedAdminEmail(currentEmail)) {
      return {
        success: false,
        normalized,
        updatedAt,
        code: 'permission-denied',
        error: `Administrator sign-in required. Active account: ${currentEmail || 'Not signed in'}. Authorized admin is twizerefelix90@gmail.com.`
      };
    }

    const docRef = doc(db, 'appSettings', 'website_design');
    await setDoc(
      docRef,
      stripUndefinedDeep({
        miniShopDisplay: normalized,
        updatedAt,
        updatedBy: currentEmail || adminUid
      }),
      { merge: true }
    );

    try {
      const existing = getCachedWebsiteDesignSettingsSync();
      localStorage.setItem(
        DESIGN_STORAGE_KEY,
        JSON.stringify({
          ...existing,
          miniShopDisplay: normalized,
          updatedAt,
          updatedBy: currentEmail || adminUid
        })
      );
    } catch {
      // ignore localStorage errors
    }

    return { success: true, normalized, updatedAt };
  } catch (err: any) {
    const code = err?.code || 'unknown';
    const message =
      code === 'permission-denied'
        ? `Missing or insufficient permissions for 'appSettings/website_design'. Ensure you are signed in as twizerefelix90@gmail.com.`
        : err?.message || 'Failed to save Mini Shop display settings to Cloud Firestore.';
    return { success: false, normalized, updatedAt, error: message, code };
  }
};

/**
 * Restores a previously saved version snapshot as the active published website configuration.
 */
export const restoreWebsiteDesignVersion = async (
  version: WebsiteDesignVersion,
  adminUid: string
): Promise<{ success: boolean; restoredSettings?: WebsiteDesignSettings; error?: string }> => {
  try {
    const currentSettings = await getWebsiteDesignSettings();
    const restored: WebsiteDesignSettings = {
      ...version.snapshot,
      whatsappContact: normalizeWhatsAppSettings(version.snapshot.whatsappContact),
      miniShopDisplay: normalizeMiniShopDisplaySettings(version.snapshot.miniShopDisplay),
      versionHistory: currentSettings.versionHistory || [],
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid
    };

    const result = await saveWebsiteDesignSettings(
      restored,
      adminUid,
      `Restored previous version from ${new Date(version.timestamp).toLocaleString('en-GB')}`
    );

    if (result.success) {
      return { success: true, restoredSettings: restored };
    }
    return { success: false, error: result.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to restore previous version' };
  }
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

  // 2. Strictly verify twizerefelix90@gmail.com authentication
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser || !isAuthorizedAdminEmail(currentUser.email)) {
    const errorMsg = 'Authentication required: Sign in with twizerefelix90@gmail.com to upload or replace the website logo.';
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

  // 3. Attempt Firebase Storage if not already confirmed unprovisioned in this session
  if (app && !logoStorageBucketUnavailable) {
    try {
      onProgress?.({
        percent: 25,
        stage: 'uploading',
        message: `Uploading logo to Firebase Storage (${bucketName})...`
      });

      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const storage = getStorage(app, `gs://${bucketName}`);
      try {
        storage.maxUploadRetryTime = 4500;
        storage.maxOperationRetryTime = 4500;
      } catch {
        // ignore
      }
      const storageRef = ref(storage, storagePath);

      const metadata = {
        contentType: file.type || `image/${cleanExt}`,
        customMetadata: {
          uploadedBy: currentUser.email || adminUid,
          uploadedAt: new Date().toISOString(),
          originalName: file.name
        }
      };

      const uploadPromise = uploadBytes(storageRef, file, metadata);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const timeoutErr: any = new Error(`Connection to Firebase Storage timed out after 4.5s.`);
          timeoutErr.code = 'storage/timeout';
          reject(timeoutErr);
        }, 4500);
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
      logoStorageBucketUnavailable = true;
      const errCode = storageErr?.code || 'storage/error';
      if (errCode === 'storage/bucket-not-found' || storageErr?.status === 404) {
        storageErrorNotice = `Cloud Storage bucket "${bucketName}" is not provisioned. Saving compressed logo directly to Cloud Firestore.`;
      } else {
        storageErrorNotice = storageErr?.message || 'Cloud Storage unavailable; saving directly to Cloud Firestore.';
      }
    }
  }

  // 4. Persistent Cloud Firestore embedded Data URI fallback (guaranteed <= 360 KB)
  if (!finalUrl) {
    onProgress?.({
      percent: 65,
      stage: 'uploading',
      message: 'Optimizing logo for persistent Cloud Firestore storage...'
    });

    try {
      let candidate = await compressLogoFile(file, 360);
      if (candidate.length > 350_000) {
        candidate = await compressLogoFile(file, 220);
      }
      if (candidate.length > 550_000) {
        throw new Error('Logo image is too large for Firestore document storage. Please select a smaller image.');
      }
      finalUrl = candidate;
      isFallbackDataUri = true;
    } catch (compressionErr: any) {
      const errorMsg = `Failed to process image: ${compressionErr?.message || 'Compression error'}`;
      onProgress?.({ percent: 0, stage: 'error', message: errorMsg });
      return { success: false, error: errorMsg, code: 'image/compression-failed' };
    }
  }

  // 5. Persist to Cloud Firestore `appSettings/website_design` and `siteSettings/branding`
  onProgress?.({
    percent: 88,
    stage: 'saving_database',
    message: 'Publishing logo settings to Cloud Firestore database...'
  });

  const db = initFirestoreIfConfigured();
  if (!db) {
    const msg = 'Cloud Firestore is not connected. Cannot save persistent website logo.';
    onProgress?.({ percent: 0, stage: 'error', message: msg });
    return { success: false, error: msg, code: 'firestore/not-configured' };
  }

  try {
    const currentSettings = await getWebsiteDesignSettings();
    const updatedSettings: WebsiteDesignSettings = stripUndefinedDeep({
      ...currentSettings,
      logo: {
        ...currentSettings.logo,
        logoUrl: finalUrl,
        isCustomLogo: true,
        showInHeader: true
      },
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.email || adminUid
    });

    await setDoc(doc(db, 'appSettings', 'website_design'), updatedSettings, { merge: true });

    try {
      await setDoc(
        doc(db, 'siteSettings', 'branding'),
        {
          logoData: finalUrl,
          siteName: updatedSettings.branding?.platformTitle || 'ISEZERANO ONLINE',
          siteDescription: updatedSettings.branding?.websiteDescription || '',
          showWebsiteName: updatedSettings.branding?.showWebsiteName !== false,
          showWebsiteDescription: updatedSettings.branding?.showWebsiteDescription !== false,
          updatedAt: updatedSettings.updatedAt,
          updatedBy: currentUser.email || adminUid
        },
        { merge: true }
      );
    } catch {
      // Non-fatal secondary branding doc sync
    }

    try {
      localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch {
      // ignore
    }

    if (updatedSettings.logo.updateFavicon) {
      updateBrowserFavicon(finalUrl);
    }

    const successMessage = isFallbackDataUri
      ? 'Logo optimized and saved persistently in Cloud Firestore!'
      : 'Logo uploaded to Firebase Storage and published across the website!';

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
    console.error('Failed to save logo to Firestore:', dbErr);
    const isPermissionDenied = dbErr?.code === 'permission-denied';
    const dbErrorMsg = isPermissionDenied
      ? `Permission denied saving to Firestore 'appSettings/website_design'. Ensure you are signed in as twizerefelix90@gmail.com.`
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
};

/**
 * Removes the uploaded website logo from Firestore and restores empty default logo state.
 */
export const removeAndSaveWebsiteLogo = async (
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser || !isAuthorizedAdminEmail(currentUser.email)) {
    return {
      success: false,
      error: 'Administrator authentication required (twizerefelix90@gmail.com).'
    };
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: false, error: 'Cloud Firestore is not connected.' };
  }

  try {
    const currentSettings = await getWebsiteDesignSettings();
    const updatedSettings: WebsiteDesignSettings = stripUndefinedDeep({
      ...currentSettings,
      logo: {
        ...DEFAULT_WEBSITE_DESIGN.logo,
        logoUrl: '',
        isCustomLogo: false
      },
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.email || adminUid
    });

    await setDoc(doc(db, 'appSettings', 'website_design'), updatedSettings, { merge: true });
    try {
      await setDoc(
        doc(db, 'siteSettings', 'branding'),
        {
          logoData: '',
          updatedAt: updatedSettings.updatedAt,
          updatedBy: currentUser.email || adminUid
        },
        { merge: true }
      );
    } catch {
      // non-fatal
    }

    try {
      localStorage.setItem(DESIGN_STORAGE_KEY, JSON.stringify(updatedSettings));
    } catch {
      // ignore
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to remove logo.'
    };
  }
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
  const fontScale = typography.fontScale && typography.fontScale >= 0.7 && typography.fontScale <= 1.8 
    ? typography.fontScale 
    : 1.0;
  const rootPx = Math.round(16 * fontScale * 100) / 100;

  // Apply root font-size directly to documentElement for instant effect
  document.documentElement.style.fontSize = `${rootPx}px`;

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
    html {
      font-size: ${rootPx}px !important;
    }

    :root {
      --app-font-scale: ${fontScale};
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
      --app-website-name-font: ${typography.websiteNameFontFamily || DEFAULT_WEBSITE_DESIGN.typography.websiteNameFontFamily};
      --app-website-name-size: ${typography.websiteNameSize || DEFAULT_WEBSITE_DESIGN.typography.websiteNameSize}px;
      --app-website-name-color: ${sanitizeHexColor(typography.websiteNameColor, colors.headerText || '#0f172a')};

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
