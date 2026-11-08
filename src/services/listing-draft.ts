import { fromSqm, toSqm, type AreaUnit } from '@/services/area';
import type { Coordinate, PricingRules } from '@/types/api';

/**
 * What the create flow decides, as logic rather than as screen.
 *
 * Three rules live here, and all three are the server's rules restated so the
 * phone can answer them before asking:
 *
 *  1. **A per-area ask is a RATE, not money.** `askAmount` with an
 *     `askAreaUnit` is ₹ per cent; the money is `askAmount × the area`. The
 *     web learned this the hard way (2026-10-05: a 100-cent plot at
 *     ₹1,00,000/cent recorded as having sold for ₹1,00,000), and a listing is
 *     an immutable record — the number has one chance to be right.
 *  2. **What publish requires**, from `FieldValidator.validateForPublish`:
 *     a location, a price, "details", at least one UPLOADED photo, and a lot
 *     size whenever the ask is per area.
 *  3. **Which per-area units a sub-type allows**, from the server's
 *     `pricingRules` — a cent price on a house is refused at publish.
 *
 * No React, no React Native import: `npm test` runs it in plain Node.
 */

/** The price row's choices: a flat total, or a rate per unit of area. */
export const PRICE_BASES = ['total', 'per_cent', 'per_acre', 'per_sqft', 'per_sqm'] as const;

export type PriceBasis = (typeof PRICE_BASES)[number];

/** The area unit a per-area basis is quoted in. */
const BASIS_UNIT: Record<Exclude<PriceBasis, 'total'>, AreaUnit> = {
  per_cent: 'cent',
  per_acre: 'acre',
  per_sqft: 'sqft',
  per_sqm: 'sqm',
};

export const PRICE_BASIS_LABEL: Record<PriceBasis, string> = {
  total: 'Total',
  per_cent: 'Per cent',
  per_acre: 'Per acre',
  per_sqft: 'Per sq.ft',
  per_sqm: 'Per sq.m',
};

/** Short form for a rate, as the price line reads it: "₹1,00,000 / cent". */
export const PRICE_BASIS_SUFFIX: Record<Exclude<PriceBasis, 'total'>, string> = {
  per_cent: 'cent',
  per_acre: 'acre',
  per_sqft: 'sq.ft',
  per_sqm: 'sq.m',
};

export function isPriceBasis(value: string | undefined | null): value is PriceBasis {
  return value != null && (PRICE_BASES as readonly string[]).includes(value);
}

/**
 * The bases this sub-type and status may use, in the server's own order,
 * `total` always first. The server refuses the rest at publish
 * (`PricingRules.isAreaUnitAllowed`), so offering them would be a trap:
 * a house takes per sq.ft and per sq.m, a plot adds per cent, agricultural
 * land takes per acre and per cent and nothing else.
 */
export function allowedPriceBases(
  rules: PricingRules | undefined,
  subType: string,
  status: string,
): PriceBasis[] {
  const allowed = rules?.[subType]?.[status]?.allowedAreaUnits ?? [];
  return ['total', ...allowed.filter(isPriceBasis)];
}

/** Two decimal places, half up — the scale the server stores money at. */
function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The TOTAL asking price: `askAmountTotal`.
 *
 * Twin of the backend's `PricingRules.totalForArea`. When the stated area is
 * already in the basis's own unit — 10 cents at ₹1,00,000 per cent, the
 * Kerala case — it is a plain multiplication and exact to the rupee; any
 * other pairing converts once through square metres.
 *
 * `null` means "no total can be worked out yet" — a rate with no area.
 */
export function impliedTotal(input: {
  priceAmount: number;
  priceBasis: PriceBasis;
  areaValue: number;
  areaUnit: AreaUnit;
}): number | null {
  const { priceAmount, priceBasis, areaValue, areaUnit } = input;
  if (!(priceAmount > 0)) return null;
  if (priceBasis === 'total') return money(priceAmount);
  if (!(areaValue > 0)) return null;

  const unit = BASIS_UNIT[priceBasis];
  const count = unit === areaUnit ? areaValue : fromSqm(toSqm(areaValue, areaUnit), unit);
  return money(priceAmount * count);
}

/* ---------- the draft the flow is building ---------- */

