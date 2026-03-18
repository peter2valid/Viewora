-- Migration 009: lead status workflow + soft delete
--
-- Adds:
--   project_leads.status      TEXT 'new' | 'contacted' | 'qualified' | 'closed'
--   project_leads.archived_at TIMESTAMPTZ  (soft delete — NULL means active)
--
-- Rationale:
--   Agents need to track where a lead is in their workflow without leaving the app.
--   Soft delete prevents accidental data loss; archived leads are recoverable.
--
-- Idempotent: safe to run multiple times.

ALTER TABLE project_leads
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_leads_status_check'
  ) THEN
    ALTER TABLE project_leads
      ADD CONSTRAINT project_leads_status_check
      CHECK (status IN ('new', 'contacted', 'qualified', 'closed'));
  END IF;
END $$;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_project_leads_status
  ON project_leads (project_id, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_leads_created_at
  ON project_leads (project_id, created_at DESC)
  WHERE archived_at IS NULL;
