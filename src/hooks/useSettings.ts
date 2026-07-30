import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_SETTINGS, loadLocalSettings, storeLocalSettings } from '../utils/settingsStorage';
import type { Settings } from '../types';

export interface UseSettingsResult {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

/**
 * Invite : localStorage. Connecte : users/{uid}.settings, chargement ponctuel
 * (pas de listener temps reel - inutile ici, ecriture optimiste sur nos propres
 * changements). Applique aussi le theme sur <html data-theme> pour le CSS.
 */
export function useSettings(user: User | null): UseSettingsResult {
  const [settings, setSettings] = useState<Settings>(loadLocalSettings);

  useEffect(() => {
    if (!user) {
      setSettings(loadLocalSettings());
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'users', user.uid)).then((snapshot) => {
      if (cancelled) return;
      const remote = snapshot.data()?.settings as Partial<Settings> | undefined;
      setSettings(remote ? { ...DEFAULT_SETTINGS, ...remote } : DEFAULT_SETTINGS);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings.theme]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        if (user) {
          void updateDoc(doc(db, 'users', user.uid), { settings: next }).catch((err) => console.error(err));
        } else {
          storeLocalSettings(next);
        }
        return next;
      });
    },
    [user],
  );

  return { settings, updateSettings };
}
