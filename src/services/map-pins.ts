import type { Coordinate, ListingCard } from '@/types/api';

/**
 * What a map is given to draw.
 *
 * The two map canvases — `map-canvas.tsx` (react-native-maps) and
 * `map-canvas.web.tsx` (Leaflet) — draw whatever this module returns and know
 * nothing about listings, filters or the backend. Deciding what belongs on the
 * map is logic and lives here, where a test can reach it without a device.
 */
export interface ListingPin {
  kind: 'listing';
  /** Stable across renders: both canvases reconcile markers by it. */
  id: string;
  listingId: string;
  coordinate: Coordinate;
  /** Already formatted by the backend — the client never formats money. */
  label: string;
}

export interface ClusterPin {
  kind: 'cluster';
  /** Stable for a cell at a zoom, so a pan does not rebuild every pile. */
  id: string;
  /** The pile STANDS ON one of its members (the web's rule, 2026-11-04). */
  coordinate: Coordinate;
  count: number;
  /** That member's price, shown on the pile beside the count. */
  label: string;
  /** The area the members cover, for zooming into it when the pin is tapped. */
  bounds: { south: number; west: number; north: number; east: number };
}

export type MapPin = ListingPin | ClusterPin;

/** What the canvas knows about the view: how wide, and how many degrees across. */
export interface Viewport {
  longitudeDelta: number;
  widthPx: number;
}

/**
 * A pile forms when two markers would land within this many points. It is
 * wider than it looks necessary because a PILE is wide: a price pill plus its
 * count circle runs past 100 points, so 60pt cells put two piles on top of
 * each other at a district zoom.
 */
export const CELL_PX = 96;

function listingPin(listing: ListingCard): ListingPin {
  return {
    kind: 'listing',
    id: listing.id,
    listingId: listing.id,
    coordinate: listing.coordinates,
    label: listing.markerPrice,
  };
}

/**
 * One pin per listing, piled where they would overlap.
 *
 * Listings are binned into a grid of `CELL_PX` points at the current zoom; a
 * cell with one listing is a price pill, a cell with more is a pile carrying
 * the count. Without a viewport (a test, a first render before layout) every
 * listing is its own pin — the only thing the grid needs to know is how many
 * degrees one point covers.
 *
 * The server bins its own marker feed above 500 points (`POST
 * /api/v1/listings/map`); this is the client's half of the same promise, so a
 * Thrissur viewport is a dozen readable piles rather than three hundred pills
 * on one spot and the frame rate that goes with them.
 */
export function toPins(listings: ListingCard[], viewport?: Viewport): MapPin[] {
  if (!viewport || listings.length < 2) return listings.map(listingPin);
  const cell = (viewport.longitudeDelta / viewport.widthPx) * CELL_PX;
  if (!(cell > 0) || !Number.isFinite(cell)) return listings.map(listingPin);

  const cells = new Map<string, ListingCard[]>();
  for (const listing of listings) {
    const { latitude, longitude } = listing.coordinates;
    const key = `${Math.floor(longitude / cell)}:${Math.floor(latitude / cell)}`;
    const members = cells.get(key);
    if (members) members.push(listing);
    else cells.set(key, [listing]);
  }

  const pins: MapPin[] = [];
  for (const [key, members] of cells) {
    if (members.length === 1) {
      pins.push(listingPin(members[0]));
      continue;
    }

    let south = Infinity;
    let north = -Infinity;
    let west = Infinity;
    let east = -Infinity;
    let latSum = 0;
    let lngSum = 0;
    for (const m of members) {
      const { latitude, longitude } = m.coordinates;
      south = Math.min(south, latitude);
      north = Math.max(north, latitude);
      west = Math.min(west, longitude);
      east = Math.max(east, longitude);
      latSum += latitude;
      lngSum += longitude;
    }
    const centre = { latitude: latSum / members.length, longitude: lngSum / members.length };

    // The member nearest the centre is the one the pile stands on.
    let anchor = members[0];
    let best = Infinity;
    for (const m of members) {
      const d =
        (m.coordinates.latitude - centre.latitude) ** 2 +
        (m.coordinates.longitude - centre.longitude) ** 2;
      if (d < best) {
        best = d;
        anchor = m;
      }
    }

    pins.push({
      kind: 'cluster',
      id: `c:${key}`,
      coordinate: anchor.coordinates,
      count: members.length,
      label: anchor.markerPrice,
      bounds: { south, west, north, east },
    });
  }
  return pins;
}

/** Every listing a set of pins stands for — the number the user reads. */
export function pinCount(pins: MapPin[]): number {
  let n = 0;
  for (const p of pins) n += p.kind === 'cluster' ? p.count : 1;
  return n;
}
