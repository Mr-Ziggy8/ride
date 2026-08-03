import { addDoc, collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FuelLogEntry {
  id: string;
  dateMs: number;
  /** Stockage canonique en litres (cf. units.ts) - converti a l'affichage selon fuelUnit. */
  volumeLiters: number;
  distanceSinceLastFillMeters: number;
  isDistanceManuallyAdjusted: boolean;
  /** Purement informatif (garage multi-vehicules, feature premium). */
  vehicleId: string | null;
}

export interface NewFuelLogEntry {
  dateMs: number;
  volumeLiters: number;
  distanceSinceLastFillMeters: number;
  isDistanceManuallyAdjusted: boolean;
  vehicleId: string | null;
}

export async function addFuelLog(uid: string, entry: NewFuelLogEntry): Promise<string> {
  const docRef = await addDoc(collection(db, 'users', uid, 'fuelLogs'), {
    date: Timestamp.fromMillis(entry.dateMs),
    volumeLiters: entry.volumeLiters,
    distanceSinceLastFillMeters: entry.distanceSinceLastFillMeters,
    isDistanceManuallyAdjusted: entry.isDistanceManuallyAdjusted,
    vehicleId: entry.vehicleId,
  });
  return docRef.id;
}

/** Tri anti-chronologique : listFuelLogs(...)[0] est le dernier plein, utilise
 * comme point de depart pour le calcul auto de distance du plein suivant. */
export async function listFuelLogs(uid: string): Promise<FuelLogEntry[]> {
  const logsQuery = query(collection(db, 'users', uid, 'fuelLogs'), orderBy('date', 'desc'));
  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      dateMs: data.date?.toMillis() ?? 0,
      volumeLiters: data.volumeLiters,
      distanceSinceLastFillMeters: data.distanceSinceLastFillMeters,
      isDistanceManuallyAdjusted: data.isDistanceManuallyAdjusted ?? false,
      vehicleId: data.vehicleId ?? null,
    };
  });
}
