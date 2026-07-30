import { convertDistanceValue } from './units';
import type { Ride, UnitSystem } from '../types';

export interface RideFiltersValue {
  minKm: number;
  /** Infinity == pas de plafond fixe par l'utilisateur (suit le plus long parcours affiche). */
  maxKm: number;
  countries: string[];
  regions: string[];
}

export const DEFAULT_RIDE_FILTERS: RideFiltersValue = {
  minKm: 0,
  maxKm: Infinity,
  countries: [],
  regions: [],
};

/**
 * Filtrage cote client sur une liste deja chargee/paginee (voir
 * decisions_log.filtering_client_side) - pas de nouvelle query Firestore par
 * combinaison de filtres.
 */
export function filterRides(rides: Ride[], filters: RideFiltersValue, unitSystem: UnitSystem): Ride[] {
  return rides.filter((ride) => {
    const distance = convertDistanceValue(ride.totalTrackDistanceMeters, unitSystem);
    if (distance < filters.minKm || distance > filters.maxKm) return false;
    if (filters.countries.length > 0 && (!ride.country || !filters.countries.includes(ride.country))) return false;
    if (filters.regions.length > 0 && (!ride.region || !filters.regions.includes(ride.region))) return false;
    return true;
  });
}
