import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Vehicle } from '../types';

export interface NewVehicle {
  brand: string;
  model: string;
  year: number | null;
  purchaseOdometerMeters: number | null;
  color: string | null;
}

function displayName(entry: NewVehicle): string {
  return [entry.brand, entry.model].filter((part) => part.trim().length > 0).join(' ');
}

export async function addVehicle(uid: string, entry: NewVehicle): Promise<string> {
  const docRef = await addDoc(collection(db, 'users', uid, 'vehicles'), {
    name: displayName(entry),
    brand: entry.brand,
    model: entry.model,
    year: entry.year,
    purchaseOdometerMeters: entry.purchaseOdometerMeters,
    color: entry.color,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function listVehicles(uid: string): Promise<Vehicle[]> {
  const vehiclesQuery = query(collection(db, 'users', uid, 'vehicles'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(vehiclesQuery);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      name: data.name,
      brand: data.brand ?? null,
      model: data.model ?? null,
      year: data.year ?? null,
      purchaseOdometerMeters: data.purchaseOdometerMeters ?? null,
      color: data.color ?? null,
      createdAtMs: data.createdAt?.toMillis() ?? 0,
    };
  });
}

export async function updateVehicle(uid: string, vehicleId: string, entry: NewVehicle): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'vehicles', vehicleId), {
    name: displayName(entry),
    brand: entry.brand,
    model: entry.model,
    year: entry.year,
    purchaseOdometerMeters: entry.purchaseOdometerMeters,
    color: entry.color,
  });
}

export async function deleteVehicle(uid: string, vehicleId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'vehicles', vehicleId));
}
