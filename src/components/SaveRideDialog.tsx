import { useState } from 'react';
import type { RideVisibility } from '../types';

interface SaveRideDialogProps {
  defaultTitle: string;
  onSave: (title: string, visibility: RideVisibility) => Promise<void>;
  onCancel: () => void;
}

export function SaveRideDialog({ defaultTitle, onSave, onCancel }: SaveRideDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [visibility, setVisibility] = useState<RideVisibility>('private');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmedTitle, visibility);
    } catch {
      setError('Échec de la sauvegarde. Réessaie.');
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Sauvegarder le parcours">
      <div className="dialog">
        <h2>Sauvegarder le parcours</h2>

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

        <fieldset className="dialog-field">
          <legend>Visibilité</legend>
          <div className="dialog-field-options">
            <label>
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
                disabled={isSaving}
              />
              Privé
            </label>
            <label>
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                disabled={isSaving}
              />
              Public
            </label>
          </div>
        </fieldset>

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onCancel} disabled={isSaving}>
            Annuler
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
