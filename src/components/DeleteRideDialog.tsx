import { useState } from 'react';
import type { Ride } from '../types';

interface DeleteRideDialogProps {
  ride: Ride;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteRideDialog({ ride, onConfirm, onCancel }: DeleteRideDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = confirmationText.trim() === ride.title;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError('Échec de la suppression. Réessaie.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Supprimer le parcours">
      <div className="dialog">
        <h2>Supprimer ce parcours ?</h2>
        <p className="dialog-warning">
          Cette action est définitive. Pour confirmer, tape le titre exact du parcours :{' '}
          <strong>{ride.title}</strong>
        </p>

        <label className="dialog-field">
          Titre du parcours
          <input
            type="text"
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            disabled={isDeleting}
            autoFocus
          />
        </label>

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onCancel} disabled={isDeleting}>
            Annuler
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleConfirm}
            disabled={isDeleting || !canConfirm}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  );
}
