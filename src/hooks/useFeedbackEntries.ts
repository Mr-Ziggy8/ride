import { useCallback, useEffect, useState } from 'react';
import { listFeedback, type FeedbackEntry } from '../utils/feedbackStorage';

export interface UseFeedbackEntriesResult {
  entries: FeedbackEntry[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/** One-shot fetch (no realtime listener) on mount and whenever refresh() is called. */
export function useFeedbackEntries(): UseFeedbackEntriesResult {
  const [entries, setEntries] = useState<FeedbackEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listFeedback()
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Impossible de charger les commentaires.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  return { entries, isLoading, error, refresh };
}
