import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { initFirestoreIfConfigured } from './storageService';
import { AdsSettings, DEFAULT_ADS_SETTINGS, HeroSlide, PresetImage } from '../types/platform';
import { AppSettings } from '../types/lessonPlan';
import { PRIMARY_GRADES, SECONDARY_GRADES } from '../data/rwandaEducationData';

// ==================== ADS SETTINGS ====================
const ADS_STORAGE_KEY = 'isezerano_ads_settings';

export const getAdsSettings = async (): Promise<AdsSettings> => {
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

export const saveAdsSettings = async (
  settings: AdsSettings,
  adminUid: string
): Promise<{ success: boolean; error?: string; isLocalFallback?: boolean }> => {
  const payload: AdsSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid
  };

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

export const subscribeToAdsSettings = (
  onUpdate: (settings: AdsSettings) => void
): (() => void) => {
  if (!db) return () => {};

  try {
    const docRef = doc(db, 'appSettings', 'ads');
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
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
      },
      (error) => {
        console.warn('Ads snapshot listener error:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to ads settings:', err);
    return () => {};
  }
};

// ==================== GENERAL APP SETTINGS ====================
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
  availableClasses: [...PRIMARY_GRADES, ...SECONDARY_GRADES],
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

export const getAppSettings = async (): Promise<AppSettings> => {
  const firestore = initFirestoreIfConfigured();
  if (firestore) {
    try {
      const docRef = doc(firestore, 'appSettings', 'general');
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

export const saveAppSettings = async (
  settings: AppSettings,
  adminUid: string
): Promise<{ success: boolean; error?: string }> => {
  const updatedSettings: AppSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminUid
  };

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
  } catch (e) {
    console.warn('Failed to cache settings in localStorage:', e);
  }

  const firestore = initFirestoreIfConfigured();
  if (firestore) {
    try {
      const docRef = doc(firestore, 'appSettings', 'general');
      await setDoc(docRef, updatedSettings);
      return { success: true };
    } catch (err: any) {
      console.warn('Firestore write warning for appSettings/general:', err?.code || err?.message);
      return { success: true };
    }
  }

  return { success: true };
};

export const subscribeToAppSettings = (
  onUpdate: (settings: AppSettings) => void
): (() => void) => {
  const firestore = initFirestoreIfConfigured();
  if (!firestore) return () => {};

  try {
    const docRef = doc(firestore, 'appSettings', 'general');
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

// ==================== HOMEPAGE SLIDER SETTINGS ====================
const SLIDES_STORAGE_KEY = 'isezerano_homepage_slides';

export const PRESET_EDUCATION_IMAGES: PresetImage[] = [
  {
    id: 'rwanda-class-1',
    title: 'Students Collaborative Group Learning',
    category: 'Classroom',
    url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'teacher-blackboard-2',
    title: 'Teacher Delivering CBC Lesson',
    category: 'Pedagogy',
    url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'students-library-3',
    title: 'Learners Reading and Researching',
    category: 'Study',
    url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'science-stem-4',
    title: 'Science & Technology Lab Session',
    category: 'STEM',
    url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'interactive-learning-5',
    title: 'Active Primary Learner Engagement',
    category: 'Primary',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'digital-pedagogy-6',
    title: 'Digital Tools & Teacher Planning',
    category: 'Technology',
    url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'
  }
];

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'default-slide-1',
    headline: 'Empowering Rwandan Educators with Competence-Based Planning',
    description:
      'Designed for primary and secondary school teachers to prepare structured, REB-compliant 8-column lesson plans with ease and confidence.',
    imageUrl: PRESET_EDUCATION_IMAGES[0].url,
    buttonText: 'Open Dashboard',
    buttonLink: 'dashboard',
    order: 1,
    published: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'default-slide-2',
    headline: 'Structured 8-Column CBC Format Aligned with REB Standards',
    description:
      'Easily formulate Bloom’s taxonomy objectives, teacher and learner activities, pedagogical materials, and continuous evaluation steps.',
    imageUrl: PRESET_EDUCATION_IMAGES[1].url,
    buttonText: 'Create Lesson Plan',
    buttonLink: 'create',
    order: 2,
    published: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'default-slide-3',
    headline: 'Clean Printable A4 Exports for Classroom Teaching',
    description:
      'Generate crisp, official PDF tables formatted to standard A4 specifications ready for classroom inspection, filing, and delivery.',
    imageUrl: PRESET_EDUCATION_IMAGES[2].url,
    buttonText: 'About Platform',
    buttonLink: 'about',
    order: 3,
    published: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

export const compressImageFile = (
  file: File,
  maxWidth = 1200,
  maxHeight = 800,
  quality = 0.76
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file must be an image (JPEG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Unable to create Canvas rendering context.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image file for compression.'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the selected image file.'));
    };

    reader.readAsDataURL(file);
  });
};

export const getLocalSlides = (): HeroSlide[] => {
  try {
    const raw = localStorage.getItem(SLIDES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
  } catch (err) {
    console.warn('Could not read local slides cache:', err);
  }
  return DEFAULT_HERO_SLIDES;
};

export const setLocalSlides = (slides: HeroSlide[]): void => {
  try {
    localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slides));
  } catch (err) {
    console.warn('Could not save slides to local storage:', err);
  }
};

