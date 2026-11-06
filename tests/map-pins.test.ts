import { describe, expect, it } from 'vitest';

import { devListings } from '@/lib/dev-data';
import { toPins } from '@/services/map-pins';

/** The sample dataset stands in for a viewport's worth of results. */
const sample = devListings.slice(0, 200);

describe('toPins', () => {
  it('draws one pin per listing', () => {
    expect(toPins(sample)).toHaveLength(sample.length);
  });

  it('gives every pin an id of its own, so markers reconcile', () => {
    const ids = toPins(sample).map((p) => p.id);
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
  });
});
