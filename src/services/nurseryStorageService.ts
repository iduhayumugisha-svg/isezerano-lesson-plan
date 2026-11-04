/**
 * Firestore and Local Storage Service for Nursery Student Report Card Management System
 * Starts strictly with ZERO sample data (pure empty state until user inputs real records).
 * Fully compatible with Firebase Spark (Free Plan).
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  NurseryStudent, 
  StudentTermAssessment, 
  NurserySchoolInfo, 
  EMPTY_NURSERY_SCHOOL_INFO 
} from '../types/nurseryReport';
import { initFirestoreIfConfigured, getFirebaseAuth } from './storageService';
import { ensureAnonymousTeacherSession } from './authService';

const STORAGE_KEYS = {
  STUDENTS: 'nursery_real_students_v1',
  SCHOOL_INFO: 'nursery_real_school_info_v1',
  ASSESSMENTS: 'nursery_real_assessments_v1'
};

const FIRESTORE_COLLECTIONS = {
  STUDENTS: 'nursery_students',
  SCHOOL_INFO: 'nursery_school_settings',
  ASSESSMENTS: 'nursery_assessments'
};

/* =========================================================================
   1. NURSERY SCHOOL INFO (STARTS BLANK, SAVES TO FIRESTORE)
   ========================================================================= */

export const getLocalNurserySchoolInfo = (): NurserySchoolInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL_INFO);
    if (raw) {
      return { ...EMPTY_NURSERY_SCHOOL_INFO, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed reading local nursery school info:', err);
  }
  return { ...EMPTY_NURSERY_SCHOOL_INFO };
};

export const saveNurserySchoolInfo = async (info: NurserySchoolInfo): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload: NurserySchoolInfo = {
      ...info,
      updatedAt: new Date().toISOString()
    };
    // 1. Save local immediately
    localStorage.setItem(STORAGE_KEYS.SCHOOL_INFO, JSON.stringify(payload));

    // 2. Ensure active authenticated session for Firestore
    await ensureAnonymousTeacherSession();

    // 3. Save to Firestore if available
    const db = initFirestoreIfConfigured();
    if (db) {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SCHOOL_INFO, 'general');
      await setDoc(docRef, payload, { merge: true });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving nursery school info:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      return { 
        success: false, 
        error: "Missing or insufficient permissions: Nyamuneka shyira amategeko mashya ya 'firestore.rules' muri Firebase Console (Firestore Database > Rules) kandi wemeze ko Anonymous Sign-in yaka muri Authentication." 
      };
    }
    return { success: false, error: err.message || 'Error saving school info' };
  }
};

export const subscribeToNurserySchoolInfo = (callback: (info: NurserySchoolInfo) => void): (() => void) => {
  // Deliver cached value immediately
  callback(getLocalNurserySchoolInfo());

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  let unsubscribeFirestore: (() => void) | null = null;
  let isCancelled = false;

  const attachListener = () => {
    if (isCancelled) return;
    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SCHOOL_INFO, 'general');
      unsubscribeFirestore = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as NurserySchoolInfo;
          const merged = { ...EMPTY_NURSERY_SCHOOL_INFO, ...data };
          localStorage.setItem(STORAGE_KEYS.SCHOOL_INFO, JSON.stringify(merged));
          callback(merged);
        }
      }, (err) => {
        console.warn('Firestore school info sync warning:', err);
      });
    } catch (err) {
      console.warn('Could not setup school info listener:', err);
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    attachListener();
  } else {
    ensureAnonymousTeacherSession().then(() => {
      attachListener();
    }).catch(() => {
      attachListener();
    });
  }

  return () => {
    isCancelled = true;
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
};

/* =========================================================================
   2. NURSERY STUDENTS MANAGEMENT (NO FAKE DATA)
   ========================================================================= */

export const getLocalNurseryStudents = (): NurseryStudent[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed reading local nursery students:', err);
  }
  return [];
};

export const saveNurseryStudent = async (student: NurseryStudent): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();
    const studentToSave: NurseryStudent = {
      ...student,
      updatedAt: now,
      createdAt: student.createdAt || now
    };

    // 1. Update local cache immediately so teacher never loses input
    const currentList = getLocalNurseryStudents();
    const existingIndex = currentList.findIndex(s => s.id === studentToSave.id);
    let updatedList: NurseryStudent[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = studentToSave;
    } else {
      updatedList = [studentToSave, ...currentList];
    }
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedList));

    // 2. Ensure authenticated session for Firestore (Spark Free Plan)
    await ensureAnonymousTeacherSession();

    // 3. Save to Firestore
    const db = initFirestoreIfConfigured();
    if (db) {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.STUDENTS, studentToSave.id);
      await setDoc(docRef, studentToSave, { merge: true });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving nursery student to Firestore:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      return { 
        success: false, 
        error: "Missing or insufficient permissions muri Firestore. Nyamuneka shyira amategeko mashya ya 'firestore.rules' muri Firebase Console (Firestore Database > Rules) kandi wemeze ko Anonymous Sign-in yaka muri Authentication > Sign-in method." 
      };
    }
    return { success: false, error: err.message || 'Error saving student' };
  }
};

