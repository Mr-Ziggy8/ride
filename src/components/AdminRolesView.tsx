import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useAdminUsers } from '../hooks/useAdminUsers';

interface AdminRolesViewProps {
  user: User;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
];

/** Reservee a Admin (voir isAdmin/roleStorage.ts et api/_lib/adminGuard.ts).
 * Retrograder vers Free est bloque cote serveur pour tout uid ayant deja
 * reellement paye (paidVia) - l'option reste visible mais desactivee ici pour
 * ne pas laisser croire que le clic fonctionnerait. */
export function AdminRolesView({ user, onClose }: AdminRolesViewProps) {
  const { users, isLoading, error, refresh } = useAdminUsers(user);
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ uid: string; message: string } | null>(null);

  const handleChangeRole = async (targetUid: string, newType: string) => {
    setPendingUid(targetUid);
    setRowError(null);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/admin-set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ targetUid, newType }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        const message =
          body.error === 'cannot_downgrade_paid'
            ? 'Impossible : cet utilisateur a réellement payé/utilisé un code, on ne peut pas le repasser Free.'
            : body.error === 'cannot_demote_self'
              ? 'Impossible de te retirer ton propre rôle Admin.'
              : 'Échec de la mise à jour.';
        setRowError({ uid: targetUid, message });
        return;
      }
      refresh();
    } catch (err) {
      console.error(err);
      setRowError({ uid: targetUid, message: 'Échec de la mise à jour.' });
    } finally {
      setPendingUid(null);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Gestion des rôles</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {!isLoading && users && users.length === 0 && <p className="my-rides-hint">Aucun utilisateur.</p>}

      {users && users.length > 0 && (
        <ul className="my-rides-list">
          {users.map((row) => {
            const isPending = pendingUid === row.uid;
            return (
              <li key={row.uid} className="admin-user-row">
                <div className="admin-user-info">
                  <span className="my-rides-item-title">
                    {row.displayName ?? row.email ?? row.uid}
                    {row.uid === user.uid && ' (toi)'}
                  </span>
                  <span className="my-rides-item-meta">
                    {row.email ?? row.uid}
                    {row.paidVia && ` · payé via ${row.paidVia}`}
                  </span>
                  {rowError?.uid === row.uid && <p className="dialog-error">{rowError.message}</p>}
                </div>
                <select
                  className="role-select"
                  value={row.roleType}
                  disabled={isPending}
                  onChange={(event) => handleChangeRole(row.uid, event.target.value)}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={option.value === 'free' && Boolean(row.paidVia)}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
