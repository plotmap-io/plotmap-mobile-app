import { describe, expect, it } from 'vitest';

import { toSqm } from '@/services/area';
import {
  allowedPriceBases,
  canPublish,
  draftPayload,
  impliedTotal,
  missingForPublish,
  type DraftState,
} from '@/services/listing-draft';
import type { PricingRules } from '@/types/api';

/** A ten-cent plot in Mullurkara at ₹1,00,000 per cent, with one photo up. */
function ready(over: Partial<DraftState> = {}): DraftState {
  return {
    status: 'ForSale',
    propertyType: 'Land',
    propertySubType: 'residential_plot',
    pin: { latitude: 10.6342, longitude: 76.2178 },
    address: { addressDisplay: 'Chelakkara Road, Mullurkara', city: 'Mullurkara' },
    priceAmount: 100000,
    priceBasis: 'per_cent',
    areaValue: 10,
    areaUnit: 'cent',
    currency: 'INR',
    description: '',
    uploadedPhotos: 1,
    ...over,
  };
}

describe('impliedTotal', () => {
  it('is the RATE times the area, not the rate', () => {
    // The 2026-10-05 bug: this plot is worth ₹10,00,000, not ₹1,00,000.
    expect(impliedTotal(ready())).toBe(1000000);
  });

  it('is exact when the area is already in the basis unit', () => {
    expect(impliedTotal(ready({ areaValue: 7, priceAmount: 123456 }))).toBe(864192);
  });

  it('converts once through square metres when the units differ', () => {
    // 10 cents = 404.68564224 sq.m, at ₹500 per sq.m.
    expect(impliedTotal(ready({ priceBasis: 'per_sqm', priceAmount: 500 }))).toBe(202342.82);
  });

  it('passes a flat total straight through', () => {
    expect(impliedTotal(ready({ priceBasis: 'total', priceAmount: 4200000 }))).toBe(4200000);
    // …and a flat total needs no area at all.
    expect(impliedTotal(ready({ priceBasis: 'total', priceAmount: 4200000, areaValue: 0 }))).toBe(
      4200000,
    );
  });

  it('has no answer for a rate with no area, or no price', () => {
    expect(impliedTotal(ready({ areaValue: 0 }))).toBeNull();
    expect(impliedTotal(ready({ priceAmount: 0 }))).toBeNull();
  });
});

describe('allowedPriceBases', () => {
  const rules: PricingRules = {
    residential_plot: { ForSale: { allowedAreaUnits: ['per_cent', 'per_sqft', 'per_sqm'] } },
    house: { ForSale: { allowedAreaUnits: ['per_sqft', 'per_sqm'] } },
    agricultural_land: { ForSale: { allowedAreaUnits: ['per_acre', 'per_cent'] } },
  };

  it('offers only what the sub-type allows, Total first', () => {
    expect(allowedPriceBases(rules, 'residential_plot', 'ForSale')).toEqual([
      'total',
      'per_cent',
      'per_sqft',
      'per_sqm',
    ]);
    // A house has no per-cent price: the server refuses it at publish.
    expect(allowedPriceBases(rules, 'house', 'ForSale')).toEqual([
      'total',
      'per_sqft',
      'per_sqm',
    ]);
    expect(allowedPriceBases(rules, 'agricultural_land', 'ForSale')).toEqual([
      'total',
      'per_acre',
      'per_cent',
    ]);
  });

  it('falls back to a flat total when the server said nothing', () => {
    expect(allowedPriceBases(undefined, 'residential_plot', 'ForSale')).toEqual(['total']);
    expect(allowedPriceBases(rules, 'residential_plot', 'ForRent')).toEqual(['total']);
    expect(allowedPriceBases(rules, 'unknown_thing', 'ForSale')).toEqual(['total']);
  });
});

