const REVERSE_GEOCODE_TIMEOUT_MS = 5000;

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  region?: string;
  county?: string;
  country?: string;
}

/**
 * Geocodage inverse via l'API publique Nominatim (OpenStreetMap), gratuite mais
 * limitee a un usage leger (pas de cle, pas de facturation - voir leur politique
 * d'usage). Best-effort : ne jette jamais, renvoie null en cas d'echec/timeout.
 */
async function reverseGeocode(lat: number, lng: number, zoom: number): Promise<NominatimAddress | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=${zoom}&lat=${lat}&lon=${lng}`,
      { signal: controller.signal, headers: { 'Accept-Language': 'fr' } },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { address?: NominatimAddress };
    return data.address ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Un appel par sauvegarde (point central du trace), jamais en boucle. */
export async function reverseGeocodeRegion(lat: number, lng: number): Promise<string | null> {
  const address = await reverseGeocode(lat, lng, 8);
  if (!address) return null;

  const region = address.state ?? address.region ?? address.county ?? null;
  const country = address.country ?? null;

  if (region && country) return `${region}, ${country}`;
  return country ?? region;
}

/** Deux appels par sauvegarde (points de depart+arrivee), pour la suggestion de
 * titre "Ville A vers Ville B" - zoom plus serre que reverseGeocodeRegion pour
 * cibler la localite plutot que la region. */
export async function reverseGeocodeCityName(lat: number, lng: number): Promise<string | null> {
  const address = await reverseGeocode(lat, lng, 12);
  if (!address) return null;
  return address.city ?? address.town ?? address.village ?? address.municipality ?? null;
}
