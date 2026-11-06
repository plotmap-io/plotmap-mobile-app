import { describe, expect, it } from 'vitest';

import { devListings, devRespond, mapFeed, searchResponse } from '@/lib/dev-data';
import type { ListingCard, SearchQuery } from '@/types/api';

const box = (swLat: number, swLng: number, neLat: number, neLng: number): SearchQuery => ({
  boundsSW: { latitude: swLat, longitude: swLng },
  boundsNE: { latitude: neLat, longitude: neLng },
});

const WORLD = box(-90, -180, 90, 180);
const KERALA = box(8, 74.8, 13, 77.8);
const THRISSUR_DISTRICT = box(10.2, 75.9, 10.9, 76.6);
const THRISSUR_TOWN = box(10.48, 76.16, 10.58, 76.26);

const find = (id: string) => devListings.find((l) => l.id === id);
const inBox = (q: SearchQuery) => searchResponse({ ...q, limit: 10000 }).listings;

describe('coverage', () => {
  it('is about half Kerala and half everywhere else', () => {
    const kerala = inBox(KERALA).length;
    const world = inBox(WORLD).length;
    expect(world).toBeGreaterThan(2000);
    expect(kerala / world).toBeGreaterThan(0.45);
    expect(kerala / world).toBeLessThan(0.6);
  });

  it('puts half of Kerala in the district the app opens on', () => {
    expect(inBox(THRISSUR_DISTRICT).length / inBox(KERALA).length).toBeGreaterThan(0.45);
  });

  it('carries every property type crossed with every status', () => {
    const seen = new Set(
      inBox(THRISSUR_DISTRICT).map((l) => `${l.propertyType}/${l.propertySubType}/${l.status}`),
    );
    for (const kind of ['Land/Residential Plot', 'Residential/Apartment', 'Commercial/Office']) {
      for (const status of ['ForSale', 'ForRent', 'Sold', 'Rented']) {
        expect(seen.has(`${kind}/${status}`)).toBe(true);
      }
    }
  });

  it('reproduces the lower-cased type that older real rows still use', () => {
    expect(devListings.some((l) => l.propertyType === 'land')).toBe(true);
    expect(devListings.some((l) => l.propertyType === 'Land')).toBe(true);
  });

  it('prices each region in its own currency', () => {
    const currencies = new Set(inBox(WORLD).map((l) => l.askCurrency));
    expect(currencies.size).toBeGreaterThan(10);
    for (const code of ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AED', 'ZAR', 'BRL']) {
      expect(currencies.has(code)).toBe(true);
    }
  });

  it('formats lakh currencies differently from the rest', () => {
    const inr = inBox(KERALA).find((l) => l.askCurrency === 'INR' && l.askAmount > 10000000);
    expect(inr?.markerPrice).toMatch(/^₹ [\d.]+ Cr$/);
    const usd = inBox(WORLD)
      .filter((l) => l.askCurrency === 'USD')
      .sort((a, b) => b.askAmount - a.askAmount)[0];
    expect(usd.markerPrice).toMatch(/^\$ [\d.]+M$/);
    expect(usd.markerPrice).not.toMatch(/L|Cr/);
  });

  it('gives almost every listing more than one photo', () => {
    const rows = inBox(WORLD);
    const many = rows.filter((l: ListingCard) => l.images.length > 1).length;
    expect(many / rows.length).toBeGreaterThan(0.95);
    expect(rows.every((l) => l.images.every((u) => u.startsWith('https://')))).toBe(true);
  });
});

