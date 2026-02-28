-- ============================================================
-- Migration 002: scenes + hotspots tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── scenes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scenes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id       uuid NOT NULL REFERENCES virtual_tours(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'Scene',
  panorama_url  text,
  thumbnail_url text,
  initial_yaw   float8 NOT NULL DEFAULT 0,
  initial_pitch float8 NOT NULL DEFAULT 0,
  initial_fov   float8 NOT NULL DEFAULT 1.0,
  sort_order    int   NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── hotspots ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotspots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id        uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  target_scene_id uuid REFERENCES scenes(id) ON DELETE SET NULL,
  yaw             float8 NOT NULL,
  pitch           float8 NOT NULL,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scenes_tour_id      ON scenes(tour_id);
CREATE INDEX IF NOT EXISTS idx_scenes_sort_order   ON scenes(tour_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_hotspots_scene_id   ON hotspots(scene_id);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE scenes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

-- Scenes: user owns the tour → owns the scenes
CREATE POLICY "users_own_scenes" ON scenes
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM virtual_tours vt
      JOIN properties p ON p.id = vt.property_id
      WHERE vt.id = scenes.tour_id
        AND p.user_id = auth.uid()
    )
  );

-- Hotspots: user owns the scene's tour → owns the hotspots
CREATE POLICY "users_own_hotspots" ON hotspots
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM scenes s
      JOIN virtual_tours vt ON vt.id = s.tour_id
      JOIN properties p ON p.id = vt.property_id
      WHERE s.id = hotspots.scene_id
        AND p.user_id = auth.uid()
    )
  );

-- ── Storage bucket ────────────────────────────────────────────
-- Create the 'panoramas' bucket via Supabase Dashboard:
--   Storage → New bucket → Name: "panoramas" → Public: ON
--
-- Then add this Storage RLS policy (Dashboard → Storage → Policies):
--
-- Policy name: "Users manage their own panoramas"
-- Allowed operation: ALL
-- Target roles: authenticated
-- USING expression:
--   (storage.foldername(name))[1] = auth.uid()::text
