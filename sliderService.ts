import { HeroSlide, PresetImage } from '../types/slider';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { initFirestoreIfConfigured } from './storageService';

const SLIDES_STORAGE_KEY = 'isezerano_homepage_slides';

/**
 * Curated high-resolution education photography presets
 * Optimized for classroom, pedagogy, and Rwandan CBC context.
 */
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

/**
 * High-quality initial default slides displayed when no custom slides have been published yet.
 */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: 'default-slide-1',
    headline: 'Empowering Rwandan Educators with Competence-Based Planning',
    description: 'Designed for primary and secondary school teachers to prepare structured, REB-compliant 8-column lesson plans with ease and confidence.',
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
    description: 'Easily formulate Bloom’s taxonomy objectives, teacher and learner activities, pedagogical materials, and continuous evaluation steps.',
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
    description: 'Generate crisp, official PDF tables formatted to standard A4 specifications ready for classroom inspection, filing, and delivery.',
    imageUrl: PRESET_EDUCATION_IMAGES[2].url,
    buttonText: 'About Platform',
    buttonLink: 'about',
    order: 3,
    published: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

/**
 * Client-side canvas compression utility to ensure 100% free operation:
 * Takes an uploaded image file from phone or computer, resizes it to max 1200x800px,
 * and compresses it to an optimized base64 JPEG/WebP string (~40KB - 80KB).
 * This allows direct storage in Firestore Spark free tier with ZERO additional service costs.
 */
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

        // Convert to lightweight data URL
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

/**
 * Read cached slides from browser local storage.
 */
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

/**
 * Cache slides to browser local storage.
 */
export const setLocalSlides = (slides: HeroSlide[]): void => {
  try {
    localStorage.setItem(SLIDES_STORAGE_KEY, JSON.stringify(slides));
  } catch (err) {
    console.warn('Could not save slides to local storage:', err);
  }
};

/**
 * Fetch published slides for the homepage hero carousel.
 * Checks Firestore first, falling back smoothly to local storage cache or defaults.
 */
export const getPublishedSlides = async (): Promise<HeroSlide[]> => {
  const local = getLocalSlides();
  const db = initFirestoreIfConfigured();

  if (!db) {
    return local.filter(s => s.published);
  }

  try {
    const colRef = collection(db, 'homepage_slides');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const remoteSlides: HeroSlide[] = [];
      snap.forEach((docSnap) => {
        remoteSlides.push(docSnap.data() as HeroSlide);
      });

      remoteSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
      setLocalSlides(remoteSlides);
      const published = remoteSlides.filter(s => s.published);
      return published.length > 0 ? published : DEFAULT_HERO_SLIDES;
    }
  } catch (err) {
    console.warn('Firestore fetch homepage_slides error, using local fallback:', err);
  }

  const filteredLocal = local.filter(s => s.published);
  return filteredLocal.length > 0 ? filteredLocal : DEFAULT_HERO_SLIDES;
};

/**
 * Real-time subscription to published homepage slides.
 * Synchronizes slides across all devices immediately.
 */
export const subscribeToPublishedSlides = (
  onUpdate: (slides: HeroSlide[]) => void
): (() => void) => {
  const db = initFirestoreIfConfigured();
  if (!db) return () => {};

  try {
    const colRef = collection(db, 'homepage_slides');
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
          const published = remoteSlides.filter(s => s.published);
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

/**
 * Fetch all slides for the Admin management panel (both published and draft).
 */
export const getAllSlidesAdmin = async (): Promise<HeroSlide[]> => {
  const local = getLocalSlides();
  const db = initFirestoreIfConfigured();

  if (!db) {
    return local;
  }

  try {
    const colRef = collection(db, 'homepage_slides');
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

/**
 * Save or update a single slide (Admin action).
 */
export const saveSlideAdmin = async (
  slide: HeroSlide
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentSlides = getLocalSlides();
    const existingIndex = currentSlides.findIndex(s => s.id === slide.id);
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

    // Sync to Firestore if available
    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        const docRef = doc(db, 'homepage_slides', normalizedSlide.id);
        await setDoc(docRef, normalizedSlide, { merge: true });
      } catch (firestoreErr: any) {
        console.warn('Firestore sync warning for homepage_slides:', firestoreErr?.code || firestoreErr?.message);
        return { 
          success: true, 
          error: firestoreErr?.code === 'permission-denied'
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

/**
 * Delete a slide (Admin action).
 */
export const deleteSlideAdmin = async (
  slideId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentSlides = getLocalSlides();
    const filtered = currentSlides.filter(s => s.id !== slideId);
    setLocalSlides(filtered);

    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        const docRef = doc(db, 'homepage_slides', slideId);
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

/**
 * Save new order for all slides (Admin action).
 */
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

    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        const batch = writeBatch(db);
        ordered.forEach(slide => {
          const docRef = doc(db, 'homepage_slides', slide.id);
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
