-- Migration 008: Rename projects.status 'active' → 'published'
--
-- Rationale:
--   'active' was ambiguous — it conflated lifecycle with publish state.
--   The canonical lifecycle is: draft → published → archived
--   Visibility (private | public) is orthogonal and unchanged.
--   Combined: status=published + visibility=public = publicly accessible tour.
--
-- NOTE: subscriptions.status, memberships.status, organizations.status all
--       retain 'active' — this migration is ONLY for the projects table.
--
-- Idempotent: safe to run multiple times.

DO $$
BEGIN
  -- Only run if 'published' is not already a valid value (idempotency guard)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_status_check'
      AND consrc LIKE '%published%'
  ) THEN
    -- Drop the old check constraint
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

    -- Migrate existing data
    UPDATE projects SET status = 'published' WHERE status = 'active';

    -- Re-add constraint with new values
    ALTER TABLE projects
      ADD CONSTRAINT projects_status_check
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;
