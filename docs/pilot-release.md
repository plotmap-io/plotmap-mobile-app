# Putting the app on the pilot broker's phone

For Ajay. Assumes an iPhone, no Xcode and no Android SDK on the Mac. Everything
below runs in the cloud on EAS, so none of that is needed to produce a build.

Run EAS as **`npx eas-cli@latest <command>`** — there is no global `eas` install and
a globally pinned `eas-cli` goes stale. (Expo's own correction: *"`expo-cli` (global
install) is deprecated. Use `npx expo`"* — the same applies to `eas`.) `eas.json` in
the repo root declares `"version": ">= 27.0.0"`, which any `@latest` satisfies.

Docs this file follows: `https://docs.expo.dev/build/eas-json.md`,
`/eas/json.md`, `/build/internal-distribution.md`, `/build-reference/simulators.md`,
`/eas-update/getting-started.md`, `/submit/ios.md`,
`/versions/v58.0.0/sdk/map-view.md`, `/versions/latest/config/app.md`.

---

## (a) One-time setup

### 1. Expo account and project

```bash
npx eas-cli@latest login            # creates/uses an Expo account — free
npx eas-cli@latest init             # links this folder to an EAS project
```

**What `eas init` writes into `app.json`:** it adds `extra.eas.projectId` (a UUID)
and, if the account is not already implied, `owner` (your Expo account/org name). It
does **not** touch anything else. I have not written these — `app.json` is being
edited by another session right now, so let whoever owns that file add them, or run
`eas init` yourself when the tree is quiet and accept its edit.

`eas.json` sets `"appVersionSource": "remote"`, so **EAS owns the build numbers**.
The first `eas build` offers to initialise the remote version from `app.json`'s
`"version": "1.0.0"` — say yes. After that `autoIncrement` on the `production`
profile bumps `ios.buildNumber` / `android.versionCode` server-side and you never
hand-edit a version again. `requireCommit` is `false` on purpose: the working tree
is shared with other sessions and a build must not be blocked by someone else's WIP.

### 2. Store accounts — what you actually need, and when

| | Cost | Needed for |
|---|---|---|
| Expo account | free | every EAS build |
| **Apple Developer Program** | US$99/yr | **any** build on a real iPhone that is not your own 7-day sideload, and all of TestFlight. Non-negotiable for an iOS pilot with a stranger's phone. |
| Google Play Console | US$25 once | only to ship through Play. **Not needed for the pilot** — an internal-distribution APK installs straight from a link. |

Apple takes a day or two to approve a new membership (and longer for an
organisation, which needs a D-U-N-S number). **Start it before you need it.** Enrol
as an individual if the Kerala pilot is the only deadline.

### 3. Android Google Maps API key

`src/components/map-canvas.tsx:161` uses `PROVIDER_GOOGLE` on Android and
`PROVIDER_DEFAULT` (Apple Maps) on iOS. So:

- **An iOS-only pilot needs no Google Maps key at all.** Apple Maps renders free and
  does not touch the plotmap-io project.
- **Android needs a key**, or the map renders as a blank grey grid with a Google
  watermark and no tiles.

Per the SDK 58 docs the key goes in the **`react-native-maps` config plugin**, not in
the legacy `android.config.googleMaps.apiKey` field (that field still exists in the
app-config reference but is not what the SDK 58 `map-view` page prescribes). Whoever
owns `app.json` adds, inside `expo.plugins`:

```json
[
  "react-native-maps",
  { "androidGoogleMapsApiKey": "AIza…" }
]
```

Getting the key, with the cost caps in mind (`knowledge/ops/google-cloud.md`):

1. In the **plotmap-io** GCP project, enable **Maps SDK for Android**. This is a
   different SKU from the Places / Places (New) / Geocoding APIs that carry the hard
   daily caps after the Aug-2026 CA$1,000 month — mobile native dynamic map rendering
   is not billed per map load, so adding it does not widen that exposure. Do **not**
   enable Maps SDK for iOS; nothing uses it.
2. Create a **brand-new, separate key**. Never reuse the existing capped
   Places/Geocoding key: that one is restricted to server-side APIs, and an
   Android-app-restricted key cannot call them (and vice versa). One key, one job.
3. Restrict it: **Application restrictions → Android apps**, then add
   package name `com.plotmap.mobile` plus the **SHA-1** fingerprint. **API
   restrictions → Maps SDK for Android only.**
