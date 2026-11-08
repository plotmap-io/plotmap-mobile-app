/**
 * The seller side of the API: a draft, its photos, and publishing it.
 *
 * The order the server insists on (`FieldValidator.validateForPublish`) is
 * the order the create flow walks: a draft exists first, photos are uploaded
 * against its id, the location and the price are saved onto it, and only then
 * can it be published.
 */
import { api } from '@/lib/api';
import type { DraftListing, ListingMedia, PublishResult } from '@/types/api';

/** `POST /drafts/empty` — a draft with the server's defaults and an id. */
export const emptyDraft = () => api.post<DraftListing>('/api/v1/drafts/empty', {});

/**
 * `GET /drafts` — this account's UNPUBLISHED listings, newest first (the
 * query is `is_published = false`), so the newest row is the draft to carry
 * on with when the broker comes back to Create listing.
 */
export const myDrafts = () => api.get<DraftListing[]>('/api/v1/drafts');

export const getDraft = (id: string) => api.get<DraftListing>(`/api/v1/drafts/${id}`);

/**
 * `PUT /drafts/:id` — a partial update: keys left out keep their stored
 * value. What goes in it is decided by `services/listing-draft.draftPayload`,
 * which knows the route's three traps.
 */
export const saveDraft = (id: string, body: Record<string, unknown>) =>
  api.request<DraftListing>(`/api/v1/drafts/${id}`, { method: 'PUT', body: JSON.stringify(body) });

/** Returns the id and the version written, NOT the listing. */
export const publishDraft = (id: string) =>
  api.post<PublishResult>(`/api/v1/drafts/${id}/publish`);

export const deleteDraft = (id: string) => api.delete<unknown>(`/api/v1/drafts/${id}`);

/* ---------- photos ---------- */

/** What the picker gives us, in the shapes the two platforms give it. */
export interface PickedPhoto {
  uri: string;
  /** Absent on an iOS camera-roll pick more often than not. */
  fileName?: string | null;
  mimeType?: string | null;
  /** Web only: the picker hands over a real `File`. */
  file?: unknown;
}

/**
 * One photo to `POST /listings/:id/media/upload`.
 *
 * **Never reject a photo for having no MIME type.** An iOS camera-roll asset
 * frequently carries none, and the picker's `accept` already constrained what
 * could be chosen; `image/jpeg` is the right assumption and the server makes
 * the same one.
 *
 * `isPrimary` marks the cover. `displayOrder` is the position in the gallery.
 */
export function uploadListingPhoto(
  listingId: string,
  photo: PickedPhoto,
  options: { isPrimary?: boolean; displayOrder?: number } = {},
): Promise<ListingMedia> {
  const type = photo.mimeType?.trim() || 'image/jpeg';
  const name = photo.fileName?.trim() || `photo.${type === 'image/png' ? 'png' : 'jpg'}`;

  const form = new FormData();
  if (photo.file) {
    // Web: a real File, which already carries its own name and type.
    form.append('file', photo.file as Blob, name);
  } else {
    // Native: React Native uploads the file:// URI itself — the bytes never
    // pass through JS, which is what keeps a 6 MB photo off the heap.
    form.append('file', { uri: photo.uri, name, type } as unknown as Blob);
  }

  const query = new URLSearchParams();
  if (options.isPrimary) query.set('isPrimary', 'true');
  if (options.displayOrder != null) query.set('displayOrder', String(options.displayOrder));
  const suffix = query.toString() ? `?${query}` : '';

  return api.upload<ListingMedia>(`/api/v1/listings/${listingId}/media/upload${suffix}`, form);
}

export const deleteListingPhoto = (listingId: string, mediaId: string) =>
  api.delete<unknown>(`/api/v1/listings/${listingId}/media/${mediaId}`);

/**
 * The three satellite views of the pin (close-up, plot, area), drawn by the
 * server. The web draws them when the Where step is left, and the close-up
 * becomes the cover when a listing has no photograph. They are GENERATED
 * media, so they never satisfy the one-photo rule.
 */
export const generateMapViews = (listingId: string) =>
  api.post<unknown>(`/api/v1/listings/${listingId}/media/map-views`);
