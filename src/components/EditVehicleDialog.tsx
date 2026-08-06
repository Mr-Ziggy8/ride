import { useState } from 'react';
import type { NewVehicle } from '../utils/vehicleStorage';
import { convertDistanceValue, distanceUnitLabel, toMetersFromDistanceValue } from '../utils/units';
import { VehicleBrandModelFields } from './VehicleBrandModelFields';
import {
  resolveVehicleBrandModel,
  vehicleBrandModelValueFrom,
  type VehicleBrandModelValue,
} from '../utils/vehicleBrandModel';
import type { UnitSystem, Vehicle } from '../types';

interface EditVehicleDialogProps {
  vehicle: Vehicle;
  unitSystem: UnitSystem;
  onConfirm: (values: NewVehicle) => Promise<void>;
  onCancel: () => void;
}

export function EditVehicleDialog({ vehicle, unitSystem, onConfirm, onCancel }: EditVehicleDialogProps) {
  const [brandModel, setBrandModel] = useState<VehicleBrandModelValue>(
    vehicleBrandModelValueFrom(vehicle.brand, vehicle.model),
  );
  const [yearInput, setYearInput] = useState(vehicle.year != null ? String(vehicle.year) : '');
  const [odometerInput, setOdometerInput] = useState(
    vehicle.purchaseOdometerMeters != null ? convertDistanceValue(vehicle.purchaseOdometerMeters, unitSystem).toFixed(1) : '',
  );
  const [colorInput, setColorInput] = useState(vehicle.color ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    const { brand, model } = resolveVehicleBrandModel(brandModel);
    if (!brand) {
      setError('Renseigne la marque du véhicule.');
      return;
    }
    if (!model) {
      setError('Renseigne le modèle du véhicule.');
      return;
    }
    const year = Number(yearInput);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) {
      setError('Renseigne une année valide.');
      return;
    }
    const odometer = Number(odometerInput.replace(',', '.'));
    if (!Number.isFinite(odometer) || odometer < 0) {
      setError("Renseigne un kilométrage d'achat valide.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm({
        brand,
        model,
        year,
        purchaseOdometerMeters: toMetersFromDistanceValue(odometer, unitSystem),
        color: colorInput.trim() || null,
      });
    } catch {
      setError("Échec de l'enregistrement. Réessaie.");
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Modifier ce véhicule">
      <div className="dialog">
        <h2>Modifier ce véhicule</h2>

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
