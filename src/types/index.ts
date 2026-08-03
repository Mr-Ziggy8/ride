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
  /** Coordinates split at GPS gaps (screen lock, backgrounding...) so the map draws
   * disconnected strokes instead of a straight line across the dead zone. Falls back
   * to a single segment (geojson.geometry.coordinates) when absent/not applicable. */
  segments?: GeoJSON.Position[][];
}

export interface LivePosition {
  lat: number;
  lng: number;
  accuracyMeters: number;
  timestampMs: number;
  /** Degrees clockwise from true north, or null when the device is stationary/unknown. */
  heading: number | null;
  speedMetersPerSecond: number | null;
  altitudeMeters: number | null;
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
  /** true si une coupure GPS a ete detectee juste avant ce point (cf. RecordedTrackPoint.gap). */
  gap?: boolean;
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
  /** Saisis manuellement a la sauvegarde (distinct de regionLabel, purement informatif) - servent au filtrage. */
  country: string | null;
  region: string | null;
  downloadCount: number;
  followCount: number;
  /** Purement informatif (garage multi-vehicules, feature premium) - n'affecte jamais le tracage/les stats du parcours. */
  vehicleId: string | null;
}

/** Garage multi-vehicules (feature premium) - purement informatif : associe un
 * parcours ou un plein a une moto, sans impact sur la logique de tracage. */
export interface Vehicle {
  id: string;
  name: string;
  createdAtMs: number;
}

/** Point bufferise localement pendant un enregistrement, avant aplatissement en StoredTrackPoint a la sauvegarde. */
export interface RecordedTrackPoint {
  lng: number;
  lat: number;
  ele: number | null;
  timestampMs: number;
  /** true si le fix precedent date de plus de MAX_NORMAL_GAP_MS (ecran verrouille,
   * app en arriere-plan...) - marque le debut d'un nouveau segment plutot que de
   * relier tout droit par-dessus la zone non trackee. */
  gap?: boolean;
}

export type RecordingStatus = 'idle' | 'recording' | 'finished_pending_save';

export interface RecordingStats {
  startedAtMs: number;
  /** null tant que l'enregistrement n'est pas termine (Fini pas encore appuye). */
  endedAtMs: number | null;
  elapsedSeconds: number;
  distanceCoveredMeters: number;
  elevationGainMeters: number | null;
  maxSpeedMetersPerSecond: number | null;
  avgSpeedMetersPerSecond: number | null;
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
  /** Modo/admin uniquement : affiche les boutons/ecrans de moderation (Renommer/
   * Supprimer en contexte dans Decouverte, Feedbacks, Gestion des roles). Off par
   * defaut pour ne pas polluer l'UI en utilisation classique. */
  adminOptionsEnabled: boolean;
}

export type UserRoleType = 'free' | 'paid' | 'moderator' | 'admin';

/** Jamais modifiable depuis le client (voir firestore.rules match /roles/{uid}) -
 * uniquement via une future fonction serveur (paiement Stripe ou code promo verifie). */
export interface UserRole {
  type: UserRoleType;
  grantedAt: number | null;
  grantedVia: 'stripe' | 'promo_code' | 'admin_manual' | null;
}
