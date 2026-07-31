import type { VercelRequest } from '@vercel/node';
import { getAdminAuth, getAdminDb } from './firebaseAdmin.js';

/** Verifie le token Firebase du caller ET que son roles/{uid} vaut 'admin' -
 * la gestion des roles reste reservee a Admin (pas Moderator), voir
 * premium_platform_specs.json backlog_deferred.fine_grained_admin_vs_moderator. */
export async function requireAdminUid(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!idToken) throw new Error('missing_token');

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  const roleSnap = await getAdminDb().collection('roles').doc(decoded.uid).get();
  const roleType = roleSnap.exists ? roleSnap.data()?.type : 'free';
  if (roleType !== 'admin') throw new Error('not_admin');

  return decoded.uid;
}
