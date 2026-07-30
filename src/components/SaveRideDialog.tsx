import { useEffect, useRef, useState } from 'react';
import { EU_COUNTRIES_REGIONS } from '../data/euCountriesRegions';
import { reverseGeocodeCityName } from '../utils/geocoding';
import type { RideVisibility } from '../types';

const DEFAULT_COUNTRY = 'Belgique';

interface LatLng {
  lat: number;
  lng: number;
}

interface SaveRideDialogProps {
  defaultTitle: string;
  /** Utilises pour suggerer un titre "Ville A vers Ville B" - null si indisponibles. */
  startPoint: LatLng | null;
  endPoint: LatLng | null;
  onSave: (title: string, visibility: RideVisibility, country: string | null, region: string | null) => Promise<void>;
  onCancel: () => void;
}

export function SaveRideDialog({ defaultTitle, startPoint, endPoint, onSave, onCancel }: SaveRideDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [visibility, setVisibility] = useState<RideVisibility>('private');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [region, setRegion] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasUserEditedTitleRef = useRef(false);

  // Suggestion de titre "Ville de depart vers Ville d'arrivee" - ne remplace
  // jamais un titre que l'utilisateur a deja commence a modifier lui-meme.
  useEffect(() => {
    if (startPoint == null || endPoint == null) return;
    let cancelled = false;

    Promise.all([
      reverseGeocodeCityName(startPoint.lat, startPoint.lng),
      reverseGeocodeCityName(endPoint.lat, endPoint.lng),
    ]).then(([startCity, endCity]) => {
      if (cancelled || hasUserEditedTitleRef.current) return;
      if (startCity && endCity && startCity !== endCity) {
        setTitle(`${startCity} vers ${endCity}`);
      } else if (startCity) {
        setTitle(startCity);
      }
    });

    return () => {
      cancelled = true;
    };
    // startPoint/endPoint sont memoises cote App.tsx (useMemo sur track/recording.points) :
    // reference stable tant que le trace ne change pas, donc ok comme deps directes.
  }, [startPoint, endPoint]);

  const regionOptions = EU_COUNTRIES_REGIONS.find((c) => c.country === country)?.regions ?? [];

  const handleTitleChange = (value: string) => {
    hasUserEditedTitleRef.current = true;
    setTitle(value);
  };

  const handleCountryChange = (value: string) => {
    setCountry(value);
    setRegion('');
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmedTitle, visibility, country || null, region || null);
    } catch {
      setError('Échec de la sauvegarde. Réessaie.');
      setIsSaving(false);
    }
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label="Sauvegarder le parcours">
      <div className="dialog">
        <h2>Sauvegarder le parcours</h2>

        <label className="dialog-field">
          Titre
          <input
            type="text"
            value={title}
            onChange={(event) => handleTitleChange(event.target.value)}
            maxLength={120}
            disabled={isSaving}
            autoFocus
          />
        </label>

        <fieldset className="dialog-field">
          <legend>Visibilité</legend>
          <div className="dialog-field-options">
            <label>
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
                disabled={isSaving}
              />
              Privé
            </label>
            <label>
              <input
                type="radio"
                name="visibility"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                disabled={isSaving}
              />
              Public
            </label>
          </div>
        </fieldset>

        <label className="dialog-field">
          Pays (optionnel)
          <select value={country} onChange={(event) => handleCountryChange(event.target.value)} disabled={isSaving}>
            {EU_COUNTRIES_REGIONS.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country}
              </option>
            ))}
          </select>
        </label>

        <label className="dialog-field">
          Région (optionnel)
          <select value={region} onChange={(event) => setRegion(event.target.value)} disabled={isSaving}>
            <option value="">—</option>
            {regionOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <p className="dialog-warning">Si le parcours traverse plusieurs régions, indique celle de départ.</p>

        {error && <p className="dialog-error">{error}</p>}

        <div className="dialog-actions">
          <button type="button" className="button button-ghost" onClick={onCancel} disabled={isSaving}>
            Annuler
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
