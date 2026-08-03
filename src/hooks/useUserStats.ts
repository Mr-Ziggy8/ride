import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { fetchUserStats } from '../utils/userStatsStorage';
import type { UserStats } from '../utils/gamification';

const EMPTY_STATS: UserStats = {
  totalDistanceMeters: 0,
  distinctRegionsCount: 0,
  referralCount: 0,
  referredByUid: null,
};

export interface UseUserStatsResult {
  stats: UserStats;
  isLoading: boolean;
  refresh: () => void;
}

/** Lecture seule, one-shot + refresh() - meme forme que useUserRole. A appeler
 * apres un sync-user-stats (recalcule serveur) ou une redemption de parrainage
 * pour voir l'etat a jour sans reload complet. */
export function useUserStats(user: User | null): UseUserStatsResult {
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!user) {
      setStats(EMPTY_STATS);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchUserStats(user.uid)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setStats(EMPTY_STATS);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { stats, isLoading, refresh };
}
