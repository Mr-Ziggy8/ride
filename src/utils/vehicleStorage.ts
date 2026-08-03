import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Vehicle } from '../types';

export interface NewVehicle {
  name: string;
}

export async function addVehicle(uid: string, entry: NewVehicle): Promise<string> {
  const docRef = await addDoc(collection(db, 'users', uid, 'vehicles'), {
    name: entry.name,
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
      createdAtMs: data.createdAt?.toMillis() ?? 0,
    };
  });
}

export async function updateVehicle(uid: string, vehicleId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'vehicles', vehicleId), { name });
}

export async function deleteVehicle(uid: string, vehicleId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'vehicles', vehicleId));
}
