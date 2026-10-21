import { doc, getDoc, setDoc } from 'firebase/firestore';
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

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'appSettings', 'general');
      await setDoc(docRef, updatedSettings);
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings to Firestore';
      return { success: false, error: message };
    }
  }

  // Local fallback
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
  return { success: true };
};
