import { describe, it, expect } from 'vitest';
import { campaignsOf, campaignLabel, countViews, nextStage, viewOf, NO_CAMPAIGN } from './queue';
import type { Lead } from './types';

const lead = (over: Partial<Lead> = {}): Lead => ({
    id: Math.random().toString(36).slice(2), handle: 'x', name: 'x', followers: 0,
    isPrivate: false, status: 'cold', dmSent: false, replied: false, ...over,
});

describe('viewOf', () => {
    it('files a Lead by the work left on it, Sent and Skipped first', () => {
        expect(viewOf(lead())).toBe('write');
        expect(viewOf(lead({ dmContent: 'hi' }))).toBe('review');
        expect(viewOf(lead({ dmContent: 'hi', approved: true }))).toBe('send');
        expect(viewOf(lead({ dmContent: 'hi', approved: true, handedOffAt: '2026-10-20T10:00:00Z' }))).toBe('send');
        expect(viewOf(lead({ dmContent: 'hi', rejected: true }))).toBe('skipped');
        // Sent wins even over a later skip: it has left the queue either way.
        expect(viewOf(lead({ dmContent: 'hi', approved: true, dmSent: true, rejected: true }))).toBe('sent');
    });
});

describe('campaignsOf', () => {
    it('keeps every scrape its own campaign, newest first, and counts each stage', () => {
        const campaigns = campaignsOf([
            lead({ campaignId: 'old', campaignName: 'Older', createdAt: '2026-10-01T12:00:00Z', dmContent: 'hi' }),
            lead({ campaignId: 'new', campaignName: 'Fresh', createdAt: '2026-10-20T12:00:00Z' }),
            lead({ campaignId: 'new', campaignName: 'Fresh', createdAt: '2026-10-20T12:00:00Z' }),
            lead({}), // from before campaigns were stamped
        ]);
        expect(campaigns.map((b) => b.id)).toEqual(['new', 'old', NO_CAMPAIGN]);
        expect(campaigns[0].counts).toMatchObject({ write: 2, review: 0 });
        expect(nextStage(campaigns[0].counts)).toBe('write');
        expect(nextStage(campaigns[1].counts)).toBe('review');
    });

    it('names a campaign by its campaign, or by the day it arrived', () => {
        const [named, dated, earlier] = campaignsOf([
            lead({ campaignId: 'a', campaignName: '#fitnesscoach · Oct 24', createdAt: '2026-10-24T12:00:00Z' }),
            lead({ campaignId: 'b', createdAt: '2026-10-20T12:00:00Z' }),
            lead({}),
        ]);
        expect(campaignLabel(named)).toBe('#fitnesscoach · Oct 24');
        expect(campaignLabel(dated)).toBe('Added Oct 20');
        expect(campaignLabel(earlier)).toBe('Earlier leads');
    });

    it('has no next stage when all its work is done', () => {
        expect(nextStage(countViews([lead({ dmSent: true }), lead({ rejected: true })]))).toBeNull();
    });
});
