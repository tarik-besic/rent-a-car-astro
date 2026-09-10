#!/usr/bin/env node
/**
 * One-time migration: Google Sheet (CSV) -> D1.
 *
 * Emits a .sql file rather than writing to D1 directly, so you can read it
 * before it touches anything and apply it with wrangler:
 *
 *   node scripts/import-sheet.mjs "<published CSV url or local .csv>" > import.sql
 *   npx wrangler d1 execute auto-rentanje --local  --file=import.sql
 *   npx wrangler d1 execute auto-rentanje --remote --file=import.sql
 *
 * Photos are NOT migrated here — see scripts/import-photos.mjs. Rows whose
 * `slika`/`slike` cells pointed at Cloudinary are reported on stderr so you
 * know which cars still need images.
 */

/* ---------------------------------------------------------------- *
 * CSV parsing — carried over verbatim from the previous src/lib/csv.ts.
 * Sheets quotes any cell with a comma, quote or newline, which is exactly
 * what descriptions and feature lists contain.
 * ---------------------------------------------------------------- */

function parseCsv(input) {
  const text = input.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += char;
      continue;
    }
    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

const normaliseKey = (key) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

function parseCsvToRecords(input) {
  const rows = parseCsv(input);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normaliseKey);
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((h, i) => {
      if (h) record[h] = (row[i] ?? '').trim();
    });
    return record;
  });
}

/* ---------------------------------------------------------------- *
 * Column aliases — Bosnian and English spellings, first match wins.
 * ---------------------------------------------------------------- */

const ALIASES = {
  make: ['marka', 'make', 'brand', 'proizvodjac'],
  model: ['model'],
  year: ['godina', 'year', 'god'],
  category: ['kategorija', 'category', 'klasa', 'class'],
  transmission: ['mjenjac', 'transmission', 'getriba', 'mjenjac_tip'],
  fuel: ['gorivo', 'fuel'],
  seats: ['sjedista', 'seats', 'brojsjedista', 'broj_sjedista'],
  doors: ['vrata', 'doors'],
  ac: ['klima', 'ac', 'air_conditioning', 'klimatizacija'],
  consumption: ['potrosnja', 'consumption'],
  pricePerDay: ['cijena_dan', 'price_day', 'cijena', 'price', 'dnevna_cijena', 'price_per_day'],
  price3Day: ['cijena_3_dana', 'price_3_day', 'cijena_3', 'price_3_days'],
  price7Day: ['cijena_7_dana', 'price_7_day', 'cijena_7', 'price_7_days'],
  deposit: ['depozit', 'deposit', 'kaucija'],
  features: ['oprema', 'features', 'dodaci', 'equipment'],
  descriptionBs: ['opis_bs', 'opis', 'description_bs'],
  descriptionEn: ['opis_en', 'description_en', 'description'],
  available: ['dostupno', 'available', 'slobodno'],
  visible: ['vidljivo', 'visible', 'show', 'published', 'prikazi', 'objavi'],
  featured: ['istaknuto', 'featured', 'preporuceno'],
  order: ['redoslijed', 'order', 'sort', 'pozicija'],
  slug: ['slug', 'url'],
  id: ['id', 'car_id', 'vehicle_id', 'vozilo_id', 'sifra', 'oznaka'],
  image: ['slika', 'image', 'foto'],
  images: ['slike', 'images', 'galerija', 'gallery'],
};

const pick = (row, field) => {
  for (const alias of ALIASES[field]) {
    const value = row[alias];
    if (value !== undefined && value !== '') return value;
  }
  return '';
};

/* ---------------------------------------------------------------- *
 * Value coercion — as forgiving as the sheet version was.
 * ---------------------------------------------------------------- */

function toNumber(raw) {
  const cleaned = (raw ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;
  let n = cleaned;
  const comma = cleaned.includes(',');
  const dot = cleaned.includes('.');
  if (comma && dot) {
    n =
      cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '');
  } else if (comma) {
    n = /,\d{3}$/.test(cleaned) ? cleaned.replace(',', '') : cleaned.replace(',', '.');
  } else if (dot) {
    n = /\.\d{3}$/.test(cleaned) ? cleaned.replace('.', '') : cleaned;
  }
  const value = Number(n);
  return Number.isFinite(value) ? value : null;
}

const toInt = (raw) => {
  const v = toNumber(raw);
  return v === null ? null : Math.round(v);
};

/** da/yes/true/1/x all mean yes; empty falls back to the column default. */
const toBool = (raw, fallback) => {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === '') return fallback;
  return ['da', 'yes', 'true', '1', 'x', 'ja', 'y'].includes(v);
};

const TRANSMISSION = {
  manuelni: 'manual', manuelno: 'manual', manual: 'manual', rucni: 'manual',
  mehanicki: 'manual', standard: 'manual',
  automatik: 'automatic', automatski: 'automatic', automatic: 'automatic', auto: 'automatic',
};

