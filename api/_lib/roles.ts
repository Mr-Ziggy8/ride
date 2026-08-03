import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from './firebaseAdmin.js';

export type RoleType = 'free' | 'paid' | 'moderator' | 'admin';
type PaidVia = 'stripe' | 'promo_code' | 'referral';

export const ALREADY_AT_LEAST_PAID = new Set<RoleType>(['paid', 'moderator', 'admin']);

/** N'ecrase jamais un role deja egal ou superieur a 'paid' (moderator/admin,
 * ou 'paid' deja accorde) - evite qu'un webhook rejoue par Stripe ou un
 * moderateur qui testerait son propre paiement ne se retrouve retrograde.
 * Partagee entre stripe-webhook et redeem-promo-code, les deux seuls chemins
 * qui accordent 'paid'.
 *
 * Pose aussi paidVia/paidAt, une provenance distincte de grantedVia qui n'est
 * JAMAIS modifiee par admin-set-role (voir ce fichier) - meme si un admin
 * promeut/retrograde ensuite entre paid/moderator/admin, paidVia reste le
 * temoin permanent "cet uid a reellement paye un jour", qui sert a interdire
 * toute retrogradation vers 'free'. */
export async function grantPaidRoleUnlessAlreadyHigher(uid: string, paidVia: PaidVia): Promise<void> {
  const ref = getAdminDb().collection('roles').doc(uid);
  const snapshot = await ref.get();
  const currentType = snapshot.exists ? (snapshot.data()?.type as RoleType | undefined) : undefined;
  if (currentType && ALREADY_AT_LEAST_PAID.has(currentType)) return;

  await ref.set(
    {
      type: 'paid',
      grantedAt: FieldValue.serverTimestamp(),
      grantedVia: paidVia,
      paidVia,
      paidAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
