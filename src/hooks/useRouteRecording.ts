import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import distance from '@turf/distance';
import { clearStoredRecording, loadStoredRecording, storeStoredRecording } from '../utils/recordingStorage';
import type { LivePosition, RecordedTrackPoint, RecordingStats, RecordingStatus } from '../types';

const MIN_SAMPLE_INTERVAL_MS = 5000;
const MIN_SAMPLE_DISTANCE_METERS = 10;

export interface UseRouteRecordingResult {
  status: RecordingStatus;
  points: RecordedTrackPoint[];
  stats: RecordingStats;
  currentSpeedMetersPerSecond: number | null;
  start: () => void;
  addPosition: (position: LivePosition) => void;
  finish: () => void;
  discard: () => void;
}

function sumDistanceMeters(points: RecordedTrackPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distance([points[i - 1].lng, points[i - 1].lat], [points[i].lng, points[i].lat], { units: 'meters' });
  }
  return total;
}

function sumElevationGainMeters(points: RecordedTrackPoint[]): number | null {
  if (points.length < 2 || !points.every((p) => p.ele !== null)) return null;
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const delta = (points[i].ele as number) - (points[i - 1].ele as number);
    if (delta > 0) gain += delta;
  }
  return gain;
}

/**
 * Etat + bufferisation d'un enregistrement de parcours (cf. state_machines.route_recording).
 * Ne pilote pas watchPosition/wakeLock elle-meme (App.tsx s'en charge via useGeolocation/
 * useWakeLock deja existants) - cette hook ne fait que bufferiser les points recus via
 * addPosition() et les persister en localStorage a chaque point accepte, pour survivre a un
 * reload pendant l'enregistrement (offline_safe_recording). Aucune ecriture Firestore ici.
 */
export function useRouteRecording(): UseRouteRecordingResult {
  const restored = useRef(loadStoredRecording()).current;

  const [status, setStatus] = useState<RecordingStatus>(restored ? 'recording' : 'idle');
  const [points, setPoints] = useState<RecordedTrackPoint[]>(restored?.points ?? []);
  const [maxSpeedMetersPerSecond, setMaxSpeedMetersPerSecond] = useState<number | null>(null);
  const [currentSpeedMetersPerSecond, setCurrentSpeedMetersPerSecond] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const startedAtMsRef = useRef<number | null>(restored?.startedAtMs ?? null);
  const endedAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'recording') return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [status]);

  const start = useCallback(() => {
    startedAtMsRef.current = Date.now();
    endedAtMsRef.current = null;
    setPoints([]);
    setMaxSpeedMetersPerSecond(null);
    setCurrentSpeedMetersPerSecond(null);
    setNowMs(Date.now());
    setStatus('recording');
    storeStoredRecording({ points: [], startedAtMs: startedAtMsRef.current });
  }, []);

  const addPosition = useCallback((position: LivePosition) => {
    setCurrentSpeedMetersPerSecond(position.speedMetersPerSecond);
    if (position.speedMetersPerSecond !== null) {
      const speed = position.speedMetersPerSecond;
      setMaxSpeedMetersPerSecond((prev) => (prev === null ? speed : Math.max(prev, speed)));
    }

    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (last) {
        const elapsedMs = position.timestampMs - last.timestampMs;
        const movedMeters = distance([last.lng, last.lat], [position.lng, position.lat], { units: 'meters' });
        if (elapsedMs < MIN_SAMPLE_INTERVAL_MS && movedMeters < MIN_SAMPLE_DISTANCE_METERS) {
          return prev;
        }
      }
      const next: RecordedTrackPoint[] = [
        ...prev,
        { lng: position.lng, lat: position.lat, ele: position.altitudeMeters, timestampMs: position.timestampMs },
      ];
      if (startedAtMsRef.current !== null) {
        storeStoredRecording({ points: next, startedAtMs: startedAtMsRef.current });
      }
      return next;
    });
  }, []);

  const finish = useCallback(() => {
    endedAtMsRef.current = Date.now();
    setNowMs(endedAtMsRef.current);
    setStatus('finished_pending_save');
  }, []);

  const discard = useCallback(() => {
    clearStoredRecording();
    startedAtMsRef.current = null;
    endedAtMsRef.current = null;
    setPoints([]);
    setStatus('idle');
  }, []);

  const distanceCoveredMeters = useMemo(() => sumDistanceMeters(points), [points]);
  const elevationGainMeters = useMemo(() => sumElevationGainMeters(points), [points]);
  const elapsedSeconds =
    startedAtMsRef.current !== null ? Math.max(0, ((endedAtMsRef.current ?? nowMs) - startedAtMsRef.current) / 1000) : 0;
  const avgSpeedMetersPerSecond = elapsedSeconds > 0 ? distanceCoveredMeters / elapsedSeconds : null;

  const stats: RecordingStats = {
    startedAtMs: startedAtMsRef.current ?? 0,
    endedAtMs: endedAtMsRef.current,
    elapsedSeconds,
    distanceCoveredMeters,
    elevationGainMeters,
    maxSpeedMetersPerSecond,
    avgSpeedMetersPerSecond,
  };

  return { status, points, stats, currentSpeedMetersPerSecond, start, addPosition, finish, discard };
}
