import { describe, it, expect } from 'vitest';
import { createInboxLog, ingestThreads, readerState, READER_STALE_MS, type RawThread } from './inbox';
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

// The regression: `unread` was recomputed from the last message on every
// poll. Opening a conversation marked it read, and the next poll, about 100 s
// later, lit it up again, and saved that over the Operator's open.
describe('unread', () => {
  const opened = (c: Conversation): Conversation => ({ ...c, unread: false });

  it('stays read once the Operator has opened it, poll after poll', () => {
    const t = [thread('t1', [outbound('m1', 'hi', '2026-01-01T10:00:00Z'), inbound('m2', 'tell me more', '2026-01-01T12:00:00Z')])];
    const first = ingestThreads(t, [], []);
    expect(first.conversations[0].unread).toBe(true);

    const second = ingestThreads(t, first.conversations.map(opened), first.messages);

    expect(second.conversations[0]).toMatchObject({ unread: false, needsReply: true });
    expect(second.changedConversations).toEqual([]);
  });

  it('is unread again when a new message comes in', () => {
    const t1 = [thread('t1', [inbound('m1', 'hey', '2026-01-01T10:00:00Z')])];
    const first = ingestThreads(t1, [], []);

    const t2 = [thread('t1', [inbound('m1', 'hey', '2026-01-01T10:00:00Z'), inbound('m2', 'you there?', '2026-01-01T12:00:00Z')])];
    const second = ingestThreads(t2, first.conversations.map(opened), first.messages);

    expect(second.conversations[0].unread).toBe(true);
  });

  it('is read once the Operator has answered, from here or from their phone', () => {
    const t1 = [thread('t1', [inbound('m1', 'hey', '2026-01-01T10:00:00Z')])];
    const first = ingestThreads(t1, [], []);

    const t2 = [thread('t1', [inbound('m1', 'hey', '2026-01-01T10:00:00Z'), outbound('m2', 'hey!', '2026-01-01T12:00:00Z')])];
    const second = ingestThreads(t2, first.conversations, first.messages);

    expect(second.conversations[0]).toMatchObject({ unread: false, needsReply: false });
  });
});

// The regression: Instagram hands out a freshly signed photo URL on every
// read, and `differs` compared the whole URL. About 25 Conversations a poll
// counted as changed, were saved again, and had their Outcomes read again,
// every ~100 s, for nothing.
describe('a profile photo', () => {
  const withPhoto = (url: string): RawThread => ({ ...thread('t1', [inbound('m1', 'hey')]), avatarUrl: url });
  const signed = (host: string, path: string, sig: string) => `https://${host}.cdninstagram.com${path}?stp=dst-jpg&_nc_ht=${host}&oh=${sig}&oe=6745A1B2`;

  it('signed again is not a change, though the fresh URL is the one kept', () => {
    const first = ingestThreads([withPhoto(signed('scontent-lhr8-1', '/v/t51.2885-19/1234_n.jpg', 'aaa'))], [], []);
    const fresh = signed('scontent-lhr6-2', '/v/t51.2885-19/1234_n.jpg', 'bbb');

    const second = ingestThreads([withPhoto(fresh)], first.conversations, first.messages);

    expect(second.changedConversations).toEqual([]);
    expect(second.conversations[0].avatarUrl).toBe(fresh);
  });

  it('a new photo is a change', () => {
    const first = ingestThreads([withPhoto(signed('scontent-lhr8-1', '/v/t51.2885-19/1234_n.jpg', 'aaa'))], [], []);

    const second = ingestThreads([withPhoto(signed('scontent-lhr8-1', '/v/t51.2885-19/5678_n.jpg', 'aaa'))], first.conversations, first.messages);

    expect(second.changedConversations).toHaveLength(1);
  });
});

describe('the move to Instagram\'s GraphQL inbox', () => {
  it('does not add a message twice when its id changed format', () => {
    const before = ingestThreads([thread('t1', [inbound('1739', 'hey there', '2026-07-30T10:00:00Z')])], [], []);
    const after = ingestThreads(
      [thread('t1', [
        inbound('mid.$abc', 'hey there', '2026-07-30T10:00:01Z'),
        inbound('mid.$def', 'still keen?', '2026-08-20T10:00:00Z'),
      ])],
      before.conversations,
      before.messages,
    );
    expect(after.newMessages.map((m) => m.text)).toEqual(['still keen?']);
  });
});

