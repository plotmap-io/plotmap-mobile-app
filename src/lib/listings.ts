import { api } from '@/lib/api';
import type { ListingCard, ListingDetail, SearchQuery, SearchResponse } from '@/types/api';

export function searchListings(query: SearchQuery) {
  return api.post<SearchResponse>('/api/v1/listings/search', query, { auth: false });
}

export function myListings() {
  return api.get<ListingCard[] | SearchResponse>('/api/v1/listings/my');
}

export function favouriteListings() {
  return api.get<ListingCard[] | SearchResponse>('/api/v1/listings/favorites');
}

export function addFavourite(listingId: string) {
  return api.post<unknown>(`/api/v1/favorites/${listingId}`);
}

export function removeFavourite(listingId: string) {
  return api.delete<unknown>(`/api/v1/favorites/${listingId}`);
}

/** Both shapes appear across these routes; callers want a plain array. */
export function asRows(result: ListingCard[] | SearchResponse | null | undefined): ListingCard[] {
  if (!result) return [];
  return Array.isArray(result) ? result : (result.listings ?? []);
}

export function listingDetail(id: string) {
  return api.get<ListingDetail>(`/api/v1/listings/${id}`, { auth: false });
}

export function inquire(id: string, message: string) {
  return api.post<unknown>(`/api/v1/listings/${id}/inquire`, { message });
}
