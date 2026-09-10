import type { Locale } from '~/i18n';

/**
 * Car data access.
 *
 * Previously this file fetched a published Google Sheet as CSV, parsed it,
 * coerced forgiving column aliases and cached the result in a module-level
 * variable. All of that is gone: cars now live in D1 and are edited at /admin.
 *
 * Why the cache went away rather than moving to KV: on Workers a module-level
 * cache is per-isolate, so it multiplies origin fetches across colos and makes
 * invalidation impossible. D1 is a few milliseconds away and is the origin, so
 * there is nothing left to cache — and an edit is visible immediately instead
 * of up to five minutes later.
 */

export type Car = {
  /**
   * Permanent identity. Photos in R2 are keyed by it, so it must never change
   * — it is generated once at creation and is deliberately NOT derived from
   * the slug, which changes whenever the client renames a car.
   */
  id: string;
  slug: string;
  make: string;
  model: string;
  /** "Volkswagen Golf 8" — what a human calls the car. Derived. */
  name: string;
  year: number | null;
  category: string;
  transmission: 'manual' | 'automatic' | '';
  fuel: 'diesel' | 'petrol' | 'hybrid' | 'electric' | 'lpg' | '';
  seats: number | null;
  doors: number | null;
  ac: boolean;
  consumption: string;
  pricePerDay: number | null;
  price3Day: number | null;
  price7Day: number | null;
  deposit: number | null;
  /** R2 key of the cover photo, or '' when the car has no photos yet. */
  image: string;
  /** R2 keys of every photo, cover first. */
  images: string[];
  features: string[];
  description: Record<Locale, string>;
  /** Rentable right now. `false` still shows the car, marked as unavailable. */
  available: boolean;
  /** Listed on the public site at all. `false` hides it completely. */
  visible: boolean;
  featured: boolean;
  order: number;
};

/** The shape D1 hands back for a `cars` row. */
type CarRow = {
  id: string;
  slug: string;
  make: string;
  model: string;
  year: number | null;
  category: string;
  transmission: string;
  fuel: string;
  seats: number | null;
  doors: number | null;
  ac: number;
  consumption: string;
  price_per_day: number | null;
  price_3_day: number | null;
  price_7_day: number | null;
  deposit: number | null;
  features: string;
  description_bs: string;
  description_en: string;
  available: number;
  visible: number;
  featured: number;
  sort_order: number;
};

type PhotoRow = { car_id: string; r2_key: string; is_cover: number };

const TRANSMISSIONS = new Set(['manual', 'automatic']);
const FUELS = new Set(['diesel', 'petrol', 'hybrid', 'electric', 'lpg']);

const toList = (value: string): string[] =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** Turns a D1 row plus its photos into the `Car` the whole site renders. */
function hydrate(row: CarRow, photos: PhotoRow[]): Car {
  const name = [row.make, row.model].filter(Boolean).join(' ');
  const keys = photos.map((p) => p.r2_key);

  return {
    id: row.id,
    slug: row.slug,
    make: row.make,
    model: row.model,
    name,
    year: row.year,
    category: row.category,
    transmission: TRANSMISSIONS.has(row.transmission)
      ? (row.transmission as 'manual' | 'automatic')
      : '',
    fuel: FUELS.has(row.fuel) ? (row.fuel as Car['fuel']) : '',
    seats: row.seats,
    doors: row.doors,
    ac: row.ac === 1,
    consumption: row.consumption,
    pricePerDay: row.price_per_day,
    price3Day: row.price_3_day,
    price7Day: row.price_7_day,
    deposit: row.deposit,
    image: keys[0] ?? '',
    images: keys,
    features: toList(row.features),
    description: {
      bs: row.description_bs || row.description_en,
      en: row.description_en || row.description_bs,
    },
    available: row.available === 1,
    visible: row.visible === 1,
    featured: row.featured === 1,
    order: row.sort_order,
  };
}

/**
 * Available cars first, then explicit order, then price.
 *
 * Done in SQL rather than in JS so the ordering is part of the index-backed
 * query. `is_cover DESC` on the photo side is what puts the cover at images[0].
 */
