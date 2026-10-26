import { LessonPlan, SchoolInfo, TeacherInfo, StudentsIdentification, FirebaseConnectionConfig } from '../types/lessonPlan';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';

const STORAGE_KEYS = {
  SCHOOL: 'rwanda_cbc_school_profile',
  TEACHER: 'rwanda_cbc_teacher_profile',
  LESSONS: 'rwanda_cbc_lesson_plans',
  STUDENTS_IDENTIFICATION: 'rwanda_cbc_students_identification',
  FIREBASE_CONFIG: 'rwanda_cbc_firebase_config'
};

export const defaultStudentsIdentification: StudentsIdentification = {
  country: 'Rwanda',
  educationLevel: '',
  classGrade: '',
  subject: '',
  term: '',
  date: '',
  totalStudents: '',
  numberOfBoys: '',
  numberOfGirls: ''
};

export const getSavedStudentsIdentification = (): StudentsIdentification => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS_IDENTIFICATION);
    if (raw) {
      return { ...defaultStudentsIdentification, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Failed to load students identification:', e);
  }
  return defaultStudentsIdentification;
};

export const saveStudentsIdentification = (info: StudentsIdentification): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS_IDENTIFICATION, JSON.stringify(info));
  } catch (e) {
    console.error('Failed to save students identification:', e);
  }
};

export const emptySchoolInfo: SchoolInfo = {
  schoolName: '',
  schoolLogoUrl: '',
  province: '',
  district: '',
  academicYear: '',
  term: ''
};

export const emptyTeacherInfo: TeacherInfo = {
  fullName: '',
  qualification: '',
  email: '',
  phone: '',
  tscNumber: ''
};

