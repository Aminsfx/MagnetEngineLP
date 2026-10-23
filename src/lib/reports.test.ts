import { describe, it, expect } from 'vitest';
import type { Lead } from './types';
import { monthPeriod, weekPeriod, previousPeriod, within, revenue, funnel, weeklyReport, stepRate, pipeline, parseMoney } from './reports';

const lead = (over: Partial<Lead>): Lead => ({
    id: Math.random().toString(36).slice(2),
    name: 'x',
    handle: 'x',
    followers: 0,
    isPrivate: false,
    status: 'cold',
    dmSent: false,
    replied: false,
    ...over,
});

// Wednesday 14 Oct 2026, local time.
const NOW = new Date(2026, 9, 14, 12);
const iso = (y: number, m: number, d: number) => new Date(y, m, d, 10).toISOString();

describe('periods', () => {
    it('month and week bounds', () => {
        const m = monthPeriod(0, NOW);
        expect(m.start).toEqual(new Date(2026, 9, 1));
        expect(m.end).toEqual(new Date(2026, 10, 1));
        const w = weekPeriod(0, NOW);
        expect(w.start).toEqual(new Date(2026, 9, 12)); // Monday
        expect(w.end).toEqual(new Date(2026, 9, 19));
        expect(weekPeriod(-1, NOW).start).toEqual(new Date(2026, 9, 5));
    });

    it('steps a month back by a calendar month, across a year', () => {
        expect(previousPeriod(monthPeriod(0, new Date(2026, 0, 10)))).toEqual({
            start: new Date(2025, 11, 1),
            end: new Date(2026, 0, 1),
        });
    });

    it('never counts a missing date', () => {
        expect(within(undefined, monthPeriod(0, NOW))).toBe(false);
        expect(within('not a date', monthPeriod(0, NOW))).toBe(false);
    });
});

describe('revenue', () => {
    const october = monthPeriod(0, NOW);
    const leads = [
        lead({ closedAt: iso(2026, 9, 3), dealValue: 3000, cashCollected: 1000 }),
        lead({ closedAt: iso(2026, 9, 9), dealValue: 2000, cashCollected: 5000 }), // overpaid: capped
        lead({ closedAt: iso(2026, 8, 20), dealValue: 4000, cashCollected: 4000 }), // September
        lead({ booked: true, dealValue: 900 }), // no closedAt: not won
    ];

    it('sums the period, caps collected at the deal and compares with the month before', () => {
        expect(revenue(leads, october)).toEqual({
            total: 5000, collected: 3000, outstanding: 2000, deals: 2, change: 25,
        });
    });

    it('has no change with nothing to compare against', () => {
        expect(revenue(leads, monthPeriod(-1, NOW)).change).toBeNull();
        expect(revenue(leads, null)).toMatchObject({ total: 9000, deals: 3, change: null });
    });
});

describe('funnel', () => {
    const october = monthPeriod(0, NOW);
    const leads = [
        lead({ createdAt: iso(2026, 9, 2), dmSent: true, dmDate: iso(2026, 9, 2) }),
        lead({ createdAt: iso(2026, 9, 2), dmSent: true, dmDate: iso(2026, 9, 3), replied: true, positiveReply: true, qualifiedAt: iso(2026, 9, 4) }),
        lead({ createdAt: iso(2026, 8, 2), dmSent: true, dmDate: iso(2026, 8, 3), booked: true, positiveReply: true, bookedAt: iso(2026, 9, 6) }),
        lead({ positiveReply: true, booked: true }), // predates the stamps
    ];

    it('counts each stage by its own date within a period', () => {
        expect(funnel(leads, october).map(s => s.n)).toEqual([2, 2, 1, 1, 0]);
    });

    it('counts by flag alone for all time', () => {
        expect(funnel(leads, null).map(s => s.n)).toEqual([4, 3, 3, 2, 0]);
    });

    it('has no rate after an empty step', () => {
        expect(stepRate(0, 0)).toBeNull();
        expect(stepRate(4, 1)).toBe(25);
    });
});

describe('weeklyReport', () => {
    it('counts openers, their replies and follow-ups in the week', () => {
        const week = weekPeriod(0, NOW);
        const leads = [
            lead({ dmSent: true, dmDate: iso(2026, 9, 12), replied: true, replyDate: iso(2026, 9, 13) }),
            lead({ dmSent: true, dmDate: iso(2026, 9, 13) }),
            lead({ dmSent: true, dmDate: iso(2026, 9, 1), followUp1Date: iso(2026, 9, 12), rescue1Date: iso(2026, 9, 14) }),
            lead({ dmSent: false, dmDate: iso(2026, 9, 12) }), // written, never sent
        ];
        expect(weeklyReport(leads, week)).toMatchObject({
            openers: 2, openersReplied: 1, replyRate: 50, followUps: 2, messagesSent: 4, replies: 1,
        });
    });

    // The regression: openers were dated by `dmDate`, when the DM was WRITTEN.
    // A batch written one week and sent the next showed zero openers in the
    // week it actually went out.
    it('counts an opener in the week it was sent, not the week it was written', () => {
        const writtenLastWeek = iso(2026, 9, 6);
        const leads = [
            lead({ dmSent: true, dmDate: writtenLastWeek, sentAt: iso(2026, 9, 13) }),
            lead({ dmSent: true, dmDate: writtenLastWeek, sentAt: iso(2026, 9, 14) }),
        ];
        expect(weeklyReport(leads, weekPeriod(0, NOW)).openers).toBe(2);
        expect(weeklyReport(leads, weekPeriod(-1, NOW)).openers).toBe(0);
    });
});

describe('send date', () => {
    const october = monthPeriod(0, NOW);

    it('puts In contact in the month of the send', () => {
        const septemberDraft = lead({ dmSent: true, dmDate: iso(2026, 8, 28), sentAt: iso(2026, 9, 2) });
        expect(funnel([septemberDraft], october).find(s => s.key === 'contact')!.n).toBe(1);
        expect(funnel([septemberDraft], monthPeriod(-1, NOW)).find(s => s.key === 'contact')!.n).toBe(0);
    });

    it('falls back to when the DM was written for a Lead Sent before the stamp existed', () => {
        // Every Lead Sent until now has no `sentAt`; it must not vanish from the
        // period it was counted in before.
        const legacy = lead({ dmSent: true, dmDate: iso(2026, 9, 13) });
        expect(weeklyReport([legacy], weekPeriod(0, NOW)).openers).toBe(1);
        expect(funnel([legacy], october).find(s => s.key === 'contact')!.n).toBe(1);
    });
});

describe('pipeline', () => {
    it('sums the prices on booked calls not yet won, and nothing else', () => {
        expect(pipeline([
            lead({ booked: true, dealValue: 3000 }),
            lead({ booked: true, dealValue: 4000 }),
            lead({ booked: true, dealValue: 5000, closedAt: iso(2026, 9, 3) }), // won: revenue, not pipeline
            lead({ dealValue: 9000 }),                                          // pitched, not booked
            lead({ booked: true }),                                             // booked, no price
        ])).toEqual({ value: 7000, deals: 2 });
    });

    it('never counts a price as revenue until it is won', () => {
        expect(revenue([lead({ booked: true, dealValue: 3000 })], null).total).toBe(0);
    });
});

describe('parseMoney', () => {
    it('reads what people type', () => {
        expect(parseMoney('$3,000')).toBe(3000);
        expect(parseMoney('3000.505')).toBe(3000.51);
        expect(parseMoney('')).toBe(0);
        expect(parseMoney('free')).toBe(0);
    });
});
