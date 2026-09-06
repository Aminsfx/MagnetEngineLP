/**
 * db.ts — Cloud persistence layer for MagnetEngine
 *
 * Replaces localStorage with Supabase Postgres.
 * This is the Supabase ADAPTER, not the seam. Which adapter a caller gets is
 * decided once in store.ts (createStore); db.ts used to answer that question
 * again with its own env-var check and quietly mirror writes to localStorage,
 * which is how the two paths drifted apart. The isSupabaseReady() guards below
 * are now only a safety net for an unconfigured client, never a second path.
 * (env vars missing) so the app never breaks in dev without credentials.
 *
 * SQL to run once in your Supabase SQL editor:
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * -- Leads table
 * create table if not exists leads (
 *   id            text primary key,
 *   user_id       uuid not null references auth.users(id) on delete cascade,
 *   data          jsonb not null,
 *   created_at    timestamptz default now()
 * );
 * alter table leads enable row level security;
 * create policy "Users see own leads" on leads
 *   for all using (auth.uid() = user_id);
 *
 * -- Config table
 * create table if not exists configs (
 *   user_id       uuid primary key references auth.users(id) on delete cascade,
 *   data          jsonb not null,
 *   updated_at    timestamptz default now()
 * );
 * alter table configs enable row level security;
 * create policy "Users see own config" on configs
 *   for all using (auth.uid() = user_id);
 *
 * -- Follow-up sequences table
 * create table if not exists follow_up_sequences (
 *   id            uuid primary key default gen_random_uuid(),
 *   user_id       uuid not null references auth.users(id) on delete cascade,
 *   campaign_id   text,
 *   steps         jsonb not null default '[]',
 *   active        boolean not null default true,
 *   created_at    timestamptz default now()
 * );
 * alter table follow_up_sequences enable row level security;
 * create policy "Users see own sequences" on follow_up_sequences
 *   for all using (auth.uid() = user_id);
 *
 * -- Conversations (AI SDR inbox) — one row per Instagram DM thread
 * create table if not exists conversations (
 *   id                text primary key,           -- IG thread_id
 *   user_id           uuid not null references auth.users(id) on delete cascade,
 *   handle            text not null,
 *   name              text,
 *   avatar_url        text,
 *   account           text,                       -- which IG account owns the thread
 *   last_message_at   timestamptz,
 *   last_message_text text,
 *   unread            boolean not null default false,
 *   status            text not null default 'open',
 *   intent            text,
 *   labels            text[],                      -- freeform lead labels
 *   needs_reply       boolean not null default false,
 *   updated_at        timestamptz default now()
 * );
 * alter table conversations enable row level security;
 * create policy "own conversations" on conversations
 *   for all using (auth.uid() = user_id);
 *
 * -- Messages (AI SDR inbox) — individual DMs within a conversation
 * create table if not exists messages (
 *   id              text primary key,             -- IG item_id (uuid for drafts)
 *   conversation_id text not null references conversations(id) on delete cascade,
 *   user_id         uuid not null references auth.users(id) on delete cascade,
 *   direction       text not null,                -- 'in' | 'out'
 *   text            text not null,
 *   ai_draft        boolean not null default false,
 *   created_at      timestamptz not null
 * );
 * alter table messages enable row level security;
 * create policy "own messages" on messages
 *   for all using (auth.uid() = user_id);
 * create index if not exists messages_conv_idx on messages (conversation_id, created_at);
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';
import type { AppConfig, Lead, FollowUpSequence, Conversation, Message } from './types';
import type { PlanTier, Subscription } from './plans';

/** 'YYYY-MM' — the bucket every monthly counter is keyed by. */
function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Safety net for an unconfigured client. NOT a second code path: which adapter
 * a caller gets is decided once by createStore in store.ts.
 */
function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return Boolean(url && url !== 'https://placeholder.supabase.co');
}

