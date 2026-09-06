import { describe, it, expect } from 'vitest';
import { createInboxLog, ingestThreads, type RawThread } from './inbox';
import type { Conversation, Message } from './types';

const thread = (id: string, messages: RawThread['messages']): RawThread => ({
  threadId: id,
  handle: `founder_${id}`,
  messages,
});

const inbound = (id: string, text: string, at = '2026-01-01T10:00:00Z') =>
  ({ id, direction: 'in' as const, text, createdAt: at });

const outbound = (id: string, text: string, at = '2026-01-01T11:00:00Z') =>
  ({ id, direction: 'out' as const, text, createdAt: at });

describe('ingestThreads', () => {
  it('adds new messages and derives the conversation from the last one', () => {
    const r = ingestThreads([thread('t1', [inbound('m1', 'hey'), outbound('m2', 'hi')])], [], []);

    expect(r.newMessages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(r.conversations[0]).toMatchObject({
      id: 't1',
      lastMessageText: 'hi',
      unread: false,
      needsReply: false,
      status: 'open',
    });
  });

  it('flags a conversation as needing a reply when the last message is inbound', () => {
    const r = ingestThreads([thread('t1', [
      outbound('m1', 'hi', '2026-01-01T10:00:00Z'),
      inbound('m2', 'tell me more', '2026-01-01T12:00:00Z'),
    ])], [], []);

    expect(r.conversations[0]).toMatchObject({ needsReply: true, unread: true });
    expect(r.newInbound.map((c) => c.id)).toEqual(['t1']);
  });

  it('is idempotent — re-syncing the same snapshot adds nothing', () => {
    const t = [thread('t1', [inbound('m1', 'hey')])];
    const first = ingestThreads(t, [], []);
    const second = ingestThreads(t, first.conversations, first.messages);

    expect(second.newMessages).toEqual([]);
    expect(second.messages).toHaveLength(1);
  });

  it('preserves AI-set intent, status and labels the poller cannot know', () => {
    const existing: Conversation = {
      id: 't1', handle: 'a', unread: false, status: 'booked',
      intent: 'interested', labels: ['hot'], needsReply: false,
    };
    const r = ingestThreads([thread('t1', [inbound('m1', 'hey')])], [existing], []);

    expect(r.conversations[0]).toMatchObject({
      status: 'booked', intent: 'interested', labels: ['hot'],
    });
  });

  it('orders messages by time regardless of arrival order', () => {
    const r = ingestThreads([thread('t1', [
      inbound('m2', 'second', '2026-01-02T00:00:00Z'),
      inbound('m1', 'first', '2026-01-01T00:00:00Z'),
    ])], [], []);

    expect(r.conversations[0].lastMessageText).toBe('second');
  });
});

describe('echo suppression', () => {
  it('drops one echo per optimistic send', () => {
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [] });

    const mine: Message = {
      id: 'local_1', conversationId: 't1', direction: 'out',
      text: 'ok', createdAt: '2026-01-01T09:00:00Z',
    };
    log.recordOutbound(mine);

    // Instagram echoes it back under its own id.
    const r = log.sync([thread('t1', [outbound('ig_1', 'ok')])]);

    expect(r?.messages.filter((m) => m.text === 'ok')).toHaveLength(1);
    expect(r?.messages[0].id).toBe('local_1');
  });

  it('keeps a genuinely repeated message once the echo is consumed', () => {
    // The old code kept a signature set built from ALL previous outbound
    // messages, so sending "ok" and later saying "ok" again swallowed the
    // second one forever.
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [] });
    log.recordOutbound({
      id: 'local_1', conversationId: 't1', direction: 'out',
      text: 'ok', createdAt: '2026-01-01T09:00:00Z',
    });

    log.sync([thread('t1', [outbound('ig_1', 'ok', '2026-01-01T09:01:00Z')])]);
    const r = log.sync([thread('t1', [
      outbound('ig_1', 'ok', '2026-01-01T09:01:00Z'),
      outbound('ig_2', 'ok', '2026-01-01T12:00:00Z'),
    ])]);

    expect(r?.newMessages.map((m) => m.id)).toEqual(['ig_2']);
  });
});

describe('hydration ordering', () => {
  it('parks a snapshot that arrives before history is loaded', () => {
    const log = createInboxLog();

    expect(log.hydrated).toBe(false);
    expect(log.sync([thread('t1', [inbound('m1', 'hey')])])).toBeNull();
    expect(log.snapshot().messages).toEqual([]);
  });

  it('replays the parked snapshot on hydrate, against the full history', () => {
    const log = createInboxLog();
    log.sync([thread('t1', [inbound('m1', 'hey'), inbound('m2', 'still there?')])]);

    const known: Message = {
      id: 'm1', conversationId: 't1', direction: 'in',
      text: 'hey', createdAt: '2026-01-01T10:00:00Z',
    };
    const replayed = log.hydrate({ conversations: [], messages: [known] });

    // m1 was already stored; only m2 is new. Merging before hydrate would have
    // duplicated it.
    expect(replayed?.newMessages.map((m) => m.id)).toEqual(['m2']);
    expect(replayed?.messages).toHaveLength(2);
  });

  it('keeps only the newest parked snapshot', () => {
    const log = createInboxLog();
    log.sync([thread('t1', [inbound('m1', 'first')])]);
    log.sync([thread('t1', [inbound('m2', 'second')])]);

    const replayed = log.hydrate({ conversations: [], messages: [] });

    expect(replayed?.newMessages.map((m) => m.id)).toEqual(['m2']);
  });

  it('returns null from hydrate when nothing was parked', () => {
    expect(createInboxLog().hydrate({ conversations: [], messages: [] })).toBeNull();
  });

  it('reset puts it back to un-hydrated', () => {
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [] });
    log.sync([thread('t1', [inbound('m1', 'hey')])]);

    log.reset();

    expect(log.hydrated).toBe(false);
    expect(log.snapshot()).toEqual({ conversations: [], messages: [] });
    expect(log.sync([thread('t1', [inbound('m2', 'x')])])).toBeNull();
  });

  it('reports nothing changed rather than a no-op result', () => {
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [] });
    const t = [thread('t1', [inbound('m1', 'hey')])];

    expect(log.sync(t)).not.toBeNull();
    expect(log.sync(t)).toBeNull();
    expect(log.sync([])).toBeNull();
  });
});
