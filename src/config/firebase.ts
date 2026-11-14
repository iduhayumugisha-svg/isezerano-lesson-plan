import { initFirebaseApp, initFirestoreIfConfigured } from '../services/storageService';
import { Firestore } from 'firebase/firestore';

export const app = initFirebaseApp();
export const db = initFirestoreIfConfigured() as Firestore;
export { initFirestoreIfConfigured };

export const FEATURE_FLAGS = {
  // Activated: Admin Portal and administrative management controls are restored
  ENABLE_ADMIN_UI: true,
} as const;
