import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type MaintenanceType = 'tires' | 'oil' | 'filters' | 'chain';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  tires: 'Train de pneus',
  oil: 'Huile moteur',
  filters: 'Filtres',
  chain: 'Graissage chaîne',
};

export const MAINTENANCE_TYPES: MaintenanceType[] = ['tires', 'oil', 'filters', 'chain'];

export interface MaintenanceLogEntry {
  id: string;
  dateMs: number;
  type: MaintenanceType;
  /** Kilometrage du vehicule au moment de l'entretien - stockage canonique en metres. */
  odometerMeters: number;
  /** Purement informatif (garage multi-vehicules, feature premium). */
  vehicleId: string | null;
}

export interface NewMaintenanceLogEntry {
  dateMs: number;
  type: MaintenanceType;
  odometerMeters: number;
  vehicleId: string | null;
}

export async function addMaintenanceLog(uid: string, entry: NewMaintenanceLogEntry): Promise<string> {
  const docRef = await addDoc(collection(db, 'users', uid, 'maintenanceLogs'), {
    date: Timestamp.fromMillis(entry.dateMs),
    type: entry.type,
    odometerMeters: entry.odometerMeters,
    vehicleId: entry.vehicleId,
  });
  return docRef.id;
}

/** Tri anti-chronologique, comme listFuelLogs. */
export async function listMaintenanceLogs(uid: string): Promise<MaintenanceLogEntry[]> {
  const logsQuery = query(collection(db, 'users', uid, 'maintenanceLogs'), orderBy('date', 'desc'));
  const snapshot = await getDocs(logsQuery);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      dateMs: data.date?.toMillis() ?? 0,
      type: data.type,
      odometerMeters: data.odometerMeters ?? 0,
      vehicleId: data.vehicleId ?? null,
    };
  });
}

export async function updateMaintenanceLog(uid: string, entryId: string, entry: NewMaintenanceLogEntry): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'maintenanceLogs', entryId), {
    date: Timestamp.fromMillis(entry.dateMs),
    type: entry.type,
    odometerMeters: entry.odometerMeters,
    vehicleId: entry.vehicleId,
  });
}

export async function deleteMaintenanceLog(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'maintenanceLogs', entryId));
}
