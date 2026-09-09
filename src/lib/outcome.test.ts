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
      sent: true,
      sentAt: '2026-09-01T09:00:00.000Z',
      replied: true,
      repliedAt: '2026-09-03T11:00:00.000Z',
      booked: false,
    });
  });

  it('reads no reply from an unanswered thread', () => {
    const out = readOutcome(conversation(), [
      message({ direction: 'out', createdAt: '2026-09-01T09:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ sent: true, replied: false, repliedAt: undefined });
  });

  it('reads Sent from an outbound Message, dated by the first one', () => {
    // The outbound Messages on a thread come from Instagram's own inbox API,
    // read back by the extension (extension/content.js tags direction by
    // comparing the sender to the viewer). Seeing one is Instagram confirming
    // the DM exists, not the product trusting its own bookkeeping.
    const out = readOutcome(conversation(), [
      message({ direction: 'out', createdAt: '2026-09-05T09:00:00.000Z' }),
      message({ direction: 'out', createdAt: '2026-09-01T09:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ sent: true, sentAt: '2026-09-01T09:00:00.000Z' });
  });

  it('is not Sent from the app\'s own optimistic Message', () => {
    // DashboardShell appends a `local_*` outbound Message as soon as the
    // extension ACCEPTS a handoff. Accepting is not sending — CONTEXT.md:
    // "Never inferred from handing work to the extension". Only the item
    // Instagram reports back counts, and Ingestion swaps the local one for it.
    const out = readOutcome(conversation(), [
      message({ id: 'local_t1_1757000000000', direction: 'out', createdAt: '2026-09-01T09:00:00.000Z' }),
      message({ direction: 'in', createdAt: '2026-09-03T11:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ sent: false, sentAt: undefined, replied: false });
  });

  it('is not Sent when the thread holds nothing outbound', () => {
    const out = readOutcome(conversation(), [
      message({ direction: 'in', createdAt: '2026-09-03T11:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ sent: false, sentAt: undefined });
  });

  it('does not read a reply from an inbound that arrived before we ever wrote', () => {
    // A prospect who DMs the Operator cold is an inbound lead, not a reply to
    // outreach. Counting it would inflate reply rate with conversations the
    // product never started.
    const out = readOutcome(conversation(), [
      message({ direction: 'in', createdAt: '2026-09-01T08:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ sent: false, replied: false, repliedAt: undefined });
  });

  it('dates the reply from the first inbound AFTER our DM, not an earlier one', () => {
    const out = readOutcome(conversation(), [
      message({ direction: 'in', createdAt: '2026-08-20T08:00:00.000Z' }),
      message({ direction: 'out', createdAt: '2026-09-01T09:00:00.000Z' }),
      message({ direction: 'in', createdAt: '2026-09-03T11:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ replied: true, repliedAt: '2026-09-03T11:00:00.000Z' });
  });

  it('ignores Messages belonging to another Conversation', () => {
    const out = readOutcome(conversation(), [
      message({ conversationId: 't2', direction: 'in', createdAt: '2026-09-03T11:00:00.000Z' }),
    ]);

    expect(out).toMatchObject({ sent: false, replied: false });
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
  handle: 'founder_one', sent: false, replied: false, booked: false, ...over,
});

describe('applyOutcome', () => {
  it('stamps a reply onto a Lead that had not replied', () => {
    const next = applyOutcome(
      lead(),
      outcome({ sent: true, replied: true, repliedAt: '2026-09-03T11:00:00.000Z' }),
    );

    expect(next).toMatchObject({
      replied: true,
      replyDate: '2026-09-03T11:00:00.000Z',
      status: 'cold',
    });
  });

  it('stamps Sent from an outbound Message Instagram reported back', () => {
    const next = applyOutcome(
      lead({ dmSent: false }),
      outcome({ sent: true, sentAt: '2026-09-01T09:00:00.000Z' }),
    );

    expect(next).toMatchObject({ dmSent: true, dmDate: '2026-09-01T09:00:00.000Z' });
  });

  it('keeps the send date the Lead already had', () => {
    const early = lead({ dmSent: false, dmDate: '2026-08-30T07:00:00.000Z' });

    expect(applyOutcome(early, outcome({ sent: true, sentAt: '2026-09-01T09:00:00.000Z' })))
      .toMatchObject({ dmSent: true, dmDate: '2026-08-30T07:00:00.000Z' });
  });

  it('never lets a reply outrun the send it answered', () => {
    // The whole point of reading Sent off the thread: replyRate is
    // replied/dmsSent, so a Lead that can be replied must also be Sent or the
    // dashboard prints a rate above 100%.
    const next = applyOutcome(
      lead({ dmSent: false }),
      outcome({ sent: true, replied: true, repliedAt: '2026-09-03T11:00:00.000Z' }),
    );

    expect(next).toMatchObject({ dmSent: true, replied: true });
  });

  it('returns null when the Lead already reflects the Outcome', () => {
    const already = lead({ replied: true, replyDate: '2026-09-03T11:00:00.000Z' });

    expect(applyOutcome(already, outcome({ sent: true, replied: true, repliedAt: '2026-09-03T11:00:00.000Z' }))).toBeNull();
    expect(applyOutcome(already, outcome())).toBeNull();
  });

  it('keeps the reply date the Lead already had', () => {
    const early = lead({ replied: true, replyDate: '2026-09-01T08:00:00.000Z' });

    // Booking is the change here; the older reply date must survive it.
    expect(applyOutcome(early, outcome({ sent: true, replied: true, repliedAt: '2026-09-09T09:00:00.000Z', booked: true })))
      .toMatchObject({ replyDate: '2026-09-01T08:00:00.000Z' });
  });

  it('carries a booking through the whole funnel, Sent included', () => {
    // You cannot book someone you never messaged. The booked branch already
    // implied every earlier stage; Sent is now one of them.
    expect(applyOutcome(lead({ dmSent: false }), outcome({ replied: true, repliedAt: '2026-09-03T11:00:00.000Z', booked: true })))
      .toMatchObject({ dmSent: true, booked: true, positiveReply: true, replied: true, status: 'won' });
  });

  it('never walks a flag backwards', () => {
    // The Operator marked this by hand in the Approval Queue; a quiet thread
    // is not evidence it did not happen.
    const won = lead({ replied: true, positiveReply: true, booked: true, status: 'won' });

    expect(applyOutcome(won, outcome())).toBeNull();
  });
});
