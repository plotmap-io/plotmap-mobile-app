import 'leaflet/dist/leaflet.css';

import type * as Leaflet from 'leaflet';
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { INITIAL_REGION, type MapRegion } from '@/lib/region';
import type { ClusterPin, MapPin } from '@/services/map-pins';
import { color } from '@/theme/tokens';

export interface MapCanvasHandle {
  locate(): boolean;
  fit(bounds: ClusterPin['bounds']): void;
  animateTo(region: MapRegion): void;
}

/**
 * Leaflet speaks zoom, the app speaks a longitude span. 360° across the
 * viewport is zoom 0 and each step halves it, so the span names the zoom.
 */
function zoomFor(longitudeDelta: number): number {
  if (!(longitudeDelta > 0)) return 13;
  return Math.max(2, Math.min(18, Math.round(Math.log2(360 / longitudeDelta))));
}

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

const FONT = `font:700 13px -apple-system,Inter,system-ui,sans-serif;letter-spacing:-.2px;`;

function pillHtml(label: string, active: boolean): string {
  const bg = active ? color.ink : color.accent;
  return (
    `<span style="display:inline-flex;align-items:center;height:26px;background:${bg};color:#fff;` +
    `border:1.5px solid #fff;border-radius:6px;padding:0 8px;${FONT}white-space:nowrap;` +
    `box-shadow:0 4px 10px -2px rgba(20,40,55,.35)${active ? ';transform:scale(1.08)' : ''}">${label}</span>` +
    `<span style="display:block;width:8px;height:8px;margin:-5px auto 0;background:${bg};transform:rotate(45deg)"></span>`
  );
}

function pileHtml(label: string, count: number): string {
  const n = count > 999 ? `${(count / 1000).toFixed(1)}k` : String(count);
  return (
    `<span style="display:inline-flex;align-items:center;white-space:nowrap">` +
    `<span style="display:inline-flex;align-items:center;height:26px;background:${color.accent};color:#fff;` +
    `border:1.5px solid #fff;border-radius:6px 999px 999px 6px;padding:0 14px 0 8px;${FONT}` +
    `box-shadow:0 4px 10px -2px rgba(20,40,55,.35)">${label}</span>` +
    `<span style="display:inline-flex;align-items:center;justify-content:center;margin-left:-12px;min-width:28px;height:28px;` +
    `padding:0 6px;border-radius:999px;background:#fff;border:2px solid ${color.accent};color:${color.accent};` +
    `font:700 12px -apple-system,Inter,system-ui,sans-serif;box-shadow:0 1px 3px rgba(20,40,55,.15)">${n}</span></span>` +
    `<span style="display:block;width:8px;height:8px;margin:-5px auto 0;background:${color.accent};transform:rotate(45deg)"></span>`
  );
}

export function MapCanvas({
  ref,
  pins,
  activeId,
  onSelect,
  onRegionSettled,
}: {
  ref?: Ref<MapCanvasHandle>;
  progress: SharedValue<number>;
  pins: MapPin[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRegionSettled?: (region: MapRegion) => void;
  topInset?: number;
  bottomInset?: number;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const markers = useRef<globalThis.Map<string, Leaflet.Marker>>(new globalThis.Map());
  const [ready, setReady] = useState(false);

  // Refs so the map's own handlers never need rebinding. They are installed
  // after the render that changed them — writing a ref DURING render is what
  // the React Compiler's lint refuses — and the map's events all fire later.
  const settled = useRef(onRegionSettled);
  const select = useRef(onSelect);
  useEffect(() => {
    settled.current = onRegionSettled;
    select.current = onSelect;
  }, [onRegionSettled, onSelect]);

  useImperativeHandle(ref, () => ({
    locate() {
      if (!map.current) return false;
      map.current.locate({ setView: true, maxZoom: 14 });
      return true;
    },
    fit(bounds) {
      map.current?.fitBounds(
        [
          [bounds.south, bounds.west],
          [bounds.north, bounds.east],
        ],
        { padding: [60, 60], animate: true, maxZoom: 17 },
      );
    },
    animateTo(region) {
      map.current?.setView([region.latitude, region.longitude], zoomFor(region.longitudeDelta), {
        animate: true,
      });
    },
  }));

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

    const live = markers.current;
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      live.clear();
    };
  }, []);

  // Reconcile markers rather than rebuilding them: clearing them all on every
  // pan makes the map flash.
  useEffect(() => {
    const L = lib.current;
    const instance = map.current;
    if (!L || !instance) return;

    const wanted = new Set(pins.map((p) => p.id));
    for (const [id, marker] of markers.current) {
      if (!wanted.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }

    for (const pin of pins) {
      const html =
        pin.kind === 'listing'
          ? pillHtml(pin.label, pin.listingId === activeId)
          : pileHtml(pin.label, pin.count);
      const icon = L.divIcon({ html, className: '', iconAnchor: [30, 34] });
      const existing = markers.current.get(pin.id);
      if (existing) {
        existing.setIcon(icon);
        continue;
      }
      const marker = L.marker([pin.coordinate.latitude, pin.coordinate.longitude], { icon }).addTo(
        instance,
      );
      if (pin.kind === 'listing') marker.on('click', () => select.current(pin.listingId));
      else
        marker.on('click', () =>
          instance.fitBounds(
            [
              [pin.bounds.south, pin.bounds.west],
              [pin.bounds.north, pin.bounds.east],
            ],
            { padding: [60, 60], animate: true, maxZoom: 17 },
          ),
        );
      markers.current.set(pin.id, marker);
    }
  }, [pins, activeId, ready]);

  // `zIndex: 0` is load-bearing: it makes the container a stacking context, so
  // Leaflet's own panes (z-index 200-800) stay INSIDE the map instead of
  // painting over the controls a screen puts on top of it.
  return <div ref={container} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />;
}
