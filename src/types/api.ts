/** Types mirroring the /api/v1 responses. Display strings come pre-formatted. */

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface HighlightField {
  key: string;
  value: number | string;
  fieldType: string;
  label: string;
}

/** A row in a search / favourites / my-listings result. */
export interface ListingCard {
  id: string;
  propertyType: string;
  propertySubType: string;
  typeIcon: string;
  coordinates: Coordinate;
  status: string;
  askAmount: number;
  askCurrency: string;
  /** Pre-formatted by the backend: "₹ 42,00,000" */
  displayPrice: string;
  /** Pre-formatted for a map pin: "₹ 42.0 L" */
  markerPrice: string;
  /** Two lines, newline separated: "Punkunnam\nThrissur" */
  addressDisplay: string;
  city?: string;
  highlightFields: HighlightField[];
  images: string[];
  createdAt: string;
  publishedAt?: string;
  statusChangedAt?: string;
  priority?: number;
}

export interface SearchResponse {
  listings: ListingCard[];
  total: number;
  limit: number;
  offset: number;
  sampled: boolean;
}

export interface SearchQuery {
  boundsSW: Coordinate;
  boundsNE: Coordinate;
  center?: Coordinate;
  status?: string[];
  propertyType?: string[];
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  sort?: string;
  displayCurrency?: string;
  convertPrices?: boolean;
  limit?: number;
  offset?: number;
  q?: string;
}

export interface MyProfile {
  id: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  accountType?: string;
  phone?: string;
  email?: string;
  bio?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  user: MyProfile;
}

/* ---------- metadata / filters ---------- */

export interface Option { value: string; label: string }
export interface PropertyType extends Option { subtypes: Option[] }
export interface Range {
  min: number; max: number; step: number; unit: string;
  openEndedMin: boolean; openEndedMax: boolean;
}

/** GET /api/v1/metadata — returns a FLAT body, no { data } envelope. */
export interface Currency extends Option { symbol?: string }

export interface Metadata {
  propertyTypes: PropertyType[];
  currencies: Currency[];
  propertyStatuses: Option[];
  areaUnits: Option[];
  filterRanges: Record<string, Range>;
  defaults: Record<string, string>;
}

export type StatusTab = 'ForSale' | 'ForRent' | 'History';

export type SortKey = 'nearest' | 'newest' | 'price_asc' | 'price_desc';

export const SORTS: { value: SortKey; label: string }[] = [
  { value: 'nearest', label: 'Nearest' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const STATUS_LABEL: Record<StatusTab, string> = {
  ForSale: 'For sale',
  ForRent: 'For rent',
  History: 'History',
};

export interface SearchArea {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  label: string;
}

export interface Filters {
  status: StatusTab;
  /** Set when the user picks an area; the map recentres on it. */
  place?: SearchArea;
  sort: SortKey;
  /** Ask the backend to restate prices in `displayCurrency`. */
  convertPrices: boolean;
  displayCurrency: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
}

/* Filter rules — statusesFor, countActive, clearFilters — live in
   `src/services/filters.ts`. This module stays types and tables. */

/* ---------- listing detail ---------- */

export interface ListingField {
  key: string; value: string | number; fieldType: string; label: string; category?: string;
}
export interface ListingMedia { id: string; listingId: string; url: string; }

export interface ListingDetail {
  id: string;
  propertyType: string;
  propertySubType: string;
  location: { latitude: number; longitude: number; addressDisplay: string };
  lotSizeSqm?: number;
  builtUpAreaSqm?: number;
  fields: ListingField[];
  description?: string;
  status: string;
  askAmount: number;
  askCurrency: string;
  displayPrice: string;
  lotSizeDisplayUnit?: string;
  listedByOwner?: boolean;
  listingMedia: ListingMedia[];
  contactUserId?: string;
  contactUsername?: string;
  createdAt: string;
  offMarket?: boolean;
}

/* ---------- people, threads, notifications ---------- */

export interface PublicProfile {
  id?: string; name?: string; username?: string; avatarUrl?: string;
  bio?: string; accountType?: string; createdAt?: string;
  email?: string; phone?: string;
}

export interface Thread {
  id: string;
  listingId?: string;
  title?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  counterpartName?: string;
  counterpartUsername?: string;
}

export interface Message {
  id: string;
  threadId: string;
  body?: string;
  text?: string;
  senderId?: string;
  createdAt: string;
  mine?: boolean;
}
