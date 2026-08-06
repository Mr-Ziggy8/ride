import { MOTORCYCLE_BRANDS, MOTORCYCLE_MODELS_BY_BRAND, OTHER_OPTION } from '../data/motorcycleBrands';
import type { VehicleBrandModelValue } from '../utils/vehicleBrandModel';

interface VehicleBrandModelFieldsProps {
  value: VehicleBrandModelValue;
  onChange: (value: VehicleBrandModelValue) => void;
  disabled: boolean;
}

/** Marque -> modele en cascade : le dropdown modele reste grise tant qu'aucune
 * marque n'est choisie, et ne propose que les modeles de la marque selectionnee
 * (+ "Autre"). Une marque ou un modele absent du catalogue bascule sur un champ
 * libre. Partage entre le formulaire d'ajout et le dialogue d'edition pour
 * eviter de dupliquer cette logique de cascade en deux endroits. */
export function VehicleBrandModelFields({ value, onChange, disabled }: VehicleBrandModelFieldsProps) {
  const hasKnownBrand = value.brandSelect !== '' && value.brandSelect !== OTHER_OPTION;
  const models = hasKnownBrand ? MOTORCYCLE_MODELS_BY_BRAND[value.brandSelect] ?? [] : [];

  const handleBrandChange = (brandSelect: string) => {
    onChange({ brandSelect, brandCustomText: '', modelSelect: '', modelCustomText: '' });
  };

  return (
    <>
      <label className="dialog-field">
        Marque
        <select value={value.brandSelect} onChange={(event) => handleBrandChange(event.target.value)} disabled={disabled}>
          <option value="">—</option>
          {MOTORCYCLE_BRANDS.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>

      {value.brandSelect === OTHER_OPTION && (
        <label className="dialog-field">
          Marque (précise)
          <input
            type="text"
            value={value.brandCustomText}
            onChange={(event) => onChange({ ...value, brandCustomText: event.target.value })}
            maxLength={60}
            disabled={disabled}
          />
        </label>
      )}

      <label className="dialog-field">
        Modèle
        <select
          value={value.modelSelect}
          onChange={(event) => onChange({ ...value, modelSelect: event.target.value, modelCustomText: '' })}
          disabled={disabled || !hasKnownBrand}
        >
          <option value="">—</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
          {hasKnownBrand && <option value={OTHER_OPTION}>{OTHER_OPTION}</option>}
        </select>
      </label>

      {(value.modelSelect === OTHER_OPTION || value.brandSelect === OTHER_OPTION) && (
        <label className="dialog-field">
          Modèle (précise)
          <input
            type="text"
            value={value.modelCustomText}
            onChange={(event) => onChange({ ...value, modelCustomText: event.target.value })}
            maxLength={60}
            disabled={disabled}
          />
        </label>
      )}
    </>
  );
}
