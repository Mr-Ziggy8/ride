import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminUid } from './_lib/adminGuard.js';
import { getAdminAuth, getAdminDb } from './_lib/firebaseAdmin.js';

export interface AdminUserRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  roleType: string;
  paidVia: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    await requireAdminUid(req);
  } catch (err) {
    console.error('Acces refuse sur admin-list-users', err);
    res.status(403).json({ error: 'forbidden' });
    return;
  }

  try {
    const db = getAdminDb();
    // Comptes Firebase Auth (source de verite pour email/displayName) croises
    // avec roles/* (absent == 'free' implicite, comme partout ailleurs dans
    // l'app) - un seul aller-retour de chaque cote, pas un get() par uid.
    const [authUsers, rolesSnapshot] = await Promise.all([
      getAdminAuth().listUsers(1000),
      db.collection('roles').get(),
    ]);

    const rolesByUid = new Map<string, { type: string; paidVia: string | null }>();
    rolesSnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      rolesByUid.set(docSnapshot.id, {
        type: (data.type as string | undefined) ?? 'free',
        paidVia: (data.paidVia as string | undefined) ?? null,
      });
    });

    const users: AdminUserRow[] = authUsers.users.map((record) => {
      const role = rolesByUid.get(record.uid);
      return {
        uid: record.uid,
        email: record.email ?? null,
        displayName: record.displayName ?? null,
        roleType: role?.type ?? 'free',
        paidVia: role?.paidVia ?? null,
      };
    });

    res.status(200).json({ users });
  } catch (err) {
    console.error('Erreur admin-list-users', err);
    res.status(500).json({ error: 'server_error' });
  }
}
