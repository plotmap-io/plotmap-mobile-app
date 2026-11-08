/**
 * A synthetic backend, for development only.
 *
 * Point the API server URL at an unreachable host and the app has nothing to
 * show: every request fails, and nothing is ever cached because nothing ever
 * arrived. Turning sample data on answers the same requests locally instead,
 * so the map, the list, the filters and a listing page are all populated with
 * no server running anywhere.
 *
 * The rows are GENERATED, not copied from a real database. Two reasons that
 * matters: real listing images are server-relative paths that only resolve
 * through the server being unreachable, and real records cluster on one
 * currency and one country, which is the opposite of what edge cases need.
 *
 * Everything is drawn from a seeded sequence, so the dataset is identical on
 * every machine and every launch. Real listings are never seeded into the app
 * — an empty map in production is answered by server-flagged showcase
 * listings, not by fakes.
 *
 * Pure TypeScript, no React Native imports, so tests import it in plain Node.
 */
import type {
  Coordinate,
  ListingCard,
  ListingDetail,
  Metadata,
  SearchQuery,
  SearchResponse,
} from '@/types/api';

/* ---------- money, mirroring the backend's formatter ---------- */

interface Money {
  code: string;
  symbol: string;
  /** Lakh/crore grouping, as the backend does for INR, PKR, BDT, NPR, LKR. */
  lakh?: boolean;
  /** Multiplier against a rupee-scale base, so prices look native. */
  scale: number;
}

const MONEY: Money[] = [
  { code: 'INR', symbol: '₹', lakh: true, scale: 1 },
  { code: 'USD', symbol: '$', scale: 0.012 },
  { code: 'EUR', symbol: '€', scale: 0.011 },
  { code: 'GBP', symbol: '£', scale: 0.0095 },
  { code: 'CAD', symbol: 'CA$', scale: 0.016 },
  { code: 'AUD', symbol: 'A$', scale: 0.018 },
  { code: 'AED', symbol: 'AED', scale: 0.044 },
  { code: 'SGD', symbol: 'S$', scale: 0.016 },
  { code: 'JPY', symbol: '¥', scale: 1.8 },
  { code: 'ZAR', symbol: 'R', scale: 0.22 },
  { code: 'BRL', symbol: 'R$', scale: 0.065 },
  { code: 'KES', symbol: 'KSh', scale: 1.55 },
  { code: 'NGN', symbol: '₦', scale: 18 },
  { code: 'PKR', symbol: '₨', lakh: true, scale: 3.3 },
  { code: 'LKR', symbol: 'Rs', lakh: true, scale: 3.5 },
  { code: 'THB', symbol: '฿', scale: 0.42 },
  { code: 'MXN', symbol: 'MX$', scale: 0.22 },
];

const byCode = new Map(MONEY.map((m) => [m.code, m]));

