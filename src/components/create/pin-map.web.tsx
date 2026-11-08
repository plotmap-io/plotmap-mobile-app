import 'leaflet/dist/leaflet.css';

import type * as Leaflet from 'leaflet';
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react';

import { INITIAL_REGION } from '@/lib/region';
import { color } from '@/theme/tokens';
import type { Coordinate } from '@/types/api';

export interface PinMapHandle {
  goTo(coordinate: Coordinate, close?: boolean): void;
}

/**
 * The web stand-in for the pin map, same as `map-canvas.web.tsx` is for the
 * search map: Leaflet with free OpenStreetMap raster tiles, imported lazily
 * because Leaflet reads `window` at import time and Expo prerenders this
 * route in Node.
 *
 * It is a development surface — `npm run web` and the screenshot gate. The
 * phone gets satellite imagery, which is what a plot actually needs.
 */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const PIN_HTML =
  `<span style="display:block;width:22px;height:22px;border-radius:999px;background:${color.shiraz};` +
  `border:3px solid #fff;box-shadow:0 4px 10px -2px rgba(20,40,55,.45)"></span>` +
  `<span style="display:block;width:8px;height:8px;margin:-4px auto 0;background:${color.shiraz};` +
  `transform:rotate(45deg)"></span>`;

export function PinMap({
  ref,
  pin,
  onMove,
}: {
  ref?: Ref<PinMapHandle>;
  pin: Coordinate | null;
  onMove: (coordinate: Coordinate) => void;
}) {
  const container = useRef<HTMLDivElement | null>(null);
  const lib = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const marker = useRef<Leaflet.Marker | null>(null);

  // The map's own handlers read the latest callback through a ref, installed
  // after the render that changed it — writing a ref DURING render is what
  // the React Compiler's lint refuses.
  const move = useRef(onMove);
  useEffect(() => {
    move.current = onMove;
  }, [onMove]);

  useImperativeHandle(ref, () => ({
    goTo(coordinate, close = true) {
      map.current?.setView([coordinate.latitude, coordinate.longitude], close ? 17 : 14, {
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

      const start = pin ?? { latitude: INITIAL_REGION.latitude, longitude: INITIAL_REGION.longitude };
      const instance = L.map(container.current, { zoomControl: false }).setView(
        [start.latitude, start.longitude],
        pin ? 17 : 12,
      );
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(instance);
      instance.on('click', (e: Leaflet.LeafletMouseEvent) =>
        move.current({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
      );
      map.current = instance;
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // The starting view is read once, on purpose: later pin changes move the
    // marker below rather than rebuilding the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One marker, moved — not removed and re-added, which makes it flicker.
  useEffect(() => {
    const L = lib.current;
    const instance = map.current;
    if (!L || !instance) return;

    if (!pin) {
      marker.current?.remove();
      marker.current = null;
      return;
    }

    if (marker.current) {
      marker.current.setLatLng([pin.latitude, pin.longitude]);
      return;
    }

    const icon = L.divIcon({ html: PIN_HTML, className: '', iconAnchor: [11, 30] });
    const made = L.marker([pin.latitude, pin.longitude], { icon, draggable: true }).addTo(instance);
    made.on('dragend', () => {
      const at = made.getLatLng();
      move.current({ latitude: at.lat, longitude: at.lng });
    });
    marker.current = made;
  }, [pin]);

  // `zIndex: 0` makes the container a stacking context, so Leaflet's panes
  // stay inside the map instead of painting over the step's footer.
  return <div ref={container} style={{ flex: 1, position: 'relative', zIndex: 0 }} />;
}
