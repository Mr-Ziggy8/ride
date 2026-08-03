export interface Badge {
  id: string;
  category: 'distance' | 'regions' | 'referral';
  name: string;
  /** Metres pour 'distance', nombre de regions/parrainages pour les autres categories. */
  threshold: number;
  xpBonus: number;
}

/** Seuils volontairement ronds - premier jet de gamification, a ajuster librement :
 * toute la logique (XP, badges obtenus/verrouilles) ne depend que de ce tableau. */
export const BADGES: Badge[] = [
  { id: 'distance_100', category: 'distance', name: '100 km parcourus', threshold: 100_000, xpBonus: 50 },
  { id: 'distance_500', category: 'distance', name: '500 km parcourus', threshold: 500_000, xpBonus: 150 },
  { id: 'distance_1000', category: 'distance', name: '1000 km parcourus', threshold: 1_000_000, xpBonus: 300 },
  { id: 'distance_5000', category: 'distance', name: '5000 km parcourus', threshold: 5_000_000, xpBonus: 1000 },
  { id: 'regions_3', category: 'regions', name: 'Explorateur (3 régions)', threshold: 3, xpBonus: 100 },
  { id: 'regions_10', category: 'regions', name: 'Grand voyageur (10 régions)', threshold: 10, xpBonus: 500 },
  { id: 'referral_1', category: 'referral', name: 'Parrain', threshold: 1, xpBonus: 200 },
  { id: 'referral_5', category: 'referral', name: 'Ambassadeur', threshold: 5, xpBonus: 750 },
];

export interface UserStats {
  totalDistanceMeters: number;
  distinctRegionsCount: number;
  referralCount: number;
  referredByUid: string | null;
}

function statValueForCategory(stats: UserStats, category: Badge['category']): number {
  switch (category) {
    case 'distance':
      return stats.totalDistanceMeters;
    case 'regions':
      return stats.distinctRegionsCount;
    case 'referral':
      return stats.referralCount;
  }
}

/** XP = 1 point par km parcouru (arrondi) + bonus de chaque badge actuellement
 * obtenu. Toujours recalcule a partir de userStats, jamais accumule/stocke -
 * donc jamais desynchronise d'un badge qui serait retire/ajuste plus tard. */
export function computeGamification(stats: UserStats): {
  xp: number;
  earnedBadges: Badge[];
  lockedBadges: (Badge & { progress: number })[];
} {
  const earnedBadges: Badge[] = [];
  const lockedBadges: (Badge & { progress: number })[] = [];

  for (const badge of BADGES) {
    const value = statValueForCategory(stats, badge.category);
    if (value >= badge.threshold) {
      earnedBadges.push(badge);
    } else {
      lockedBadges.push({ ...badge, progress: Math.max(0, Math.min(1, value / badge.threshold)) });
    }
  }

  const distanceXp = Math.floor(stats.totalDistanceMeters / 1000);
  const badgeXp = earnedBadges.reduce((sum, badge) => sum + badge.xpBonus, 0);

  return { xp: distanceXp + badgeXp, earnedBadges, lockedBadges };
}
