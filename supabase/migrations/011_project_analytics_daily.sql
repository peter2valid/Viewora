-- Migration 011: project_analytics_daily + increment_tour_view RPC
--
-- Tracks daily view counts per project.
-- Rows are upserted atomically via the increment_tour_view() function to avoid
-- lost-update races on high-traffic tours.
--
-- The application layer deduplicates reloads (localStorage key per slug+date),
-- so each row represents approximate unique-session views, not raw page loads.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS project_analytics_daily (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  views       INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_project_date
  ON project_analytics_daily (project_id, date DESC);

-- Atomic upsert function — called by POST /api/analytics/tour-view.
-- Using a function avoids a read-then-write race condition that would occur
-- if the application tried to increment in two separate queries.
CREATE OR REPLACE FUNCTION increment_tour_view(
  p_project_id UUID,
  p_date       DATE
)
RETURNS VOID
LANGUAGE SQL
AS $$
  INSERT INTO project_analytics_daily (project_id, date, views)
  VALUES (p_project_id, p_date, 1)
  ON CONFLICT (project_id, date)
  DO UPDATE SET views = project_analytics_daily.views + 1;
$$;
