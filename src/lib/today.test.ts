import { describe, it, expect } from 'vitest';
import { todayCounts } from './today';
import type { Conversation, Lead } from './types';

const NOW = new Date('2026-09-23T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const lead = (over: Partial<Lead>): Lead => ({
    id: Math.random().toString(36).slice(2),
    handle: 'h',
    name: 'n',
    followers: 0,
    isPrivate: false,
    status: 'cold',
    dmSent: false,
    replied: false,
    ...over,
});

const conv = (over: Partial<Conversation>): Conversation => ({
    id: Math.random().toString(36).slice(2),
    handle: 'h',
    unread: false,
    status: 'open',
    needsReply: false,
    ...over,
});

describe('todayCounts', () => {
    it('counts each kind of waiting work once, in its own bucket', () => {
        const counts = todayCounts(
            [
                lead({ dmContent: 'hi' }),                                          // to review
                lead({ dmContent: 'hi', approved: true }),                          // to hand off
                lead({ dmContent: 'hi', approved: true, handedOffAt: daysAgo(0) }), // with the extension: nothing to do
                lead({ dmContent: 'hi', approved: true, dmSent: true, dmDate: daysAgo(5) }), // due a follow-up
                lead({ dmContent: 'hi', rejected: true }),                          // decided: nothing to do
                lead({}),                                                           // not written yet: nothing to do
            ],
            [conv({ needsReply: true }), conv({ needsReply: true, status: 'closed' }), conv({})],
            NOW,
        );
        expect(counts).toEqual({ toReview: 1, toSend: 1, toAnswer: 1, toFollowUp: 1 });
    });

    it('never asks for a follow-up to someone who replied, opted out, or was sent recently', () => {
        const counts = todayCounts(
            [
                lead({ dmSent: true, dmDate: daysAgo(5), replied: true }),
                lead({ dmSent: true, dmDate: daysAgo(5), optedOut: true }),
                lead({ dmSent: true, dmDate: daysAgo(5), followedUp: true }),
                lead({ dmSent: true, dmDate: daysAgo(1) }),
            ],
            [],
            NOW,
        );
        expect(counts.toFollowUp).toBe(0);
    });
});