// The regression: a reply the app handed to the extension was written down
// under a local id, and when Instagram showed it, Instagram's copy was thrown
// away and the local one kept. So nothing in the Inbox could tell a reply
// Instagram has from one only handed over, and after a reload the echo came
// in again as a second copy, stored next to the first.
describe('a reply the app sent', () => {
  const mine = (id = 'local_1', text = 'ok', at = '2026-01-01T09:00:00Z'): Message => ({
    id, conversationId: 't1', direction: 'out', text, createdAt: at,
  });

  it("is replaced by Instagram's copy once Instagram shows it, and only once", () => {
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [] });
    log.recordOutbound(mine());

    const r = log.sync([thread('t1', [outbound('ig_1', 'ok', '2026-01-01T09:01:00Z')])]);

    expect(r?.messages.filter((m) => m.text === 'ok').map((m) => m.id)).toEqual(['ig_1']);
    expect(r?.newMessages.map((m) => m.id)).toEqual(['ig_1']);
    expect(r?.settled).toEqual(['local_1']);
  });

  it('keeps a genuinely repeated message once its copy has come back', () => {
    // The old code kept a signature set built from ALL previous outbound
    // messages, so sending "ok" and later saying "ok" again swallowed the
    // second one forever.
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [] });
    log.recordOutbound(mine());

    log.sync([thread('t1', [outbound('ig_1', 'ok', '2026-01-01T09:01:00Z')])]);
    const r = log.sync([thread('t1', [
      outbound('ig_1', 'ok', '2026-01-01T09:01:00Z'),
      outbound('ig_2', 'ok', '2026-01-01T12:00:00Z'),
    ])]);

    expect(r?.newMessages.map((m) => m.id)).toEqual(['ig_2']);
    expect(r?.settled).toEqual([]);
  });

  it("is replaced after a reload too, when Instagram's copy arrives later", () => {
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [mine()] });

    const r = log.sync([thread('t1', [outbound('ig_1', 'ok', '2026-01-01T09:30:00Z')])]);

    expect(r?.messages.map((m) => m.id)).toEqual(['ig_1']);
    expect(r?.settled).toEqual(['local_1']);
  });

  it('is not shown twice when both copies were already stored', () => {
    const log = createInboxLog();
    const stored: Message = { ...mine(), id: 'ig_1', createdAt: '2026-01-01T09:01:00Z' };

    const r = log.hydrate({ conversations: [], messages: [mine(), stored] });

    expect(log.snapshot().messages.map((m) => m.id)).toEqual(['ig_1']);
    expect(r?.settled).toEqual(['local_1']);
  });

  it("stays the app's own copy while Instagram doesn't have it", () => {
    const log = createInboxLog();
    log.hydrate({ conversations: [], messages: [] });
    log.recordOutbound(mine('local_1', 'see you Tuesday'));

    // An older message with the same words is not this reply.
    const r = log.sync([thread('t1', [outbound('ig_0', 'see you Tuesday', '2025-12-01T09:00:00Z')])]);

    expect(r?.messages.map((m) => m.id).sort()).toEqual(['ig_0', 'local_1']);
    expect(r?.settled).toEqual([]);
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

describe('readerState', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');

  it('claims nothing for an extension too old to say when it last read Instagram', () => {
    expect(readerState(undefined, now)).toEqual({ kind: 'unknown' });
  });

  it('is live while threads keep coming in, and stale once they stop', () => {
    expect(readerState(now - 2 * 60_000, now)).toEqual({ kind: 'live', at: now - 2 * 60_000 });
    expect(readerState(now - READER_STALE_MS, now).kind).toBe('live');
    // 2026-11-07: the extension went on re-sending a snapshot it had stopped reading 29 hours before.
    expect(readerState(now - 29 * 3_600_000, now)).toEqual({ kind: 'stale', at: now - 29 * 3_600_000 });
  });

  it('is stale, with no time, when nothing has ever been read', () => {
    expect(readerState(null, now)).toEqual({ kind: 'stale', at: null });
    expect(readerState(Number.NaN, now)).toEqual({ kind: 'stale', at: null });
  });
});
