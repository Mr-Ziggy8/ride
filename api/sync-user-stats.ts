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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let uid: string;
  try {
    uid = await resolveUid(req);
  } catch (err) {
    console.error('Token invalide sur sync-user-stats', err);
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  try {
    const db = getAdminDb();
    const ridesSnap = await db.collection('rides').where('ownerId', '==', uid).get();

    let totalDistanceMeters = 0;
    const regions = new Set<string>();
    ridesSnap.forEach((doc) => {
      const data = doc.data();
      totalDistanceMeters += data.totalTrackDistanceMeters ?? 0;
      const regionKey = data.region ?? data.regionLabel ?? data.country;
      if (regionKey) regions.add(regionKey);
    });

    await db.collection('userStats').doc(uid).set(
      {
        totalDistanceMeters,
        distinctRegionsCount: regions.size,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    res.status(200).json({ success: true, totalDistanceMeters, distinctRegionsCount: regions.size });
  } catch (err) {
    console.error('Erreur sync-user-stats', { uid, err });
    res.status(500).json({ error: 'server_error' });
  }
}
