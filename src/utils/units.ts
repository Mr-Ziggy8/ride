import type { UnitSystem } from '../types';

const METERS_PER_MILE = 1609.344;

export function convertDistanceValue(meters: number, unitSystem: UnitSystem): number {
  return unitSystem === 'imperial' ? meters / METERS_PER_MILE : meters / 1000;
}

export function distanceUnitLabel(unitSystem: UnitSystem): string {
  return unitSystem === 'imperial' ? 'mi' : 'km';
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
