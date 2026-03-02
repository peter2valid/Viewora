-- ============================================================
-- VIEWORA — Production Schema for Supabase
-- Generated from full codebase scan (composables + server routes)
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Tables created (in dependency order):
--   1. profiles   — mirrors auth.users with app-level data
--   2. spaces     — virtual tour project owned by a user
--   3. scenes     — 360° panorama inside a space
--   4. hotspots   — nav/info markers placed on a scene
-- ============================================================
-- ============================================================
-- 1. EXTENSIONS
-- gen_random_uuid() is built-in on Supabase (pg >= 13)
-- pgcrypto adds encode/decode helpers (safe to add)
-- ============================================================
create extension if not exists "pgcrypto";
-- ============================================================
-- 2. TABLES  (in FK dependency order)
-- ============================================================
-- ── profiles ────────────────────────────────────────────────
-- One row per auth user. Auto-created by trigger on signup.
-- Columns detected from: migrations, handle_new_user trigger
create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text,
    avatar_url text,
    phone text,
    plan text not null default 'free',
    created_at timestamptz not null default now()
);
comment on table public.profiles is 'App-level profile mirroring auth.users. Auto-created by trigger.';
-- ── spaces ──────────────────────────────────────────────────
-- Detected columns from:
--   server/api/spaces/index.get.ts        → id, owner_id, title, created_at, is_published, slug
--   server/api/spaces/index.post.ts       → id, owner_id, title, created_at
--   server/api/spaces/[id].get.ts         → panorama_key (used to generate signed URL)
--   server/api/spaces/[id]/panorama.post  → panorama_key (UPDATE SET panorama_key)
--   server/api/spaces/[id]/publish.post   → is_published, slug
--   composables/useSpaces.ts interface    → panorama_url (computed, NOT a stored column)
create table public.spaces (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users (id) on delete cascade,
    title text not null default 'Untitled Space',
    description text,
    panorama_key text,
    -- R2 object key (not a URL)
    is_published boolean not null default false,
    slug text unique,
    created_at timestamptz not null default now()
);
comment on table public.spaces is 'Top-level virtual tour container owned by a user.';
-- ── scenes ──────────────────────────────────────────────────
-- Detected columns from:
--   server/api/spaces/[id]/scenes.get.ts  → space_id, order_index
--   server/api/spaces/[id]/scenes.post.ts → id, space_id, name, image_path, order_index, created_at
--   composables/useScenes.ts interface    → id, space_id, name, image_path, order_index, created_at
create table public.scenes (
    id uuid primary key default gen_random_uuid(),
    space_id uuid not null references public.spaces (id) on delete cascade,
    name text not null default 'Scene',
    image_path text,
    -- R2 storage object key
    order_index integer not null default 0,
    created_at timestamptz not null default now()
);
comment on table public.scenes is 'One 360° equirectangular panorama image (scene) inside a space.';
-- ── hotspots ────────────────────────────────────────────────
-- Detected columns from:
--   server/api/scenes/[id]/hotspots.post  → id, scene_id, type, yaw, pitch, payload, created_at
--   server/api/scenes/[id]/hotspots.get   → all columns; payload parsed with JSON.parse()
--   composables/useHotspots.ts interface  → id, scene_id, type, yaw, pitch, payload (object), created_at
-- Note: D1 stores payload as TEXT; Supabase stores as native JSONB (no JSON.parse needed)
create table public.hotspots (
    id uuid primary key default gen_random_uuid(),
    scene_id uuid not null references public.scenes (id) on delete cascade,
    type text not null default 'info' check (type in ('nav', 'info')),
    yaw float8 not null,
    pitch float8 not null,
    payload jsonb not null default '{}',
    created_at timestamptz not null default now()
);
comment on table public.hotspots is 'Navigation or info marker placed on a scene at a yaw/pitch position.
   type=nav  → payload: { "target_scene_id": "<uuid>" }
   type=info → payload: { "label": "Living Room" }';
