import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminAuth, getAdminDb } from './_lib/firebaseAdmin.js';

async function resolveUid(req: VercelRequest): Promise<string> {
  const authHeader = req.headers.authorization;
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!idToken) throw new Error('missing_token');

  const decoded = await getAdminAuth().verifyIdToken(idToken);
  return decoded.uid;
}

// Alphabet sans caracteres ambigus (0/O, 1/I/L) - le code est recopie a la main par un ami.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 7;
const MAX_GENERATION_ATTEMPTS = 5;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
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
    console.error('Token invalide sur create-referral-code', err);
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const db = getAdminDb();
    const existing = await db.collection('referralCodes').where('ownerUid', '==', uid).limit(1).get();
    if (!existing.empty) {
      res.status(200).json({ success: true, code: existing.docs[0].id });
      return;
    }

    // create() est atomique (echoue si le doc existe deja) - avec un alphabet de
    // 32 caracteres sur 7 positions une collision est quasi-impossible, mais on
    // reessaie quand meme plutot que de risquer d'ecraser le code d'un autre user.
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const code = generateCode();
      try {
        await db.collection('referralCodes').doc(code).create({
          ownerUid: uid,
          createdAt: FieldValue.serverTimestamp(),
        });
        res.status(200).json({ success: true, code });
        return;
      } catch (err) {
        const alreadyExists = (err as { code?: number })?.code === 6; // ALREADY_EXISTS (grpc status 6)
        if (!alreadyExists) throw err;
      }
    }

    res.status(500).json({ error: 'code_generation_failed' });
  } catch (err) {
    console.error('Erreur create-referral-code', { uid, err });
    res.status(500).json({ error: 'server_error' });
  }
}
