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
  id: string;
  coordinate: Coordinate;
  count: number;
  /** The area the members cover, for zooming into it when the pin is tapped. */
  bounds: { south: number; west: number; north: number; east: number };
}

export type MapPin = ListingPin | ClusterPin;

/**
 * Today: one pin per listing, every listing drawn.
 *
 * That holds while a viewport returns tens of rows and falls apart in the
 * hundreds — a city-wide view in the sample dataset returns well over a
 * thousand, and the markers then overlap into an unreadable mass and drag the
 * frame rate down with them. The server already bins its own marker feed above
 * 500 points (`POST /api/v1/listings/map`, mirrored in `dev-data.mapFeed`);
 * the client does not use that feed and does no grouping of its own.
 */
export function toPins(listings: ListingCard[]): MapPin[] {
  return listings.map((listing) => ({
    kind: 'listing',
    id: listing.id,
    listingId: listing.id,
    coordinate: listing.coordinates,
    label: listing.markerPrice,
  }));
}
