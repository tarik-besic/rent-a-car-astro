# Auto Rentanje — rent-a-car site (Astro + Cloudflare Workers)

A small, very fast, SEO-focused car rental website. Every conversion path leads
to **WhatsApp**; the reservation form is a secondary channel that also works
with JavaScript disabled.

Cars are managed at **`/admin`** — one password, one page, no CMS. Car data
lives in **D1**, photos live in **R2**, and the whole thing runs as a single
Cloudflare Worker.

```
/admin  (one password)
   │  car data          photos
   ▼                      ▼
  D1  ◄── Astro 5 SSR on Cloudflare Workers ──►  R2
                    │
              static assets served
              from the edge, no Worker
```

Enquiries go straight to WhatsApp or into the visitor's own mail app; nothing
is stored and no mail service is involved.

## What's in it

| Page | Bosnian | English |
| --- | --- | --- |
| Landing | `/` | `/en` |
| Car list (+ class filter) | `/vozila` | `/en/cars` |
| Car detail | `/vozila/[slug]` | `/en/cars/[slug]` |
| Reservation | `/rezervacija` | `/en/reservation` |
| FAQ | `/faq` | `/en/faq` |

Plus `/sitemap.xml`, `/robots.txt`, `/healthz` (config diagnostics) and
`/img/*` (photos streamed out of R2).

**Admin** (password-protected, `noindex`, disallowed in robots.txt):

| Route | Purpose |
| --- | --- |
| `/admin/login` | One shared password, no user system |
| `/admin` | Every car — available, rented and hidden |
| `/admin/cars/new` | Add a car |
| `/admin/cars/[id]` | Edit one car, manage its photos, delete it |

**SEO built in:** translated URLs per locale with full `hreflang` clusters,
canonical URLs, per-page meta descriptions, `AutoRental` / `LocalBusiness`,
`Product` + per-day `Offer`, `ItemList`, `BreadcrumbList` and `FAQPage`
structured data, an on-demand sitemap that includes every car, OpenGraph and
Twitter cards, and real 404s for removed cars.

**Speed built in:** zero UI framework, ~2 kB of JavaScript on public pages, CSS
inlined into the HTML, gzip/brotli at the edge, static assets served without
waking the Worker, immutable year-long caching on photos and hashed assets,
`srcset` everywhere, explicit `width`/`height` (no layout shift), and D1 as the
origin so a page render never waits on an external API.

## Tech choices, briefly

- **Astro 5, SSR via `@astrojs/cloudflare`** — ships HTML with no client-side
  hydration. SSR (rather than a static build) means an edit at `/admin` is
  live immediately, with no redeploy.
- **D1 instead of a Google Sheet.** The sheet was the previous "CMS". It is
  gone: `/admin` writes to D1 directly, so there is no CSV fetch, no 5-minute
  cache, and no cross-isolate invalidation problem.
- **R2 instead of Cloudinary.** Photos are resized to three widths *in the
  browser* at upload time and stored as WebP. R2 has no transformation layer
  and Cloudflare's `/cdn-cgi/image/` resizing needs a paid plan, so doing it
  client-side keeps real `srcset` at zero cost. Keys are immutable, so photos
  cache for a year and there is no purge step.
- **No CSS framework** — one hand-written stylesheet, inlined.
- **No user system** — `/admin` is one password in a secret and a signed
  cookie. No signup, no reset, no roles, no session store.
- **No Express.** Cloudflare compresses at the edge and serves static assets
  ahead of the Worker, so the previous `server.mjs` had nothing left to do.

## Local development

Requires **Node 22+** (Wrangler will not run on 20).

```bash
npm install
cp .env.example .env          # build-time public config
npm run db:migrate:local      # create the D1 schema locally
npm run dev                   # http://localhost:4321
```

Create `.dev.vars` (git-ignored) for the admin password:

```bash
ADMIN_PASSWORD=something-long
ADMIN_SESSION_SECRET=$(openssl rand -base64 32)
```

`npm run dev` uses Astro's dev server with real local D1 and R2 via miniflare.
`npm run preview` runs the built Worker under `wrangler dev`, which is what
production actually executes — use it before deploying.

```bash
npm run check        # TypeScript + Astro diagnostics
npm run cf-typegen   # regenerate binding types after editing wrangler.jsonc
```

## 1. Create the Cloudflare resources

```bash
npx wrangler login

npx wrangler d1 create auto-rentanje
# paste the printed database_id into wrangler.jsonc

npx wrangler r2 bucket create auto-rentanje-photos
```

Then apply the schema and set the secrets:

```bash
npm run db:migrate                              # --remote
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_SESSION_SECRET    # openssl rand -base64 32
```

## 2. Configure

