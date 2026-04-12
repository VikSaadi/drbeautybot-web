/**
 * lib/firebase.ts
 * CHANGELOG
 * - 2026-03-30 v2.0: Anonymous Auth + getAnonymousUid()
 * - 2026-03-30 v2.1: Google Auth, linkOrSignInWithGoogle(), signOutUser(), isGoogleLinked().
 * - 2026-04-05 v3.0: Estrategia unificada siempre redirect. deleteAccount().
 * - 2026-04-05 v3.1:
 *   - deleteProfile(): borra solo Firestore + localStorage.
 *     Mantiene la cuenta de Auth intacta (anónima o Google).
 *     Diferente a deleteAccount() que borra TODO incluyendo Auth.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithRedirect,
  onAuthStateChanged,
  signOut,
  deleteUser,
  type User,
  type UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db   = getFirestore(app);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export const PENDING_DELETE_KEY = 'drb_pending_delete';

// ── HELPERS ───────────────────────────────────────────────────

function waitForAuthReady(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => { unsub(); resolve(user); });
  });
}

export async function getAnonymousUid(): Promise<string> {
  const current = auth.currentUser;
  if (current) return current.uid;
  const user = await waitForAuthReady();
  if (user) return user.uid;
  const cred = await signInAnonymously(auth);
  return cred.user.uid;
}

export function getCurrentUser(): User | null { return auth.currentUser; }

export function isGoogleLinked(): boolean {
  const user = auth.currentUser;
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === 'google.com');
}

export async function getGoogleRedirectResult(): Promise<UserCredential | null> {
  try { return await getRedirectResult(auth); } catch { return null; }
}

// ── GOOGLE AUTH ───────────────────────────────────────────────

export async function linkOrSignInWithGoogle(): Promise<void> {
  const user = await waitForAuthReady();
  if (user && isGoogleLinked()) return;
  if (user && user.isAnonymous) {
    await linkWithRedirect(user, googleProvider);
    return;
  }
  await signInWithRedirect(auth, googleProvider);
}

// ── ELIMINAR PERFIL (solo datos, mantiene cuenta) ─────────────

/**
 * Borra únicamente los datos de Firestore.
 * La cuenta de Auth (anónima o Google) se mantiene intacta.
 * La usuaria puede volver a llenar el formulario desde cero.
 * localStorage lo limpia el caller para control inmediato de UI.
 */
export async function deleteProfile(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await deleteDoc(doc(db, 'profiles', user.uid));
  } catch (e) {
    console.warn('deleteProfile: doc not found or already deleted:', e);
  }
}

// ── ELIMINAR CUENTA (datos + Auth) ───────────────────────────

/**
 * Borra la cuenta completa: Auth + Firestore.
 * Intento directo → si sesión vieja: redirect fresco via localStorage flag.
 * ORDEN: deleteUser primero, Firestore después.
 */
export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('No hay usuario activo para eliminar.');
  const uid = user.uid;
  try {
    await deleteUser(user);
    try { await deleteDoc(doc(db, 'profiles', uid)); } catch {}
    return;
  } catch (e: any) {
    if (e.code !== 'auth/requires-recent-login') throw e;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PENDING_DELETE_KEY, uid);
  }
  await signOut(auth);
  await signInWithRedirect(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}