import { useMemo } from 'react';
import { EU_COUNTRIES_REGIONS } from '../data/euCountriesRegions';
import { convertDistanceValue, distanceUnitLabel } from '../utils/units';
import type { RideFiltersValue } from '../utils/rideFilters';
import type { Ride, UnitSystem } from '../types';

interface RideFiltersProps {
  rides: Ride[];
  unitSystem: UnitSystem;
  value: RideFiltersValue;
  onChange: (next: RideFiltersValue) => void;
}

export function RideFilters({ rides, unitSystem, value, onChange }: RideFiltersProps) {
  const maxPossible = useMemo(() => {
    const max = Math.max(0, ...rides.map((r) => convertDistanceValue(r.totalTrackDistanceMeters, unitSystem)));
    return Math.ceil(max) || 1;
  }, [rides, unitSystem]);

  // Pas de pays selectionne == pas de sens a montrer un choix de region (liste
  // agregee de tous les pays d'Europe, imperceptible/inutile).
  const availableRegions = useMemo(() => {
    if (value.countries.length === 0) return [];
    const set = new Set<string>();
    for (const country of value.countries) {
      const entry = EU_COUNTRIES_REGIONS.find((c) => c.country === country);
      entry?.regions.forEach((r) => set.add(r));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [value.countries]);

  const toggleCountry = (country: string) => {
    const nextCountries = value.countries.includes(country)
      ? value.countries.filter((c) => c !== country)
      : [...value.countries, country];
    const nextRegions = value.regions.filter((region) =>
      nextCountries.some((c) => EU_COUNTRIES_REGIONS.find((entry) => entry.country === c)?.regions.includes(region)),
    );
    onChange({ ...value, countries: nextCountries, regions: nextRegions });
  };

  const toggleRegion = (region: string) => {
    const nextRegions = value.regions.includes(region)
      ? value.regions.filter((r) => r !== region)
      : [...value.regions, region];
    onChange({ ...value, regions: nextRegions });
  };

  const unitLabel = distanceUnitLabel(unitSystem);
  const displayedMax = Number.isFinite(value.maxKm) ? value.maxKm : maxPossible;

  return (
    <div className="ride-filters">
      <div className="ride-filters-distance">
        <label>
          Min ({unitLabel}) : {value.minKm.toFixed(0)}
          <input
            type="range"
            min={0}
            max={maxPossible}
            value={value.minKm}
            onChange={(event) => onChange({ ...value, minKm: Math.min(Number(event.target.value), displayedMax) })}
          />
        </label>
        <label>
          Max ({unitLabel}) : {displayedMax.toFixed(0)}
          <input
            type="range"
            min={0}
            max={maxPossible}
            value={displayedMax}
            onChange={(event) => onChange({ ...value, maxKm: Math.max(Number(event.target.value), value.minKm) })}
          />
        </label>
      </div>

      <div className="ride-filters-toggles">
        <span className="ride-filters-label">Pays</span>
        <div className="ride-filters-chips">
          {EU_COUNTRIES_REGIONS.map((c) => (
            <button
              key={c.country}
              type="button"
              className={`filter-chip${value.countries.includes(c.country) ? ' filter-chip--active' : ''}`}
              onClick={() => toggleCountry(c.country)}
            >
              {c.country}
            </button>
          ))}
        </div>
      </div>

      {availableRegions.length > 0 && (
        <div className="ride-filters-toggles">
          <span className="ride-filters-label">Région</span>
          <div className="ride-filters-chips">
            {availableRegions.map((r) => (
              <button
                key={r}
                type="button"
                className={`filter-chip${value.regions.includes(r) ? ' filter-chip--active' : ''}`}
                onClick={() => toggleRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