describe('missingForPublish', () => {
  it('is empty for a draft the server would accept', () => {
    expect(missingForPublish(ready())).toEqual([]);
    expect(canPublish(ready())).toBe(true);
  });

  it('names a missing photo — the rule mobile could never satisfy before', () => {
    expect(missingForPublish(ready({ uploadedPhotos: 0 })).map((m) => m.key)).toEqual(['photo']);
  });

  it('names the pin, the type and the price', () => {
    expect(missingForPublish(ready({ pin: null }))[0].key).toBe('location');
    // (0, 0) is how an empty draft stores "nowhere", and publish refuses it.
    expect(missingForPublish(ready({ pin: { latitude: 0, longitude: 0 } }))[0].key).toBe(
      'location',
    );
    expect(missingForPublish(ready({ propertySubType: '' }))[0].key).toBe('type');
    expect(missingForPublish(ready({ priceAmount: 0 }))[0].key).toBe('price');
  });

  it('asks for the area when the price is a rate', () => {
    const missing = missingForPublish(ready({ areaValue: 0 }));
    expect(missing.map((m) => m.key)).toEqual(['area']);
    expect(missing[0].label).toContain('per cent');
  });

  it('asks for the area OR a description when the price is a total', () => {
    // The server's "details" rule: a field, a description, or an area.
    expect(missingForPublish(ready({ priceBasis: 'total', areaValue: 0 }))[0].key).toBe('details');
    expect(
      missingForPublish(ready({ priceBasis: 'total', areaValue: 0, description: 'Road frontage' })),
    ).toEqual([]);
  });

  it('lists everything an untouched draft is missing, in the flow order', () => {
    const empty: DraftState = {
      status: 'ForSale',
      propertyType: '',
      propertySubType: '',
      pin: null,
      address: {},
      priceAmount: 0,
      priceBasis: 'total',
      areaValue: 0,
      areaUnit: 'cent',
      currency: 'INR',
      description: '',
      uploadedPhotos: 0,
    };
    expect(missingForPublish(empty).map((m) => m.key)).toEqual([
      'photo',
      'location',
      'type',
      'price',
      'details',
    ]);
    expect(canPublish(empty)).toBe(false);
  });
});

describe('draftPayload', () => {
  it('writes the rate, the unit, the total and the area in square metres', () => {
    const body = draftPayload(ready());
    expect(body.askAmount).toBe(100000);
    expect(body.askAreaUnit).toBe('per_cent');
    expect(body.askAmountTotal).toBe(1000000);
    expect(body.askCurrency).toBe('INR');
    expect(body.lotSizeSqm).toBeCloseTo(toSqm(10, 'cent'), 6);
    expect(body.lotSizeDisplayUnit).toBe('cent');
    expect(body.propertyType).toBe('Land');
    expect(body.propertySubType).toBe('residential_plot');
    expect(body.status).toBe('ForSale');
  });

  it('omits askAreaUnit for a flat total, which is how the server clears it', () => {
    const body = draftPayload(ready({ priceBasis: 'total', priceAmount: 4200000 }));
    expect('askAreaUnit' in body).toBe(false);
    expect(body.askAmountTotal).toBe(4200000);
  });

  it('sends the whole location object, and only once there is a pin', () => {
    const body = draftPayload(ready());
    expect(body.location).toEqual({
      latitude: 10.6342,
      longitude: 76.2178,
      addressDisplay: 'Chelakkara Road, Mullurkara',
      city: 'Mullurkara',
    });
    // A partial or zeroed location would overwrite a real one with NULLs.
    expect('location' in draftPayload(ready({ pin: null }))).toBe(false);
  });

  it('gives a rent a monthly frequency and a sale none', () => {
    expect(draftPayload(ready({ status: 'ForRent' })).askTimeUnit).toBe('per_month');
    expect('askTimeUnit' in draftPayload(ready())).toBe(false);
  });

  it('leaves "Listed by" unsaid unless it was tapped', () => {
    expect('listedByOwner' in draftPayload(ready())).toBe(false);
    expect(draftPayload(ready({ listedByOwner: true })).listedByOwner).toBe(true);
    expect(draftPayload(ready({ listedByOwner: false })).listedByOwner).toBe(false);
  });

  it('trims a description and omits an empty one', () => {
    expect(draftPayload(ready({ description: '  Road frontage.  ' })).description).toBe(
      'Road frontage.',
    );
    expect('description' in draftPayload(ready({ description: '   ' }))).toBe(false);
  });
});
