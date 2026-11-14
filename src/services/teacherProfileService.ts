import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { TeacherProfile } from '../types/platform';
import {
  initFirestoreIfConfigured,
  getFirebaseAuth
} from './storageService';
import { SUPER_ADMIN_EMAIL, isAuthorizedAdminEmail } from './authService';

const LOCAL_TEACHER_PROFILE_PREFIX = 'isezerano_teacher_profile_';
const LOCAL_ALL_TEACHER_PROFILES_KEY = 'isezerano_all_teacher_profiles';

const getLocalTeacherProfile = (uid: string): TeacherProfile | null => {
  try {
    const raw = localStorage.getItem(`${LOCAL_TEACHER_PROFILE_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Could not read local teacher profile cache:', e);
    return null;
  }
};

const saveLocalTeacherProfile = (profile: TeacherProfile): void => {
  try {
    localStorage.setItem(`${LOCAL_TEACHER_PROFILE_PREFIX}${profile.ownerUid}`, JSON.stringify(profile));
    
    // Also update all-profiles local table for admin fallback
    const rawAll = localStorage.getItem(LOCAL_ALL_TEACHER_PROFILES_KEY);
    const list: TeacherProfile[] = rawAll ? JSON.parse(rawAll) : [];
    const index = list.findIndex(p => p.ownerUid === profile.ownerUid);
    if (index >= 0) {
      list[index] = profile;
    } else {
      list.push(profile);
    }
    localStorage.setItem(LOCAL_ALL_TEACHER_PROFILES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Could not save local teacher profile cache:', e);
  }
};

/**
 * Fetch a teacher's profile from Firestore `teacher_profiles/{uid}`
 * Falls back to local storage and authenticated user details.
 */
export const getTeacherProfile = async (uid: string): Promise<TeacherProfile | null> => {
  if (!uid) return null;

  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'teacher_profiles', uid);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as TeacherProfile;
        const profile: TeacherProfile = {
          ...data,
          id: snapshot.id,
          ownerUid: data.ownerUid || uid,
          email: data.email || (currentUser?.uid === uid ? currentUser.email || '' : ''),
          fullName: data.fullName || (currentUser?.uid === uid ? currentUser.displayName || '' : ''),
          phone: data.phone || '',
          gender: data.gender || '',
          schoolName: data.schoolName || 'GS GITUMBA',
          qualification: data.qualification || '',
          subjectsTaught: Array.isArray(data.subjectsTaught) ? data.subjectsTaught : [],
          classesTaught: Array.isArray(data.classesTaught) ? data.classesTaught : [],
          experienceYears: data.experienceYears || '',
          district: data.district || 'Rulindo',
          sector: data.sector || 'Gitumba',
          bio: data.bio || '',
          updatedAt: data.updatedAt || new Date().toISOString()
        };

        saveLocalTeacherProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('Could not fetch teacher profile from Firestore:', err);
    }
  }

  // Fallback to local storage
  const local = getLocalTeacherProfile(uid);
  if (local) {
    return local;
  }

  // If user is currently signed in, provide default initialized profile
  if (currentUser && currentUser.uid === uid) {
    const defaultProfile: TeacherProfile = {
      ownerUid: uid,
      email: currentUser.email || '',
      fullName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Mwarimu',
      phone: '',
      gender: '',
      schoolName: 'GS GITUMBA',
      qualification: '',
      subjectsTaught: [],
      classesTaught: [],
      experienceYears: '',
      district: 'Rulindo',
      sector: 'Gitumba',
      bio: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveLocalTeacherProfile(defaultProfile);
    return defaultProfile;
  }

  return null;
};

/**
 * Save or update teacher profile in Firestore `teacher_profiles/{uid}`
 * Strictly enforces that:
 * 1. The teacher can only save under their own authenticated UID (`ownerUid`).
 * 2. The authenticated Google account email cannot be changed.
 * 3. No admin privileges or unauthorized fields can be injected.
 * 4. Updates are synchronized across devices.
 */
export const saveTeacherProfile = async (
  profile: TeacherProfile
): Promise<{ success: boolean; profile?: TeacherProfile; error?: string }> => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  // Strict ownership check: Must be signed in as the owner (or authorized admin)
  if (!currentUser) {
    return { success: false, error: 'You must be signed in with a Google account to save your profile.' };
  }

  const isSuperAdmin = isAuthorizedAdminEmail(currentUser.email);
  if (currentUser.uid !== profile.ownerUid && !isSuperAdmin) {
    return { success: false, error: 'Access denied: You can only edit your own teacher profile.' };
  }

  // Security: Prevent email or UID forgery
  const verifiedEmail = isSuperAdmin 
    ? (profile.email || currentUser.email || '') 
    : (currentUser.email || profile.email || '');

  const cleanedProfile: TeacherProfile = {
    id: profile.ownerUid,
    ownerUid: profile.ownerUid,
    email: verifiedEmail,
    fullName: (profile.fullName || '').trim(),
    phone: (profile.phone || '').trim(),
    gender: profile.gender || '',
    schoolName: (profile.schoolName || 'GS GITUMBA').trim(),
    qualification: (profile.qualification || '').trim(),
    subjectsTaught: Array.isArray(profile.subjectsTaught) ? profile.subjectsTaught : [],
    classesTaught: Array.isArray(profile.classesTaught) ? profile.classesTaught : [],
    experienceYears: (profile.experienceYears || '').toString().trim(),
    district: (profile.district || '').trim(),
    sector: (profile.sector || '').trim(),
    bio: (profile.bio || '').trim(),
    updatedAt: new Date().toISOString()
  };

  if (!cleanedProfile.createdAt) {
    cleanedProfile.createdAt = new Date().toISOString();
  }

  // Persist to Firebase Firestore
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'teacher_profiles', cleanedProfile.ownerUid);
      await setDoc(docRef, cleanedProfile, { merge: true });

      // Synchronize teacher's display name and school to users/{uid} collection if allowed
      try {
        const userDocRef = doc(db, 'users', cleanedProfile.ownerUid);
        await updateDoc(userDocRef, {
          displayName: cleanedProfile.fullName,
          schoolName: cleanedProfile.schoolName,
          updatedAt: new Date().toISOString()
        });
      } catch (userSyncErr) {
        // Non-blocking if users doc requires strict permissions or was created with other schema
        console.warn('Could not sync name to users collection:', userSyncErr);
      }

      saveLocalTeacherProfile(cleanedProfile);
      return { success: true, profile: cleanedProfile };
    } catch (err: unknown) {
      console.error('Error saving teacher profile to Firestore:', err);
      const message = err instanceof Error ? err.message : 'Failed to save profile to Firestore';
      // Still save locally so teacher work is not lost offline
      saveLocalTeacherProfile(cleanedProfile);
      return { success: true, profile: cleanedProfile, error: `Saved locally (Cloud sync error: ${message})` };
    }
  }

  // Local fallback if Firestore is unconfigured
  saveLocalTeacherProfile(cleanedProfile);
  return { success: true, profile: cleanedProfile };
};

/**
 * Admin action: Query all teacher profiles from `teacher_profiles` collection
 */
export const getAllTeacherProfiles = async (): Promise<TeacherProfile[]> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, 'teacher_profiles'));
      const list: TeacherProfile[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as TeacherProfile;
        list.push({
          ...data,
          id: docSnap.id,
          ownerUid: data.ownerUid || docSnap.id,
          subjectsTaught: Array.isArray(data.subjectsTaught) ? data.subjectsTaught : [],
          classesTaught: Array.isArray(data.classesTaught) ? data.classesTaught : []
        });
      });
      return list;
    } catch (err) {
      console.warn('Failed to query all teacher profiles from Firestore:', err);
    }
  }

  // Local fallback
  try {
    const rawAll = localStorage.getItem(LOCAL_ALL_TEACHER_PROFILES_KEY);
    return rawAll ? JSON.parse(rawAll) : [];
  } catch {
    return [];
  }
};

/**
 * Real-time listener for current teacher profile
 */
export const subscribeToTeacherProfile = (
  uid: string,
  callback: (profile: TeacherProfile | null) => void
): (() => void) => {
  if (!uid) {
    callback(null);
    return () => {};
  }

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const docRef = doc(db, 'teacher_profiles', uid);
      return onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as TeacherProfile;
          const profile: TeacherProfile = {
            ...data,
            id: snapshot.id,
            ownerUid: data.ownerUid || uid,
            subjectsTaught: Array.isArray(data.subjectsTaught) ? data.subjectsTaught : [],
            classesTaught: Array.isArray(data.classesTaught) ? data.classesTaught : []
          };
          saveLocalTeacherProfile(profile);
          callback(profile);
        } else {
          callback(getLocalTeacherProfile(uid));
        }
      }, (error) => {
        console.warn('Teacher profile snapshot error:', error);
        callback(getLocalTeacherProfile(uid));
      });
    } catch (e) {
      console.warn('Could not initialize teacher profile listener:', e);
    }
  }

  callback(getLocalTeacherProfile(uid));
  return () => {};
};
