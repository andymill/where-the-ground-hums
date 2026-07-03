-- Phase 4: shared trackers (house system readings).
CREATE TABLE IF NOT EXISTS trackers (
  key    TEXT PRIMARY KEY,
  label  TEXT,
  icon   TEXT,
  value  TEXT,
  unit   TEXT,
  pct    INTEGER,
  detail TEXT,
  sort   INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO trackers (key,label,icon,value,unit,pct,detail,sort) VALUES
 ('firewood','Firewood','flame','2.5','of 6 cords',42,'Restocking for winter — woodlot on the parcel',0),
 ('oil','Heating oil','fuel','60','% · hot water',60,'Heat is wood; oil for hot water only',1),
 ('well','Well & water','droplet','Good','',NULL,'Well for the house · Broad Brook on the lower line',2),
 ('rain','Rainfall','cloud-rain','0.4','" this week',NULL,'Season to date 6.2"',3),
 ('gen','Generator','zap','—','hrs since service',NULL,'Set service date when installed',4),
 ('cam','Trail cam','camera','2','overnight',NULL,'2 whitetail deer · 1 fox overnight',5);
