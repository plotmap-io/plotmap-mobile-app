# Plotmap mobile

The Plotmap client for phones — a map-first view of property listings, built with
[Expo](https://expo.dev) (SDK 58), React Native and expo-router.

Plotmap is a real-estate marketplace: brokers and owners publish listings, buyers
search them on a map. This repository is the **mobile client only**. It talks to the
Plotmap HTTP API over the network and holds no server code.

## Requirements

- Node 22.13+ (Node 22.12 works, but some dev dependencies warn)
- A reachable Plotmap API — see *Pointing the app at an API* below

## Getting started

```bash
npm install
npm start          # Expo dev server; press i / a, or scan the QR with Expo Go
```

### Pointing the app at an API

The app resolves its base URL in this order (`src/lib/api.ts`):

1. `EXPO_PUBLIC_API_URL`, if set.
2. The host that served the JS bundle — so a phone on the same Wi-Fi finds your
   machine automatically.
3. `http://localhost:9000` on web.

A phone cannot reach your Mac's `localhost`, so when you set the variable explicitly
use the LAN IP:

```bash
cp .env.example .env
# macOS: ipconfig getifaddr en0  →  EXPO_PUBLIC_API_URL=http://192.168.x.x:9000
```

## Running without a backend

A development build carries a **Development** section at the bottom of the Menu
tab (`Menu → Development → Server & sample data`). It has two switches:

- **API server** — which host the app talks to. Empty follows the machine that
  served the bundle. One tap points it at `https://api.example.com`, which
  nothing answers, so every request fails on demand.
- **Sample data** — *Insert fake data* answers requests locally instead, so the
  map, the list, the filters and a listing page are populated with no server
  running anywhere. *Remove fake data* goes back to the real one.

Between them they give the three states worth testing: a real server, a server
that cannot be reached, and a populated app with no server at all.

The dataset is 2,081 generated listings — 1,076 across Kerala (652 of them in
Thrissur district, the region worth stress-testing) and 1,005 spread over 30
cities on every inhabited continent, each priced in its own currency, 17 in
all. Every property type is crossed with every status so no combination is
missing, and both the current and the older lower-cased spelling of a type
appear, because an exact catalogue filter silently skips the old one.

37 rows are awkward on purpose: two pins on a single coordinate, a knot of 14
too tight to draw apart, a pair split by a grid line, money at both extremes, a
hundredth-floor flat and a basement, a gallery of thirty photos and one of
none, the antimeridian from both sides, the equator, the Arctic and Tierra del
Fuego.

A town viewport sits under the server's 500-point ceiling, so that feed is
exact points — the case a map has to thin for itself. Zoom out and it comes
back binned, with the counts summing to the total.

It is deterministic, so every launch and every machine sees the same map.
Nothing in it is real, and the section does not exist in a release build.

**What it costs: nothing.** The app makes no AI calls at all, and map rendering
on the native SDKs is free. The one route that is billed upstream is the place
box — `/search/autocomplete` fans out to both Google Places and Mapbox on every
call — so sample data answers it on the device and encodes the coordinates into
the result, making a pick cost nothing either. Photos come from
`picsum.photos`, which is free but does need internet; with no connection at
all the galleries are empty and everything else still works.

Requests the sample data has no answer for still go to the network, so signing
in fails honestly rather than pretending.

### Driving it from a test

```bash
EXPO_PUBLIC_TEST_MODE=1 npx expo start
```

Under that flag the app starts **pointed at an unreachable host with no sample
data**, and whatever the last person left on the device is ignored. A run can
neither reach a real backend by accident nor inherit someone else's state, and
the default a test sees is the honest-failure path.

A test that needs data asks for it in the URL it navigates to:

| URL | What the app does |
|---|---|
| `/` | nothing answers — the empty, failing state |
| `/?sample=1` | answers from the sample dataset, no network at all |
| `/?api=https://host` | talks to that host instead |

Nothing is written to storage in test mode, so the fixture is gone on the next
navigation. There is no teardown step to forget, and one test cannot seed the
next. Both parameters work outside test mode too, and are equally unpersisted;
they are ignored entirely by a release build.

## Checks

```bash
npm test           # unit tests (vitest, plain Node)  — green
npm run typecheck  # tsc --noEmit                     — green
npm run lint       # expo lint                        — see below
```

`npm test` and `npm run typecheck` pass from a fresh clone with nothing else
installed or running — no device, no simulator, no server. Both run in CI on
every push (`.github/workflows/ci.yml`); they are the only checks that can,
since everything else about this app has to be run on something to be believed.

`npm run lint` currently reports pre-existing errors. They come from the React
Compiler rules in `eslint-config-expo` 58 (`reactCompiler` is on in `app.json`)
and are spread across the screens — values modified during render, refs read in
render. They are known and unrelated to any one change.

Tests live in `tests/` and run in plain Node, so they can only import modules that
are free of React Native imports: `src/services/`, `src/types/api.ts` and
`src/lib/dev-data.ts`. Logic worth testing belongs in a service rather than inside
a component — see *Views and services* below.

## Layout

```
src/
  app/          screens — expo-router file routes, one file per screen
    (tabs)/     Search (index), Home, Saved, Menu
    listing/    listing detail
    thread/     one message thread
    u/          public profile by username
  components/   shared UI (cards, sheets, map canvas, tab bar)
  services/     pure logic — no React, no React Native, tested in Node
  lib/          API client, auth, React state, formatting, dev data
  types/        API types and tables
  theme/        colour and spacing tokens
dev-resources/  the API contract this client talks to — see its README
scripts/        make-upload.sh, for packaging the repo
```

The server's OpenAPI document, narrowed to the routes this client calls, is
checked in at `dev-resources/api/openapi.json` and regenerated with
`npm run api:sync`. Read `dev-resources/README.md` before integrating: the
response envelope is not uniform, and the marker feed is not typed there.

Two conventions worth knowing before changing anything:

- **The server does the heavy lifting.** It returns pre-formatted strings —
  `displayPrice` (`₹ 42,00,000`), `markerPrice` (`₹ 42.0 L`), `addressDisplay`,
  labelled `highlightFields`. The client attaches the token, unwraps the envelope and
  renders. Re-implementing formatting on the client duplicates work the API already did.
- **Views and services are separate.** Anything that is a *decision* — which
  filters reach the server, what belongs on the map — lives in `src/services/`
  as a plain function with no React or React Native import, so `npm test` can
  run it in Node with no device and no server. Screens and hooks hold what is
  genuinely React: state, effects, layout. `services/search-query.ts` builds
  the search query from the filters; `services/filters.ts` holds the filter
  rules; `services/map-pins.ts` decides the markers a map canvas draws, and
  both canvases draw what it returns without knowing what a listing is.
- **Response shapes are not uniform.** Most routes wrap `{ data, errors, meta }`;
  auth and session routes return the resource directly, or `{ error }` on failure.
  `request()` in `src/lib/api.ts` normalises both — go through it.

Search is driven by the map viewport: panning or zooming re-queries the backend for
listings inside the new bounds, and all filtering happens server side
(`src/lib/use-search.ts`).

## Platforms

iOS and Android are the targets. The web build runs (`npm run web`) and is used for
quick checks; `map-canvas.web.tsx` swaps the native map for a Leaflet one.

`ios/` and `android/` are not checked in — they are generated by Continuous Native
Generation. Configure native behaviour in `app.json`, never by editing those folders.

## License

MIT — see [LICENSE](LICENSE).
