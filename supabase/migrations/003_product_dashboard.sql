-- Migration 003: Product Dashboard Schema Update

-- 1. Create 'spaces' table
CREATE TABLE IF NOT EXISTS spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Space',
  description text,
  is_published boolean DEFAULT false,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Modify 'scenes' table or recreate if needed. Since we're moving from 'tour_id' to 'space_id'
-- we will alter the existing 'scenes' table or create it to match requirements.
-- Assuming we want to align strictly with the new prompt requirements.
ALTER TABLE IF EXISTS scenes ADD COLUMN IF NOT EXISTS space_id uuid REFERENCES spaces(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS scenes ADD COLUMN IF NOT EXISTS image_path text;
ALTER TABLE IF EXISTS scenes ADD COLUMN IF NOT EXISTS order_index int DEFAULT 0;

-- 3. Modify 'hotspots' table to match new requirements
ALTER TABLE IF EXISTS hotspots ADD COLUMN IF NOT EXISTS type text DEFAULT 'nav';
ALTER TABLE IF EXISTS hotspots ADD COLUMN IF NOT EXISTS payload jsonb;

-- 4. Enable RLS
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspots ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Spaces
CREATE POLICY "users_manage_own_spaces" ON spaces FOR ALL USING (auth.uid() = owner_id);
CREATE POLICY "public_read_published_spaces" ON spaces FOR SELECT USING (is_published = true);

-- Scenes
-- Allow read if user owns the space, or if the space is published
CREATE POLICY "users_manage_own_scenes_new" ON scenes FOR ALL USING (
  EXISTS (SELECT 1 FROM spaces WHERE spaces.id = scenes.space_id AND spaces.owner_id = auth.uid())
);
CREATE POLICY "public_read_published_scenes" ON scenes FOR SELECT USING (
  EXISTS (SELECT 1 FROM spaces WHERE spaces.id = scenes.space_id AND spaces.is_published = true)
);

-- Hotspots
CREATE POLICY "users_manage_own_hotspots_new" ON hotspots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM scenes
    JOIN spaces ON spaces.id = scenes.space_id
    WHERE scenes.id = hotspots.scene_id AND spaces.owner_id = auth.uid()
  )
);
CREATE POLICY "public_read_published_hotspots" ON hotspots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM scenes
    JOIN spaces ON spaces.id = scenes.space_id
    WHERE scenes.id = hotspots.scene_id AND spaces.is_published = true
  )
);

-- 6. Trigger for profile auto-creation on user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, plan)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'Basic');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_spaces_owner_id ON spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_scenes_space_id ON scenes(space_id);
