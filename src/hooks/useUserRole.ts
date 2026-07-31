import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { FREE_ROLE, fetchUserRole } from '../utils/roleStorage';
import type { UserRole } from '../types';

export interface UseUserRoleResult {
  role: UserRole;
  isLoading: boolean;
  refresh: () => void;
}

/** Lecture seule. One-shot par defaut (le role change rarement), mais
 * refresh() permet de re-lire tout de suite apres une redemption de code
 * promo (ecrite cote serveur, invisible tant qu'on n'a pas re-fetch). */
export function useUserRole(user: User | null): UseUserRoleResult {
  const [role, setRole] = useState<UserRole>(FREE_ROLE);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!user) {
      setRole(FREE_ROLE);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchUserRole(user.uid)
      .then((result) => {
        if (!cancelled) setRole(result);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setRole(FREE_ROLE);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { role, isLoading, refresh };
}
