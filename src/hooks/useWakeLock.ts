import { useCallback, useEffect, useRef, useState } from 'react';
import type { WakeLockStatus } from '../types';

interface WakeLockSentinelLike extends EventTarget {
  released: boolean;
  release(): Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
}

function getWakeLockNavigator(): NavigatorWithWakeLock | null {
  return 'wakeLock' in navigator ? (navigator as unknown as NavigatorWithWakeLock) : null;
}

export interface UseWakeLockResult {
  status: WakeLockStatus;
  request: () => Promise<void>;
  release: () => Promise<void>;
}

/**
 * Wraps the Screen Wake Lock API. The OS releases the lock whenever the tab is
 * backgrounded, so this re-acquires it on visibilitychange as long as the caller
 * still wants it held (tracked via wantsActiveRef, independent of React state).
 */
export function useWakeLock(): UseWakeLockResult {
  const [status, setStatus] = useState<WakeLockStatus>(
    getWakeLockNavigator() ? 'inactive' : 'unsupported',
  );
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const wantsActiveRef = useRef(false);

  const request = useCallback(async () => {
    const wakeLockNav = getWakeLockNavigator();
    if (!wakeLockNav) {
      setStatus('unsupported');
      return;
    }

    wantsActiveRef.current = true;
    try {
      const sentinel = await wakeLockNav.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setStatus('active');
      sentinel.addEventListener('release', () => {
        sentinelRef.current = null;
        setStatus((s) => (s === 'unsupported' ? s : 'inactive'));
      });
    } catch {
      setStatus('error');
    }
  }, []);

  const release = useCallback(async () => {
    wantsActiveRef.current = false;
    const sentinel = sentinelRef.current;
    if (sentinel) {
      sentinelRef.current = null;
      await sentinel.release();
    }
    setStatus((s) => (s === 'unsupported' ? s : 'inactive'));
  }, []);

  useEffect(() => {
    if (!getWakeLockNavigator()) return;
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        wantsActiveRef.current &&
        sentinelRef.current === null
      ) {
        void request();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [request]);

  useEffect(() => {
    return () => {
      void sentinelRef.current?.release();
    };
  }, []);

  return { status, request, release };
}
