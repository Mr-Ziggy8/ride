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
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FeedbackEntry {
  id: string;
  uid: string;
  message: string;
  createdAtMs: number;
  score: number;
}

/** Un commentaire reste "actif" tant qu'un moderateur ne l'a pas supprime (voir
 * FeedbackAdminView) - au-dela, on bloque l'envoi cote UI pour eviter qu'un
 * seul utilisateur ne noie la file de moderation. */
export const MAX_ACTIVE_FEEDBACK_PER_USER = 10;

export async function submitFeedback(uid: string, message: string): Promise<void> {
  await addDoc(collection(db, 'feedback'), {
    uid,
    message,
    createdAt: serverTimestamp(),
    score: 0,
  });
}

export async function countActiveFeedback(uid: string): Promise<number> {
  const activeQuery = query(collection(db, 'feedback'), where('uid', '==', uid));
  const snapshot = await getDocs(activeQuery);
  return snapshot.size;
}

/** Tri par score decroissant - un commentaire vote +1 par des moderateurs
 * remonte dans la liste. Pas de tri secondaire (evite un index composite pour
 * un simple depart egalite). */
export async function listFeedback(): Promise<FeedbackEntry[]> {
  const feedbackQuery = query(collection(db, 'feedback'), orderBy('score', 'desc'));
  const snapshot = await getDocs(feedbackQuery);
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      uid: data.uid,
      message: data.message,
      createdAtMs: data.createdAt?.toMillis() ?? 0,
      score: data.score ?? 0,
    };
  });
}

/** Meme mecanisme que rides/{rideId}/downloadedBy : le doc de vote n'autorise
 * que la creation (jamais l'ecrasement), donc un second vote du meme
 * moderateur echoue silencieusement au lieu de recompter. */
async function tryRecordVoteOnce(entryId: string, uid: string, direction: 'up' | 'down'): Promise<boolean> {
  try {
    await setDoc(doc(db, 'feedback', entryId, 'votes', uid), { direction, at: serverTimestamp() });
    return true;
  } catch {
    return false;
  }
}

/** Renvoie true si le vote a bien ete compte (premiere fois pour ce moderateur). */
export async function voteFeedback(entryId: string, uid: string, direction: 'up' | 'down'): Promise<boolean> {
  const isFirstTime = await tryRecordVoteOnce(entryId, uid, direction);
  if (isFirstTime) {
    await updateDoc(doc(db, 'feedback', entryId), { score: increment(direction === 'up' ? 1 : -1) });
  }
  return isFirstTime;
}

export async function deleteFeedback(entryId: string): Promise<void> {
  await deleteDoc(doc(db, 'feedback', entryId));
}
