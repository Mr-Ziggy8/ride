import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { FREE_ROLE, fetchUserRole } from '../utils/roleStorage';
import type { UserRole } from '../types';

export interface UseUserRoleResult {
  role: UserRole;
  isLoading: boolean;
}

/** Lecture seule, one-shot (pas de listener temps reel - le role change rarement). */
export function useUserRole(user: User | null): UseUserRoleResult {
  const [role, setRole] = useState<UserRole>(FREE_ROLE);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [user]);

  return { role, isLoading };
}
