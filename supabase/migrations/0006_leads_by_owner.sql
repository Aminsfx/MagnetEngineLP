-- Leads are always read by owner, newest first, and had no index for it.
--
-- The table's only index was its primary key (id). Every dashboard load asks
-- for one Operator's Leads ordered by created_at, so Postgres read every
-- workspace's Leads to answer it, and checked row-level security on each. That
-- is invisible at 4,500 rows and is the first thing to slow down as accounts
-- are added. The second column pair matches the paging order db.ts now uses
-- (created_at desc, id), so each page is an index range, not a sort.
--
-- Run once in the Supabase SQL editor. Safe to run again.

create index if not exists leads_owner_created_idx on leads (user_id, created_at desc, id);
