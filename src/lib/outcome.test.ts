import { describe, it, expect } from 'vitest';
import { readOutcome, applyOutcome, type Outcome } from './outcome';
import type { Conversation, Lead, Message } from './types';

const conversation = (over: Partial<Conversation> = {}): Conversation => ({
  id: 't1', handle: 'founder_one', unread: false, status: 'open', needsReply: false, ...over,
});

const message = (over: Partial<Message> & Pick<Message, 'direction' | 'createdAt'>): Message => ({
  id: `m_${over.createdAt}_${over.direction}`, conversationId: 't1', text: 'hi', ...over,
});

describe('readOutcome', () => {
  it('reports a reply, dated by the prospect\'s FIRST inbound Message', () => {
    const out = readOutcome(conversation(), [
      message({ direction: 'out', createdAt: '2026-09-01T09:00:00.000Z' }),
      message({ direction: 'in', createdAt: '2026-09-03T11:00:00.000Z' }),
      message({ direction: 'in', createdAt: '2026-09-04T12:00:00.000Z' }),
    ]);

    expect(out).toEqual({
      handle: 'founder_one',
      replied: true,
      repliedAt: '2026-09-03T11:00:00.000Z',
      booked: false,
    });
  });

  it('reads no reply from an unanswered thread', () => {
    const out = readOutcome(conversation(), [
      message({ direction: 'out', createdAt: '2026-09-01T09:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ replied: false, repliedAt: undefined });
  });

  it('ignores Messages belonging to another Conversation', () => {
    const out = readOutcome(conversation(), [
      message({ conversationId: 't2', direction: 'in', createdAt: '2026-09-03T11:00:00.000Z' }),
    ]);

    expect(out.replied).toBe(false);
  });

  it.each([
    ['the Operator marked it booked', conversation({ status: 'booked' })],
    ['the AI classified the intent as booked', conversation({ intent: 'booked' })],
  ])('is booked when %s', (_, conv) => {
    expect(readOutcome(conv, []).booked).toBe(true);
  });

  it('is not booked on interest alone — that stays human-gated', () => {
    expect(readOutcome(conversation({ intent: 'interested' }), []).booked).toBe(false);
  });
});

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'l1', campaignId: 'c1', handle: 'founder_one', name: 'Founder One',
  followers: 1000, isPrivate: false, status: 'cold',
  dmSent: true, replied: false, ...over,
});

const outcome = (over: Partial<Outcome> = {}): Outcome => ({
  handle: 'founder_one', replied: false, booked: false, ...over,
});

describe('applyOutcome', () => {
  it('stamps a reply onto a Lead that had not replied', () => {
    const next = applyOutcome(
      lead(),
      outcome({ replied: true, repliedAt: '2026-09-03T11:00:00.000Z' }),
    );

    expect(next).toMatchObject({
      replied: true,
      replyDate: '2026-09-03T11:00:00.000Z',
      status: 'cold',
    });
  });

  it('returns null when the Lead already reflects the Outcome', () => {
    const already = lead({ replied: true, replyDate: '2026-09-03T11:00:00.000Z' });

    expect(applyOutcome(already, outcome({ replied: true, repliedAt: '2026-09-03T11:00:00.000Z' }))).toBeNull();
    expect(applyOutcome(already, outcome())).toBeNull();
  });

  it('keeps the reply date the Lead already had', () => {
    const early = lead({ replied: true, replyDate: '2026-09-01T08:00:00.000Z' });

    // Booking is the change here; the older reply date must survive it.
    expect(applyOutcome(early, outcome({ replied: true, repliedAt: '2026-09-09T09:00:00.000Z', booked: true })))
      .toMatchObject({ replyDate: '2026-09-01T08:00:00.000Z' });
  });

  it('carries a booking through the whole funnel', () => {
    expect(applyOutcome(lead(), outcome({ replied: true, repliedAt: '2026-09-03T11:00:00.000Z', booked: true })))
      .toMatchObject({ booked: true, positiveReply: true, replied: true, status: 'won' });
  });

  it('never walks a flag backwards', () => {
    // The Operator marked this by hand in the Approval Queue; a quiet thread
    // is not evidence it did not happen.
    const won = lead({ replied: true, positiveReply: true, booked: true, status: 'won' });

    expect(applyOutcome(won, outcome())).toBeNull();
  });

  it('leaves Sent alone — only the extension confirms a send', () => {
    // CONTEXT.md: a Lead is Sent only on extension confirmation. An Outcome
    // must not infer it, even though that leaves replyRate able to exceed 100%.
    const next = applyOutcome(
      lead({ dmSent: false }),
      outcome({ replied: true, repliedAt: '2026-09-03T11:00:00.000Z', booked: true }),
    );

    expect(next).toMatchObject({ dmSent: false, replied: true, booked: true });
    expect(next?.dmDate).toBeUndefined();
  });
});
