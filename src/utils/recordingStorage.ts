import type { RecordedTrackPoint } from '../types';

const STORAGE_KEY = 'gpx-live-tracker:recording';

export interface StoredRecording {
  points: RecordedTrackPoint[];
  startedAtMs: number;
}

/**
 * Meme logique de resilience que trackStorage.ts : le buffer d'un enregistrement
 * en cours survit a un reload/crash d'onglet (cf. offline_safe_recording). Jamais
 * de throw, une perte de buffer n'est jamais pire qu'un crash.
 */
export function loadStoredRecording(): StoredRecording | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredRecording;
  } catch {
    return null;
  }
}

export function storeStoredRecording(payload: StoredRecording): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — the buffer just won't survive a reload.
  }
}

export function clearStoredRecording(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
