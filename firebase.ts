import { initFirebaseApp, initFirestoreIfConfigured } from '../services/storageService';
import { Firestore, getFirestore } from 'firebase/firestore';

export const app = initFirebaseApp();
export const db = initFirestoreIfConfigured() as Firestore;
export { initFirestoreIfConfigured };
