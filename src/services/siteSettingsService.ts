import {
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, getFirebaseAuth } from '../config/firebase';
import {
  AdsSettings,
  DEFAULT_ADS_SETTINGS,
  DEFAULT_GLOBAL_AD_SCRIPT_CONFIG,
  DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS,
  DEFAULT_IN_ARTICLE_ADS_SETTINGS,
  DEFAULT_TOP_VIDEO_AD_CONFIG
} from '../types/platform';
import { normalizeAdsDisplaySettings } from '../utils/displaySettingsUtils';
import { normalizeTopVideoAdConfig } from './shopVideoService';
import {
  normalizeGlobalAdScriptConfig,
  normalizeHomepageInFeedAdsSettings,
  normalizeInArticleAdsSettings,
  normalizeStandardAdSlotConfig
} from '../utils/inArticleAdUtils';
import { isAuthorizedAdminEmail } from './authService';

// ==================== ADS SETTINGS ====================
const ADS_STORAGE_KEY = 'isezerano_ads_settings';

const normalizeAdsSettingsPayload = (remoteData?: Partial<AdsSettings> | null): AdsSettings => {
  if (!remoteData) {
    return {
      ...DEFAULT_ADS_SETTINGS,
      belowHeaderAd: normalizeStandardAdSlotConfig(
        DEFAULT_ADS_SETTINGS.belowHeaderAd,
        DEFAULT_ADS_SETTINGS.belowHeaderAd,
        true
      ),
      aboveFooterAd: normalizeStandardAdSlotConfig(
        DEFAULT_ADS_SETTINGS.aboveFooterAd,
        DEFAULT_ADS_SETTINGS.aboveFooterAd,
        true
      ),
      inArticleAds: {
        slot1: { ...DEFAULT_IN_ARTICLE_ADS_SETTINGS.slot1 },
        slot2: { ...DEFAULT_IN_ARTICLE_ADS_SETTINGS.slot2 },
        slot3: { ...DEFAULT_IN_ARTICLE_ADS_SETTINGS.slot3 }
      },
      homepageInFeedAds: {
        slot1: { ...DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS.slot1 },
        slot2: { ...DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS.slot2 },
        slot3: { ...DEFAULT_HOMEPAGE_IN_FEED_ADS_SETTINGS.slot3 }
      },
      globalScripts: { ...DEFAULT_GLOBAL_AD_SCRIPT_CONFIG },
      aboveHeaderVideoAd: { ...DEFAULT_TOP_VIDEO_AD_CONFIG },
      displaySettings: normalizeAdsDisplaySettings(DEFAULT_ADS_SETTINGS.displaySettings)
    };
  }
  return {
    masterEnabled: remoteData.masterEnabled ?? DEFAULT_ADS_SETTINGS.masterEnabled,
    belowHeaderAd: normalizeStandardAdSlotConfig(
      remoteData.belowHeaderAd,
      DEFAULT_ADS_SETTINGS.belowHeaderAd,
      true
    ),
    aboveFooterAd: normalizeStandardAdSlotConfig(
      remoteData.aboveFooterAd,
      DEFAULT_ADS_SETTINGS.aboveFooterAd,
      true
    ),
    inArticleAds: normalizeInArticleAdsSettings(remoteData.inArticleAds, true),
    homepageInFeedAds: normalizeHomepageInFeedAdsSettings(remoteData.homepageInFeedAds, true),
    globalScripts: normalizeGlobalAdScriptConfig(remoteData.globalScripts, true),
    aboveHeaderVideoAd: normalizeTopVideoAdConfig(remoteData.aboveHeaderVideoAd),
    displaySettings: normalizeAdsDisplaySettings(remoteData.displaySettings),
    updatedAt: remoteData.updatedAt || new Date().toISOString(),
    updatedBy: remoteData.updatedBy || 'admin'
  };
};

export const hasCachedAdsSettingsSync = (): boolean => {
  if (typeof localStorage === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem(ADS_STORAGE_KEY));
  } catch {
    return false;
  }
};

