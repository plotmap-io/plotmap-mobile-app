/**
 * A synthetic backend, for development only.
 *
 * Point the API server URL at an unreachable host and the app has nothing to
 * show: every request fails, and nothing is ever cached because nothing ever
 * arrived. Turning sample data on answers the same requests locally instead,
 * so the map, the list, the filters and a listing page are all populated with
 * no server running anywhere.
 *
 * Nothing here is real. The rows are generated from a seeded sequence, so the
 * dataset is identical on every machine and every launch, and the ids say what
 * they are. Real listings are never seeded into the app — an empty map in
 * production is answered by server-flagged showcase listings, not by fakes.
 *
 * It is pure TypeScript with no React Native imports, so tests can import it
 * directly in plain Node.
 */
import type {
  Coordinate,
  ListingCard,
  ListingDetail,
  Metadata,
  SearchQuery,
  SearchResponse,
} from '@/types/api';

/* ---------- formatting, matching what the backend sends ---------- */

/** Indian digit grouping: 4200000 → "42,00,000". */
function grouped(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const head = s.slice(0, -3);
  return `${head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${s.slice(-3)}`;
}

/** Map-pin money: "₹ 42.0 L", "₹ 1.2 Cr". */
function short(n: number): string {
  if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `₹ ${(n / 100000).toFixed(1)} L`;
  return `₹ ${grouped(n)}`;
}

const full = (n: number) => `₹ ${grouped(n)}`;

/* ---------- the dataset ---------- */

/** Deterministic LCG, so every run produces the same map. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

interface Town {
  name: string;
  lat: number;
  lng: number;
  spread: number;
  weight: number;
}

/** Thrissur district, where the app opens, holds just under the server's
 *  500-point ceiling, so that view is exact points — the case a map has to
 *  thin for itself. The rest of Kerala pushes a state-wide viewport over the
 *  ceiling, where the feed comes back binned instead. */
const TOWNS: Town[] = [
  { name: 'Punkunnam', lat: 10.5276, lng: 76.2144, spread: 0.028, weight: 120 },
  { name: 'Ayyanthole', lat: 10.5410, lng: 76.2010, spread: 0.02, weight: 75 },
  { name: 'Ollur', lat: 10.4620, lng: 76.2440, spread: 0.03, weight: 60 },
  { name: 'Guruvayur', lat: 10.5949, lng: 76.0410, spread: 0.035, weight: 50 },
  { name: 'Irinjalakuda', lat: 10.3420, lng: 76.2140, spread: 0.035, weight: 45 },
  { name: 'Chalakudy', lat: 10.3080, lng: 76.3340, spread: 0.03, weight: 35 },
  { name: 'Wadakkanchery', lat: 10.6540, lng: 76.2420, spread: 0.03, weight: 35 },
  { name: 'Kodungallur', lat: 10.2240, lng: 76.1950, spread: 0.03, weight: 25 },
  { name: 'Kochi', lat: 9.9312, lng: 76.2673, spread: 0.09, weight: 70 },
  { name: 'Kozhikode', lat: 11.2588, lng: 75.7804, spread: 0.08, weight: 50 },
  { name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366, spread: 0.09, weight: 45 },
  { name: 'Kottayam', lat: 9.5916, lng: 76.5222, spread: 0.07, weight: 30 },
];

const TYPES: [string, string, string][] = [
  ['land', 'plot', 'Residential Plot'],
  ['land', 'agricultural', 'Agricultural Land'],
  ['residential', 'house', 'House'],
  ['residential', 'apartment', 'Apartment'],
  ['commercial', 'shop', 'Shop'],
];

function card(
  id: string,
  coordinates: Coordinate,
  amount: number,
  type: [string, string, string],
  place: string,
  over: Partial<ListingCard> = {},
): ListingCard {
  return {
    id,
    propertyType: type[0],
    propertySubType: type[1],
    typeIcon: type[0],
    coordinates,
    status: 'ForSale',
    askAmount: amount,
    askCurrency: 'INR',
    displayPrice: full(amount),
    markerPrice: short(amount),
    addressDisplay: `${place}\nThrissur`,
    city: 'Thrissur',
    highlightFields: [
      { key: 'areaSqm', value: 400, fieldType: 'number', label: 'Plot area' },
    ],
    images: [],
    createdAt: '2026-09-01T09:00:00Z',
    publishedAt: '2026-09-01T09:00:00Z',
    ...over,
  };
}

/**
 * Cases that are easy to get wrong and hard to stumble on by panning: two pins
 * at one coordinate, a knot dense enough to need grouping, a pair split by a
 * round-number boundary, money at both extremes, a row with no photos, a row
 * with nothing to highlight, and an outlier far outside the rest.
 */
