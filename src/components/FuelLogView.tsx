import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useFuelLogs } from '../hooks/useFuelLogs';
import { useMyRides } from '../hooks/useMyRides';
import { addFuelLog } from '../utils/fuelLogStorage';
import {
  convertDistanceValue,
  distanceUnitLabel,
  formatConsumption,
  formatDistance,
  formatVolume,
  toLitersFromVolumeValue,
  toMetersFromDistanceValue,
  volumeUnitLabel,
} from '../utils/units';
import type { FuelUnit, UnitSystem } from '../types';

interface FuelLogViewProps {
  user: User;
  unitSystem: UnitSystem;
  fuelUnit: FuelUnit;
  onClose: () => void;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FuelLogView({ user, unitSystem, fuelUnit, onClose }: FuelLogViewProps) {
  const { entries, isLoading, error, refresh } = useFuelLogs(user);
  const { rides } = useMyRides(user);

  const [dateInput, setDateInput] = useState(todayInputValue);
  const [volumeInput, setVolumeInput] = useState('');
  const [distanceInput, setDistanceInput] = useState('0');
  const [isDistanceManuallyAdjusted, setIsDistanceManuallyAdjusted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const lastFillDateMs = entries && entries.length > 0 ? entries[0].dateMs : null;

  // Seuls les parcours enregistres en live comptent comme du kilometrage reellement
  // roule (un simple GPX uploade/consulte peut n'avoir jamais ete suivi en vrai).
  const computedDistanceMeters = useMemo(() => {
    if (!rides) return 0;
    return rides
      .filter((ride) => ride.source === 'recorded' && (lastFillDateMs === null || ride.createdAtMs > lastFillDateMs))
      .reduce((sum, ride) => sum + ride.totalTrackDistanceMeters, 0);
  }, [rides, lastFillDateMs]);

  useEffect(() => {
    if (!isDistanceManuallyAdjusted && rides) {
      setDistanceInput(convertDistanceValue(computedDistanceMeters, unitSystem).toFixed(1));
    }
  }, [computedDistanceMeters, unitSystem, isDistanceManuallyAdjusted, rides]);

  const handleAdd = async () => {
    const volume = Number(volumeInput.replace(',', '.'));
    const distance = Number(distanceInput.replace(',', '.'));
    if (!Number.isFinite(volume) || volume <= 0) {
      setFormError('Renseigne un volume valide.');
      return;
    }
    if (!Number.isFinite(distance) || distance < 0) {
      setFormError('Renseigne une distance valide.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const volumeLiters = toLitersFromVolumeValue(volume, fuelUnit);
      const distanceMeters = toMetersFromDistanceValue(distance, unitSystem);
      await addFuelLog(user.uid, {
        dateMs: new Date(dateInput).getTime(),
        volumeLiters,
        distanceSinceLastFillMeters: distanceMeters,
        isDistanceManuallyAdjusted,
      });
      setVolumeInput('');
      setIsDistanceManuallyAdjusted(false);
      refresh();
    } catch (err) {
      console.error(err);
      setFormError("Échec de l'enregistrement. Réessaie.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Carnet de plein</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="fuel-log-form">
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
          Distance depuis le dernier plein ({distanceUnitLabel(unitSystem)})
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            value={distanceInput}
            onChange={(event) => {
              setDistanceInput(event.target.value);
              setIsDistanceManuallyAdjusted(true);
            }}
            disabled={isSaving}
          />
        </label>
        {!isDistanceManuallyAdjusted && (
          <p className="my-rides-hint">Distance calculée automatiquement depuis tes parcours enregistrés.</p>
        )}

        {formError && <p className="dialog-error">{formError}</p>}

        <button
          type="button"
          className="button button-primary"
          onClick={handleAdd}
          disabled={isSaving || !volumeInput}
        >
          {isSaving ? 'Enregistrement...' : 'Ajouter le plein'}
        </button>
      </div>

      {isLoading && <p className="my-rides-hint">Chargement...</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {!isLoading && entries && entries.length === 0 && (
        <p className="my-rides-hint">Aucun plein enregistré pour l'instant.</p>
      )}

      {entries && entries.length > 0 && (
        <ul className="my-rides-list">
          {entries.map((entry) => (
            <li key={entry.id} className="fuel-log-item">
              <span>{new Date(entry.dateMs).toLocaleDateString('fr-FR')}</span>
              <span>{formatVolume(entry.volumeLiters, fuelUnit)}</span>
              <span>{formatDistance(entry.distanceSinceLastFillMeters, unitSystem)}</span>
              <span>{formatConsumption(entry.volumeLiters, entry.distanceSinceLastFillMeters, unitSystem)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
