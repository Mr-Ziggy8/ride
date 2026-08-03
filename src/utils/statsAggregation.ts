import type { FuelLogEntry } from './fuelLogStorage';
import { computeConsumptionValue } from './units';
import type { Ride, UnitSystem } from '../types';

export type StatsRangeKey = '28d' | '3m' | '6m' | '1y';

export interface StatsRangeOption {
  key: StatsRangeKey;
  label: string;
  days: number;
  /** Nb de tranches temporelles egales dans lesquelles decouper la periode pour les graphes. */
  bucketCount: number;
}

export const RANGE_OPTIONS: StatsRangeOption[] = [
  { key: '28d', label: '28 jours', days: 28, bucketCount: 4 },
  { key: '3m', label: '3 mois', days: 90, bucketCount: 3 },
  { key: '6m', label: '6 mois', days: 182, bucketCount: 6 },
  { key: '1y', label: '1 an', days: 365, bucketCount: 12 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function windowStartMsForRange(days: number, nowMs: number): number {
  return nowMs - days * DAY_MS;
}

interface BucketBounds {
  startMs: number;
  endMs: number;
}

function bucketBoundaries(windowStartMs: number, nowMs: number, bucketCount: number): BucketBounds[] {
  const bucketWidthMs = (nowMs - windowStartMs) / bucketCount;
  return Array.from({ length: bucketCount }, (_, index) => ({
    startMs: windowStartMs + index * bucketWidthMs,
    endMs: windowStartMs + (index + 1) * bucketWidthMs,
  }));
}

function bucketLabel(startMs: number): string {
  return new Date(startMs).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export interface DistanceBucket {
  label: string;
  totalMeters: number;
}

/** Toutes sources confondues (recorded + uploaded) - a la difference du calcul de
 * conso (FuelLogView), la distance parcourue affichee ici est un total "vecu",
 * pas seulement le kilometrage utilise pour estimer une consommation. */
export function bucketDistanceByPeriod(
  rides: Ride[],
  windowStartMs: number,
  bucketCount: number,
  nowMs: number,
): DistanceBucket[] {
  return bucketBoundaries(windowStartMs, nowMs, bucketCount).map(({ startMs, endMs }) => ({
    label: bucketLabel(startMs),
    totalMeters: rides
      .filter((ride) => ride.createdAtMs >= startMs && ride.createdAtMs < endMs)
      .reduce((sum, ride) => sum + ride.totalTrackDistanceMeters, 0),
  }));
}

export interface ConsumptionBucket {
  label: string;
  /** null si aucun plein dans cette tranche - pas de barre a tracer plutot qu'un zero trompeur. */
  value: number | null;
}

export function bucketConsumptionByPeriod(
  fuelLogs: FuelLogEntry[],
  windowStartMs: number,
  bucketCount: number,
  unitSystem: UnitSystem,
  nowMs: number,
): ConsumptionBucket[] {
  return bucketBoundaries(windowStartMs, nowMs, bucketCount).map(({ startMs, endMs }) => {
    const entriesInBucket = fuelLogs.filter((entry) => entry.dateMs >= startMs && entry.dateMs < endMs);
    const totalVolumeLiters = entriesInBucket.reduce((sum, entry) => sum + entry.volumeLiters, 0);
    const totalDistanceMeters = entriesInBucket.reduce((sum, entry) => sum + entry.distanceSinceLastFillMeters, 0);
    return {
      label: bucketLabel(startMs),
      value: computeConsumptionValue(totalVolumeLiters, totalDistanceMeters, unitSystem),
    };
  });
}

export interface VisitedRegion {
  key: string;
  label: string;
  rideCount: number;
  totalMeters: number;
}

/** Regroupe par region (ou a defaut regionLabel/country) - premiere valeur non
 * nulle rencontree sert de cle, un parcours sans aucune de ces infos est ignore. */
export function aggregateVisitedRegions(rides: Ride[], windowStartMs: number, nowMs: number): VisitedRegion[] {
  const byKey = new Map<string, VisitedRegion>();

  rides
    .filter((ride) => ride.createdAtMs >= windowStartMs && ride.createdAtMs <= nowMs)
    .forEach((ride) => {
      const label = ride.region ?? ride.regionLabel ?? ride.country;
      if (!label) return;
      const existing = byKey.get(label);
      if (existing) {
        existing.rideCount += 1;
        existing.totalMeters += ride.totalTrackDistanceMeters;
      } else {
        byKey.set(label, { key: label, label, rideCount: 1, totalMeters: ride.totalTrackDistanceMeters });
      }
    });

  return Array.from(byKey.values()).sort((a, b) => b.totalMeters - a.totalMeters);
}
