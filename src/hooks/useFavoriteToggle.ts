import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { addFavorite, listFavoriteRideIds, removeFavorite } from '../utils/favoriteStorage';

export interface UseFavoriteToggleResult {
  favoriteIds: Set<string>;
  isPending: (rideId: string) => boolean;
  toggleFavorite: (rideId: string) => void;
}

/** Charge les IDs favoris de l'utilisateur une fois, puis bascule optimiste-apres-succes par ride. */
export function useFavoriteToggle(user: User | null): UseFavoriteToggleResult {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingRideId, setPendingRideId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    listFavoriteRideIds(user.uid).then((ids) => {
      if (!cancelled) setFavoriteIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavorite = useCallback(
    (rideId: string) => {
      if (!user || pendingRideId) return;
      const isFavorite = favoriteIds.has(rideId);
      setPendingRideId(rideId);

      const action = isFavorite ? removeFavorite(user.uid, rideId) : addFavorite(user.uid, rideId);
      action
        .then(() => {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            if (isFavorite) next.delete(rideId);
            else next.add(rideId);
            return next;
          });
        })
        .catch((err) => console.error(err))
        .finally(() => setPendingRideId(null));
    },
    [user, favoriteIds, pendingRideId],
  );

  const isPending = useCallback((rideId: string) => pendingRideId === rideId, [pendingRideId]);

  return { favoriteIds, isPending, toggleFavorite };
}