Edit the `vars` block in `wrangler.jsonc` (business details) and set the same
`PUBLIC_*` values in your build environment. Every option is documented in
`.env.example`.

> **`PUBLIC_SITE_URL` must be set at build time.** It is inlined into the
> bundle and feeds `security.allowedDomains` in `astro.config.mjs`. If it is
> wrong or missing, Astro's CSRF check rejects **every reservation form POST**
> with a 403 in production. This is the single most common way to break this
> site.

## 3. Deploy

```bash
npm run deploy      # astro build && wrangler deploy
```

Or connect the repo to **Workers Builds** for deploy-on-push. Set the
`PUBLIC_*` values as build environment variables there.

After the first deploy:

1. Open `/healthz` and confirm `"ok": true`, `db.ok: true`,
   `adminConfigured: true` and `r2Bound: true`.
2. **Submit a reservation on the live domain.** If it 403s, `PUBLIC_SITE_URL`
   was not set at build time — fix it and redeploy.
3. Log in at `/admin` and add a car.
4. Submit `/sitemap.xml` in Google Search Console and validate a car page in
   the Rich Results Test.
5. Replace the two placeholder images with real photos:
   - `public/hero-car.jpg` (1600×1200, 4:3) — the homepage hero
   - `public/og-default.png` (1200×630) — the WhatsApp share thumbnail

## Migrating from the Google Sheet + Cloudinary

Two one-time scripts. Both write files for you to review before anything is
applied — neither touches D1 or R2 on its own.

**Cars:**

```bash
node scripts/import-sheet.mjs "<published CSV url>" > import.sql
npx wrangler d1 execute auto-rentanje --remote --file=import.sql
```

It understands the old sheet's Bosnian and English column aliases and its
forgiving value formats (`60 KM`, `1.200,50`, `da`/`yes`). It **preserves the
sheet's `id` column**, which is what makes the photo migration below possible.

**Photos:**

```bash
export CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=...
node scripts/import-photos.mjs --out ./photo-migration
cd photo-migration && sh upload.sh
npx wrangler d1 execute auto-rentanje --remote --file=photo-migration/photos.sql
```

Cloudinary is asked for each photo already converted to WebP at our three
widths, so nothing is re-encoded locally.

Alternatively, for a small fleet, just re-upload the photos at `/admin` — it is
often faster than running the migration.

## Editing text

All copy lives in `src/i18n/bs.ts` and `src/i18n/en.ts` — page titles, meta
descriptions, the FAQ and the pre-written WhatsApp messages. Both files have
the same shape, and TypeScript will tell you if a translation is missing.

## Project layout

```
src/
  config/site.ts      every business detail, env-overridable at build time
  i18n/               bs.ts / en.ts dictionaries + localised route table
  lib/
    cars.ts           D1 read model — the Car type and every query
    car-write.ts      create / update / delete + forgiving form coercion
    photos.ts         R2 objects + D1 photo rows, cover and ordering rules
    admin-auth.ts     one-password login, Web Crypto signed cookie, throttle
    secrets.ts        runtime-only secret reads (never module scope)
    image.ts          /img URL + srcset builder
    schema.ts         JSON-LD graph builders
    whatsapp.ts       wa.me deep links and pre-written messages
    mailto.ts         mailto: links carrying the same pre-written message
    reservation.ts    form POST handling for both locales
    env.ts            build-time PUBLIC_* reads
  components/         Header, Footer, CarCard, Icon, FaqList, WhatsappFab…
    admin/CarForm     the car editor, shared by new and edit
  layouts/            Base.astro (public) and Admin.astro (self-contained CSS)
  views/              one component per page, shared between locales
  pages/
    admin/            login, car list, new, per-car editor
    api/admin/        car + photo write endpoints
    img/              R2 photo delivery
migrations/           D1 schema
scripts/              one-time Sheet -> D1 and Cloudinary -> R2 migrations
wrangler.jsonc        bindings, vars, observability
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Form POST returns 403 | `PUBLIC_SITE_URL` was not set at **build** time, so the domain is not in `security.allowedDomains`. Rebuild with it set. |
| `/healthz` shows `db.ok: false` | Migration not applied. Run `npm run db:migrate`. |
| `/admin/login` rejects the right password | `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` not set (`adminConfigured: false`), or the 10-per-15-min throttle is active. |
| Photos 404 | The R2 bucket name in `wrangler.jsonc` does not match the one you created. |
| Uploads fail in the browser | The uploader needs JavaScript. The public site does not. |
| WhatsApp link opens an empty chat | `PUBLIC_WHATSAPP` contains a `+`, spaces, or a leading `00`. Digits only. |
| Wrangler refuses to run | Node 20. This project needs Node 22+. |

`UPUTSTVO.md` is a short guide in Bosnian for whoever maintains the car list.
