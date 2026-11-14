/**
 * Firebase Client SDK Initialization & Authentication Service
 * Provides Google Auth and Firestore client with safe fallback when credentials
 * are not provisioned or configured.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseConfigParams {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

function resolveFirebaseConfig(): FirebaseConfigParams | null {
  // 1. Check custom user-configured credentials in localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('oc_firebase_custom_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.projectId && parsed?.apiKey) {
          return parsed;
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // 2. Check environment variables
  const env = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};
  const nodeEnv = typeof process !== 'undefined' ? process.env || {} : {};
  const apiKey = env.VITE_FIREBASE_API_KEY || nodeEnv.VITE_FIREBASE_API_KEY;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || nodeEnv.VITE_FIREBASE_PROJECT_ID;

  if (apiKey && projectId && !apiKey.includes('REPLACE') && !projectId.includes('REPLACE')) {
    return {
      apiKey,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    };
  }

  return null;
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let isConfigured = false;

const config = resolveFirebaseConfig();
if (config && config.apiKey && config.projectId) {
  try {
    appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(config);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    isConfigured = true;
  } catch (err) {
    console.warn('[Firebase] Initialization deferred or failed:', err);
    isConfigured = false;
  }
}

export function isFirebaseConfigured(): boolean {
  return isConfigured && authInstance !== null && dbInstance !== null;
}

export function getFirebaseAuth(): Auth | null {
  return authInstance;
}

export function getFirebaseFirestore(): Firestore | null {
  return dbInstance;
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isFirebaseConfigured() || !dbInstance) {
    return {
      ok: false,
      message: 'Firebase credentials not configured. Operating in safe local storage mode.',
    };
  }
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
    return { ok: true, message: 'Connected to Firestore Cloud Database.' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      return { ok: false, message: 'Firestore client is currently offline.' };
    }
    // Permissions error or non-existent document still confirms connection
    if (msg.includes('permission-denied') || msg.includes('not-found')) {
      return { ok: true, message: 'Connected to Firestore (Security rules active).' };
    }
    return { ok: false, message: msg };
  }
}

export async function signInWithGoogle(): Promise<{ ok: boolean; user?: User; error?: string }> {
  if (!isFirebaseConfigured() || !authInstance) {
    return {
      ok: false,
      error: 'Firebase is not configured. Configure your project in Settings -> Cloud Sync.',
    };
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(authInstance, provider);
    return { ok: true, user: result.user };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google Sign-In failed.';
    return { ok: false, error: message };
  }
}

export async function signOutFromFirebase(): Promise<void> {
  if (authInstance) {
    await signOut(authInstance);
  }
}

export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  if (!authInstance) {
    // If not configured, immediately inform listener of null user
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}

export function saveCustomFirebaseConfig(cfg: FirebaseConfigParams): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('oc_firebase_custom_config', JSON.stringify(cfg));
    window.location.reload();
  }
}

export function clearCustomFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('oc_firebase_custom_config');
    window.location.reload();
  }
}
