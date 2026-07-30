import type { FuelUnit, UnitSystem } from '../types';

const METERS_PER_MILE = 1609.344;
const LITERS_PER_US_GALLON = 3.785411784;

export function convertDistanceValue(meters: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? meters / METERS_PER_MILE : meters / 1000;
}

export function distanceUnitLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'imperial' ? 'mi' : 'km';
}

/** Inverse de convertDistanceValue - une valeur saisie dans l'unite affichee vers des metres. */
export function toMetersFromDistanceValue(value: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? value * METERS_PER_MILE : value * 1000;
}

export function formatDistance(meters: number, unitSystem: UnitSystem, fractionDigits = 1): string {
  return `${convertDistanceValue(meters, unitSystem).toFixed(fractionDigits)} ${distanceUnitLabel(unitSystem)}`;
}

export function convertSpeedValue(metersPerSecond: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? metersPerSecond * 2.236936 : metersPerSecond * 3.6;
}

export function speedUnitLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'imperial' ? 'mph' : 'km/h';
}

export function formatSpeed(metersPerSecond: number, unitSystem: UnitSystem): string {
  return `${convertSpeedValue(metersPerSecond, unitSystem).toFixed(1)} ${speedUnitLabel(unitSystem)}`;
}

/** volumeLiters est toujours le stockage canonique (comme les metres/mps pour
 * distance/vitesse) - la conversion vers l'unite choisie n'est qu'un affichage. */
export function convertVolumeValue(volumeLiters: number, fuelUnit: FuelUnit): number {
  return fuelUnit === 'gallons' ? volumeLiters / LITERS_PER_US_GALLON : volumeLiters;
}

export function volumeUnitLabel(fuelUnit: FuelUnit): string {
  return fuelUnit === 'gallons' ? 'gal' : 'L';
}

/** Inverse de convertVolumeValue - une valeur saisie dans l'unite affichee vers des litres. */
export function toLitersFromVolumeValue(value: number, fuelUnit: FuelUnit): number {
  return fuelUnit === 'gallons' ? value * LITERS_PER_US_GALLON : value;
}

export function formatVolume(volumeLiters: number, fuelUnit: FuelUnit): string {
  return `${convertVolumeValue(volumeLiters, fuelUnit).toFixed(2)} ${volumeUnitLabel(fuelUnit)}`;
}

/** Convention d'affichage classique - L/100km ou MPG - pilotee par unitSystem
 * (pas par fuelUnit, qui ne controle que la saisie/l'affichage du volume seul). */
export function formatConsumption(volumeLiters: number, distanceMeters: number, unitSystem: UnitSystem): string {
  if (distanceMeters <= 0 || volumeLiters <= 0) return '—';
  if (unitSystem === 'imperial') {
    const miles = distanceMeters / METERS_PER_MILE;
    const gallons = volumeLiters / LITERS_PER_US_GALLON;
    return `${(miles / gallons).toFixed(1)} mpg`;
  }
  const km = distanceMeters / 1000;
  return `${((volumeLiters / km) * 100).toFixed(2)} L/100km`;
}

export function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes.toString().padStart(2, '0')}` : `${minutes} min`;
}
