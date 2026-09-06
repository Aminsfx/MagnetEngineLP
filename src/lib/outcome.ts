import type { Conversation, Lead, Message } from './types';

/**
 * What a Conversation reveals about the Lead behind it.
 *
 * CONTEXT.md already says a Conversation is "one Instagram DM thread with a
 * Lead", but until this module the code only maintained that link at one point:
 * `markBooked`. So a prospect could reply in the Inbox, be answered by the AI,
 * and be classified as interested, while the Lead behind the handle still read
 * `replied: false` — leaving reply rate at 0% on a full inbox, flattening the
 * conversion chart, and never firing the `replied` webhook.
 */
export interface Outcome {
  handle: string;
  /** The prospect sent at least one inbound Message. A fact, not a judgement. */
  replied: boolean;
  /** When they first did. */
  repliedAt?: string;
  booked: boolean;
}

/** Read a Conversation and its Messages as an Outcome. Pure. */
export function readOutcome(conversation: Conversation, messages: Message[]): Outcome {
  const inbound = messages
    .filter((m) => m.conversationId === conversation.id && m.direction === 'in')
    .map((m) => m.createdAt)
    .sort((a, b) => a.localeCompare(b));

  return {
    handle: conversation.handle,
    replied: inbound.length > 0,
    repliedAt: inbound[0],
    // Interest alone is an AI judgement and does not move the funnel; booking
    // is a confirmed event, whether the Operator clicked it or the model read
    // it off a "yes, Tuesday works".
    booked: conversation.status === 'booked' || conversation.intent === 'booked',
  };
}

/**
 * Apply an Outcome to the Lead behind it, returning the updated Lead — or
 * `null` when nothing changed.
 *
 * The null return is load-bearing, not a convenience: Ingestion runs on every
 * poll of the extension's inbox, so the overwhelmingly common case is an
 * Outcome the Lead already reflects. Returning the Lead unchanged there would
 * persist a row, re-render the queue and re-fire webhooks every few seconds.
 *
 * Flags only ever move forwards. An Outcome is evidence that something
 * happened, never evidence that it didn't, so it cannot un-book a Lead or
 * retract a reply the Operator marked by hand.
 */
export function applyOutcome(lead: Lead, outcome: Outcome): Lead | null {
  const next: Lead = { ...lead };
  let changed = false;

  if (outcome.replied && !lead.replied) {
    next.replied = true;
    next.replyDate = lead.replyDate ?? outcome.repliedAt;
    changed = true;
  }

  // Deliberately does NOT touch `dmSent`. CONTEXT.md defines Sent as "the
  // extension has confirmed a DM actually reached Instagram", and that stays
  // the only way a Lead becomes Sent. The cost is that a Lead which replied
  // without a confirmed send counts in `replied` but not `dmsSent`, so
  // filters.ts's replyRate can read above 100% — see the note in CLAUDE.md.
  if (outcome.booked && !lead.booked) {
    // A booking implies everything before it in the funnel, which is what
    // `markBooked` did and what the rate calculations in filters.ts assume.
    next.booked = true;
    next.positiveReply = true;
    next.replied = true;
    next.status = 'won';
    changed = true;
  }

  return changed ? next : null;
}
