import { useState } from 'react';
import type { Ride } from '../types';

interface RenameRideDialogProps {
  ride: Ride;
  onConfirm: (newTitle: string) => Promise<void>;
  onCancel: () => void;
}

export function RenameRideDialog({ ride, onConfirm, onCancel }: RenameRideDialogProps) {
  const [title, setTitle] = useState(ride.title);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch {
      setError('Échec du renommage. Réessaie.');
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Renommer le parcours">
      <div className="dialog">
        <h2>Renommer ce parcours</h2>

        <label className="dialog-field">
          Titre
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            disabled={isSaving}
            autoFocus
          />
        </label>

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onCancel} disabled={isSaving}>
            Annuler
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleConfirm}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? 'Enregistrement...' : 'Renommer'}
          </button>
        </div>
      </div>
    </div>
  );
}
