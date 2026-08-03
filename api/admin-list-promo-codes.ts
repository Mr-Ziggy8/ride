import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminUid } from './_lib/adminGuard.js';
import { getAdminDb } from './_lib/firebaseAdmin.js';

export interface AdminPromoCodeRow {
  code: string;
  usageCount: number;
  maxRedemptions: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string | null;
  createdBy: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    await requireAdminUid(req);
  } catch (err) {
    console.error('Acces refuse sur admin-list-promo-codes', err);
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  try {
    const snapshot = await getAdminDb().collection('promoCodes').get();
    const codes: AdminPromoCodeRow[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const redeemedByUids: string[] = data.redeemedByUids ?? [];
      return {
        code: doc.id,
        usageCount: redeemedByUids.length,
        maxRedemptions: (data.maxRedemptions as number | undefined) ?? 1,
        isActive: (data.isActive as boolean | undefined) ?? true,
        expiresAt: data.expiresAt ? data.expiresAt.toDate().toISOString() : null,
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        createdBy: (data.createdBy as string | undefined) ?? null,
      };
    });

    // Plus recent en premier ; les codes sans createdAt (crees a la main avant
    // l'ajout de ce champ) sont relegues en fin de liste plutot qu'en tete.
    codes.sort((a, b) => {
      if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
      if (a.createdAt) return -1;
      if (b.createdAt) return 1;
      return a.code.localeCompare(b.code);
    });

    res.status(200).json({ codes });
  } catch (err) {
    console.error('Erreur admin-list-promo-codes', err);
    res.status(500).json({ error: 'server_error' });
  }
}
