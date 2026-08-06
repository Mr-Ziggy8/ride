import { MOTORCYCLE_BRANDS, MOTORCYCLE_MODELS_BY_BRAND, OTHER_OPTION } from '../data/motorcycleBrands';

export interface VehicleBrandModelValue {
  brandSelect: string;
  brandCustomText: string;
  modelSelect: string;
  modelCustomText: string;
}

export function emptyVehicleBrandModelValue(): VehicleBrandModelValue {
  return { brandSelect: '', brandCustomText: '', modelSelect: '', modelCustomText: '' };
}

/** Reconstruit la selection marque/modele a partir des valeurs stockees (pour
 * prefiler le dialogue d'edition) - bascule sur "Autre" + texte libre si la
 * valeur stockee ne correspond a aucune entree connue du catalogue. */
export function vehicleBrandModelValueFrom(brand: string | null, model: string | null): VehicleBrandModelValue {
  const brandKnown = brand != null && brand !== OTHER_OPTION && MOTORCYCLE_BRANDS.includes(brand);
  const brandSelect = brandKnown ? brand : brand ? OTHER_OPTION : '';
  const brandCustomText = brandKnown ? '' : brand ?? '';

  const modelsForBrand = brandKnown ? MOTORCYCLE_MODELS_BY_BRAND[brand] ?? [] : [];
  const modelKnown = model != null && modelsForBrand.includes(model);
  const modelSelect = modelKnown ? model : model ? OTHER_OPTION : '';
  const modelCustomText = modelKnown ? '' : model ?? '';

  return { brandSelect, brandCustomText, modelSelect, modelCustomText };
}

export function resolveVehicleBrandModel(value: VehicleBrandModelValue): { brand: string; model: string } {
  const brand = value.brandSelect === OTHER_OPTION ? value.brandCustomText.trim() : value.brandSelect;
  const model = value.modelSelect === OTHER_OPTION || value.brandSelect === OTHER_OPTION
    ? value.modelCustomText.trim()
    : value.modelSelect;
  return { brand, model };
}
