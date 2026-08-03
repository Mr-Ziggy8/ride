import { useMemo } from 'react';
import { MapView } from './MapView';
import { computeBounds, splitOnGaps } from '../utils/trackMath';
import { formatDistance, formatDuration, formatSpeed } from '../utils/units';
import type { LivePosition, RecordedTrackPoint, RecordingStats, TrackData, UnitSystem } from '../types';

interface RecordingScreenProps {
  points: RecordedTrackPoint[];
  livePosition: LivePosition | null;
  stats: RecordingStats;
  currentSpeedMetersPerSecond: number | null;
  unitSystem: UnitSystem;
  onFinish: () => void;
}

function toPosition(p: RecordedTrackPoint): GeoJSON.Position {
  return p.ele !== null ? [p.lng, p.lat, p.ele] : [p.lng, p.lat];
}

function buildLiveTrack(points: RecordedTrackPoint[], distanceMeters: number): TrackData | null {
  if (points.length < 2) return null;
  const coordinates = points.map(toPosition);
  const segments = splitOnGaps(points).map((segment) => segment.map(toPosition));
  return {
    geojson: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } },
    totalDistanceMeters: distanceMeters,
    hasElevation: false,
    elevationProfile: null,
    bounds: computeBounds(coordinates),
    segments,
  };
}

export function RecordingScreen({
  points,
  livePosition,
  stats,
  currentSpeedMetersPerSecond,
  unitSystem,
  onFinish,
}: RecordingScreenProps) {
  const track = useMemo(() => buildLiveTrack(points, stats.distanceCoveredMeters), [points, stats.distanceCoveredMeters]);

  return (
    <main className="tracker-screen">
      {track ? (
        <MapView track={track} livePosition={livePosition} projected={null} isOffTrack={false} />
      ) : (
        <div className="upload-screen">
          <p>En attente du signal GPS...</p>
        </div>
      )}

      <dl className="progress-stats">
        <div className="progress-stat">
          <dt>Distance</dt>
          <dd>{formatDistance(stats.distanceCoveredMeters, unitSystem)}</dd>
        </div>
        <div className="progress-stat">
          <dt>Durée</dt>
          <dd>{formatDuration(stats.elapsedSeconds)}</dd>
        </div>
        <div className="progress-stat">
          <dt>Vitesse</dt>
          <dd>{currentSpeedMetersPerSecond !== null ? formatSpeed(currentSpeedMetersPerSecond, unitSystem) : '—'}</dd>
        </div>
      </dl>

      <div className="tracking-controls">
        <button type="button" className="button button-secondary" onClick={onFinish}>
          Fini
        </button>
      </div>
    </main>
  );
}
