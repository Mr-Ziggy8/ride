import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { listFavoriteRides } from '../utils/favoriteStorage';
import type { Ride } from '../types';

export interface UseFavoriteRidesResult {
  rides: Ride[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** One-shot fetch (no realtime listener) on mount and whenever refresh() is called. */
export function useFavoriteRides(user: User): UseFavoriteRidesResult {
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listFavoriteRides(user.uid)
      .then((result) => {
        if (!cancelled) setRides(result);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Impossible de charger tes favoris.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { rides, isLoading, error, refresh };
}
