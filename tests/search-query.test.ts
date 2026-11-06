import { describe, expect, it } from 'vitest';

import { devListings, searchResponse } from '@/lib/dev-data';
import { INITIAL_REGION } from '@/lib/region';
import { DEFAULT_FILTERS } from '@/services/filters';
import { boundsOf, PAGE_SIZE, queryFrom } from '@/services/search-query';
import type { Filters } from '@/types/api';

/**
 * The query builder is the only place that decides which filters reach the
 * server, so these run twice over: once on the query it produces, and once on
 * the sample dataset, which answers the same query shape the backend does.
 */
describe('boundsOf', () => {
  it('turns a centre and a span into the two corners', () => {
    const b = boundsOf({
      latitude: 10,
      longitude: 76,
      latitudeDelta: 2,
      longitudeDelta: 4,
    });
    expect(b.boundsSW).toEqual({ latitude: 9, longitude: 74 });
    expect(b.boundsNE).toEqual({ latitude: 11, longitude: 78 });
    expect(b.center).toEqual({ latitude: 10, longitude: 76 });
  });
});

describe('queryFrom', () => {
  it('sends the status, the sort and a page size', () => {
    const q = queryFrom(DEFAULT_FILTERS, INITIAL_REGION);
    expect(q.status).toEqual(['ForSale']);
    expect(q.sort).toBe('nearest');
    expect(q.limit).toBe(PAGE_SIZE);
  });

  it('expands the History tab into both closed statuses', () => {
    expect(queryFrom({ ...DEFAULT_FILTERS, status: 'History' }, INITIAL_REGION).status).toEqual([
      'Sold',
      'Rented',
    ]);
  });

  it('leaves an unset bound out of the query rather than sending null', () => {
    const q = queryFrom(DEFAULT_FILTERS, INITIAL_REGION);
    expect('minPrice' in q).toBe(false);
    expect('maxArea' in q).toBe(false);
    expect('displayCurrency' in q).toBe(false);
  });

  it('carries every bound the user did set', () => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      propertyType: 'Land',
      minPrice: 500_000,
      maxPrice: 9_000_000,
      minArea: 400,
      maxArea: 4_000,
    };
    const q = queryFrom(filters, INITIAL_REGION);
    expect(q.propertyType).toEqual(['Land']);
    expect(q.minPrice).toBe(500_000);
    expect(q.maxPrice).toBe(9_000_000);
    expect(q.minArea).toBe(400);
    expect(q.maxArea).toBe(4_000);
  });

  it('only asks for converted prices when the switch is on', () => {
    const off = queryFrom(DEFAULT_FILTERS, INITIAL_REGION);
    expect(off.convertPrices).toBeUndefined();

    const on = queryFrom(
      { ...DEFAULT_FILTERS, convertPrices: true, displayCurrency: 'USD' },
      INITIAL_REGION,
    );
    expect(on.convertPrices).toBe(true);
    expect(on.displayCurrency).toBe('USD');
  });
});

describe('the query against the sample dataset', () => {
  const region = INITIAL_REGION;

  it('returns rows, and never more than the page size', () => {
    const res = searchResponse(queryFrom(DEFAULT_FILTERS, region));
    expect(res.total).toBeGreaterThan(0);
    expect(res.listings.length).toBeLessThanOrEqual(PAGE_SIZE);
  });

  it('keeps every row inside the viewport it was asked for', () => {
    const q = queryFrom(DEFAULT_FILTERS, region);
    for (const row of searchResponse(q).listings) {
      expect(row.coordinates.latitude).toBeGreaterThanOrEqual(q.boundsSW!.latitude);
      expect(row.coordinates.latitude).toBeLessThanOrEqual(q.boundsNE!.latitude);
      expect(row.coordinates.longitude).toBeGreaterThanOrEqual(q.boundsSW!.longitude);
      expect(row.coordinates.longitude).toBeLessThanOrEqual(q.boundsNE!.longitude);
    }
  });

  it('narrows the total when a price ceiling is added', () => {
    const all = searchResponse(queryFrom(DEFAULT_FILTERS, region)).total;
    const capped = searchResponse(
      queryFrom({ ...DEFAULT_FILTERS, maxPrice: 2_000_000 }, region),
    ).total;
    expect(capped).toBeGreaterThan(0);
    expect(capped).toBeLessThan(all);
  });

  it('has sample data to filter in the first place', () => {
    expect(devListings.length).toBeGreaterThan(100);
  });
});
