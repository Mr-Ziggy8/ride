import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from './_lib/firebaseAdmin.js';

const CODE_PATTERN = /^[A-Z0-9_-]{1,40}$/;
const ALREADY_AT_LEAST_PAID = new Set(['paid', 'moderator', 'admin']);

async function resolveUid(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!idToken) throw new Error('missing_token');

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return decoded.uid;
}

/** Normalise en majuscules (insensible a la casse cote utilisateur) et
 * restreint aux caracteres surs comme ID de document Firestore - un code
 * contenant "/" serait interprete comme un chemin multi-segments. */
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
    console.error('Token invalide sur redeem-promo-code', err);
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const code = normalizeCode((req.body as { code?: unknown } | undefined)?.code);
  if (!code) {
    res.status(400).json({ error: 'invalid_code_format' });
    return;
  }

  try {
    const db = getAdminDb();
    const codeRef = db.collection('promoCodes').doc(code);
    const roleRef = db.collection('roles').doc(uid);

    // Transaction : cap/deja-utilise-par-cet-utilisateur + role premium sont
    // verifies ET ecrits en une seule operation atomique. Sans ca, deux
    // redemptions simultanees pourraient toutes les deux passer le check de
    // cap avant qu'aucune n'ait ecrit - le code serait accorde a plus
    // d'utilisateurs que sa limite (maxRedemptions).
    const outcome = await db.runTransaction(async (transaction) => {
      const codeSnap = await transaction.get(codeRef);
      if (!codeSnap.exists) return 'not_found' as const;

      const codeData = codeSnap.data();
      const redeemedByUids: string[] = codeData?.redeemedByUids ?? [];
      const maxRedemptions: number = codeData?.maxRedemptions ?? 1;

      if (redeemedByUids.includes(uid)) return 'already_redeemed' as const;
      if (redeemedByUids.length >= maxRedemptions) return 'cap_reached' as const;

      const roleSnap = await transaction.get(roleRef);
      const currentType = roleSnap.exists ? (roleSnap.data()?.type as string | undefined) : undefined;

      transaction.update(codeRef, { redeemedByUids: FieldValue.arrayUnion(uid) });

      // Meme regle de non-retrogradation que grantPaidRoleUnlessAlreadyHigher
      // (api/_lib/roles.ts) - dupliquee ici plutot que reutilisee car elle
      // doit s'executer DANS cette transaction (Firestore interdit de melanger
      // une transaction externe avec des lectures/ecritures independantes).
      if (!currentType || !ALREADY_AT_LEAST_PAID.has(currentType)) {
        transaction.set(roleRef, {
          type: 'paid',
          grantedAt: FieldValue.serverTimestamp(),
          grantedVia: 'promo_code',
        });
      }

      return 'ok' as const;
    });

    if (outcome === 'not_found') {
      res.status(404).json({ error: 'code_not_found' });
      return;
    }
    if (outcome === 'already_redeemed') {
      res.status(409).json({ error: 'already_redeemed' });
      return;
    }
    if (outcome === 'cap_reached') {
      res.status(409).json({ error: 'cap_reached' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur redemption code promo', { uid, code, err });
    res.status(500).json({ error: 'server_error' });
  }
}
