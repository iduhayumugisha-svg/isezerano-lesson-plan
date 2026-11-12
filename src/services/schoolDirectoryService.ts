/**
 * School Directory Service
 * Provides auto-fill data for schools in Rwanda and enables administrators to
 * add, edit, and manage school directory records with Cloud Firestore sync & local persistence.
 */
import { doc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { SchoolDirectoryEntry, VERIFIED_RWANDA_SCHOOLS } from '../data/rwandaSchoolsData';
import { initFirestoreIfConfigured } from './storageService';

const STORAGE_CUSTOM_SCHOOLS = 'rw_school_directory_custom_v1';

/**
 * Get all schools (verified presets + admin added custom schools)
 */
export const getAllSchools = (): SchoolDirectoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_SCHOOLS);
    const custom: SchoolDirectoryEntry[] = raw ? JSON.parse(raw) : [];
    
    // Merge: custom schools can override presets if same id
    const map = new Map<string, SchoolDirectoryEntry>();
    VERIFIED_RWANDA_SCHOOLS.forEach(s => map.set(s.id, s));
    custom.forEach(s => map.set(s.id, s));

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return VERIFIED_RWANDA_SCHOOLS;
  }
};

/**
 * Search schools by keyword (matching name, district, or sector)
 */
export const searchSchools = (query: string): SchoolDirectoryEntry[] => {
  const all = getAllSchools();
  if (!query || query.trim() === '') return all;
  const q = query.toLowerCase().trim();
  return all.filter(s => 
    s.name.toLowerCase().includes(q) ||
    s.district.toLowerCase().includes(q) ||
    s.sector.toLowerCase().includes(q) ||
    (s.province && s.province.toLowerCase().includes(q))
  );
};

/**
 * Find school by ID
 */
export const getSchoolById = (id: string): SchoolDirectoryEntry | null => {
  const all = getAllSchools();
  return all.find(s => s.id === id) || null;
};

/**
 * Save / Add / Update a school (Admin privilege)
 */
export const saveSchoolEntry = async (
  entry: Omit<SchoolDirectoryEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  adminUid?: string
): Promise<{ success: boolean; entry?: SchoolDirectoryEntry; error?: string }> => {
  try {
    const existingId = entry.id || `sch-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullEntry: SchoolDirectoryEntry = {
      ...entry,
      id: existingId,
      isOfficialPreset: entry.isOfficialPreset ?? false,
      ownerUid: adminUid || 'admin',
      updatedAt: new Date().toISOString(),
      createdAt: entry.id ? undefined : new Date().toISOString()
    };

    // Save in local storage custom store
    const raw = localStorage.getItem(STORAGE_CUSTOM_SCHOOLS);
    const current: SchoolDirectoryEntry[] = raw ? JSON.parse(raw) : [];
    const idx = current.findIndex(s => s.id === existingId);
    if (idx >= 0) {
      current[idx] = fullEntry;
    } else {
      current.push(fullEntry);
    }
    localStorage.setItem(STORAGE_CUSTOM_SCHOOLS, JSON.stringify(current));

    // Sync to Cloud Firestore if configured
    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        const docRef = doc(db, 'school_directory', existingId);
        await setDoc(docRef, fullEntry, { merge: true });
      } catch (cloudErr) {
        console.warn('[School Directory] Cloud sync skipped:', cloudErr);
      }
    }

    return { success: true, entry: fullEntry };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save school directory entry';
    return { success: false, error: msg };
  }
};

/**
 * Delete a school entry (Admin privilege)
 */
export const deleteSchoolEntry = async (id: string): Promise<boolean> => {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_SCHOOLS);
    const current: SchoolDirectoryEntry[] = raw ? JSON.parse(raw) : [];
    const filtered = current.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_CUSTOM_SCHOOLS, JSON.stringify(filtered));

    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        await deleteDoc(doc(db, 'school_directory', id));
      } catch (cloudErr) {
        console.warn('[School Directory] Cloud delete skipped:', cloudErr);
      }
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Sync directory with Cloud Firestore
 */
export const syncSchoolDirectoryFromCloud = async (): Promise<SchoolDirectoryEntry[]> => {
  const db = initFirestoreIfConfigured();
  if (!db) return getAllSchools();

  try {
    const snap = await getDocs(collection(db, 'school_directory'));
    if (!snap.empty) {
      const cloudSchools: SchoolDirectoryEntry[] = [];
      snap.forEach(docSnap => {
        cloudSchools.push(docSnap.data() as SchoolDirectoryEntry);
      });

      const raw = localStorage.getItem(STORAGE_CUSTOM_SCHOOLS);
      const current: SchoolDirectoryEntry[] = raw ? JSON.parse(raw) : [];
      const map = new Map<string, SchoolDirectoryEntry>();
      current.forEach(s => map.set(s.id, s));
      cloudSchools.forEach(s => map.set(s.id, s));
      const merged = Array.from(map.values());
      localStorage.setItem(STORAGE_CUSTOM_SCHOOLS, JSON.stringify(merged));
    }
  } catch (err) {
    console.warn('[School Directory] Cloud fetch error:', err);
  }

  return getAllSchools();
};