/** The parts of a location the server stores beside the pin. */
export interface DraftAddress {
  addressDisplay?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  neighborhood?: string;
}

export interface DraftState {
  /** The for-sale / for-rent switch — the server calls it `status`. */
  status: 'ForSale' | 'ForRent';
  /** Empty until the broker picks one; the flow will not publish without it. */
  propertyType: string;
  propertySubType: string;
  pin: Coordinate | null;
  address: DraftAddress;
  priceAmount: number;
  priceBasis: PriceBasis;
  areaValue: number;
  areaUnit: AreaUnit;
  currency: string;
  description: string;
  /** Owner / broker, or undefined for "not stated" — never claimable. */
  listedByOwner?: boolean;
  /** Photos that actually landed on the server, not ones still uploading. */
  uploadedPhotos: number;
}

export type MissingKey = 'photo' | 'location' | 'type' | 'price' | 'area' | 'details';

export interface MissingItem {
  key: MissingKey;
  /** Reads as a list item after "Still needed: …". */
  label: string;
}

/**
 * What the server would still refuse, named in the words the broker can act
 * on. The order is the flow's order: a photo, where it is, what it is, what
 * it costs.
 *
 * `area` and `details` are two different server rules that the same answer
 * satisfies, so `area` suppresses `details` rather than saying it twice.
 */
export function missingForPublish(d: DraftState): MissingItem[] {
  const out: MissingItem[] = [];

  if (d.uploadedPhotos < 1) out.push({ key: 'photo', label: 'one photo' });
  if (!d.pin || (d.pin.latitude === 0 && d.pin.longitude === 0))
    out.push({ key: 'location', label: 'the location pin' });
  if (!d.propertySubType) out.push({ key: 'type', label: 'the property type' });
  if (!(d.priceAmount > 0)) out.push({ key: 'price', label: 'a price' });

  const needsArea = d.priceBasis !== 'total';
  if (needsArea && !(d.areaValue > 0)) {
    out.push({
      key: 'area',
      label: `the area — the price is ${PRICE_BASIS_LABEL[d.priceBasis].toLowerCase()}`,
    });
  } else if (!(d.areaValue > 0) && d.description.trim() === '') {
    out.push({ key: 'details', label: 'the area or a description' });
  }

  return out;
}

export function canPublish(d: DraftState): boolean {
  return missingForPublish(d).length === 0;
}

/**
 * The body of `PUT /api/v1/drafts/:id`.
 *
 * Three things about that route decide the shape:
 *
 *  - `location` is decoded **whole or not at all**, and a partial object
 *    NULLs the keys it leaves out. So it goes in complete, and only once
 *    there is a pin — sending latitude 0 would erase a real one.
 *  - `askAreaUnit` is read **only when `askAmount` is in the body**, and its
 *    absence clears it. So price always travels as one piece: amount, unit,
 *    total, currency.
 *  - `askAmountTotal` is taken verbatim when it is greater than zero, and
 *    computed by the server at publish when it is not. We send our own so the
 *    number the broker was shown is the number recorded.
 */
export function draftPayload(d: DraftState): Record<string, unknown> {
  const body: Record<string, unknown> = {
    status: d.status,
    askAmount: d.priceAmount,
    askAmountTotal: impliedTotal(d) ?? 0,
    askCurrency: d.currency,
    lotSizeSqm: d.areaValue > 0 ? toSqm(d.areaValue, d.areaUnit) : 0,
    lotSizeDisplayUnit: d.areaUnit,
  };

  if (d.propertyType) body.propertyType = d.propertyType;
  if (d.propertySubType) body.propertySubType = d.propertySubType;
  if (d.priceBasis !== 'total') body.askAreaUnit = d.priceBasis;
  if (d.status === 'ForRent') body.askTimeUnit = 'per_month';
  if (d.description.trim()) body.description = d.description.trim();
  if (typeof d.listedByOwner === 'boolean') body.listedByOwner = d.listedByOwner;

  if (d.pin && (d.pin.latitude !== 0 || d.pin.longitude !== 0)) {
    body.location = {
      latitude: d.pin.latitude,
      longitude: d.pin.longitude,
      ...d.address,
    };
  }

  return body;
}
