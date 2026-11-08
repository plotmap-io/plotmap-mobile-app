import { describe, expect, it } from 'vitest';

import { devListings } from '@/lib/dev-data';
import { pinCount, toPins } from '@/services/map-pins';
import type { ListingCard } from '@/types/api';

/** The sample dataset stands in for a viewport's worth of results. */
const sample = devListings.slice(0, 200);

/** A phone looking at the whole of Thrissur district. */
const DISTRICT = { longitudeDelta: 0.28, widthPx: 390 };

function at(base: ListingCard, id: string, latitude: number, longitude: number): ListingCard {
  return { ...base, id, coordinates: { latitude, longitude } };
}

describe('toPins', () => {
  it('draws one pin per listing when it knows nothing about the view', () => {
    expect(toPins(sample)).toHaveLength(sample.length);
  });

  it('gives every pin an id of its own, so markers reconcile', () => {
    const ids = toPins(sample, DISTRICT).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('carries the listing through unchanged — position and backend label', () => {
    const [pin] = toPins(sample.slice(0, 1));
    const [listing] = sample;
    expect(pin.kind).toBe('listing');
    expect(pin.coordinate).toEqual(listing.coordinates);
    if (pin.kind === 'listing') {
      expect(pin.listingId).toBe(listing.id);
      expect(pin.label).toBe(listing.markerPrice);
    }
  });

  it('holds an empty viewport without complaint', () => {
    expect(toPins([])).toEqual([]);
    expect(toPins([], DISTRICT)).toEqual([]);
  });

  it('piles a knot of listings on one spot into one marker carrying the count', () => {
    const knot = Array.from({ length: 14 }, (_, i) => at(sample[0], `knot-${i}`, 10.52, 76.21));
    const pins = toPins(knot, DISTRICT);
    expect(pins).toHaveLength(1);
    expect(pins[0].kind).toBe('cluster');
    if (pins[0].kind === 'cluster') expect(pins[0].count).toBe(14);
  });

  it('never loses a listing: the counts add up to the total', () => {
    expect(pinCount(toPins(sample, DISTRICT))).toBe(sample.length);
  });

  it('keeps listings that would not overlap as their own pills', () => {
    // 0.1° apart is ~140 points at this zoom; a cell is 96.
    const pair = [at(sample[0], 'a', 10.5, 76.2), at(sample[0], 'b', 10.6, 76.3)];
    const pins = toPins(pair, DISTRICT);
    expect(pins.map((p) => p.kind)).toEqual(['listing', 'listing']);
  });

  it('stands a pile on one of its members and names that member’s price', () => {
    const members = [
      at(sample[0], 'a', 10.5, 76.2),
      at(sample[1], 'b', 10.5001, 76.2001),
      at(sample[2], 'c', 10.5002, 76.2002),
    ];
    const [pin] = toPins(members, DISTRICT);
    expect(pin.kind).toBe('cluster');
    if (pin.kind === 'cluster') {
      const anchor = members.find(
        (m) =>
          m.coordinates.latitude === pin.coordinate.latitude &&
          m.coordinates.longitude === pin.coordinate.longitude,
      );
      expect(anchor).toBeDefined();
      expect(pin.label).toBe(anchor?.markerPrice);
      expect(pin.bounds.south).toBeLessThanOrEqual(pin.bounds.north);
      expect(pin.bounds.west).toBeLessThanOrEqual(pin.bounds.east);
    }
  });

  it('separates more as the map zooms in', () => {
    const wide = toPins(sample, DISTRICT).length;
    const town = toPins(sample, { longitudeDelta: 0.03, widthPx: 390 }).length;
    expect(town).toBeGreaterThanOrEqual(wide);
  });
});
