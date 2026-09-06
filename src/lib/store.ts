import type { AppConfig, Conversation, Lead, Message } from './types';
import { db } from './db';
import { storage } from './storage';

/**
 * Where an Operator's workspace lives.
 *
 * Before this there was no seam, only a conditional smeared across call sites.
 * `db.ts` decided "am I in fallback mode?" by checking an env var; every caller
 * decided it again by checking whether a user was signed in, and each one chose
 * for itself whether to also mirror to localStorage. Eight call sites in
 * DashboardShell, two in ApprovalQueue, three in SettingsPanel — and they
 * disagreed. `handleDeleteLead` mirrored; `handleApproveLead`,
 * `handleRejectLead`, `handleUpdateDM` and `handleAddLeads` did not. So in the
 * fallback path deleting a Lead survived a refresh and approving one did not.
 *
 * Now the choice is made once, when the store is constructed, and both adapters
 * satisfy the same interface — which is what makes the fallback trustworthy
 * rather than merely present.
 *
 * The methods take no userId: the adapter is built for one Operator and closes
 * over it.
 */
export interface WorkspaceStore {
  /** Which adapter this is — for diagnostics, never for branching. */
  readonly kind: 'supabase' | 'local';

  loadLeads(): Promise<Lead[]>;
  /** Insert or update. One Lead or many — same call. */
  saveLeads(leads: Lead[]): Promise<void>;
  removeLeads(ids: string[]): Promise<void>;

  loadConfig(): Promise<AppConfig | null>;
  saveConfig(config: AppConfig): Promise<void>;

  loadInbox(): Promise<{ conversations: Conversation[]; messages: Message[] }>;
  saveConversations(rows: Conversation[]): Promise<void>;
  saveMessages(rows: Message[]): Promise<void>;
}

// ─── Supabase adapter ────────────────────────────────────────────────────────

function supabaseStore(userId: string): WorkspaceStore {
  return {
    kind: 'supabase',

    loadLeads: () => db.getLeads(userId),
    saveLeads: (leads) => db.upsertLeads(leads, userId),
    removeLeads: (ids) => db.deleteLeads(ids),

    loadConfig: () => db.getConfig(userId),
    saveConfig: (config) => db.setConfig(config, userId),

    async loadInbox() {
      const [conversations, messages] = await Promise.all([
        db.getConversations(userId),
        db.getMessages(userId),
      ]);
      return { conversations, messages };
    },
    saveConversations: (rows) => db.upsertConversations(rows, userId),
    saveMessages: (rows) => db.upsertMessages(rows, userId),
  };
}

// ─── Local adapter ───────────────────────────────────────────────────────────

const LS_CONVOS = 'magnetengine_conversations';
const LS_MESSAGES = 'magnetengine_messages';

function readRows<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeRows<T>(key: string, rows: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* quota — ignore */
  }
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const byId = new Map(existing.map((r) => [r.id, r]));
  for (const r of incoming) byId.set(r.id, r);
  return [...byId.values()];
}

/**
 * Local development without Supabase configured. Read-modify-write, so a single
 * saved Lead persists the same way it does in Postgres — the old fallback only
 * had a whole-set write, which is why partial updates were silently dropped.
 */
function localStore(): WorkspaceStore {
  return {
    kind: 'local',

    async loadLeads() {
      return storage.getLeads();
    },
    async saveLeads(leads) {
      if (leads.length === 0) return;
      storage.setLeads(mergeById(storage.getLeads(), leads));
    },
    async removeLeads(ids) {
      if (ids.length === 0) return;
      const drop = new Set(ids);
      storage.setLeads(storage.getLeads().filter((l) => !drop.has(l.id)));
    },

    async loadConfig() {
      return storage.getConfig();
    },
    async saveConfig(config) {
      storage.setConfig(config);
    },

    async loadInbox() {
      return {
        conversations: readRows<Conversation>(LS_CONVOS),
        messages: readRows<Message>(LS_MESSAGES),
      };
    },
    async saveConversations(rows) {
      if (rows.length === 0) return;
      writeRows(LS_CONVOS, mergeById(readRows<Conversation>(LS_CONVOS), rows));
    },
    async saveMessages(rows) {
      if (rows.length === 0) return;
      writeRows(LS_MESSAGES, mergeById(readRows<Message>(LS_MESSAGES), rows));
    },
  };
}

// ─── The one decision point ──────────────────────────────────────────────────

/** True when Supabase env vars are present and the client is usable. */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  return Boolean(url && url !== 'https://placeholder.supabase.co');
}

/**
 * Pick the adapter. This is the ONLY place the question is asked — callers
 * receive a store and never learn which one they got.
 *
 * The local adapter is a development convenience (no Supabase env vars, or no
 * signed-in Operator). Deployed builds always take the Supabase path.
 */
export function createStore(userId: string | null | undefined): WorkspaceStore {
  return userId && isSupabaseConfigured() ? supabaseStore(userId) : localStore();
}
