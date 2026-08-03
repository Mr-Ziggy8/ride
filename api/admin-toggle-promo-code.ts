import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminUid } from './_lib/adminGuard.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';

// Active/desactive un code existant - AUCUNE suppression possible via cet
// endpoint (ni via l'UI admin) : un code ne doit jamais disparaitre, seulement
// etre coupe, pour garder une trace de ce qui a ete distribue/utilise.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let callerUid: string;
  try {
    callerUid = await requireAdminUid(req);
  } catch (err) {
    console.error('Acces refuse sur admin-toggle-promo-code', err);
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  const body = req.body as { code?: unknown; isActive?: unknown } | undefined;
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : null;
  const isActive = typeof body?.isActive === 'boolean' ? body.isActive : null;

  if (!code || isActive === null) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }

  try {
    const codeRef = getAdminDb().collection('promoCodes').doc(code);
    const snapshot = await codeRef.get();
    if (!snapshot.exists) {
      res.status(404).json({ error: 'code_not_found' });
      return;
    }

    await codeRef.update({ isActive });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur admin-toggle-promo-code', { callerUid, code, err });
    res.status(500).json({ error: 'server_error' });
  }
}