-- ============================================================
-- 3. INDEXES
-- Cover all FK columns + common query patterns
-- ============================================================
create index idx_spaces_owner_id on public.spaces (owner_id);
create index idx_spaces_slug on public.spaces (slug)
where slug is not null;
create index idx_scenes_space_id on public.scenes (space_id);
create index idx_scenes_order on public.scenes (space_id, order_index);
create index idx_hotspots_scene_id on public.hotspots (scene_id);
-- ============================================================
-- 4. ROW LEVEL SECURITY — Enable on all user-owned tables
-- ============================================================
alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.scenes enable row level security;
alter table public.hotspots enable row level security;
-- ============================================================
-- 5. RLS POLICIES
-- ============================================================
-- ── profiles ─────────────────────────────────────────────────
-- A user may only read or edit their own profile row.
create policy "profiles: owner can select" on public.profiles for
select using (id = auth.uid());
create policy "profiles: owner can insert" on public.profiles for
insert with check (id = auth.uid());
create policy "profiles: owner can update" on public.profiles for
update using (id = auth.uid());
-- ── spaces ────────────────────────────────────────────────────
-- Full CRUD for the owner.
-- Public SELECT for published spaces (needed by /tours/[slug] viewer).
create policy "spaces: owner can select" on public.spaces for
select using (owner_id = auth.uid());
create policy "spaces: public can read published" on public.spaces for
select using (is_published = true);
create policy "spaces: owner can insert" on public.spaces for
insert with check (owner_id = auth.uid());
create policy "spaces: owner can update" on public.spaces for
update using (owner_id = auth.uid());
create policy "spaces: owner can delete" on public.spaces for delete using (owner_id = auth.uid());
-- ── scenes ────────────────────────────────────────────────────
-- Owner has full CRUD.
-- Public SELECT allowed for scenes that belong to a published space
-- (so the Marzipano viewer can load them without auth).
create policy "scenes: owner can select" on public.scenes for
select using (
        exists (
            select 1
            from public.spaces
            where public.spaces.id = scenes.space_id
                and public.spaces.owner_id = auth.uid()
        )
    );
create policy "scenes: public can read if space is published" on public.scenes for
select using (
        exists (
            select 1
            from public.spaces
            where public.spaces.id = scenes.space_id
                and public.spaces.is_published = true
        )
    );
create policy "scenes: owner can insert" on public.scenes for
insert with check (
        exists (
            select 1
            from public.spaces
            where public.spaces.id = scenes.space_id
                and public.spaces.owner_id = auth.uid()
        )
    );
create policy "scenes: owner can update" on public.scenes for
update using (
        exists (
            select 1
            from public.spaces
            where public.spaces.id = scenes.space_id
                and public.spaces.owner_id = auth.uid()
        )
    );
create policy "scenes: owner can delete" on public.scenes for delete using (
    exists (
        select 1
        from public.spaces
        where public.spaces.id = scenes.space_id
            and public.spaces.owner_id = auth.uid()
    )
);
-- ── hotspots ─────────────────────────────────────────────────
-- Owner has full CRUD (resolved via scenes → spaces chain).
-- Public SELECT for hotspots whose parent scene belongs to a published space.
create policy "hotspots: owner can select" on public.hotspots for
select using (
        exists (
            select 1
            from public.scenes sc
                join public.spaces sp on sp.id = sc.space_id
            where sc.id = hotspots.scene_id
                and sp.owner_id = auth.uid()
        )
    );
create policy "hotspots: public can read if space is published" on public.hotspots for
select using (
        exists (
            select 1
            from public.scenes sc
                join public.spaces sp on sp.id = sc.space_id
            where sc.id = hotspots.scene_id
                and sp.is_published = true
        )
    );
create policy "hotspots: owner can insert" on public.hotspots for
insert with check (
        exists (
            select 1
            from public.scenes sc
                join public.spaces sp on sp.id = sc.space_id
            where sc.id = hotspots.scene_id
                and sp.owner_id = auth.uid()
        )
    );
create policy "hotspots: owner can update" on public.hotspots for
update using (
        exists (
            select 1
            from public.scenes sc
                join public.spaces sp on sp.id = sc.space_id
            where sc.id = hotspots.scene_id
                and sp.owner_id = auth.uid()
        )
    );
create policy "hotspots: owner can delete" on public.hotspots for delete using (
    exists (
        select 1
        from public.scenes sc
            join public.spaces sp on sp.id = sc.space_id
        where sc.id = hotspots.scene_id
            and sp.owner_id = auth.uid()
    )
);
-- ============================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP
-- Fires after every new row in auth.users (email, Google OAuth, etc.)
-- ============================================================
create or replace function public.handle_new_user() returns trigger language plpgsql security definer
set search_path = public as $$ begin
insert into public.profiles (id, full_name)
values (
        new.id,
        coalesce(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name' -- Google OAuth sends 'name'
        )
    ) on conflict (id) do nothing;
-- safe to re-run migration
return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after
insert on auth.users for each row execute function public.handle_new_user();
-- ============================================================
-- DONE ✓
--
-- Summary:
--   Tables   : profiles, spaces, scenes, hotspots
--   Indexes  : 5  (owner_id, slug, space_id, space_id+order, scene_id)
--   RLS      : Enabled on all 4 tables
--   Policies : 18 total
--              profiles  → 3  (select, insert, update)
--              spaces    → 5  (select-own, select-public, insert, update, delete)
--              scenes    → 5  (select-own, select-public, insert, update, delete)
--              hotspots  → 5  (select-own, select-public, insert, update, delete)
--   Trigger  : handle_new_user → auto-creates profile on every signup
--
-- ⚠️  IMPORTANT: The server routes currently use Cloudflare D1 (not Supabase).
--     This schema is authoritative for Supabase Postgres.
--     If you switch server routes to use Supabase DB, use the Supabase client
--     with the service role key server-side and the anon key client-side.
-- ============================================================