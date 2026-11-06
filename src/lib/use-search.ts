import { useCallback, useEffect, useRef, useState } from 'react';

import { apiBase } from '@/lib/api';
import type { MapRegion } from '@/lib/region';
import { searchListings } from '@/lib/listings';
import { queryFrom } from '@/services/search-query';
import type { Filters, ListingCard } from '@/types/api';

/**
 * Search is driven by the map's viewport: pan or zoom and the backend returns
 * the listings inside the new bounds. All filtering happens server side.
 *
 * The hook owns only what is React: loading, errors, and ignoring a stale
 * reply. Which filters become which query fields is `services/search-query`.
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
        const res = await searchListings(queryFrom(filters, region));
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
