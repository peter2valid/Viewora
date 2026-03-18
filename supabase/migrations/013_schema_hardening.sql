-- Migration 013: Schema hardening and naming standardization
-- 1. Extend sub_status enum
alter type public.sub_status add value if not exists 'grace_period';
alter type public.sub_status add value if not exists 'expired';
alter type public.sub_status add value if not exists 'trial';
alter type public.sub_status add value if not exists 'pending_payment';

-- 2. Ensure usage_counters has default values
alter table public.usage_counters alter column active_properties_count set default 0;
alter table public.usage_counters alter column storage_used_bytes set default 0;

-- 3. Add index for slug lookup if missing
create index if not exists idx_properties_slug on public.properties(slug);

-- 4. Verify/Fix RLS for leads - Requirement says "Property owners can view leads"
drop policy if exists "Property owners can view leads" on public.leads;
create policy "Property owners can view leads" on public.leads
  for select using (exists (
    select 1 from public.properties 
    where id = leads.property_id and user_id = auth.uid()
  ));

-- 5. Atomic Counter Functions
create or replace function public.increment_active_properties(u_id uuid)
returns void as $$
begin
  update public.usage_counters 
  set active_properties_count = active_properties_count + 1,
      updated_at = now()
  where user_id = u_id;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_active_properties(u_id uuid)
returns void as $$
begin
  update public.usage_counters 
  set active_properties_count = greatest(0, active_properties_count - 1),
      updated_at = now()
  where user_id = u_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_storage_usage(u_id uuid, bytes bigint)
returns void as $$
begin
  update public.usage_counters 
  set storage_used_bytes = storage_used_bytes + bytes,
      updated_at = now()
  where user_id = u_id;
end;
$$ language plpgsql security definer;
