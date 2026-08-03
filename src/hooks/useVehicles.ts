import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { listVehicles } from '../utils/vehicleStorage';
import type { Vehicle } from '../types';

export interface UseVehiclesResult {
  vehicles: Vehicle[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** One-shot fetch (no realtime listener) on mount and whenever refresh() is called. */
export function useVehicles(user: User): UseVehiclesResult {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listVehicles(user.uid)
      .then((result) => {
        if (!cancelled) setVehicles(result);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Impossible de charger le garage.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { vehicles, isLoading, error, refresh };
}
