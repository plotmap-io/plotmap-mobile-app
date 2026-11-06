import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Filters } from '@/types/api';

const DEFAULT: Filters = {
  status: 'ForSale',
  sort: 'nearest',
  convertPrices: false,
  displayCurrency: 'INR',
};

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
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const value = useMemo<Ctx>(
    () => ({
      filters,
      setFilters,
      patch: (part) => setFilters((f) => ({ ...f, ...part })),
      reset: () =>
        setFilters((f) => ({
          status: f.status,
          sort: f.sort,
          convertPrices: f.convertPrices,
          displayCurrency: f.displayCurrency,
        })),
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
