import { api } from '@/lib/api';

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
