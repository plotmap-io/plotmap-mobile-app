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

/**
 * Which per-area price units a sub-type may be quoted in, keyed
 * `pricingRules[propertySubType][status]`. The server refuses the others at
 * publish (`PricingRules.isAreaUnitAllowed`), so the price row is built from
 * this rather than from a list of its own.
 */
export interface PricingRule {
  allowedAreaUnits?: string[];
  defaultAreaUnit?: string | null;
  allowedTimeUnits?: string[];
  defaultTimeUnit?: string | null;
}

export type PricingRules = Record<string, Record<string, PricingRule>>;

export interface Country {
  code: string;
  name: string;
  currencyCode?: string;
  locale?: string;
  areaUnit?: string;
  distanceUnit?: string;
}

export interface Metadata {
  propertyTypes: PropertyType[];
  currencies: Currency[];
  propertyStatuses: Option[];
  areaUnits: Option[];
  /** `per_cent` | `per_acre` | `per_sqft` | `per_sqm` — rates, not sizes. */
  priceAreaUnits?: Option[];
  priceTimeUnits?: Option[];
  pricingRules?: PricingRules;
  countries?: Country[];
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
export interface ListingMedia {
  id: string;
  listingId: string;
  url: string;
  thumbnailUrl?: string;
  contentType?: string;
  isPrimary?: boolean;
  displayOrder?: number;
  /**
   * `upload` is the owner's own photograph; `map-close` / `map-closeup` /
   * `map-wide` are the satellite views the server draws. Only an upload
   * counts towards the one-photo rule publish enforces.
   */
  source?: string;
  aiStatus?: string;
  /**
   * Only on the upload response, and only when the photo carried GPS EXIF:
   * where the camera was standing. The web's Where step opens on it, which is
   * how a plot photographed on site arrives with its pin already right.
   */
  extractedGps?: Coordinate;
  suggestedLocation?: Coordinate;
}

/** Media the server generated rather than a photograph someone took. */
export function isUploadedPhoto(m: ListingMedia): boolean {
  return (m.source ?? 'upload') === 'upload';
}

export interface ListingLocation {
  latitude: number;
  longitude: number;
  addressDisplay: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
  neighborhood?: string;
  /** Composed by the server: "Mullurkara, Thrissur Dist." */
  placeLine?: string;
}

export interface ListingDetail {
  id: string;
  propertyType: string;
  propertySubType: string;
  location: ListingLocation;
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

/**
 * `GET|PUT /api/v1/drafts/:id` — the owner's listing JSON plus the booleans
 * the server computes about what the draft is still missing. They are the
 * same questions `FieldValidator.validateForPublish` asks, which is why the
 * review step can trust them over anything it worked out itself.
 */
export interface DraftListing extends ListingDetail {
  askAreaUnit?: string;
  askTimeUnit?: string;
  askAmountTotal?: number;
  lotSizeDisplayUnit?: string;
  isPublished?: boolean;
  isComplete?: boolean;
  /** False while the draft still wears the server's "Residential / house". */
  propertyTypeAdded?: boolean;
  propertyStatusAdded?: boolean;
  locationAdded?: boolean;
  detailsAdded?: boolean;
  imagesAdded?: boolean;
  priceAdded?: boolean;
  updatedAt?: string;
}

/** `POST /api/v1/drafts/:id/publish` returns the id, not the listing. */
export interface PublishResult {
  listingId: string;
  version?: number | null;
  message?: string;
}

/** `GET /api/v1/places/reverse-geocode` — flat, with nulls dropped. */
export interface ReverseGeocodeResult {
  formattedAddress: string;
  /** The line Plotmap itself writes (AddressRules) — store this one. */
  displayAddress?: string;
  neighborhood?: string;
  sublocality?: string;
  city?: string;
  district?: string;
  stateProvince?: string;
  country?: string;
  countryCode?: string;
  postalCode?: string;
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
