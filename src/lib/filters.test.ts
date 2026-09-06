import { describe, it, expect } from 'vitest';
import { filterUtils } from './filters';
import type { Lead, AppConfig } from './types';

function makeLead(overrides: Partial<Lead> = {}): Lead {
    return {
        id: 'l1',
        name: 'Jane Doe',
        handle: 'janedoe',
        followers: 5_000,
        isPrivate: false,
        status: 'cold',
        dmSent: false,
        replied: false,
        ...overrides,
    };
}

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
        systemPrompt: '',
        includeKeywords: [],
        excludeKeywords: [],
        minFollowers: 0,
        maxFollowers: Number.MAX_SAFE_INTEGER,
        accountType: 'all',
        selectedAIProvider: 'claude',
        dailySendCap: 40,
        ...overrides,
    };
}

describe('filterUtils.filterLeads', () => {
    it('keeps leads inside the follower range and drops those outside it', () => {
        const leads = [
            makeLead({ id: 'under', followers: 100 }),
            makeLead({ id: 'inside', followers: 5_000 }),
            makeLead({ id: 'over', followers: 900_000 }),
        ];
        const config = makeConfig({ minFollowers: 1_000, maxFollowers: 100_000 });

        expect(filterUtils.filterLeads(leads, config).map((l) => l.id)).toEqual(['inside']);
    });

    it('treats the follower bounds as inclusive', () => {
        const leads = [
            makeLead({ id: 'at-min', followers: 1_000 }),
            makeLead({ id: 'at-max', followers: 100_000 }),
        ];
        const config = makeConfig({ minFollowers: 1_000, maxFollowers: 100_000 });

        expect(filterUtils.filterLeads(leads, config)).toHaveLength(2);
    });

    it('filters private accounts out when accountType is "public"', () => {
        const leads = [
            makeLead({ id: 'public', isPrivate: false }),
            makeLead({ id: 'private', isPrivate: true }),
        ];

        expect(
            filterUtils.filterLeads(leads, makeConfig({ accountType: 'public' })).map((l) => l.id),
        ).toEqual(['public']);
        expect(
            filterUtils.filterLeads(leads, makeConfig({ accountType: 'private' })).map((l) => l.id),
        ).toEqual(['private']);
        expect(filterUtils.filterLeads(leads, makeConfig({ accountType: 'all' }))).toHaveLength(2);
    });

    it('matches keywords case-insensitively across name, handle and bio', () => {
        const leads = [
            makeLead({ id: 'by-bio', bio: 'Certified FITNESS coach' }),
            makeLead({ id: 'by-handle', handle: 'FitnessGuru', bio: undefined }),
            makeLead({ id: 'no-match', name: 'Bob', handle: 'bob', bio: 'accountant' }),
        ];
        const config = makeConfig({ includeKeywords: ['fitness'] });

        expect(filterUtils.filterLeads(leads, config).map((l) => l.id)).toEqual([
            'by-bio',
            'by-handle',
        ]);
    });

    it('applies exclude keywords ahead of include keywords', () => {
        const leads = [makeLead({ id: 'both', bio: 'fitness coach seeking sponsorship' })];
        const config = makeConfig({
            includeKeywords: ['fitness'],
            excludeKeywords: ['sponsorship'],
        });

        expect(filterUtils.filterLeads(leads, config)).toEqual([]);
    });

    it('keeps every lead when no keyword rules are set', () => {
        const leads = [makeLead({ id: 'a' }), makeLead({ id: 'b', bio: undefined })];

        expect(filterUtils.filterLeads(leads, makeConfig())).toHaveLength(2);
    });
});

describe('filterUtils.calculateStats', () => {
    it('returns zeroed rates for an empty lead list without dividing by zero', () => {
        const stats = filterUtils.calculateStats([]);

        expect(stats).toEqual({
            totalLeads: 0,
            approvedLeads: 0,
            dmsSent: 0,
            replyRate: 0,
            positiveReplyRate: 0,
            bookingRate: 0,
            followUpRate: 0,
            leadsContacted: 0,
            activeCampaigns: 0,
        });
    });

    it('derives each rate from the preceding funnel stage, not from total leads', () => {
        // 4 leads, 4 DMs sent, 2 replies, 1 positive, 1 booked.
        const leads = [
            makeLead({ id: '1', dmSent: true, replied: true, positiveReply: true, booked: true }),
            makeLead({ id: '2', dmSent: true, replied: true }),
            makeLead({ id: '3', dmSent: true, followedUp: true }),
            makeLead({ id: '4', dmSent: true }),
        ];

        const stats = filterUtils.calculateStats(leads);

        expect(stats.dmsSent).toBe(4);
        expect(stats.replyRate).toBe(50); // 2 replies / 4 DMs
        expect(stats.positiveReplyRate).toBe(50); // 1 positive / 2 replies
        expect(stats.bookingRate).toBe(100); // 1 booked / 1 positive
        expect(stats.followUpRate).toBe(25); // 1 followed up / 4 DMs
    });

    it('rounds rates to one decimal place', () => {
        const leads = [
            makeLead({ id: '1', dmSent: true, replied: true }),
            makeLead({ id: '2', dmSent: true }),
            makeLead({ id: '3', dmSent: true }),
        ];

        // 1/3 = 33.333... -> 33.3
        expect(filterUtils.calculateStats(leads).replyRate).toBe(33.3);
    });

    it('counts distinct campaign ids and ignores leads with none', () => {
        const leads = [
            makeLead({ id: '1', campaignId: 'c1' }),
            makeLead({ id: '2', campaignId: 'c1' }),
            makeLead({ id: '3', campaignId: 'c2' }),
            makeLead({ id: '4', campaignId: undefined }),
        ];

        expect(filterUtils.calculateStats(leads).activeCampaigns).toBe(2);
    });
});