4. The SHA-1 is EAS's, not yours — EAS generates and holds the upload keystore.
   Read it with `npx eas-cli@latest credentials` (Android → the build profile), or
   from the project's credentials page on expo.dev. A Play-signed release later has a
   *second* SHA-1 from Play's App Signing; add that key too when you get there.
5. Keep a CA$50 budget alert on the project. The app itself makes no AI calls, and
   the one billed route it touches is `/search/autocomplete` on the **backend** (which
   fans out to both Google Places and Mapbox per call) — that cost is the server's,
   not the phone's, but the place box is debounced for exactly this reason.

### 4. iOS Info.plist strings

`app.json` has no `ios.infoPlist` block at all today, and `map-canvas.tsx:169` sets
`showsUserLocation` — so iOS needs a location usage string **now** or the blue dot
silently never appears. The camera/library strings are needed the moment photo
upload lands (see `pilot-gaps.md` gaps 1–2); adding them early costs nothing.
Whoever owns `app.json` adds, under `expo.ios`:

```json
"infoPlist": {
  "NSLocationWhenInUseUsageDescription": "Plotmap uses your location to centre the map on where you are and to sort listings by distance. It is never attached to a listing.",
  "NSCameraUsageDescription": "Plotmap uses the camera to photograph a property you are listing.",
  "NSPhotoLibraryUsageDescription": "Plotmap needs access to your photos so you can add pictures to a listing.",
  "ITSAppUsesNonExemptEncryption": false
}
```

The wording of the first one is lifted from `src/app/support.tsx:22`, so the privacy
page and the system prompt say the same thing. `ITSAppUsesNonExemptEncryption: false`
is not a permission — it answers App Store Connect's export-compliance question
automatically on every TestFlight upload instead of asking you each time.

---

## (b) The API base URL for production

**Use `EXPO_PUBLIC_API_URL=https://plotmap.com`.** That is what `eas.json` sets on
both the `preview` and `production` profiles.

**This is not optional.** `src/lib/api.ts:inferBaseUrl()` falls back to the host that
served the JS bundle, and a release build has no Metro host — so with the variable
unset, a release app asks `http://localhost:9000` and **every single request fails**.
`.env` does not save you either: it is gitignored and is not uploaded to EAS, so the
`env` block in `eas.json` is the only thing that sets this for a cloud build.
`EXPO_PUBLIC_*` values are inlined into the bundle at build time.

### What I found, checking both hosts

Both `https://plotmap.com` and `https://plotmap-backend.fly.dev` work today. Nothing
on either path can refuse a native client:

- **nginx** (`frontend/nginx.conf`, upstream from the env-templated `BACKEND_UPSTREAM`
  = `plotmap-backend.internal:9000` in prod) proxies exactly three prefixes to the
  backend: `location /api/`, `location = /openapi.json` (rewritten to
  `/api/v1/openapi.json`), and `location /og/`. `/api/` is **not** path-rewritten,
  `Authorization` is forwarded verbatim, `client_max_body_size` is 25 MB,
  `proxy_buffering off` + `proxy_read_timeout 1h` (so SSE would work if the app ever
  adds it). nginx adds and strips **no** CORS headers. The crawler-UA routing exists
  but is consulted only inside the `/@handle`, `/users/:u` and `/listing/:id` SPA
  locations — it cannot touch `/api`. There is no UA filter, no referer check, no IP
  allowlist.
- **Backend CORS is fully permissive, and the allow-list in config is dead.**
  `application.conf` lists `cors.allowedOrigins` (localhost only) but
  `ServerModule.scala:127` ignores it and applies `.withAllowOriginAll`,
  `.withAllowMethodsAll`, `.withAllowHeadersAll`, `.withAllowCredentials(false)`.
  Cookies are therefore not allowed cross-origin — irrelevant, the app uses
  `Authorization: Bearer`, which `withAllowHeadersAll` permits.
- **CORS does not apply to this app anyway.** It is a browser-enforced policy; a
  React Native `fetch` sends no `Origin` and enforces no response headers. And there
  is no server-side origin check to trip over — a request with no `Origin` is served
  normally. The `hosts.allowed` list in `application.conf` is likewise dead config:
  `HostsConfig` is constructed and never consumed, so there is no Host-header check.
