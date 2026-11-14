import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Conversation, Message } from './types';

type UpsertError = { code?: string; message: string } | null;
const upsert = vi.fn<(rows: unknown[], opts: { onConflict: string }) => Promise<{ error: UpsertError }>>();
const from = vi.fn((_table: string) => ({ upsert }));

vi.mock('./supabase', () => ({ supabase: { from: (table: string) => from(table) } }));

const { db } = await import('./db');

const conversation = (id: string): Conversation => ({
  id,
  handle: `handle_${id}`,
  unread: false,
  status: 'open',
  needsReply: false,
});

const message = (id: string, conversationId: string): Message => ({
  id,
  conversationId,
  direction: 'out',
  text: 'hi',
  createdAt: '2026-10-20T10:00:00.000Z',
});

describe('inbox upserts', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    upsert.mockReset().mockResolvedValue({ error: null });
    from.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // The regression: Instagram's thread and item ids are global, so a second
  // Operator connected to the same Instagram account upserted ids the first
  // already owned. Keyed on `id`, RLS refused the update and the whole batch
  // with it — the second Operator's Inbox reloaded empty after every sign-in.
  it('keys Conversations by Operator and thread, not by thread alone', async () => {
    await db.upsertConversations([conversation('t1'), conversation('t2')], 'user-b');

    expect(from).toHaveBeenCalledWith('conversations');
    const [rows, opts] = upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'user_id,id' });
    expect(rows).toEqual([
      expect.objectContaining({ id: 't1', user_id: 'user-b' }),
      expect.objectContaining({ id: 't2', user_id: 'user-b' }),
    ]);
  });

  it('keys Messages by Operator and item', async () => {
    await db.upsertMessages([message('m1', 't1')], 'user-b');

    expect(from).toHaveBeenCalledWith('messages');
    const [rows, opts] = upsert.mock.calls[0];
    expect(opts).toEqual({ onConflict: 'user_id,id' });
    expect(rows).toEqual([expect.objectContaining({ id: 'm1', conversation_id: 't1', user_id: 'user-b' })]);
  });

  it('falls back to the old key while migration 0004 is not applied', async () => {
    // 42P10: no unique constraint matches the ON CONFLICT target. Without the
    // fallback, shipping the client before the migration would fail every write.
    upsert
      .mockResolvedValueOnce({ error: { code: '42P10', message: 'no unique constraint' } })
      .mockResolvedValueOnce({ error: null });

    await db.upsertConversations([conversation('t1')], 'user-a');

    expect(upsert.mock.calls.map(([, opts]) => opts.onConflict)).toEqual(['user_id,id', 'id']);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('does not retry on any other error, and says the write failed', async () => {
    upsert.mockResolvedValueOnce({ error: { code: '42501', message: 'row-level security' } });

    await expect(db.upsertMessages([message('m1', 't1')], 'user-a')).rejects.toThrow(/row-level security/);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });

  it('still writes the other batches when one fails, then says so', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => conversation(`t${i}`));
    upsert.mockResolvedValueOnce({ error: { code: '57014', message: 'statement timeout' } });

    await expect(db.upsertConversations(rows, 'user-a')).rejects.toThrow(/statement timeout/);

    expect(upsert.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 50]);
  });

  it('writes in batches of 200', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => conversation(`t${i}`));

    await db.upsertConversations(rows, 'user-a');

    expect(upsert.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 50]);
  });
});

describe('reading a whole workspace', () => {
  /**
   * A table that, like the API, answers at most `cap` rows a request and
   * reports the full count.
   */
  function tableOf(rows: unknown[], cap: number) {
    const ranges: Array<[number, number]> = [];
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      range: (start: number, end: number) => {
        ranges.push([start, end]);
        return Promise.resolve({ data: rows.slice(start, Math.min(end + 1, start + cap)), error: null, count: rows.length });
      },
    };
    from.mockImplementation(() => chain as never);
    return ranges;
  }

  const leadRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ data: { id: `l${i}`, handle: `h${i}` }, created_at: '2026-11-01T00:00:00Z' }));

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    from.mockImplementation(() => ({ upsert }));
  });

  // The regression: one request, and the API's 1,000-row ceiling. A workspace
  // with 1,919 Leads loaded 1,000 of them and nothing said so.
  it('loads every Lead of a workspace past the API ceiling', async () => {
    const ranges = tableOf(leadRows(2500), 1000);

    const leads = await db.getLeads('user-a');

    expect(leads).toHaveLength(2500);
    expect(new Set(leads.map((l) => l.id)).size).toBe(2500);
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('still loads them all when the ceiling is lower than a page', async () => {
    tableOf(leadRows(900), 400);

    expect(await db.getLeads('user-a')).toHaveLength(900);
  });

  it('asks once for a workspace that fits in one page', async () => {
    const ranges = tableOf(leadRows(300), 1000);

    expect(await db.getLeads('user-a')).toHaveLength(300);
    expect(ranges).toHaveLength(1);
  });

  it('reads the whole inbox the same way', async () => {
    tableOf(Array.from({ length: 1200 }, (_, i) => ({ id: `m${i}`, conversation_id: 't1', direction: 'in', text: 'hi', created_at: '2026-11-01T00:00:00Z' })), 1000);

    expect(await db.getMessages('user-a')).toHaveLength(1200);
  });
});

