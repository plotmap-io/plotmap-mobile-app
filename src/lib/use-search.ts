import { useCallback, useEffect, useRef, useState } from 'react';

import { apiBase } from '@/lib/api';
import type { MapRegion } from '@/lib/region';
import { searchListings } from '@/lib/listings';
import { statusesFor } from '@/types/api';
import type { Filters, ListingCard, SearchQuery } from '@/types/api';

function boundsOf(region: MapRegion) {
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
 * Search is driven by the map's viewport: pan or zoom and the backend returns
 * the listings inside the new bounds. All filtering happens server side.
 */
export function useSearch(initialRegion: MapRegion, filters: Filters) {
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(
    async (region: MapRegion) => {
      const ticket = ++seq.current;
      setLoading(true);
      try {
        const query: SearchQuery = {
          ...boundsOf(region),
          status: statusesFor(filters.status),
          sort: filters.sort,
          limit: 60,
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
        const res = await searchListings(query);
        // A slower earlier request must not overwrite a newer result.
        if (ticket !== seq.current) return;
        setListings(res.listings ?? []);
        setTotal(res.total ?? 0);
        setError(null);
      } catch (e) {
        if (ticket !== seq.current) return;
        const why = e instanceof Error ? e.message : 'Search failed';
        setError(`${why}\n${apiBase()}`);
      } finally {
        if (ticket === seq.current) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filters)],
  );

  const lastRegion = useRef(initialRegion);
  const search = useCallback(
    (region: MapRegion) => {
      lastRegion.current = region;
      return run(region);
    },
    [run],
  );

  // Filters changing re-queries the viewport the user is already looking at.
  useEffect(() => {
    run(lastRegion.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { listings, total, loading, error, search };
}
