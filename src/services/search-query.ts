import type { MapRegion } from '@/lib/region';
import { statusesFor } from '@/services/filters';
import type { Filters, SearchQuery } from '@/types/api';

/**
 * Turning what the user is looking at into what the server is asked.
 *
 * This is the only place that decides which filters reach the backend, which
 * is why it is a plain function and not a few lines inside a hook: a filter
 * that never makes it into the query is a bug you can write a test for.
 */
export const PAGE_SIZE = 60;

/** A region is a centre and a span; the search API wants two corners. */
export function boundsOf(region: MapRegion) {
  return {
    boundsSW: {
      latitude: region.latitude - region.latitudeDelta / 2,
      longitude: region.longitude - region.longitudeDelta / 2,
    },
    boundsNE: {
      latitude: region.latitude + region.latitudeDelta / 2,
      longitude: region.longitude + region.longitudeDelta / 2,
    },
    center: { latitude: region.latitude, longitude: region.longitude },
  };
}

/**
 * An unset filter is left out of the query entirely rather than sent as null —
 * the backend treats an absent bound and an empty one differently.
 */
export function queryFrom(
  filters: Filters,
  region: MapRegion,
  limit: number = PAGE_SIZE,
): SearchQuery {
  const query: SearchQuery = {
    ...boundsOf(region),
    status: statusesFor(filters.status),
    sort: filters.sort,
    limit,
  };
  if (filters.convertPrices) {
    query.convertPrices = true;
    query.displayCurrency = filters.displayCurrency;
  }
  if (filters.propertyType) query.propertyType = [filters.propertyType];
  if (filters.minPrice != null) query.minPrice = filters.minPrice;
  if (filters.maxPrice != null) query.maxPrice = filters.maxPrice;
  if (filters.minArea != null) query.minArea = filters.minArea;
  if (filters.maxArea != null) query.maxArea = filters.maxArea;
  return query;
}
