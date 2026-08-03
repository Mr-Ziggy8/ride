import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

export interface AdminPromoCodeRow {
  code: string;
  usageCount: number;
  maxRedemptions: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string | null;
  createdBy: string | null;
}

export interface UseAdminPromoCodesResult {
  codes: AdminPromoCodeRow[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** One-shot fetch (no realtime listener) on mount and whenever refresh() is called. */
export function useAdminPromoCodes(user: User): UseAdminPromoCodesResult {
  const [codes, setCodes] = useState<AdminPromoCodeRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    user
      .getIdToken()
      .then((idToken) => fetch('/api/admin-list-promo-codes', { headers: { Authorization: `Bearer ${idToken}` } }))
      .then((response) => {
        if (!response.ok) throw new Error('fetch_failed');
        return response.json() as Promise<{ codes: AdminPromoCodeRow[] }>;
      })
      .then((data) => {
        if (!cancelled) setCodes(data.codes);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Impossible de charger les codes promo.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { codes, isLoading, error, refresh };
}
