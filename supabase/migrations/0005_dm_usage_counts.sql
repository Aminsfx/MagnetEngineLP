-- dm_usage never counted anything.
--
-- 0001_usage.sql creates dm_usage with an `updated_at` column, but in
-- production the table already existed without one, so `create table if not
-- exists` left it as it was. increment_dm_usage writes `updated_at`, so every
-- call failed on the missing column. generate-dm did not look at the error,
-- so no row was ever written: the dashboard's "written this month" read 0 on
-- every sign-in, the admin console's "DMs this month" read 0, and the monthly
-- allowance (which is the Owner's AI spend) was never enforced.
--
-- Run once in the Supabase SQL editor. Safe to run again.

alter table dm_usage add column if not exists updated_at timestamptz not null default now();

-- The older two-argument increment_dm_usage the first table came with. It is
-- SECURITY DEFINER and was executable by anyone, signed in or not, for any
-- user id, which is a way to spend someone else's allowance for them. Nothing
-- calls it: generate-dm passes three arguments.
drop function if exists increment_dm_usage(uuid, text);

-- Only the Edge Function's service role counts.
revoke all on function increment_dm_usage(uuid, text, integer) from public, anon, authenticated;
grant execute on function increment_dm_usage(uuid, text, integer) to service_role;

-- An Operator reads their own count and nothing else. RLS already has no write
-- policy; the table grants now say the same thing.
drop policy if exists "dm_usage_select" on dm_usage;
revoke insert, update, delete, truncate, references, trigger on dm_usage from anon, authenticated;
revoke select on dm_usage from anon;

-- This month's count, from the DMs that exist. Every DM generate-dm wrote is
-- on a Lead with the day it was written, so the months nothing was counted can
-- be made right for the one month that still matters.
insert into dm_usage (user_id, month, used, updated_at)
select l.user_id, to_char(now() at time zone 'utc', 'YYYY-MM'), count(*), now()
from leads l
where coalesce(l.data->>'dmContent', '') <> ''
  and left(l.data->>'dmDate', 7) = to_char(now() at time zone 'utc', 'YYYY-MM')
group by l.user_id
on conflict (user_id, month)
do update set used = greatest(dm_usage.used, excluded.used), updated_at = now();
