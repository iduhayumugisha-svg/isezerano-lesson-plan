import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
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
import { 
  initFirestoreIfConfigured, 
  getFirebaseApp, 
  getFirebaseAuth as getStorageFirebaseAuth,
  getFirebaseConfig,
  isFirebaseConfigured
} from './storageService';

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

export const SUPER_ADMIN_EMAIL = ((import.meta as any).env?.VITE_ADMIN_EMAIL || 'twizerefelix90@gmail.com').toLowerCase().trim();

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
};

export const getFirebaseAuth = () => {
  return getStorageFirebaseAuth();
};

/**
 * Fetch a user's profile from Firestore `users/{uid}`
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const auth = getFirebaseAuth();
  let hasAdminClaim = false;
  if (auth?.currentUser && auth.currentUser.uid === uid) {
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult();
      hasAdminClaim = Boolean(tokenResult.claims && tokenResult.claims.admin === true);
    } catch {
      // ignore
    }
  }

  const db = initFirestoreIfConfigured();
  if (db) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const userEmail = data.email || auth?.currentUser?.email || '';
        const isSuperAdmin = hasAdminClaim || isAuthorizedAdminEmail(userEmail);
        const resolvedRole: UserRole = (isSuperAdmin || data.role === 'admin') ? 'admin' : 'teacher';

        // Self-heal Firestore document if authorized admin was previously stored as teacher
        if (isSuperAdmin && data.role !== 'admin') {
          try {
            await updateDoc(doc(db, 'users', uid), {
              role: 'admin',
              status: 'active',
              updatedAt: new Date().toISOString()
            });
          } catch (e) {
            console.warn('Could not auto-promote admin in Firestore:', e);
          }
        }

        return {
          uid: data.uid || uid,
          email: userEmail,
          displayName: data.displayName || userEmail.split('@')[0] || (isSuperAdmin ? 'Administrator' : 'Teacher'),
          role: resolvedRole,
          status: (data.status === 'inactive' && !isSuperAdmin ? 'inactive' : 'active') as UserStatus,
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
  if (found) {
    if (isAuthorizedAdminEmail(found.email)) {
      found.role = 'admin';
      found.status = 'active';
    }
    return found;
  }

  const rawSession = localStorage.getItem(LOCAL_USER_KEY);
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession);
      if (session && session.uid === uid) {
        if (isAuthorizedAdminEmail(session.email)) {
          session.role = 'admin';
          session.status = 'active';
        }
        return session;
      }
    } catch {
      // ignore
    }
  }

  return null;
};

/**
 * Register a new user. Defaults to teacher unless authorized admin.
 */
export const signUp = async (
  email: string, 
  password: string, 
  displayName: string,
  schoolName?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  const auth = getFirebaseAuth();
  const db = initFirestoreIfConfigured();
  const cleanEmail = email.trim();
  const isSuperAdmin = isAuthorizedAdminEmail(cleanEmail);

  if (auth && db) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = credential.user;

      if (displayName) {
        await fbUpdateProfile(user, { displayName });
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || cleanEmail,
        displayName: displayName || user.email?.split('@')[0] || (isSuperAdmin ? 'Administrator' : 'Teacher'),
        role: isSuperAdmin ? 'admin' : 'teacher',
        status: 'active',
        schoolName: schoolName || (isSuperAdmin ? 'GS GITUMBA' : ''),
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
): Promise<{ success: boolean; user?: UserProfile; isAdmin?: boolean; error?: string }> => {
  const auth = getFirebaseAuth();

  if (auth) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = credential.user;

      // Check Custom Claims on token
      let hasAdminClaim = false;
      try {
        const idTokenResult = await user.getIdTokenResult();
        hasAdminClaim = Boolean(idTokenResult.claims && idTokenResult.claims.admin === true);
      } catch {
        // ignore
      }

      // Load Firestore profile to get verified role
      const profile = await getUserProfile(user.uid);
      if (profile) {
        if (profile.status === 'inactive') {
          await fbSignOut(auth);
          return { success: false, error: 'Your account has been deactivated by an Administrator.' };
        }
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
        return { success: true, user: profile, isAdmin: hasAdminClaim || profile.role === 'admin' };
      }

      // If document does not exist yet in Firestore, create default profile record
      const db = initFirestoreIfConfigured();
      const isSuperAdmin = hasAdminClaim || isAuthorizedAdminEmail(user.email || email);
      const defaultProfile: UserProfile = {
        uid: user.uid,
        email: user.email || email.trim(),
        displayName: user.displayName || user.email?.split('@')[0] || (isSuperAdmin ? 'Administrator' : 'Teacher'),
        role: isSuperAdmin ? 'admin' : 'teacher',
        status: 'active',
        schoolName: isSuperAdmin ? 'GS GITUMBA' : '',
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
      return { success: true, user: defaultProfile, isAdmin: isSuperAdmin };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      return { success: false, error: message };
    }
  }

  // Local fallback sign in
  const localUsers = getLocalUsers();
  const found = localUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (found) {
    if (isAuthorizedAdminEmail(found.email)) {
      found.role = 'admin';
      found.status = 'active';
    }
    if (found.status === 'inactive') {
      return { success: false, error: 'Your account has been deactivated by an Administrator.' };
    }
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(found));
    return { success: true, user: found, isAdmin: found.role === 'admin' };
  }

  return { success: false, error: 'Invalid credentials or user not found. Please sign up or configure Firebase.' };
};

