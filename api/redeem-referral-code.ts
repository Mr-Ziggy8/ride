import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from './_lib/firebaseAdmin.js';
import { ALREADY_AT_LEAST_PAID, type RoleType } from './_lib/roles.js';

const CODE_PATTERN = /^[A-Z0-9_-]{1,40}$/;
const ELIGIBILITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

async function resolveUid(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!idToken) throw new Error('missing_token');

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return decoded.uid;
}

function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toUpperCase();
  return CODE_PATTERN.test(trimmed) ? trimmed : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let uid: string;
  try {
    uid = await resolveUid(req);
  } catch (err) {
    console.error('Token invalide sur redeem-referral-code', err);
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const code = normalizeCode((req.body as { code?: unknown } | undefined)?.code);
  if (!code) {
    res.status(400).json({ error: 'invalid_code_format' });
    return;
  }

  // Reserve aux comptes fraichement crees - empeche un utilisateur de se
  // parrainer lui-meme via un second compte pour cumuler XP/badges/premium.
  // Verification via l'Auth Admin SDK, en dehors de la transaction Firestore
  // (creationTime vit sur le compte Auth, pas sur un document Firestore).
  try {
    const authRecord = await getAdminAuth().getUser(uid);
    const createdAtMs = new Date(authRecord.metadata.creationTime).getTime();
    if (Date.now() - createdAtMs > ELIGIBILITY_WINDOW_MS) {
      res.status(403).json({ error: 'account_too_old' });
      return;
    }
  } catch (err) {
    console.error('Erreur verification anciennete compte sur redeem-referral-code', { uid, err });
    res.status(500).json({ error: 'server_error' });
    return;
  }

  try {
    const db = getAdminDb();
    const codeRef = db.collection('referralCodes').doc(code);
    const friendStatsRef = db.collection('userStats').doc(uid);

    const outcome = await db.runTransaction(async (transaction) => {
      const codeSnap = await transaction.get(codeRef);
      if (!codeSnap.exists) return 'not_found' as const;

      const ownerUid: string = codeSnap.data()!.ownerUid;
      if (ownerUid === uid) return 'self_referral' as const;

      const redemptionRef = codeRef.collection('redemptions').doc(uid);
      const redemptionSnap = await transaction.get(redemptionRef);
      if (redemptionSnap.exists) return 'already_redeemed' as const;

      const friendStatsSnap = await transaction.get(friendStatsRef);
      if (friendStatsSnap.exists && friendStatsSnap.data()?.referredByUid) {
        return 'already_referred' as const;
      }

      const roleRef = db.collection('roles').doc(uid);
      const roleSnap = await transaction.get(roleRef);
      const currentType = roleSnap.exists ? (roleSnap.data()?.type as RoleType | undefined) : undefined;

      transaction.create(redemptionRef, { at: FieldValue.serverTimestamp() });

      const ownerStatsRef = db.collection('userStats').doc(ownerUid);
      transaction.set(
        ownerStatsRef,
        { referralCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      transaction.set(
        friendStatsRef,
        { referredByUid: ownerUid, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

      // Meme logique que grantPaidRoleUnlessAlreadyHigher (api/_lib/roles.ts),
      // dupliquee ici car elle doit s'executer DANS cette transaction (voir la
      // meme remarque dans redeem-promo-code.ts).
      if (!currentType || !ALREADY_AT_LEAST_PAID.has(currentType)) {
        transaction.set(
          roleRef,
          {
            type: 'paid',
            grantedAt: FieldValue.serverTimestamp(),
            grantedVia: 'referral',
            paidVia: 'referral',
            paidAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      return 'ok' as const;
    });

    if (outcome === 'not_found') {
      res.status(404).json({ error: 'code_not_found' });
      return;
    }
    if (outcome === 'self_referral') {
      res.status(400).json({ error: 'self_referral' });
      return;
    }
    if (outcome === 'already_redeemed') {
      res.status(409).json({ error: 'already_redeemed' });
      return;
    }
    if (outcome === 'already_referred') {
      res.status(409).json({ error: 'already_referred' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur redemption code de parrainage', { uid, code, err });
    res.status(500).json({ error: 'server_error' });
  }
}
