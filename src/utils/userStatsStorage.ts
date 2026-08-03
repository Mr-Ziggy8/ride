import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserStats } from './gamification';

const EMPTY_STATS: UserStats = {
  totalDistanceMeters: 0,
  distinctRegionsCount: 0,
  referralCount: 0,
  referredByUid: null,
};

/** Absence de document userStats/{uid} == aucune synchro jamais faite (compte
 * cree, "Actualiser mes stats" jamais clique) - equivalent au role 'free'
 * implicite de roleStorage.ts. */
export async function fetchUserStats(uid: string): Promise<UserStats> {
  const snapshot = await getDoc(doc(db, 'userStats', uid));
  if (!snapshot.exists()) return EMPTY_STATS;

  const data = snapshot.data();
  return {
    totalDistanceMeters: data.totalDistanceMeters ?? 0,
    distinctRegionsCount: data.distinctRegionsCount ?? 0,
    referralCount: data.referralCount ?? 0,
    referredByUid: data.referredByUid ?? null,
  };
}
