import type { Settings } from '../types';

interface SettingsSidebarProps {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onClose: () => void;
}

export function SettingsSidebar({ settings, onUpdate, onClose }: SettingsSidebarProps) {
  return (
    <div className="sidebar-overlay" role="dialog" aria-modal="true" aria-label="Paramètres">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Paramètres</h2>
          <button type="button" className="button button-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>

        <fieldset className="sidebar-field">
          <legend>Unité de distance</legend>
          <div className="sidebar-field-options">
            <label>
              <input
                type="radio"
                name="unitSystem"
                checked={settings.unitSystem === 'metric'}
                onChange={() => onUpdate({ unitSystem: 'metric' })}
              />
              Métrique (km)
            </label>
            <label>
              <input
                type="radio"
                name="unitSystem"
                checked={settings.unitSystem === 'imperial'}
                onChange={() => onUpdate({ unitSystem: 'imperial' })}
              />
              Impérial (mi)
            </label>
          </div>
        </fieldset>

        <fieldset className="sidebar-field">
          <legend>Unité carburant</legend>
          <div className="sidebar-field-options">
            <label>
              <input
                type="radio"
                name="fuelUnit"
                checked={settings.fuelUnit === 'liters'}
                onChange={() => onUpdate({ fuelUnit: 'liters' })}
              />
              Litres
            </label>
            <label>
              <input
                type="radio"
                name="fuelUnit"
                checked={settings.fuelUnit === 'gallons'}
                onChange={() => onUpdate({ fuelUnit: 'gallons' })}
              />
              Gallons
            </label>
          </div>
        </fieldset>

        <fieldset className="sidebar-field">
          <legend>Thème</legend>
          <div className="sidebar-field-options sidebar-field-options--column">
            <label>
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'system'}
                onChange={() => onUpdate({ theme: 'system' })}
              />
              Système
            </label>
            <label>
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'light'}
                onChange={() => onUpdate({ theme: 'light' })}
              />
              Clair
            </label>
            <label>
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'dark'}
                onChange={() => onUpdate({ theme: 'dark' })}
              />
              Sombre
            </label>
          </div>
        </fieldset>

        <p className="sidebar-hint">Le choix de la langue arrive dans une prochaine mise à jour.</p>
      </aside>
    </div>
  );
}
