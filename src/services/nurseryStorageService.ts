/**
 * Firestore and Local Storage Service for Nursery Student Report Card Management System
 * - Strictly NO sample or fake data (starts with empty records until real data is entered).
 * - Enforces private records per teacher using Firebase Auth UID (`ownerUid`).
 * - Sole Administrator (twizerefelix90@gmail.com) has global oversight to view and manage all records.
 * - 100% compliant with Firebase Spark (Free Plan).
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where
} from 'firebase/firestore';
import { 
  NurseryStudent, 
  StudentTermAssessment, 
  NurserySchoolInfo, 
  EMPTY_NURSERY_SCHOOL_INFO 
} from '../types/nurseryReport';
import { initFirestoreIfConfigured, getFirebaseAuth } from './storageService';

const FIRESTORE_COLLECTIONS = {
  STUDENTS: 'nursery_students',
  SCHOOL_INFO: 'nursery_school_settings',
  ASSESSMENTS: 'nursery_assessments'
};

const getLocalKey = (prefix: string, uid?: string | null): string => {
  return uid ? `${prefix}_${uid}` : `${prefix}_unauth`;
};

/* =========================================================================
   1. NURSERY SCHOOL INFO (SEPARATE & PRIVATE PER TEACHER)
   ========================================================================= */

export const getLocalNurserySchoolInfo = (userUid?: string | null): NurserySchoolInfo => {
  try {
    const key = getLocalKey('nursery_real_school_info', userUid);
    const raw = localStorage.getItem(key);
    if (raw) {
      return { ...EMPTY_NURSERY_SCHOOL_INFO, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error('Failed reading local nursery school info:', err);
  }
  return { ...EMPTY_NURSERY_SCHOOL_INFO };
};

export const saveNurserySchoolInfo = async (
  info: NurserySchoolInfo,
  userUid?: string | null,
  userEmail?: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getFirebaseAuth();
    const effectiveUid = userUid || auth?.currentUser?.uid;
    const effectiveEmail = userEmail || auth?.currentUser?.email || '';

    if (!effectiveUid) {
      return { 
        success: false, 
        error: 'Nyamuneka banza winjire na Konti ya Google kugira ngo ubike amakuru y\'ishuri ryawe.' 
      };
    }

    const payload: NurserySchoolInfo = {
      ...info,
      ownerUid: effectiveUid,
      ownerEmail: effectiveEmail,
      updatedAt: new Date().toISOString()
    };

    // 1. Save local per user UID immediately
    const key = getLocalKey('nursery_real_school_info', effectiveUid);
    localStorage.setItem(key, JSON.stringify(payload));

    // 2. Save to Firestore under doc ID = effectiveUid
    const db = initFirestoreIfConfigured();
    if (db) {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.SCHOOL_INFO, effectiveUid);
      await setDoc(docRef, payload, { merge: true });
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error saving nursery school info:', err);
    const code = err?.code || '';
    if (code === 'permission-denied') {
      return { 
        success: false, 
        error: "Missing or insufficient permissions: Nyamuneka shyira amategeko mashya ya 'firestore.rules' muri Firebase Console (Firestore Database > Rules)." 
      };
    }
    return { success: false, error: err.message || 'Error saving school info' };
  }
};

export const subscribeToNurserySchoolInfo = (
  callback: (info: NurserySchoolInfo) => void,
  userUid?: string | null,
  isAdmin?: boolean
): (() => void) => {
  // Deliver cached value immediately
  callback(getLocalNurserySchoolInfo(userUid));

  if (!userUid) {
    return () => {};
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, FIRESTORE_COLLECTIONS.SCHOOL_INFO, userUid);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as NurserySchoolInfo;
        const merged = { ...EMPTY_NURSERY_SCHOOL_INFO, ...data };
        localStorage.setItem(getLocalKey('nursery_real_school_info', userUid), JSON.stringify(merged));
        callback(merged);
      }
    }, (err) => {
      console.warn('Firestore school info sync warning:', err);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup school info listener:', err);
    return () => {};
  }
};

/* =========================================================================
   2. NURSERY STUDENTS MANAGEMENT (PRIVATE PER TEACHER; ADMIN SEES ALL)
   ========================================================================= */

export const getLocalNurseryStudents = (userUid?: string | null): NurseryStudent[] => {
  try {
    const key = getLocalKey('nursery_real_students', userUid);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed reading local nursery students:', err);
  }
  return [];
};

export const saveNurseryStudent = async (
  student: NurseryStudent,
  userUid?: string | null,
  userEmail?: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getFirebaseAuth();
    const effectiveUid = userUid || auth?.currentUser?.uid || student.ownerUid;
    const effectiveEmail = userEmail || auth?.currentUser?.email || student.ownerEmail || '';

    if (!effectiveUid) {
      return { 
        success: false, 
        error: 'Nyamuneka banza winjire na Konti ya Google kugira ngo wongere cyangwa uhindure umunyeshuri.' 
      };
    }

    const now = new Date().toISOString();
    const studentToSave: NurseryStudent = {
      ...student,
      ownerUid: effectiveUid,
      ownerEmail: effectiveEmail,
      updatedAt: now,
      createdAt: student.createdAt || now
    };

    // 1. Update local cache immediately
    const key = getLocalKey('nursery_real_students', effectiveUid);
    const currentList = getLocalNurseryStudents(effectiveUid);
    const existingIndex = currentList.findIndex(s => s.id === studentToSave.id);
    let updatedList: NurseryStudent[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = studentToSave;
    } else {
      updatedList = [studentToSave, ...currentList];
    }
    localStorage.setItem(key, JSON.stringify(updatedList));

    // 2. Save to Firestore
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
        error: "Missing or insufficient permissions muri Firestore. Nyamuneka shyira amategeko mashya ya 'firestore.rules' muri Firebase Console (Firestore Database > Rules)." 
      };
    }
    return { success: false, error: err.message || 'Error saving student' };
  }
};

