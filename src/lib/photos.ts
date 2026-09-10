/**
 * Car photos: bytes in R2, ordering and cover flag in D1.
 *
 * Two deliberate departures from the Cloudinary design this replaces:
 *
 * 1. The cover is a D1 column, not a filename. Cloudinary encoded it in the
 *    public ID (`.../cover`), so promoting a photo meant two renames ordered
 *    carefully enough that there was never a moment with two covers. R2 has no
 *    rename at all (it would be a full byte round-trip), so the flag moved to
 *    the database where changing it is one atomic statement.
 *
 * 2. Keys carry a random photo id and are never reused, so every URL is
 *    immutable and can be cached for a year. There is no CDN purge step.
 */

/** Widths generated in the browser at upload time. */
export const VARIANTS = [480, 960, 1600] as const;
export type Variant = (typeof VARIANTS)[number];

export type Photo = {
  id: string;
  /** Base key without variant suffix: cars/<carId>/<photoId> */
  key: string;
  isCover: boolean;
};

/** R2 object key for one rendition of a photo. */
export const variantKey = (base: string, width: number): string => `${base}-${width}.webp`;

export const photoBaseKey = (carId: string, photoId: string): string => `cars/${carId}/${photoId}`;

/**
 * Guards against a crafted form touching another car's photos: the key must
 * live under this car's prefix.
 */
export const ownsKey = (carId: string, key: string): boolean =>
  key.startsWith(`cars/${carId}/`) && !key.includes('..');

export async function listPhotos(db: D1Database, carId: string): Promise<Photo[]> {
  const { results } = await db
    .prepare(
      `SELECT id, r2_key, is_cover FROM car_photos
       WHERE car_id = ?1 ORDER BY is_cover DESC, sort_order ASC, created_at ASC`,
    )
    .bind(carId)
    .all<{ id: string; r2_key: string; is_cover: number }>();

  return (results ?? []).map((r) => ({ id: r.id, key: r.r2_key, isCover: r.is_cover === 1 }));
}

/**
 * Stores one photo's renditions and records it.
 *
 * `renditions` is a map of width -> bytes, produced by the browser. Each is
 * streamed to R2 separately so nothing large is ever held in memory at once,
 * which matters: the Worker memory ceiling is 128 MB.
 */
export async function addPhoto(
  db: D1Database,
  bucket: R2Bucket,
  carId: string,
  renditions: Map<number, ArrayBuffer>,
): Promise<string> {
  const photoId = crypto.randomUUID();
  const base = photoBaseKey(carId, photoId);

  await Promise.all(
    [...renditions].map(([width, bytes]) =>
      bucket.put(variantKey(base, width), bytes, {
        httpMetadata: {
          contentType: 'image/webp',
          // Keys are immutable, so this is safe and removes the purge problem.
          cacheControl: 'public, max-age=31536000, immutable',
        },
      }),
    ),
  );

  // First photo of a car becomes its cover automatically — the client should
  // never have to think about it for the common case.
  const existing = await db
    .prepare(`SELECT COUNT(*) AS n FROM car_photos WHERE car_id = ?1`)
    .bind(carId)
    .first<{ n: number }>();
  const isFirst = (existing?.n ?? 0) === 0;

  await db
    .prepare(
      `INSERT INTO car_photos (id, car_id, r2_key, content_type, is_cover, sort_order)
       VALUES (?1, ?2, ?3, 'image/webp', ?4,
               COALESCE((SELECT MAX(sort_order) + 1 FROM car_photos WHERE car_id = ?2), 0))`,
    )
    .bind(photoId, carId, base, isFirst ? 1 : 0)
    .run();

  return photoId;
}

/** Deletes every rendition, then the row. */
export async function deletePhoto(
  db: D1Database,
  bucket: R2Bucket,
  carId: string,
  photoId: string,
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT r2_key, is_cover FROM car_photos WHERE id = ?1 AND car_id = ?2`)
    .bind(photoId, carId)
    .first<{ r2_key: string; is_cover: number }>();

  if (!row || !ownsKey(carId, row.r2_key)) return false;

  await bucket.delete(VARIANTS.map((w) => variantKey(row.r2_key, w)));
  await db.prepare(`DELETE FROM car_photos WHERE id = ?1`).bind(photoId).run();

  // Never leave a car with photos but no cover — promote the next one.
  if (row.is_cover === 1) {
    const next = await db
      .prepare(
        `SELECT id FROM car_photos WHERE car_id = ?1 ORDER BY sort_order ASC, created_at ASC LIMIT 1`,
      )
      .bind(carId)
      .first<{ id: string }>();
    if (next) await setCover(db, carId, next.id);
  }

  return true;
}

/**
 * Promotes one photo to cover. Atomic: both statements run in a single D1
 * batch, so there is never a moment with two covers or none.
 */
export async function setCover(db: D1Database, carId: string, photoId: string): Promise<void> {
  await db.batch([
    db.prepare(`UPDATE car_photos SET is_cover = 0 WHERE car_id = ?1`).bind(carId),
    db
      .prepare(`UPDATE car_photos SET is_cover = 1 WHERE id = ?1 AND car_id = ?2`)
      .bind(photoId, carId),
  ]);
}

/** Removes every photo of a car — used when the car itself is deleted. */
export async function deleteAllPhotos(
  db: D1Database,
  bucket: R2Bucket,
  carId: string,
): Promise<void> {
  const photos = await listPhotos(db, carId);
  if (photos.length === 0) return;

  const keys = photos.flatMap((p) => VARIANTS.map((w) => variantKey(p.key, w)));
  // R2 delete takes at most 1000 keys per call.
  for (let i = 0; i < keys.length; i += 1000) {
    await bucket.delete(keys.slice(i, i + 1000));
  }
  await db.prepare(`DELETE FROM car_photos WHERE car_id = ?1`).bind(carId).run();
}
