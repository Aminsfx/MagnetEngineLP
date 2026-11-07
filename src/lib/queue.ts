import type { Lead } from './types';

/**
 * Where a Lead sits in the Approval Queue, and which scrape it came from.
 *
 * The queue used to file Leads under six overlapping statuses (Ready, Approved,
 * Sent, Pending, Rejected, All) in one list, so a fresh scrape landed among
 * Leads already written, approved or sent. Now there are three stages of work,
 * in the order it happens, and two places finished Leads go, and each campaign
 * is its own chip. One definition each, so the tab counts, the campaign chips
 * and the rows can never disagree.
 *
 * A campaign is its name. Every search the Operator adds under a name the
 * workspace already has joins that campaign (`campaignNamed`), so one name
 * scraped from followers, a hashtag and a location is one campaign. A search
 * added with no name is its own campaign, named for its source and the day.
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

/** The Leads gathered under one name (or one unnamed scrape, or one CSV import). */
export interface Campaign {
    id: string;
    /** The campaign name the Operator gave it, or '' — see `campaignLabel`. */
    name: string;
    /** When the campaign arrived: its earliest Lead's `createdAt`. */
    createdAt?: string;
    /** When Leads last joined it: its newest Lead's `createdAt`. */
    updatedAt?: string;
    counts: ViewCounts;
    size: number;
}

const time = (iso?: string) => {
    const t = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(t) ? t : -Infinity;
};

/**
 * Every campaign, the one Leads last joined first, so a search added to an
 * older campaign brings it back to the front of the queue. A campaign with no
 * date sorts last.
 */
export function campaignsOf(leads: Lead[]): Campaign[] {
    const byId = new Map<string, Campaign>();
    for (const l of leads) {
        const id = campaignIdOf(l);
        let b = byId.get(id);
        if (!b) {
            b = { id, name: '', createdAt: l.createdAt, updatedAt: l.createdAt, counts: zero(), size: 0 };
            byId.set(id, b);
        }
        if (!b.name && l.campaignName?.trim()) b.name = l.campaignName.trim();
        if (l.createdAt && (!b.createdAt || time(l.createdAt) < time(b.createdAt))) {
            b.createdAt = l.createdAt;
        }
        if (l.createdAt && (!b.updatedAt || time(l.createdAt) > time(b.updatedAt))) {
            b.updatedAt = l.createdAt;
        }
        b.counts[viewOf(l)]++;
        b.size++;
    }
    return [...byId.values()].sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
}

/** Two names are one campaign when they differ only in case and spacing. */
const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * The campaign already called `name`, which a search added under that name
 * joins. When two campaigns share it (both made before names joined), the one
 * Leads last joined wins, so a run keeps landing in one place.
 */
export function campaignNamed(campaigns: Campaign[], name: string): Campaign | undefined {
    const key = nameKey(name);
    if (!key) return undefined;
    return campaigns
        .filter((b) => b.name && nameKey(b.name) === key)
        // The id settles a tie, so two tabs folding the same Leads agree.
        .sort((a, b) => time(b.updatedAt) - time(a.updatedAt) || a.id.localeCompare(b.id))[0];
}

/**
 * A name the app made up for a search or import added with none: "#smma ·
 * Nov 6", "Followers of @x +2 · Oct 24", "CSV import · Nov 6". Two of these can
 * match without the Operator ever meaning them as one campaign (two different
 * posts' likers on one day are both "Likers of a post · Nov 6").
 */
const MADE_UP_NAME = / · [A-Z][a-z]{2} \d{1,2}$/;

/**
 * Campaigns the Operator gave the same name, folded into one.
 *
 * Before names joined campaigns (2026-11-06), the name field emptied itself
 * between visits and every search became its own campaign, so an Operator who
 * retyped "Miami coaches" for each source has several campaigns by that name.
 * Each folds into the one `campaignNamed` picks, which is where the next search
 * under that name will land anyway. Names the app made up are left apart, as
 * are Leads from before campaigns were stamped.
 *
 * `changed` holds only the Leads that moved, restamped with the campaign's id
 * and name, for the caller to save. When nothing shares a name, `leads` is the
 * array passed in and `changed` is empty, so running it on every load is free
 * once the fold has happened.
 */
export function foldNamedCampaigns(leads: Lead[]): { leads: Lead[]; changed: Lead[] } {
    const named = campaignsOf(leads).filter((b) => b.id !== NO_CAMPAIGN && b.name && !MADE_UP_NAME.test(b.name));
    const into = new Map<string, Campaign>();
    for (const b of named) {
        const keep = campaignNamed(named, b.name);
        if (keep && keep.id !== b.id) into.set(b.id, keep);
    }
    if (into.size === 0) return { leads, changed: [] };

    const changed: Lead[] = [];
    const folded = leads.map((l) => {
        const keep = l.campaignId ? into.get(l.campaignId) : undefined;
        if (!keep) return l;
        const moved = { ...l, campaignId: keep.id, campaignName: keep.name };
        changed.push(moved);
        return moved;
    });
    return { leads: folded, changed };
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
