/**
 * Area units, as logic rather than as screen.
 *
 * The database always stores area in SQUARE METRES; a Kerala broker quotes
 * CENTS. Everything the app shows or sends goes through here, so a typed
 * "10 cents" and the `lotSizeSqm` it becomes can never drift apart.
 *
 * Twin of the web's `frontend/.../lib/utils/Units.scala` — the same four
 * factors, to the same digits. Keep them identical: the two clients write the
 * same column.
 */
export const AREA_UNITS = ['sqm', 'sqft', 'acre', 'cent'] as const;

export type AreaUnit = (typeof AREA_UNITS)[number];

const SQM_TO_SQFT = 10.7639;
const SQM_PER_ACRE = 4046.8564224;
const SQM_PER_CENT = 40.468564224;

export function isAreaUnit(value: string | undefined | null): value is AreaUnit {
  return value != null && (AREA_UNITS as readonly string[]).includes(value);
}

/** A stated area in `unit` as square metres — what the server stores. */
export function toSqm(value: number, unit: AreaUnit): number {
  if (!Number.isFinite(value)) return 0;
  switch (unit) {
    case 'sqm':
      return value;
    case 'sqft':
      return value / SQM_TO_SQFT;
    case 'acre':
      return value * SQM_PER_ACRE;
    case 'cent':
      return value * SQM_PER_CENT;
  }
}

/** Square metres back in `unit` — the round trip of `toSqm`. */
export function fromSqm(sqm: number, unit: AreaUnit): number {
  if (!Number.isFinite(sqm)) return 0;
  switch (unit) {
    case 'sqm':
      return sqm;
    case 'sqft':
      return sqm * SQM_TO_SQFT;
    case 'acre':
      return sqm / SQM_PER_ACRE;
    case 'cent':
      return sqm / SQM_PER_CENT;
  }
}

/** Acre and cent carry two decimals; sq.m and sq.ft are whole numbers. */
function digitsFor(unit: AreaUnit): number {
  return unit === 'acre' || unit === 'cent' ? 2 : 0;
}

const SINGULAR: Record<AreaUnit, string> = {
  sqm: 'sq.m',
  sqft: 'sq.ft',
  acre: 'acre',
  cent: 'cent',
};

const PLURAL: Record<AreaUnit, string> = {
  sqm: 'sq.m',
  sqft: 'sq.ft',
  acre: 'acres',
  cent: 'cents',
};

/**
 * "10 cents", "1 acre", "4,047 sq.m" — the label pluralises off the ROUNDED
 * value, as the web does, so 1.0036 acres reads "1 acre" and not "1 acres".
 */
export function formatArea(sqm: number, unit: AreaUnit, locale = 'en-IN'): string {
  const digits = digitsFor(unit);
  const factor = Math.pow(10, digits);
  const rounded = Math.round(fromSqm(sqm, unit) * factor) / factor;
  const number = rounded.toLocaleString(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
  return `${number} ${rounded === 1 ? SINGULAR[unit] : PLURAL[unit]}`;
}
