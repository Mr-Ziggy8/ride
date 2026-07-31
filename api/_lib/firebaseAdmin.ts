import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedApp: App | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;

/** Initialisation paresseuse : si on jetait cette erreur au chargement du
 * module (top-level), un FIREBASE_SERVICE_ACCOUNT absent/invalide ferait
 * planter la fonction entiere avant meme le try/catch du handler (meme
 * symptome que le crash ERR_REQUIRE_ESM deja rencontre) - en repoussant
 * l'appel dans getAdminAuth()/getAdminDb(), le handler peut l'attraper et
 * repondre proprement en JSON au lieu d'un crash plateforme opaque. */
function getAdminApp(): App {
  if (cachedApp) return cachedApp;

  const existing = getApps();
  if (existing.length > 0) {
    cachedApp = existing[0];
    return cachedApp;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env var manquante.');
  }

  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT contient un JSON invalide.');
  }

  cachedApp = initializeApp({ credential: cert(serviceAccount) });
  return cachedApp;
}

export function getAdminAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getAdminApp());
  return cachedAuth;
}

export function getAdminDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}