describe('the awkward cases', () => {
  it('stacks two listings on one coordinate', () => {
    expect(find('edge-same-point-a')?.coordinates).toEqual(find('edge-same-point-b')?.coordinates);
  });

  it('keeps a knot too tight for any map to draw apart', () => {
    expect(devListings.filter((l) => l.id.startsWith('edge-knot-'))).toHaveLength(14);
  });

  it('goes up to a hundredth floor, and below ground', () => {
    const floor = (id: string) =>
      find(id)?.highlightFields.find((f) => f.key === 'floor')?.value;
    expect(floor('edge-hundredth-floor')).toBe(100);
    expect(floor('edge-ground-floor')).toBe(0);
    expect(floor('edge-basement')).toBe(-2);
  });

  it('covers an empty gallery, a single photo and thirty', () => {
    expect(find('edge-no-photos')?.images).toHaveLength(0);
    expect(find('edge-one-photo')?.images).toHaveLength(1);
    expect(find('edge-thirty-photos')?.images).toHaveLength(30);
  });

  it('straddles the antimeridian, the equator and both poles-ward extremes', () => {
    expect(find('edge-antimeridian-east')!.coordinates.longitude).toBeGreaterThan(179);
    expect(find('edge-antimeridian-west')!.coordinates.longitude).toBeLessThan(-179);
    expect(find('edge-equator')!.coordinates.latitude).toBe(0);
    expect(find('edge-high-latitude')!.coordinates.latitude).toBeGreaterThan(60);
    expect(find('edge-southern-tip')!.coordinates.latitude).toBeLessThan(-50);
  });

  it('has a row with nothing to highlight and one with a very long address', () => {
    expect(find('edge-no-highlights')?.highlightFields).toEqual([]);
    expect(find('edge-long-address')!.addressDisplay.length).toBeGreaterThan(80);
  });
});

describe('search', () => {
  it('reports the whole match count while returning one page', () => {
    const page = searchResponse({ ...THRISSUR_DISTRICT, limit: 60, offset: 0 });
    expect(page.listings).toHaveLength(60);
    expect(page.total).toBeGreaterThan(60);
  });

  it('advances with the offset', () => {
    const a = searchResponse({ ...THRISSUR_DISTRICT, limit: 10, offset: 0 });
    const b = searchResponse({ ...THRISSUR_DISTRICT, limit: 10, offset: 10 });
    expect(b.listings.map((l) => l.id)).not.toEqual(a.listings.map((l) => l.id));
  });

  it('drops anything outside the viewport', () => {
    expect(inBox(THRISSUR_DISTRICT).some((l) => l.city === 'Tokyo')).toBe(false);
  });
});

describe('the marker feed', () => {
  it('returns exact points for a town, under the 500 ceiling', () => {
    const feed = mapFeed({ ...THRISSUR_TOWN, zoom: 14 });
    expect(feed.binned).toBe(false);
    expect((feed.listings as unknown[]).length).toBe(feed.total);
  });

  it('counts every listing exactly once when it bins', () => {
    const feed = mapFeed({ ...WORLD, zoom: 3 });
    expect(feed.binned).toBe(true);
    const items = feed.listings as { count?: number }[];
    expect(items.reduce((n, i) => n + (i.count ?? 1), 0)).toBe(feed.total);
    expect(items.length).toBeLessThan(feed.total as number);
  });

  it('gives an aggregate no single price and a bin id', () => {
    const items = mapFeed({ ...WORLD, zoom: 3 }).listings as Record<string, unknown>[];
    const bin = items.find((i) => (i.count as number) > 1)!;
    expect(String(bin.id)).toMatch(/^bin:/);
    expect(bin.markerPrice).toBeUndefined();
    expect(bin.bbox).toBeTruthy();
  });
});

describe('what never reaches the network', () => {
  it('answers place search locally, because upstream it is billed', () => {
    const rows = devRespond('/api/v1/search/autocomplete?q=thrissur&limit=8', 'GET', undefined);
    expect(Array.isArray(rows)).toBe(true);
    expect((rows as unknown[]).length).toBeGreaterThan(0);
  });

  it('encodes coordinates into the place id, so picking one costs nothing either', () => {
    const rows = devRespond('/api/v1/search/autocomplete?q=kochi', 'GET', undefined) as {
      placeId: string;
    }[];
    const payload = rows[0].placeId;
    const decoded = JSON.parse(globalThis.atob(payload.slice(payload.indexOf(':') + 1)));
    expect(decoded.latitude).toBeCloseTo(9.9312, 3);
    expect(decoded.viewport.southwest.lat).toBeLessThan(decoded.viewport.northeast.lat);
  });

  it('still lets a route it cannot answer fail honestly', () => {
    expect(devRespond('/api/v1/auth/me', 'GET', undefined)).toBeUndefined();
    expect(devRespond('/api/v1/auth/verify', 'POST', {})).toBeUndefined();
  });
});
