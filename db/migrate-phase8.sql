-- Phase 8: favorite providers. A star toggle per resource + a Favorites filter
-- chip on the Resources screen.
ALTER TABLE resources ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