/** Indian digit grouping: 4200000 → "42,00,000". */
function lakhGrouped(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const head = s.slice(0, -3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${s.slice(-3)}`;
}

const westernGrouped = (n: number) => Math.round(n).toLocaleString('en-US');

function displayPrice(amount: number, code: string): string {
  const m = byCode.get(code) ?? MONEY[0];
  return `${m.symbol} ${m.lakh ? lakhGrouped(amount) : westernGrouped(amount)}`;
}

/** Map-pin money, short enough for a pill: "₹ 42.0 L", "$ 1.2M". */
function markerPrice(amount: number, code: string): string {
  const m = byCode.get(code) ?? MONEY[0];
  if (m.lakh) {
    if (amount >= 10000000) return `${m.symbol} ${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `${m.symbol} ${(amount / 100000).toFixed(1)} L`;
    return `${m.symbol} ${lakhGrouped(amount)}`;
  }
  if (amount >= 1000000) return `${m.symbol} ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${m.symbol} ${Math.round(amount / 1000)}K`;
  return `${m.symbol} ${westernGrouped(amount)}`;
}

/* ---------- places ---------- */

interface Place {
  name: string;
  region: string;
  country: string;
  currency: string;
  lat: number;
  lng: number;
  spread: number;
  weight: number;
}

/**
 * Thrissur district carries half of Kerala, because it is the region the app
 * opens on and the one worth stress-testing. The rest covers every district so
 * a state-wide viewport has something everywhere.
 */
const KERALA: Place[] = [
  ['Punkunnam', 'Thrissur', 10.5276, 76.2144, 0.03, 150],
  ['Ayyanthole', 'Thrissur', 10.541, 76.201, 0.022, 95],
  ['Ollur', 'Thrissur', 10.462, 76.244, 0.03, 75],
  ['Mannuthy', 'Thrissur', 10.5512, 76.2733, 0.025, 60],
  ['Guruvayur', 'Thrissur', 10.5949, 76.041, 0.035, 55],
  ['Irinjalakuda', 'Thrissur', 10.342, 76.214, 0.035, 45],
  ['Chalakudy', 'Thrissur', 10.308, 76.334, 0.03, 40],
  ['Wadakkanchery', 'Thrissur', 10.654, 76.242, 0.03, 40],
  ['Kodungallur', 'Thrissur', 10.224, 76.195, 0.03, 30],
  ['Kunnamkulam', 'Thrissur', 10.6504, 76.0702, 0.028, 30],
  ['Kochi', 'Ernakulam', 9.9312, 76.2673, 0.09, 70],
  ['Aluva', 'Ernakulam', 10.1081, 76.3522, 0.05, 35],
  ['Kozhikode', 'Kozhikode', 11.2588, 75.7804, 0.08, 55],
  ['Thiruvananthapuram', 'Thiruvananthapuram', 8.5241, 76.9366, 0.09, 55],
  ['Kollam', 'Kollam', 8.8932, 76.6141, 0.06, 30],
  ['Kottayam', 'Kottayam', 9.5916, 76.5222, 0.06, 30],
  ['Alappuzha', 'Alappuzha', 9.4981, 76.3388, 0.055, 28],
  ['Palakkad', 'Palakkad', 10.7867, 76.6548, 0.07, 30],
  ['Malappuram', 'Malappuram', 11.051, 76.0711, 0.06, 28],
  ['Kannur', 'Kannur', 11.8745, 75.3704, 0.06, 25],
  ['Kasaragod', 'Kasaragod', 12.4996, 74.9869, 0.06, 20],
  ['Pathanamthitta', 'Pathanamthitta', 9.2648, 76.787, 0.05, 18],
  ['Idukki', 'Idukki', 9.8497, 76.9784, 0.08, 18],
  ['Wayanad', 'Wayanad', 11.6854, 76.132, 0.07, 18],
].map(([name, region, lat, lng, spread, weight]) => ({
  name: name as string,
  region: region as string,
  country: 'India',
  currency: 'INR',
  lat: lat as number,
  lng: lng as number,
  spread: spread as number,
  weight: weight as number,
}));

/** The other half: every inhabited continent, each in its own currency. */
const WORLD: Place[] = [
  ['Toronto', 'Ontario', 'Canada', 'CAD', 43.6532, -79.3832, 0.12, 45],
  ['Vancouver', 'British Columbia', 'Canada', 'CAD', 49.2827, -123.1207, 0.1, 30],
  ['New York', 'New York', 'United States', 'USD', 40.7128, -74.006, 0.12, 50],
  ['Austin', 'Texas', 'United States', 'USD', 30.2672, -97.7431, 0.12, 35],
  ['San Francisco', 'California', 'United States', 'USD', 37.7749, -122.4194, 0.08, 35],
  ['Mexico City', 'CDMX', 'Mexico', 'MXN', 19.4326, -99.1332, 0.12, 35],
  ['São Paulo', 'São Paulo', 'Brazil', 'BRL', -23.5505, -46.6333, 0.14, 40],
  ['Rio de Janeiro', 'Rio de Janeiro', 'Brazil', 'BRL', -22.9068, -43.1729, 0.1, 25],
  ['London', 'England', 'United Kingdom', 'GBP', 51.5074, -0.1278, 0.12, 50],
  ['Manchester', 'England', 'United Kingdom', 'GBP', 53.4808, -2.2426, 0.08, 25],
  ['Berlin', 'Berlin', 'Germany', 'EUR', 52.52, 13.405, 0.12, 40],
  ['Madrid', 'Madrid', 'Spain', 'EUR', 40.4168, -3.7038, 0.1, 30],
  ['Lisbon', 'Lisboa', 'Portugal', 'EUR', 38.7223, -9.1393, 0.08, 25],
  ['Amsterdam', 'North Holland', 'Netherlands', 'EUR', 52.3676, 4.9041, 0.07, 22],
  ['Dubai', 'Dubai', 'United Arab Emirates', 'AED', 25.2048, 55.2708, 0.12, 45],
  ['Abu Dhabi', 'Abu Dhabi', 'United Arab Emirates', 'AED', 24.4539, 54.3773, 0.1, 25],
  ['Karachi', 'Sindh', 'Pakistan', 'PKR', 24.8607, 67.0011, 0.12, 35],
  ['Lahore', 'Punjab', 'Pakistan', 'PKR', 31.5204, 74.3587, 0.1, 25],
  ['Colombo', 'Western', 'Sri Lanka', 'LKR', 6.9271, 79.8612, 0.08, 30],
  ['Bangkok', 'Bangkok', 'Thailand', 'THB', 13.7563, 100.5018, 0.12, 35],
  ['Singapore', 'Singapore', 'Singapore', 'SGD', 1.3521, 103.8198, 0.06, 35],
  ['Tokyo', 'Tokyo', 'Japan', 'JPY', 35.6762, 139.6503, 0.12, 40],
  ['Osaka', 'Osaka', 'Japan', 'JPY', 34.6937, 135.5023, 0.08, 20],
  ['Sydney', 'New South Wales', 'Australia', 'AUD', -33.8688, 151.2093, 0.12, 40],
  ['Melbourne', 'Victoria', 'Australia', 'AUD', -37.8136, 144.9631, 0.1, 28],
  ['Auckland', 'Auckland', 'New Zealand', 'AUD', -36.8485, 174.7633, 0.08, 18],
  ['Nairobi', 'Nairobi', 'Kenya', 'KES', -1.2921, 36.8219, 0.1, 30],
  ['Lagos', 'Lagos', 'Nigeria', 'NGN', 6.5244, 3.3792, 0.12, 35],
  ['Cape Town', 'Western Cape', 'South Africa', 'ZAR', -33.9249, 18.4241, 0.1, 30],
  ['Johannesburg', 'Gauteng', 'South Africa', 'ZAR', -26.2041, 28.0473, 0.1, 25],
].map(([name, region, country, currency, lat, lng, spread, weight]) => ({
  name: name as string,
  region: region as string,
  country: country as string,
  currency: currency as string,
  lat: lat as number,
  lng: lng as number,
  spread: spread as number,
  weight: weight as number,
}));

/* ---------- the catalogue ---------- */

interface Kind {
  type: string;
  subType: string;
  label: string;
  /** Flats carry a floor; land does not. */
  storeyed?: boolean;
  built?: boolean;
}

const KINDS: Kind[] = [
  { type: 'Land', subType: 'Residential Plot', label: 'Residential Plot' },
  { type: 'Land', subType: 'Agricultural Land', label: 'Agricultural Land' },
  { type: 'Land', subType: 'Commercial Plot', label: 'Commercial Plot' },
  { type: 'Residential', subType: 'House', label: 'House', built: true },
  { type: 'Residential', subType: 'Villa', label: 'Villa', built: true },
  { type: 'Residential', subType: 'Apartment', label: 'Apartment', built: true, storeyed: true },
  { type: 'Commercial', subType: 'Shop', label: 'Shop', built: true, storeyed: true },
  { type: 'Commercial', subType: 'Office', label: 'Office', built: true, storeyed: true },
  { type: 'Commercial', subType: 'Warehouse', label: 'Warehouse', built: true },
];

/**
 * Older rows in the real database store the type lower-cased ("land", "plot")
 * while newer ones are capitalised. An exact catalogue filter silently skips
 * the old spelling, so the sample data carries both — the bug is only visible
 * when both exist.
 */
const LEGACY_KINDS: Kind[] = [
  { type: 'land', subType: 'plot', label: 'Residential Plot' },
  { type: 'residential', subType: 'house', label: 'House', built: true },
];

const STATUSES = ['ForSale', 'ForRent', 'Sold', 'Rented'] as const;

/* ---------- generation ---------- */

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/** Deterministic photos. Remote, because a bundled asset would have to be
 *  served by the host the app is pretending it cannot reach. */
function photos(id: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `https://picsum.photos/seed/pm-${id}-${i}/800/600`,
  );
}

