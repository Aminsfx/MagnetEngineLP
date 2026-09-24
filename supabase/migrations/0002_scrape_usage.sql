-- Lead-scrape metering.
--
-- Every Instagram lookup the `scrape` Edge Function makes is a billed HikerAPI
-- request, paid by the Owner. The scrape loop is driven by the browser — one
-- page per call — so without a server-side count a signed-in Operator could
-- spend the whole HikerAPI balance. Same shape and same rules as dm_usage in
-- 0001: written ONLY by the Edge Function with the service-role key; an
-- Operator can read their own count but never change it.
--
-- Run once in the Supabase SQL editor (or `supabase db push`).

create table if not exists scrape_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  month      text not null,                       -- 'YYYY-MM'
  requests   integer not null default 0,          -- billed upstream request units
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);

alter table scrape_usage enable row level security;

drop policy if exists "Operators read own scrape usage" on scrape_usage;
create policy "Operators read own scrape usage" on scrape_usage
  for select using (auth.uid() = user_id);

-- Atomic increment, so concurrent calls can't lose a count.
-- SECURITY DEFINER + a revoked public grant: only the service role may call it.
create or replace function increment_scrape_usage(p_user_id uuid, p_month text, p_count integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_requests integer;
begin
  insert into scrape_usage (user_id, month, requests, updated_at)
  values (p_user_id, p_month, p_count, now())
  on conflict (user_id, month)
  do update set requests = scrape_usage.requests + excluded.requests, updated_at = now()
  returning requests into new_requests;

  return new_requests;
end;
$$;

revoke all on function increment_scrape_usage(uuid, text, integer) from public, anon, authenticated;
