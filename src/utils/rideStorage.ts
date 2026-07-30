import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { reverseGeocodeRegion } from './geocoding';
import { buildElevationProfile, hasElevationData } from './gpxParser';
import { computeBounds, simplifyForDisplay } from './trackMath';
import type { Ride, RideVisibility, RecordingStats, StoredTrackPoint, TrackData } from '../types';

/**
 * Firestore n'accepte pas les tableaux imbriques - les coordinates GeoJSON
 * ([[lng, lat], ...]) en sont un. On aplatit en tableau d'objets {lng, lat, ele}.
 */
function toStoredTrackPoints(line: GeoJSON.Feature<GeoJSON.LineString>): StoredTrackPoint[] {
  return line.geometry.coordinates.map(([lng, lat, ele]) => ({
    lng,
    lat,
    ele: ele ?? null,
  }));
}

/** Pseudo public choisi par l'utilisateur (users/{uid}.pseudo), sinon le nom du
 * compte Google, sinon un defaut generique - jamais de champ vide en public. */
function resolveOwnerDisplayName(user: User, pseudo: string | null): string {
  return pseudo?.trim() || user.displayName || 'Pilote';
}

/**
 * Stats fields (distance couverte, vitesse max/moyenne, denivele, startedAt/endedAt)
 * ne sont pas encore ecrits ici : ils n'ont de valeur honnete que pour une session
 * suivie de bout en bout (route_recording, pas encore construit).
 */
export async function saveRide(
  user: User,
  track: TrackData,
  title: string,
  visibility: RideVisibility,
  pseudo: string | null,
  country: string | null,
  region: string | null,
): Promise<string> {
  const centerLng = (track.bounds[0] + track.bounds[2]) / 2;
  const centerLat = (track.bounds[1] + track.bounds[3]) / 2;
  const regionLabel = await reverseGeocodeRegion(centerLat, centerLng);

  const docRef = await addDoc(collection(db, 'rides'), {
    ownerId: user.uid,
    ownerDisplayName: resolveOwnerDisplayName(user, pseudo),
    title,
    source: 'uploaded',
    visibility,
    createdAt: serverTimestamp(),
    totalTrackDistanceMeters: track.totalDistanceMeters,
    trackPoints: toStoredTrackPoints(simplifyForDisplay(track.geojson)),
    bounds: track.bounds,
    regionLabel,
    country,
    region,
    downloadCount: 0,
    followCount: 0,
  });
  return docRef.id;
}

/** Sauvegarde d'un parcours enregistre en live (cf. state_machines.route_recording,
 * transition finished_pending_save -[Enregistrer]-> idle). Ecriture Firestore unique,
 * en fin d'enregistrement seulement (offline_safe_recording). */
export async function saveRecordedRide(
  user: User,
  points: StoredTrackPoint[],
  stats: RecordingStats,
  title: string,
  visibility: RideVisibility,
  pseudo: string | null,
  country: string | null,
  region: string | null,
): Promise<string> {
  const bounds = computeBounds(points.map((p) => [p.lng, p.lat]));
  const centerLng = (bounds[0] + bounds[2]) / 2;
  const centerLat = (bounds[1] + bounds[3]) / 2;
  const regionLabel = await reverseGeocodeRegion(centerLat, centerLng);

  const coordinates: GeoJSON.Position[] = points.map((p) => (p.ele !== null ? [p.lng, p.lat, p.ele] : [p.lng, p.lat]));
  const line: GeoJSON.Feature<GeoJSON.LineString> = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };

  const docRef = await addDoc(collection(db, 'rides'), {
    ownerId: user.uid,
    ownerDisplayName: resolveOwnerDisplayName(user, pseudo),
    title,
    source: 'recorded',
    visibility,
    createdAt: serverTimestamp(),
    startedAt: Timestamp.fromMillis(stats.startedAtMs),
    endedAt: Timestamp.fromMillis(stats.endedAtMs ?? stats.startedAtMs),
    distanceCoveredMeters: stats.distanceCoveredMeters,
    totalTrackDistanceMeters: stats.distanceCoveredMeters,
    elevationGainMeters: stats.elevationGainMeters,
    maxSpeedMetersPerSecond: stats.maxSpeedMetersPerSecond,
    avgSpeedMetersPerSecond: stats.avgSpeedMetersPerSecond,
    trackPoints: toStoredTrackPoints(simplifyForDisplay(line)),
    bounds,
    regionLabel,
    country,
    region,
    downloadCount: 0,
    followCount: 0,
  });
  return docRef.id;
}

