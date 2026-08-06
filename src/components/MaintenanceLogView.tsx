import { useState } from 'react';
import type { User } from 'firebase/auth';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useVehicles } from '../hooks/useVehicles';
import {
  addMaintenanceLog,
  deleteMaintenanceLog,
  updateMaintenanceLog,
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPES,
  type MaintenanceLogEntry,
  type MaintenanceType,
} from '../utils/maintenanceLogStorage';
import { todayInputValue } from '../utils/dateInput';
import { distanceUnitLabel, formatDistance, toMetersFromDistanceValue } from '../utils/units';
import { EditMaintenanceLogDialog } from './EditMaintenanceLogDialog';
import type { UnitSystem } from '../types';

interface MaintenanceLogViewProps {
  user: User;
  unitSystem: UnitSystem;
}

export function MaintenanceLogView({ user, unitSystem }: MaintenanceLogViewProps) {
  const { entries, isLoading, error, refresh } = useMaintenanceLogs(user);
  const { vehicles } = useVehicles(user);

  const [dateInput, setDateInput] = useState(todayInputValue);
  const [type, setType] = useState<MaintenanceType>('tires');
  const [odometerInput, setOdometerInput] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<MaintenanceLogEntry | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleAdd = async () => {
    const odometer = Number(odometerInput.replace(',', '.'));
    if (!Number.isFinite(odometer) || odometer < 0) {
      setFormError('Renseigne un kilométrage valide.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      await addMaintenanceLog(user.uid, {
        dateMs: new Date(dateInput).getTime(),
        type,
        odometerMeters: toMetersFromDistanceValue(odometer, unitSystem),
        vehicleId: vehicleId || null,
      });
      setOdometerInput('');
      refresh();
    } catch (err) {
      console.error(err);
      setFormError("Échec de l'enregistrement. Réessaie.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmEdit = async (values: Parameters<typeof updateMaintenanceLog>[2]) => {
    if (!pendingEdit) return;
    await updateMaintenanceLog(user.uid, pendingEdit.id, values);
    setPendingEdit(null);
    refresh();
  };

  const handleDelete = async (entryId: string) => {
    setPendingDeleteId(entryId);
    try {
      await deleteMaintenanceLog(user.uid, entryId);
      refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <>
      <div className="fuel-log-form">
        <label className="dialog-field">
          Type d'entretien
          <select value={type} onChange={(event) => setType(event.target.value as MaintenanceType)} disabled={isSaving}>
            {MAINTENANCE_TYPES.map((option) => (
              <option key={option} value={option}>
                {MAINTENANCE_TYPE_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="dialog-field">
          Date
          <input
            type="date"
            value={dateInput}
            max={todayInputValue()}
            onChange={(event) => setDateInput(event.target.value)}
            disabled={isSaving}
          />
        </label>

        <label className="dialog-field">
          Kilométrage du véhicule ({distanceUnitLabel(unitSystem)})
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

        {vehicles && vehicles.length > 0 && (
          <label className="dialog-field">
            Véhicule (optionnel)
            <select value={vehicleId} onChange={(event) => setVehicleId(event.target.value)} disabled={isSaving}>
              <option value="">—</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {formError && <p className="dialog-error">{formError}</p>}

        <button type="button" className="button button-primary" onClick={handleAdd} disabled={isSaving || !odometerInput}>
          {isSaving ? 'Enregistrement...' : "Ajouter l'entretien"}
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {!isLoading && entries && entries.length === 0 && (
        <p className="my-rides-hint">Aucun entretien enregistré pour l'instant.</p>
      )}

      {entries && entries.length > 0 && (
        <ul className="my-rides-list">
          {entries.map((entry) => (
            <li key={entry.id} className="my-rides-item">
              <div className="my-rides-item-info">
                <span className="my-rides-item-title">
                  {new Date(entry.dateMs).toLocaleDateString('fr-FR')} · {MAINTENANCE_TYPE_LABELS[entry.type]}
                </span>
                <span className="my-rides-item-meta">{formatDistance(entry.odometerMeters, unitSystem)} au compteur</span>
              </div>
              <div className="my-rides-item-actions">
                <button type="button" className="button button-ghost" onClick={() => setPendingEdit(entry)}>
                  Modifier
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={pendingDeleteId === entry.id}
                  onClick={() => handleDelete(entry.id)}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingEdit && (
        <EditMaintenanceLogDialog
          entry={pendingEdit}
          vehicles={vehicles}
          unitSystem={unitSystem}
          onConfirm={handleConfirmEdit}
          onCancel={() => setPendingEdit(null)}
        />
      )}
    </>
  );
}
