/**
 * db.ts — Cloud persistence layer for MagnetEngine
 *
 * Replaces localStorage with Supabase Postgres.
 * Falls back gracefully to the old storage.ts when Supabase is not configured
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
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase';
import { storage } from './storage'; // legacy localStorage fallback
import type { AppConfig, Lead, FollowUpSequence } from './types';
import type { PlanTier } from './plans';

/** True when Supabase env vars are present and client is usable */
function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return Boolean(url && url !== 'https://placeholder.supabase.co');
}

export const db = {
  // ─── Leads ────────────────────────────────────────────────────────────────

  async getLeads(userId: string): Promise<Lead[]> {
    if (!isSupabaseReady()) return storage.getLeads();

    const { data, error } = await supabase
      .from('leads')
      .select('data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[db] getLeads error:', error.message);
      return storage.getLeads(); // fallback
    }

    return (data ?? []).map((row) => row.data as Lead);
  },

  async upsertLead(lead: Lead, userId: string): Promise<void> {
    if (!isSupabaseReady()) {
      // Handled by bulk setLeads in localStorage path
      return;
    }

    const { error } = await supabase
      .from('leads')
      .upsert({ id: lead.id, user_id: userId, data: lead }, { onConflict: 'id' });

    if (error) console.error('[db] upsertLead error:', error.message);
  },

  async upsertLeads(leads: Lead[], userId: string): Promise<void> {
    if (!isSupabaseReady()) {
      storage.setLeads(leads);
      return;
    }

    if (leads.length === 0) return;

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

  async deleteLead(id: string): Promise<void> {
    if (!isSupabaseReady()) return;

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) console.error('[db] deleteLead error:', error.message);
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
    if (!isSupabaseReady()) return storage.getConfig();

    const { data, error } = await supabase
      .from('configs')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[db] getConfig error:', error.message);
      return storage.getConfig();
    }

    return data ? (data.data as AppConfig) : null;
  },

  async setConfig(config: AppConfig, userId: string): Promise<void> {
    if (!isSupabaseReady()) {
      storage.setConfig(config);
      return;
    }

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

  // ─── Subscriptions ────────────────────────────────────────────────────────

  async getSubscription(userId: string): Promise<PlanTier> {
    if (!isSupabaseReady()) return 'starter';

    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[db] getSubscription error:', error.message);
      return 'starter';
    }

    return (data?.plan as PlanTier) ?? 'starter';
  },

  // ─── DM Generation Usage (localStorage-first, always reliable) ──────────

  getDMUsageLocal(userId: string): { used: number; resetAt: Date } {
    const monthKey = new Date().toISOString().slice(0, 7); // "YYYY-MM"
    const key = `dm_used_${userId}_${monthKey}`;
    const used = parseInt(localStorage.getItem(key) ?? '0', 10);
    const resetAt = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    return { used, resetAt };
  },

  async getDMUsage(userId: string): Promise<{ used: number; resetAt: Date }> {
    return this.getDMUsageLocal(userId);
  },

  async incrementDMUsage(userId: string, count: number): Promise<number> {
    const monthKey = new Date().toISOString().slice(0, 7);
    const key = `dm_used_${userId}_${monthKey}`;
    const current = parseInt(localStorage.getItem(key) ?? '0', 10);
    const newCount = current + count;
    localStorage.setItem(key, String(newCount));
    return newCount;
  },
};
