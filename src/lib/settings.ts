/**
 * Site-level settings — things that belong to the site, not to a car.
 *
 * Currently one key: the homepage backdrop. It is stored here, rather than
 * derived from a featured car, so that deleting a car can never delete the
 * image the homepage depends on. See migrations/0002_settings.sql.
 */

/** R2 prefix for site assets. Nothing in the car-deletion path touches it. */
export const SITE_PREFIX = 'site';

export const HERO_KEY = 'hero_image';

export async function getSetting(db: D1Database, key: string): Promise<string> {
  const row = await db
    .prepare(`SELECT value FROM settings WHERE key = ?1`)
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? '';
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')`,
    )
    .bind(key, value)
    .run();
}

/** Base key for a newly uploaded hero image, e.g. site/hero/<uuid>. */
export const heroBaseKey = (id: string): string => `${SITE_PREFIX}/hero/${id}`;

/** Guards the /img route: only keys we generate under the site prefix. */
export const isSiteKey = (key: string): boolean =>
  key.startsWith(`${SITE_PREFIX}/`) && !key.includes('..');
