import { useState } from 'react';
import {
  MAINTENANCE_TYPE_LABELS,
  MAINTENANCE_TYPES,
  type MaintenanceLogEntry,
  type MaintenanceType,
  type NewMaintenanceLogEntry,
} from '../utils/maintenanceLogStorage';
import { dateInputValueFromMs, todayInputValue } from '../utils/dateInput';
import { convertDistanceValue, distanceUnitLabel, toMetersFromDistanceValue } from '../utils/units';
import type { UnitSystem, Vehicle } from '../types';

interface EditMaintenanceLogDialogProps {
  entry: MaintenanceLogEntry;
  vehicles: Vehicle[] | null;
  unitSystem: UnitSystem;
  onConfirm: (values: NewMaintenanceLogEntry) => Promise<void>;
  onCancel: () => void;
}

export function EditMaintenanceLogDialog({ entry, vehicles, unitSystem, onConfirm, onCancel }: EditMaintenanceLogDialogProps) {
  const [dateInput, setDateInput] = useState(dateInputValueFromMs(entry.dateMs));
  const [type, setType] = useState<MaintenanceType>(entry.type);
  const [odometerInput, setOdometerInput] = useState(convertDistanceValue(entry.odometerMeters, unitSystem).toFixed(1));
  const [vehicleId, setVehicleId] = useState(entry.vehicleId ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const odometer = Number(odometerInput.replace(',', '.'));
    if (!Number.isFinite(odometer) || odometer < 0) {
      setError('Renseigne un kilométrage valide.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({
        dateMs: new Date(dateInput).getTime(),
        type,
        odometerMeters: toMetersFromDistanceValue(odometer, unitSystem),
        vehicleId: vehicleId || null,
      });
    } catch {
      setError("Échec de l'enregistrement. Réessaie.");
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Modifier cet entretien">
      <div className="dialog">
        <h2>Modifier cet entretien</h2>

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

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onCancel} disabled={isSaving}>
            Annuler
          </button>
          <button type="button" className="button button-primary" onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
