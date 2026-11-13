import { describe, it, expect } from 'vitest';
import type { Conversation } from './types';
import { triage, byPriority } from './triage';

const NOW = Date.parse('2026-10-14T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

const conv = (over: Partial<Conversation>): Conversation => ({
    id: Math.random().toString(36).slice(2),
    handle: 'x',
    unread: false,
    status: 'open',
    needsReply: false,
    lastMessageAt: hoursAgo(1),
    ...over,
});

describe('triage', () => {
    it('puts an interested prospect waiting on us first, with the booking step', () => {
        expect(triage(conv({ needsReply: true, intent: 'interested' }), { now: NOW, hasBookingLink: true })).toEqual({
            priority: 'high', qualification: 'interested', nextAction: 'Send your booking link',
        });
        expect(triage(conv({ needsReply: true, intent: 'interested' }), { now: NOW }).nextAction).toBe('Ask for a time to talk');
    });

    it('raises an unclear reply once it has waited too long', () => {
        expect(triage(conv({ needsReply: true, lastMessageAt: hoursAgo(2) }), { now: NOW }).priority).toBe('medium');
        expect(triage(conv({ needsReply: true, lastMessageAt: hoursAgo(20) }), { now: NOW }).priority).toBe('high');
    });

    it('asks for a follow-up after two quiet days on our side', () => {
        expect(triage(conv({ lastMessageAt: hoursAgo(5) }), { now: NOW })).toMatchObject({ priority: 'low', nextAction: 'Waiting on their reply' });
        expect(triage(conv({ lastMessageAt: hoursAgo(60) }), { now: NOW })).toMatchObject({ priority: 'medium', nextAction: 'Follow up — they went quiet' });
    });

    it('calls a conversation Qualified only on the Operator\'s mark', () => {
        // The AI's read is "Interested". Qualified is what the dashboard counts.
        expect(triage(conv({ intent: 'interested' }), { now: NOW }).qualification).toBe('interested');
        expect(triage(conv({ status: 'qualified', needsReply: true }), { now: NOW, hasBookingLink: true })).toEqual({
            priority: 'high', qualification: 'qualified', nextAction: 'Send your booking link',
        });
        expect(triage(conv({ status: 'qualified' }), { now: NOW })).toMatchObject({
            qualification: 'qualified', nextAction: 'Waiting on their reply',
        });
    });

    it('keeps the Operator\'s mark over what the AI reads later', () => {
        expect(triage(conv({ status: 'qualified', needsReply: true, intent: 'not_interested' }), { now: NOW }).qualification).toBe('qualified');
        // Still qualified, and the objection is what to deal with next.
        expect(triage(conv({ status: 'qualified', needsReply: true, intent: 'objection' }), { now: NOW })).toEqual({
            priority: 'high', qualification: 'qualified', nextAction: 'Answer their objection',
        });
        // A booking is the stage after it.
        expect(triage(conv({ status: 'booked' }), { now: NOW }).qualification).toBe('booked');
    });

    it('settles booked and declined conversations, even with a reply owed', () => {
        expect(triage(conv({ needsReply: true, intent: 'booked' }), { now: NOW }).qualification).toBe('booked');
        expect(triage(conv({ needsReply: true, intent: 'not_interested' }), { now: NOW })).toMatchObject({ priority: 'low', qualification: 'unqualified' });
    });
});

describe('byPriority', () => {
    it('orders by priority, then the warmest lead, then the longest wait', () => {
        const items = [
            conv({ id: 'low', lastMessageAt: hoursAgo(1) }),
            conv({ id: 'objection', needsReply: true, intent: 'objection', lastMessageAt: hoursAgo(30) }),
            conv({ id: 'hot-new', needsReply: true, intent: 'interested', lastMessageAt: hoursAgo(1) }),
            conv({ id: 'hot-old', needsReply: true, intent: 'interested', lastMessageAt: hoursAgo(5) }),
            conv({ id: 'marked', needsReply: true, status: 'qualified', lastMessageAt: hoursAgo(1) }),
        ].map(c => ({ c, t: triage(c, { now: NOW }) }));
        expect(items.sort(byPriority).map(x => x.c.id)).toEqual(['marked', 'hot-old', 'hot-new', 'objection', 'low']);
    });
});