interface Spec {
  id: string;
  place: Place;
  kind: Kind;
  status: string;
  coordinates: Coordinate;
  base: number;
  images: number;
  floor?: number;
  beds?: number;
  areaSqm: number;
}

function toCard(s: Spec): ListingCard {
  const money = byCode.get(s.place.currency) ?? MONEY[0];
  const rent = s.status === 'ForRent' || s.status === 'Rented';
  const amount = rent
    ? Math.max(1, Math.round((s.base * money.scale) / 400))
    : Math.round(s.base * money.scale);

  const highlights: ListingCard['highlightFields'] = [
    { key: 'areaSqm', value: s.areaSqm, fieldType: 'number', label: 'Area' },
  ];
  if (s.beds != null) {
    highlights.push({ key: 'bedrooms', value: s.beds, fieldType: 'number', label: 'Bedrooms' });
  }
  if (s.floor != null) {
    highlights.push({ key: 'floor', value: s.floor, fieldType: 'number', label: 'Floor' });
  }

  return {
    id: s.id,
    propertyType: s.kind.type,
    propertySubType: s.kind.subType,
    typeIcon: s.kind.type.toLowerCase(),
    coordinates: s.coordinates,
    status: s.status,
    askAmount: amount,
    askCurrency: s.place.currency,
    displayPrice: rent
      ? `${displayPrice(amount, s.place.currency)} /mo`
      : displayPrice(amount, s.place.currency),
    markerPrice: markerPrice(amount, s.place.currency),
    addressDisplay: `${s.place.name}\n${s.place.region}`,
    city: s.place.name,
    highlightFields: highlights,
    images: photos(s.id, s.images),
    createdAt: '2026-09-01T09:00:00Z',
    publishedAt: '2026-09-01T09:00:00Z',
    ...(s.status === 'Sold' || s.status === 'Rented'
      ? { statusChangedAt: '2026-10-12T06:00:00Z' }
      : {}),
  };
}

