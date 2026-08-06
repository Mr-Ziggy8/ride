import { useState } from 'react';
import type { User } from 'firebase/auth';
import { FuelLogView } from './FuelLogView';
import { MaintenanceLogView } from './MaintenanceLogView';
import type { FuelUnit, UnitSystem } from '../types';

interface MaintenanceBookViewProps {
  user: User;
  unitSystem: UnitSystem;
  fuelUnit: FuelUnit;
  onClose: () => void;
}

type MaintenanceBookTab = 'fuel' | 'maintenance';

/** Carnet d'entretien : ecran englobant qui contient le carnet essence (pleins,
 * consommation) et le suivi d'entretien (pneus/huile/filtres/chaine), chacun
 * garde son kilometrage propre au vehicule selectionne. */
export function MaintenanceBookView({ user, unitSystem, fuelUnit, onClose }: MaintenanceBookViewProps) {
  const [tab, setTab] = useState<MaintenanceBookTab>('fuel');

  return (
    <main className="my-rides-screen">
      <div className="my-rides-header">
        <h2>Carnet d'entretien</h2>
        <button type="button" className="button button-ghost" onClick={onClose}>
          Retour
        </button>
      </div>

      <div className="stats-range-selector">
        <button
          type="button"
          className={`button ${tab === 'fuel' ? 'button-primary' : 'button-ghost'}`}
          onClick={() => setTab('fuel')}
        >
          Essence
        </button>
        <button
          type="button"
          className={`button ${tab === 'maintenance' ? 'button-primary' : 'button-ghost'}`}
          onClick={() => setTab('maintenance')}
        >
          Entretien
        </button>
      </div>

      {tab === 'fuel' && <FuelLogView user={user} unitSystem={unitSystem} fuelUnit={fuelUnit} />}
      {tab === 'maintenance' && <MaintenanceLogView user={user} unitSystem={unitSystem} />}
    </main>
  );
}
