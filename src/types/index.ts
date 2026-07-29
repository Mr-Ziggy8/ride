export interface ElevationPoint {
  distanceMeters: number;
  elevationMeters: number;
}

export interface TrackData {
  geojson: GeoJSON.Feature<GeoJSON.LineString>;
  totalDistanceMeters: number;
  hasElevation: boolean;
  elevationProfile: ElevationPoint[] | null;
  bounds: [number, number, number, number];
}

export interface LivePosition {
  lat: number;
  lng: number;
  accuracyMeters: number;
  timestampMs: number;
  /** Degrees clockwise from true north, or null when the device is stationary/unknown. */
  heading: number | null;
}

export interface ProjectedPosition {
  distanceAlongTrackMeters: number;
  percentComplete: number;
  perpendicularOffsetMeters: number;
  projectedLat: number;
  projectedLng: number;
}

export type GeolocationErrorCode =
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout'
  | 'unsupported';

export interface GeolocationErrorInfo {
  code: GeolocationErrorCode;
  message: string;
}

export type WakeLockStatus = 'unsupported' | 'inactive' | 'active' | 'error';