/**
 * Every (kind × status) pair appears in Thrissur at least once before the
 * random fill starts, so no combination is missing just because the dice
 * never rolled it.
 */
function combinations(rand: () => number, prefix: string, place: Place): Spec[] {
  const out: Spec[] = [];
  let n = 0;
  for (const kind of [...KINDS, ...LEGACY_KINDS]) {
    for (const status of STATUSES) {
      n += 1;
      out.push({
        id: `${prefix}-${String(n).padStart(3, '0')}`,
        place,
        kind,
        status,
        coordinates: {
          latitude: round5(place.lat + (rand() - 0.5) * place.spread),
          longitude: round5(place.lng + (rand() - 0.5) * place.spread),
        },
        base: 900000 + Math.round(rand() * 24000000),
        images: 3 + Math.floor(rand() * 4),
        floor: kind.storeyed ? 1 + Math.floor(rand() * 20) : undefined,
        beds: kind.built ? 1 + Math.floor(rand() * 5) : undefined,
        areaSqm: 90 + Math.round(rand() * 900),
      });
    }
  }
  return out;
}

/** `baseMax` is a rupee-scale ceiling; each place converts it into its own
 *  currency, so a Manhattan flat is not priced like a Kerala plot. */
function fill(
  rand: () => number,
  prefix: string,
  places: Place[],
  count: number,
  baseMax: number,
): Spec[] {
  const pool: Place[] = [];
  for (const p of places) for (let i = 0; i < p.weight; i++) pool.push(p);

  return Array.from({ length: count }, (_, i) => {
    const place = pool[Math.floor(rand() * pool.length)];
    const kind = rand() < 0.06
      ? LEGACY_KINDS[Math.floor(rand() * LEGACY_KINDS.length)]
      : KINDS[Math.floor(rand() * KINDS.length)];
    const roll = rand();
    const status =
      roll < 0.74 ? 'ForSale' : roll < 0.86 ? 'ForRent' : roll < 0.94 ? 'Sold' : 'Rented';
    return {
      id: `${prefix}-${String(i + 1).padStart(4, '0')}`,
      place,
      kind,
      status,
      coordinates: {
        latitude: round5(place.lat + (rand() - 0.5) * place.spread),
        longitude: round5(place.lng + (rand() - 0.5) * place.spread),
      },
      base: 700000 + Math.round(rand() * baseMax),
      images: 2 + Math.floor(rand() * 6),
      floor: kind.storeyed ? 1 + Math.floor(rand() * 24) : undefined,
      beds: kind.built ? 1 + Math.floor(rand() * 5) : undefined,
      areaSqm: 70 + Math.round(rand() * 1200),
    };
  });
}

