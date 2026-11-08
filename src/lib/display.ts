/**
 * Presentation-only derivations.
 *
 * The backend owns formatting — it sends `displayPrice`, `markerPrice` and
 * `addressDisplay` ready to render. These four values are the gap: the card
 * payload carries `areaSqm`, `coordinates` and `publishedAt`, but not the
 * per-cent rate, the area in cents, the distance or a relative age that the
 * approved design shows.
 *
 * They belong on the card payload. Until they are there, derive them here and
 * nowhere else, so there is one place to delete.
 */
import type { Coordinate, HighlightField, ListingCard } from '@/types/api';

const LAKH = 100_000;
const CRORE = 10_000_000;
/** 1 cent = 1/100 acre. */
const SQM_PER_CENT = 40.468564224;

function trim(value: number, places: number): string {
  return value.toFixed(places).replace(/\.0+$/, '');
}

function shortPrice(rupees: number): string {
  if (rupees >= CRORE) return `₹${trim(rupees / CRORE, 2)} Cr`;
  if (rupees >= LAKH) return `₹${trim(rupees / LAKH, 1)} L`;
  return `₹${Math.round(rupees).toLocaleString('en-IN')}`;
}

function areaSqm(fields: HighlightField[] | undefined): number | null {
  const field = fields?.find((f) => f.key === 'areaSqm');
  const value = typeof field?.value === 'number' ? field.value : Number(field?.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** "7 cents" / "1 cent" / "2.5 acres" */
export function areaLabel(listing: ListingCard): string | null {
  const sqm = areaSqm(listing.highlightFields);
  if (sqm == null) return null;
  const cents = sqm / SQM_PER_CENT;
  if (cents >= 100) {
    const acres = cents / 100;
    return `${trim(acres, 2)} ${acres === 1 ? 'acre' : 'acres'}`;
  }
  return `${trim(cents, 1)} ${Math.round(cents) === 1 ? 'cent' : 'cents'}`;
}

/** "₹4 L / cent" — plots only; meaningless for a house. */
export function rateLabel(listing: ListingCard): string | null {
  if (listing.propertyType !== 'land') return null;
  const sqm = areaSqm(listing.highlightFields);
  if (sqm == null || !listing.askAmount) return null;
  const cents = sqm / SQM_PER_CENT;
  if (cents <= 0) return null;
  return `${shortPrice(listing.askAmount / cents)} / cent`;
}

/** "Listed today" / "3 days ago" / "2 weeks ago" */
export function ageLabel(listing: ListingCard): string {
  const iso = listing.publishedAt ?? listing.createdAt;
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Listed today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 31) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 62) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
}

/** Great-circle distance from the search centre: "1.2 km" / "800 m". */
export function distanceLabel(from: Coordinate | null, to: Coordinate): string | null {
  if (!from) return null;
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  const metres = 2 * R * Math.asin(Math.sqrt(a));
  if (metres >= 1000) return `${trim(metres / 1000, 1)} km`;
  return `${Math.round(metres)} m`;
}

/** "Plot · 7 cents · 14 km" / "House · 3 BHK · 2,100 sqft" */
export function metaLine(listing: ListingCard, centre: Coordinate | null): string {
  const parts: string[] = [];
  const sub = listing.propertySubType || listing.propertyType;
  if (sub) parts.push(sub[0].toUpperCase() + sub.slice(1));

  const area = areaLabel(listing);
  if (area) parts.push(area);

  for (const field of listing.highlightFields ?? []) {
    if (field.key === 'areaSqm') continue;
    parts.push(field.fieldType === 'number' ? `${field.value} ${field.label}` : String(field.value));
  }

  const distance = distanceLabel(centre, listing.coordinates);
  if (distance) parts.push(distance);
  return parts.join(' · ');
}

/**
 * The server's status as a person says it. The raw enum ("ForSale") must
 * never reach a screen — Ajay reads these words on the web as "For sale".
 */
const STATUS_WORDS: Record<string, string> = {
  ForSale: 'For sale',
  ForRent: 'For rent',
  Sold: 'Sold',
  Rented: 'Rented',
  Draft: 'Draft',
};

export function statusLabel(status: string | undefined): string {
  if (!status) return '';
  return STATUS_WORDS[status] ?? status.replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** "residential_plot" → "Residential plot". */
export function humanise(value: string | undefined): string {
  if (!value) return '';
  const words = value.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Money while it is being typed — "₹10,00,000".
 *
 * The server formats every price it sends (`displayPrice`, `markerPrice`),
 * but the create flow has to show a total the moment a rate and an area are
 * entered, before anything has been saved. Grouping follows the CURRENCY, as
 * the web's `CurrencyFormat` does: the lakh set reads en-IN, the euro de-DE,
 * everything else en-US.
 */
const LAKH_CURRENCIES = new Set(['INR', 'PKR', 'BDT', 'NPR', 'BTN']);

export function moneyLabel(amount: number, currency = 'INR'): string {
  const locale = LAKH_CURRENCIES.has(currency) ? 'en-IN' : currency === 'EUR' ? 'de-DE' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown ISO code must not take the screen down with it.
    return `${currency} ${Math.round(amount).toLocaleString(locale)}`;
  }
}

/**
 * An address on ONE line — "Kuranchery - Velur Road, Minalur, Thrissur Dist."
 *
 * `addressDisplay` and the reverse-geocoder's `displayAddress` are composed by
 * the server's `AddressRules` and arrive NEWLINE-separated, one place per
 * line. Anywhere the line has to fit in a row or a card, the breaks become
 * commas; anywhere it is the title of a page, the lines are kept.
 */
export function addressLine(address: string | undefined | null): string {
  if (!address) return '';
  return address
    .split('\n')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}
