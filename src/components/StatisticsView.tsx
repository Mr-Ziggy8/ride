import { useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useFuelLogs } from '../hooks/useFuelLogs';
import { useMyRides } from '../hooks/useMyRides';
import {
  aggregateVisitedRegions,
  bucketConsumptionByPeriod,
  bucketDistanceByPeriod,
  RANGE_OPTIONS,
  windowStartMsForRange,
  type StatsRangeKey,
} from '../utils/statsAggregation';
import { convertDistanceValue, distanceUnitLabel, formatDistance } from '../utils/units';
import type { UnitSystem } from '../types';

interface StatisticsViewProps {
  user: User;
  unitSystem: UnitSystem;
  onClose: () => void;
}

const CHART_TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};

const AXIS_TICK_STYLE = { fill: 'var(--text-dim)', fontSize: 12 };

export function StatisticsView({ user, unitSystem, onClose }: StatisticsViewProps) {
  const { rides, isLoading: ridesLoading, error: ridesError } = useMyRides(user);
  const { entries: fuelLogs, isLoading: fuelLoading, error: fuelError } = useFuelLogs(user);
  const [rangeKey, setRangeKey] = useState<StatsRangeKey>('28d');

  const range = RANGE_OPTIONS.find((option) => option.key === rangeKey) ?? RANGE_OPTIONS[0];
  const consumptionUnitLabel = unitSystem === 'imperial' ? 'mpg' : 'L/100km';

  const windowTotalMeters = useMemo(() => {
    if (!rides) return 0;
    const nowMs = Date.now();
    const windowStartMs = windowStartMsForRange(range.days, nowMs);
    return rides
      .filter((ride) => ride.createdAtMs >= windowStartMs)
      .reduce((sum, ride) => sum + ride.totalTrackDistanceMeters, 0);
  }, [rides, range]);

  const distanceData = useMemo(() => {
    if (!rides) return [];
    const nowMs = Date.now();
    const windowStartMs = windowStartMsForRange(range.days, nowMs);
    return bucketDistanceByPeriod(rides, windowStartMs, range.bucketCount, nowMs).map((bucket) => ({
      label: bucket.label,
      distance: convertDistanceValue(bucket.totalMeters, unitSystem),
    }));
  }, [rides, range, unitSystem]);

  const consumptionData = useMemo(() => {
    if (!fuelLogs) return [];
    const nowMs = Date.now();
    const windowStartMs = windowStartMsForRange(range.days, nowMs);
    return bucketConsumptionByPeriod(fuelLogs, windowStartMs, range.bucketCount, unitSystem, nowMs).map((bucket) => ({
      label: bucket.label,
      consumption: bucket.value,
    }));
  }, [fuelLogs, range, unitSystem]);

  const visitedRegions = useMemo(() => {
    if (!rides) return [];
    const nowMs = Date.now();
    const windowStartMs = windowStartMsForRange(range.days, nowMs);
    return aggregateVisitedRegions(rides, windowStartMs, nowMs);
  }, [rides, range]);

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Statistiques</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="stats-range-selector">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={`button ${option.key === rangeKey ? 'button-primary' : 'button-ghost'}`}
            onClick={() => setRangeKey(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {(ridesLoading || fuelLoading) && <p className="my-rides-hint">Chargement...</p>}
      {(ridesError || fuelError) && <div className="banner banner-error">{ridesError ?? fuelError}</div>}

      {rides && (
        <section className="stats-section">
          <h3>Distance parcourue</h3>
          <dl className="progress-stats">
            <div className="progress-stat">
              <dt>Total sur la période</dt>
              <dd>{formatDistance(windowTotalMeters, unitSystem)}</dd>
            </div>
          </dl>
          <div className="stats-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distanceData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis
                  tick={AXIS_TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  unit={` ${distanceUnitLabel(unitSystem)}`}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value) => [`${Number(value).toFixed(1)} ${distanceUnitLabel(unitSystem)}`, 'Distance']}
                />
                <Bar dataKey="distance" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {fuelLogs && (
        <section className="stats-section">
          <h3>Consommation moyenne</h3>
          <div className="stats-chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={consumptionData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} unit={` ${consumptionUnitLabel}`} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value) => [
                    value == null ? '—' : `${Number(value).toFixed(2)} ${consumptionUnitLabel}`,
                    'Consommation',
                  ]}
                />
                <Bar dataKey="consumption" fill="var(--track)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {rides && (
        <section className="stats-section">
          <h3>Régions visitées</h3>
          {visitedRegions.length === 0 ? (
            <p className="my-rides-hint">Aucune région enregistrée sur cette période.</p>
          ) : (
            <ul className="my-rides-list">
              {visitedRegions.map((region) => (
                <li key={region.key} className="my-rides-item">
                  <span>{region.label}</span>
                  <span className="my-rides-item-meta">
                    {region.rideCount} parcours · {formatDistance(region.totalMeters, unitSystem)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
