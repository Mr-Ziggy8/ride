import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { LATEST_RELEASE } from '../data/changelog';
import { ToggleSwitch } from './ToggleSwitch';
import type { Settings } from '../types';

export type SidebarDestination =
  | 'discovery'
  | 'my-rides'
  | 'favorites'
  | 'fuel-log'
  | 'statistics'
  | 'feedback'
  | 'feedback-admin';

interface AppSidebarProps {
  user: User | null;
  isLoading: boolean;
  pseudo: string | null;
  settings: Settings;
  canModerate: boolean;
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
  canModerate,
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
              Carnet de pleins
            </button>
          )}
          {user && (
            <button type="button" className="button button-ghost" onClick={() => onNavigate('statistics')}>
              Statistiques
            </button>
          )}
          {user && (
            <button type="button" className="button button-ghost" onClick={() => onNavigate('feedback')}>
              Envoyer un commentaire
            </button>
          )}
          {user && canModerate && (
            <button type="button" className="button button-ghost" onClick={() => onNavigate('feedback-admin')}>
              Feedbacks
            </button>
          )}
        </nav>

        <div className="sidebar-field">
          <span className="sidebar-field-title">Unité de distance</span>
          <ToggleSwitch
            checked={settings.unitSystem === 'imperial'}
            onChange={(isImperial) => onUpdateSettings({ unitSystem: isImperial ? 'imperial' : 'metric' })}
            leftLabel="Métrique (km)"
            rightLabel="Impérial (mi)"
          />
        </div>

        <div className="sidebar-field">
          <span className="sidebar-field-title">Unité carburant</span>
          <ToggleSwitch
            checked={settings.fuelUnit === 'gallons'}
            onChange={(isGallons) => onUpdateSettings({ fuelUnit: isGallons ? 'gallons' : 'liters' })}
            leftLabel="Litres"
            rightLabel="Gallons"
          />
        </div>

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

        {LATEST_RELEASE && (
          <p className="sidebar-release-note">
            Dernière mise à jour : {new Date(LATEST_RELEASE.dateIso).toLocaleDateString('fr-FR')}
            <br />
            {LATEST_RELEASE.summary}
          </p>
        )}
      </aside>
    </div>
  );
}