export const createEmptyLessonPlan = (school?: SchoolInfo, teacher?: TeacherInfo): LessonPlan => {
  return {
    id: `rw-lp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // School info
    schoolName: school?.schoolName || '',
    schoolLogoUrl: school?.schoolLogoUrl || '',
    province: school?.province || '',
    district: school?.district || '',
    academicYear: school?.academicYear || '',
    term: school?.term || '',

    // Top table (8 columns in official format)
    date: '',
    subject: '',
    classGrade: '',
    unitNo: '',
    lessonNo: '',
    duration: '',
    numberOfLearners: '',
    country: 'Rwanda',
    numberOfBoys: '',
    numberOfGirls: '',

    // Teacher & Class
    teacherName: teacher?.fullName || '',
    teacherQualification: teacher?.qualification || '',
    educationLevel: '',

    // Section 2: Objectives & Preparation (Official 8 rows)
    specialNeedsLearners: '',
    unitTopic: '',
    keyUnitCompetence: '',
    lessonTitle: '',
    unitTitle: '',
    learningObjectives: '',
    lessonLocation: '',
    teachingMaterials: '',
    references: '',

    // Optional detailed fields
    knowledgeAndSkills: '',
    attitudesAndValues: '',
    genericCompetences: '',
    crossCuttingIssues: '',
    prerequisiteKnowledge: '',
    lessonIntroduction: '',

    // Starts with ZERO lesson rows as strictly mandated
    stages: [],

    // Evaluation & Reflection
    teacherSelfEvaluation: '',
    lessonConclusion: '',
    assessmentSummary: '',
    teacherReflection: '',
    challengesEncountered: '',
    remedialActivities: '',
    extensionActivities: '',
    nextLessonPreparation: '',

    status: 'draft'
  };
};

// Local storage handlers
export const getSavedSchoolInfo = (): SchoolInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SCHOOL);
    if (!raw) return emptySchoolInfo;
    return JSON.parse(raw);
  } catch {
    return emptySchoolInfo;
  }
};

export const saveSchoolInfo = (info: SchoolInfo): void => {
  localStorage.setItem(STORAGE_KEYS.SCHOOL, JSON.stringify(info));
};

export const getSavedTeacherInfo = (): TeacherInfo => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TEACHER);
    if (!raw) return emptyTeacherInfo;
    return JSON.parse(raw);
  } catch {
    return emptyTeacherInfo;
  }
};

export const saveTeacherInfo = (info: TeacherInfo): void => {
  localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(info));
};

export const getSavedLessonPlans = (): LessonPlan[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LESSONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getLessonPlanById = (id: string): LessonPlan | null => {
  const plans = getSavedLessonPlans();
  return plans.find(p => p.id === id) || null;
};

export const saveLessonPlanLocal = (plan: LessonPlan): { success: boolean; error?: string } => {
  try {
    const plans = getSavedLessonPlans();
    const existingIndex = plans.findIndex(p => p.id === plan.id);
    const updatedPlan: LessonPlan = {
      ...plan,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      plans[existingIndex] = updatedPlan;
    } else {
      plans.unshift(updatedPlan);
    }

    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(plans));
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save lesson plan';
    return { success: false, error: message };
  }
};

export const deleteLessonPlanLocal = (id: string): boolean => {
  try {
    const plans = getSavedLessonPlans();
    const filtered = plans.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
};

export const duplicateLessonPlanLocal = (id: string): LessonPlan | null => {
  const source = getLessonPlanById(id);
  if (!source) return null;

  const duplicated: LessonPlan = {
    ...source,
    id: `rw-lp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    lessonTitle: `${source.lessonTitle} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stages: source.stages.map(s => ({
      ...s,
      id: `stage-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`
    }))
  };

  saveLessonPlanLocal(duplicated);
  return duplicated;
};

// Export and Import functionality
export const exportDatabaseBackup = (): string => {
  const data = {
    exportDate: new Date().toISOString(),
    application: 'Lesson Plan – Primary & Secondary (Rwanda CBC)',
    school: getSavedSchoolInfo(),
    teacher: getSavedTeacherInfo(),
    lessonPlans: getSavedLessonPlans()
  };
  return JSON.stringify(data, null, 2);
};

export const importDatabaseBackup = (jsonString: string): { success: boolean; count: number; error?: string } => {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON format.');
    }

    if (data.school && typeof data.school === 'object') {
      saveSchoolInfo(data.school);
    }
    if (data.teacher && typeof data.teacher === 'object') {
      saveTeacherInfo(data.teacher);
    }

    let importedCount = 0;
    if (Array.isArray(data.lessonPlans)) {
      const existing = getSavedLessonPlans();
      const existingMap = new Map(existing.map(p => [p.id, p]));

      for (const plan of data.lessonPlans) {
        if (plan && plan.id) {
          existingMap.set(plan.id, plan);
          importedCount++;
        }
      }

      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(Array.from(existingMap.values())));
    }

    return { success: true, count: importedCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to import data';
    return { success: false, count: 0, error: message };
  }
};

export const clearAllDataLocal = (): void => {
  localStorage.removeItem(STORAGE_KEYS.SCHOOL);
  localStorage.removeItem(STORAGE_KEYS.TEACHER);
  localStorage.removeItem(STORAGE_KEYS.LESSONS);
};

// Firebase Cloud Sync Configuration
export const parseFirebaseConfigSnippet = (raw: string): Partial<FirebaseConnectionConfig> | null => {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();

  // If raw string starts with AIza (Google Web API key)
  if (/^AIza[0-9A-Za-z-_]{25,}/.test(text)) {
    return {
      apiKey: text,
      projectId: 'isezerano-news',
      authDomain: 'isezerano-news.firebaseapp.com',
      storageBucket: 'isezerano-news.firebasestorage.app',
      enabled: true
    };
  }

  // Regex extract if pasted as JS/JSON snippet from Firebase Console
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

// Canonical Firebase Web App configuration for project isezerano-news
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

export const getFirebaseConfig = (): FirebaseConnectionConfig => {
  // Check localStorage first (in case admin entered custom config)
  let stored: Partial<FirebaseConnectionConfig> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    if (raw) stored = JSON.parse(raw);
  } catch {
    // fallback
  }

  // Also read VITE_ environment variables if available
  const envApiKey = ((import.meta as any).env?.VITE_FIREBASE_API_KEY || '').trim();
  const envAuthDomain = ((import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  const envProjectId = ((import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || '').trim();
  const envStorageBucket = ((import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
  const envMessagingSenderId = ((import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
  const envAppId = ((import.meta as any).env?.VITE_FIREBASE_APP_ID || '').trim();
  const envMeasurementId = ((import.meta as any).env?.VITE_GA_MEASUREMENT_ID || (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || '').trim();

  // Resolution hierarchy: Stored custom config -> Environment variable -> Canonical project configuration
  const apiKey = (stored.apiKey || envApiKey || CANONICAL_FIREBASE_CONFIG.apiKey).trim();
  const projectId = (stored.projectId || envProjectId || CANONICAL_FIREBASE_CONFIG.projectId).trim();
  const authDomain = (stored.authDomain || envAuthDomain || (projectId ? `${projectId}.firebaseapp.com` : CANONICAL_FIREBASE_CONFIG.authDomain)).trim();
  const storageBucket = (stored.storageBucket || envStorageBucket || (projectId ? `${projectId}.firebasestorage.app` : CANONICAL_FIREBASE_CONFIG.storageBucket)).trim();
  const messagingSenderId = (stored.messagingSenderId || envMessagingSenderId || CANONICAL_FIREBASE_CONFIG.messagingSenderId || '').trim();
  const appId = (stored.appId || envAppId || CANONICAL_FIREBASE_CONFIG.appId || '').trim();
  const measurementId = (stored.measurementId || envMeasurementId || CANONICAL_FIREBASE_CONFIG.measurementId || '').trim();
  const firestoreDatabaseId = stored.firestoreDatabaseId || CANONICAL_FIREBASE_CONFIG.firestoreDatabaseId || '(default)';
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

let initializedFirebaseApp: any = null;
let initializedDb: any = null;
let initializedAuth: any = null;

export const resetFirebaseInitialization = (): void => {
  initializedFirebaseApp = null;
  initializedDb = null;
  initializedAuth = null;
};

export const saveFirebaseConfig = (config: FirebaseConnectionConfig): void => {
  localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
  resetFirebaseInitialization();
  initFirebaseApp();
};

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig();
  return Boolean(config.apiKey && config.projectId);
};

export const initFirebaseApp = () => {
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
    console.error('Firebase initialization error:', err);
    return null;
  }
};

export const getFirebaseApp = () => {
  return initFirebaseApp();
};

export const initFirestoreIfConfigured = () => {
  if (initializedDb) {
    return initializedDb;
  }
  const app = initFirebaseApp();
  if (!app) return null;

  const config = getFirebaseConfig();
  try {
    initializedDb = getFirestore(app, config.firestoreDatabaseId || '(default)');
    return initializedDb;
  } catch (err) {
    console.error('Firestore initialization error:', err);
    return null;
  }
};

export const getFirebaseAuth = () => {
  if (initializedAuth) {
    return initializedAuth;
  }
  const app = initFirebaseApp();
  if (!app) return null;

  try {
    initializedAuth = getAuth(app);
    return initializedAuth;
  } catch (err) {
    console.error('Firebase Auth initialization error:', err);
    return null;
  }
};

export const saveLessonPlanToFirestore = async (plan: LessonPlan): Promise<{ success: boolean; error?: string; isCloudSynced?: boolean }> => {
  // Always save locally first so public teachers can create, edit and download without any account requirement
  saveLessonPlanLocal(plan);

  const db = initFirestoreIfConfigured();
  if (!db) {
    return { success: true, isCloudSynced: false };
  }

  // Check if an authorized account is signed in (e.g. Website Owner / Admin)
  try {
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) {
      // Unauthenticated teacher: plan safely stored in browser storage
      return { success: true, isCloudSynced: false };
    }

    const docRef = doc(db, 'lesson_plans', plan.id);
    const enriched = {
      ...plan,
      ownerUid: auth.currentUser.uid,
      ownerEmail: auth.currentUser.email || plan.ownerEmail || ''
    };
    await setDoc(docRef, enriched);
    return { success: true, isCloudSynced: true };
  } catch (err: unknown) {
    // If cloud sync fails, local storage remains intact so teacher never loses work
    console.warn('Firestore cloud sync skipped or permission error:', err);
    return { success: true, isCloudSynced: false };
  }
};

export const deleteLessonPlanFromFirestore = async (id: string): Promise<boolean> => {
  deleteLessonPlanLocal(id);
  const db = initFirestoreIfConfigured();
  if (!db) return true;

  try {
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser) return true;

    await deleteDoc(doc(db, 'lesson_plans', id));
    return true;
  } catch (err) {
    console.warn('Firestore delete error:', err);
    return false;
  }
};

/**
 * Sync Cloud Firestore lesson plans for authenticated owner/admin
 */
export const syncCloudLessonPlans = async (userUid: string, isAdmin: boolean): Promise<LessonPlan[]> => {
  const db = initFirestoreIfConfigured();
  if (!db) return getSavedLessonPlans();

  try {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'lesson_plans'));
    } else {
      q = query(collection(db, 'lesson_plans'), where('ownerUid', '==', userUid));
    }
    const snap = await getDocs(q);
    const remotePlans: LessonPlan[] = [];
    snap.forEach((docSnap) => {
      remotePlans.push(docSnap.data() as LessonPlan);
    });

    if (remotePlans.length > 0) {
      const local = getSavedLessonPlans();
      const map = new Map<string, LessonPlan>();
      local.forEach(p => map.set(p.id, p));
      remotePlans.forEach(p => map.set(p.id, p));
      const merged = Array.from(map.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync cloud lesson plans:', err);
  }
  return getSavedLessonPlans();
};
