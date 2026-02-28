-- ============================================================
-- VIEWORA — Complete Fresh Schema (run on empty Supabase project)
-- Paste the entire contents of this file into:
--   Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ============================================================
-- 2. TABLES
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
-- One row per auth user. Auto-created by trigger on signup.
-- Never queried directly by the app — used for plan gating (future).
create table public.profiles (
  id          uuid        primary key references auth.users on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text,
  plan        text        not null default 'free',
  created_at  timestamptz not null default now()
);
comment on table public.profiles is 'Mirrors auth.users with app-level profile data.';


-- ── spaces ──────────────────────────────────────────────────
-- A virtual tour project. Owns scenes and hotspots.
create table public.spaces (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references auth.users on delete cascade,
  title        text        not null,
  description  text,
  is_published boolean     not null default false,
  slug         text        unique,
  created_at   timestamptz not null default now()
);
comment on table public.spaces is 'Top-level virtual tour container owned by a user.';


-- ── scenes ──────────────────────────────────────────────────
-- A 360° equirectangular panorama image inside a space.
create table public.scenes (
  id          uuid        primary key default gen_random_uuid(),
  space_id    uuid        not null references public.spaces on delete cascade,
  name        text        not null,
  image_path  text,                        -- storage path inside 'tours' bucket
  order_index integer     not null default 0,
  created_at  timestamptz not null default now()
);
comment on table public.scenes is 'One panorama image (scene) inside a space.';


-- ── hotspots ────────────────────────────────────────────────
-- An interactive marker placed on a scene at a yaw/pitch position.
-- type = 'nav'  → payload: { "target_scene_id": "<uuid>" }
-- type = 'info' → payload: { "label": "Living Room" }
create table public.hotspots (
  id         uuid        primary key default gen_random_uuid(),
  scene_id   uuid        not null references public.scenes on delete cascade,
  type       text        not null default 'nav'
             check (type in ('nav', 'info')),
  yaw        float8      not null,
  pitch      float8      not null,
  payload    jsonb       not null default '{}',
  created_at timestamptz not null default now()
);
comment on table public.hotspots is 'Navigation or info marker placed on a scene.';


-- ============================================================
-- 3. INDEXES
-- ============================================================

create index spaces_owner_id_idx   on public.spaces   (owner_id);
create index spaces_slug_idx       on public.spaces   (slug) where slug is not null;
create index scenes_space_id_idx   on public.scenes   (space_id);
create index scenes_order_idx      on public.scenes   (space_id, order_index);
create index hotspots_scene_id_idx on public.hotspots (scene_id);


-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.spaces    enable row level security;
alter table public.scenes    enable row level security;
alter table public.hotspots  enable row level security;


-- ── profiles ─────────────────────────────────────────────
create policy "profiles: owner can read"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: owner can update"
  on public.profiles for update
  using (id = auth.uid());


-- ── spaces ────────────────────────────────────────────────
-- Owners have full CRUD
create policy "spaces: owner can read"
  on public.spaces for select
  using (owner_id = auth.uid());

create policy "spaces: owner can insert"
  on public.spaces for insert
  with check (owner_id = auth.uid());

create policy "spaces: owner can update"
  on public.spaces for update
  using (owner_id = auth.uid());

create policy "spaces: owner can delete"
  on public.spaces for delete
  using (owner_id = auth.uid());

-- Anyone can read published spaces (needed for /tours/[slug] public viewer)
create policy "spaces: public can read published"
  on public.spaces for select
  using (is_published = true);


-- ── scenes ────────────────────────────────────────────────
-- Read: owner OR viewing a published space (public viewer)
create policy "scenes: owner or published can read"
  on public.scenes for select
  using (
    exists (
      select 1 from public.spaces
      where id = scenes.space_id
        and (owner_id = auth.uid() or is_published = true)
    )
  );

create policy "scenes: owner can insert"
  on public.scenes for insert
  with check (
    exists (
      select 1 from public.spaces
      where id = scenes.space_id
        and owner_id = auth.uid()
    )
  );

