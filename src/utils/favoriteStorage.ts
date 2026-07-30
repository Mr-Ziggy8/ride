import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { mapRideDoc } from './rideStorage';
import type { Ride } from '../types';

export async function addFavorite(uid: string, rideId: string): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'favorites', rideId), { favoritedAt: serverTimestamp() });
}

export async function removeFavorite(uid: string, rideId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'favorites', rideId));
}

export async function listFavoriteRideIds(uid: string): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, 'users', uid, 'favorites'));
  return new Set(snapshot.docs.map((favDoc) => favDoc.id));
}

/** Firestore n'a pas de jointure : on lit d'abord les IDs favoris, puis chaque ride correspondant. */
export async function listFavoriteRides(uid: string): Promise<Ride[]> {
  const favSnapshot = await getDocs(collection(db, 'users', uid, 'favorites'));
  const rideDocs = await Promise.all(
    favSnapshot.docs.map((favDoc) => getDoc(doc(db, 'rides', favDoc.id))),
  );
  return rideDocs.filter((rideDoc) => rideDoc.exists()).map(mapRideDoc);
}
