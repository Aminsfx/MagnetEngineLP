import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createStore, isSupabaseConfigured } from './store';
import type { AppConfig, Conversation, Lead, Message } from './types';

const lead = (id: string, over: Partial<Lead> = {}): Lead => ({
  id,
  campaignId: 'c1',
  handle: id,
  name: id,
  followers: 0,
  isPrivate: false,
  status: 'cold',
  dmSent: false,
  replied: false,
  ...over,
});

describe('local adapter', () => {
  beforeEach(() => localStorage.clear());

  // Without a signed-in Operator (or Supabase env vars) this is the adapter.
  const store = () => createStore(null);

  it('persists a single changed Lead without dropping the others', async () => {
    // The regression this exists for: the old fallback only had a whole-set
    // write, so approving one Lead persisted nothing — approve, reject, edit-DM
    // and add-leads were all lost on refresh while delete survived.
    const s = store();
    await s.saveLeads([lead('a'), lead('b'), lead('c')]);

    await s.saveLeads([lead('b', { approved: true, dmContent: 'hi' })]);

    const saved = await s.loadLeads();
    expect(saved).toHaveLength(3);
    expect(saved.find((l) => l.id === 'b')).toMatchObject({ approved: true, dmContent: 'hi' });
    expect(saved.find((l) => l.id === 'a')).toBeDefined();
  });

  it('removes only the ids given', async () => {
    const s = store();
    await s.saveLeads([lead('a'), lead('b'), lead('c')]);

    await s.removeLeads(['a', 'c']);

    expect((await s.loadLeads()).map((l) => l.id)).toEqual(['b']);
  });

  it('treats empty writes as no-ops', async () => {
    const s = store();
    await s.saveLeads([lead('a')]);

    await s.saveLeads([]);
    await s.removeLeads([]);

    expect(await s.loadLeads()).toHaveLength(1);
  });

  it('round-trips config', async () => {
    const s = store();
    const config = { systemPrompt: 'p', minFollowers: 10 } as AppConfig;

    await s.saveConfig(config);

    expect(await s.loadConfig()).toMatchObject({ systemPrompt: 'p', minFollowers: 10 });
  });

  it('round-trips the inbox and merges by id', async () => {
    const s = store();
    const convo: Conversation = {
      id: 't1', handle: 'a', unread: false, status: 'open', needsReply: false,
    };
    const msg: Message = {
      id: 'm1', conversationId: 't1', direction: 'in', text: 'hey', createdAt: '2026-01-01',
    };

    await s.saveConversations([convo]);
    await s.saveMessages([msg]);
    await s.saveConversations([{ ...convo, unread: true }]);

    const { conversations, messages } = await s.loadInbox();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].unread).toBe(true);
    expect(messages).toEqual([msg]);
  });

  it('starts empty rather than throwing on corrupt storage', async () => {
    localStorage.setItem('magnetengine_conversations', 'not json');
    const { conversations } = await store().loadInbox();
    expect(conversations).toEqual([]);
  });
});

describe('createStore', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('falls back to local with no Operator', () => {
    expect(createStore(null).kind).toBe('local');
    expect(createStore(undefined).kind).toBe('local');
  });

  it('falls back to local when Supabase is not configured, even with an Operator', () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(isSupabaseConfigured()).toBe(false);
    expect(createStore('user-1').kind).toBe('local');
  });

  it('uses Supabase when both are present', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    expect(isSupabaseConfigured()).toBe(true);
    expect(createStore('user-1').kind).toBe('supabase');
  });

  it('does not treat the placeholder URL as configured', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://placeholder.supabase.co');
    expect(createStore('user-1').kind).toBe('local');
  });
});
