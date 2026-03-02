-- ─────────────────────────────────────────────────────────────────────────────
-- Viewora D1 Schema  (SQLite / Cloudflare D1)
-- Run against local D1:  wrangler d1 execute viewora-db --local  --file=database/migrations/0001_initial.sql
-- Run against remote D1: wrangler d1 execute viewora-db --remote --file=database/migrations/0001_initial.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Spaces ───────────────────────────────────────────────────────────────────
-- Each space = one 360° property/location a user has created.
CREATE TABLE IF NOT EXISTS spaces (
  id           TEXT    PRIMARY KEY,
  owner_id     TEXT    NOT NULL,
  title        TEXT    NOT NULL,
  panorama_key TEXT,                                   -- R2 object key, nullable until uploaded
  is_published INTEGER NOT NULL DEFAULT 0,             -- 0 = draft, 1 = published (SQLite has no BOOLEAN)
  slug         TEXT,                                   -- URL-safe identifier, set on publish
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX        IF NOT EXISTS idx_spaces_owner ON spaces(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_slug  ON spaces(slug) WHERE slug IS NOT NULL;

-- ── Scenes ───────────────────────────────────────────────────────────────────
-- Optional: multiple scenes per space (each is one panorama / room).
CREATE TABLE IF NOT EXISTS scenes (
  id          TEXT    PRIMARY KEY,
  space_id    TEXT    NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  image_path  TEXT,                                    -- R2 object key for this scene's panorama
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scenes_space ON scenes(space_id);

-- ── Hotspots ─────────────────────────────────────────────────────────────────
-- Optional: interactive points placed on a scene's panorama.
CREATE TABLE IF NOT EXISTS hotspots (
  id         TEXT    PRIMARY KEY,
  scene_id   TEXT    NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL DEFAULT 'info',          -- 'info' | 'link' | 'nav'
  yaw        REAL    NOT NULL,
  pitch      REAL    NOT NULL,
  payload    TEXT    NOT NULL DEFAULT '{}',            -- JSON blob stored as text
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hotspots_scene ON hotspots(scene_id);
