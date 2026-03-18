-- ============================================================
-- VIEWORA — Unified Property Schema (012)
-- Replaces Organization/Project/Space with Property model.
-- ============================================================

-- ── 1. CLEANUP LEGACY ───────────────────────────────────────
-- Drop legacy tables from previous iterations
drop table if exists public.audit_logs cascade;
drop table if exists public.photo_shoot_bookings cascade;
drop table if exists public.photo_shoot_credits cascade;
drop table if exists public.project_analytics_daily cascade;
drop table if exists public.project_leads cascade;
drop table if exists public.cloudpano_mappings cascade;
drop table if exists public.projects cascade;
drop table if exists public.memberships cascade;
drop table if exists public.organizations cascade;
drop table if exists public.plan_entitlements cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.plans cascade;
drop table if exists public.hotspots cascade;
drop table if exists public.scenes cascade;
drop table if exists public.spaces cascade;

-- Drop legacy enums
drop type if exists member_role cascade;
drop type if exists membership_status cascade;
drop type if exists subscription_status cascade;
drop type if exists billing_cycle cascade;
drop type if exists project_status cascade;
drop type if exists project_visibility cascade;
drop type if exists cloudpano_sync_status cascade;
drop type if exists booking_status cascade;
drop type if exists org_status cascade;

-- ── 2. NEW ENUMS ───────────────────────────────────────────
do $$ begin
  create type public.property_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.property_visibility as enum ('private', 'public');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.sub_status as enum ('active', 'trialing', 'past_due', 'canceled', 'unpaid');
exception when duplicate_object then null;
end $$;

-- ── 3. TABLES ───────────────────────────────────────────────

-- 3.1 Profiles (Extended)
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text unique,
  full_name       text,
  company_name    text,
  avatar_url      text,
  phone           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 3.2 Plans
create table if not exists public.plans (
  id                              uuid primary key default gen_random_uuid(),
  name                            text not null,
  price_monthly_kes               integer not null default 0,
  price_yearly_kes                integer not null default 0,
  max_active_properties           integer not null default 1,
  max_storage_bytes               bigint not null default 1073741824, -- 1GB
  qr_download_enabled             boolean default false,
  qr_svg_enabled                  boolean default false,
  embeds_enabled                  boolean default false,
  advanced_embeds_enabled         boolean default false,
  lead_capture_enabled            boolean default false,
  advanced_analytics_enabled      boolean default false,
  branding_customization_enabled  boolean default false,
  max_team_members                integer default 1,
  created_at                      timestamptz default now(),
  updated_at                      timestamptz default now()
);

