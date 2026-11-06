import { describe, expect, it } from 'vitest';

import { devListings, devRespond, mapFeed, searchResponse } from '@/lib/dev-data';
import type { SearchQuery } from '@/types/api';

const KERALA: SearchQuery = {
  boundsSW: { latitude: 8.0, longitude: 74.8 },
  boundsNE: { latitude: 13.0, longitude: 77.8 },
};
const THRISSUR_DISTRICT: SearchQuery = {
  boundsSW: { latitude: 10.2, longitude: 75.9 },
  boundsNE: { latitude: 10.9, longitude: 76.6 },
};

describe('the sample dataset', () => {
  it('is big enough that a state-wide view crosses the 500-point ceiling', () => {
    expect(mapFeed({ ...KERALA, zoom: 8 }).total).toBeGreaterThan(500);
  });

  it('keeps a district under the ceiling, so that view is exact points', () => {
    const feed = mapFeed({ ...THRISSUR_DISTRICT, zoom: 11 });
    expect(feed.binned).toBe(false);
    expect(feed.total).toBeLessThanOrEqual(500);
  });

  it('carries the awkward cases, not just an even spread', () => {
    const at = (id: string) => devListings.find((l) => l.id === id);
    const a = at('edge-same-point-a');
    const b = at('edge-same-point-b');
    expect(a?.coordinates).toEqual(b?.coordinates);
    expect(devListings.filter((l) => l.id.startsWith('edge-knot-'))).toHaveLength(14);
    expect(at('edge-priciest')?.markerPrice).toBe('₹ 48.0 Cr');
    expect(at('edge-cheapest')?.markerPrice).toBe('₹ 1.2 L');
    expect(at('edge-no-photos')?.images).toEqual([]);
    expect(at('edge-no-highlights')?.highlightFields).toEqual([]);
  });
});

describe('search', () => {
  it('reports the whole match count while returning one page', () => {
    const page = searchResponse({ ...THRISSUR_DISTRICT, limit: 20, offset: 0 });
    expect(page.listings).toHaveLength(20);
    expect(page.total).toBeGreaterThan(20);
    expect(page.offset).toBe(0);
  });

  it('advances with the offset', () => {
    const first = searchResponse({ ...THRISSUR_DISTRICT, limit: 10, offset: 0 });
    const second = searchResponse({ ...THRISSUR_DISTRICT, limit: 10, offset: 10 });
    expect(second.listings.map((l) => l.id)).not.toEqual(first.listings.map((l) => l.id));
  });

  it('drops anything outside the viewport', () => {
    const inside = searchResponse({ ...THRISSUR_DISTRICT, limit: 1000 });
    expect(inside.listings.some((l) => l.id === 'edge-far-outlier')).toBe(false);
  });
});

describe('the marker feed', () => {
  it('counts every listing exactly once when it bins', () => {
    const feed = mapFeed({ ...KERALA, zoom: 8 });
    expect(feed.binned).toBe(true);
    const items = feed.listings as { count?: number }[];
    const counted = items.reduce((n, item) => n + (item.count ?? 1), 0);
    expect(counted).toBe(feed.total);
    expect(items.length).toBeLessThan(feed.total as number);
  });

  it('gives an aggregate no single price and a bin id', () => {
    const items = mapFeed({ ...KERALA, zoom: 8 }).listings as Record<string, unknown>[];
    const bin = items.find((i) => (i.count as number) > 1)!;
    expect(String(bin.id)).toMatch(/^bin:/);
    expect(bin.markerPrice).toBeUndefined();
    expect(bin.priceLo).toBeTruthy();
    expect(bin.bbox).toBeTruthy();
  });
});

describe('devRespond', () => {
  it('leaves routes it cannot answer to the network', () => {
    expect(devRespond('/api/v1/auth/me', 'GET', undefined)).toBeUndefined();
    expect(devRespond('/api/v1/auth/verify', 'POST', {})).toBeUndefined();
  });

  it('answers a listing page for a row it generated', () => {
    const detail = devRespond('/api/v1/listings/edge-same-point-a', 'GET', undefined);
    expect(detail).toMatchObject({ id: 'edge-same-point-a', askCurrency: 'INR' });
  });
});
