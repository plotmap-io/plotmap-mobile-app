import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { clearFilters, DEFAULT_FILTERS } from '@/services/filters';
import type { Filters } from '@/types/api';

interface Ctx {
  filters: Filters;
  setFilters: (next: Filters) => void;
  patch: (part: Partial<Filters>) => void;
  reset: () => void;
}

const FilterContext = createContext<Ctx | null>(null);

/** Search filters live above the tabs so the Filters modal and the Search
 *  screen share one source of truth. */
export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const value = useMemo<Ctx>(
    () => ({
      filters,
      setFilters,
      patch: (part) => setFilters((f) => ({ ...f, ...part })),
      reset: () => setFilters(clearFilters),
    }),
    [filters],
  );
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside FilterProvider');
  return ctx;
}
