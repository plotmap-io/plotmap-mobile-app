# What the pilot broker will hit

One real Kerala plot broker, ~10 live listings, working from a phone in a field.
Read against `src/` on `feat/premium-pass` (2026-11-07) and the web product's
"What is live" in the umbrella `AGENTS.md` §7. Ranked by what stops the pilot first.

## Blockers — the pilot cannot start without these

**~~1. Publishing a listing is impossible today.~~ CLOSED (2026-11-07).**
`src/app/create/` is four screens over one draft — Photos → Where it is →
Essentials → Review — and every rule in
`FieldValidator.validateForPublish` is answered before Publish is offered:
`services/listing-draft.missingForPublish` restates them (a photo, a pin, a
price, "details", and a lot size whenever the ask is per area) and names what
is left in the broker's words, each line a tap from the step that answers it.
Walked end to end on web at 390×844 — published, and landed on the live
listing.

**~~2. No camera, no photo upload anywhere in the app.~~ CLOSED (2026-11-07).**
`expo-image-picker` (~58.0.10, bundled in Expo Go) — camera or library,
several at once; each photo goes up on pick through
`POST /api/v1/listings/:id/media/upload` as a `FormData`, with its own
spinner, its own remove, its own retry and the server's own error text. An
empty MIME type is never a rejection: it defaults to `image/jpeg`, which is
what the server assumes too. The three iOS usage strings and
`ITSAppUsesNonExemptEncryption` are in `app.json` in the wording
`pilot-release.md` prescribes. **Not verified without a simulator:** the
camera itself, the permission dialogs, and multipart upload from a device.

**~~3. Area and price are in the wrong units for Kerala.~~ CLOSED (2026-11-07).**
Area is asked in **cents** by default with unit tabs from
`metadata.areaUnits`, and stored as `lotSizeSqm` through `services/area`
(the web's four factors, to the same digits). The "Price per" row —
Total | Per cent | Per sq.ft | Per sq.m, built from the server's own
`pricingRules`, so a house is never offered a per-cent price — makes a rate
a rate: the total under the field is `rate × area`, shown before anything is
saved, and that number is what `askAmountTotal` carries. A 10-cent plot at
₹1,00,000 per cent now reads **₹10,00,000 in total**.
`filters.tsx` still asks for area in square metres.

**4. No plot boundary; satellite views now, but no ring.** The create flow
asks for the three satellite views (`POST /listings/:id/media/map-views`)
once the location is saved, best effort, as the web's Where step does. It
still does not draw a ring or a circle from the stated size, so a
mobile-made listing has a pin and imagery but no outline — and for a plot,
the outline *is* the product.

**5. A published listing cannot be managed.** No unpublish, relist, Take off
market, mark Sold/Rented, edit-after-publish, transfer, or version history. The
broker who sells a plot in week two has no way to close it from his phone, and
`/listings/my` returns Sold rows as still-published, so his Home tab will keep
counting it as live.

## Week one — he will notice these immediately

**6. Land filters do not exist.** `dev-resources/api/samples/metadata.json`
→ `searchFilters.Land` ships `price` + `area` ranges plus `zoningType` (select) and
`isClearTitle`, `hasRoadAccess`, `hasBoundaryWall`, `isCornerPlot` (toggles); the
`Residential` key ships seventeen fields with `range` / `pills` / `toggle` widgets.
`src/app/filters.tsx` hardcodes three groups (type, price, area) and
`services/filters.ts:countActive` counts exactly three. "Clear title" and "road
access" are the first two questions a plot buyer asks. The schema is already on the
wire — the screen just ignores it.

**7. No push notifications.** `expo-notifications` is not installed. A buyer's
message is seen only when the broker opens Messages and pulls to refresh. For a
two-sided market this is the difference between a lead and a lost lead.

**8. Messages are not live.** No SSE, no receipts, no ticks, no outbox — the web's
Messages v2 has all four. `thread/[id].tsx` refetches the whole thread after each
send; `messages.tsx` loads once on mount; the unread badge is one
`/notifications/unread-count` call when the Menu tab mounts.

**9. No profile editing.** `profile.tsx` is read-only: name, photo, bio, handle,
password and verified links are all web-only. A broker's public `/@handle` page is
what he hands a buyer, and he cannot change a word of it from the app.

**10. Plotmap's own sample listings are indistinguishable from real stock.** The
`showcase` flag rides the card feeds; nothing in `src/` reads it, so there is no
"Sample" pill and no banner. The broker will see six Plotmap samples as competitors.

## Survivable for ten listings, but visibly thinner than the web

- **History is a stub** — `statusesFor('History')` = `['Sold','Rented']`. No Off
  market status, no 3/6/12/24-month window (web has both in a popover).
- **No "Listed by" filter.** Create listing now asks (optional, clearable, unset
  by default) and the listing page renders what the server stores; search
  cannot filter on it.
- **Convert prices is dead state** — `Filters.convertPrices` reaches the query but
  no control sets it. Harmless in an all-INR pilot; delete or wire it.
- **Alerts are not the web's search alerts** — "Save this search" posts a name,
  `frequency: 'daily'` and a bbox; no drawn area, no digest (blocked on Resend
  regardless), no notification wiring.
- **No paging.** Search asks for `limit: 60` with no offset or Load more;
  `myListings()` and `userListings()` send no `limit`/`offset`, so after backend
  #67 made both feeds page, a count shown is a count of a slice.
- **Sellers is a flat list** (`/search/sellers`) — no map, no territory glow.
- **Missing from the listing page**: Explore Neighborhood, Similar/Nearby
  carousels, public Listing history, share sheet / QR, and the closed-listing
  "Sold by …" attribution card. Message seller sends a canned "Hi, is this still
  available?" with no way to edit it.
- **No deep links.** `scheme` is `plotmapmobileapp` only; a `plotmap.com/listing/:id`
  link a buyer sends by WhatsApp opens the browser, not the app.
- **Dev affordances must stay out of the release.** The Menu's Development section
  and sample data are `__DEV__`-only — verify that in the release build, because
  a broker reaching "Insert fake data" would be unexplainable.
- **No on-device test harness**, so a release regression has no gate.
  `npm run lint`, `npm run typecheck` and `npm test` are all green (the
  React Compiler errors were fixed in `485ad28`); the create flow was driven
  on web with Playwright, which is not the same as a device.
- **The listing page shows a per-area ask as the headline** — the server
  formats it "₹ 1,00,000/cent", which is honest but not what the web does
  (the web leads with the TOTAL and keeps the rate secondary,
  `ListingDetailPage` + `Price.totalForArea`). Now that mobile can write a
  rate, mobile should read one the same way.

## Honest summary

Search, the map (piles, bins, disperse), the listing page, Saved, sign-in, Messages
and the menu are real and shippable. **The seller side now starts**: a broker can
photograph a plot, drop its pin, price it per cent and publish it from the phone
(2026-11-07). What is still missing on that side is everything after publishing —
managing the listing (item 5), the plot outline (item 4), and the land filters a
buyer needs to find it (item 6).
