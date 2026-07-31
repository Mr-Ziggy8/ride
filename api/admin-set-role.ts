import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAdminUid } from './_lib/adminGuard.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';

const VALID_ROLES = new Set(['free', 'paid', 'moderator', 'admin']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let callerUid: string;
  try {
    callerUid = await requireAdminUid(req);
  } catch (err) {
    console.error('Acces refuse sur admin-set-role', err);
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const body = req.body as { targetUid?: unknown; newType?: unknown } | undefined;
  const targetUid = typeof body?.targetUid === 'string' ? body.targetUid : null;
  const newType = typeof body?.newType === 'string' ? body.newType : null;

  if (!targetUid || !newType || !VALID_ROLES.has(newType)) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  // Un admin qui se retrograderait lui-meme par erreur n'aurait plus aucun
  // moyen de revenir sur cet outil (il faudrait rouvrir la console Firebase
  // a la main) - on bloque ce cas precis plutot que de compter sur la prudence.
  if (targetUid === callerUid && newType !== 'admin') {
    res.status(400).json({ error: 'cannot_demote_self' });
    return;
  }

  try {
    const roleRef = getAdminDb().collection('roles').doc(targetUid);
    const snapshot = await roleRef.get();
    const paidVia = snapshot.exists ? (snapshot.data()?.paidVia as string | undefined) : undefined;

    // paidVia (voir api/_lib/roles.ts) temoigne d'un paiement/redemption reel,
    // jamais efface par ce endpoint - impossible de retrograder vers 'free'
    // un utilisateur qui a reellement paye, quel que soit son role actuel.
    if (newType === 'free' && paidVia) {
      res.status(409).json({ error: 'cannot_downgrade_paid' });
      return;
    }

    await roleRef.set(
      { type: newType, grantedAt: FieldValue.serverTimestamp(), grantedVia: 'admin_manual' },
      { merge: true },
    );

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur admin-set-role', { callerUid, targetUid, newType, err });
    res.status(500).json({ error: 'server_error' });
  }
}