export const deleteNurseryStudent = async (studentId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Update local cache immediately
    const currentList = getLocalNurseryStudents();
    const updatedList = currentList.filter(s => s.id !== studentId);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updatedList));

    // Also remove any local assessments for this student
    const allAssessments = getLocalNurseryAssessments();
    const filteredAssessments = allAssessments.filter(a => a.studentId !== studentId);
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(filteredAssessments));

    // 2. Ensure active authenticated session
    await ensureAnonymousTeacherSession();

    // 3. Delete from Firestore
    const db = initFirestoreIfConfigured();
    if (db) {
      const studentDocRef = doc(db, FIRESTORE_COLLECTIONS.STUDENTS, studentId);
      await deleteDoc(studentDocRef);

      // Attempt to delete assessment document if exists
      try {
        const assessmentDocRef = doc(db, FIRESTORE_COLLECTIONS.ASSESSMENTS, `assessment_${studentId}`);
        await deleteDoc(assessmentDocRef);
      } catch {
        // Safe to ignore if not present
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting nursery student:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      return { 
        success: false, 
        error: "Missing or insufficient permissions muri Firestore. Nyamuneka shyira amategeko mashya ya 'firestore.rules' muri Firebase Console." 
      };
    }
    return { success: false, error: err.message || 'Error deleting student' };
  }
};

export const subscribeToNurseryStudents = (callback: (students: NurseryStudent[]) => void): (() => void) => {
  // Deliver current local state first immediately
  callback(getLocalNurseryStudents());

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  let unsubscribeFirestore: (() => void) | null = null;
  let isCancelled = false;

  const attachListener = () => {
    if (isCancelled) return;
    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.STUDENTS);
      unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
        const remoteList: NurseryStudent[] = [];
        snapshot.forEach(docSnap => {
          if (docSnap.exists()) {
            remoteList.push(docSnap.data() as NurseryStudent);
          }
        });

        // Sort by full name alphabetical
        remoteList.sort((a, b) => a.fullName.localeCompare(b.fullName));

        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(remoteList));
        callback(remoteList);
      }, (err) => {
        console.warn('Firestore students sync warning:', err);
      });
    } catch (err) {
      console.warn('Could not setup students listener:', err);
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    attachListener();
  } else {
    ensureAnonymousTeacherSession().then(() => {
      attachListener();
    }).catch(() => {
      attachListener();
    });
  }

  return () => {
    isCancelled = true;
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
};

/* =========================================================================
   3. NURSERY ASSESSMENTS (TERM SCORES FOR 22 CRITERIA)
   ========================================================================= */

export const getLocalNurseryAssessments = (): StudentTermAssessment[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ASSESSMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed reading local nursery assessments:', err);
  }
  return [];
};

export const getStudentAssessment = (studentId: string): StudentTermAssessment | null => {
  const all = getLocalNurseryAssessments();
  return all.find(a => a.studentId === studentId) || null;
};

export const saveStudentAssessment = async (assessment: StudentTermAssessment): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload: StudentTermAssessment = {
      ...assessment,
      updatedAt: new Date().toISOString()
    };

    // 1. Update local cache immediately
    const currentList = getLocalNurseryAssessments();
    const existingIndex = currentList.findIndex(a => a.studentId === payload.studentId);
    let updatedList: StudentTermAssessment[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = payload;
    } else {
      updatedList = [payload, ...currentList];
    }
    localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(updatedList));

    // 2. Ensure active authenticated session
    await ensureAnonymousTeacherSession();

    // 3. Save to Firestore
    const db = initFirestoreIfConfigured();
    if (db) {
      const docId = `assessment_${payload.studentId}`;
      const docRef = doc(db, FIRESTORE_COLLECTIONS.ASSESSMENTS, docId);
      await setDoc(docRef, payload, { merge: true });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving student assessment:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      return { 
        success: false, 
        error: "Missing or insufficient permissions muri Firestore. Nyamuneka shyira amategeko mashya ya 'firestore.rules' muri Firebase Console." 
      };
    }
    return { success: false, error: err.message || 'Error saving assessment' };
  }
};

export const subscribeToNurseryAssessments = (callback: (assessments: StudentTermAssessment[]) => void): (() => void) => {
  // Deliver current local state first immediately
  callback(getLocalNurseryAssessments());

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  let unsubscribeFirestore: (() => void) | null = null;
  let isCancelled = false;

  const attachListener = () => {
    if (isCancelled) return;
    try {
      const colRef = collection(db, FIRESTORE_COLLECTIONS.ASSESSMENTS);
      unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
        const remoteList: StudentTermAssessment[] = [];
        snapshot.forEach(docSnap => {
          if (docSnap.exists()) {
            remoteList.push(docSnap.data() as StudentTermAssessment);
          }
        });

        localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(remoteList));
        callback(remoteList);
      }, (err) => {
        console.warn('Firestore assessments sync warning:', err);
      });
    } catch (err) {
      console.warn('Could not setup assessments listener:', err);
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    attachListener();
  } else {
    ensureAnonymousTeacherSession().then(() => {
      attachListener();
    }).catch(() => {
      attachListener();
    });
  }

  return () => {
    isCancelled = true;
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
};
