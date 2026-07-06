-- Phase 9: task assignee. Mark whether a task is for Andy, Zoe, or anyone
-- (empty). Shown as a tappable name pill on each task + an assignee filter.
ALTER TABLE tasks ADD COLUMN assignee TEXT;
