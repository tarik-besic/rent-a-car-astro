# Auto Rentanje — full overview

Everything the site does, every screen the client touches, and the exact
sequence still standing between this build and a live domain.

| | |
| --- | --- |
| Routes working | 14 |
| Runtime dependencies | 2 |
| Steps to go live | 9 blocking, 3 recommended |
| Automated tests | 0 |

**Contents**

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Public site](#public-site)
4. [Feature reference](#feature-reference)
5. [Admin](#admin)
6. [Go-live checklist](#go-live-checklist)
7. [Commands](#commands)
8. [Gaps and trade-offs](#gaps-and-trade-offs)
9. [Where to change what](#where-to-change-what)

---

## Overview

A bilingual rent-a-car site for a small Sarajevo agency. Every conversion path
ends in WhatsApp, because the client closes deals in chat rather than through a
booking funnel. The fleet is managed by the owner at `/admin` — one password,
one page, no CMS.

The whole thing is a single Cloudflare Worker. Car records live in **D1**,
photos in **R2**, and static assets are served at the edge without waking the
Worker at all. There is no external API on the read path, so a page render
never waits on anything.

> **The one rule that governs the design.** Nothing on the conversion path may
> depend on client-side JavaScript. The reservation form posts and redirects
> server-side; both contact buttons are plain links. The only screen that needs
> JS is the admin photo uploader.

---

## Architecture

Four moving parts:

| Part | Role |
| --- | --- |
| **Worker** | Astro 5 SSR on `workerd`. Renders every page, handles every form POST. |
| **D1** | Cars, photo metadata, login throttle. Replaced the Google Sheet. |
| **R2** | Photo bytes as WebP at three widths. Replaced Cloudinary. |
| **Edge assets** | Hashed CSS/JS, favicons, OG image. Served before the Worker runs. |

### Configuration is split in two

| Kind | Where it lives | To change it |
| --- | --- | --- |
| **Business details** — phone, address, hours, city | `PUBLIC_*` in `.env` + `wrangler.jsonc` vars | Edit and redeploy (~1 min) |
| **Secrets** — admin password, session key | `wrangler secret` | Read per request; never in the bundle |
| **Fleet** — cars, prices, photos, availability | D1 + R2 | Edit at `/admin` — live instantly |

Cloudflare bindings do not exist at module scope, and the config object is
built there and imported by 23 files. Making it request-scoped would have meant
rewriting every component — so anything that changes often was moved into the
database instead.

---

## Public site

Ten pages: five in Bosnian, five in English, on translated URLs so the two
language versions rank independently.

| Page | English | Bosnian | What it does |
| --- | --- | --- | --- |
| **Landing** | `/` | `/bs` | Hero, featured cars, trust signals, FAQ extract. Title carries the cheapest daily rate, pulled live from D1. |
| **Fleet** | `/cars` | `/bs/vozila` | Every visible car, filterable by class. Filter chips generated from the classes actually in use. |
| **Car detail** | `/cars/[slug]` | `/bs/vozila/[slug]` | Gallery, spec table, tiered pricing, equipment, related cars, car-specific WhatsApp link. |
| **Reservation** | `/reservation` | `/bs/rezervacija` | Enquiry form with live price estimate. Two submit paths: WhatsApp or email. |
| **FAQ** | `/faq` | `/bs/faq` | 12 questions with `FAQPage` structured data. |
| **Not found** | 404 | 404 | Real 404 for removed cars, so Google drops the URL rather than keeping a soft-404. |

### Machine endpoints

| Route | Purpose |
| --- | --- |
| `/sitemap.xml` | Generated on demand from D1, so new cars appear without a rebuild. 22 URLs at present. |
| `/robots.txt` | Allows the site, blocks `/admin`, `/api/` and filter query strings. |
| `/healthz` | One request tells you whether D1, R2 and the admin secrets are wired up. |
| `/img/*` | Streams photos out of R2. Immutable keys, one-year cache, ETag revalidation. |

---

## Feature reference

### Getting in touch

| Feature | Behaviour | Needs JS |
| --- | --- | --- |
| **Floating WhatsApp button** | On every page. Carries the current car's name when viewing a car. | No |
| **Header WhatsApp + phone** | `wa.me` deep link and `tel:` link. | No |
| **Reservation → WhatsApp** | Form POST answered with a 303 straight to `wa.me`, message pre-written from the fields. | No |
| **Reservation → email** | `mailto:` link carrying the same message, opened in the visitor's own mail app. | No |
| **Live price estimate** | Multiplies the selected car's rate by the chosen date range as the form is filled. | Yes — enhancement only |
| **Car preselection** | `?car=slug` from a car page preselects it. A hidden car cannot be preselected. | No |

No email service, no API keys, no deliverability to monitor. Nothing is stored
server-side — the enquiry goes straight to the client's own phone.

### What a car can carry

| Group | Fields |
| --- | --- |
| **Identity** | Make, model, year, class, URL slug |
| **Specification** | Transmission, fuel, seats, doors, air conditioning, consumption |
| **Pricing** | Per day, 3+ day rate, 7+ day rate, deposit |
| **Content** | Equipment list, Bosnian description, English description, photos |
| **State** | Visible, available, featured, sort order |

### The distinction the client must understand

**Available off** keeps the car on the site marked *Trenutno izdato* — it holds
its URL and its Google ranking. Use it when a car is rented out or in for
service.

**Visible off** removes it from the site entirely: listing, homepage, related
cars, reservation dropdown, filters and sitemap, and its page returns a 404.
The row survives, so it can come back.

Deleting is permanent and takes the photos with it. It is almost never the
right action.

### Search visibility

- Translated URLs per locale (English at the root, Bosnian under /bs) with a full `hreflang` cluster including `x-default`.
- Structured data: `AutoRental` + `LocalBusiness`, `Product` + `Car` with
  per-day `Offer`, `ItemList`, `BreadcrumbList`, `FAQPage`, `WebSite`.
- Canonical URLs, per-page meta descriptions, OpenGraph and Twitter cards.
- Sitemap generated from the database, so it can never fall behind the fleet.
- Genuine 404s for removed cars.

### Speed

- No UI framework and no hydration — about 2 kB of JavaScript on public pages.
- CSS inlined into the HTML at build, removing a render-blocking request.
- Static assets served at the edge without invoking the Worker.
- Photos cached for a year as immutable, with `srcset` at three widths.
- Explicit `width` and `height` everywhere, so no layout shift.
- Compression handled by Cloudflare rather than an Express layer.

---

## Admin

Four screens, one password, no user accounts. Designed so the owner can add a
car from a phone in under a minute.

| Screen | What it does |
| --- | --- |
| `/admin/login` | Single password. Signed cookie, 12-hour session, 10 attempts per 15 minutes. |
| `/admin` | Every car including hidden ones — thumbnail, price, class, photo count, status badges. |
| `/admin/cars/new` | Add a car. Only make and model are required; it lands straight on the photo manager. |
| `/admin/cars/[id]` | Edit every field, manage photos, delete the car. |

### Photo management

- **Drag and drop** or pick multiple files at once, with a per-file progress queue.
- **Resized in the browser** to 480/960/1600 px WebP before upload — a 6 MB
  phone photo leaves the device at roughly 200 kB.
- **Set as cover** promotes any photo; the first upload becomes the cover
  automatically.
- **Delete** removes every rendition from R2, and promotes the next photo if the
  cover was removed.

Uploads go one photo per request. The Worker memory ceiling is 128 MB, and the
previous multi-file form could have buffered up to 240 MB.

### Forgiving input

Prices accept what a person actually types: `60`, `60 KM` and `1.200,50` all
parse correctly, in both Bosnian and English number notation. Slugs are
generated from the name with diacritics folded — `Škoda Octavia` becomes
`skoda-octavia`. A deposit of `0` renders as *Bez depozita*.

---

## Go-live checklist

This is a genuine sequence — each step depends on the one before it. Steps 1–9
are blocking. Everything here needs your Cloudflare account, which is why none
of it is done.

### 1. Authenticate Wrangler — *needs you*

Opens a browser to link your Cloudflare account. Nothing below works without it.

```bash
npx wrangler login
```

### 2. Create the database and bucket — *needs you*

The `d1 create` command prints a **database_id**. Paste it into
`wrangler.jsonc`, replacing `PLACEHOLDER_RUN_WRANGLER_D1_CREATE`.

```bash
npx wrangler d1 create auto-rentanje
npx wrangler r2 bucket create auto-rentanje-photos
```

### 3. Apply the schema — *needs you*

Creates the `cars`, `car_photos` and `login_attempts` tables on the real
database.

```bash
npm run db:migrate
```

### 4. Set the admin secrets — *needs you*

Pick a long password — there is no account recovery.

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET   # openssl rand -base64 32
```

### 5. Replace the placeholder business details — *needs you*

The `vars` block in `wrangler.jsonc` currently holds demo values. Set the real
WhatsApp number (**digits only** — no `+`, no spaces, no leading `00`), phone,
email, address and opening hours. Mirror them into your build environment.

### 6. Set the real site URL — before building — *needs you*

`PUBLIC_SITE_URL` is inlined at build time and feeds the CSRF allow-list. Get it
wrong and **every reservation is rejected with a 403**. This has already broken
this site once, on the previous host.

### 7. Deploy — *needs you*

```bash
npm run deploy
```

Or connect the repository to Workers Builds for deploy-on-push, setting the
`PUBLIC_*` values there as build variables.

### 8. Verify on the live domain — *needs you*

Open `/healthz` and confirm all four flags are true:

```json
{ "ok": true, "db": { "ok": true }, "adminConfigured": true, "r2Bound": true }
```

Then **submit a real reservation**. This is the check that catches step 6 having
gone wrong, and it is the one people skip.

### 9. Bring the real fleet across — *needs you*

The importer reads the old sheet's Bosnian and English column names and its
forgiving value formats, and preserves the sheet's `id` — which is what lets the
photo migration find each car's images. Both scripts write files for you to read
before anything is applied.

```bash
node scripts/import-sheet.mjs "<published CSV url>" > import.sql
npx wrangler d1 execute auto-rentanje --remote --file=import.sql
```

For photos, either run `scripts/import-photos.mjs` with your Cloudinary
credentials, or — often faster for a small fleet — just re-upload them at
`/admin`.

### 10. Put the repository under version control — *recommended*

There is no git history at all. For a codebase this size that is the single
biggest risk left in the project.

### 11. Replace the two placeholder images — *optional*

`public/hero-car.jpg` (1600×1200) is the homepage hero;
`public/og-default.png` (1200×630) is the thumbnail people see when the site is
shared on WhatsApp.

### 12. Custom domain and Search Console — *optional*

Attach the domain in the Cloudflare dashboard, then rebuild with the new
`PUBLIC_SITE_URL`. Submit `/sitemap.xml` to Google and validate a car page in
the Rich Results Test.

---

## Commands

Wrangler requires **Node 22 or newer** and refuses to start on Node 20.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload and real local D1 and R2. |
| `npm run preview` | The built Worker under `wrangler dev` — what production actually runs. |
| `npm run build` | Production build. |
| `npm run deploy` | Build, then deploy to Cloudflare. |
| `npm run check` | TypeScript and Astro diagnostics. |
| `npm run cf-typegen` | Regenerate binding types. Run after every `wrangler.jsonc` edit. |
| `npm run db:migrate:local` | Apply migrations to the local database. |
| `npm run db:migrate` | Apply migrations to the live database. |

---

## Gaps and trade-offs

### There are no automated tests

The previous suite covered the Cloudinary photo-naming rules. That module no
longer exists, so the tests went with it and `npm test` was removed. Nothing has
replaced them. The highest-value targets would be the price parser, slug
generation, and the cover-promotion logic — all pure functions, all easy to get
subtly wrong.

### Deliberate trade-offs

| Trade-off | Cost | Why |
| --- | --- | --- |
| **Photos crop centred** | No subject-aware framing | R2 has no transform layer and Cloudflare's resizing needs a paid plan. A non-issue for cars filling the frame; it would matter for logos. |
| **Admin uploader needs JS** | One screen is not no-JS | Resizing happens in the browser. The public site is unaffected. |
| **Config changes need a redeploy** | ~1 minute per change | Bindings do not exist at module scope. Anything that changes often lives in D1 instead. |
| **Still on Astro 5** | Two majors behind | The current adapter needs Astro 7. Doing both migrations at once would have conflated two risky changes. |
| **Reconstructed column aliases** | A rare header spelling could import blank | The original alias table was lost during the refactor and rebuilt from the template CSV and documentation. Worth a glance before importing production data. |

### Things that will bite you

- **Changing a car's id** orphans every one of its photos. They are keyed by it.
- **A missed `await` on an admin guard** locks everyone out — the guards are
  async since the Web Crypto port.
- **Editing `wrangler.jsonc` without regenerating types** lets the binding types
  drift silently.
- **Deleting a car to mark it unavailable** is permanent and takes the photos.
  Toggle visibility instead.

---

## Where to change what

| Task | File |
| --- | --- |
| Any wording, in either language | `src/i18n/bs.ts` · `en.ts` |
| Phone, address, hours, city | `.env` + `wrangler.jsonc` vars |
| Add a field to a car | `migrations/` · `lib/cars.ts` · `lib/car-write.ts` · `components/admin/CarForm.astro` |
| Change photo widths | `VARIANTS` in `lib/photos.ts` |
| Page layout | `src/views/` |
| Structured data | `src/lib/schema.ts` |
| Colours and typography | `src/styles/global.css` |
| Add a Cloudflare binding | `wrangler.jsonc`, then `npm run cf-typegen` |

---

*Astro 5 SSR on Cloudflare Workers, D1 and R2. Verified against `workerd`
locally, not yet deployed.*