describe('a read that fails', () => {
  /** A table whose every read answers with an error, as a dropped connection or an expired session does. */
  function failingTable(message: string) {
    const answer = Promise.resolve({ data: null, error: { message }, count: null });
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      range: () => answer,
      maybeSingle: () => answer,
    };
    from.mockImplementation(() => chain as never);
  }

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    from.mockImplementation(() => ({ upsert }));
  });

  // The regression: every read answered an error with "nothing there". A
  // config that failed to load came back as null, the dashboard opened on the
  // defaults, and the first setting the Operator touched saved those defaults
  // over their real prompt, Offer Ledger and connected Instagram account.
  it('is not read as an Operator with no saved config', async () => {
    failingTable('JWT expired');

    await expect(db.getConfig('user-a')).rejects.toThrow(/JWT expired/);
  });

  it('still reads a new Operator, who has no config row, as null', async () => {
    const chain = { select: () => chain, eq: () => chain, maybeSingle: () => Promise.resolve({ data: null, error: null }) };
    from.mockImplementation(() => chain as never);

    expect(await db.getConfig('user-a')).toBeNull();
  });

  // Leads read as [] opened an empty pipeline, and a search run from it
  // passed over nobody as already known: the same people were bought and
  // added a second time.
  it('is not read as an empty pipeline', async () => {
    failingTable('Failed to fetch');

    await expect(db.getLeads('user-a')).rejects.toThrow(/Failed to fetch/);
  });

  // An inbox read as empty made every thread in the next snapshot a new
  // Conversation, saved over the stored one: its Qualified or Booked mark,
  // its labels and the AI's read of it were gone.
  it('is not read as an empty inbox', async () => {
    failingTable('Failed to fetch');

    await expect(db.getConversations('user-a')).rejects.toThrow(/Failed to fetch/);
    await expect(db.getMessages('user-a')).rejects.toThrow(/Failed to fetch/);
  });
});

// The regression: every write answered an error with a console line and
// resolved as if it had saved. An approval, an edited DM, a setting or a
// skip stayed on screen, so nothing told the Operator it was gone until they
// reloaded and the queue was back the way it was.
describe('a write that fails', () => {
  const lead = (id: string) => ({ id, campaignId: 'c1', handle: id, name: id, isPrivate: false, status: 'cold', dmSent: false, replied: false }) as never;

  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://abc.supabase.co');
    upsert.mockReset().mockResolvedValue({ error: null });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    from.mockImplementation(() => ({ upsert }));
  });

  it('rejects a Lead save, after trying every batch', async () => {
    upsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });

    const leads = Array.from({ length: 450 }, (_, i) => lead(`l${i}`));
    await expect(db.upsertLeads(leads, 'user-a')).rejects.toThrow(/upsertLeads: Failed to fetch/);
    expect(upsert).toHaveBeenCalledTimes(3);
  });

  it('rejects a config save', async () => {
    upsert.mockResolvedValueOnce({ error: { message: 'JWT expired' } });

    await expect(db.setConfig({} as never, 'user-a')).rejects.toThrow(/setConfig: JWT expired/);
  });

  it('rejects a delete', async () => {
    const chain = { delete: () => chain, in: () => Promise.resolve({ error: { message: 'Failed to fetch' } }) };
    from.mockImplementation(() => chain as never);

    await expect(db.deleteLeads(['l1'])).rejects.toThrow(/deleteLeads: Failed to fetch/);
  });

  it('resolves when everything saved', async () => {
    await expect(db.upsertLeads([lead('l1')], 'user-a')).resolves.toBeUndefined();
    await expect(db.setConfig({} as never, 'user-a')).resolves.toBeUndefined();
  });
});
