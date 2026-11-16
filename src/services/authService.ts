import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserStatus } from '../types/platform';
import {
  initFirestoreIfConfigured,
  getFirebaseAuth as getStorageFirebaseAuth,
  getFirebaseConfig
} from '../config/firebase';

const LOCAL_USER_KEY = 'isezerano_user_session';

export const SUPER_ADMIN_EMAIL = (
  (import.meta as any).env?.VITE_ADMIN_EMAIL || 'twizerefelix90@gmail.com'
)
  .toLowerCase()
  .trim();

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
};

export const getFirebaseAuth = () => {
  return getStorageFirebaseAuth();
};

const verifyAdminSessionUser = async (fbUser: FirebaseUser): Promise<boolean> => {
  if (!fbUser || fbUser.isAnonymous) return false;
  let hasAdminClaim = false;
  try {
    const tokenResult = await fbUser.getIdTokenResult();
    hasAdminClaim = Boolean(tokenResult.claims && tokenResult.claims.admin === true);
  } catch {
    // ignore token claim inspection errors
  }
  return hasAdminClaim || isAuthorizedAdminEmail(fbUser.email);
};

/**
 * Fetch the verified Administrator profile for an active Firebase Auth session.
 * Non-admin accounts are not granted profiles or portal access.
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    return null;
  }

  const isAdminUser = await verifyAdminSessionUser(auth.currentUser);
  if (!isAdminUser) {
    return null;
  }

  const userEmail = auth.currentUser.email || '';
  const db = initFirestoreIfConfigured();

  if (db) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          uid,
          email: userEmail,
          displayName: data.displayName || auth.currentUser.displayName || 'Administrator',
          role: 'admin',
          status: 'active' as UserStatus,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('Could not read admin profile from Firestore:', err);
    }
  }

  return {
    uid,
    email: userEmail,
    displayName: auth.currentUser.displayName || 'Administrator',
    role: 'admin',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

/**
 * Admin-only email & password sign in
 */
export const signIn = async (
  email: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; isAdmin?: boolean; error?: string }> => {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, error: 'Firebase Authentication is not configured.' };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = credential.user;
    const isAdminUser = await verifyAdminSessionUser(fbUser);

    if (!isAdminUser) {
      await fbSignOut(auth);
      localStorage.removeItem(LOCAL_USER_KEY);
      return {
        success: false,
        error: 'Access Denied: Administrator authorization is required.'
      };
    }

    const profile = (await getUserProfile(fbUser.uid)) || {
      uid: fbUser.uid,
      email: fbUser.email || email.trim(),
      displayName: fbUser.displayName || 'Administrator',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), profile, { merge: true });
      } catch {
        // non-blocking
      }
    }

    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
    return { success: true, user: profile, isAdmin: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid email or password';
    return { success: false, error: message };
  }
};

/**
 * Admin-only Google Sign-In
 */
export const signInWithGoogle = async (): Promise<{
  success: boolean;
  user?: UserProfile;
  isAdmin?: boolean;
  error?: string;
  code?: string;
}> => {
  const auth = getFirebaseAuth();

  if (!auth) {
    const config = getFirebaseConfig();
    if (!config.apiKey) {
      return {
        success: false,
        error:
          'Firebase Web API Key is missing for project "isezerano-news". Please configure your Firebase Web App credentials.',
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
    provider.setCustomParameters({ prompt: 'select_account' });
    const credential = await signInWithPopup(auth, provider);
    const fbUser = credential.user;

    let hasAdminClaim = false;
    try {
      const idTokenResult = await fbUser.getIdTokenResult(true);
      hasAdminClaim = Boolean(idTokenResult.claims && idTokenResult.claims.admin === true);
    } catch (claimErr) {
      console.warn('Could not read ID token claims:', claimErr);
    }

    const userEmail = (fbUser.email || '').toLowerCase().trim();
    const isAdminUser = hasAdminClaim || isAuthorizedAdminEmail(userEmail);

    if (!isAdminUser) {
      await fbSignOut(auth);
      localStorage.removeItem(LOCAL_USER_KEY);
      return {
        success: false,
        isAdmin: false,
        error:
          'Access Denied: This Google account is not authorized to access the Administrator Portal.'
      };
    }

    const finalProfile: UserProfile = {
      uid: fbUser.uid,
      email: userEmail,
      displayName: fbUser.displayName || 'Administrator',
      role: 'admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const db = initFirestoreIfConfigured();
    if (db) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), finalProfile, { merge: true });
      } catch (e) {
        console.warn('Failed to sync admin document in Firestore:', e);
      }
    }

    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(finalProfile));
    return { success: true, user: finalProfile, isAdmin: true };
  } catch (err: unknown) {
    const fbError = err as { code?: string; message?: string };
    const errCode = fbError.code || '';

    if (errCode === 'auth/popup-closed-by-user') {
      return {
        success: false,
        error: 'Google sign-in was cancelled (the account selection window was closed).',
        code: errCode
      };
    }
    if (errCode === 'auth/popup-blocked') {
      return {
        success: false,
        error:
          'Google sign-in popup was blocked by your browser. Please allow popups for this site and try again.',
        code: errCode
      };
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
        error:
          'Google Sign-In is not enabled as an Authentication provider. Please go to Firebase Console > Authentication > Sign-in method and enable Google.',
        code: errCode
      };
    }
    if (errCode === 'auth/invalid-api-key') {
      return {
        success: false,
        error:
          'The Firebase Web API Key is invalid. Please check the Web API Key in Firebase Console for project "isezerano-news".',
        code: errCode
      };
    }

    const message = err instanceof Error ? err.message : 'Google sign-in was cancelled or failed';
    return { success: false, error: message, code: errCode };
  }
};

/**
 * Sign out completely
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
 * Subscribe to Admin Auth state changes
 */
export const subscribeToAuth = (callback: (user: UserProfile | null) => void): (() => void) => {
  const auth = getFirebaseAuth();
  if (auth) {
    return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser && !fbUser.isAnonymous) {
        const profile = await getUserProfile(fbUser.uid);
        if (profile && profile.status === 'active') {
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
          callback(profile);
          return;
        }
      }
      localStorage.removeItem(LOCAL_USER_KEY);
      callback(null);
    });
  }

  localStorage.removeItem(LOCAL_USER_KEY);
  callback(null);
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
