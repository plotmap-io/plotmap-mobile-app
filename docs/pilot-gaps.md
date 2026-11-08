# What the pilot broker will hit

One real Kerala plot broker, ~10 live listings, working from a phone in a field.
Read against `src/` on `feat/premium-pass` (2026-11-07) and the web product's
"What is live" in the umbrella `AGENTS.md` §7. Ranked by what stops the pilot first.

## Blockers — the pilot cannot start without these

**1. Publishing a listing is impossible today.** The backend gate is
`FieldValidator.validateForPublish` (`backend/.../listings/FieldValidator.scala:10`):
location (`lat != 0 && lng != 0`), price, details, **and at least one uploaded
photo** (`imagesAdded = listingMedia.exists(!_.isGenerated)`). `src/app/create.tsx`
sends price, area, description and sub-type and nothing else — no pin, no photo —
so `POST /drafts/:id/publish` returns a validation error on *every* attempt. The
screen's own closing line ("Photos and the plot boundary can be added from the
listing once it is live") describes an order the server does not allow. Nothing
else on this list matters until this does.

**2. No camera, no photo upload anywhere in the app.** No `expo-image-picker`,
no `expo-camera`, no call to `POST /api/v1/listings/:id/media` (one photo per
call). A broker standing on a plot cannot do the one thing he came to do. iOS also
needs the camera and photo-library usage strings before this can ship (see
`pilot-release.md`).

**3. Area and price are in the wrong units for Kerala.** `create.tsx` asks for
"Area (sq.m)", hardcodes `askCurrency: 'INR'`, sets `askAmountTotal = askAmount`
and never sets `askAreaUnit`; `filters.tsx` tells the user "the backend filters on
square metres. 1 cent is about 40.5 sq.m." Brokers quote **cents** and **₹ per
cent**. Per the umbrella gotcha "a per-area ask is a RATE, not money", a 100-cent
plot at ₹1,00,000/cent entered here is recorded as having sold for ₹1,00,000
instead of ₹1 crore. This is worse than missing — it is wrong data in an immutable
record. `metadata.areaUnits` already ships `cent`; use it.

**4. No plot boundary and no satellite views.** The web Where step draws a ring (or
a circle from the stated size) and renders three satellite images at publish
(`map-close` / plot / area), the close-up becoming the cover when there is no
photo. Mobile does neither, so a mobile-made listing is a bare pin — and for a
plot, the outline *is* the product.

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
- **No "Listed by" filter** and no owner/broker choice on create; the listing page
  renders `listedByOwner` when the server sets it, which mobile never does.
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
- **`npm run lint` is red** (React Compiler rules in `eslint-config-expo` 58) and
  there is no on-device test harness, so a release regression has no gate.

## Honest summary

Search, the map (piles, bins, disperse), the listing page, Saved, sign-in, Messages
and the menu are real and shippable. **The seller side is not.** The app is a good
buyer client that a broker cannot yet put a plot into. Items 1–4 are one piece of
work — a Where step with a pin, a photo step, cents, and the ring — and they are
the whole pilot.