export const getCachedAdsSettingsSync = (): AdsSettings => {
  if (typeof localStorage === 'undefined') return DEFAULT_ADS_SETTINGS;
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (raw) {
      return normalizeAdsSettingsPayload(JSON.parse(raw));
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_ADS_SETTINGS;
};

let sharedAdsSettings: AdsSettings | null = null;
const sharedAdsSubscribers = new Set<(settings: AdsSettings) => void>();
let sharedAdsUnsubscribe: (() => void) | null = null;
let pendingAdsFetch: Promise<AdsSettings> | null = null;

export const __resetAdsSettingsCacheForTests = (): void => {
  sharedAdsSettings = null;
  pendingAdsFetch = null;
  sharedAdsSubscribers.clear();
  if (sharedAdsUnsubscribe) {
    sharedAdsUnsubscribe();
    sharedAdsUnsubscribe = null;
  }
};

const parseFirestoreRestValue = (val: any): any => {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(parseFirestoreRestValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
};

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

const fetchAdsSettingsViaRest = async (): Promise<Partial<AdsSettings> | null> => {
  if (typeof fetch !== 'function') return null;
  try {
    const res = await fetch(
      'https://firestore.googleapis.com/v1/projects/isezerano-news/databases/(default)/documents/appSettings/ads',
      { method: 'GET', cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.fields) return null;
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(json.fields)) {
      out[k] = parseFirestoreRestValue(v);
    }
    return out as Partial<AdsSettings>;
  } catch {
    return null;
  }
};

const notifyAdsSubscribers = (settings: AdsSettings) => {
  sharedAdsSettings = settings;
  sharedAdsSubscribers.forEach((cb) => {
    try {
      cb(settings);
    } catch {
      // ignore subscriber callback error
    }
  });
};

export const getAdsSettings = async (forceRefresh = false): Promise<AdsSettings> => {
  if (sharedAdsSettings && !forceRefresh) {
    return sharedAdsSettings;
  }

  const localData = getCachedAdsSettingsSync();
  if (pendingAdsFetch && !forceRefresh) {
    return pendingAdsFetch;
  }

  pendingAdsFetch = (async () => {
    try {
      const restData = await fetchAdsSettingsViaRest();
      if (restData) {
        const merged = normalizeAdsSettingsPayload(restData);
        try {
          localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        notifyAdsSubscribers(merged);
        return merged;
      }

      if (db) {
        const docRef = doc(db, 'appSettings', 'ads');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const merged = normalizeAdsSettingsPayload(snap.data() as Partial<AdsSettings>);
          try {
            localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(merged));
          } catch {
            // ignore
          }
          notifyAdsSubscribers(merged);
          return merged;
        }
      }
    } catch (err) {
      console.warn('Could not load ads settings from Firestore, using local fallback:', err);
    } finally {
      pendingAdsFetch = null;
    }
    return localData;
  })();

  return pendingAdsFetch;
};

export const saveAdsSettings = async (
  settings: AdsSettings,
  adminUid: string
): Promise<{ success: boolean; error?: string; isLocalFallback?: boolean }> => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser || !isAuthorizedAdminEmail(currentUser.email)) {
    return {
      success: false,
      error: 'Administrator Google authentication (twizerefelix90@gmail.com) is required to modify Ad settings.'
    };
  }

  const payload: AdsSettings = stripUndefinedDeep({
    ...settings,
    belowHeaderAd: normalizeStandardAdSlotConfig(
      settings.belowHeaderAd,
      DEFAULT_ADS_SETTINGS.belowHeaderAd,
      true
    ),
    aboveFooterAd: normalizeStandardAdSlotConfig(
      settings.aboveFooterAd,
      DEFAULT_ADS_SETTINGS.aboveFooterAd,
      true
    ),
    inArticleAds: normalizeInArticleAdsSettings(settings.inArticleAds, true),
    homepageInFeedAds: normalizeHomepageInFeedAdsSettings(settings.homepageInFeedAds, true),
    globalScripts: normalizeGlobalAdScriptConfig(settings.globalScripts, true),
    aboveHeaderVideoAd: normalizeTopVideoAdConfig(settings.aboveHeaderVideoAd),
    displaySettings: normalizeAdsDisplaySettings(settings.displaySettings),
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid
  });

  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to cache ads settings locally:', err);
  }
  notifyAdsSubscribers(payload);

  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'ads');
      await setDoc(docRef, payload, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.warn('Could not save ads settings to Firestore:', err);
      return {
        success: true,
        isLocalFallback: true,
        error: err?.message || 'Saved locally on this device. Deploy Firestore rules to sync across all devices.'
      };
    }
  }

  return { success: true, isLocalFallback: true };
};

export const subscribeToAdsSettings = (
  onUpdate: (settings: AdsSettings) => void
): (() => void) => {
  sharedAdsSubscribers.add(onUpdate);
  if (sharedAdsSettings) {
    onUpdate(sharedAdsSettings);
  }

  if (db && !sharedAdsUnsubscribe) {
    try {
      const docRef = doc(db, 'appSettings', 'ads');
      sharedAdsUnsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const merged = normalizeAdsSettingsPayload(snap.data() as Partial<AdsSettings>);
            try {
              localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(merged));
            } catch {
              // ignore
            }
            notifyAdsSubscribers(merged);
          }
        },
        (error) => {
          console.warn('Ads snapshot listener error:', error);
        }
      );
    } catch (err) {
      console.warn('Failed to subscribe to ads settings:', err);
    }
  }

  return () => {
    sharedAdsSubscribers.delete(onUpdate);
    if (sharedAdsSubscribers.size === 0 && sharedAdsUnsubscribe) {
      sharedAdsUnsubscribe();
      sharedAdsUnsubscribe = null;
    }
  };
};