function edgeCases(): ListingCard[] {
  const at = (lat: number, lng: number) => ({ latitude: lat, longitude: lng });
  const rows: ListingCard[] = [
    card('edge-same-point-a', at(10.5276, 76.2144), 4200000, TYPES[0], 'Punkunnam'),
    card('edge-same-point-b', at(10.5276, 76.2144), 7350000, TYPES[2], 'Punkunnam'),
    card('edge-boundary-west', at(10.5, 76.19999), 2500000, TYPES[0], 'Ollur'),
    card('edge-boundary-east', at(10.5, 76.20001), 2600000, TYPES[0], 'Ollur'),
    card('edge-cheapest', at(10.4421, 76.2712), 120000, TYPES[1], 'Puthur'),
    card('edge-priciest', at(10.5333, 76.2101), 480000000, TYPES[2], 'Shoranur Road'),
    card('edge-no-photos', at(10.5512, 76.2233), 3100000, TYPES[0], 'Mannuthy', {
      images: [],
    }),
    card('edge-no-highlights', at(10.5188, 76.2277), 2900000, TYPES[0], 'Koorkenchery', {
      highlightFields: [],
    }),
    card('edge-long-address', at(10.5091, 76.2312), 5600000, TYPES[4], 'Market', {
      addressDisplay:
        'Door 14/221B, Second Floor, Chelakkara Road Junction, Near the Old Panchayat Office\nThrissur',
    }),
    card('edge-for-rent', at(10.5401, 76.2188), 18000, TYPES[3], 'Poothole', {
      status: 'ForRent',
      displayPrice: '₹ 18,000 /mo',
      markerPrice: '₹ 18.0 K',
    }),
    card('edge-sold', at(10.5244, 76.2066), 6400000, TYPES[2], 'Chembukavu', {
      status: 'Sold',
      statusChangedAt: '2026-10-12T06:00:00Z',
    }),
    card('edge-far-outlier', at(12.9141, 74.8560), 9900000, TYPES[0], 'Mangaluru', {
      addressDisplay: 'Mangaluru\nKarnataka',
      city: 'Mangaluru',
    }),
  ];
  // A knot tight enough that no map can draw them apart.
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    rows.push(
      card(
        `edge-knot-${String(i + 1).padStart(2, '0')}`,
        at(round5(10.4805 + Math.cos(a) * 0.0007), round5(76.2301 + Math.sin(a) * 0.0007)),
        1800000 + i * 90000,
        TYPES[0],
        'Nedupuzha',
      ),
    );
  }
  return rows;
}

function generated(): ListingCard[] {
  const rand = seeded(20261106);
  const pool: Town[] = [];
  for (const t of TOWNS) for (let i = 0; i < t.weight; i++) pool.push(t);

  return pool.map((t, i) => {
    const type = TYPES[Math.floor(rand() * TYPES.length)];
    const lakhs = 8 + rand() * 220;
    const amount = Math.round((lakhs * 100000) / 10000) * 10000;
    const rent = rand() < 0.12;
    return card(
      `sample-${String(i + 1).padStart(4, '0')}`,
      {
        latitude: round5(t.lat + (rand() - 0.5) * t.spread),
        longitude: round5(t.lng + (rand() - 0.5) * t.spread),
      },
      amount,
      type,
      t.name,
      rent
        ? {
            status: 'ForRent',
            displayPrice: `₹ ${grouped(Math.round(amount / 400))} /mo`,
            markerPrice: short(Math.round(amount / 400)),
          }
        : {},
    );
  });
}

/** Edge cases first, so they are never lost to a `limit`. */
export const devListings: ListingCard[] = [...edgeCases(), ...generated()];

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
  const metres = (BIN_CELL_PX * 40075016.686) / (512 * Math.pow(2, Math.max(0, Math.min(22, zoom))));
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
    const amounts = group.map((l) => l.askAmount).sort((a, b) => a - b);
    const lo = amounts[0];
    const hi = amounts[amounts.length - 1];
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
      priceLo: short(lo),
      priceHi: short(hi),
      priceLoAmount: lo,
      priceHiAmount: hi,
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
  const [place, city] = l.addressDisplay.split('\n');
  return {
    id: l.id,
    propertyType: l.propertyType,
    propertySubType: l.propertySubType,
    location: {
      latitude: l.coordinates.latitude,
      longitude: l.coordinates.longitude,
      addressDisplay: `${place}, ${city}`,
    },
    lotSizeSqm: 400,
    fields: l.highlightFields.map((f) => ({ ...f, category: 'Land' })),
    description: 'Sample listing used while the app runs without a backend.',
    status: l.status,
    askAmount: l.askAmount,
    askCurrency: l.askCurrency,
    displayPrice: l.displayPrice,
    listingMedia: [],
    createdAt: l.createdAt,
  };
}

const METADATA: Metadata = {
  propertyTypes: [
    { value: 'land', label: 'Land', subtypes: [
      { value: 'plot', label: 'Residential Plot' },
      { value: 'agricultural', label: 'Agricultural Land' },
    ] },
    { value: 'residential', label: 'Residential', subtypes: [
      { value: 'house', label: 'House' },
      { value: 'apartment', label: 'Apartment' },
    ] },
    { value: 'commercial', label: 'Commercial', subtypes: [{ value: 'shop', label: 'Shop' }] },
  ],
  currencies: [{ value: 'INR', label: 'Indian Rupee', symbol: '₹' }],
  propertyStatuses: [
    { value: 'ForSale', label: 'For sale' },
    { value: 'ForRent', label: 'For rent' },
    { value: 'Sold', label: 'Sold' },
  ],
  areaUnits: [
    { value: 'sqm', label: 'sq.m' },
    { value: 'cent', label: 'cent' },
  ],
  filterRanges: {},
  defaults: { currency: 'INR', areaUnit: 'cent' },
};

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

  const detail = route.match(/^\/api\/v1\/listings\/([^/]+)$/);
  if (method === 'GET' && detail) return detailFor(detail[1]);

  return undefined;
}
