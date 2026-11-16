import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, setLogLevel, Firestore } from 'firebase/firestore';
import { FirebaseConnectionConfig } from '../types/platform';

const FIREBASE_CONFIG_STORAGE_KEY = 'isezerano_firebase_config';
const LEGACY_FIREBASE_CONFIG_KEY = 'rwanda_cbc_firebase_config';

export const CANONICAL_FIREBASE_CONFIG: FirebaseConnectionConfig = {
  apiKey: 'AIzaSyBJToe1yvQJ8ZRRXn6xwOYxh8wZOa4HO0c',
  authDomain: 'isezerano-news.firebaseapp.com',
  projectId: 'isezerano-news',
  storageBucket: 'isezerano-news.firebasestorage.app',
  messagingSenderId: '37703708100',
  appId: '1:37703708100:web:4e59c508899434b8b74891',
  measurementId: 'G-XVJBQX90HX',
  firestoreDatabaseId: '(default)',
  enabled: true
};

export const parseFirebaseConfigSnippet = (raw: string): Partial<FirebaseConnectionConfig> | null => {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();

  if (/^AIza[0-9A-Za-z-_]{25,}/.test(text)) {
    return {
      apiKey: text,
      projectId: 'isezerano-news',
      authDomain: 'isezerano-news.firebaseapp.com',
      storageBucket: 'isezerano-news.firebasestorage.app',
      enabled: true
    };
  }

  try {
    const apiKeyMatch = text.match(/apiKey\s*:\s*["']([^"']+)["']/);
    const authDomainMatch = text.match(/authDomain\s*:\s*["']([^"']+)["']/);
    const projectIdMatch = text.match(/projectId\s*:\s*["']([^"']+)["']/);
    const storageBucketMatch = text.match(/storageBucket\s*:\s*["']([^"']+)["']/);
    const messagingSenderIdMatch = text.match(/messagingSenderId\s*:\s*["']([^"']+)["']/);
    const appIdMatch = text.match(/appId\s*:\s*["']([^"']+)["']/);

    if (apiKeyMatch || projectIdMatch) {
      return {
        apiKey: apiKeyMatch ? apiKeyMatch[1].trim() : undefined,
        authDomain: authDomainMatch ? authDomainMatch[1].trim() : 'isezerano-news.firebaseapp.com',
        projectId: projectIdMatch ? projectIdMatch[1].trim() : 'isezerano-news',
        storageBucket: storageBucketMatch ? storageBucketMatch[1].trim() : 'isezerano-news.firebasestorage.app',
        messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1].trim() : undefined,
        appId: appIdMatch ? appIdMatch[1].trim() : undefined,
        enabled: true
      };
    }
  } catch {
    // continue
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      return {
        ...parsed,
        enabled: true
      };
    }
  } catch {
    // continue
  }

  return null;
};

export const getFirebaseConfig = (): FirebaseConnectionConfig => {
  let stored: Partial<FirebaseConnectionConfig> = {};
  try {
    if (typeof localStorage !== 'undefined') {
      const raw =
        localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_FIREBASE_CONFIG_KEY);
      if (raw) stored = JSON.parse(raw);
    }
  } catch {
    // fallback
  }

  const envApiKey = ((import.meta as any).env?.VITE_FIREBASE_API_KEY || '').trim();
  const envAuthDomain = ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  const envProjectId = ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || '').trim();
  const envStorageBucket = ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
  const envMessagingSenderId = ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
  const envAppId = ((import.meta as any).env?.VITE_FIREBASE_APP_ID || '').trim();
  const envMeasurementId = (
    (import.meta as any).env?.VITE_GA_MEASUREMENT_ID ||
    (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID ||
    ''
  ).trim();

  const apiKey = (stored.apiKey || envApiKey || CANONICAL_FIREBASE_CONFIG.apiKey).trim();
  const projectId = (stored.projectId || envProjectId || CANONICAL_FIREBASE_CONFIG.projectId).trim();
  const authDomain = (
    stored.authDomain ||
    envAuthDomain ||
    (projectId ? `${projectId}.firebaseapp.com` : CANONICAL_FIREBASE_CONFIG.authDomain)
  ).trim();
  const storageBucket = (
    stored.storageBucket ||
    envStorageBucket ||
    (projectId ? `${projectId}.firebasestorage.app` : CANONICAL_FIREBASE_CONFIG.storageBucket)
  ).trim();
  const messagingSenderId = (
    stored.messagingSenderId ||
    envMessagingSenderId ||
    CANONICAL_FIREBASE_CONFIG.messagingSenderId ||
    ''
  ).trim();
  const appId = (stored.appId || envAppId || CANONICAL_FIREBASE_CONFIG.appId || '').trim();
  const measurementId = (
    stored.measurementId ||
    envMeasurementId ||
    CANONICAL_FIREBASE_CONFIG.measurementId ||
    ''
  ).trim();
  const firestoreDatabaseId =
    stored.firestoreDatabaseId || CANONICAL_FIREBASE_CONFIG.firestoreDatabaseId || '(default)';
  const enabled = stored.enabled !== undefined ? stored.enabled : Boolean(apiKey && projectId);

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
    firestoreDatabaseId,
    enabled
  };
};

let initializedFirebaseApp: FirebaseApp | null = null;
let initializedDb: Firestore | null = null;
let initializedAuth: Auth | null = null;

export const resetFirebaseInitialization = (): void => {
  initializedFirebaseApp = null;
  initializedDb = null;
  initializedAuth = null;
};

export const saveFirebaseConfig = (config: FirebaseConnectionConfig): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  }
  resetFirebaseInitialization();
  initFirebaseApp();
};

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
};

export const initFirebaseApp = (): FirebaseApp | null => {
  if (initializedFirebaseApp) {
    return initializedFirebaseApp;
  }

  const config = getFirebaseConfig();
  if (!config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length > 0) {
      initializedFirebaseApp = getApp();
    } else {
      initializedFirebaseApp = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
        projectId: config.projectId,
        storageBucket: config.storageBucket || `${config.projectId}.firebasestorage.app`,
        messagingSenderId: config.messagingSenderId || '',
        appId: config.appId || '',
        measurementId: config.measurementId || ''
      });
    }
    return initializedFirebaseApp;
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
    return null;
  }
};

export const getFirebaseApp = (): FirebaseApp | null => {
  return initFirebaseApp();
};

export const initFirestoreIfConfigured = (): Firestore | null => {
  if (initializedDb) {
    return initializedDb;
  }
  const appInstance = initFirebaseApp();
  if (!appInstance) return null;

  try {
    setLogLevel('silent');
  } catch {
    // ignore
  }

  const config = getFirebaseConfig();
  try {
    initializedDb = getFirestore(appInstance, config.firestoreDatabaseId || '(default)');
    return initializedDb;
  } catch (err) {
    console.warn('Firestore initialization notice:', err);
    return null;
  }
};

export const getFirebaseAuth = (): Auth | null => {
  if (initializedAuth) {
    return initializedAuth;
  }
  const appInstance = initFirebaseApp();
  if (!appInstance) return null;

  try {
    initializedAuth = getAuth(appInstance);
    return initializedAuth;
  } catch (err) {
    console.warn('Firebase Auth initialization notice:', err);
    return null;
  }
};

export const app = initFirebaseApp();
export const db = initFirestoreIfConfigured() as Firestore;

export const FEATURE_FLAGS = {
  ENABLE_ADMIN_UI: true
} as const;
