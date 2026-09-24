import type { Conversation, Lead } from './types';

/**
 * What is waiting on the Operator right now — the dashboard's "Today" panel
 * and the sidebar's count badges read the same numbers from here, so the badge
 * on Approval Queue can never disagree with the row that links to it.
 */

const DAY_MS = 86_400_000;

/** A written DM nobody has decided on yet. The Approval Queue's Ready tab. */
export function isReadyForReview(l: Lead): boolean {
    return !!l.dmContent && !l.approved && !l.rejected && !l.dmSent;
}

/**
 * Approved, not Sent, and not handed off since the stamp existed. Leads
 * approved earlier may already be with the extension; either way pressing Send
 * is safe, because the queue never re-sends a Lead the extension confirmed.
 */
export function isAwaitingHandoff(l: Lead): boolean {
    return !!l.approved && !!l.dmContent && !l.dmSent && !l.handedOffAt;
}

/**
 * Sent more than three days ago, silent, and never followed up. The same
 * three-day line the old health card drew. `dmDate` is only a proxy for the
 * send (it is stamped at generation and kept on send), which is why this says
 * "due a follow-up" and not "sent N days ago".
 */
export function isDueFollowUp(l: Lead, nowMs: number): boolean {
    if (!l.dmSent || l.replied || l.followedUp || l.optedOut || !l.dmDate) return false;
    const t = new Date(l.dmDate).getTime();
    return Number.isFinite(t) && t < nowMs - 3 * DAY_MS;
}

export interface TodayCounts {
    toReview: number;
    toSend: number;
    toAnswer: number;
    toFollowUp: number;
}

export function todayCounts(
    leads: Lead[],
    conversations: Conversation[],
    now: Date = new Date(),
): TodayCounts {
    const nowMs = now.getTime();
    let toReview = 0;
    let toSend = 0;
    let toFollowUp = 0;
    for (const l of leads) {
        if (isReadyForReview(l)) toReview++;
        if (isAwaitingHandoff(l)) toSend++;
        if (isDueFollowUp(l, nowMs)) toFollowUp++;
    }
    const toAnswer = conversations.filter(c => c.needsReply && c.status !== 'closed').length;
    return { toReview, toSend, toAnswer, toFollowUp };
}

/** The one sentence at the top of the home page: the most important thing waiting. */
export function headline(c: TodayCounts, hasLeads: boolean): string {
    if (!hasLeads) return 'Your first campaign starts here.';
    if (c.toReview > 0) return `${c.toReview} ${c.toReview === 1 ? 'draft is' : 'drafts are'} waiting for you.`;
    if (c.toAnswer > 0) return `${c.toAnswer} ${c.toAnswer === 1 ? 'person is' : 'people are'} waiting on a reply.`;
    if (c.toSend > 0) return `${c.toSend} approved ${c.toSend === 1 ? 'DM is' : 'DMs are'} ready to send.`;
    if (c.toFollowUp > 0) return `${c.toFollowUp} ${c.toFollowUp === 1 ? 'lead is' : 'leads are'} due a follow-up.`;
    return 'Nothing is waiting on you.';
}
