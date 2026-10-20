-- The free trial's allowance: 500 leads found and 500 DMs written during the
-- 3-day trial, then the account pays in full (owner decision, 2026-10-20).
--
-- subscriptions.trial_ends_at is set by whop-webhook on a FIRST activation of
-- a trialing membership, so every account activated before this migration
-- keeps null and no allowance ("new users only"). whop_membership_id records
-- which Whop membership grants access, so that ending a trial early (the old
-- trialing membership is cancelled when the pay-now plan activates) does not
-- revoke the account the new membership just paid for.
--
-- trial_usage follows dm_usage / scrape_usage: written ONLY by the Edge
-- Functions with the service-role key; an Operator can read their own counts.
--
-- Additive only: nothing here touches existing rows' data.

alter table subscriptions add column if not exists trial_ends_at timestamptz;
alter table subscriptions add column if not exists whop_membership_id text;

create table if not exists trial_usage (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  leads      integer not null default 0,   -- profiles `scrape` returned during the trial
  dms        integer not null default 0,   -- DMs `generate-dm` wrote during the trial
  updated_at timestamptz not null default now()
);

alter table trial_usage enable row level security;

drop policy if exists "Operators read own trial usage" on trial_usage;
create policy "Operators read own trial usage" on trial_usage
  for select using (auth.uid() = user_id);

-- Atomic increment, so concurrent calls can't lose a count. Returns the new
-- totals. SECURITY DEFINER + a revoked public grant: service role only.
create or replace function increment_trial_usage(p_user_id uuid, p_leads integer, p_dms integer)
returns table (leads integer, dms integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  insert into trial_usage as t (user_id, leads, dms, updated_at)
  values (p_user_id, greatest(p_leads, 0), greatest(p_dms, 0), now())
  on conflict (user_id)
  do update set leads = t.leads + greatest(p_leads, 0),
                dms = t.dms + greatest(p_dms, 0),
                updated_at = now()
  returning t.leads, t.dms;
end;
$$;

revoke all on function increment_trial_usage(uuid, integer, integer) from public, anon, authenticated;
