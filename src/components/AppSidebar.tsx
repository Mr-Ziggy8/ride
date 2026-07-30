import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { Settings } from '../types';

export type SidebarDestination = 'discovery' | 'my-rides' | 'favorites' | 'fuel-log';

interface AppSidebarProps {
  user: User | null;
  isLoading: boolean;
  pseudo: string | null;
  settings: Settings;
  onSignIn: () => void;
  onSignOut: () => void;
  onUpdatePseudo: (pseudo: string) => void;
  onUpdateSettings: (patch: Partial<Settings>) => void;
  onNavigate: (destination: SidebarDestination) => void;
  onClose: () => void;
}

export function AppSidebar({
  user,
  isLoading,
  pseudo,
  settings,
  onSignIn,
  onSignOut,
  onUpdatePseudo,
  onUpdateSettings,
  onNavigate,
  onClose,
}: AppSidebarProps) {
  const [pseudoInput, setPseudoInput] = useState(pseudo ?? '');

  useEffect(() => {
    setPseudoInput(pseudo ?? '');
  }, [pseudo]);

  const commitPseudo = () => {
    if (pseudoInput.trim() !== (pseudo ?? '')) {
      onUpdatePseudo(pseudoInput);
    }
  };

  return (
    <div className="sidebar-overlay" role="dialog" aria-modal="true" aria-label="Menu">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Menu</h2>
          <button type="button" className="button button-ghost" onClick={onClose}>
            Fermer
          </button>
        </div>

        <div className="sidebar-account">
          {user ? (
            <>
              <span className="auth-status-name">{user.displayName ?? 'Compte'}</span>
              <label className="dialog-field">
                Pseudo public (parcours partagés)
                <input
                  type="text"
                  value={pseudoInput}
                  onChange={(event) => setPseudoInput(event.target.value)}
                  onBlur={commitPseudo}
                  placeholder={user.displayName ?? 'Pilote'}
                  maxLength={40}
                />
              </label>
              <button type="button" className="button button-secondary" onClick={onSignOut}>
                Se déconnecter
              </button>
            </>
          ) : (
            !isLoading && (
              <button type="button" className="button button-primary" onClick={onSignIn}>
                Se connecter avec Google
              </button>
            )
          )}
        </div>

        <nav className="sidebar-nav">
          <button type="button" className="button button-ghost" onClick={() => onNavigate('discovery')}>
            Découverte
          </button>
          {user && (
            <button type="button" className="button button-ghost" onClick={() => onNavigate('my-rides')}>
              Mes parcours
            </button>
          )}
          {user && (
            <button type="button" className="button button-ghost" onClick={() => onNavigate('favorites')}>
              Mes favoris
            </button>
          )}
          {user && (
            <button type="button" className="button button-ghost" onClick={() => onNavigate('fuel-log')}>
              Carnet de plein
            </button>
          )}
        </nav>

        <fieldset className="sidebar-field">
          <legend>Unité de distance</legend>
          <div className="sidebar-field-options">
            <label>
              <input
                type="radio"
                name="unitSystem"
                checked={settings.unitSystem === 'metric'}
                onChange={() => onUpdateSettings({ unitSystem: 'metric' })}
              />
              Métrique (km)
            </label>
            <label>
              <input
                type="radio"
                name="unitSystem"
                checked={settings.unitSystem === 'imperial'}
                onChange={() => onUpdateSettings({ unitSystem: 'imperial' })}
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
                onChange={() => onUpdateSettings({ fuelUnit: 'liters' })}
              />
              Litres
            </label>
            <label>
              <input
                type="radio"
                name="fuelUnit"
                checked={settings.fuelUnit === 'gallons'}
                onChange={() => onUpdateSettings({ fuelUnit: 'gallons' })}
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
                onChange={() => onUpdateSettings({ theme: 'system' })}
              />
              Système
            </label>
            <label>
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'light'}
                onChange={() => onUpdateSettings({ theme: 'light' })}
              />
              Clair
            </label>
            <label>
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'dark'}
                onChange={() => onUpdateSettings({ theme: 'dark' })}
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
