-- Phase 5: file summaries. Files can now carry a short description in addition
-- to a name + category (rename / summarize / categorize via PATCH /files/:id).
ALTER TABLE files ADD COLUMN summary TEXT;
