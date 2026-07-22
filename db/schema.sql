-- 160 Akley hub — shared database (Cloudflare D1).
-- Read/written by Pages Functions in functions/160akley/api/.

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  text        TEXT NOT NULL,
  area        TEXT,
  due         TEXT,
  grp         TEXT NOT NULL DEFAULT 'week',   -- week | soon
  done        INTEGER NOT NULL DEFAULT 0,
  created_by  TEXT,
  created_at  INTEGER NOT NULL,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resources (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  cat_subt    TEXT,
  name        TEXT NOT NULL,
  phones      TEXT,            -- JSON array of strings
  email       TEXT,
  web         TEXT,
  address     TEXT,
  note        TEXT,
  flag        TEXT,
  created_by  TEXT,
  created_at  INTEGER NOT NULL,
  sort        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_resources_cat ON resources (category, sort);

-- Furniture annotations drawn on the floor-plan pages. Rects are fractions
-- (0..1) of the plan image; `floor` is the page (1=1st, 2=2nd, 3=3rd, 4=overview).
CREATE TABLE IF NOT EXISTS floorplan_annotations (
  id          TEXT PRIMARY KEY,
  floor       INTEGER NOT NULL,
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  w           REAL NOT NULL,
  h           REAL NOT NULL,
  label       TEXT,
  color       TEXT,
  created_by  TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fp_floor ON floorplan_annotations (floor);

-- Per-floor scale: real feet per image pixel (set by tracing a known length).
CREATE TABLE IF NOT EXISTS floorplan_scale (
  floor       INTEGER PRIMARY KEY,
  feet_per_px REAL NOT NULL,
  updated_at  INTEGER
);

-- Monthly household budget (from the budget calculator).
CREATE TABLE IF NOT EXISTS budget_lines (
  id      TEXT PRIMARY KEY,
  label   TEXT NOT NULL,
  grp     TEXT NOT NULL DEFAULT 'fixed',      -- fixed | living
  amount  REAL NOT NULL DEFAULT 0,
  note    TEXT,
  sort    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS budget_meta (
  key  TEXT PRIMARY KEY,
  num  REAL,
  txt  TEXT
);