create policy "scenes: owner can update"
  on public.scenes for update
  using (
    exists (
      select 1 from public.spaces
      where id = scenes.space_id
        and owner_id = auth.uid()
    )
  );

create policy "scenes: owner can delete"
  on public.scenes for delete
  using (
    exists (
      select 1 from public.spaces
      where id = scenes.space_id
        and owner_id = auth.uid()
    )
  );


-- ── hotspots ──────────────────────────────────────────────
-- Read: owner OR viewing a published space
create policy "hotspots: owner or published can read"
  on public.hotspots for select
  using (
    exists (
      select 1
      from public.scenes sc
      join public.spaces sp on sp.id = sc.space_id
      where sc.id = hotspots.scene_id
        and (sp.owner_id = auth.uid() or sp.is_published = true)
    )
  );

create policy "hotspots: owner can insert"
  on public.hotspots for insert
  with check (
    exists (
      select 1
      from public.scenes sc
      join public.spaces sp on sp.id = sc.space_id
      where sc.id = hotspots.scene_id
        and sp.owner_id = auth.uid()
    )
  );

create policy "hotspots: owner can update"
  on public.hotspots for update
  using (
    exists (
      select 1
      from public.scenes sc
      join public.spaces sp on sp.id = sc.space_id
      where sc.id = hotspots.scene_id
        and sp.owner_id = auth.uid()
    )
  );

create policy "hotspots: owner can delete"
  on public.hotspots for delete
  using (
    exists (
      select 1
      from public.scenes sc
      join public.spaces sp on sp.id = sc.space_id
      where sc.id = hotspots.scene_id
        and sp.owner_id = auth.uid()
    )
  );


-- ============================================================
-- 5. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'        -- Google OAuth uses 'name'
    )
  )
  on conflict (id) do nothing;                 -- safe to re-run
  return new;
end;
$$;

-- Drop and recreate trigger (safe to re-run)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 6. STORAGE BUCKET + RLS
-- ============================================================
-- Bucket: 'tours'
-- Public bucket (images are served publicly via CDN URL)
-- Upload path: {spaceId}/{timestamp}_{random}.{ext}
-- RLS ensures only the space owner can upload/delete to their folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tours',
  'tours',
  true,                    -- serve files without auth token in URL
  20971520,                -- 20 MB per file
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Drop existing storage policies to avoid duplicates on re-run
drop policy if exists "tours: owner can upload"      on storage.objects;
drop policy if exists "tours: owner can delete"      on storage.objects;
drop policy if exists "tours: public can read"       on storage.objects;
drop policy if exists "tours: owner can update"      on storage.objects;

-- Anyone can read (images are public CDN — needed for the Marzipano viewer)
create policy "tours: public can read"
  on storage.objects for select
  to public
  using (bucket_id = 'tours');

-- Authenticated owner of the space can upload
-- Path: {spaceId}/{filename}  →  first folder segment must match a space they own
create policy "tours: owner can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tours'
    and exists (
      select 1 from public.spaces
      where id = (storage.foldername(name))[1]::uuid
        and owner_id = auth.uid()
    )
  );

-- Owner can update (upsert / replace file)
create policy "tours: owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tours'
    and exists (
      select 1 from public.spaces
      where id = (storage.foldername(name))[1]::uuid
        and owner_id = auth.uid()
    )
  );

-- Owner can delete their own files
create policy "tours: owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tours'
    and exists (
      select 1 from public.spaces
      where id = (storage.foldername(name))[1]::uuid
        and owner_id = auth.uid()
    )
  );


-- ============================================================
-- DONE ✓
-- Tables:   profiles, spaces, scenes, hotspots
-- Indexes:  5 covering all foreign key + query patterns
-- RLS:      14 policies (profiles, spaces, scenes, hotspots)
-- Trigger:  handle_new_user → auto-creates profile on signup
-- Storage:  tours bucket (public, 20 MB limit, JPEG/PNG/WebP)
-- Storage RLS: 4 policies (public read, owner upload/update/delete)
-- ============================================================
