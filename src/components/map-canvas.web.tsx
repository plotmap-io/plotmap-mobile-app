import 'leaflet/dist/leaflet.css';

import type * as Leaflet from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { INITIAL_REGION, type MapRegion } from '@/lib/region';
import type { MapPin } from '@/services/map-pins';
import { color } from '@/theme/tokens';

/**
 * Web map. Leaflet with raster OpenStreetMap tiles — free, no API key, and no
 * Web Worker, which is what stopped MapLibre working under Metro ("Worker
 * failed to load": Metro does not serve its tile-parsing worker).
 *
 * Leaflet reads `window` at import time, so it is imported lazily inside the
 * effect: Expo's static rendering prerenders this route in Node, where a
 * top-level import would throw `window is not defined`.
 *
 * OSM's public tiles are fine for development. A production web map belongs on
 * your own tiles or a provider — see their tile usage policy.
 */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function regionFrom(map: Leaflet.Map): MapRegion {
  const bounds = map.getBounds();
  const centre = map.getCenter();
  return {
    latitude: centre.lat,
    longitude: centre.lng,
    latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
    longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()),
  };
}

function pinHtml(label: string, active: boolean): string {
  const bg = active ? color.accent : color.surface;
  const fg = active ? color.surface : color.accent;
  return (
    `<span style="display:inline-block;background:${bg};color:${fg};` +
    `border:1.5px solid ${color.accent};border-radius:8px;padding:3px 8px;` +
    `font:700 13px Inter,system-ui,sans-serif;white-space:nowrap;` +
    `box-shadow:0 3px 8px -2px rgba(20,40,55,.35)">${label}</span>`
  );
}

export function MapCanvas({
  pins,
  activeId,
  onSelect,
  onRegionSettled,
}: {
  progress: SharedValue<number>;
  pins: MapPin[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRegionSettled?: (region: MapRegion) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const markers = useRef<globalThis.Map<string, Leaflet.Marker>>(new globalThis.Map());
  const [ready, setReady] = useState(false);

  // Refs so the map's own handlers never need rebinding.
  const settled = useRef(onRegionSettled);
  settled.current = onRegionSettled;
  const select = useRef(onSelect);
  select.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !container.current || map.current) return;
      lib.current = L;

      const instance = L.map(container.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([INITIAL_REGION.latitude, INITIAL_REGION.longitude], 11);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(instance);
      instance.on('moveend', () => settled.current?.(regionFrom(instance)));

      map.current = instance;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
  }, []);

  // Reconcile markers rather than rebuilding them: clearing them all on every
  // pan makes the map flash.
  useEffect(() => {
    const L = lib.current;
    const instance = map.current;
    if (!L || !instance) return;

    // Only listing pins have a renderer; a cluster pin draws nothing.
    const drawn = pins.filter((p) => p.kind === 'listing');
    const wanted = new Set(drawn.map((p) => p.id));
    for (const [id, marker] of markers.current) {
      if (!wanted.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    for (const pin of drawn) {
      const icon = L.divIcon({
        html: pinHtml(pin.label, pin.listingId === activeId),
        className: '',
        iconAnchor: [28, 28],
      });
      const existing = markers.current.get(pin.id);
      if (existing) {
        existing.setIcon(icon);
        continue;
      }
      markers.current.set(
        pin.id,
        L.marker([pin.coordinate.latitude, pin.coordinate.longitude], { icon })
          .addTo(instance)
          .on('click', () => select.current(pin.listingId)),
      );
    }
  }, [pins, activeId, ready]);

  return <div ref={container} style={{ position: 'absolute', inset: 0 }} />;
}
