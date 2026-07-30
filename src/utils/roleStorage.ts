import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { UserRole, UserRoleType } from '../types';

export const FREE_ROLE: UserRole = { type: 'free', grantedAt: null, grantedVia: null };

/** Absence de document roles/{uid} == role 'free' implicite (jamais cree pour
 * un compte gratuit - seule une fonction serveur cree ce doc, a l'upgrade). */
export async function fetchUserRole(uid: string): Promise<UserRole> {
  const snapshot = await getDoc(doc(db, 'roles', uid));
  if (!snapshot.exists()) return FREE_ROLE;

  const data = snapshot.data();
  return {
    type: (data.type as UserRoleType | undefined) ?? 'free',
    grantedAt: data.grantedAt?.toMillis() ?? null,
    grantedVia: data.grantedVia ?? null,
  };
}

export function canAccessPremium(roleType: UserRoleType): boolean {
  return roleType === 'paid' || roleType === 'moderator' || roleType === 'admin';
}

export function canModerate(roleType: UserRoleType): boolean {
  return roleType === 'moderator' || roleType === 'admin';
}
