import length from '@turf/length';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import simplify from '@turf/simplify';
import type { LivePosition, PaceEstimate, ProjectedPosition } from '../types';

export function computeTotalDistanceMeters(
  line: GeoJSON.Feature<GeoJSON.LineString>,
): number {
  return length(line, { units: 'meters' });
}

export function computeBounds(
  coordinates: GeoJSON.Position[],
): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [minLng, minLat, maxLng, maxLat];
}

export function projectPosition(
  line: GeoJSON.Feature<GeoJSON.LineString>,
  position: LivePosition,
  totalDistanceMeters: number,
): ProjectedPosition {
  const snapped = nearestPointOnLine(line, [position.lng, position.lat], {
    units: 'meters',
  });

  const distanceAlongTrackMeters = snapped.properties.totalDistance;
  const percentComplete =
    totalDistanceMeters > 0
      ? Math.min(100, Math.max(0, (distanceAlongTrackMeters / totalDistanceMeters) * 100))
      : 0;
  const [projectedLng, projectedLat] = snapped.geometry.coordinates;

  return {
    distanceAlongTrackMeters,
    percentComplete,
    perpendicularOffsetMeters: snapped.properties.pointDistance,
    projectedLat,
    projectedLng,
  };
}

const MIN_MOVING_SPEED_MPS = 0.1;

/** Average pace since `elapsedSeconds` ago, used for a stable ETA (raw instant
 * speed is too jittery to estimate a remaining time from). */
export function computePaceEstimate(
  distanceAlongTrackMeters: number,
  totalDistanceMeters: number,
  elapsedSeconds: number,
): PaceEstimate | null {
  if (elapsedSeconds <= 0) return null;

  const averageSpeedMetersPerSecond = distanceAlongTrackMeters / elapsedSeconds;
  const remainingDistanceMeters = Math.max(0, totalDistanceMeters - distanceAlongTrackMeters);
  const remainingSeconds =
    averageSpeedMetersPerSecond > MIN_MOVING_SPEED_MPS
      ? remainingDistanceMeters / averageSpeedMetersPerSecond
      : null;

  return { averageSpeedMetersPerSecond, remainingDistanceMeters, remainingSeconds };
}

const SIMPLIFY_POINT_THRESHOLD = 2000;
const SIMPLIFY_TOLERANCE_DEGREES = 0.00005;

export function simplifyForDisplay(
  line: GeoJSON.Feature<GeoJSON.LineString>,
): GeoJSON.Feature<GeoJSON.LineString> {
  if (line.geometry.coordinates.length <= SIMPLIFY_POINT_THRESHOLD) {
    return line;
  }
  return simplify(line, { tolerance: SIMPLIFY_TOLERANCE_DEGREES, highQuality: false });
}
