# auto-rentanje — repo explained

This is the long-form companion to `README.md`. The README tells you how to run
and deploy it; this file explains why it is shaped the way it is.

## 1. The three ideas that explain every file

**1. WhatsApp is the product.** The client converts leads in chat, not in a
booking funnel. So every call to action is a `wa.me` deep link with the message
already written, and the reservation form is a fallback that *also* ends in
WhatsApp. Nothing on the conversion path may depend on client-side JavaScript.

**2. The client edits cars, not code.** Everything that changes week to week —
the fleet, prices, availability, photos — is data in D1 and R2, edited at
`/admin`. Everything that changes roughly never — the phone number, address,
opening hours — is build-time configuration.

**3. Rendering must not wait on anything.** Pages are server-rendered at the
edge from D1, which is a few milliseconds away. There is no external API on the
read path, no image CDN round-trip, and no cache to invalidate.

## 2. Request → response, end to end

A request for `/vozila/volkswagen-golf-8`:

1. Cloudflare checks static assets first. `_routes.json` excludes `/_astro/*`
   and the favicons, so those never wake the Worker.
2. The Worker boots (or reuses a warm isolate) and Astro routes the URL to
   `src/pages/vozila/[slug].astro`.
3. That page is four lines: read the D1 binding off `Astro.locals.runtime.env`,
   call `getCar(db, slug)`, and render either `CarDetail` or `NotFound` with
   `locale="bs"`. Its English twin at `src/pages/en/cars/[slug].astro` is
   identical but for the locale.
4. `getCar` runs two queries in one D1 `batch` — cars and photos — and joins
   them in memory into the `Car` objects the views render.
5. `CarDetail` builds the page, the JSON-LD graph, and the WhatsApp links.
6. Photos in the HTML point at `/img/cars/<carId>/<photoId>-960.webp`, which
   the browser fetches separately; that route streams the object out of R2.

A missing car sets a real 404 so Google drops the URL. That is deliberate and
worth preserving — a soft 404 keeps dead cars in the index.

## 3. Where the Cloudflare runtime forces the design

Three constraints in workerd shaped more of this codebase than anything else.

### Bindings do not exist at module scope

`env` — and therefore D1, R2 and every secret — is only reachable inside a
request handler. Any value computed at import time sees nothing.

This is why the config is split in two:

- **`PUBLIC_*` are build-time.** `src/lib/env.ts` reads only
  `import.meta.env`, and Vite inlines the values. `src/config/site.ts` builds
  its whole config at module scope and is imported by 20+ files, so making it
  request-scoped would have meant rewriting every component and both i18n
  dictionaries. Build-time config costs a redeploy to change, which is
  acceptable for a phone number and unacceptable for a price — which is
  exactly why prices live in D1 instead.
- **Secrets are request-time.** `src/lib/secrets.ts` takes `env` as an
  argument and is never called at module scope. A pleasant side effect: the
  values cannot be inlined into any bundle, so they physically cannot leak
  into client JavaScript.

The previous version read secrets at import time. On Workers that would have
made `isAdminConfigured` permanently `false` and the admin area would have
silently reported itself as unconfigured — a config bug that looks like a code
bug.

### Module-level state is per-isolate

The previous version cached the parsed Google Sheet in a module variable with a
5-minute TTL, and invalidated it from `/api/refresh`.

On Workers each isolate in each colo has its own copy, and isolates are evicted
freely. That breaks the cache three ways: origin fetches multiply across colos,
invalidation only ever clears the one isolate that served the request, and the
`/healthz` cache diagnostics describe a single isolate rather than the system.

The fix was not to move the cache to KV — it was to delete it. D1 *is* the
origin now, so there is nothing to cache and edits are visible immediately.
`/api/refresh` was deleted along with it; there is nothing left to refresh.

The one piece of state that genuinely had to survive is the **login throttle**.
As a module variable it gave an attacker the full 10-attempt budget in every
colo — effectively no limit against a single shared password. It lives in the
`login_attempts` table in D1 (`src/lib/admin-auth.ts`).

### There is no Node

`node:crypto` is gone from `src/lib/admin-auth.ts`, replaced by Web Crypto.
The Cloudinary SDK could not be shimmed at all — it reads `package.json` off
disk at import time and uses Node streams for uploads — which is what made
replacing it with R2 the only real option rather than a preference.

`safeEqual` is worth reading before changing. Both sides are SHA-256'd first so
the comparison runs over two fixed 32-byte digests, and nothing about the
expected value leaks, not even its length. The XOR loop is hand-rolled rather
than using `crypto.subtle.timingSafeEqual`, which is a Cloudflare extension the
DOM and Node type libraries do not know about; forcing it through a cast would
have hidden a genuine incompatibility.

Going to Web Crypto made every guard async. A missed `await` on
`requireAdminPage` returns a truthy Promise, which locks everyone *out* rather
than letting them in — noisy rather than dangerous, but check it if you add a
new admin page.

## 4. The data model

### `cars`

One row per car, defined in `migrations/0001_init.sql` and read through
`src/lib/cars.ts`. `hydrate()` is the single place a D1 row becomes the `Car`
object the whole site renders; `name` (`"Volkswagen Golf 8"`) is derived there
rather than stored.

Two distinctions the whole codebase turns on:

| | `id` | `slug` |
| --- | --- | --- |
| Example | `car-017` | `volkswagen-golf-8` |
| Purpose | keys the car's photos in R2 | the public URL |
| Changes on rename | **never** | yes |

The id is deliberately never derived from the slug. A fallback would appear to
work and then silently orphan every photo the first time the client renamed a
car. New cars get a generated UUID; the sheet importer preserves the old sheet
ids precisely so the photo migration can find them.

