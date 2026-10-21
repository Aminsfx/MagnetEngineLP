-- Conversations and Messages are keyed by Instagram's own ids (thread_id,
-- item_id), and those are global: two Operators connected to the same
-- Instagram account — or one person with two MagnetEngine logins — read the
-- same threads under the same ids. With `id` alone as the primary key, the
-- first Operator to save a thread owned that id for good. Every later upsert
-- from anyone else hit ON CONFLICT on a row RLS hides from them, Postgres
-- refused it ("new row violates row-level security policy (USING
-- expression)"), and the whole 200-row batch went with it. The Inbox then
-- reloaded empty after every sign-out, refresh or closed tab (2026-10-20: 309
-- refused conversation upserts for one account, and the other account's new
-- Messages stopped saving once a copy of one sat under the first).
--
-- Both keys are now scoped to the Operator, and a Message points at its
-- Conversation within the same Operator's rows. src/lib/db.ts upserts on
-- (user_id, id) to match.
--
-- No row is changed or deleted. The new foreign key is NOT VALID because
-- Messages saved under the old key can sit inside another Operator's
-- Conversation; they become valid again as soon as their own Operator's next
-- sync saves that Conversation under their id. New rows are checked as usual.

alter table messages drop constraint if exists messages_conversation_id_fkey;
alter table messages drop constraint if exists messages_pkey;
alter table conversations drop constraint if exists conversations_pkey;

alter table conversations add constraint conversations_pkey primary key (user_id, id);
alter table messages add constraint messages_pkey primary key (user_id, id);

alter table messages add constraint messages_conversation_fkey
  foreign key (user_id, conversation_id) references conversations (user_id, id)
  on delete cascade
  not valid;

drop index if exists messages_conv_idx;
create index if not exists messages_conv_idx on messages (user_id, conversation_id, created_at);
