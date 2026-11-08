import { describe, expect, it } from 'vitest';

import { AREA_UNITS, formatArea, fromSqm, isAreaUnit, toSqm } from '@/services/area';

describe('toSqm', () => {
  it('converts the units a Kerala broker quotes', () => {
    // 1 cent = 1/100 acre. The web's Units.scala uses these exact factors.
    expect(toSqm(1, 'cent')).toBeCloseTo(40.468564224, 6);
    expect(toSqm(10, 'cent')).toBeCloseTo(404.68564224, 6);
    expect(toSqm(1, 'acre')).toBeCloseTo(4046.8564224, 6);
    expect(toSqm(1, 'sqm')).toBe(1);
    expect(toSqm(1000, 'sqft')).toBeCloseTo(92.903, 3);
  });

  it('is zero for nonsense rather than NaN', () => {
    expect(toSqm(Number.NaN, 'cent')).toBe(0);
    expect(toSqm(Number.POSITIVE_INFINITY, 'cent')).toBe(0);
  });
});

describe('fromSqm', () => {
  it('round-trips every unit', () => {
    for (const unit of AREA_UNITS) {
      expect(fromSqm(toSqm(7.5, unit), unit)).toBeCloseTo(7.5, 6);
    }
  });

  it('reads a stored lot size back in cents', () => {
    expect(fromSqm(404.68564224, 'cent')).toBeCloseTo(10, 6);
  });
});

describe('formatArea', () => {
  it('pluralises off the rounded value, not the raw one', () => {
    expect(formatArea(toSqm(1, 'acre'), 'acre')).toBe('1 acre');
    // 1.0036 acres rounds to 1 and must not read "1 acres".
    expect(formatArea(toSqm(1.0036, 'acre'), 'acre')).toBe('1 acre');
    expect(formatArea(toSqm(2.5, 'acre'), 'acre')).toBe('2.5 acres');
  });

  it('gives cents two decimals and square metres none', () => {
    expect(formatArea(toSqm(10, 'cent'), 'cent')).toBe('10 cents');
    expect(formatArea(toSqm(10.25, 'cent'), 'cent')).toBe('10.25 cents');
    expect(formatArea(404.68564224, 'sqm')).toBe('405 sq.m');
  });
});

describe('isAreaUnit', () => {
  it('rejects a price unit, which is a different vocabulary', () => {
    expect(isAreaUnit('cent')).toBe(true);
    expect(isAreaUnit('per_cent')).toBe(false);
    expect(isAreaUnit(undefined)).toBe(false);
  });
});
