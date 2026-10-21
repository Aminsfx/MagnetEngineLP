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

  it('does not retry on any other error', async () => {
    upsert.mockResolvedValueOnce({ error: { code: '42501', message: 'row-level security' } });

    await db.upsertMessages([message('m1', 't1')], 'user-a');

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });

  it('writes in batches of 200', async () => {
    const rows = Array.from({ length: 450 }, (_, i) => conversation(`t${i}`));

    await db.upsertConversations(rows, 'user-a');

    expect(upsert.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 50]);
  });
});
