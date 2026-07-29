import type { TrackData } from '../types';

const STORAGE_KEY = 'gpx-live-tracker:track';

export interface StoredTrack {
  track: TrackData;
  warning: string | null;
}

/**
 * Survives Android Chrome killing a backgrounded tab or an accidental reload
 * mid-ride. Never throws: storage can be full, disabled (private browsing), or
 * hold data from an older incompatible app version — any of that just means
 * the track doesn't survive, not a crash.
 */
export function loadStoredTrack(): StoredTrack | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredTrack;
  } catch {
    return null;
  }
}

export function storeTrack(payload: StoredTrack): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — the track just won't survive a reload.
  }
}

export function clearStoredTrack(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