const THRISSUR = KERALA[0];

/**
 * Cases that are easy to get wrong and hard to stumble on by panning: two pins
 * on one coordinate, a knot too tight to draw apart, a pair split by a round
 * boundary, money at both extremes, a hundred-storey tower, a gallery of
 * thirty photos and one of none, the antimeridian, the equator, and a listing
 * nearer the Arctic than anything else on the map.
 */
function edgeCases(): ListingCard[] {
  const rand = seeded(7);
  const at = (lat: number, lng: number) => ({ latitude: lat, longitude: lng });
  const spec = (id: string, over: Partial<Spec> & { place?: Place }): Spec => ({
    id,
    place: THRISSUR,
    kind: KINDS[0],
    status: 'ForSale',
    coordinates: at(10.5276, 76.2144),
    base: 4200000,
    images: 4,
    areaSqm: 400,
    ...over,
  });

  const world = (name: string, currency: string, lat: number, lng: number): Place => ({
    name,
    region: name,
    country: name,
    currency,
    lat,
    lng,
    spread: 0.01,
    weight: 1,
  });

  const rows: Spec[] = [
    spec('edge-same-point-a', {}),
    spec('edge-same-point-b', { kind: KINDS[3], base: 7350000, beds: 3 }),
    spec('edge-boundary-west', { coordinates: at(10.5, 76.19999), base: 2500000 }),
    spec('edge-boundary-east', { coordinates: at(10.5, 76.20001), base: 2600000 }),
    spec('edge-cheapest', { coordinates: at(10.4421, 76.2712), base: 120000, areaSqm: 40 }),
    spec('edge-priciest', {
      coordinates: at(10.5333, 76.2101),
      kind: KINDS[4],
      base: 4800000000,
      beds: 9,
      areaSqm: 4200,
    }),
    spec('edge-no-photos', { coordinates: at(10.5512, 76.2233), images: 0 }),
    spec('edge-one-photo', { coordinates: at(10.5495, 76.2251), images: 1 }),
    spec('edge-thirty-photos', { coordinates: at(10.5188, 76.2277), images: 30, kind: KINDS[3] }),
    spec('edge-hundredth-floor', {
      coordinates: at(10.5201, 76.2199),
      kind: KINDS[5],
      floor: 100,
      beds: 4,
      base: 190000000,
    }),
    spec('edge-ground-floor', { coordinates: at(10.5215, 76.2205), kind: KINDS[5], floor: 0 }),
    spec('edge-basement', { coordinates: at(10.5221, 76.2211), kind: KINDS[6], floor: -2 }),
    spec('edge-for-rent', { coordinates: at(10.5401, 76.2188), kind: KINDS[5], status: 'ForRent' }),
    spec('edge-sold', { coordinates: at(10.5244, 76.2066), kind: KINDS[3], status: 'Sold' }),
    spec('edge-rented', { coordinates: at(10.5251, 76.2072), kind: KINDS[5], status: 'Rented' }),
    spec('edge-legacy-casing', { coordinates: at(10.5305, 76.2158), kind: LEGACY_KINDS[0] }),
    spec('edge-antimeridian-east', {
      place: world('Suva', 'AUD', -18.1248, 179.9999),
      coordinates: at(-18.1248, 179.9999),
    }),
    spec('edge-antimeridian-west', {
      place: world('Suva', 'AUD', -18.1251, -179.9999),
      coordinates: at(-18.1251, -179.9999),
    }),
    spec('edge-equator', {
      place: world('Pontianak', 'USD', 0, 109.3425),
      coordinates: at(0, 109.3425),
    }),
    spec('edge-high-latitude', {
      place: world('Tromsø', 'EUR', 69.6492, 18.9553),
      coordinates: at(69.6492, 18.9553),
      kind: KINDS[3],
    }),
    spec('edge-southern-tip', {
      place: world('Ushuaia', 'BRL', -54.8019, -68.303),
      coordinates: at(-54.8019, -68.303),
    }),
  ];

  // A knot tight enough that no map can draw them apart.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    rows.push(
      spec(`edge-knot-${String(i + 1).padStart(2, '0')}`, {
        coordinates: at(
          round5(10.4805 + Math.cos(a) * 0.0007),
          round5(76.2301 + Math.sin(a) * 0.0007),
        ),
        base: 1800000 + i * 90000,
        images: 2,
      }),
    );
  }

  const cards = rows.map(toCard);

  // Two rows that carry nothing to show, built after the fact so the shape of
  // every other row stays the same.
  const bare = toCard(spec('edge-no-highlights', { coordinates: at(10.5091, 76.2312) }));
  cards.push({ ...bare, highlightFields: [] });

  const long = toCard(spec('edge-long-address', { coordinates: at(10.5099, 76.2319) }));
  cards.push({
    ...long,
    addressDisplay:
      'Door 14/221B, Second Floor, Chelakkara Road Junction, Near the Old Panchayat Office\nThrissur',
  });

  void rand;
  return cards;
}

