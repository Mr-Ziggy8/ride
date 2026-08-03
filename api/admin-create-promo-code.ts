import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { requireAdminUid } from './_lib/adminGuard.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';

const CODE_PATTERN = /^[A-Z0-9_-]{1,40}$/;

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

  let callerUid: string;
  try {
    callerUid = await requireAdminUid(req);
  } catch (err) {
    console.error('Acces refuse sur admin-create-promo-code', err);
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const body = req.body as { code?: unknown; maxRedemptions?: unknown; expiresAt?: unknown } | undefined;
  const code = normalizeCode(body?.code);
  if (!code) {
    res.status(400).json({ error: 'invalid_code_format' });
    return;
  }

  const maxRedemptions = typeof body?.maxRedemptions === 'number' ? Math.trunc(body.maxRedemptions) : 1;
  if (!Number.isFinite(maxRedemptions) || maxRedemptions < 1) {
    res.status(400).json({ error: 'invalid_max_redemptions' });
    return;
  }

  // Optionnelle : absence ou null == code sans date d'expiration.
  let expiresAt: Timestamp | null = null;
  if (body?.expiresAt !== undefined && body?.expiresAt !== null) {
    if (typeof body.expiresAt !== 'string') {
      res.status(400).json({ error: 'invalid_expires_at' });
      return;
    }
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ error: 'invalid_expires_at' });
      return;
    }
    expiresAt = Timestamp.fromDate(parsed);
  }

  try {
    // create() est atomique (echoue si le doc existe deja) - evite qu'un admin
    // ecrase par erreur un code existant (et son historique de redemptions).
    await getAdminDb().collection('promoCodes').doc(code).create({
      redeemedByUids: [],
      maxRedemptions,
      isActive: true,
      expiresAt,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: callerUid,
    });

    res.status(200).json({ success: true, code });
  } catch (err) {
    const alreadyExists = (err as { code?: number })?.code === 6; // ALREADY_EXISTS (grpc status 6)
    if (alreadyExists) {
      res.status(409).json({ error: 'already_exists' });
      return;
    }
    console.error('Erreur admin-create-promo-code', { callerUid, code, err });
    res.status(500).json({ error: 'server_error' });
  }
}
