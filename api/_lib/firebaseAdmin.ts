import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

/** Les fonctions Vercel peuvent reutiliser une instance "chaude" entre deux
 * invocations - initializeApp() plante si on l'appelle deux fois sur le meme
 * process, d'ou la reutilisation de l'app existante via getApps(). */
function getAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var manquante.');
  }

  return initializeApp({ credential: cert(JSON.parse(raw)) });
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