/** Edge cases first, so a `limit` never loses them. */
export const devListings: ListingCard[] = [
  ...edgeCases(),
  ...combinations(seeded(101), 'combo', THRISSUR).map(toCard),
  ...fill(seeded(20261106), 'kerala', KERALA, 1000, 42000000).map(toCard),
  ...fill(seeded(55512), 'world', WORLD, 1000, 260000000).map(toCard),
];

/* ---------- answering requests ---------- */

function within(c: Coordinate, sw: Coordinate, ne: Coordinate): boolean {
  return (
    c.latitude >= sw.latitude &&
    c.latitude <= ne.latitude &&
    c.longitude >= sw.longitude &&
    c.longitude <= ne.longitude
  );
}

function matching(q: SearchQuery): ListingCard[] {
  const statuses = q.status?.length ? new Set(q.status) : null;
  const types = q.propertyType?.length ? new Set(q.propertyType) : null;
  return devListings.filter((l) => {
    if (q.boundsSW && q.boundsNE && !within(l.coordinates, q.boundsSW, q.boundsNE)) return false;
    if (statuses && !statuses.has(l.status)) return false;
    if (types && !types.has(l.propertyType)) return false;
    if (q.minPrice != null && l.askAmount < q.minPrice) return false;
    if (q.maxPrice != null && l.askAmount > q.maxPrice) return false;
    return true;
  });
}

function sorted(rows: ListingCard[], q: SearchQuery): ListingCard[] {
  const out = [...rows];
  switch (q.sort) {
    case 'price_asc':
      return out.sort((a, b) => a.askAmount - b.askAmount);
    case 'price_desc':
      return out.sort((a, b) => b.askAmount - a.askAmount);
    case 'newest':
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default: {
      const c = q.center;
      if (!c) return out;
      const d = (l: ListingCard) =>
        (l.coordinates.latitude - c.latitude) ** 2 + (l.coordinates.longitude - c.longitude) ** 2;
      return out.sort((a, b) => d(a) - d(b));
    }
  }
}

export function searchResponse(q: SearchQuery): SearchResponse {
  const rows = sorted(matching(q), q);
  const offset = q.offset ?? 0;
  const limit = q.limit ?? 60;
  return {
    listings: rows.slice(offset, offset + limit),
    total: rows.length,
    limit,
    offset,
    sampled: false,
  };
}

/** The ceiling the real marker feed bins above. */
const MAX_MAP_POINTS = 500;
const BIN_CELL_PX = 48;

