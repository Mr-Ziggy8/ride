import { useState } from 'react';
import type { FuelLogEntry, NewFuelLogEntry } from '../utils/fuelLogStorage';
import { dateInputValueFromMs, todayInputValue } from '../utils/dateInput';
import {
  convertDistanceValue,
  convertVolumeValue,
  distanceUnitLabel,
  toLitersFromVolumeValue,
  toMetersFromDistanceValue,
  volumeUnitLabel,
} from '../utils/units';
import type { FuelUnit, UnitSystem, Vehicle } from '../types';

interface EditFuelLogDialogProps {
  entry: FuelLogEntry;
  vehicles: Vehicle[] | null;
  unitSystem: UnitSystem;
  fuelUnit: FuelUnit;
  onConfirm: (values: NewFuelLogEntry) => Promise<void>;
  onCancel: () => void;
}

export function EditFuelLogDialog({ entry, vehicles, unitSystem, fuelUnit, onConfirm, onCancel }: EditFuelLogDialogProps) {
  const [dateInput, setDateInput] = useState(dateInputValueFromMs(entry.dateMs));
  const [volumeInput, setVolumeInput] = useState(convertVolumeValue(entry.volumeLiters, fuelUnit).toFixed(2));
  const [priceInput, setPriceInput] = useState(entry.priceAmount.toFixed(2));
  const [odometerInput, setOdometerInput] = useState(convertDistanceValue(entry.odometerMeters, unitSystem).toFixed(1));
  const [vehicleId, setVehicleId] = useState(entry.vehicleId ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const volume = Number(volumeInput.replace(',', '.'));
    const price = Number(priceInput.replace(',', '.'));
    const odometer = Number(odometerInput.replace(',', '.'));
    if (!Number.isFinite(volume) || volume <= 0) {
      setError('Renseigne un volume valide.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError('Renseigne un prix valide.');
      return;
    }
    if (!Number.isFinite(odometer) || odometer < 0) {
      setError('Renseigne un kilométrage valide.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({
        dateMs: new Date(dateInput).getTime(),
        volumeLiters: toLitersFromVolumeValue(volume, fuelUnit),
        priceAmount: price,
        odometerMeters: toMetersFromDistanceValue(odometer, unitSystem),
        vehicleId: vehicleId || null,
      });
    } catch {
      setError("Échec de l'enregistrement. Réessaie.");
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Modifier ce plein">
      <div className="dialog">
        <h2>Modifier ce plein</h2>

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

        <label className="dialog-field">
          Volume ({volumeUnitLabel(fuelUnit)})
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={volumeInput}
            onChange={(event) => setVolumeInput(event.target.value)}
            disabled={isSaving}
          />
        </label>

        <label className="dialog-field">
          Prix (€)
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            value={priceInput}
            onChange={(event) => setPriceInput(event.target.value)}
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