- `plotmap-backend.fly.dev` **is** publicly reachable (`backend/fly.toml` has a public
  `[http_service]`, `force_https = true`, and the app holds public v4/v6 ingress IPs).

So the choice is about which contract is stable, not which one works:

- `plotmap.com` is the host **you** own — a Cloudflare DNS record and an attached
  cert. `plotmap-backend.fly.dev` is a fly-generated name bound to an app *name*, and
  it moves if the app is ever recreated or renamed.
- The parked **admin-isolation** plan (AGENTS.md §7) explicitly calls for *"no public
  IPs on backend/admin, reach via Fly WireGuard."* If that ever ships,
  `plotmap-backend.fly.dev` goes dark and **every installed binary pinned to it is
  dead** — a shipped app cannot be re-pointed without another store release.
  `plotmap.com/api` keeps working, because nginx reaches the backend over `.internal`.
- One host for the API, the OAuth redirects, the share links and the deep links.

The one real cost: **nginx adds roughly 200 ms per request.** Measured from this
machine against `/api/v1/health`, `plotmap.com` ran ~0.50 s versus ~0.29 s direct.
`nginx.conf` has no `upstream {}` block with `keepalive`, so every proxied request
opens a fresh TCP connection from the frontend machine (prod runs **sin + yyz**) to
the backend in sin. If that ever bites, the fix is a `keepalive 32` in `nginx.conf`
— which helps the web app too — not a different base URL in the app.

Two things to keep in mind: nginx proxies only those three prefixes, so a future
backend route mounted outside `/api/` would be unreachable through plotmap.com until
a line is added; and bare `/api` with no trailing slash returns the SPA shell, so keep
every client path as `/api/v1/...` (they all are).

Health check for your own sanity: `curl https://plotmap.com/api/v1/health` →
`{"status":"ok","service":"plotmap-backend"}`. Auth rate limits on the backend are
500/min and 5000/hour per IP, with 100 OTP attempts per 600 s window — a pilot of one
will never see them.

The in-app override in **Menu → Development → Server & sample data** stays available
in dev builds, so you can point a dev build at staging, a LAN IP, or the direct
backend without a rebuild. It is `__DEV__`-gated and absent from release builds.

---

## (c) The three build paths, ranked for this pilot

### 1. EAS `preview` build — do this one

```bash
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios     --profile preview
```

**Android** (the easy half). `distribution: "internal"` + `buildType: "apk"` produces
an installable APK and a shareable build page with a QR code. Send the broker the
link; he taps it, accepts the "install from unknown source" warning, and it is on his
phone. No Play Console, no account, no review, no waiting. If the pilot broker has an
Android phone, **you are done in one build.**

**iOS** needs the US$99 Apple Developer membership either way, and then you choose:

