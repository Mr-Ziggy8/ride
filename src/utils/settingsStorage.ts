import type { Settings } from '../types';

const STORAGE_KEY = 'gpx-live-tracker:settings';

export const DEFAULT_SETTINGS: Settings = {
  unitSystem: 'metric',
  fuelUnit: 'liters',
  theme: 'system',
  language: 'fr',
  modOptionsEnabled: false,
};

export function loadLocalSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function storeLocalSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // stockage plein ou indisponible - le reglage ne survivra juste pas a un reload
  }
}
