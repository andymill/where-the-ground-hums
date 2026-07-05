-- Phase 7: file thumbnails. A small JPEG data-URI preview generated in the
-- browser — page-1 render for PDFs (via pdf.js), downscale for images —
-- stored so the Files cards show a real preview instead of a generic icon.
-- NULL means "no thumb yet": images fall back to the full image, other types
-- to the file icon. Backfilled lazily on the Files screen.
ALTER TABLE files ADD COLUMN thumb TEXT;