const FUEL = {
  dizel: 'diesel', diesel: 'diesel', d: 'diesel',
  benzin: 'petrol', petrol: 'petrol', gasoline: 'petrol', bmb: 'petrol', b: 'petrol',
  hibrid: 'hybrid', hybrid: 'hybrid',
  elektricni: 'electric', elektro: 'electric', electric: 'electric', ev: 'electric',
  plin: 'lpg', lpg: 'lpg', tng: 'lpg',
};

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** SQLite string literal. */
const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
const num = (value) => (value === null ? 'NULL' : String(value));

/* ---------------------------------------------------------------- */

async function readSource(source) {
  if (/^https?:\/\//i.test(source)) {
    // An /edit link works too, as long as the sheet is link-shared.
    const url = source.replace(/\/edit.*$/, '/gviz/tq?tqx=out:csv');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sheet fetch failed: ${response.status}`);
    const text = await response.text();
    if (/^\s*</.test(text)) {
      throw new Error('Sheet returned HTML — it is not published to the web or link-shared.');
    }
    return text;
  }
  return (await import('node:fs/promises')).readFile(source, 'utf8');
}

const source = process.argv[2];
if (!source) {
  console.error('usage: node scripts/import-sheet.mjs <csv-url-or-path> > import.sql');
  process.exit(1);
}

const records = parseCsvToRecords(await readSource(source));
const seenSlugs = new Set();
const seenIds = new Set();
const statements = [];
const withLegacyPhotos = [];
let skipped = 0;

records.forEach((row, index) => {
  const make = pick(row, 'make');
  const model = pick(row, 'model');
  // A row with neither is a spacer row in the sheet, not a car.
  if (!make && !model) {
    skipped++;
    return;
  }

  const name = [make, model].filter(Boolean).join(' ');
  const explicit = slugify(pick(row, 'slug'));
  let slug = explicit || slugify(`${name} ${pick(row, 'year')}`.trim());
  // slug is UNIQUE in D1; suffix duplicates rather than losing a row.
  if (seenSlugs.has(slug)) {
    let n = 2;
    while (seenSlugs.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }
  seenSlugs.add(slug);

  const legacy = [pick(row, 'image'), pick(row, 'images')].filter(Boolean).join(', ');
  if (legacy) withLegacyPhotos.push(`${name} -> ${legacy}`);

  /**
   * Reuse the sheet's own id when it is usable.
   *
   * This is what makes photo migration possible at all: the Cloudinary folders
   * are keyed by that id (rentacar/cars/<id>/...), so generating a fresh UUID
   * here would sever every car from its existing photos. Ids must be lowercase
   * a-z, 0-9, _ and -, as before; anything else gets a UUID.
   */
  const sheetId = pick(row, 'id').trim().toLowerCase();
  const carId = /^[a-z0-9_-]+$/.test(sheetId) && !seenIds.has(sheetId)
    ? sheetId
    : crypto.randomUUID();
  seenIds.add(carId);

  const values = [
    q(carId),
    q(slug),
    q(make),
    q(model),
    num(toInt(pick(row, 'year'))),
    q(pick(row, 'category')),
    q(TRANSMISSION[normaliseKey(pick(row, 'transmission'))] ?? ''),
    q(FUEL[normaliseKey(pick(row, 'fuel'))] ?? ''),
    num(toInt(pick(row, 'seats'))),
    num(toInt(pick(row, 'doors'))),
    toBool(pick(row, 'ac'), true) ? 1 : 0,
    q(pick(row, 'consumption')),
    num(toNumber(pick(row, 'pricePerDay'))),
    num(toNumber(pick(row, 'price3Day'))),
    num(toNumber(pick(row, 'price7Day'))),
    num(toNumber(pick(row, 'deposit'))),
    q(pick(row, 'features')),
    q(pick(row, 'descriptionBs') || pick(row, 'descriptionEn')),
    q(pick(row, 'descriptionEn') || pick(row, 'descriptionBs')),
    toBool(pick(row, 'available'), true) ? 1 : 0,
    toBool(pick(row, 'visible'), true) ? 1 : 0,
    toBool(pick(row, 'featured'), false) ? 1 : 0,
    // Explicit order sorts ahead of sheet order, as it did before.
    num(toInt(pick(row, 'order')) ?? index + 1000),
  ];

  statements.push(
    `INSERT INTO cars (id, slug, make, model, year, category, transmission, fuel, seats, doors,\n` +
      `  ac, consumption, price_per_day, price_3_day, price_7_day, deposit, features,\n` +
      `  description_bs, description_en, available, visible, featured, sort_order)\n` +
      `VALUES (${values.join(', ')});`,
  );
});

console.log('-- Generated by scripts/import-sheet.mjs');
console.log(`-- ${statements.length} cars from ${source}`);
console.log(statements.join('\n\n'));

console.error(`\n${statements.length} cars ready${skipped ? `, ${skipped} blank rows skipped` : ''}.`);
if (withLegacyPhotos.length) {
  console.error(`\n${withLegacyPhotos.length} car(s) had photos in the sheet:`);
  for (const line of withLegacyPhotos) console.error(`  ${line}`);
  console.error('\nThese are NOT migrated. Re-upload them at /admin, or use scripts/import-photos.mjs.');
}
