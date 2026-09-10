#!/usr/bin/env node
/**
 * One-time migration: Cloudinary -> R2.
 *
 * Run AFTER scripts/import-sheet.mjs, because it keys photos by the car ids
 * that importer preserved from the sheet.
 *
 * Cloudinary is asked for each photo already resized to our three widths and
 * converted to WebP (f_webp,q_auto,c_fill,w_N) — so the renditions come out
 * byte-identical in shape to what the admin uploader produces, and nothing has
 * to be re-encoded locally.
 *
 *   export CLOUDINARY_CLOUD_NAME=...
 *   export CLOUDINARY_API_KEY=...
 *   export CLOUDINARY_API_SECRET=...
 *   node scripts/import-photos.mjs --out ./photo-migration
 *
 * It writes the rendition files plus two artifacts into --out:
 *   upload.sh   - wrangler r2 object put commands
 *   photos.sql  - car_photos rows
 *
 * Nothing is written to R2 or D1 until you run those, so the whole migration
 * is reviewable first.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const VARIANTS = [480, 960, 1600];
const PREFIX = 'rentacar/cars/';

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME ?? '';
const KEY = process.env.CLOUDINARY_API_KEY ?? '';
const SECRET = process.env.CLOUDINARY_API_SECRET ?? '';

const outIndex = process.argv.indexOf('--out');
const OUT = outIndex > -1 ? process.argv[outIndex + 1] : './photo-migration';

if (!CLOUD || !KEY || !SECRET) {
  console.error(
    'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.\n' +
      'Find them in Cloudinary -> Settings -> API Keys.',
  );
  process.exit(1);
}

/** Admin API list, paginated. Basic auth over REST — no SDK involved. */
async function listCloudinary() {
  const auth = Buffer.from(`${KEY}:${SECRET}`).toString('base64');
  const assets = [];
  let cursor = '';

  do {
    const url = new URL(`https://api.cloudinary.com/v1_1/${CLOUD}/resources/image`);
    url.searchParams.set('type', 'upload');
    url.searchParams.set('prefix', PREFIX);
    url.searchParams.set('max_results', '500');
    if (cursor) url.searchParams.set('next_cursor', cursor);

    const response = await fetch(url, { headers: { authorization: `Basic ${auth}` } });
    if (!response.ok) {
      throw new Error(`Cloudinary list failed: ${response.status} ${await response.text()}`);
    }
    const body = await response.json();
    assets.push(...(body.resources ?? []).map((r) => r.public_id));
    cursor = body.next_cursor ?? '';
  } while (cursor);

  return assets;
}

/**
 * rentacar/cars/car-017/cover -> { carId: 'car-017', leaf: 'cover' }
 * Anything not matching that shape is reported and skipped rather than guessed.
 */
function parseId(publicId) {
  const rest = publicId.slice(PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash < 1) return null;
  return { carId: rest.slice(0, slash), leaf: rest.slice(slash + 1) };
}

const renditionUrl = (publicId, width) =>
  `https://res.cloudinary.com/${CLOUD}/image/upload/f_webp,q_auto,c_fill,g_auto,w_${width}/${publicId}`;

const publicIds = await listCloudinary();
console.error(`Found ${publicIds.length} asset(s) under ${PREFIX}`);

await mkdir(OUT, { recursive: true });

const uploads = [];
const rows = [];
const skipped = [];
// Cover first per car, then natural order — matches the old naming convention
// where `cover` was primary and 01, 02… were the gallery.
const parsed = publicIds
  .map((id) => ({ publicId: id, ...(parseId(id) ?? {}) }))
  .filter((a) => {
    if (!a.carId) skipped.push(a.publicId);
    return Boolean(a.carId);
  })
  .sort((a, b) =>
    a.carId === b.carId
      ? (a.leaf === 'cover' ? -1 : b.leaf === 'cover' ? 1 : a.leaf.localeCompare(b.leaf, 'en', { numeric: true }))
      : a.carId.localeCompare(b.carId),
  );

const orderByCar = new Map();

for (const asset of parsed) {
  const photoId = crypto.randomUUID();
  const base = `cars/${asset.carId}/${photoId}`;
  const order = orderByCar.get(asset.carId) ?? 0;
  orderByCar.set(asset.carId, order + 1);

  for (const width of VARIANTS) {
    const response = await fetch(renditionUrl(asset.publicId, width));
    if (!response.ok) {
      skipped.push(`${asset.publicId} (w${width}: ${response.status})`);
      continue;
    }
    const file = join(OUT, `${photoId}-${width}.webp`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
    uploads.push(
      `npx wrangler r2 object put "auto-rentanje-photos/${base}-${width}.webp" \\\n` +
        `  --file="${photoId}-${width}.webp" --content-type=image/webp --remote`,
    );
  }

  rows.push(
    `INSERT INTO car_photos (id, car_id, r2_key, content_type, is_cover, sort_order)\n` +
      `SELECT '${photoId}', '${asset.carId}', '${base}', 'image/webp', ${order === 0 ? 1 : 0}, ${order}\n` +
      // Guard: a photo for a car that did not survive the import would violate
      // the foreign key and abort the whole file.
      `WHERE EXISTS (SELECT 1 FROM cars WHERE id = '${asset.carId}');`,
  );
  console.error(`  ${asset.publicId} -> ${base}`);
}

await writeFile(
  join(OUT, 'upload.sh'),
  `#!/bin/sh\n# Run from this directory. Uploads every rendition to R2.\nset -e\n\n${uploads.join('\n\n')}\n`,
  { mode: 0o755 },
);
await writeFile(join(OUT, 'photos.sql'), `-- ${rows.length} photo row(s)\n${rows.join('\n\n')}\n`);

console.error(`\nWrote ${OUT}/upload.sh and ${OUT}/photos.sql`);
console.error(`\nNext:\n  cd ${OUT} && sh upload.sh`);
console.error(`  npx wrangler d1 execute auto-rentanje --remote --file=${OUT}/photos.sql`);
if (skipped.length) {
  console.error(`\nSkipped ${skipped.length}:`);
  for (const s of skipped) console.error(`  ${s}`);
}