export const deleteNurseryStudent = async (
  studentId: string,
  userUid?: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getFirebaseAuth();
    const effectiveUid = userUid || auth?.currentUser?.uid;

    // 1. Update local cache immediately
    const studentKey = getLocalKey('nursery_real_students', effectiveUid);
    const currentList = getLocalNurseryStudents(effectiveUid);
    const updatedList = currentList.filter(s => s.id !== studentId);
    localStorage.setItem(studentKey, JSON.stringify(updatedList));

    // Also remove local assessment
    const assessKey = getLocalKey('nursery_real_assessments', effectiveUid);
    const allAssessments = getLocalNurseryAssessments(effectiveUid);
    const filteredAssessments = allAssessments.filter(a => a.studentId !== studentId);
    localStorage.setItem(assessKey, JSON.stringify(filteredAssessments));

    // 2. Delete from Firestore
    const db = initFirestoreIfConfigured();
    if (db) {
      const studentDocRef = doc(db, FIRESTORE_COLLECTIONS.STUDENTS, studentId);
      await deleteDoc(studentDocRef);

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

export const subscribeToNurseryStudents = (
  callback: (students: NurseryStudent[]) => void,
  userUid?: string | null,
  isAdmin?: boolean
): (() => void) => {
  // Deliver current local state first immediately
  callback(getLocalNurseryStudents(userUid));

  if (!userUid && !isAdmin) {
    return () => {};
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  try {
    // Teachers query ONLY their own students with ownerUid == userUid; Admin queries all students
    let q;
    if (isAdmin) {
      q = collection(db, FIRESTORE_COLLECTIONS.STUDENTS);
    } else {
      q = query(
        collection(db, FIRESTORE_COLLECTIONS.STUDENTS), 
        where('ownerUid', '==', userUid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteList: NurseryStudent[] = [];
      snapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          remoteList.push(docSnap.data() as NurseryStudent);
        }
      });

      // Sort by full name alphabetical
      remoteList.sort((a, b) => a.fullName.localeCompare(b.fullName));

      localStorage.setItem(getLocalKey('nursery_real_students', userUid), JSON.stringify(remoteList));
      callback(remoteList);
    }, (err) => {
      console.warn('Firestore students sync warning:', err);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup students listener:', err);
    return () => {};
  }
};

/* =========================================================================
   3. NURSERY ASSESSMENTS (TERM SCORES FOR 22 CRITERIA, PRIVATE PER TEACHER)
   ========================================================================= */

export const getLocalNurseryAssessments = (userUid?: string | null): StudentTermAssessment[] => {
  try {
    const key = getLocalKey('nursery_real_assessments', userUid);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Failed reading local nursery assessments:', err);
  }
  return [];
};

export const getStudentAssessment = (studentId: string, userUid?: string | null): StudentTermAssessment | null => {
  const all = getLocalNurseryAssessments(userUid);
  return all.find(a => a.studentId === studentId) || null;
};

export const saveStudentAssessment = async (
  assessment: StudentTermAssessment,
  userUid?: string | null,
  userEmail?: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const auth = getFirebaseAuth();
    const effectiveUid = userUid || auth?.currentUser?.uid || assessment.ownerUid;
    const effectiveEmail = userEmail || auth?.currentUser?.email || assessment.ownerEmail || '';

    if (!effectiveUid) {
      return { 
        success: false, 
        error: 'Nyamuneka banza winjire na Konti ya Google kugira ngo ubike amanota n\'indangamanota.' 
      };
    }

    const payload: StudentTermAssessment = {
      ...assessment,
      ownerUid: effectiveUid,
      ownerEmail: effectiveEmail,
      updatedAt: new Date().toISOString()
    };

    // 1. Update local cache immediately
    const key = getLocalKey('nursery_real_assessments', effectiveUid);
    const currentList = getLocalNurseryAssessments(effectiveUid);
    const existingIndex = currentList.findIndex(a => a.studentId === payload.studentId);
    let updatedList: StudentTermAssessment[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = payload;
    } else {
      updatedList = [payload, ...currentList];
    }
    localStorage.setItem(key, JSON.stringify(updatedList));

    // 2. Save to Firestore
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

export const subscribeToNurseryAssessments = (
  callback: (assessments: StudentTermAssessment[]) => void,
  userUid?: string | null,
  isAdmin?: boolean
): (() => void) => {
  // Deliver current local state first immediately
  callback(getLocalNurseryAssessments(userUid));

  if (!userUid && !isAdmin) {
    return () => {};
  }

  const db = initFirestoreIfConfigured();
  if (!db) {
    return () => {};
  }

  try {
    // Teachers query ONLY their own assessments; Admin queries all
    let q;
    if (isAdmin) {
      q = collection(db, FIRESTORE_COLLECTIONS.ASSESSMENTS);
    } else {
      q = query(
        collection(db, FIRESTORE_COLLECTIONS.ASSESSMENTS),
        where('ownerUid', '==', userUid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remoteList: StudentTermAssessment[] = [];
      snapshot.forEach(docSnap => {
        if (docSnap.exists()) {
          remoteList.push(docSnap.data() as StudentTermAssessment);
        }
      });

      localStorage.setItem(getLocalKey('nursery_real_assessments', userUid), JSON.stringify(remoteList));
      callback(remoteList);
    }, (err) => {
      console.warn('Firestore assessments sync warning:', err);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Could not setup assessments listener:', err);
    return () => {};
  }
};