-- 3.3 Subscriptions
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles (id) on delete cascade,
  plan_id                 uuid not null references public.plans (id),
  provider                text default 'paystack',
  provider_reference      text,
  status                  public.sub_status default 'trialing',
  billing_cycle           text default 'monthly',
  current_period_start    timestamptz default now(),
  current_period_end      timestamptz,
  grace_period_ends_at    timestamptz,
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- 3.4 Properties
create table if not exists public.properties (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  title               text not null default 'New Property',
  slug                text unique,
  description         text,
  property_type       text,
  location_text       text,
  cover_image_url     text,
  has_360             boolean default false,
  has_gallery         boolean default false,
  is_published        boolean default false,
  published_at        timestamptz,
  visibility          public.property_visibility default 'private',
  lead_form_enabled   boolean default false,
  branding_enabled    boolean default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- 3.5 Property Media (Gallery + Panoramas)
create table if not exists public.property_media (
  id                uuid primary key default gen_random_uuid(),
  property_id       uuid not null references public.properties (id) on delete cascade,
  media_type        text not null, -- 'image' | 'panorama' | 'thumbnail'
  storage_key       text not null,
  public_url        text not null,
  width             integer,
  height            integer,
  file_size_bytes   bigint,
  sort_order        integer default 0,
  is_primary        boolean default false,
  created_at        timestamptz default now()
);

-- 3.6 Property 360 Settings
create table if not exists public.property_360_settings (
  id                    uuid primary key default gen_random_uuid(),
  property_id           uuid not null unique references public.properties (id) on delete cascade,
  panorama_media_id     uuid references public.property_media (id) on delete set null,
  hfov_default          float default 100,
  pitch_default         float default 0,
  yaw_default           float default 0,
  auto_rotate_enabled   boolean default false,
  hotspots_json         jsonb default '[]',
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- 3.7 Leads
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties (id) on delete cascade,
  name          text,
  phone         text,
  email         text,
  message       text,
  source        text default 'direct', -- 'direct' | 'qr' | 'embed'
  created_at    timestamptz default now()
);

-- 3.8 Usage Counters
create table if not exists public.usage_counters (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references public.profiles (id) on delete cascade,
  active_properties_count   integer default 0,
  storage_used_bytes        bigint default 0,
  updated_at                timestamptz default now()
);

-- 3.9 Analytics Daily
create table if not exists public.analytics_daily (
  id              uuid primary key default gen_random_uuid(),
  property_id      uuid not null references public.properties (id) on delete cascade,
  date            date not null default current_date,
  total_views     integer default 0,
  qr_views        integer default 0,
  direct_views    integer default 0,
  embed_views     integer default 0,
  leads_count     integer default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique (property_id, date)
);

-- ── 4. RLS POLICIES ───────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.properties enable row level security;
alter table public.property_media enable row level security;
alter table public.property_360_settings enable row level security;
alter table public.leads enable row level security;
alter table public.usage_counters enable row level security;
alter table public.analytics_daily enable row level security;

-- 4.1 Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- 4.2 Plans (Public read)
create policy "Anyone can view plans" on public.plans for select using (true);

-- 4.3 Subscriptions
create policy "Users can view own subscription" on public.subscriptions for select using (auth.uid() = user_id);

-- 4.4 Properties
create policy "Users can view own properties" on public.properties for select using (auth.uid() = user_id);
create policy "Public can view published properties" on public.properties for select using (is_published = true and visibility = 'public');
create policy "Users can insert own properties" on public.properties for insert with check (auth.uid() = user_id);
create policy "Users can update own properties" on public.properties for update using (auth.uid() = user_id);
create policy "Users can delete own properties" on public.properties for delete using (auth.uid() = user_id);

-- 4.5 Property Media
create policy "Users can manage own property media" on public.property_media
  for all using (exists (select 1 from public.properties where id = property_media.property_id and user_id = auth.uid()));
create policy "Public can view public property media" on public.property_media
  for select using (exists (select 1 from public.properties where id = property_media.property_id and is_published = true));

-- 4.6 Property 360 Settings
create policy "Users can manage own 360 settings" on public.property_360_settings
  for all using (exists (select 1 from public.properties where id = property_360_settings.property_id and user_id = auth.uid()));
create policy "Public can view public 360 settings" on public.property_360_settings
  for select using (exists (select 1 from public.properties where id = property_360_settings.property_id and is_published = true));

-- 4.7 Leads
create policy "Property owners can view leads" on public.leads
  for select using (exists (select 1 from public.properties where id = leads.property_id and user_id = auth.uid()));
create policy "Public can insert leads" on public.leads for insert with check (true);

-- 4.8 Usage Counters
create policy "Users can view own usage" on public.usage_counters for select using (auth.uid() = user_id);

-- 4.9 Analytics Daily
create policy "Property owners can view analytics" on public.analytics_daily
  for select using (exists (select 1 from public.properties where id = analytics_daily.property_id and user_id = auth.uid()));

-- ── 5. FUNCTIONS & TRIGGERS ──────────────────────────────────

-- Profile creation on Auth Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  insert into public.usage_counters (user_id) values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Automatic updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated before update on public.profiles for each row execute function public.handle_updated_at();
create trigger on_property_updated before update on public.properties for each row execute function public.handle_updated_at();
create trigger on_plan_updated before update on public.plans for each row execute function public.handle_updated_at();
create trigger on_subscription_updated before update on public.subscriptions for each row execute function public.handle_updated_at();

-- ── 6. SEED DATA ─────────────────────────────────────────────

insert into public.plans (name, price_monthly_kes, price_yearly_kes, max_active_properties, max_storage_bytes, branding_customization_enabled)
values 
  ('Free', 0, 0, 2, 536870912, false), -- 512MB
  ('Basic', 1500, 15000, 10, 5368709120, false), -- 5GB
  ('Plus', 4000, 40000, 30, 21474836480, true), -- 20GB
  ('Pro', 8500, 85000, 100, 107374182400, true); -- 100GB
