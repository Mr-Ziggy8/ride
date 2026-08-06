import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FuelLogEntry {
  id: string;
  dateMs: number;
  /** Stockage canonique en litres (cf. units.ts) - converti a l'affichage selon fuelUnit. */
  volumeLiters: number;
  priceAmount: number;
  /** Kilometrage du vehicule au moment du plein (pas un delta) - stockage canonique en metres. */
  odometerMeters: number;
  /** Purement informatif (garage multi-vehicules, feature premium). */
  vehicleId: string | null;
  /** Derive a la lecture (cf. attachDistanceSinceLastFill) - jamais stocke en base :
   * l'ecart de kilometrage avec le plein precedent du MEME vehicule. */
  distanceSinceLastFillMeters: number;
}

export interface NewFuelLogEntry {
  dateMs: number;
  volumeLiters: number;
  priceAmount: number;
  odometerMeters: number;
  vehicleId: string | null;
}

export async function addFuelLog(uid: string, entry: NewFuelLogEntry): Promise<string> {
  const docRef = await addDoc(collection(db, 'users', uid, 'fuelLogs'), {
    date: Timestamp.fromMillis(entry.dateMs),
    volumeLiters: entry.volumeLiters,
    priceAmount: entry.priceAmount,
    odometerMeters: entry.odometerMeters,
    vehicleId: entry.vehicleId,
  });
  return docRef.id;
}

export async function updateFuelLog(uid: string, entryId: string, entry: NewFuelLogEntry): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'fuelLogs', entryId), {
    date: Timestamp.fromMillis(entry.dateMs),
    volumeLiters: entry.volumeLiters,
    priceAmount: entry.priceAmount,
    odometerMeters: entry.odometerMeters,
    vehicleId: entry.vehicleId,
  });
}

export async function deleteFuelLog(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'fuelLogs', entryId));
}

/** Le kilometrage saisi par plein est celui du vehicule (pas un delta) : la distance
 * depuis le dernier plein se deduit de l'ecart avec le plein precedent du MEME
 * vehicule (chaque moto a son propre compteur), en parcourant du plus ancien au
 * plus recent. Premier plein d'un vehicule (pas de reference anterieure) -> 0. */
function attachDistanceSinceLastFill(entries: Omit<FuelLogEntry, 'distanceSinceLastFillMeters'>[]): FuelLogEntry[] {
  const chronological = [...entries].sort((a, b) => a.dateMs - b.dateMs);
  const lastOdometerByVehicle = new Map<string, number>();
  const distanceById = new Map<string, number>();

  for (const entry of chronological) {
    const vehicleKey = entry.vehicleId ?? '__none__';
    const previousOdometer = lastOdometerByVehicle.get(vehicleKey);
    distanceById.set(entry.id, previousOdometer === undefined ? 0 : Math.max(0, entry.odometerMeters - previousOdometer));
    lastOdometerByVehicle.set(vehicleKey, entry.odometerMeters);
  }

  return entries.map((entry) => ({ ...entry, distanceSinceLastFillMeters: distanceById.get(entry.id) ?? 0 }));
}

/** Tri anti-chronologique : listFuelLogs(...)[0] est le dernier plein. */
export async function listFuelLogs(uid: string): Promise<FuelLogEntry[]> {
  const logsQuery = query(collection(db, 'users', uid, 'fuelLogs'), orderBy('date', 'desc'));
  const snapshot = await getDocs(logsQuery);
  const rawEntries = snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      dateMs: data.date?.toMillis() ?? 0,
      volumeLiters: data.volumeLiters,
      priceAmount: data.priceAmount ?? 0,
      odometerMeters: data.odometerMeters ?? 0,
      vehicleId: data.vehicleId ?? null,
    };
  });
  return attachDistanceSinceLastFill(rawEntries);
}
