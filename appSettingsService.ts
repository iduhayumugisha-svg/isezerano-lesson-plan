import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '../types/lessonPlan';
import { initFirestoreIfConfigured } from './storageService';
import { PRIMARY_GRADES, SECONDARY_GRADES } from '../data/rwandaCbcData';

const SETTINGS_STORAGE_KEY = 'isezerano_app_settings';

export const defaultAppSettings: AppSettings = {
  schoolDefaultName: 'GS GITUMBA',
  academicYear: '2025-2026',
  curriculumVersion: 'Rwanda CBC 2026 (MINEDUC / REB)',
  enabledModules: {
    studentIdentification: true,
    aiAssistance: true,
    cloudSync: true,
    printExport: true
  },
  availableClasses: [
    ...PRIMARY_GRADES,
    ...SECONDARY_GRADES
  ],
  availableSubjects: [
    'Kinyarwanda',
    'English',
    'Mathematics',
    'Science & Elementary Technology (SET)',
    'Social Studies',
    'French',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Entrepreneurship',
    'ICT & Computer Science'
  ],
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

/**
 * Load application settings from Firestore `appSettings/general`
 * with localStorage fallback
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'general');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const remoteData = snap.data() as AppSettings;
        const merged = { ...defaultAppSettings, ...remoteData };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.warn('Could not read appSettings from Firestore, falling back to cache:', err);
    }
  }

  try {
    const cached = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (cached) {
      return { ...defaultAppSettings, ...JSON.parse(cached) };
    }
  } catch {
    // fallback
  }

  return defaultAppSettings;
};

/**
 * Save application settings to Firestore `appSettings/general`
 * Restricted to Admins in Firestore Security Rules
 */
export const saveAppSettings = async (
  settings: AppSettings, 
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  const updatedSettings: AppSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid
  };

  // Always update local storage first so changes are preserved
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
  } catch (e) {
    console.warn('Failed to cache settings in localStorage:', e);
  }

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'general');
      await setDoc(docRef, updatedSettings);
      return { success: true };
    } catch (err: any) {
      console.warn('Firestore write warning for appSettings/general:', err?.code || err?.message);
      return { success: true };
    }
  }

  return { success: true };
};

/**
 * Real-time subscription to platform settings.
 */
export const subscribeToAppSettings = (
  onUpdate: (settings: AppSettings) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db) return () => {};

  try {
    const docRef = doc(db, 'appSettings', 'general');
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as AppSettings;
          const merged = { ...defaultAppSettings, ...remoteData };
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          onUpdate(merged);
        }
      },
      (err) => {
        console.warn('appSettings subscription error:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach appSettings subscription:', err);
    return () => {};
  }
};
