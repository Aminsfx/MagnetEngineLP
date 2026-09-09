import { confirmedByInstagram } from './inbox';
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
  /**
   * An outbound Message exists on the thread.
   *
   * This is Instagram's own record, not the product's bookkeeping: the
   * extension reads the inbox API and tags direction by comparing each item's
   * sender to the viewer (`extension/content.js`). So an outbound Message here
   * is the extension confirming a DM reached Instagram — the second of the two
   * confirmation paths CONTEXT.md allows for Sent, alongside the send receipt
   * the extension returns at send time.
   */
  sent: boolean;
  /** When the first outbound Message on the thread was sent. */
  sentAt?: string;
  /** The prospect answered our DM. A fact, not a judgement. */
  replied: boolean;
  /** When they first did. */
  repliedAt?: string;
  booked: boolean;
}

/** Read a Conversation and its Messages as an Outcome. Pure. */
export function readOutcome(conversation: Conversation, messages: Message[]): Outcome {
  const mine = messages.filter((m) => m.conversationId === conversation.id);
  const at = (direction: Message['direction'], where: (m: Message) => boolean = () => true) =>
    mine.filter((m) => m.direction === direction && where(m))
      .map((m) => m.createdAt).sort((a, b) => a.localeCompare(b));

  // Only an outbound Message Instagram reported back. The app also writes one
  // optimistically the moment the extension ACCEPTS a campaign — and accepting
  // is not sending. Counting those would make Sent mean "handed to the
  // extension", which is the one thing CONTEXT.md says it never means, and
  // Autopilot would be doing it unattended.
  const sentAt = at('out', confirmedByInstagram)[0];
  // A reply is an answer to outreach, so it has to come after outreach. A
  // prospect who DMs the Operator cold is an inbound lead, not a reply, and
  // counting it would inflate reply rate with threads the product never
  // started — and stamp `replied` on a Lead that was never Sent, which is
  // exactly the arithmetic that let replyRate print above 100%.
  const repliedAt = sentAt ? at('in').find((t) => t >= sentAt) : undefined;

  return {
    handle: conversation.handle,
    sent: sentAt !== undefined,
    sentAt,
    replied: repliedAt !== undefined,
    repliedAt,
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

  // Sent, from the outbound Message the extension read back out of Instagram's
  // own inbox. CONTEXT.md's rule is that Sent is never *inferred* — and this
  // isn't inference, it's the same observer reporting the same fact by a second
  // route. It also closes the arithmetic: `replied` below can only be true on a
  // thread that holds an outbound Message, so `replied` implies `dmSent` and
  // filters.ts's replyRate (replied/dmsSent) can no longer exceed 100%.
  if (outcome.sent && !lead.dmSent) {
    next.dmSent = true;
    next.dmDate = lead.dmDate ?? outcome.sentAt;
    changed = true;
  }

  if (outcome.replied && !lead.replied) {
    next.replied = true;
    next.replyDate = lead.replyDate ?? outcome.repliedAt;
    changed = true;
  }

  if (outcome.booked && !lead.booked) {
    // A booking implies everything before it in the funnel, which is what
    // `markBooked` did and what the rate calculations in filters.ts assume.
    // Sent is part of "everything before it": you cannot book someone you never
    // messaged, and leaving it out would reopen the >100% reply rate through
    // the one branch that sets `replied` without reading the thread.
    //
    // No date comes with it. `sentAt` is set above when the thread actually
    // showed an outbound Message; dating a send from `repliedAt` instead would
    // put it on the day they answered, which is a day the conversion chart
    // would then draw a send on.
    next.dmSent = true;
    next.booked = true;
    next.positiveReply = true;
    next.replied = true;
    next.status = 'won';
    changed = true;
  }

  return changed ? next : null;
}
