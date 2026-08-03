import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useAdminPromoCodes } from '../hooks/useAdminPromoCodes';
import { ToggleSwitch } from './ToggleSwitch';

interface AdminPromoCodesViewProps {
  user: User;
  onClose: () => void;
}

const CODE_PATTERN = /^[A-Z0-9_-]{1,40}$/;

const CREATE_ERROR_MESSAGES: Record<string, string> = {
  invalid_code_format: 'Le code ne doit contenir que lettres, chiffres, "-" ou "_" (40 caractères max).',
  invalid_max_redemptions: "Le nombre d'utilisations doit être un entier positif.",
  invalid_expires_at: "Date d'expiration invalide.",
  already_exists: 'Ce code existe déjà.',
};

function formatExpiresAt(expiresAt: string | null): string {
  if (!expiresAt) return 'Aucune';
  return new Date(expiresAt).toLocaleDateString('fr-FR');
}

/** Reservee a Admin (voir isAdmin/roleStorage.ts et api/_lib/adminGuard.ts).
 * Un code peut etre active/desactive mais jamais supprime via cette UI - pas
 * de bouton "Supprimer" ici, et l'API n'expose aucun endpoint de suppression
 * (voir api/admin-toggle-promo-code.ts). */
export function AdminPromoCodesView({ user, onClose }: AdminPromoCodesViewProps) {
  const { codes, isLoading, error, refresh } = useAdminPromoCodes(user);
  const [codeInput, setCodeInput] = useState('');
  const [maxRedemptionsInput, setMaxRedemptionsInput] = useState('1');
  const [expiresAtInput, setExpiresAtInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmedCode = codeInput.trim().toUpperCase();
    if (!CODE_PATTERN.test(trimmedCode)) {
      setFormError(CREATE_ERROR_MESSAGES.invalid_code_format);
      return;
    }
    const maxRedemptions = Number.parseInt(maxRedemptionsInput, 10);
    if (!Number.isFinite(maxRedemptions) || maxRedemptions < 1) {
      setFormError(CREATE_ERROR_MESSAGES.invalid_max_redemptions);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/admin-create-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          code: trimmedCode,
          maxRedemptions,
          expiresAt: expiresAtInput ? new Date(expiresAtInput).toISOString() : null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setFormError((body.error && CREATE_ERROR_MESSAGES[body.error]) ?? "Échec de la création du code.");
        return;
      }
      setCodeInput('');
      setMaxRedemptionsInput('1');
      setExpiresAtInput('');
      refresh();
    } catch (err) {
      console.error(err);
      setFormError("Échec de la création du code.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (code: string, nextIsActive: boolean) => {
    setPendingCode(code);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/admin-toggle-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code, isActive: nextIsActive }),
      });
      if (!response.ok) throw new Error('toggle_failed');
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingCode(null);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Gestion des codes promo</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="fuel-log-form">
        <label className="dialog-field">
          Code
          <input
            type="text"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            maxLength={40}
            disabled={isSaving}
            placeholder="ETE2026"
          />
        </label>

        <label className="dialog-field">
          Nombre d'utilisations max
          <input
            type="number"
            min={1}
            value={maxRedemptionsInput}
            onChange={(event) => setMaxRedemptionsInput(event.target.value)}
            disabled={isSaving}
          />
        </label>

        <label className="dialog-field">
          Date d'expiration (optionnelle)
          <input
            type="date"
            value={expiresAtInput}
            onChange={(event) => setExpiresAtInput(event.target.value)}
            disabled={isSaving}
          />
        </label>

        {formError && <p className="dialog-error">{formError}</p>}

        <button type="button" className="button button-primary" onClick={handleAdd} disabled={isSaving || !codeInput.trim()}>
          {isSaving ? 'Création...' : 'Ajouter le code'}
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {!isLoading && codes && codes.length === 0 && <p className="my-rides-hint">Aucun code promo pour l'instant.</p>}

      {codes && codes.length > 0 && (
        <ul className="my-rides-list">
          {codes.map((row) => {
            const isPending = pendingCode === row.code;
            const isExpired = row.expiresAt !== null && new Date(row.expiresAt).getTime() < Date.now();
            return (
              <li key={row.code} className="admin-user-row">
                <div className="admin-user-info">
                  <span className="my-rides-item-title">{row.code}</span>
                  <span className="my-rides-item-meta">
                    {row.usageCount}/{row.maxRedemptions} utilisations · Expiration : {formatExpiresAt(row.expiresAt)}
                    {isExpired && ' (expiré)'}
                  </span>
                </div>
                <ToggleSwitch
                  checked={row.isActive}
                  onChange={(nextIsActive) => handleToggle(row.code, nextIsActive)}
                  leftLabel="Désactivé"
                  rightLabel="Activé"
                  disabled={isPending}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
