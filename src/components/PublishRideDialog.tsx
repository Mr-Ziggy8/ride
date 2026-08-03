import { useState } from 'react';
import type { Ride } from '../types';

interface PublishRideDialogProps {
  ride: Ride;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function PublishRideDialog({ ride, onConfirm, onCancel }: PublishRideDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError('Échec de la publication. Réessaie.');
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Rendre le parcours public">
      <div className="dialog">
        <h2>Rendre "{ride.title}" public ?</h2>

        <p className="dialog-warning">
          Cette action est irréversible. Une fois public, ce parcours ne pourra plus être supprimé
          que par un modérateur ou un administrateur.
        </p>

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onCancel} disabled={isSaving}>
            Annuler
          </button>
          <button type="button" className="button button-primary" onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Publication...' : 'Rendre publique'}
          </button>
        </div>
      </div>
    </div>
  );
}
