import type { Filters, StatusTab } from '@/types/api';

/**
 * Search filters, as logic rather than as screen.
 *
 * Everything here is pure TypeScript with no React and no React Native import,
 * so `npm test` can exercise it in plain Node — no Metro, no simulator, no
 * device. The Filters screen and the Search header read from this module
 * instead of each keeping their own copy of the rules.
 */
export const DEFAULT_FILTERS: Filters = {
  status: 'ForSale',
  sort: 'nearest',
  convertPrices: false,
  displayCurrency: 'INR',
};

/** History is two server statuses, not one. */
export function statusesFor(tab: StatusTab): string[] {
  return tab === 'History' ? ['Sold', 'Rented'] : [tab];
}

/**
 * The number on the Filters button. Status, sort and currency are always set
 * and live in the header where you can see them, so they are not counted.
 */
export function countActive(f: Filters): number {
  let n = 0;
  if (f.propertyType) n++;
  if (f.minPrice != null || f.maxPrice != null) n++;
  if (f.minArea != null || f.maxArea != null) n++;
  return n;
}

/**
 * What "Clear" leaves behind: the controls that live in the header, never the
 * ones inside the sheet. Both the Filters screen's Clear button and the
 * provider's reset go through this, so they cannot drift apart.
 */
export function clearFilters(f: Filters): Filters {
  return {
    status: f.status,
    sort: f.sort,
    convertPrices: f.convertPrices,
    displayCurrency: f.displayCurrency,
    place: f.place,
  };
}
