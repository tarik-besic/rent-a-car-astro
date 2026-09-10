-- Site-level settings: values that belong to the site rather than to any car.
--
-- Exists so the homepage background can be a first-class asset instead of a
-- borrowed car photo. Deleting a car deletes its photo bytes from R2, so a
-- backdrop pointing into cars/<id>/ would vanish with the car. Hero renditions
-- live under the site/ prefix, which nothing in the car-deletion path touches.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