const SELECT_CARS = `SELECT * FROM cars ORDER BY available DESC, sort_order ASC, price_per_day ASC`;
const SELECT_PHOTOS = `SELECT car_id, r2_key, is_cover FROM car_photos ORDER BY is_cover DESC, sort_order ASC, created_at ASC`;

/**
 * Every car, including hidden ones. Admin-facing.
 *
 * Two queries in one `batch` round-trip rather than a JOIN with GROUP_CONCAT:
 * the fleet is small, and a join would either duplicate every car row per
 * photo or need string-splitting on the way back out.
 */
export async function getCars(db: D1Database): Promise<Car[]> {
  const [cars, photos] = await db.batch<CarRow | PhotoRow>([
    db.prepare(SELECT_CARS),
    db.prepare(SELECT_PHOTOS),
  ]);

  const byCar = new Map<string, PhotoRow[]>();
  for (const photo of (photos.results ?? []) as PhotoRow[]) {
    const list = byCar.get(photo.car_id);
    if (list) list.push(photo);
    else byCar.set(photo.car_id, [photo]);
  }

  return ((cars.results ?? []) as CarRow[]).map((row) => hydrate(row, byCar.get(row.id) ?? []));
}

/** Cars the public site is allowed to show at all. */
export async function getPublishedCars(db: D1Database): Promise<Car[]> {
  return (await getCars(db)).filter((car) => car.visible);
}

/** Public lookup by slug. A hidden car is not found, so its page 404s. */
export async function getCar(db: D1Database, slug: string): Promise<Car | null> {
  if (!slug) return null;
  return (await getPublishedCars(db)).find((car) => car.slug === slug) ?? null;
}

/** Admin lookup by permanent id. Finds hidden cars too. */
export async function getCarById(db: D1Database, id: string): Promise<Car | null> {
  if (!id) return null;
  return (await getCars(db)).find((car) => car.id === id) ?? null;
}

/**
 * How many cars the homepage highlights.
 *
 * Shared by the homepage and the /admin picker so the two can never disagree
 * about how many slots there are.
 */
export const FEATURED_COUNT = 4;

/**
 * The cars the homepage highlights, in `sort_order`.
 *
 * When nothing is flagged this falls back to the first `limit` published cars,
 * so the homepage is never empty on a fresh install. That fallback is also why
 * the /admin picker reports the flagged count explicitly: without it, "nothing
 * selected" and "these four selected" look identical on the public site.
 */
export async function getFeaturedCars(
  db: D1Database,
  limit = FEATURED_COUNT,
): Promise<Car[]> {
  const cars = await getPublishedCars(db);
  const featured = cars.filter((car) => car.featured);

  /*
   * Top up to `limit` with the next published cars.
   *
   * Flagged cars lead and keep their order; the rest only fill leftover slots.
   * Without this, a selection of three left the homepage row one card short —
   * which looks like a bug rather than a choice, and is easy to end up in
   * whenever a featured car is deleted or hidden.
   */
  const filler = cars.filter((car) => !car.featured);
  return [...featured, ...filler].slice(0, limit);
}

/** Same class first, then anything else, so the section is never short. */
export async function getRelatedCars(db: D1Database, car: Car, limit = 3): Promise<Car[]> {
  const others = (await getPublishedCars(db)).filter((c) => c.id !== car.id);
  const sameClass = others.filter((c) => c.category && c.category === car.category);
  const rest = others.filter((c) => !sameClass.includes(c));
  return [...sameClass, ...rest].slice(0, limit);
}

/** Cheapest daily rate in the fleet — used in the homepage <title>. */
export async function getStartingPrice(db: D1Database): Promise<number | null> {
  const prices = (await getPublishedCars(db))
    .map((car) => car.pricePerDay)
    .filter((price): price is number => typeof price === 'number' && price > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/** Distinct classes, for the listing filter chips. */
export async function getCategories(db: D1Database): Promise<string[]> {
  const seen = new Set<string>();
  for (const car of await getPublishedCars(db)) {
    if (car.category) seen.add(car.category);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'bs'));
}
