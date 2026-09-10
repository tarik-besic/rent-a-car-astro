import { deleteAllPhotos } from './photos';

/**
 * Write side of the car "CMS" — everything /admin needs to change the fleet.
 *
 * The value coercion here is deliberately forgiving, carried over from the
 * spreadsheet era: the client types "60 KM" or "1.200,50" into a price field
 * because that is how they write prices, and rejecting it with a validation
 * error would be worse than understanding it.
 */

export type CarInput = {
  make: string;
  model: string;
  slug: string;
  year: number | null;
  category: string;
  transmission: string;
  fuel: string;
  seats: number | null;
  doors: number | null;
  ac: boolean;
  consumption: string;
  pricePerDay: number | null;
  price3Day: number | null;
  price7Day: number | null;
  deposit: number | null;
  features: string;
  descriptionBs: string;
  descriptionEn: string;
  available: boolean;
  visible: boolean;
  featured: boolean;
  order: number;
};

/** URL-safe slug: strips diacritics so "Škoda Octavia" -> "skoda-octavia". */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parses "60", "60 KM", "1.200,50" and "1,200.50" all as numbers.
 *
 * The ambiguous case is a single separator: "1.200" is 1200 in Bosnian
 * notation but 1.2 in English. Treated as a thousands separator when it is
 * followed by exactly three digits, which is the reading a client typing
 * prices in KM intends.
 */
function toNumber(raw: string): number | null {
  const cleaned = (raw ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;

  let normalised = cleaned;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Whichever comes last is the decimal separator.
    normalised =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (hasComma) {
    normalised = /,\d{3}$/.test(cleaned) ? cleaned.replace(',', '') : cleaned.replace(',', '.');
  } else if (hasDot) {
    normalised = /\.\d{3}$/.test(cleaned) ? cleaned.replace('.', '') : cleaned;
  }

  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

const toInt = (raw: string): number | null => {
  const value = toNumber(raw);
  return value === null ? null : Math.round(value);
};

const str = (data: FormData, key: string, max = 2000): string => {
  const value = data.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
};

/** An unchecked checkbox is absent from the form body entirely. */
const bool = (data: FormData, key: string): boolean => data.get(key) !== null;

/** Builds a CarInput from an /admin form submission. */
export function parseCarForm(data: FormData): CarInput {
  const make = str(data, 'make', 100);
  const model = str(data, 'model', 100);
  const explicitSlug = slugify(str(data, 'slug', 120));

  return {
    make,
    model,
    // Falling back to the name keeps the URL sensible without the client ever
    // needing to understand what a slug is.
    slug: explicitSlug || slugify(`${make} ${model}`),
    year: toInt(str(data, 'year', 10)),
    category: str(data, 'category', 60),
    transmission: str(data, 'transmission', 20),
    fuel: str(data, 'fuel', 20),
    seats: toInt(str(data, 'seats', 5)),
    doors: toInt(str(data, 'doors', 5)),
    ac: bool(data, 'ac'),
    consumption: str(data, 'consumption', 40),
    pricePerDay: toNumber(str(data, 'pricePerDay', 20)),
    price3Day: toNumber(str(data, 'price3Day', 20)),
    price7Day: toNumber(str(data, 'price7Day', 20)),
    deposit: toNumber(str(data, 'deposit', 20)),
    features: str(data, 'features', 600),
    descriptionBs: str(data, 'descriptionBs'),
    descriptionEn: str(data, 'descriptionEn'),
    available: bool(data, 'available'),
    visible: bool(data, 'visible'),
    featured: bool(data, 'featured'),
    order: toInt(str(data, 'order', 10)) ?? 0,
  };
}

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

/** `slug` is UNIQUE, so a clash surfaces as a constraint error, not silently. */
const isSlugClash = (error: unknown): boolean =>
  error instanceof Error && /UNIQUE constraint failed: cars\.slug/i.test(error.message);

const FIELDS = `slug, make, model, year, category, transmission, fuel, seats, doors, ac,
  consumption, price_per_day, price_3_day, price_7_day, deposit, features,
  description_bs, description_en, available, visible, featured, sort_order`;

const values = (input: CarInput): unknown[] => [
  input.slug,
  input.make,
  input.model,
  input.year,
  input.category,
  input.transmission,
  input.fuel,
  input.seats,
  input.doors,
  input.ac ? 1 : 0,
  input.consumption,
  input.pricePerDay,
  input.price3Day,
  input.price7Day,
  input.deposit,
  input.features,
  input.descriptionBs,
  input.descriptionEn,
  input.available ? 1 : 0,
  input.visible ? 1 : 0,
  input.featured ? 1 : 0,
  input.order,
];

export async function createCar(db: D1Database, input: CarInput): Promise<SaveResult> {
  if (!input.make || !input.model) return { ok: false, error: 'marka-model' };

  // Generated, not derived from the slug: photos are keyed by it, so deriving
  // it would orphan every photo the first time the client renamed a car.
  const id = crypto.randomUUID();
  const placeholders = Array.from({ length: 22 }, (_, i) => `?${i + 2}`).join(', ');

  try {
    await db
      .prepare(`INSERT INTO cars (id, ${FIELDS}) VALUES (?1, ${placeholders})`)
      .bind(id, ...values(input))
      .run();
    return { ok: true, id };
  } catch (error) {
    if (isSlugClash(error)) return { ok: false, error: 'slug-zauzet' };
    throw error;
  }
}

export async function updateCar(
  db: D1Database,
  id: string,
  input: CarInput,
): Promise<SaveResult> {
  if (!input.make || !input.model) return { ok: false, error: 'marka-model' };

  const assignments = FIELDS.split(',')
    .map((f) => f.trim())
    .map((field, i) => `${field} = ?${i + 2}`)
    .join(', ');

  try {
    await db
      .prepare(`UPDATE cars SET ${assignments}, updated_at = datetime('now') WHERE id = ?1`)
      .bind(id, ...values(input))
      .run();
    return { ok: true, id };
  } catch (error) {
    if (isSlugClash(error)) return { ok: false, error: 'slug-zauzet' };
    throw error;
  }
}

/** Removes the car and every photo byte it owns. */
export async function deleteCar(
  db: D1Database,
  bucket: R2Bucket,
  id: string,
): Promise<void> {
  await deleteAllPhotos(db, bucket, id);
  await db.prepare(`DELETE FROM cars WHERE id = ?1`).bind(id).run();
}