export const db = {
  // ─── Leads ────────────────────────────────────────────────────────────────

  async getLeads(userId: string): Promise<Lead[]> {
    if (!isSupabaseReady()) return [];

    const { data, error } = await supabase
      .from('leads')
      .select('data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[db] getLeads error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => row.data as Lead);
  },


  async upsertLeads(leads: Lead[], userId: string): Promise<void> {
    if (!isSupabaseReady() || leads.length === 0) return;

    const rows = leads.map((l) => ({ id: l.id, user_id: userId, data: l }));

    // Supabase upsert in batches of 200 to avoid request size limits
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error } = await supabase
        .from('leads')
        .upsert(batch, { onConflict: 'id' });
      if (error) console.error('[db] upsertLeads batch error:', error.message);
    }
  },


  async deleteLeads(ids: string[]): Promise<void> {
    if (!isSupabaseReady()) return;
    if (ids.length === 0) return;

    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids);

    if (error) console.error('[db] deleteLeads error:', error.message);
  },

  // ─── Config ───────────────────────────────────────────────────────────────

  async getConfig(userId: string): Promise<AppConfig | null> {
    if (!isSupabaseReady()) return null;

    const { data, error } = await supabase
      .from('configs')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[db] getConfig error:', error.message);
      return null;
    }

    return data ? (data.data as AppConfig) : null;
  },

  async setConfig(config: AppConfig, userId: string): Promise<void> {
    if (!isSupabaseReady()) return;

    const { error } = await supabase
      .from('configs')
      .upsert({ user_id: userId, data: config, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) console.error('[db] setConfig error:', error.message);
  },

  // ─── Follow-up Sequences ──────────────────────────────────────────────────

  async getSequences(userId: string): Promise<FollowUpSequence[]> {
    if (!isSupabaseReady()) return [];

    const { data, error } = await supabase
      .from('follow_up_sequences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[db] getSequences error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      campaignId: row.campaign_id ?? undefined,
      steps: row.steps,
      active: row.active,
    }));
  },

  async upsertSequence(seq: FollowUpSequence, userId: string): Promise<FollowUpSequence | null> {
    if (!isSupabaseReady()) return seq;

    const payload = {
      user_id: userId,
      campaign_id: seq.campaignId ?? null,
      steps: seq.steps,
      active: seq.active,
      ...(seq.id && seq.id !== 'new' ? { id: seq.id } : {}),
    };

    const { data, error } = await supabase
      .from('follow_up_sequences')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.error('[db] upsertSequence error:', error.message);
      return null;
    }

    return {
      id: data.id,
      campaignId: data.campaign_id ?? undefined,
      steps: data.steps,
      active: data.active,
    };
  },

  async deleteSequence(id: string): Promise<void> {
    if (!isSupabaseReady()) return;

    const { error } = await supabase
      .from('follow_up_sequences')
      .delete()
      .eq('id', id);

    if (error) console.error('[db] deleteSequence error:', error.message);
  },

  // ─── Conversations + Messages (AI SDR inbox) ──────────────────────────────

  async getConversations(userId: string): Promise<Conversation[]> {
    if (!isSupabaseReady()) return [];

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('[db] getConversations error:', error.message);
      return [];
    }

    return (data ?? []).map((r) => ({
      id: r.id,
      handle: r.handle,
      name: r.name ?? undefined,
      avatarUrl: r.avatar_url ?? undefined,
      account: r.account ?? undefined,
      lastMessageAt: r.last_message_at ?? undefined,
      lastMessageText: r.last_message_text ?? undefined,
      unread: Boolean(r.unread),
      status: (r.status as Conversation['status']) ?? 'open',
      intent: (r.intent as Conversation['intent']) ?? undefined,
      labels: Array.isArray(r.labels) ? r.labels : undefined,
      needsReply: Boolean(r.needs_reply),
    }));
  },

  async upsertConversations(rows: Conversation[], userId: string): Promise<void> {
    if (rows.length === 0 || !isSupabaseReady()) return;

    const payload = rows.map((c) => ({
      id: c.id,
      user_id: userId,
      handle: c.handle,
      name: c.name ?? null,
      avatar_url: c.avatarUrl ?? null,
      account: c.account ?? null,
      last_message_at: c.lastMessageAt ?? null,
      last_message_text: c.lastMessageText ?? null,
      unread: c.unread,
      status: c.status,
      intent: c.intent ?? null,
      labels: c.labels ?? null,
      needs_reply: c.needsReply,
      updated_at: new Date().toISOString(),
    }));

    for (let i = 0; i < payload.length; i += 200) {
      const batch = payload.slice(i, i + 200);
      const { error } = await supabase
        .from('conversations')
        .upsert(batch, { onConflict: 'id' });
      if (error) console.error('[db] upsertConversations error:', error.message);
    }
  },

  async getMessages(userId: string, conversationId?: string): Promise<Message[]> {
    if (!isSupabaseReady()) return [];

    let q = supabase
      .from('messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (conversationId) q = q.eq('conversation_id', conversationId);

    const { data, error } = await q;
    if (error) {
      console.error('[db] getMessages error:', error.message);
      return [];
    }

    return (data ?? []).map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      direction: r.direction as Message['direction'],
      text: r.text,
      aiDraft: Boolean(r.ai_draft),
      createdAt: r.created_at,
    }));
  },

  async upsertMessages(rows: Message[], userId: string): Promise<void> {
    if (rows.length === 0 || !isSupabaseReady()) return;

    const payload = rows.map((m) => ({
      id: m.id,
      conversation_id: m.conversationId,
      user_id: userId,
      direction: m.direction,
      text: m.text,
      ai_draft: m.aiDraft ?? false,
      created_at: m.createdAt,
    }));

    for (let i = 0; i < payload.length; i += 200) {
      const batch = payload.slice(i, i + 200);
      const { error } = await supabase
        .from('messages')
        .upsert(batch, { onConflict: 'id' });
      if (error) console.error('[db] upsertMessages error:', error.message);
    }
  },

  // ─── Subscriptions ────────────────────────────────────────────────────────

  /**
   * Fetch the user's subscription (tier + activation status).
   *
   * Access model: the OWNER activates accounts manually after confirming
   * payment, by upserting a row in the `subscriptions` table:
   *
   *   create table if not exists subscriptions (
   *     user_id    uuid primary key references auth.users(id) on delete cascade,
   *     plan       text not null default 'starter' check (plan in ('starter','pro','agency')),
   *     status     text not null default 'pending' check (status in ('pending','active','cancelled')),
   *     updated_at timestamptz default now()
   *   );
   *   alter table subscriptions enable row level security;
   *   create policy "Users read own subscription" on subscriptions
   *     for select using (auth.uid() = user_id);
   *   -- NOTE: no insert/update policy on purpose — only the owner (via the
   *   -- Supabase dashboard / service role) can activate accounts.
   *
   * No row → 'pending' (signed up, not yet paid/activated).
   * Supabase not configured (local dev) → active starter so the app still runs.
   */
  async getSubscription(userId: string): Promise<Subscription> {
    if (!isSupabaseReady()) return { tier: 'starter', status: 'active' };

    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[db] getSubscription error:', error.message);
      // Fail closed: unknown state = not activated (prevents free access when
      // the table is missing or the query is blocked)
      return { tier: 'starter', status: 'pending' };
    }

    if (!data) return { tier: 'starter', status: 'pending' };

    return {
      tier: (data.plan as PlanTier) ?? 'starter',
      status: (data.status as Subscription['status']) ?? 'active',
    };
  },

  // ─── Usage accounting ───────────────────────────────────────────────────
  //
  // These used to be localStorage keys wearing async signatures inside a module
  // documented as "cloud persistence", so the paid DM allowance reset with a
  // devtools click and the admin console's "DMs this month" always read 0.
  //
  // DM usage is now metered by the generate-dm Edge Function against the
  // dm_usage table (service-role writes only — an Operator can read their count
  // but not change it). The client only reads it. Lead and campaign counters
  // are Operator-owned and advisory: the client writes Leads to Postgres
  // directly, so there is no server chokepoint to meter them at.
  //
  // Schema: supabase/migrations/0001_usage.sql

  /** First of next month, when every monthly counter rolls over. */
  monthlyResetAt(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  },

  async getDMUsage(userId: string): Promise<{ used: number; resetAt: Date }> {
    const resetAt = this.monthlyResetAt();
    if (!isSupabaseReady()) return { used: 0, resetAt };

    const { data, error } = await supabase
      .from('dm_usage')
      .select('used')
      .eq('user_id', userId)
      .eq('month', monthKey())
      .maybeSingle();

    if (error) {
      console.error('[db] getDMUsage error:', error.message);
      // Fail open on read: the server enforces the limit regardless, so a
      // failed read must not lock the Operator out of their own dashboard.
      return { used: 0, resetAt };
    }
    return { used: data?.used ?? 0, resetAt };
  },

  async getMonthlyCount(kind: 'leads' | 'campaigns'): Promise<number> {
    if (!isSupabaseReady()) return 0;

    const { data, error } = await supabase
      .from('usage_counters')
      .select('count')
      .eq('month', monthKey())
      .eq('kind', kind)
      .maybeSingle();

    if (error) {
      console.error(`[db] getMonthlyCount(${kind}) error:`, error.message);
      return 0;
    }
    return data?.count ?? 0;
  },

  async incrementMonthlyCount(kind: 'leads' | 'campaigns', by: number): Promise<number> {
    if (!isSupabaseReady() || by <= 0) return 0;

    const { data, error } = await supabase.rpc('increment_usage_counter', {
      p_month: monthKey(),
      p_kind: kind,
      p_count: by,
    });

    if (error) {
      console.error(`[db] incrementMonthlyCount(${kind}) error:`, error.message);
      return 0;
    }
    return (data as number) ?? 0;
  },
};
