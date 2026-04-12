/**
 * hooks/useAuth.ts
 * CHANGELOG
 * - 2026-03-30 v1.0: Hook de autenticación Firebase.
 * - 2026-04-05 v3.0:
 *   - Versión limpia para estrategia "siempre redirect".
 *   - getRedirectResult + onAuthStateChanged en paralelo.
 *   - getRedirectResult fuerza setState con result.user cuando existe
 *     (garantiza isGoogle + photoURL correctos post-redirect).
 *   - Maneja pending delete (localStorage) para deleteAccount.
 *   - photoURL con fallback desde providerData.
 *   - linkGoogle muestra error de popup-blocked etc. (ya no aplica,
 *     pero se mantiene por compatibilidad futura).
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  getRedirectResult,
  deleteUser,
  type User,
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import {
  auth,
  db,
  linkOrSignInWithGoogle,
  signOutUser,
  deleteAccount as firebaseDeleteAccount,
  PENDING_DELETE_KEY,
} from '@/lib/firebase';

const PROFILE_KEY = 'drbeautybot_profile';

export interface AuthState {
  user:        User | null;
  uid:         string | null;
  loading:     boolean;
  isAnonymous: boolean;
  isGoogle:    boolean;
  displayName: string | null;
  email:       string | null;
  photoURL:    string | null;
}

const NULL_STATE: Omit<AuthState, 'loading'> = {
  user: null, uid: null, isAnonymous: false, isGoogle: false,
  displayName: null, email: null, photoURL: null,
};

function buildState(user: User): Omit<AuthState, 'loading'> {
  const gData = user.providerData.find((p) => p.providerId === 'google.com');
  return {
    user,
    uid:         user.uid,
    isAnonymous: user.isAnonymous,
    isGoogle:    user.providerData.some((p) => p.providerId === 'google.com'),
    displayName: user.displayName  ?? gData?.displayName ?? null,
    email:       user.email        ?? gData?.email       ?? null,
    photoURL:    user.photoURL     ?? gData?.photoURL    ?? null,
  };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ ...NULL_STATE, loading: true });
  const [linking,     setLinking]     = useState(false);
  const [linkError,   setLinkError]   = useState<string | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // ── A) onAuthStateChanged — fuente de verdad continua ─────────────────
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!mounted) return;
      if (user) setState({ ...buildState(user), loading: false });
      else setState({ ...NULL_STATE, loading: false });
    });

    // ── B) getRedirectResult — procesa el resultado del redirect ──────────
    // Corre en paralelo con A. Cuando result.user existe:
    //   - Sobrescribe estado con user actualizado (isGoogle correcto).
    //   - Si hay pending delete → completa deleteUser con sesión fresca.
    getRedirectResult(auth)
      .then(async (result) => {
        if (!mounted) return;

        if (result?.user) {
          setLinkError(null);
          // Forzar update — onAuthStateChanged puede haber disparado antes
          // de que el link completara, dejando isGoogle = false incorrectamente.
          setState({ ...buildState(result.user), loading: false });
        }

        // ── Pending delete (sesión vieja en intento anterior) ─────────────
        const pendingUid =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem(PENDING_DELETE_KEY)
            : null;

        if (pendingUid && result?.user && result.user.uid === pendingUid) {
          localStorage.removeItem(PENDING_DELETE_KEY);
          try {
            // result.user tiene sesión fresca → deleteUser funciona
            await deleteUser(result.user);
            try { await deleteDoc(doc(db, 'profiles', pendingUid)); } catch {}
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(PROFILE_KEY);
            }
            if (mounted) window.location.href = '/';
          } catch (e: any) {
            console.error('Error eliminando cuenta post-redirect:', e);
            // Restaurar flag para que el usuario pueda reintentar
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(PENDING_DELETE_KEY, pendingUid);
            }
            if (mounted) setDeleteError('No se pudo eliminar la cuenta. Intenta de nuevo.');
          }
        }
      })
      .catch((e: any) => {
        if (!mounted) return;
        const msg =
          e.code === 'auth/account-exists-with-different-credential'
            ? 'Ya existe una cuenta con ese correo. Intenta con otro.'
            : e.code === 'auth/user-disabled'
            ? 'Esta cuenta de Google ha sido deshabilitada.'
            : null;
        if (msg) setLinkError(msg);
      });

    return () => { mounted = false; unsub(); };
  }, []);

  const linkGoogle = useCallback(async () => {
    setLinking(true);
    setLinkError(null);
    try {
      await linkOrSignInWithGoogle();
      // Redirect: la página navega — el estado se actualiza al volver.
    } catch (e: any) {
      console.error('Error iniciando Google Auth:', e);
      setLinkError('No se pudo conectar con Google. Intenta de nuevo.');
      setLinking(false);
    }
  }, []);

  const deleteAccount = useCallback(async (onSuccess: () => void) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await firebaseDeleteAccount();
      // Éxito directo (sesión reciente) — Firestore ya borrado en firebase.ts
      onSuccess();
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
        // firebase.ts ya lanzó el redirect — la página está navegando.
        // No mostrar error — getRedirectResult completará el delete al volver.
      } else {
        console.error('Error eliminando cuenta:', e);
        setDeleteError('No se pudo eliminar la cuenta. Intenta de nuevo.');
      }
    } finally {
      setDeleting(false);
    }
  }, []);

  const signOut = useCallback(async () => { await signOutUser(); }, []);

  return {
    ...state,
    linking, linkError, linkGoogle,
    deleting, deleteError, deleteAccount,
    signOut,
  };
}