/** Moderateur/Admin uniquement (voir firestore.rules) - ne touche que le titre. */
export async function renameRide(rideId: string, title: string): Promise<void> {
  await updateDoc(doc(db, 'rides', rideId), { title });
}

/**
 * Compte les utilisateurs DISTINCTS ayant telecharge/suivi un parcours, pas un
 * journal d'evenements. S'appuie sur la distinction create/update des Security
 * Rules : le doc de presence n'autorise que la creation, jamais l'ecrasement -
 * si l'ecriture echoue, l'utilisateur a deja ete compte, on n'incremente pas
 * une seconde fois. Best-effort : ne bloque jamais l'action reelle (telechargement/suivi).
 */
async function recordPresenceOnce(
  rideId: string,
  subcollection: 'downloadedBy' | 'followedBy',
  uid: string,
): Promise<boolean> {
  try {
    await setDoc(doc(db, 'rides', rideId, subcollection, uid), { at: serverTimestamp() });
    return true;
  } catch {
    return false;
  }
}

export async function recordRideDownload(rideId: string, uid: string): Promise<void> {
  const isFirstTime = await recordPresenceOnce(rideId, 'downloadedBy', uid);
  if (isFirstTime) {
    await updateDoc(doc(db, 'rides', rideId), { downloadCount: increment(1) });
  }
}

export async function recordRideFollow(rideId: string, uid: string): Promise<void> {
  const isFirstTime = await recordPresenceOnce(rideId, 'followedBy', uid);
  if (isFirstTime) {
    await updateDoc(doc(db, 'rides', rideId), { followCount: increment(1) });
  }
}

export function mapRideDoc(docSnapshot: QueryDocumentSnapshot<DocumentData>): Ride {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ownerId: data.ownerId,
    ownerDisplayName: data.ownerDisplayName ?? 'Pilote',
    title: data.title,
    source: data.source,
    visibility: data.visibility,
    createdAtMs: data.createdAt?.toMillis() ?? 0,
    totalTrackDistanceMeters: data.totalTrackDistanceMeters,
    trackPoints: data.trackPoints,
    bounds: data.bounds,
    regionLabel: data.regionLabel ?? null,
    country: data.country ?? null,
    region: data.region ?? null,
    downloadCount: data.downloadCount ?? 0,
    followCount: data.followCount ?? 0,
  } satisfies Ride;
}

export async function listMyRides(uid: string): Promise<Ride[]> {
  const ridesQuery = query(
    collection(db, 'rides'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(ridesQuery);
  return snapshot.docs.map(mapRideDoc);
}

export async function listPublicRides(): Promise<Ride[]> {
  const publicQuery = query(
    collection(db, 'rides'),
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
  );
  const snapshot = await getDocs(publicQuery);
  return snapshot.docs.map(mapRideDoc);
}

export async function deleteRide(rideId: string): Promise<void> {
  await deleteDoc(doc(db, 'rides', rideId));
}

/** Inverse de toStoredTrackPoints - reconstruit un TrackData affichable/suivable depuis un Ride. */
export function toTrackData(ride: Ride): TrackData {
  const positions: GeoJSON.Position[] = ride.trackPoints.map((p) =>
    p.ele !== null ? [p.lng, p.lat, p.ele] : [p.lng, p.lat],
  );
  const hasElevation = hasElevationData(positions);

  return {
    geojson: {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: positions },
    },
    totalDistanceMeters: ride.totalTrackDistanceMeters,
    hasElevation,
    elevationProfile: hasElevation ? buildElevationProfile(positions) : null,
    bounds: ride.bounds,
  };
}
