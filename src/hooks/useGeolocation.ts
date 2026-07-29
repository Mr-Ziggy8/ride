import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeolocationErrorInfo, LivePosition } from '../types';

export interface UseGeolocationResult {
  position: LivePosition | null;
  error: GeolocationErrorInfo | null;
  isTracking: boolean;
  /** Timestamp (ms) of the first fix of the current tracking session, for pace/ETA math. */
  sessionStartMs: number | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function mapGeolocationError(err: GeolocationPositionError): GeolocationErrorInfo {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return {
        code: 'permission_denied',
        message:
          "Permission de géolocalisation refusée. Autorisez la localisation pour ce site dans les réglages de Chrome pour démarrer le suivi.",
      };
    case err.POSITION_UNAVAILABLE:
      return { code: 'position_unavailable', message: 'Position GPS indisponible pour le moment.' };
    case err.TIMEOUT:
      return {
        code: 'timeout',
        message: 'Délai dépassé en attendant la position GPS. Nouvelle tentative en cours.',
      };
    default:
      return { code: 'position_unavailable', message: 'Erreur de géolocalisation inconnue.' };
  }
}

/**
 * Wraps navigator.geolocation.watchPosition/clearWatch. Never starts watching on
 * its own: `start` must be called from a user gesture so Chrome's permission
 * prompt isn't auto-denied on page load.
 */
export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [error, setError] = useState<GeolocationErrorInfo | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const clearActiveWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearActiveWatch();
    setIsTracking(false);
  }, [clearActiveWatch]);

  const reset = useCallback(() => {
    clearActiveWatch();
    setIsTracking(false);
    setPosition(null);
    setError(null);
    sessionStartRef.current = null;
    setSessionStartMs(null);
  }, [clearActiveWatch]);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError({
        code: 'unsupported',
        message: "La géolocalisation n'est pas disponible sur ce navigateur.",
      });
      return;
    }

    setError(null);
    clearActiveWatch();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (sessionStartRef.current === null) {
          sessionStartRef.current = pos.timestamp;
          setSessionStartMs(pos.timestamp);
        }
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
          timestampMs: pos.timestamp,
          heading: pos.coords.heading,
          speedMetersPerSecond: pos.coords.speed,
        });
        setError(null);
      },
      (err) => {
        const info = mapGeolocationError(err);
        setError(info);
        if (info.code === 'permission_denied') {
          clearActiveWatch();
          setIsTracking(false);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
    setIsTracking(true);
  }, [clearActiveWatch]);

  useEffect(() => clearActiveWatch, [clearActiveWatch]);

  return { position, error, isTracking, sessionStartMs, start, stop, reset };
}
