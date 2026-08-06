import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { listMaintenanceLogs, type MaintenanceLogEntry } from '../utils/maintenanceLogStorage';

export interface UseMaintenanceLogsResult {
  entries: MaintenanceLogEntry[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** One-shot fetch (no realtime listener) on mount and whenever refresh() is called. */
export function useMaintenanceLogs(user: User): UseMaintenanceLogsResult {
  const [entries, setEntries] = useState<MaintenanceLogEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listMaintenanceLogs(user.uid)
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Impossible de charger le carnet d'entretien.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { entries, isLoading, error, refresh };
}
