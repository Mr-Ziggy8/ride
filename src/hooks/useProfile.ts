import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UseProfileResult {
  /** null si jamais renseigne ou non connecte - ownerDisplayName retombe alors sur le nom Google. */
  pseudo: string | null;
  updatePseudo: (next: string) => void;
}

/**
 * Pseudo public (users/{uid}.pseudo), distinct du nom du compte Google : permet de
 * partager des parcours publics sans exposer le vrai nom du compte. Chargement
 * ponctuel a la connexion, ecriture optimiste comme useSettings.
 */
export function useProfile(user: User | null): UseProfileResult {
  const [pseudo, setPseudo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPseudo(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid)).then((snapshot) => {
      if (cancelled) return;
      setPseudo((snapshot.data()?.pseudo as string | undefined) ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePseudo = useCallback(
    (next: string) => {
      if (!user) return;
      const trimmed = next.trim();
      const value = trimmed.length > 0 ? trimmed : null;
      setPseudo(value);
      void updateDoc(doc(db, 'users', user.uid), { pseudo: value }).catch((err) => console.error(err));
    },
    [user],
  );

  return { pseudo, updatePseudo };
}
