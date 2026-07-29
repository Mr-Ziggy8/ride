import { gpx as gpxToGeoJson } from '@tmcw/togeojson';
import distance from '@turf/distance';
import { computeBounds, computeTotalDistanceMeters } from './trackMath';
import type { ElevationPoint, TrackData } from '../types';

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxParseError';
  }
}

export interface GpxParseResult {
  track: TrackData;
  warning: string | null;
}

function isLineGeometry(
  geometry: GeoJSON.Geometry | null,
): geometry is GeoJSON.LineString | GeoJSON.MultiLineString {
  return geometry?.type === 'LineString' || geometry?.type === 'MultiLineString';
}

function flattenGeometryToPositions(
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString,
): GeoJSON.Position[] {
  return geometry.type === 'LineString'
    ? geometry.coordinates
    : geometry.coordinates.flat();
}

function collectPositions(
  features: GeoJSON.Feature[],
  gpxType: 'trk' | 'rte',
): GeoJSON.Position[] {
  const positions: GeoJSON.Position[] = [];
  for (const feature of features) {
    if (feature.properties?._gpxType !== gpxType) continue;
    if (!isLineGeometry(feature.geometry)) continue;
    positions.push(...flattenGeometryToPositions(feature.geometry));
  }
  return positions;
}

function dedupeConsecutive(positions: GeoJSON.Position[]): GeoJSON.Position[] {
  const result: GeoJSON.Position[] = [];
  for (const p of positions) {
    const prev = result[result.length - 1];
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) {
      result.push(p);
    }
  }
  return result;
}

function buildElevationProfile(positions: GeoJSON.Position[]): ElevationPoint[] {
  const profile: ElevationPoint[] = [];
  let cumulativeMeters = 0;
  for (let i = 0; i < positions.length; i++) {
    if (i > 0) {
      cumulativeMeters += distance(positions[i - 1], positions[i], { units: 'meters' });
    }
    profile.push({ distanceMeters: cumulativeMeters, elevationMeters: positions[i][2] });
  }
  return profile;
}

/**
 * Parses raw GPX file contents into a TrackData ready for display and projection.
 * Throws GpxParseError for anything that isn't a usable GPX. Returns a non-null
 * `warning` when it had to fall back to a `rte` in the absence of any `trk`.
 */
export function parseGpx(gpxText: string): GpxParseResult {
  const xmlDoc = new DOMParser().parseFromString(gpxText, 'application/xml');

  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new GpxParseError('Le fichier GPX est malformé (XML invalide).');
  }
  if (xmlDoc.getElementsByTagName('gpx').length === 0) {
    throw new GpxParseError('Ce fichier ne semble pas être un GPX valide (élément <gpx> introuvable).');
  }

  const featureCollection = gpxToGeoJson(xmlDoc);

  let positions = collectPositions(featureCollection.features, 'trk');
  let warning: string | null = null;

  if (positions.length === 0) {
    positions = collectPositions(featureCollection.features, 'rte');
    if (positions.length > 0) {
      warning =
        "Ce GPX ne contient pas de track (trk), seulement une route (rte) : affichage à partir des points d'étape, projection moins précise.";
    }
  }

  positions = dedupeConsecutive(positions);

  if (positions.length < 2) {
    throw new GpxParseError('Ce GPX ne contient aucun tracé exploitable (ni trk ni rte avec au moins 2 points).');
  }

  const hasElevation = positions.every(
    (p) => typeof p[2] === 'number' && Number.isFinite(p[2]),
  );
  const elevationProfile = hasElevation ? buildElevationProfile(positions) : null;

  const coordinates: GeoJSON.Position[] = positions.map(([lng, lat]) => [lng, lat]);
  const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };

  const track: TrackData = {
    geojson,
    totalDistanceMeters: computeTotalDistanceMeters(geojson),
    hasElevation,
    elevationProfile,
    bounds: computeBounds(coordinates),
  };

  return { track, warning };
}