/** Cell edge in degrees for ~48 screen pixels at `zoom`, 512-pixel tiles. */
function cellDegrees(zoom: number, lat: number): { dLat: number; dLng: number } {
  const metres =
    (BIN_CELL_PX * 40075016.686) / (512 * Math.pow(2, Math.max(0, Math.min(22, zoom))));
  const dLat = metres / 111320;
  return { dLat, dLng: dLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180)) };
}

/**
 * Mirrors POST /api/v1/listings/map: exact points up to the ceiling, and above
 * it a mix of lone listings and aggregates whose counts sum to the total. An
 * aggregate is not a listing — it has no single price and nothing to open.
 */
export function mapFeed(q: SearchQuery & { zoom?: number }): Record<string, unknown> {
  const rows = matching(q);
  const total = rows.length;

  if (total <= MAX_MAP_POINTS) {
    return {
      listings: rows.map((l) => ({
        id: l.id,
        coordinates: l.coordinates,
        markerPrice: l.markerPrice,
      })),
      total,
      binned: false,
      sampled: false,
    };
  }

  const mid = q.center?.latitude ?? 10.5;
  const { dLat, dLng } = cellDegrees(q.zoom ?? 10, mid);
  const cells = new Map<string, ListingCard[]>();
  for (const l of rows) {
    const key = `${Math.floor(l.coordinates.latitude / dLat)}:${Math.floor(l.coordinates.longitude / dLng)}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(l);
    else cells.set(key, [l]);
  }

  const listings = [...cells.entries()].map(([key, group]) => {
    if (group.length === 1) {
      const l = group[0];
      return { id: l.id, coordinates: l.coordinates, markerPrice: l.markerPrice };
    }
    const lats = group.map((l) => l.coordinates.latitude);
    const lngs = group.map((l) => l.coordinates.longitude);
    const sortedRows = [...group].sort((a, b) => a.askAmount - b.askAmount);
    const lo = sortedRows[0];
    const hi = sortedRows[sortedRows.length - 1];
    return {
      id: `bin:${key}`,
      coordinates: group[0].coordinates,
      count: group.length,
      bbox: {
        south: Math.min(...lats),
        west: Math.min(...lngs),
        north: Math.max(...lats),
        east: Math.max(...lngs),
      },
      mode: 'sale',
      priceLo: lo.markerPrice,
      priceHi: hi.markerPrice,
      priceLoAmount: lo.askAmount,
      priceHiAmount: hi.askAmount,
      samples: group.slice(0, 2).map((l) => ({
        id: l.id,
        markerPrice: l.markerPrice,
        coordinates: l.coordinates,
      })),
    };
  });

  return { listings, total, binned: true, sampled: false };
}

export function detailFor(id: string): ListingDetail | undefined {
  const l = devListings.find((row) => row.id === id);
  if (!l) return undefined;
  const [place, region] = l.addressDisplay.split('\n');
  const area = l.highlightFields.find((f) => f.key === 'areaSqm');
  return {
    id: l.id,
    propertyType: l.propertyType,
    propertySubType: l.propertySubType,
    location: {
      latitude: l.coordinates.latitude,
      longitude: l.coordinates.longitude,
      addressDisplay: `${place}, ${region}`,
    },
    lotSizeSqm: typeof area?.value === 'number' ? area.value : 400,
    fields: l.highlightFields.map((f) => ({ ...f, category: 'Details' })),
    description:
      `A sample ${l.propertySubType.replace(/_/g, ' ')} in ${place}, used while the app runs ` +
      'without a backend. The road frontage, the walk to the bus stop and the shape of the ' +
      'plot would be described here — the real listings carry a written description of what ' +
      'is around the pin, and this paragraph stands in for it so the page can be judged at ' +
      'its real length.',
    status: l.status,
    askAmount: l.askAmount,
    askCurrency: l.askCurrency,
    displayPrice: l.displayPrice,
    listedByOwner: l.id.charCodeAt(l.id.length - 1) % 2 === 0,
    listingMedia: l.images.map((url, i) => ({ id: `${l.id}-m${i}`, listingId: l.id, url })),
    contactUsername: 'nice_place_properties',
    createdAt: l.createdAt,
  };
}

const METADATA: Metadata = {
  propertyTypes: ['Land', 'Residential', 'Commercial'].map((type) => ({
    value: type,
    label: type,
    subtypes: KINDS.filter((k) => k.type === type).map((k) => ({
      value: k.subType,
      label: k.label,
    })),
  })),
  currencies: MONEY.map((m) => ({ value: m.code, label: m.code, symbol: m.symbol })),
  propertyStatuses: [
    { value: 'ForSale', label: 'For sale' },
    { value: 'ForRent', label: 'For rent' },
    { value: 'Sold', label: 'Sold' },
    { value: 'Rented', label: 'Rented' },
  ],
  areaUnits: [
    { value: 'sqm', label: 'sq.m' },
    { value: 'cent', label: 'cent' },
    { value: 'sqft', label: 'sq.ft' },
  ],
  filterRanges: {},
  defaults: { currency: 'INR', areaUnit: 'cent' },
};

/* ---------- place search ---------- */

/** ASCII-fold, so a name survives the base64 round trip in `decodePlaceId`. */
function ascii(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/g, 'o')
    .replace(/[^\x20-\x7E]/g, '');
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return globalThis.btoa(binary);
}

/**
 * Answers the place box locally.
 *
 * This is the one route in the app that costs real money: upstream it fans out
 * to Google Places AND Mapbox geocoding on every call. While sample data is on
 * it must never leave the device, however the API server is pointed — typing in
 * the place box during a long development session is otherwise a steady spend
 * for suggestions nobody is going to keep.
 *
 * The id carries its own coordinates and viewport, exactly as the real one
 * does, so picking a result needs no second request either.
 */
export function placeSuggestions(q: string, limit = 8): unknown[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  return [...KERALA, ...WORLD]
    .filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.region.toLowerCase().includes(needle) ||
        p.country.toLowerCase().includes(needle),
    )
    .slice(0, limit)
    .map((p) => {
      const label = ascii(`${p.name}, ${p.region}, ${p.country}`);
      const span = Math.max(0.08, p.spread * 4);
      return {
        suggestionType: 'place',
        placeId: `dev:${base64(
          JSON.stringify({
            latitude: p.lat,
            longitude: p.lng,
            formattedAddress: label,
            viewport: {
              southwest: { lat: p.lat - span / 2, lng: p.lng - span / 2 },
              northeast: { lat: p.lat + span / 2, lng: p.lng + span / 2 },
            },
          }),
        )}`,
        description: label,
        text: label,
        label,
        latitude: p.lat,
        longitude: p.lng,
      };
    });
}

/**
 * Answers a request from the sample data, or returns undefined to let it go to
 * the network. Sign-in is never faked: a request that needs a real account
 * should fail honestly rather than pretend.
 */
export function devRespond(path: string, method: string, body: unknown): unknown | undefined {
  const query = (body ?? {}) as SearchQuery & { zoom?: number };
  const route = path.split('?')[0];

  if (method === 'POST' && route === '/api/v1/listings/search') return searchResponse(query);
  if (method === 'POST' && route === '/api/v1/listings/map') return mapFeed(query);
  if (method === 'GET' && route === '/api/v1/metadata') return METADATA;
  if (method === 'GET' && route === '/api/v1/notifications/unread-count') return { count: 0 };
  if (method === 'GET' && (route === '/api/v1/threads' || route === '/api/v1/alerts')) return [];
  if (method === 'GET' && route === '/api/v1/activity') return [];
  if (method === 'GET' && route === '/api/v1/listings/favorites') return devListings.slice(0, 6);
  if (method === 'GET' && route === '/api/v1/listings/my') return devListings.slice(6, 12);

  // Billable upstream — answered here so sample mode cannot spend anything.
  if (method === 'GET' && route === '/api/v1/search/autocomplete') {
    const q = new URLSearchParams(path.split('?')[1] ?? '').get('q') ?? '';
    return placeSuggestions(q);
  }
  if (method === 'GET' && route === '/api/v1/search/sellers') return [];

  const detail = route.match(/^\/api\/v1\/listings\/([^/]+)$/);
  if (method === 'GET' && detail) return detailFor(detail[1]);

  return undefined;
}
