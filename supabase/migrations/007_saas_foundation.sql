-- ============================================================
-- VIEWORA — SaaS Foundation Migration (007)
-- Multi-tenant architecture: organizations, memberships,
-- plans, subscriptions, projects, leads, analytics,
-- photography credits, CloudPano mappings, audit logs.
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → paste → Run
--   OR: supabase db push
--
-- DEPENDENCY ORDER:
--   1. Enums
--   2. profiles (extend existing)
--   3. organizations
--   4. memberships
--   5. plans + plan_entitlements
--   6. subscriptions
--   7. projects (replaces direct user ownership on spaces)
--   8. cloudpano_mappings
--   9. project_leads
--  10. project_analytics_daily
--  11. photo_shoot_credits
--  12. photo_shoot_bookings
--  13. audit_logs
--  14. Indexes
--  15. RLS
--  16. Seeds (plans + free entitlements)
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

do $$ begin
  create type member_role as enum ('owner', 'admin', 'editor', 'viewer', 'billing_manager');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type membership_status as enum ('active', 'invited', 'suspended', 'removed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type subscription_status as enum ('active', 'trialing', 'past_due', 'canceled', 'paused');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type billing_cycle as enum ('monthly', 'yearly');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type project_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type project_visibility as enum ('private', 'public');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type cloudpano_sync_status as enum ('pending', 'synced', 'failed', 'manual');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type booking_status as enum ('requested', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type org_status as enum ('active', 'suspended');
exception when duplicate_object then null;
end $$;

-- ============================================================
-- 2. EXTEND profiles TABLE
-- Add updated_at and email columns to existing profiles.
-- Use safe "add column if not exists" pattern.
-- ============================================================

alter table public.profiles
  add column if not exists email text,
  add column if not exists updated_at timestamptz default now();

-- Backfill email from auth.users where possible
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- Keep email in sync via trigger
create or replace function public.sync_profile_email()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- ============================================================
-- 3. ORGANIZATIONS
-- ============================================================

create table if not exists public.organizations (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text not null unique,
  owner_user_id   uuid not null references auth.users (id) on delete restrict,
  logo_url        text,
  country         text default 'KE',
  timezone        text default 'Africa/Nairobi',
  status          org_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant unit. Every user bootstraps one org on first login. '
  'Multi-org support possible but UI shows one active org at a time.';

-- ============================================================
-- 4. MEMBERSHIPS
-- ============================================================

create table if not exists public.memberships (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  role                member_role not null default 'viewer',
  status              membership_status not null default 'active',
  invited_by_user_id  uuid references auth.users (id) on delete set null,
  joined_at           timestamptz,
  created_at          timestamptz not null default now(),
  unique (organization_id, user_id)
);

comment on table public.memberships is
  'Many-to-many users ↔ organizations. role drives all permission checks.';

-- ============================================================
-- 5. PLANS + PLAN ENTITLEMENTS
-- ============================================================

create table if not exists public.plans (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,  -- 'free' | 'basic' | 'plus' | 'pro' | 'elite'
  name            text not null,
  monthly_price   integer not null default 0,  -- KES, integer (no decimals)
  yearly_price    integer not null default 0,  -- KES
  currency        text not null default 'KES',
  is_public       boolean not null default true,
  is_custom       boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.plans is
  'Canonical plan catalogue. Prices in KES (integer). '
  'Never delete plans — set is_public=false to hide from new signups.';

create table if not exists public.plan_entitlements (
  id                                uuid primary key default gen_random_uuid(),
  plan_id                           uuid not null unique references public.plans (id) on delete cascade,
  max_members                       integer not null default 1,
  max_projects                      integer not null default 3,
  max_published_tours               integer not null default 1,
  max_storage_gb                    integer not null default 1,
  branding_required                 boolean not null default true,
  custom_logo_enabled               boolean not null default false,
  custom_domain_enabled             boolean not null default false,
  white_label_level                 text not null default 'none',  -- 'none' | 'partial' | 'full'
  analytics_level                   text not null default 'basic', -- 'basic' | 'advanced'
  lead_capture_enabled              boolean not null default false,
  street_view_publish_enabled       boolean not null default false,
  included_photo_shoots_per_month   integer not null default 0,
  priority_support_enabled          boolean not null default false,
  created_at                        timestamptz not null default now()
);

comment on table public.plan_entitlements is
  'What each plan can do. Checked server-side before every protected action. '
  'One row per plan.';

-- ============================================================
-- 6. SUBSCRIPTIONS
-- ============================================================

create table if not exists public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations (id) on delete cascade,
  plan_id                     uuid not null references public.plans (id) on delete restrict,
  provider                    text not null default 'paystack',  -- 'paystack' | 'manual' | 'free'
  provider_customer_id        text,
  provider_subscription_id    text,
  status                      subscription_status not null default 'active',
  billing_cycle               billing_cycle not null default 'monthly',
  starts_at                   timestamptz not null default now(),
  renews_at                   timestamptz,
  ends_at                     timestamptz,
  cancel_at_period_end        boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.subscriptions is
  'One active subscription per org at a time (enforced by app logic). '
  'Historical records are retained for audit. '
  'Paystack webhooks update status + renews_at.';

-- ============================================================
-- 7. PROJECTS
-- Replaces the concept of "spaces" being directly user-owned.
-- Projects belong to organizations. The old spaces table remains
-- for the Marzipano editor data (scenes, hotspots).
-- projects → spaces is a 1:1 link via cloudpano_mappings or
-- directly via a project_id on the spaces table (added below).
-- ============================================================

create table if not exists public.projects (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  name                text not null default 'Untitled Project',
  slug                text,
  description         text,
  cover_image_url     text,
  status              project_status not null default 'draft',
  visibility          project_visibility not null default 'private',
  created_by_user_id  uuid references auth.users (id) on delete set null,
  updated_by_user_id  uuid references auth.users (id) on delete set null,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.projects is
  'Org-scoped tour project. Slug is used for /tours/[slug] public URL. '
  'A project maps 1:1 to a CloudPano tour via cloudpano_mappings, '
  'and 1:1 to a Marzipano space via the space_id FK below.';

-- Link existing spaces → projects (1:1)
alter table public.spaces
  add column if not exists project_id uuid references public.projects (id) on delete set null;

-- ============================================================
-- 8. CLOUDPANO MAPPINGS
-- Abstraction layer between Viewora projects and CloudPano tours.
-- Viewora is always the source of truth.
-- ============================================================

create table if not exists public.cloudpano_mappings (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null references public.organizations (id) on delete cascade,
  project_id              uuid not null references public.projects (id) on delete cascade,
  cloudpano_account_id    text,    -- CloudPano account email/ID. NULL = not linked yet.
  cloudpano_tour_id       text,    -- CloudPano tour ID. NULL = manual mapping pending.
  sync_status             cloudpano_sync_status not null default 'manual',
  last_synced_at          timestamptz,
  last_error_message      text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (project_id)
);

comment on table public.cloudpano_mappings is
  'Maps a Viewora project to a CloudPano tour. '
  'sync_status=manual means it was linked by hand (no API automation). '
  'Viewora NEVER treats CloudPano as source of truth.';

-- ============================================================
-- 9. PROJECT LEADS
-- Captured from the public tour page inquiry form.
-- ============================================================

create table if not exists public.project_leads (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  message     text,
  source      text default 'tour_page',  -- 'tour_page' | 'qr_code' | 'embed'
  created_at  timestamptz not null default now()
);

comment on table public.project_leads is
  'Inquiries submitted via the public tour page lead capture form. '
  'Requires lead_capture_enabled entitlement.';

-- ============================================================
-- 10. PROJECT ANALYTICS DAILY
-- Lightweight daily aggregation. No raw event log stored here.
-- ============================================================

create table if not exists public.project_analytics_daily (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  date            date not null,
  views           integer not null default 0,
  unique_visitors integer not null default 0,
  lead_count      integer not null default 0,
  qr_scans        integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (project_id, date)
);

comment on table public.project_analytics_daily is
  'Daily rollup per project. Upserted by the analytics tracking hook.';

-- ============================================================
-- 11. PHOTO SHOOT CREDITS
-- Monthly credits allocated from plan entitlements.
-- Resets each billing cycle (non-rollover).
-- ============================================================

create table if not exists public.photo_shoot_credits (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  subscription_id       uuid references public.subscriptions (id) on delete set null,
  billing_period_start  date not null,
  billing_period_end    date not null,
  shoots_included       integer not null default 0,
  shoots_used           integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (shoots_used <= shoots_included)
);

comment on table public.photo_shoot_credits is
  'Photography shoot credits for the org''s current billing period. '
  'One row per billing period. shoots_used incremented on booking confirmation.';

-- ============================================================
-- 12. PHOTO SHOOT BOOKINGS
-- ============================================================

create table if not exists public.photo_shoot_bookings (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations (id) on delete cascade,
  project_id            uuid references public.projects (id) on delete set null,
  requested_by_user_id  uuid references auth.users (id) on delete set null,
  status                booking_status not null default 'requested',
  scheduled_for         timestamptz,
  location              text,
  notes                 text,
  package_name          text,   -- 'Standard' | 'Premium' | 'Portfolio'
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.photo_shoot_bookings is
  'Photography shoot bookings made via the dashboard. '
  'status transitions: requested → confirmed → completed (or cancelled). '
  'On confirmed, shoots_used on photo_shoot_credits is incremented.';

-- ============================================================
-- 13. AUDIT LOGS
-- Record of sensitive actions for compliance and debugging.
-- ============================================================

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete set null,
  user_id         uuid references auth.users (id) on delete set null,
  action          text not null,         -- e.g. 'project.publish', 'member.invite'
  target_type     text,                  -- 'project' | 'membership' | 'subscription'
  target_id       uuid,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only log of significant events. Never delete rows.';

-- ============================================================
-- 14. INDEXES
-- ============================================================

-- organizations
create index if not exists idx_orgs_owner on public.organizations (owner_user_id);
create index if not exists idx_orgs_slug on public.organizations (slug);

-- memberships
create index if not exists idx_memberships_org on public.memberships (organization_id);
create index if not exists idx_memberships_user on public.memberships (user_id);

-- subscriptions
create index if not exists idx_subs_org on public.subscriptions (organization_id);
create index if not exists idx_subs_status on public.subscriptions (organization_id, status);

-- projects
create index if not exists idx_projects_org on public.projects (organization_id);
create index if not exists idx_projects_slug on public.projects (slug) where slug is not null;
create index if not exists idx_projects_visibility on public.projects (visibility) where visibility = 'public';

-- cloudpano_mappings
create index if not exists idx_cp_mappings_org on public.cloudpano_mappings (organization_id);
create index if not exists idx_cp_mappings_project on public.cloudpano_mappings (project_id);

-- leads
create index if not exists idx_leads_project on public.project_leads (project_id);
create index if not exists idx_leads_created on public.project_leads (project_id, created_at desc);

-- analytics
create index if not exists idx_analytics_project_date on public.project_analytics_daily (project_id, date desc);

-- spaces → projects link
create index if not exists idx_spaces_project_id on public.spaces (project_id) where project_id is not null;

-- audit
create index if not exists idx_audit_org on public.audit_logs (organization_id, created_at desc);

-- ============================================================
-- 15. ROW LEVEL SECURITY
-- ============================================================

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.cloudpano_mappings enable row level security;
alter table public.project_leads enable row level security;
alter table public.project_analytics_daily enable row level security;
alter table public.photo_shoot_credits enable row level security;
alter table public.photo_shoot_bookings enable row level security;
alter table public.audit_logs enable row level security;

-- ── Helper function: is caller a member of org? ───────────────────────────
create or replace function public.is_org_member(org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.memberships
    where organization_id = org_id
      and user_id = auth.uid()
      and status = 'active'
  )
$$;

-- ── Helper function: caller's role in org ─────────────────────────────────
create or replace function public.org_role(org_id uuid)
returns text language sql security definer stable as $$
  select role::text from public.memberships
  where organization_id = org_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1
$$;

-- ── organizations ─────────────────────────────────────────────────────────
create policy "org: members can select" on public.organizations
  for select using (public.is_org_member(id));

create policy "org: owner can update" on public.organizations
  for update using (owner_user_id = auth.uid());

-- ── memberships ───────────────────────────────────────────────────────────
create policy "member: user can see own org memberships" on public.memberships
  for select using (public.is_org_member(organization_id));

create policy "member: owner/admin can insert" on public.memberships
  for insert with check (
    public.org_role(organization_id) in ('owner', 'admin')
  );

create policy "member: owner/admin can update" on public.memberships
  for update using (
    public.org_role(organization_id) in ('owner', 'admin')
  );

-- ── plans (public read) ────────────────────────────────────────────────────
create policy "plan: anyone can read public plans" on public.plans
  for select using (is_public = true);

create policy "plan_ent: anyone can read" on public.plan_entitlements
  for select using (true);

-- ── subscriptions ─────────────────────────────────────────────────────────
create policy "sub: members can select" on public.subscriptions
  for select using (public.is_org_member(organization_id));

-- ── projects ──────────────────────────────────────────────────────────────
create policy "project: members can select" on public.projects
  for select using (public.is_org_member(organization_id));

create policy "project: public can select published" on public.projects
  for select using (visibility = 'public' and status = 'active');

create policy "project: owner/admin/editor can insert" on public.projects
  for insert with check (
    public.org_role(organization_id) in ('owner', 'admin', 'editor')
  );

create policy "project: owner/admin/editor can update" on public.projects
  for update using (
    public.org_role(organization_id) in ('owner', 'admin', 'editor')
  );

create policy "project: owner/admin can delete" on public.projects
  for delete using (
    public.org_role(organization_id) in ('owner', 'admin')
  );

-- ── cloudpano_mappings ────────────────────────────────────────────────────
create policy "cp: members can select" on public.cloudpano_mappings
  for select using (public.is_org_member(organization_id));

create policy "cp: owner/admin can write" on public.cloudpano_mappings
  for all using (public.org_role(organization_id) in ('owner', 'admin'));

-- ── leads (public insert for tour page, member read) ─────────────────────
create policy "lead: anyone can insert" on public.project_leads
  for insert with check (true);

create policy "lead: members can select" on public.project_leads
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_leads.project_id
        and public.is_org_member(p.organization_id)
    )
  );

-- ── analytics ─────────────────────────────────────────────────────────────
create policy "analytics: members can select" on public.project_analytics_daily
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_analytics_daily.project_id
        and public.is_org_member(p.organization_id)
    )
  );

-- ── photo credits/bookings ────────────────────────────────────────────────
create policy "credits: members can select" on public.photo_shoot_credits
  for select using (public.is_org_member(organization_id));

create policy "bookings: members can select" on public.photo_shoot_bookings
  for select using (public.is_org_member(organization_id));

create policy "bookings: members can insert" on public.photo_shoot_bookings
  for insert with check (public.is_org_member(organization_id));

-- ── audit logs ────────────────────────────────────────────────────────────
create policy "audit: members can select" on public.audit_logs
  for select using (
    organization_id is null or public.is_org_member(organization_id)
  );

-- ============================================================
-- 16. SEEDS — Plans + Free tier entitlements
-- Idempotent: uses ON CONFLICT DO UPDATE
-- ============================================================

insert into public.plans (code, name, monthly_price, yearly_price, currency, is_public)
values
  ('free',   'Free',    0,      0,      'KES', true),
  ('basic',  'Basic',   1500,   15000,  'KES', true),
  ('plus',   'Plus',    4000,   40000,  'KES', true),
  ('pro',    'Pro',     8500,   85000,  'KES', true),
  ('elite',  'Elite',   18000,  180000, 'KES', true)
on conflict (code) do update set
  name          = excluded.name,
  monthly_price = excluded.monthly_price,
  yearly_price  = excluded.yearly_price,
  currency      = excluded.currency,
  is_public     = excluded.is_public;

-- Insert plan entitlements (one row per plan)
insert into public.plan_entitlements (
  plan_id,
  max_members, max_projects, max_published_tours, max_storage_gb,
  branding_required, custom_logo_enabled, custom_domain_enabled,
  white_label_level, analytics_level,
  lead_capture_enabled, street_view_publish_enabled,
  included_photo_shoots_per_month, priority_support_enabled
)
select
  p.id,
  e.max_members, e.max_projects, e.max_published_tours, e.max_storage_gb,
  e.branding_required, e.custom_logo_enabled, e.custom_domain_enabled,
  e.white_label_level, e.analytics_level,
  e.lead_capture_enabled, e.street_view_publish_enabled,
  e.included_photo_shoots_per_month, e.priority_support_enabled
from public.plans p
join (values
  ('free',   1,   3,   1,   1,    true,  false, false, 'none',    'basic',    false, false, 0, false),
  ('basic',  1,   10,  3,   5,    true,  false, false, 'none',    'basic',    false, false, 0, false),
  ('plus',   3,   30,  10,  20,   true,  true,  false, 'partial', 'basic',    true,  false, 1, false),
  ('pro',    10,  100, 50,  100,  false, true,  true,  'full',    'advanced', true,  true,  2, true),
  ('elite',  -1,  -1,  -1,  500,  false, true,  true,  'full',    'advanced', true,  true,  5, true)
) as e(
  code,
  max_members, max_projects, max_published_tours, max_storage_gb,
  branding_required, custom_logo_enabled, custom_domain_enabled,
  white_label_level, analytics_level,
  lead_capture_enabled, street_view_publish_enabled,
  included_photo_shoots_per_month, priority_support_enabled
) on p.code = e.code
on conflict (plan_id) do update set
  max_members                     = excluded.max_members,
  max_projects                    = excluded.max_projects,
  max_published_tours             = excluded.max_published_tours,
  max_storage_gb                  = excluded.max_storage_gb,
  branding_required               = excluded.branding_required,
  custom_logo_enabled             = excluded.custom_logo_enabled,
  custom_domain_enabled           = excluded.custom_domain_enabled,
  white_label_level               = excluded.white_label_level,
  analytics_level                 = excluded.analytics_level,
  lead_capture_enabled            = excluded.lead_capture_enabled,
  street_view_publish_enabled     = excluded.street_view_publish_enabled,
  included_photo_shoots_per_month = excluded.included_photo_shoots_per_month,
  priority_support_enabled        = excluded.priority_support_enabled;

-- ============================================================
-- DONE ✓
--
-- New tables   : organizations, memberships, plans, plan_entitlements,
--                subscriptions, projects, cloudpano_mappings,
--                project_leads, project_analytics_daily,
--                photo_shoot_credits, photo_shoot_bookings, audit_logs
-- Modified     : profiles (added email, updated_at),
--                spaces (added project_id FK)
-- Enums        : member_role, membership_status, subscription_status,
--                billing_cycle, project_status, project_visibility,
--                cloudpano_sync_status, booking_status, org_status
-- RLS          : Enabled on all new tables with policy functions
-- Seeds        : 5 plans + entitlements (free/basic/plus/pro/elite)
--
-- NEXT: Run 007 in Supabase Dashboard → SQL Editor
-- ============================================================
