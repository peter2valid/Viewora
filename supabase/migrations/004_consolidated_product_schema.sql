-- ============================================================
-- Migration 004: Consolidated product schema
-- Run this in Supabase Dashboard → SQL Editor
-- Safe to run multiple times (IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ── 1. profiles table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  phone       text,
  plan        text NOT NULL DEFAULT 'free',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'users_own_profile'
  ) THEN
    CREATE POLICY "users_own_profile" ON profiles FOR ALL USING (auth.uid() = id);
  END IF;
END $$;

-- ── 2. spaces table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spaces (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL DEFAULT 'Untitled Space',
  description  text,
  is_published boolean NOT NULL DEFAULT false,
  slug         text UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'spaces' AND policyname = 'users_manage_own_spaces'
  ) THEN
    CREATE POLICY "users_manage_own_spaces" ON spaces FOR ALL USING (auth.uid() = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'spaces' AND policyname = 'public_read_published_spaces'
  ) THEN
    CREATE POLICY "public_read_published_spaces" ON spaces FOR SELECT USING (is_published = true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON spaces(owner_id);

-- ── 3. scenes table ──────────────────────────────────────────
-- Drop and recreate to avoid column conflicts with old migrations
CREATE TABLE IF NOT EXISTS scenes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  name        text NOT NULL DEFAULT 'Scene',
  image_path  text,
  order_index int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scenes' AND policyname = 'users_manage_own_scenes'
  ) THEN
    CREATE POLICY "users_manage_own_scenes" ON scenes FOR ALL USING (
      EXISTS (
        SELECT 1 FROM spaces
        WHERE spaces.id = scenes.space_id
          AND spaces.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'scenes' AND policyname = 'public_read_published_scenes'
  ) THEN
    CREATE POLICY "public_read_published_scenes" ON scenes FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM spaces
        WHERE spaces.id = scenes.space_id
          AND spaces.is_published = true
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scenes_space_id ON scenes(space_id);
CREATE INDEX IF NOT EXISTS idx_scenes_order ON scenes(space_id, order_index);

-- ── 4. hotspots table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotspots (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id  uuid NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  type      text NOT NULL DEFAULT 'info',
  yaw       float8 NOT NULL,
  pitch     float8 NOT NULL,
  payload   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hotspots' AND policyname = 'users_manage_own_hotspots'
  ) THEN
    CREATE POLICY "users_manage_own_hotspots" ON hotspots FOR ALL USING (
      EXISTS (
        SELECT 1 FROM scenes
        JOIN spaces ON spaces.id = scenes.space_id
        WHERE scenes.id = hotspots.scene_id
          AND spaces.owner_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'hotspots' AND policyname = 'public_read_published_hotspots'
  ) THEN
    CREATE POLICY "public_read_published_hotspots" ON hotspots FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM scenes
        JOIN spaces ON spaces.id = scenes.space_id
        WHERE scenes.id = hotspots.scene_id
          AND spaces.is_published = true
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hotspots_scene_id ON hotspots(scene_id);

-- ── 5. Auto-create profile on signup ────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, plan)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'free'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── 6. Storage bucket (run manually in Dashboard if not done) ──
-- Dashboard → Storage → New bucket:
--   Name: "tours"
--   Public: ON (for public URL generation)
--
-- Then add Storage Policy (Dashboard → Storage → Policies → "tours" bucket):
--   Policy name: "Users upload to own folder"
--   Operation: INSERT
--   Target roles: authenticated
--   USING: (storage.foldername(name))[1] = auth.uid()::text
--
--   Policy name: "Users manage their own files"
--   Operation: ALL
--   Target roles: authenticated
--   USING: (storage.foldername(name))[1] = auth.uid()::text
