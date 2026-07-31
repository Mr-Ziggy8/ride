import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export interface AdminUserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  roleType: string;
  paidVia: string | null;
}

export interface UseAdminUsersResult {
  users: AdminUserRow[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** One-shot fetch (no realtime listener) on mount and whenever refresh() is called. */
export function useAdminUsers(user: User): UseAdminUsersResult {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    user
      .getIdToken()
      .then((idToken) => fetch('/api/admin-list-users', { headers: { Authorization: `Bearer ${idToken}` } }))
      .then((response) => {
        if (!response.ok) throw new Error('fetch_failed');
        return response.json() as Promise<{ users: AdminUserRow[] }>;
      })
      .then((data) => {
        if (!cancelled) setUsers(data.users);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Impossible de charger la liste des utilisateurs.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { users, isLoading, error, refresh };
}
