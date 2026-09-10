#!/usr/bin/env node
/**
 * Bulk car + photo ingestion from a curated manifest.
 *
 * Reuses the running app's own admin endpoint rather than writing to R2 and D1
 * directly: that way cover selection, sort ordering and key naming all go
 * through the same tested code path the browser uploader uses, and there is no
 * second implementation to keep in step.
 *
 *   node scripts/ingest-photos.mjs \
 *     --manifest /path/manifest.json \
 *     --images   /path/raw \
 *     --base     http://localhost:4321 \
 *     --password "$ADMIN_PASSWORD"
 *
 * Renditions are produced here with sharp (a devDependency — it cannot run on
 * workerd and is never bundled into the Worker). The browser uploader does the
 * same three widths with a canvas; this is the headless equivalent.
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const VARIANTS = [480, 960, 1600];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};

const MANIFEST = arg('manifest');
const IMAGES = arg('images');
const BASE = (arg('base', 'http://localhost:4321') || '').replace(/\/+$/, '');
const PASSWORD = arg('password', process.env.ADMIN_PASSWORD ?? '');
const DRY = process.argv.includes('--dry-run');

if (!MANIFEST || !IMAGES) {
  console.error('usage: --manifest <file> --images <dir> [--base URL] [--password PW] [--dry-run]');
  process.exit(1);
}

/* ---- session ----------------------------------------------------- */

/** Logs in and returns the ar_admin cookie, which every write below needs. */
async function login() {
  const body = new URLSearchParams({ password: PASSWORD });
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    body,
    headers: { origin: BASE },
    redirect: 'manual',
  });

  const cookie = (res.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith('ar_admin='));

  if (!cookie) throw new Error(`login failed (${res.status}) — check --password`);
  return cookie;
}

/* ---- car ---------------------------------------------------------- */

async function createCar(cookie, car) {
  const form = new URLSearchParams();
  form.set('make', car.make);
  form.set('model', car.model);
  form.set('category', car.category ?? '');
  form.set('transmission', car.transmission ?? '');
  form.set('fuel', car.fuel ?? '');
  form.set('features', car.features ?? '');
  form.set('descriptionBs', car.description_bs ?? '');
  form.set('descriptionEn', car.description_en ?? '');
  if (car.year) form.set('year', String(car.year));
  if (car.seats) form.set('seats', String(car.seats));
  if (car.doors) form.set('doors', String(car.doors));
  if (car.pricePerDay) form.set('pricePerDay', String(car.pricePerDay));
  // Checkboxes: present means on.
  form.set('visible', 'on');
  form.set('available', 'on');
  form.set('ac', 'on');

  const res = await fetch(`${BASE}/admin/cars/new`, {
    method: 'POST',
    body: form,
    headers: { cookie, origin: BASE },
    redirect: 'manual',
  });

  const location = res.headers.get('location') ?? '';
  const id = location.match(/\/admin\/cars\/([^?]+)/)?.[1];
  if (!id) throw new Error(`create failed (${res.status}) for ${car.make} ${car.model}`);
  return id;
}

/* ---- photos ------------------------------------------------------- */

/** Three WebP widths from one source file — the same set the browser makes. */
async function renditions(file) {
  const input = await readFile(file);
  const out = new Map();
  for (const width of VARIANTS) {
    out.set(
      width,
      await sharp(input)
        .rotate() // honour EXIF orientation before resizing
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer(),
    );
  }
  return out;
}

async function uploadPhoto(cookie, carId, file) {
  const parts = await renditions(file);
  const form = new FormData();
  form.set('carId', carId);
  for (const [width, buf] of parts) {
    form.set(`w${width}`, new Blob([buf], { type: 'image/webp' }), `${width}.webp`);
  }

  const res = await fetch(`${BASE}/api/admin/photo/upload`, {
    method: 'POST',
    body: form,
    headers: { cookie, origin: BASE },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) throw new Error(json.error || `upload failed (${res.status})`);
  return json.photoId;
}

/* ---- run ---------------------------------------------------------- */

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));

if (DRY) {
  for (const car of manifest.cars) {
    console.log(`${car.make} ${car.model}  —  ${car.images.length} photo(s)`);
  }
  process.exit(0);
}

const cookie = await login();
console.log('logged in\n');

let cars = 0;
let photos = 0;

for (const car of manifest.cars) {
  const id = await createCar(cookie, car);
  cars++;
  console.log(`${car.make} ${car.model}  ->  ${id}`);

  for (const name of car.images) {
    // The manifest stores stems; the download kept the original extension.
    const file = [`${name}.jpg`, `${name}.webp`, `${name}.jpeg`, `${name}.png`]
      .map((f) => join(IMAGES, f))
      .find((f) => existsSync(f));

    if (!file) {
      console.log(`   ! missing ${name}`);
      continue;
    }

    try {
      await uploadPhoto(cookie, id, file);
      photos++;
      process.stdout.write('   .');
    } catch (error) {
      console.log(`\n   ! ${name}: ${error.message}`);
    }
  }
  process.stdout.write('\n');
}

console.log(`\n${cars} cars, ${photos} photos uploaded to ${BASE}`);
