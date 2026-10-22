import type { Lead } from './types';
import { sentDate } from './sent';

/**
 * The dashboard's period views — revenue, the funnel and the weekly report —
 * as pure functions over the Leads, so every number on those cards is one a
 * test can recompute.
 *
 * A stage is counted inside a period by the date stamped when it happened
 * (`createdAt`, `qualifiedAt`, `bookedAt`, `closedAt`; see Lead). A Lead from
 * before its stamp existed counts in "All time" only. Two stages say how they
 * differ: In contact (and the week's openers) reads `sentDate()` — the moment
 * the extension confirmed the send, or `dmDate` for a Lead Sent before that
 * stamp existed — and Replies read `replyDate`.
 */

export interface Period {
    start: Date;
    /** Exclusive. */
    end: Date;
}

const DAY_MS = 86_400_000;

/** The calendar month `offset` months from the one holding `now` (0 = this month). */
export function monthPeriod(offset = 0, now = new Date()): Period {
    return {
        start: new Date(now.getFullYear(), now.getMonth() + offset, 1),
        end: new Date(now.getFullYear(), now.getMonth() + offset + 1, 1),
    };
}

/** Monday to Sunday, `offset` weeks from the week holding `now` (0 = this week). */
export function weekPeriod(offset = 0, now = new Date()): Period {
    const day = (now.getDay() + 6) % 7; // Monday = 0
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + offset * 7);
    return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
}

/** The period of the same length immediately before `p`. */
export function previousPeriod(p: Period): Period {
    // Months differ in length, so a month steps back a month, not 30 days.
    const isMonth = p.start.getDate() === 1 && p.end.getDate() === 1
        && (p.end.getMonth() - p.start.getMonth() + 12) % 12 === 1;
    if (isMonth) {
        return {
            start: new Date(p.start.getFullYear(), p.start.getMonth() - 1, 1),
            end: new Date(p.start.getFullYear(), p.start.getMonth(), 1),
        };
    }
    const len = p.end.getTime() - p.start.getTime();
    return { start: new Date(p.start.getTime() - len), end: new Date(p.start.getTime()) };
}

/** True when `iso` falls inside `p`. A missing or unreadable date never does. */
export function within(iso: string | undefined, p: Period): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t >= p.start.getTime() && t < p.end.getTime();
}

/** `null` means all time: the flag alone decides. */
const counts = (flag: boolean, date: string | undefined, p: Period | null) =>
    flag && (p === null || within(date, p));

// ─── Revenue ─────────────────────────────────────────────────────────────────

export interface Revenue {
    /** Value of the deals won in the period. */
    total: number;
    collected: number;
    /** Won but not yet paid. Never negative: overpayment is not owed back. */
    outstanding: number;
    deals: number;
    /** Change against the period before, in percent. `null` when there is nothing to compare with. */
    change: number | null;
}

const isWon = (l: Lead) => !!l.closedAt && (l.dealValue ?? 0) > 0;

function sumRevenue(leads: Lead[], p: Period | null) {
    let total = 0;
    let collected = 0;
    let deals = 0;
    for (const l of leads) {
        if (!counts(isWon(l), l.closedAt, p)) continue;
        const value = l.dealValue ?? 0;
        total += value;
        collected += Math.min(Math.max(l.cashCollected ?? 0, 0), value);
        deals++;
    }
    return { total, collected, deals };
}

export function revenue(leads: Lead[], p: Period | null): Revenue {
    const now = sumRevenue(leads, p);
    let change: number | null = null;
    if (p) {
        const before = sumRevenue(leads, previousPeriod(p)).total;
        if (before > 0) change = Math.round(((now.total - before) / before) * 100);
    }
    return { ...now, outstanding: Math.max(now.total - now.collected, 0), change };
}

// ─── Funnel ──────────────────────────────────────────────────────────────────

export type FunnelKey = 'new' | 'contact' | 'qualified' | 'booked' | 'won';

export interface FunnelStage {
    key: FunnelKey;
    label: string;
    n: number;
}

export function funnel(leads: Lead[], p: Period | null): FunnelStage[] {
    const n = (pred: (l: Lead) => boolean) => leads.filter(pred).length;
    return [
        // All time is every Lead; a period needs the stamp.
        { key: 'new', label: 'New leads', n: n(l => p === null || within(l.createdAt, p)) },
        { key: 'contact', label: 'In contact', n: n(l => counts(l.dmSent, sentDate(l), p)) },
        { key: 'qualified', label: 'Qualified', n: n(l => counts(!!l.positiveReply, l.qualifiedAt, p)) },
        { key: 'booked', label: 'Booked calls', n: n(l => counts(!!l.booked, l.bookedAt, p)) },
        { key: 'won', label: 'Won', n: n(l => counts(isWon(l), l.closedAt, p)) },
    ];
}

/** Step-to-step rate in percent, or `null` when the step before is empty. */
export function stepRate(prev: number, next: number): number | null {
    return prev > 0 ? Math.round((next / prev) * 100) : null;
}

// ─── Weekly report ───────────────────────────────────────────────────────────

export interface WeeklyReport {
    newLeads: number;
    qualified: number;
    booked: number;
    won: number;
    /** First DMs sent in the week (`sentDate()`). */
    openers: number;
    /** Of those openers, how many have been answered (at any time since). */
    openersReplied: number;
    /** Percent of openers answered, or `null` with no openers. */
    replyRate: number | null;
    followUps: number;
    /** Openers plus follow-ups. */
    messagesSent: number;
    /** Leads whose first reply arrived in the week. */
    replies: number;
}

const FOLLOW_UP_DATES = [
    'followUp1Date', 'followUp2Date', 'followUp3Date', 'rescue1Date', 'rescue2Date', 'rescue3Date',
] as const;

export function weeklyReport(leads: Lead[], week: Period): WeeklyReport {
    const stages = funnel(leads, week);
    const by = (k: FunnelKey) => stages.find(s => s.key === k)!.n;

    const openerLeads = leads.filter(l => l.dmSent && within(sentDate(l), week));
    const openersReplied = openerLeads.filter(l => l.replied).length;
    const followUps = leads.reduce(
        (sum, l) => sum + FOLLOW_UP_DATES.filter(k => within(l[k], week)).length,
        0,
    );

    return {
        newLeads: by('new'),
        qualified: by('qualified'),
        booked: by('booked'),
        won: by('won'),
        openers: openerLeads.length,
        openersReplied,
        replyRate: openerLeads.length > 0 ? Math.round((openersReplied / openerLeads.length) * 100) : null,
        followUps,
        messagesSent: openerLeads.length + followUps,
        replies: leads.filter(l => l.replied && within(l.replyDate, week)).length,
    };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const formatMoney = (n: number) => money.format(n);

/** "Mon, 3 Aug – Sun, 9 Aug" — the inclusive range a week card prints. */
export function formatRange(p: Period): string {
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${fmt(p.start)} – ${fmt(new Date(p.end.getTime() - DAY_MS))}`;
}
