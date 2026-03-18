-- Migration 010: add updated_at to project_leads
--
-- Rationale:
--   Once leads have a mutable status field (migration 009), we need updated_at
--   to show "last activity" in the dashboard and to enable future pipeline metrics
--   (response time, conversion rate, etc.).
--
--   A trigger keeps updated_at in sync automatically — no application code needs
--   to remember to set it.
--
-- Idempotent: safe to run multiple times.

ALTER TABLE project_leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Back-fill: existing rows get updated_at = created_at (better than NOW())
UPDATE project_leads
   SET updated_at = created_at
 WHERE updated_at = NOW()
   AND created_at < NOW() - INTERVAL '1 second';

-- Trigger function (shared across tables if it already exists)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Attach trigger to project_leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'project_leads_set_updated_at'
  ) THEN
    CREATE TRIGGER project_leads_set_updated_at
    BEFORE UPDATE ON project_leads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
