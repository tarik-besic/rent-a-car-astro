-- auto-rentanje — D1 schema
-- Replaces the Google Sheet as the car "CMS". One row per car, edited at /admin.

CREATE TABLE IF NOT EXISTS cars (
  -- Permanent identity. Never derived from the slug: photos are keyed by it,
  -- so a rename must not orphan them. Generated once at creation.
  id              TEXT PRIMARY KEY,
  -- Public URL segment. Derived from make+model, editable to keep a URL stable.
  slug            TEXT NOT NULL UNIQUE,
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            INTEGER,
  category        TEXT NOT NULL DEFAULT '',
  transmission    TEXT NOT NULL DEFAULT '',  -- 'manual' | 'automatic' | ''
  fuel            TEXT NOT NULL DEFAULT '',  -- diesel|petrol|hybrid|electric|lpg|''
  seats           INTEGER,
  doors           INTEGER,
  ac              INTEGER NOT NULL DEFAULT 1,
  consumption     TEXT NOT NULL DEFAULT '',
  price_per_day   REAL,
  price_3_day     REAL,
  price_7_day     REAL,
  deposit         REAL,
  features        TEXT NOT NULL DEFAULT '',  -- comma-separated equipment chips
  description_bs  TEXT NOT NULL DEFAULT '',
  description_en  TEXT NOT NULL DEFAULT '',
  -- Rentable right now. 0 still lists the car, marked "Trenutno izdato".
  available       INTEGER NOT NULL DEFAULT 1,
  -- On the public site at all. 0 hides it completely (detail page 404s).
  visible         INTEGER NOT NULL DEFAULT 1,
  featured        INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The public listing is always "visible, ordered" — index it.
CREATE INDEX IF NOT EXISTS idx_cars_visible ON cars (visible, sort_order, make, model);
CREATE INDEX IF NOT EXISTS idx_cars_category ON cars (category);

CREATE TABLE IF NOT EXISTS car_photos (
  id          TEXT PRIMARY KEY,
  car_id      TEXT NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  -- Object key in R2, e.g. cars/<car_id>/<photo_id>.jpg
  r2_key      TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width       INTEGER,
  height      INTEGER,
  -- Exactly one cover per car is enforced in application code (set-cover is a
  -- transaction that clears the old cover first).
  is_cover    INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_car ON car_photos (car_id, is_cover DESC, sort_order);

-- Failed admin logins, for brute-force throttling.
-- In D1 rather than a module variable: on Workers a module variable is
-- per-isolate, so an attacker would get the full attempt budget in every colo.
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_at ON login_attempts (at);
