-- Usage accounting.
--
-- Before this, every quota in the product was a localStorage key: the monthly
-- DM-generation allowance (which spends the Owner's AI credits) reset with a
-- devtools click, and the admin console read a `dm_usage` table that nothing
-- had ever written, so its "DMs this month" figure was always 0.
--
-- Run once in the Supabase SQL editor.

-- ─── DM generation: metered server-side ──────────────────────────────────────
-- Written ONLY by the generate-dm Edge Function using the service-role key.
-- There is deliberately no insert/update policy: an Operator can read their own
-- usage but cannot change it, because this quota is what the Owner pays for.
create table if not exists dm_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  month      text not null,                       -- 'YYYY-MM'
  used       integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table dm_usage enable row level security;

drop policy if exists "Operators read own dm usage" on dm_usage;
create policy "Operators read own dm usage" on dm_usage
  for select using (auth.uid() = user_id);

-- Atomic increment, so two concurrent generations can't lose a count.
-- SECURITY DEFINER + a revoked public grant: only the service role may call it.
create or replace function increment_dm_usage(p_user_id uuid, p_month text, p_count integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_used integer;
begin
  insert into dm_usage (user_id, month, used, updated_at)
  values (p_user_id, p_month, p_count, now())
  on conflict (user_id, month)
  do update set used = dm_usage.used + excluded.used, updated_at = now()
  returning used into new_used;

  return new_used;
end;
$$;

revoke all on function increment_dm_usage(uuid, text, integer) from public, anon, authenticated;

-- ─── Lead and campaign quotas: advisory, Operator-owned ──────────────────────
-- These bound the Operator's own workspace rather than the Owner's spend, and
-- the client writes Leads to Postgres directly, so there is no server-side
-- chokepoint to meter them at. They live here so the count survives a browser
-- reset and follows the Operator between devices — NOT as a security control.
create table if not exists usage_counters (
  user_id    uuid not null references auth.users(id) on delete cascade,
  month      text not null,                       -- 'YYYY-MM'
  kind       text not null check (kind in ('leads', 'campaigns')),
  count      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month, kind)
);

alter table usage_counters enable row level security;

drop policy if exists "Operators manage own counters" on usage_counters;
create policy "Operators manage own counters" on usage_counters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function increment_usage_counter(p_month text, p_kind text, p_count integer)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into usage_counters (user_id, month, kind, count, updated_at)
  values (auth.uid(), p_month, p_kind, p_count, now())
  on conflict (user_id, month, kind)
  do update set count = usage_counters.count + excluded.count, updated_at = now()
  returning count into new_count;

  return new_count;
end;
$$;
