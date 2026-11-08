import { api } from '@/lib/api';
import type { ReverseGeocodeResult } from '@/types/api';

export interface PlaceSuggestion {
  suggestionType: string;
  placeId?: string;
  /** Some rows carry a display string directly; others only the encoded id. */
  description?: string;
  text?: string;
  label?: string;
  latitude?: number;
  longitude?: number;
}

export function autocomplete(q: string) {
  return api.get<PlaceSuggestion[]>(
    `/api/v1/search/autocomplete?q=${encodeURIComponent(q)}&limit=8`,
    { auth: false },
  );
}

/**
 * Place ids are a base64 payload prefixed with the provider ("mbx:"). The
 * coordinates and viewport are inside it, so a pick needs no second request.
 */
export function decodePlaceId(placeId: string | undefined): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  label: string;
} | null {
  if (!placeId) return null;
  try {
    const payload = placeId.includes(':') ? placeId.slice(placeId.indexOf(':') + 1) : placeId;
    const json = JSON.parse(globalThis.atob(payload));
    const sw = json.viewport?.southwest;
    const ne = json.viewport?.northeast;
    return {
      latitude: Number(json.latitude),
      longitude: Number(json.longitude),
      latitudeDelta: sw && ne ? Math.abs(ne.lat - sw.lat) : 0.2,
      longitudeDelta: sw && ne ? Math.abs(ne.lng - sw.lng) : 0.2,
      label: String(json.formattedAddress ?? ''),
    };
  } catch {
    return null;
  }
}

/**
 * The address at a pin — `GET /places/reverse-geocode?lat=&lng=`.
 *
 * This is a BILLED call upstream (Mapbox first, Google as the fallback), and
 * the only places route that requires a token. One call per settled pin,
 * never one per drag frame: the create flow debounces it and the picker never
 * asks while a finger is down.
 *
 * `displayAddress` is the line Plotmap itself composes (AddressRules: the
 * road, the village, "Thrissur Dist.", each name once) and is what the web's
 * Where step stores verbatim. `formattedAddress` is the raw provider ladder
 * and is only a fallback.
 */
export function reverseGeocode(latitude: number, longitude: number) {
  return api.get<ReverseGeocodeResult>(
    `/api/v1/places/reverse-geocode?lat=${latitude}&lng=${longitude}`,
  );
}

/** The parts of a reverse-geocode a listing's location stores. */
export function addressFrom(result: ReverseGeocodeResult): {
  addressDisplay?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  neighborhood?: string;
} {
  return {
    addressDisplay: result.displayAddress ?? result.formattedAddress,
    city: result.city,
    stateProvince: result.stateProvince,
    country: result.country,
    countryCode: result.countryCode,
    postalCode: result.postalCode,
    neighborhood: result.neighborhood ?? result.sublocality,
  };
}
