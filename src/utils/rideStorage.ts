import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { reverseGeocodeRegion } from './geocoding';
import { buildElevationProfile, hasElevationData } from './gpxParser';
import { simplifyForDisplay } from './trackMath';
import type { Ride, RideVisibility, StoredTrackPoint, TrackData } from '../types';

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
): Promise<string> {
  const centerLng = (track.bounds[0] + track.bounds[2]) / 2;
  const centerLat = (track.bounds[1] + track.bounds[3]) / 2;
  const regionLabel = await reverseGeocodeRegion(centerLat, centerLng);

  const docRef = await addDoc(collection(db, 'rides'), {
    ownerId: user.uid,
    ownerDisplayName: user.displayName ?? 'Pilote',
    title,
    source: 'uploaded',
    visibility,
    createdAt: serverTimestamp(),
    totalTrackDistanceMeters: track.totalDistanceMeters,
    trackPoints: toStoredTrackPoints(simplifyForDisplay(track.geojson)),
    bounds: track.bounds,
    regionLabel,
  });
  return docRef.id;
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
