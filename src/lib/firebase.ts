import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10);

if (!isConfigured) {
    console.warn('Firebase is not configured. Please check your environment variables.');
}

// Only initialize Firebase if we have real config values (not during build)
const app = isConfigured
    ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
    : null;

export const auth = app ? getAuth(app) : (null as any);
export const googleProvider = new GoogleAuthProvider();
export const db = app ? getFirestore(app) : (null as any);
export const storage = app ? getStorage(app) : (null as any);
export const firebaseConfigured = isConfigured;
export default app;
