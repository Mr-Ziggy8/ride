import { useState } from 'react';
import type { Ride } from '../types';

interface UnpublishRideDialogProps {
  ride: Ride;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function UnpublishRideDialog({ ride, onConfirm, onCancel }: UnpublishRideDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError('Échec du retrait. Réessaie.');
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Retirer le parcours de Découverte">
      <div className="dialog">
        <h2>Retirer "{ride.title}" de Découverte ?</h2>

        <p className="dialog-warning">
          Ce parcours repassera en privé et disparaîtra de Découverte. Il reste dans "Mes parcours"
          de son propriétaire, qui pourra le republier.
        </p>

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onCancel} disabled={isSaving}>
            Annuler
          </button>
          <button type="button" className="button button-secondary" onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Retrait...' : 'Retirer de Découverte'}
          </button>
        </div>
      </div>
    </div>
  );
}
