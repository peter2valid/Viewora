-- ============================================================
-- VIEWORA — Migration 013
-- Adds lead status field and usage counter RPC functions.
-- ============================================================

-- ── 1. Add status to leads ────────────────────────────────────────────────
alter table public.leads
  add column if not exists status text not null default 'new'
  check (status in ('new', 'contacted', 'qualified', 'closed'));

create index if not exists leads_status_idx on public.leads (status);

-- ── 2. Usage counter RPC functions ───────────────────────────────────────
-- Called by property create/publish/delete routes to keep
-- usage_counters.active_properties_count accurate.

create or replace function public.increment_property_count(p_user_id uuid)
returns void as $$
begin
  insert into public.usage_counters (user_id, active_properties_count)
  values (p_user_id, 1)
  on conflict (user_id) do update
    set active_properties_count = usage_counters.active_properties_count + 1,
        updated_at = now();
end;
$$ language plpgsql security definer;

create or replace function public.decrement_property_count(p_user_id uuid)
returns void as $$
begin
  update public.usage_counters
  set active_properties_count = greatest(0, active_properties_count - 1),
      updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;
