import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { NewsCategory, DEFAULT_NEWS_CATEGORIES } from '../types/category';
import { initFirestoreIfConfigured } from './storageService';

const CATEGORIES_STORAGE_KEY = 'isezerano_news_categories_cache';
const FIRESTORE_DOC_PATH = ['appSettings', 'news_categories'] as const;

export interface CategoriesSettingsDoc {
  categories: NewsCategory[];
  updatedAt: string;
  updatedBy: string;
}

/**
 * Load categories from Firestore with local storage fallback
 */
export const getNewsCategories = async (): Promise<NewsCategory[]> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as CategoriesSettingsDoc;
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          const sorted = [...data.categories].sort((a, b) => a.order - b.order);
          try {
            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(sorted));
          } catch {
            // ignore localStorage quota error
          }
          return sorted;
        }
      }
    } catch (err) {
      console.warn('Could not fetch news categories from Firestore, using cache:', err);
    }
  }

  // Fallback to local storage
  try {
    const cached = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as NewsCategory[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a.order - b.order);
      }
    }
  } catch {
    // ignore
  }

  return DEFAULT_NEWS_CATEGORIES;
};

/**
 * Save categories to Firestore and local cache
 */
export const saveNewsCategories = async (
  categories: NewsCategory[],
  adminEmailOrUid: string = 'admin'
): Promise<boolean> => {
  const sorted = [...categories].map((cat, idx) => ({
    ...cat,
    order: idx
  }));

  // Update local cache immediately
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(sorted));
  } catch {
    // ignore
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    console.warn('Firestore is not configured. Saved categories to localStorage only.');
    return true;
  }

  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    const payload: CategoriesSettingsDoc = {
      categories: sorted,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmailOrUid
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error('Failed to save categories to Firestore:', err);
    throw err;
  }
};

/**
 * Real-time subscription to categories in Firestore
 */
export const subscribeToNewsCategories = (
  callback: (categories: NewsCategory[]) => void
): (() => void) => {
  // Call callback immediately with cached or defaults
  getNewsCategories().then(callback).catch(() => callback(DEFAULT_NEWS_CATEGORIES));

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, FIRESTORE_DOC_PATH[0], FIRESTORE_DOC_PATH[1]);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as CategoriesSettingsDoc;
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            const sorted = [...data.categories].sort((a, b) => a.order - b.order);
            try {
              localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(sorted));
            } catch {
              // ignore
            }
            callback(sorted);
          }
        }
      },
      (error) => {
        console.warn('Error in news categories subscription:', error);
      }
    );
  } catch (err) {
    console.warn('Could not establish real-time listener for categories:', err);
    return () => {};
  }
};