| | On the site? | Use when |
| --- | --- | --- |
| `available = 0` | **Yes**, marked *Trenutno izdato* | Rented out or in for service. Keeps the URL and its ranking. |
| `visible = 0` | **No**, hidden completely | Left the fleet. The row stays, so it can come back. |

A hidden car is excluded from the listing, the homepage, related cars, the
reservation dropdown, the filters and the sitemap, and its detail page 404s. It
still appears in `/admin`.

### `car_photos`

Bytes live in R2; ordering and the cover flag live in D1. That split is the
main departure from the Cloudinary design, and it removes the trickiest code in
the old system.

Cloudinary encoded the cover in the filename (`.../cover`), so promoting a
photo meant two renames sequenced carefully enough that there was never a
moment with two covers. R2 has no rename at all — it would be a full byte
round-trip — so the flag moved to the database, where promoting a photo is one
atomic `batch` of two statements.

Keys are `cars/<carId>/<photoId>-<width>.webp` with a random photo id, and are
never reused. Every URL is therefore immutable, which is what allows the
one-year cache header and removes the CDN purge step entirely.

`deletePhoto` promotes the next photo when the cover is removed, so a car can
never end up with photos but no cover.

## 5. Images without a transformation layer

Cloudinary did format negotiation, quality and subject-aware cropping
(`g_auto`) per request. R2 does none of that, and Cloudflare's
`/cdn-cgi/image/` resizing needs a paid plan.

So renditions are produced **once, in the browser**, by the uploader in
`src/pages/admin/cars/[id].astro`: a canvas draws each photo at 480, 960 and
1600 px and encodes WebP at quality 0.82. `src/lib/image.ts` then picks the
smallest rendition that covers the requested width and builds the `srcset`.

The trade is honest and worth restating: cropping is centred rather than
subject-aware. For a car photographed filling the frame this is a non-issue; it
would matter for logos or group shots.

The upside beyond cost: a 6 MB phone photo becomes ~200 kB before it leaves the
device, so uploads over a Bosnian mobile connection are fast.

## 6. The upload endpoint

`/api/admin/photo/upload` takes **one photo per request**, as three
pre-resized renditions.

The old endpoint accepted up to 20 files of 12 MB in a single multipart body.
On Workers that is up to 240 MB buffered against a **128 MB memory ceiling** —
it would kill the isolate. The uploader loops instead, so each request stays
small, progress is visible per file, and one failure does not lose the batch.

This is the only part of the site that requires JavaScript. The public site,
including both contact channels, does not.

## 7. Two contact channels, zero services

The reservation POST is answered with a 303 straight to a `wa.me` deep link
(`src/lib/reservation.ts`), so the primary conversion path works with
JavaScript disabled. The "send by e-mail" button is a `mailto:` link the
visitor's own mail app handles. Nothing is stored, nothing is sent server-side,
there is no API key and no deliverability to monitor.

**The trap:** these POSTs are guarded by Astro's `checkOrigin` CSRF check. If
`PUBLIC_SITE_URL` is not set at *build* time, the domain is missing from
`security.allowedDomains` in `astro.config.mjs` and **every reservation is
rejected with a 403 in production**. This already happened once on the previous
host. Test a real reservation on the live domain after every deploy that
changes the origin.

## 8. SEO

`src/lib/schema.ts` builds one JSON-LD graph per page type: `AutoRental` /
`LocalBusiness` for the business, `Product` + per-day `Offer` for a car,
`ItemList` for the listing, `BreadcrumbList` and `FAQPage`.

Locales use translated paths (`/vozila` vs `/en/cars`), not a query parameter,
because that is what lets the two language versions rank independently. The
route table and `hreflang` cluster are generated from `ROUTES` in
`src/i18n/index.ts`, so adding a language means adding a dictionary and routes,
not touching every page.

The sitemap is hand-rolled rather than `@astrojs/sitemap` because car pages are
rendered on demand from D1 — a build-time sitemap would never list them.

## 9. Things that will bite you

- **`PUBLIC_SITE_URL` at build time.** See §7. This is the big one.
- **Changing a car's `id`.** Its photos are keyed by it and will be orphaned.
- **A missed `await` on an admin guard.** Locks everyone out. See §3.
- **Editing `wrangler.jsonc` without `npm run cf-typegen`.** The generated
  `Env` drifts from the real bindings and TypeScript stops catching mistakes.
- **`object.writeHttpMetadata(headers)` in the `/img` route.** It takes a
  `Headers` instance, which miniflare's dev proxy cannot serialize — it 500s in
  `astro dev` while working in production. Headers are set explicitly instead.
- **Node 20.** Wrangler refuses to run. The project needs Node 22+.
- **Deleting a car to mark it unavailable.** Deletion is permanent and takes
  the photos with it. Use `visible = 0`.

## 10. Where to make a change

| Task | File |
| --- | --- |
| Change any wording | `src/i18n/bs.ts` / `src/i18n/en.ts` |
| Change a business detail | `.env` + `wrangler.jsonc` `vars` |
| Add a car field | `migrations/`, `src/lib/cars.ts`, `car-write.ts`, `components/admin/CarForm.astro` |
| Change photo widths | `VARIANTS` in `src/lib/photos.ts` (and re-upload) |
| Change the layout of a page | `src/views/` |
| Add a page | `src/views/` + a thin route per locale in `src/pages/` |
| Change structured data | `src/lib/schema.ts` |
| Add a binding | `wrangler.jsonc`, then `npm run cf-typegen` |
