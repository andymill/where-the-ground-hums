-- Phase 3: shared log + file metadata.
CREATE TABLE IF NOT EXISTS log (
  id          TEXT PRIMARY KEY,
  date        TEXT,
  category    TEXT,
  title       TEXT NOT NULL,
  body        TEXT,
  amount      REAL,
  created_by  TEXT,
  created_at  INTEGER NOT NULL,
  sort        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS files (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  content_type TEXT,
  size         INTEGER,
  category     TEXT,
  uploaded_by  TEXT,
  created_at   INTEGER NOT NULL
);

INSERT OR IGNORE INTO log (id,date,category,title,body,created_by,created_at,sort) VALUES
 ('l001','Today','task','Retained the closing attorney','Jane Krochmalny in Guilford — see Resources.','seed',1751560000003,0),
 ('l002','Jul 1','log','Walked the parcel down to Broad Brook','Bay windows look right over the water.','seed',1751560000002,1),
 ('l003','Jun 30','done','Starlink install booked','','seed',1751560000001,2);
