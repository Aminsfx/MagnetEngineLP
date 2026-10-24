import type { Lead } from './types';

/**
 * Where a Lead sits in the Approval Queue, and which scrape it came from.
 *
 * The queue used to file Leads under six overlapping statuses (Ready, Approved,
 * Sent, Pending, Rejected, All) in one list, so a fresh scrape landed among
 * Leads already written, approved or sent. Now there are three stages of work,
 * in the order it happens, and two places finished Leads go — and every scrape
 * stays its own campaign. One definition each, so the tab counts, the campaign chips
 * and the rows can never disagree.
 */

/** The work still to do on a Lead, in order: write its DM, read it, send it. */
export type QueueStage = 'write' | 'review' | 'send';

/** A stage, or where a Lead goes once it leaves the queue. */
export type QueueView = QueueStage | 'sent' | 'skipped';

export const STAGES: readonly QueueStage[] = ['write', 'review', 'send'];

/**
 * Sent wins over everything: once the extension confirmed it, the Lead has
 * left the queue whatever else is true of it. Skipped wins over the stages, so
 * a skipped draft does not sit in review. Approved covers Handed off too — it
 * is still waiting to go out, and a second Send safely carries it again,
 * because the extension never re-sends a handle it confirmed.
 */
export function viewOf(l: Lead): QueueView {
    if (l.dmSent) return 'sent';
    if (l.rejected) return 'skipped';
    if (l.approved) return 'send';
    if (l.dmContent) return 'review';
    return 'write';
}

/** Leads from before campaigns were stamped, or imported without one. */
export const NO_CAMPAIGN = 'earlier';

export function campaignIdOf(l: Lead): string {
    return l.campaignId || NO_CAMPAIGN;
}

export type ViewCounts = Record<QueueView, number>;

const zero = (): ViewCounts => ({ write: 0, review: 0, send: 0, sent: 0, skipped: 0 });

/** One scrape (or CSV import): the Leads that arrived together. */
export interface Campaign {
    id: string;
    /** The campaign name the Operator gave it, or '' — see `campaignLabel`. */
    name: string;
    /** When the campaign arrived: its earliest Lead's `createdAt`. */
    createdAt?: string;
    counts: ViewCounts;
    size: number;
}

const time = (iso?: string) => {
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(t) ? t : -Infinity;
};

/** Every campaign, newest first. A campaign with no date sorts last. */
export function campaignsOf(leads: Lead[]): Campaign[] {
    const byId = new Map<string, Campaign>();
    for (const l of leads) {
        const id = campaignIdOf(l);
        let b = byId.get(id);
        if (!b) {
            b = { id, name: '', createdAt: l.createdAt, counts: zero(), size: 0 };
            byId.set(id, b);
        }
        if (!b.name && l.campaignName?.trim()) b.name = l.campaignName.trim();
        if (l.createdAt && (!b.createdAt || time(l.createdAt) < time(b.createdAt))) {
            b.createdAt = l.createdAt;
        }
        b.counts[viewOf(l)]++;
        b.size++;
    }
    return [...byId.values()].sort((a, b) => time(b.createdAt) - time(a.createdAt));
}

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** "Oct 24" — the day a campaign arrived, or '' when it carries no date. */
export function campaignDate(b: Pick<Campaign, 'createdAt'>): string {
    const t = time(b.createdAt);
    return Number.isFinite(t) ? DAY.format(new Date(t)) : '';
}

/**
 * What a campaign is called on screen: its campaign name, or the day it arrived.
 * A campaign's raw id is a UUID, which names nothing an Operator can recognise.
 */
export function campaignLabel(b: Pick<Campaign, 'id' | 'name' | 'createdAt'>): string {
    if (b.name) return b.name;
    if (b.id === NO_CAMPAIGN) return 'Earlier leads';
    const day = campaignDate(b);
    return day ? `Added ${day}` : 'Unnamed campaign';
}

/** How many Leads are in each view. */
export function countViews(leads: Lead[]): ViewCounts {
    const out = zero();
    for (const l of leads) out[viewOf(l)]++;
    return out;
}

/** The first stage with work in it, in the order the work happens. */
export function nextStage(counts: ViewCounts): QueueStage | null {
    return STAGES.find((s) => counts[s] > 0) ?? null;
}
