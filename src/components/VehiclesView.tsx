import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useVehicles } from '../hooks/useVehicles';
import { addVehicle, deleteVehicle, updateVehicle } from '../utils/vehicleStorage';
import { distanceUnitLabel, formatDistance, toMetersFromDistanceValue } from '../utils/units';
import { VehicleBrandModelFields } from './VehicleBrandModelFields';
import { emptyVehicleBrandModelValue, resolveVehicleBrandModel } from '../utils/vehicleBrandModel';
import { EditVehicleDialog } from './EditVehicleDialog';
import type { UnitSystem, Vehicle } from '../types';

interface VehiclesViewProps {
  user: User;
  unitSystem: UnitSystem;
  onClose: () => void;
}

/** Feature premium (garde placee dans App.tsx via canAccessPremium) : garage de
 * vehicules purement informatif, sans impact sur la logique de tracage. */
export function VehiclesView({ user, unitSystem, onClose }: VehiclesViewProps) {
  const { vehicles, isLoading, error, refresh } = useVehicles(user);
  const [brandModel, setBrandModel] = useState(emptyVehicleBrandModelValue);
  const [yearInput, setYearInput] = useState('');
  const [odometerInput, setOdometerInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<Vehicle | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    const { brand, model } = resolveVehicleBrandModel(brandModel);
    if (!brand) {
      setFormError('Renseigne la marque du véhicule.');
      return;
    }
    if (!model) {
      setFormError('Renseigne le modèle du véhicule.');
      return;
    }
    const year = Number(yearInput);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      setFormError('Renseigne une année valide.');
      return;
    }
    const odometer = Number(odometerInput.replace(',', '.'));
    if (!Number.isFinite(odometer) || odometer < 0) {
      setFormError("Renseigne un kilométrage d'achat valide.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await addVehicle(user.uid, {
        brand,
        model,
        year,
        purchaseOdometerMeters: toMetersFromDistanceValue(odometer, unitSystem),
        color: colorInput.trim() || null,
      });
      setBrandModel(emptyVehicleBrandModelValue());
      setYearInput('');
      setOdometerInput('');
      setColorInput('');
      refresh();
    } catch (err) {
      console.error(err);
      setFormError("Échec de l'enregistrement. Réessaie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmEdit = async (values: Parameters<typeof updateVehicle>[2]) => {
    if (!pendingEdit) return;
    await updateVehicle(user.uid, pendingEdit.id, values);
    setPendingEdit(null);
    refresh();
  };

  const handleDelete = async (vehicleId: string) => {
    setPendingDeleteId(vehicleId);
    try {
      await deleteVehicle(user.uid, vehicleId);
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingDeleteId(null);
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
        <VehicleBrandModelFields value={brandModel} onChange={setBrandModel} disabled={isSaving} />

        <label className="dialog-field">
          Année
          <input
            type="number"
            min={1900}
            max={new Date().getFullYear() + 1}
            step={1}
            inputMode="numeric"
            value={yearInput}
            onChange={(event) => setYearInput(event.target.value)}
            disabled={isSaving}
          />
        </label>

        <label className="dialog-field">
          Kilométrage à l'achat ({distanceUnitLabel(unitSystem)})
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            value={odometerInput}
            onChange={(event) => setOdometerInput(event.target.value)}
            disabled={isSaving}
          />
        </label>

        <label className="dialog-field">
          Couleur (optionnel)
          <input
            type="text"
            value={colorInput}
            onChange={(event) => setColorInput(event.target.value)}
            maxLength={40}
            disabled={isSaving}
          />
        </label>

        {formError && <p className="dialog-error">{formError}</p>}

        <button type="button" className="button button-primary" onClick={handleAdd} disabled={isSaving}>
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
              <div className="my-rides-item-info">
                <span className="my-rides-item-title">{vehicle.name}</span>
                <span className="my-rides-item-meta">
                  {[
                    vehicle.year != null ? String(vehicle.year) : null,
                    vehicle.purchaseOdometerMeters != null
                      ? `${formatDistance(vehicle.purchaseOdometerMeters, unitSystem)} à l'achat`
                      : null,
                    vehicle.color,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
              <div className="my-rides-item-actions">
                <button type="button" className="button button-ghost" onClick={() => setPendingEdit(vehicle)}>
                  Modifier
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={pendingDeleteId === vehicle.id}
                  onClick={() => handleDelete(vehicle.id)}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingEdit && (
        <EditVehicleDialog
          vehicle={pendingEdit}
          unitSystem={unitSystem}
          onConfirm={handleConfirmEdit}
          onCancel={() => setPendingEdit(null)}
        />
      )}
    </main>
  );
}
