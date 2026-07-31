import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin.js';

type GrantedVia = 'stripe' | 'promo_code' | 'admin_manual';

const ALREADY_AT_LEAST_PAID = new Set(['paid', 'moderator', 'admin']);

/** N'ecrase jamais un role deja egal ou superieur a 'paid' (moderator/admin,
 * ou 'paid' deja accorde) - evite qu'un webhook rejoue par Stripe ou un
 * moderateur qui testerait son propre paiement ne se retrouve retrograde.
 * Partagee entre stripe-webhook et redeem-promo-code, les deux seuls chemins
 * qui accordent 'paid'. */
export async function grantPaidRoleUnlessAlreadyHigher(uid: string, grantedVia: GrantedVia): Promise<void> {
  const ref = getAdminDb().collection('roles').doc(uid);
  const snapshot = await ref.get();
  const currentType = snapshot.exists ? (snapshot.data()?.type as string | undefined) : undefined;
  if (currentType && ALREADY_AT_LEAST_PAID.has(currentType)) return;

  await ref.set({
    type: 'paid',
    grantedAt: FieldValue.serverTimestamp(),
    grantedVia,
  });
}
