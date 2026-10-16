import type { Conversation } from './types';

/**
 * Which conversations need the Operator, and what to do in each — the Inbox's
 * organising rule, in one place.
 *
 * Read only from what a Conversation already carries: whether the last
 * message is theirs (`needsReply`), the AI's read of it (`intent`), its status
 * and when it last moved. Nothing here moves the funnel; like `intent`, it
 * colours the Inbox only (CONTEXT.md).
 */

export type Priority = 'high' | 'medium' | 'low';

export type Qualification = 'booked' | 'qualified' | 'objection' | 'unqualified' | 'unknown';

export interface Triage {
    priority: Priority;
    qualification: Qualification;
    /** What the Operator should do next, as a short imperative. */
    nextAction: string;
}

const HOUR_MS = 3_600_000;
/** Someone left waiting this long moves up, whatever they said. */
const WAITING_TOO_LONG_MS = 12 * HOUR_MS;
/** Silence after our message this long means it is time for a follow-up. */
const FOLLOW_UP_AFTER_MS = 48 * HOUR_MS;

const ageMs = (iso: string | undefined, now: number) => {
    const t = iso ? new Date(iso).getTime() : NaN;
    return Number.isFinite(t) ? now - t : 0;
};

export function triage(c: Conversation, opts: { now?: number; hasBookingLink?: boolean } = {}): Triage {
    const now = opts.now ?? Date.now();
    const age = ageMs(c.lastMessageAt, now);

    if (c.status === 'booked' || c.intent === 'booked') {
        return { priority: 'low', qualification: 'booked', nextAction: 'Call booked — get ready for it' };
    }
    if (c.status === 'closed' || c.intent === 'not_interested') {
        return { priority: 'low', qualification: 'unqualified', nextAction: 'Nothing to send — they passed' };
    }

    if (c.needsReply) {
        if (c.intent === 'interested') {
            return {
                priority: 'high',
                qualification: 'qualified',
                nextAction: opts.hasBookingLink ? 'Send your booking link' : 'Ask for a time to talk',
            };
        }
        if (c.intent === 'objection') {
            return { priority: 'high', qualification: 'objection', nextAction: 'Answer their objection' };
        }
        return {
            priority: age >= WAITING_TOO_LONG_MS ? 'high' : 'medium',
            qualification: 'unknown',
            nextAction: 'Reply and find out if they are a fit',
        };
    }

    // The last word was ours.
    const qualification: Qualification = c.intent === 'interested' ? 'qualified' : c.intent === 'objection' ? 'objection' : 'unknown';
    if (age >= FOLLOW_UP_AFTER_MS) {
        return { priority: 'medium', qualification, nextAction: 'Follow up — they went quiet' };
    }
    return { priority: 'low', qualification, nextAction: 'Waiting on their reply' };
}

const RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
/** Inside a group, the warmest lead first: a hot prospect left waiting costs the most. */
const WARMTH: Record<Qualification, number> = { qualified: 0, objection: 1, unknown: 2, booked: 3, unqualified: 4 };

/** Priority, then warmth, then whoever has waited longest at the top of their group. */
export function byPriority(a: { t: Triage; c: Conversation }, b: { t: Triage; c: Conversation }): number {
    const p = RANK[a.t.priority] - RANK[b.t.priority];
    if (p !== 0) return p;
    const w = WARMTH[a.t.qualification] - WARMTH[b.t.qualification];
    if (w !== 0) return w;
    // Inside the groups that need a reply, the oldest message comes first;
    // in the waiting group, the most recent activity does.
    const at = a.c.lastMessageAt ?? '';
    const bt = b.c.lastMessageAt ?? '';
    return a.t.priority === 'low' ? bt.localeCompare(at) : at.localeCompare(bt);
}

export const PRIORITY_LABEL: Record<Priority, string> = {
    high: 'Needs attention',
    medium: 'Up next',
    low: 'Waiting or done',
};

export const QUALIFICATION_LABEL: Record<Qualification, string> = {
    booked: 'Booked',
    qualified: 'Qualified',
    objection: 'Objection',
    unqualified: 'Not a fit',
    unknown: 'Not qualified yet',
};
