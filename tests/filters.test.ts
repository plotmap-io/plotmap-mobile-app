import { describe, expect, it } from 'vitest';

import { countActive, DEFAULT_FILTERS, statusesFor } from '@/services/filters';
import type { Filters } from '@/types/api';

const base: Filters = DEFAULT_FILTERS;

describe('statusesFor', () => {
  it('passes a single tab through as one server status', () => {
    expect(statusesFor('ForSale')).toEqual(['ForSale']);
    expect(statusesFor('ForRent')).toEqual(['ForRent']);
  });

  it('expands History into the two closed statuses', () => {
    expect(statusesFor('History')).toEqual(['Sold', 'Rented']);
  });
});

describe('countActive', () => {
  it('counts nothing for a default filter set', () => {
    expect(countActive(base)).toBe(0);
  });

  it('ignores status, sort and currency — they are always set', () => {
    expect(countActive({ ...base, status: 'History', sort: 'price_asc', convertPrices: true }))
      .toBe(0);
  });

  it('counts a price bound once, whether one end is set or both', () => {
    expect(countActive({ ...base, minPrice: 500_000 })).toBe(1);
    expect(countActive({ ...base, minPrice: 500_000, maxPrice: 900_000 })).toBe(1);
  });

  it('counts property type, price and area as three separate badges', () => {
    expect(countActive({ ...base, propertyType: 'Land', maxPrice: 900_000, minArea: 400 }))
      .toBe(3);
  });
});