export const getPublishedSlides = async (): Promise<HeroSlide[]> => {
  const local = getLocalSlides();
  const firestore = initFirestoreIfConfigured();

  if (!firestore) {
    return local.filter((s) => s.published);
  }

  try {
    const colRef = collection(firestore, 'homepage_slides');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteSlides: HeroSlide[] = [];
      snap.forEach((docSnap) => {
        remoteSlides.push(docSnap.data() as HeroSlide);
      });

      remoteSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLocalSlides(remoteSlides);
      const published = remoteSlides.filter((s) => s.published);
      return published.length > 0 ? published : DEFAULT_HERO_SLIDES;
    }
  } catch (err) {
    console.warn('Firestore fetch homepage_slides error, using local fallback:', err);
  }

  const filteredLocal = local.filter((s) => s.published);
  return filteredLocal.length > 0 ? filteredLocal : DEFAULT_HERO_SLIDES;
};

export const subscribeToPublishedSlides = (
  onUpdate: (slides: HeroSlide[]) => void
): (() => void) => {
  const firestore = initFirestoreIfConfigured();
  if (!firestore) return () => {};

  try {
    const colRef = collection(firestore, 'homepage_slides');
    return onSnapshot(
      colRef,
      (snap) => {
        if (!snap.empty) {
          const remoteSlides: HeroSlide[] = [];
          snap.forEach((docSnap) => {
            remoteSlides.push(docSnap.data() as HeroSlide);
          });
          remoteSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
          setLocalSlides(remoteSlides);
          const published = remoteSlides.filter((s) => s.published);
          onUpdate(published.length > 0 ? published : DEFAULT_HERO_SLIDES);
        }
      },
      (err) => {
        console.warn('homepage_slides real-time subscription notice:', err);
      }
    );
  } catch (err) {
    console.warn('Failed to attach homepage_slides subscription:', err);
    return () => {};
  }
};

export const getAllSlidesAdmin = async (): Promise<HeroSlide[]> => {
  const local = getLocalSlides();
  const firestore = initFirestoreIfConfigured();

  if (!firestore) {
    return local;
  }

  try {
    const colRef = collection(firestore, 'homepage_slides');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteSlides: HeroSlide[] = [];
      snap.forEach((docSnap) => {
        remoteSlides.push(docSnap.data() as HeroSlide);
      });

      remoteSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLocalSlides(remoteSlides);
      return remoteSlides;
    }
  } catch (err) {
    console.warn('Firestore getAllSlidesAdmin error, using local:', err);
  }

  return local;
};

export const saveSlideAdmin = async (
  slide: HeroSlide
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentSlides = getLocalSlides();
    const existingIndex = currentSlides.findIndex((s) => s.id === slide.id);
    let updatedSlides: HeroSlide[];

    const now = new Date().toISOString();
    const normalizedSlide: HeroSlide = {
      ...slide,
      updatedAt: now,
      createdAt: slide.createdAt || now
    };

    if (existingIndex >= 0) {
      updatedSlides = [...currentSlides];
      updatedSlides[existingIndex] = normalizedSlide;
    } else {
      updatedSlides = [...currentSlides, normalizedSlide];
    }

    updatedSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
    setLocalSlides(updatedSlides);

    const firestore = initFirestoreIfConfigured();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'homepage_slides', normalizedSlide.id);
        await setDoc(docRef, normalizedSlide, { merge: true });
      } catch (firestoreErr: any) {
        console.warn('Firestore sync warning for homepage_slides:', firestoreErr?.code || firestoreErr?.message);
        return {
          success: true,
          error:
            firestoreErr?.code === 'permission-denied'
              ? 'Slide saved locally. (Cloud sync requires publishing updated firestore.rules in Firebase Console).'
              : undefined
        };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save slide';
    return { success: false, error: msg };
  }
};

export const deleteSlideAdmin = async (
  slideId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentSlides = getLocalSlides();
    const filtered = currentSlides.filter((s) => s.id !== slideId);
    setLocalSlides(filtered);

    const firestore = initFirestoreIfConfigured();
    if (firestore) {
      try {
        const docRef = doc(firestore, 'homepage_slides', slideId);
        await deleteDoc(docRef);
      } catch (firestoreErr: unknown) {
        const msg = firestoreErr instanceof Error ? firestoreErr.message : 'Firestore error';
        return { success: false, error: `Failed to delete slide from database: ${msg}` };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete slide';
    return { success: false, error: msg };
  }
};

export const saveSlidesOrderAdmin = async (
  reorderedSlides: HeroSlide[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const ordered = reorderedSlides.map((s, idx) => ({
      ...s,
      order: idx + 1,
      updatedAt: new Date().toISOString()
    }));

    setLocalSlides(ordered);

    const firestore = initFirestoreIfConfigured();
    if (firestore) {
      try {
        const batch = writeBatch(firestore);
        ordered.forEach((slide) => {
          const docRef = doc(firestore, 'homepage_slides', slide.id);
          batch.set(docRef, slide, { merge: true });
        });
        await batch.commit();
      } catch (firestoreErr: unknown) {
        const msg = firestoreErr instanceof Error ? firestoreErr.message : 'Firestore batch error';
        return { success: false, error: `Failed to save order to database: ${msg}` };
      }
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reorder slides';
    return { success: false, error: msg };
  }
};
