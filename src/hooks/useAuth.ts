import { useCallback, useEffect, useState } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { loadLocalSettings } from '../utils/settingsStorage';

export interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: () => void;
  signOutUser: () => void;
}

/** Reprend les reglages deja choisis en mode invite plutot que d'ecraser avec des defauts. */
async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return;

  await setDoc(ref, {
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? null,
    createdAt: serverTimestamp(),
    settings: loadLocalSettings(),
  });
}

/**
 * Wraps Firebase Auth (Google provider only). Creates users/{uid} with default
 * settings on first sign-in; a no-op on every subsequent one.
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
  }, []);

  const signInWithGoogle = useCallback(() => {
    setError(null);
    signInWithPopup(auth, googleProvider)
      .then((credential) => ensureUserProfile(credential.user))
      .catch(() => setError('Connexion impossible. Réessaie.'));
  }, []);

  const signOutUser = useCallback(() => {
    void signOut(auth);
  }, []);

  return { user, isLoading, error, signInWithGoogle, signOutUser };
}
