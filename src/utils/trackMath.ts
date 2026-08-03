import length from '@turf/length';
import nearestPointOnLine from '@turf/nearest-point-on-line';
import simplify from '@turf/simplify';
import type { LivePosition, PaceEstimate, ProjectedPosition, StoredTrackPoint } from '../types';

export function computeTotalDistanceMeters(
  line: GeoJSON.Feature<GeoJSON.LineString>,
): number {
  return length(line, { units: 'meters' });
}

/** Splits a point list into contiguous runs, starting a new run at each `gap` point
 * (cf. RecordedTrackPoint.gap) instead of connecting across a GPS dead zone. */
export function splitOnGaps<T extends { gap?: boolean }>(points: T[]): T[][] {
  const segments: T[][] = [];
  for (const point of points) {
    if (point.gap || segments.length === 0) {
      segments.push([point]);
    } else {
      segments[segments.length - 1].push(point);
    }
  }
  return segments;
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

/** Chemin SVG (dans un viewBox width x height) representant la forme macro d'un tracé, sans tuiles de carte. */
export function buildThumbnailPath(
  points: StoredTrackPoint[],
  width: number,
  height: number,
  padding: number,
): string {
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  const lngRange = maxLng - minLng || 1;
  const latRange = maxLat - minLat || 1;

  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scale = Math.min(availableWidth / lngRange, availableHeight / latRange);

  const offsetX = (width - lngRange * scale) / 2;
  const offsetY = (height - latRange * scale) / 2;

  return points
    .map((p, i) => {
      const x = offsetX + (p.lng - minLng) * scale;
      const y = offsetY + (maxLat - p.lat) * scale; // lat croit vers le nord, y SVG croit vers le bas
      const isNewSegment = i === 0 || p.gap; // gap GPS : nouveau sous-trace au lieu d'un trait continu
      return `${isNewSegment ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
