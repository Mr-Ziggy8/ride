import type { ChangeEvent } from 'react';
import { convertDistanceValue, distanceUnitLabel, formatSpeed } from '../utils/units';
import type { PaceEstimate, ProjectedPosition, TrackData, UnitSystem } from '../types';

export interface ProgressPanelProps {
  track: TrackData;
  projected: ProjectedPosition | null;
  isOffTrack: boolean;
  offTrackThresholdMeters: number;
  onOffTrackThresholdChange: (value: number) => void;
  speedMetersPerSecond: number | null;
  paceEstimate: PaceEstimate | null;
  unitSystem: UnitSystem;
}

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes.toString().padStart(2, '0')}` : `${minutes} min`;
}

export function ProgressPanel({
  track,
  projected,
  isOffTrack,
  offTrackThresholdMeters,
  onOffTrackThresholdChange,
  speedMetersPerSecond,
  paceEstimate,
  unitSystem,
}: ProgressPanelProps) {
  const totalDistance = convertDistanceValue(track.totalDistanceMeters, unitSystem);
  const traveledDistance = convertDistanceValue(projected?.distanceAlongTrackMeters ?? 0, unitSystem);
  const unitLabel = distanceUnitLabel(unitSystem);
  const percent = projected?.percentComplete ?? 0;
  const offset = projected?.perpendicularOffsetMeters ?? null;
  const speed = speedMetersPerSecond !== null ? formatSpeed(speedMetersPerSecond, unitSystem) : null;

  const handleThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value > 0) {
      onOffTrackThresholdChange(value);
    }
  };

  return (
    <div className="progress-panel">
      {isOffTrack && (
        <div className="off-track-banner" role="alert">
          ⚠ Écart du tracé : {offset?.toFixed(0)} m
        </div>
      )}

      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>

      <dl className="progress-stats">
        <div className="progress-stat">
          <dt>Distance</dt>
          <dd>
            {traveledDistance.toFixed(2)} / {totalDistance.toFixed(2)} {unitLabel}
          </dd>
        </div>
        <div className="progress-stat">
          <dt>Complété</dt>
          <dd>{percent.toFixed(1)} %</dd>
        </div>
        <div className="progress-stat">
          <dt>Écart au tracé</dt>
          <dd>{offset !== null ? `${offset.toFixed(1)} m` : '—'}</dd>
        </div>
      </dl>

      <dl className="progress-stats">
        <div className="progress-stat">
          <dt>Vitesse</dt>
          <dd>{speed ?? '—'}</dd>
        </div>
        <div className="progress-stat">
          <dt>Temps restant</dt>
          <dd>{paceEstimate?.remainingSeconds != null ? formatDuration(paceEstimate.remainingSeconds) : '—'}</dd>
        </div>
      </dl>

      <label className="threshold-input">
        Seuil d'alerte hors-piste
        <input type="number" min={1} step={1} value={offTrackThresholdMeters} onChange={handleThresholdChange} />
        m
      </label>
    </div>
  );
}
