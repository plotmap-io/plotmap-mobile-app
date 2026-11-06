/**
 * Regenerates the map-feed fixtures. Run: `node tests/fixtures/generate.mjs`
 *
 * The data is SYNTHETIC on purpose. These fixtures exist to pin the *shape* of
 * POST /api/v1/listings/map and a realistic spatial spread — never to publish
 * real inventory. Ids are plainly fake, prices are round numbers, and the
 * points are drawn from a seeded generator so every run is identical.
 *
 * The contract they mirror:
 *   { listings: Item[], total: number, binned: boolean, sampled: boolean }
 *
 *   binned === false  — the server returned EXACT points, at most 500 of them.
 *     Item = { id, coordinates, markerPrice }
 *
 *   binned === true   — above 500 matches the server bins every listing into
 *     ~48-screen-pixel cells at the requested zoom, and the feed is a MIX:
 *     a cell holding one listing is emitted as that listing, a cell holding
 *     more is an aggregate. The counts sum to `total` exactly.
 *     Bin = { id: "bin:x:y", coordinates, count, bbox, mode,
 *             priceLo, priceHi, priceLoAmount, priceHiAmount, samples[] }
 *
 * An aggregate is NOT a listing: `count > 1` means there is no single id to
 * open and no single price to print.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Deterministic LCG — identical output on every machine and every run. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const money = (lakhs) => `₹ ${lakhs.toFixed(1)} L`;
const round5 = (n) => Math.round(n * 1e5) / 1e5;

/** Listings cluster around towns, never spread evenly — that is the whole
 *  reason a map of them needs thinning. */
function scatter(rand, centres, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const c = centres[Math.floor(rand() * centres.length)];
    const lakhs = Math.round((8 + rand() * 180) * 10) / 10;
    out.push({
      id: `sample-${String(i + 1).padStart(4, '0')}`,
      coordinates: {
        latitude: round5(c[0] + (rand() - 0.5) * c[2]),
        longitude: round5(c[1] + (rand() - 0.5) * c[2]),
      },
      markerPrice: money(lakhs),
      _amount: lakhs * 100000,
    });
  }
  return out;
}

const strip = (p) => ({ id: p.id, coordinates: p.coordinates, markerPrice: p.markerPrice });

function unbinned(points) {
  return { listings: points.map(strip), total: points.length, binned: false, sampled: false };
}

/** Groups points into `cells` aggregates plus `singles` lone pins, the way the
 *  server's grid does, so `sum(count) === total`. */
function binned(points, cells) {
  const buckets = new Map();
  for (const p of points) {
    const key = `${Math.floor(p.coordinates.latitude * cells)}:${Math.floor(p.coordinates.longitude * cells)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(p);
  }
  const listings = [];
  for (const [key, group] of buckets) {
    if (group.length === 1) {
      listings.push(strip(group[0]));
      continue;
    }
    const lats = group.map((p) => p.coordinates.latitude);
    const lngs = group.map((p) => p.coordinates.longitude);
    const amounts = group.map((p) => p._amount).sort((a, b) => a - b);
    const lo = amounts[0];
    const hi = amounts[amounts.length - 1];
    listings.push({
      id: `bin:${key.replace(':', ':')}`,
      coordinates: group[0].coordinates,
      count: group.length,
      bbox: {
        south: Math.min(...lats),
        west: Math.min(...lngs),
        north: Math.max(...lats),
        east: Math.max(...lngs),
      },
      mode: 'sale',
      priceLo: money(lo / 100000),
      priceHi: money(hi / 100000),
      priceLoAmount: lo,
      priceHiAmount: hi,
      samples: group.slice(0, 2).map(strip),
    });
  }
  return {
    listings,
    total: points.length,
    binned: true,
    sampled: false,
  };
}

// Centres are [lat, lng, spread°]. Thrissur town is already the app's
// INITIAL_REGION, so the area reveals nothing the repo does not already say.
const TOWN = [
  [10.5276, 76.2144, 0.03],
  [10.5410, 76.2210, 0.02],
  [10.5120, 76.1980, 0.02],
  [10.5330, 76.2380, 0.015],
];
const DISTRICT = [
  ...TOWN,
  [10.6400, 76.0800, 0.08],
  [10.3700, 76.1400, 0.08],
  [10.7300, 76.3500, 0.07],
  [10.2800, 76.2000, 0.06],
  [10.5900, 76.4800, 0.07],
];
const STATE = [
  ...DISTRICT,
  [9.9312, 76.2673, 0.25],
  [8.5241, 76.9366, 0.25],
  [11.2588, 75.7804, 0.25],
  [12.2748, 75.0970, 0.2],
  [9.5916, 76.5222, 0.2],
];

const files = {
  // A town viewport: well under the 500-point ceiling, so exact points.
  'map-town.json': unbinned(scatter(rng(11), TOWN, 422)),
  // A district viewport: still exact, and the case a naive client renders
  // one marker at a time.
  'map-district.json': unbinned(scatter(rng(22), DISTRICT, 496)),
  // A state viewport: past the ceiling, so the server bins.
  'map-state-binned.json': binned(scatter(rng(33), STATE, 1361), 20),
};

for (const [name, body] of Object.entries(files)) {
  writeFileSync(join(HERE, name), JSON.stringify(body, null, 1) + '\n');
  const bins = body.listings.filter((l) => (l.count ?? 1) > 1).length;
  const sum = body.listings.reduce((n, l) => n + (l.count ?? 1), 0);
  console.log(
    `${name.padEnd(24)} binned=${String(body.binned).padEnd(5)} total=${String(body.total).padEnd(5)} items=${String(body.listings.length).padEnd(4)} bins=${String(bins).padEnd(4)} sum=${sum}`,
  );
}
