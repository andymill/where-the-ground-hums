-- Phase 6: renovation budget (under the Budget tab, alongside Monthly).
-- Slider-driven project budget, distinct from the monthly budget_lines: each
-- item has a planned estimate (the slider value, within emin..emax) plus an
-- actual spend, grouped by phase (category). is_toggle rows (e.g. battery) are
-- optional add-ons switched on/off via `enabled`. Inferred target = sum of
-- estimates for enabled rows; remaining = estimate - actual.
CREATE TABLE IF NOT EXISTS reno_lines (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  category    TEXT,                              -- phase: 'August 2026' | 'Fall 2026' | '2027'
  estimate    REAL NOT NULL DEFAULT 0,           -- slider value
  emin        REAL NOT NULL DEFAULT 0,
  emax        REAL NOT NULL DEFAULT 10000,
  estep       REAL NOT NULL DEFAULT 100,
  actual      REAL NOT NULL DEFAULT 0,
  enabled     INTEGER NOT NULL DEFAULT 1,        -- 0 = off (for optional toggles)
  is_toggle   INTEGER NOT NULL DEFAULT 0,        -- 1 = optional add-on (battery)
  note        TEXT,
  created_by  TEXT,
  created_at  INTEGER NOT NULL,
  sort        INTEGER NOT NULL DEFAULT 0
);

-- Seed the plan (default slider values; adjust in-app). created_at is a fixed
-- seed timestamp; INSERT OR IGNORE keeps re-runs / edited values safe.
INSERT OR IGNORE INTO reno_lines (id,label,category,estimate,emin,emax,estep,actual,enabled,is_toggle,created_by,created_at,sort) VALUES
 ('rn_roof',    'Standing seam metal roof',        'August 2026', 22000, 10000, 40000, 500, 0, 1, 0, 'seed', 1751760000000, 0),
 ('rn_erv',     'ERV (energy recovery ventilator)','August 2026',  3500,  1500,  6000, 100, 0, 1, 0, 'seed', 1751760000000, 1),
 ('rn_water',   'Electric water heater',           'August 2026',  2800,  1000,  5000, 100, 0, 1, 0, 'seed', 1751760000000, 2),
 ('rn_handyman','Handyman — 1 week (rip carpets)', 'August 2026',  2200,   500,  5000, 100, 0, 1, 0, 'seed', 1751760000000, 3),
 ('rn_washdry', 'Washer + dryer',                  'August 2026',  1600,   700,  3500, 100, 0, 1, 0, 'seed', 1751760000000, 4),
 ('rn_fridge',  'Refrigerator',                    'August 2026',  1500,   600,  4000, 100, 0, 1, 0, 'seed', 1751760000000, 5),
 ('rn_kitchen', 'Kitchen — DIY (ash fronts, new sink)','Fall 2026', 9000, 3000, 20000, 250, 0, 1, 0, 'seed', 1751760000000, 6),
 ('rn_solar',   'Solar PV array',                  '2027',        26000, 12000, 45000, 500, 0, 1, 0, 'seed', 1751760000000, 7),
 ('rn_battery', 'Battery pack (optional)',         '2027',        14000,  8000, 20000, 500, 0, 0, 1, 'seed', 1751760000000, 8);
