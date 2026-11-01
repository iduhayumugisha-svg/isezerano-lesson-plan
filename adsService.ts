import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AdsSettings, DEFAULT_ADS_SETTINGS } from '../types/ads';

const ADS_STORAGE_KEY = 'isezerano_ads_settings';

/**
 * Loads current Ads settings from Firestore with local cache fallback.
 */
export const getAdsSettings = async (): Promise<AdsSettings> => {
  // Read local cache first for instant hydration
  let localData: AdsSettings | null = null;
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (raw) {
      localData = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'ads');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteData = snap.data() as Partial<AdsSettings>;
        const merged: AdsSettings = {
          masterEnabled: remoteData.masterEnabled ?? DEFAULT_ADS_SETTINGS.masterEnabled,
          belowHeaderAd: {
            ...DEFAULT_ADS_SETTINGS.belowHeaderAd,
            ...(remoteData.belowHeaderAd || {})
          },
          aboveFooterAd: {
            ...DEFAULT_ADS_SETTINGS.aboveFooterAd,
            ...(remoteData.aboveFooterAd || {})
          },
          updatedAt: remoteData.updatedAt || new Date().toISOString(),
          updatedBy: remoteData.updatedBy || 'admin'
        };

        // Cache freshest version
        try {
          localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        return merged;
      }
    } catch (err) {
      console.warn('Could not load ads settings from Firestore, using local fallback:', err);
    }
  }

  return localData || DEFAULT_ADS_SETTINGS;
};

/**
 * Saves Ads settings to Firestore (restricted to authorized admin) and updates local cache.
 */
export const saveAdsSettings = async (
  settings: AdsSettings,
  adminUid: string
): Promise<{ success: boolean; error?: string; isLocalFallback?: boolean }> => {
  const payload: AdsSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid
  };

  // Always update local cache immediately
  try {
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to cache ads settings locally:', err);
  }

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

/**
 * Real-time listener for Ads settings to keep live website synchronized with admin changes.
 */
export const subscribeToAdsSettings = (
  onUpdate: (settings: AdsSettings) => void
): (() => void) => {
  if (!db) return () => {};

  try {
    const docRef = doc(db, 'appSettings', 'ads');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const remoteData = snap.data() as Partial<AdsSettings>;
        const merged: AdsSettings = {
          masterEnabled: remoteData.masterEnabled ?? DEFAULT_ADS_SETTINGS.masterEnabled,
          belowHeaderAd: {
            ...DEFAULT_ADS_SETTINGS.belowHeaderAd,
            ...(remoteData.belowHeaderAd || {})
          },
          aboveFooterAd: {
            ...DEFAULT_ADS_SETTINGS.aboveFooterAd,
            ...(remoteData.aboveFooterAd || {})
          },
          updatedAt: remoteData.updatedAt || new Date().toISOString(),
          updatedBy: remoteData.updatedBy || 'admin'
        };

        try {
          localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(merged));
        } catch {
          // ignore
        }
        onUpdate(merged);
      }
    }, (error) => {
      console.warn('Ads snapshot listener error:', error);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to ads settings:', err);
    return () => {};
  }
};