- **TestFlight (recommended for a stranger's iPhone)** — build with the `production`
  profile and `npx eas-cli@latest submit --platform ios --profile production`. It
  prompts for your Apple ID on first run and uploads to App Store Connect; the build
  appears in TestFlight after ~10–15 minutes of processing. Add the broker as an
  internal tester by email; he installs the TestFlight app and taps Install. No UDID,
  no device registration, and the next build reaches him with no action from you. A
  TestFlight build expires after 90 days.
- **Ad-hoc internal distribution** — the `preview` profile with
  `ios.simulator: false`. You must first register the broker's device UDID with
  `npx eas-cli@latest device:create`, and *only devices in the list at build time can
  install it* — a new device means a rebuild. More friction, no App Store Connect
  round trip. Worth it only if TestFlight processing is in your way.

Note `eas.json`'s `development` profile sets `ios.simulator: true`, which is a
**simulator-only** binary — it cannot be installed on any physical iPhone. That is
why there is a `development-device` profile that extends it with `simulator: false`.
Use `development` for a simulator (`eas build:run -p ios --latest` installs it) and
`development-device` for a dev client on a real phone.

### 2. Local release build — once Xcode exists

```bash
npx expo run:ios --configuration Release
```

SDK 58 requires **Xcode 26.4+** and iOS 16.4+. This is the fastest way to put a
*release-mode* build on **your own** iPhone for the performance pass in (d), and a
free Apple ID is enough (7-day provisioning, then it stops launching). It is not a
way to reach the broker's phone. Note that `npx expo run:ios` runs `prebuild`, which
generates `ios/` — that folder is gitignored and must never be edited by hand or
committed (Continuous Native Generation; configure natives in `app.json` only).

### 3. Expo Go — not acceptable for the pilot

Not a judgement call; four concrete reasons:

- **The broker would see the dev tooling.** `src/app/(tabs)/menu.tsx` gates the
  Development group on `__DEV__`, which is **true** in Expo Go. A real pilot user
  gets a "Server & sample data → *Insert fake data*" switch on his menu, and a
  "Remove fake data" he will not understand. The dev menu (shake to open) is live too.
- **It runs a dev-mode JS bundle** — unminified, React in development mode, no
  Hermes release optimisations. Everything in (d) measures slower than reality, so
  you would be tuning against a phantom.
- **Expo Go carries only the native modules it ships with.** This app depends on
  `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `react-native-maps`,
  `react-native-reanimated` 4 and `react-native-worklets`. The first time a pilot fix
  needs a module Expo Go does not bundle, the broker's app cannot run it — and Expo
  Go is pinned to one SDK, so an SDK bump orphans him with no upgrade path you control.
- **No identity and no delivery.** No icon, no app name, no splash — he launches
  "Expo Go" and scans a QR. There is no `eas update` channel, no build number, no
  crash reporting, nothing to roll back.

---

## (d) Release-mode performance pass, on a real device

Do this on a **release** build (path 2 or a `preview` build), never in Expo Go or a
dev client — a dev bundle is misleading. If you can, test on a mid-range Android too,
not only the iPhone; Kerala brokers are not all on flagships.

1. **Drawer drag** (`src/app/(tabs)/index.tsx`). Drag the list drawer slowly through
   all four detents and then flick it. Watch for: the sheet tracking your finger with
   no lag, the flick going exactly **one** stop, no stutter as the map resizes
   underneath, and no frame drop when the panel crosses the map. Reanimated 4 +
   worklets should keep this on the UI thread — if it judders, something has fallen
   back to the JS thread.
2. **List scroll.** The search list is a correctly configured `FlatList`
   (`getItemLayout`, `initialNumToRender: 8`, `windowSize: 7`,
   `removeClippedSubviews`) and `PAGE_SIZE` is 60, so search caps at 60 rows and
   should be smooth. **The ones to actually stress are Saved, Home and My listings**:
   they render `rows.map(...)` inside a plain `ScrollView`, so every row is mounted at
   once. Point the app at the sample dataset (dev build) or at a large staging
   account, get 300 rows in there, and scroll fast. Look for a long blank hold on
   first paint and dropped frames mid-flick. If it stalls, those three screens want
   `FlatList`, and that is a real pilot fix if the broker ends up with a long Saved list.
3. **Map pan with piles.** Pan and zoom hard over Thrissur, where the sample data
   puts 652 listings. Check: piles form and split at the right moment, the price pill
   on a pile is the listing it stands on, a zoom-in disperses rather than snapping,
   and tapping a pile frames its bounds. Then watch the **network**: every settled
   pan re-queries, so confirm it debounces and that a slow reply never overwrites a
   newer one (`use-search.ts` has a sequence guard — verify it holds on a real 3G-ish
   connection).
4. **Cold start.** Kill the app and relaunch. Time to the map being draggable. The
   splash should not sit there for seconds.
5. **A throttled network and then no network.** Enable Network Link Conditioner (or
   airplane mode mid-scroll). Errors must say what failed, with the base URL —
   `use-search.ts` already appends `apiBase()` to its error. Nothing should hang
   forever with a spinner.
6. **Memory over ten minutes.** Scroll the list, open and close twenty listings, pan
   the map. Watch for growth that never comes back — the listing hero mounts a
   horizontal `ScrollView` of full-width images per listing.
7. **Sign-in on the real backend.** Confirm the OTP round trip works against
   `https://plotmap.com` from the phone's own mobile data, not just Wi-Fi.

---

## (e) OTA updates during the pilot

`expo-updates` is **not installed yet**, so `eas update` will not work until:

```bash
npx expo install expo-updates
npx eas-cli@latest update:configure
```

`update:configure` adds `runtimeVersion` and `updates.url` to `app.json` (plus
`extra.eas.projectId` if `eas init` has not already), and sets the `channel` property
on the **`preview` and `production`** profiles in `eas.json`. I deliberately left
`channel` out of `eas.json` — declaring a channel for a project with no
`expo-updates` installed only produces build warnings; let the command write it.

Then a JS-only fix during the pilot is:

```bash
npx eas-cli@latest update --channel preview --message "fix the cents label"
```

The broker's installed app picks it up on next launch — no new install, no TestFlight,
no APK link.

**What an update can carry:** anything in `src/` — screens, components, services,
styles, copy, API paths, and the JS side of a bug fix. That covers most of
`pilot-gaps.md`'s lower half.

**What forces a new build** (an update cannot cross this line — `runtimeVersion`
compatibility is the whole mechanism):

- adding or removing **any** native dependency — `expo-image-picker`,
  `expo-camera`, `expo-location`, `expo-notifications`. So **gaps 1, 2 and 7 in
  `pilot-gaps.md` all need a rebuild**, not an update.
- any change to `app.json`'s native surface: the Google Maps key, `ios.infoPlist`
  strings, permissions, bundle id, package name, icon, splash, scheme, plugins.
- an Expo SDK bump or a `react-native` version change.
- a change to `runtimeVersion` itself.

Practical rule for the pilot: **take one careful build to the broker's phone with the
native surface finished** (maps key, Info.plist strings, image picker, camera,
notifications — everything native you think you will want), then iterate on JS over
the air for the rest of the pilot.

---

## (f) Blocked on Ajay — the three that touch this app

### 1. Real OTP delivery (Resend) — before a stranger signs in

This is the one that matters. I read the code: `OtpGenerator.scala` holds
`private val DevOtp = "111111"`, and `verifyCode` short-circuits —
`if isDev && code == DevOtp then IO.pure(true)` — so with `AUTH_DEV_MODE=true`,
**`111111` verifies against any identifier that has ever requested a code.** And
delivery is independent of dev mode: `IdentityService.deliverOtp` always calls the
mail provider, best-effort, but `mail.provider` defaults to `"log"` and an empty
`RESEND_API_KEY` forces the Log adapter regardless. `flyctl secrets list -a
plotmap-backend` has **no** `MAIL_PROVIDER`, `RESEND_API_KEY` or `AUTH_DEV_MODE`.

So, on prod today: **nothing is emailed, and `111111` is the password to every
account.** The pilot broker's account — and yours — are open to anyone who knows that,
and the app is a public install link away from anyone.

- To get the broker signed in *now*: tell him the code over the phone. It works.
- Before the install link goes anywhere you do not control: supply `RESEND_API_KEY`,
  set `MAIL_PROVIDER=resend`, verify a code actually arrives, **then**
  `AUTH_DEV_MODE=false`. Never flip that flag before email works — it locks everyone
  out, including you.
- The app is already correct here: `src/lib/auth.tsx` and `src/app/sign-in.tsx`
  request a code and verify whatever the user types. Nothing hardcodes `111111`, so
  the flip needs no app change. Note the sign-in copy says *"email or phone"* while
  the web is email-only (no SMS) — a phone number will take the code request and
  deliver nothing.
- `AUTH_VALIDATE_SESSIONS=true` on prod, so sessions are revocable for real, and
  `AUTH_TOKEN_EXPIRY_SECONDS` is 30 days — the broker signs in once a month, not once
  a day. Good for a field pilot.

### 2. The Android Google Maps key

Only if the broker is on Android. Section (a)(3). Without it the map is a grey grid
— the app's entire front door. An iPhone pilot does not need it.

### 3. Everything else, and whether it blocks

- **Apple Developer Program (US$99)** — blocks any iOS path to his phone. Start it now.
- **`plotmap.dev` / staging DNS** — does not block. Point dev builds at
  `https://plotmap-backend-staging.fly.dev` via the Development screen.
- **OpenRouter key on prod** — does not block; the app makes no AI calls at all.
- **plotmap.com OAuth redirect URIs** — does not block; the app's sign-in is OTP only.
  It *would* block adding Google/Facebook sign-in to the app later.
- **`DASHBOARD_API_KEY` unset** — unrelated to the app, but while the pilot is live
  the prod admin panel accepts the default `"password"`. One `flyctl secrets set
  DASHBOARD_API_KEY=<random>` closes it. Worth doing before a real broker's data is
  in there.
