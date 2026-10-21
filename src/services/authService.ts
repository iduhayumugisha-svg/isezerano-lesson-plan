import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { UserProfile, UserRole, UserStatus } from '../types/lessonPlan';
import { initFirestoreIfConfigured, getFirebaseApp } from './storageService';

const LOCAL_USER_KEY = 'isezerano_user_session';
const LOCAL_USERS_TABLE_KEY = 'isezerano_registered_users';

// Helper to get local mock users when Firestore isn't connected
const getLocalUsers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_TABLE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalUsers = (users: UserProfile[]) => {
  try {
    localStorage.setItem(LOCAL_USERS_TABLE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users cache', e);
  }
};

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  if (app) {
    try {
      return getAuth(app);
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * Fetch a user's profile from Firestore `users/{uid}`
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid: data.uid || uid,
          email: data.email || '',
          displayName: data.displayName || data.email?.split('@')[0] || 'Teacher',
          role: (data.role === 'admin' ? 'admin' : 'teacher') as UserRole,
          status: (data.status === 'inactive' ? 'inactive' : 'active') as UserStatus,
          schoolName: data.schoolName || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('Could not read user profile from Firestore, checking local storage:', err);
    }
  }

  // Local fallback
  const localUsers = getLocalUsers();
  const found = localUsers.find(u => u.uid === uid);
  if (found) return found;

  const rawSession = localStorage.getItem(LOCAL_USER_KEY);
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession);
      if (session && session.uid === uid) return session;
    } catch {
      // ignore
    }
  }

  return null;
};

/**
 * Register a new user. Always defaults strictly to role: 'teacher'.
 */
export const signUp = async (
  email: string, 
  password: string, 
  displayName: string,
  schoolName?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  const auth = getFirebaseAuth();
  const db = initFirestoreIfConfigured();

  if (auth && db) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;

      if (displayName) {
        await fbUpdateProfile(user, { displayName });
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email.trim(),
        displayName: displayName || user.email?.split('@')[0] || 'Teacher',
        role: 'teacher', // ALWAYS strictly teacher
        status: 'active',
        schoolName: schoolName || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Persist to Firestore `users/{uid}`
      await setDoc(doc(db, 'users', user.uid), newProfile);

      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProfile));
      return { success: true, user: newProfile };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { success: false, error: message };
    }
  }

  // Offline / Local development fallback
  const localUsers = getLocalUsers();
  if (localUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return { success: false, error: 'A user with this email already exists' };
  }

  const mockUid = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const newProfile: UserProfile = {
    uid: mockUid,
    email: email.trim(),
    displayName: displayName || email.split('@')[0],
    role: 'teacher', // ALWAYS teacher
    status: 'active',
    schoolName: schoolName || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  localUsers.push(newProfile);
  saveLocalUsers(localUsers);
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProfile));

  return { success: true, user: newProfile };
};

/**
 * Sign In with email & password
 */
export const signIn = async (
  email: string, 
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  const auth = getFirebaseAuth();

  if (auth) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;

      // Load Firestore profile to get verified role
      const profile = await getUserProfile(user.uid);
      if (profile) {
        if (profile.status === 'inactive') {
          await fbSignOut(auth);
          return { success: false, error: 'Your teacher account has been deactivated by an Administrator.' };
        }
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
        return { success: true, user: profile };
      }

      // If document does not exist yet in Firestore, create default teacher record
      const db = initFirestoreIfConfigured();
      const defaultProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email.trim(),
        displayName: user.displayName || user.email?.split('@')[0] || 'Teacher',
        role: 'teacher',
        status: 'active',
        schoolName: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (db) {
        try {
          await setDoc(doc(db, 'users', user.uid), defaultProfile);
        } catch (e) {
          console.warn('Failed to auto-create user document in Firestore:', e);
        }
      }

      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(defaultProfile));
      return { success: true, user: defaultProfile };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      return { success: false, error: message };
    }
  }

  // Local fallback sign in
  const localUsers = getLocalUsers();
  const found = localUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (found) {
    if (found.status === 'inactive') {
      return { success: false, error: 'Your account has been deactivated by an Administrator.' };
    }
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(found));
    return { success: true, user: found };
  }

  return { success: false, error: 'Invalid credentials or user not found. Please sign up or configure Firebase.' };
};

/**
 * Sign out
 */
export const signOut = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Firebase sign out warning:', err);
    }
  }
  localStorage.removeItem(LOCAL_USER_KEY);
};

/**
 * Admin action: Update a user's active/inactive status
 */
export const setUserStatus = async (
  uid: string, 
  status: UserStatus
): Promise<{ success: boolean; error?: string }> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user status in Firestore';
      return { success: false, error: message };
    }
  }

  // Local fallback
  const localUsers = getLocalUsers();
  const index = localUsers.findIndex(u => u.uid === uid);
  if (index >= 0) {
    localUsers[index].status = status;
    localUsers[index].updatedAt = new Date().toISOString();
    saveLocalUsers(localUsers);
    return { success: true };
  }

  return { success: false, error: 'User not found' };
};

/**
 * Admin action: Update a user's role
 */
export const setUserRole = async (
  uid: string, 
  role: UserRole
): Promise<{ success: boolean; error?: string }> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user role in Firestore';
      return { success: false, error: message };
    }
  }

  // Local fallback
  const localUsers = getLocalUsers();
  const index = localUsers.findIndex(u => u.uid === uid);
  if (index >= 0) {
    localUsers[index].role = role;
    localUsers[index].updatedAt = new Date().toISOString();
    saveLocalUsers(localUsers);
    return { success: true };
  }

  return { success: false, error: 'User not found' };
};

/**
 * Admin action: List all users from Firestore `users` collection
 */
export const listUsers = async (): Promise<UserProfile[]> => {
  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        list.push({
          uid: docSnap.id,
          email: d.email || '',
          displayName: d.displayName || d.email?.split('@')[0] || 'Teacher',
          role: (d.role === 'admin' ? 'admin' : 'teacher') as UserRole,
          status: (d.status === 'inactive' ? 'inactive' : 'active') as UserStatus,
          schoolName: d.schoolName || '',
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString()
        });
      });
      return list;
    } catch (err) {
      console.warn('Failed to query users from Firestore:', err);
    }
  }

  return getLocalUsers();
};

/**
 * Subscribe to Auth State changes
 */
export const subscribeToAuth = (callback: (user: UserProfile | null) => void): (() => void) => {
  const auth = getFirebaseAuth();
  if (auth) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const profile = await getUserProfile(fbUser.uid);
        if (profile) {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
          callback(profile);
          return;
        }
      }
      // Check local storage session
      const raw = localStorage.getItem(LOCAL_USER_KEY);
      if (raw) {
        try {
          callback(JSON.parse(raw));
          return;
        } catch {
          // ignore
        }
      }
      callback(null);
    });
  }

  // If no Firebase Auth yet, check local storage
  const raw = localStorage.getItem(LOCAL_USER_KEY);
  if (raw) {
    try {
      callback(JSON.parse(raw));
    } catch {
      callback(null);
    }
  } else {
    callback(null);
  }

  return () => {};
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset email';
      return { success: false, error: message };
    }
  }
  return { success: false, error: 'Firebase Auth is not connected yet.' };
};