/**
 * Sign In with Google Popup (With account picker prompt)
 */
export const signInWithGoogle = async (): Promise<{ success: boolean; user?: UserProfile; isAdmin?: boolean; error?: string; code?: string }> => {
  const auth = getFirebaseAuth();

  if (!auth) {
    const config = getFirebaseConfig();
    if (!config.apiKey) {
      return { 
        success: false, 
        error: 'Firebase Web API Key is missing for project "isezerano-news". Please configure your Firebase Web App credentials.',
        code: 'MISSING_API_KEY'
      };
    }
    return { 
      success: false, 
      error: 'Firebase Authentication is not configured or failed to initialize.',
      code: 'AUTH_UNAVAILABLE'
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    // Forces Google to show account selection picker so user can choose which Google account to use
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;

    // Check Custom Claims on verified Firebase ID Token
    let hasAdminClaim = false;
    try {
      const idTokenResult = await user.getIdTokenResult(true);
      hasAdminClaim = Boolean(idTokenResult.claims && idTokenResult.claims.admin === true);
    } catch (claimErr) {
      console.warn('Could not read ID token claims:', claimErr);
    }

    const userEmail = user.email || '';
    const isSuperAdmin = hasAdminClaim || isAuthorizedAdminEmail(userEmail);

    // Strict requirement: Only the explicitly authorized administrator account may enter the Admin Dashboard.
    // If an unauthorized person selects another Google account, deny access and return them to the public website.
    if (!isSuperAdmin) {
      try {
        await fbSignOut(auth);
      } catch (soErr) {
        console.warn('Sign out warning for unauthorized account:', soErr);
      }
      localStorage.removeItem(LOCAL_USER_KEY);
      return { 
        success: false, 
        isAdmin: false,
        error: 'This Google account is not authorized to access the Admin Portal.',
        code: 'UNAUTHORIZED_ACCOUNT'
      };
    }

    const profile = await getUserProfile(user.uid);
    if (profile) {
      if (profile.status === 'inactive') {
        await fbSignOut(auth);
        return { success: false, error: 'Your account has been deactivated by an Administrator.' };
      }
      if (isSuperAdmin && profile.role !== 'admin') {
        profile.role = 'admin';
      }
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
      return { success: true, user: profile, isAdmin: true };
    }

    // If document does not exist yet in Firestore, create default profile record
    const db = initFirestoreIfConfigured();
    const defaultProfile: UserProfile = {
      uid: user.uid,
      email: userEmail,
      displayName: user.displayName || userEmail.split('@')[0] || 'Administrator',
      role: 'admin',
      status: 'active',
      schoolName: 'GS GITUMBA',
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
    return { success: true, user: defaultProfile, isAdmin: true };
  } catch (err: unknown) {
    const fbError = err as { code?: string; message?: string };
    const errCode = fbError.code || '';

    if (errCode === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Google sign-in was cancelled (the account selection window was closed).', code: errCode };
    }
    if (errCode === 'auth/popup-blocked') {
      return { success: false, error: 'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.', code: errCode };
    }
    if (errCode === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      return { 
        success: false, 
        error: `Domain authorization required: "${currentHost}" is not yet added to Authorized Domains for project "isezerano-news". Please add "${currentHost}" in Firebase Console > Authentication > Settings > Authorized domains.`,
        code: errCode
      };
    }
    if (errCode === 'auth/operation-not-allowed') {
      return { 
        success: false, 
        error: 'Google Sign-In is not enabled as an Authentication provider. Please go to Firebase Console > Authentication > Sign-in method and enable Google.',
        code: errCode
      };
    }
    if (errCode === 'auth/invalid-api-key') {
      return { 
        success: false, 
        error: 'The Firebase Web API Key is invalid. Please check the Web API Key in Firebase Console for project "isezerano-news".',
        code: errCode
      };
    }

    const message = err instanceof Error ? err.message : 'Google sign-in was cancelled or failed';
    return { success: false, error: message, code: errCode };
  }
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
