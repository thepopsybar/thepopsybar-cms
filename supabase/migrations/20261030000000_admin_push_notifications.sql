-- =====================================================================
-- The Popsy Bar: custom Web Push (VAPID, no third-party service) + Realtime for the CRM
-- Safe to run more than once. It only CREATES things; it never drops tables or data.
-- Requires: supabase/schema.sql (public.admins, public.is_admin()) and the CRM migration
-- 20261029000000_create_crm_inquiries.sql.
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Devices that receive notifications (one row per admin browser/phone)
-- ---------------------------------------------------------------------
create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 20 and 2048 and endpoint like 'https://%'),
  p256dh_key text not null check (char_length(p256dh_key) between 80 and 100),
  auth_key text not null check (char_length(auth_key) between 20 and 30),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  expired_at timestamptz
);
create index if not exists admin_push_subscriptions_user_idx on public.admin_push_subscriptions (user_id) where is_active;

alter table public.admin_push_subscriptions enable row level security;
revoke all on public.admin_push_subscriptions from anon, public;
-- Signed-in admins may only READ and DELETE their own rows. There is deliberately no insert/update
-- policy: registration goes through register_admin_push_subscription() below.
grant select, delete on public.admin_push_subscriptions to authenticated;

drop policy if exists "admins read own push devices" on public.admin_push_subscriptions;
create policy "admins read own push devices" on public.admin_push_subscriptions
  for select to authenticated using (user_id = auth.uid() and public.is_admin());

drop policy if exists "admins delete own push devices" on public.admin_push_subscriptions;
create policy "admins delete own push devices" on public.admin_push_subscriptions
  for delete to authenticated using (user_id = auth.uid() and public.is_admin());

-- ---------------------------------------------------------------------
-- 2) Registration: the owner is ALWAYS auth.uid() of the caller, never a client-supplied id.
-- ---------------------------------------------------------------------
create or replace function public.register_admin_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into public.admin_push_subscriptions (user_id, endpoint, p256dh_key, auth_key, is_active)
  values (v_uid, p_endpoint, p_p256dh, p_auth, true)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh_key = excluded.p256dh_key,
        auth_key = excluded.auth_key,
        is_active = true,
        expired_at = null,
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.register_admin_push_subscription(text, text, text) from public, anon;
grant execute on function public.register_admin_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 3) Outbox: one row per (inquiry, device). The unique key is what makes a retried
--    inquiry unable to notify the same device twice. Holds no customer data at all.
-- ---------------------------------------------------------------------
create table if not exists public.admin_push_outbox (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.crm_inquiries (id) on delete cascade,
  subscription_id uuid not null references public.admin_push_subscriptions (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'expired', 'dead')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_status_code integer,
  last_error text check (last_error is null or char_length(last_error) <= 200),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (inquiry_id, subscription_id)
);
create index if not exists admin_push_outbox_due_idx on public.admin_push_outbox (next_attempt_at) where status in ('pending', 'failed');

-- RLS on with NO policies: only the server's service-role key can touch the outbox.
alter table public.admin_push_outbox enable row level security;
revoke all on public.admin_push_outbox from anon, authenticated, public;

-- Atomic "take these rows" step so two workers can never send the same row.
create or replace function public.claim_push_outbox(p_ids uuid[], p_now timestamptz)
returns table (id uuid, inquiry_id uuid, attempts integer, subscription_id uuid, endpoint text, p256dh_key text, auth_key text)
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.admin_push_outbox o
       set status = 'sending', attempts = o.attempts + 1, locked_at = p_now
     where o.id = any (p_ids)
       and o.attempts < 5
       and ((o.status in ('pending', 'failed') and o.next_attempt_at <= p_now)
            or (o.status = 'sending' and o.locked_at < p_now - interval '5 minutes'))
       and exists (select 1 from public.admin_push_subscriptions s where s.id = o.subscription_id and s.is_active)
    returning o.id, o.inquiry_id, o.attempts, o.subscription_id
  )
  select c.id, c.inquiry_id, c.attempts, c.subscription_id, s.endpoint, s.p256dh_key, s.auth_key
    from claimed c
    join public.admin_push_subscriptions s on s.id = c.subscription_id;
$$;

revoke all on function public.claim_push_outbox(uuid[], timestamptz) from public, anon, authenticated;
grant execute on function public.claim_push_outbox(uuid[], timestamptz) to service_role;

-- ---------------------------------------------------------------------
-- 4) Realtime: lets the OPEN dashboard hear about new rows. Row Level Security still decides who
--    receives them (only signed-in admins can read crm_inquiries). This does not wake a closed browser.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'crm_inquiries'
     ) then
    alter publication supabase_realtime add table public.crm_inquiries;
  end if;
end
$$;
