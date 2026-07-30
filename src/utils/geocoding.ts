const REVERSE_GEOCODE_TIMEOUT_MS = 5000;

interface NominatimAddress {
  state?: string;
  region?: string;
  county?: string;
  country?: string;
}

/**
 * Geocodage inverse via l'API publique Nominatim (OpenStreetMap), gratuite mais
 * limitee a un usage leger (pas de cle, pas de facturation - voir leur politique
 * d'usage). N'est appele qu'une fois par sauvegarde de parcours (action humaine,
 * jamais en boucle), donc largement sous la limite de leur politique.
 * Best-effort : renvoie null sans jamais faire echouer la sauvegarde elle-meme.
 */
export async function reverseGeocodeRegion(lat: number, lng: number): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=8&lat=${lat}&lon=${lng}`,
      { signal: controller.signal, headers: { 'Accept-Language': 'fr' } },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as { address?: NominatimAddress };
    const address = data.address;
    if (!address) return null;

    const region = address.state ?? address.region ?? address.county ?? null;
    const country = address.country ?? null;

    if (region && country) return `${region}, ${country}`;
    return country ?? region;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
