import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useVehicles } from '../hooks/useVehicles';
import { addVehicle, deleteVehicle } from '../utils/vehicleStorage';

interface VehiclesViewProps {
  user: User;
  onClose: () => void;
}

/** Feature premium (garde placee dans App.tsx via canAccessPremium) : garage de
 * vehicules purement informatif, sans impact sur la logique de tracage. */
export function VehiclesView({ user, onClose }: VehiclesViewProps) {
  const { vehicles, isLoading, error, refresh } = useVehicles(user);
  const [nameInput, setNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleAdd = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setFormError('Renseigne un nom de véhicule.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await addVehicle(user.uid, { name: trimmed });
      setNameInput('');
      refresh();
    } catch (err) {
      console.error(err);
      setFormError("Échec de l'enregistrement. Réessaie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    setPendingId(vehicleId);
    try {
      await deleteVehicle(user.uid, vehicleId);
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Mes véhicules</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="fuel-log-form">
        <label className="dialog-field">
          Nom du véhicule
          <input
            type="text"
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            maxLength={80}
            disabled={isSaving}
            placeholder="Yamaha MT-07"
          />
        </label>

        {formError && <p className="dialog-error">{formError}</p>}

        <button type="button" className="button button-primary" onClick={handleAdd} disabled={isSaving || !nameInput.trim()}>
          {isSaving ? 'Enregistrement...' : 'Ajouter le véhicule'}
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {!isLoading && vehicles && vehicles.length === 0 && (
        <p className="my-rides-hint">Aucun véhicule enregistré pour l'instant.</p>
      )}

      {vehicles && vehicles.length > 0 && (
        <ul className="my-rides-list">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id} className="my-rides-item">
              <span>{vehicle.name}</span>
              <button
                type="button"
                className="button button-secondary"
                disabled={pendingId === vehicle.id}
                onClick={() => handleDelete(vehicle.id)}
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
