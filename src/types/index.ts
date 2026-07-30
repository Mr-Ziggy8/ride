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
  speedMetersPerSecond: number | null;
}

export interface ProjectedPosition {
  distanceAlongTrackMeters: number;
  percentComplete: number;
  perpendicularOffsetMeters: number;
  projectedLat: number;
  projectedLng: number;
}

export interface PaceEstimate {
  averageSpeedMetersPerSecond: number;
  remainingDistanceMeters: number;
  /** null when the average pace is too close to zero for a meaningful ETA. */
  remainingSeconds: number | null;
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

/** Firestore n'accepte pas les tableaux imbriques (coordinates GeoJSON), d'ou ce point aplati. */
export interface StoredTrackPoint {
  lng: number;
  lat: number;
  ele: number | null;
}

export type RideVisibility = 'public' | 'private';
export type RideSource = 'recorded' | 'uploaded';

export interface Ride {
  id: string;
  ownerId: string;
  ownerDisplayName: string;
  title: string;
  source: RideSource;
  visibility: RideVisibility;
  createdAtMs: number;
  totalTrackDistanceMeters: number;
  trackPoints: StoredTrackPoint[];
  bounds: [number, number, number, number];
  /** null si la geolocalisation inverse a echoue/timeout au moment de la sauvegarde. */
  regionLabel: string | null;
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';
export type FuelUnit = 'liters' | 'gallons';
export type Language = 'fr' | 'en' | 'nl' | 'de' | 'es' | 'it';

export interface Settings {
  unitSystem: UnitSystem;
  fuelUnit: FuelUnit;
  theme: ThemeMode;
  language: Language;
}
