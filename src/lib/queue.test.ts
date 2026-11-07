import { describe, it, expect } from 'vitest';
import { campaignsOf, campaignLabel, campaignNamed, countViews, foldNamedCampaigns, nextStage, viewOf, NO_CAMPAIGN } from './queue';
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

    it('puts the campaign Leads last joined first, and keeps the day it started', () => {
        const [first, second] = campaignsOf([
            lead({ campaignId: 'miami', campaignName: 'Miami coaches', createdAt: '2026-10-01T12:00:00Z' }),
            lead({ campaignId: 'dubai', campaignName: 'Dubai', createdAt: '2026-10-20T12:00:00Z' }),
            // A later search added to Miami brings it back to the front.
            lead({ campaignId: 'miami', campaignName: 'Miami coaches', createdAt: '2026-11-05T12:00:00Z' }),
        ]);
        expect([first.id, second.id]).toEqual(['miami', 'dubai']);
        expect(first.createdAt).toBe('2026-10-01T12:00:00Z');
        expect(first.size).toBe(2);
    });
});

describe('campaignNamed', () => {
    const campaigns = campaignsOf([
        lead({ campaignId: 'old', campaignName: 'Miami coaches', createdAt: '2026-10-01T12:00:00Z' }),
        lead({ campaignId: 'new', campaignName: 'Miami coaches', createdAt: '2026-10-20T12:00:00Z' }),
        lead({ campaignId: 'dubai', campaignName: 'Dubai', createdAt: '2026-10-10T12:00:00Z' }),
        lead({ campaignId: 'unnamed', createdAt: '2026-10-11T12:00:00Z' }),
    ]);

    it('finds the campaign a typed name belongs to, ignoring case and spacing', () => {
        expect(campaignNamed(campaigns, 'Dubai')?.id).toBe('dubai');
        expect(campaignNamed(campaigns, '  dubai ')?.id).toBe('dubai');
        expect(campaignNamed(campaigns, 'miami   COACHES')?.name).toBe('Miami coaches');
    });

    it('picks the one Leads last joined when two already share a name', () => {
        expect(campaignNamed(campaigns, 'Miami coaches')?.id).toBe('new');
    });

    it('finds nothing for a new name, a blank one, or an unnamed campaign\'s label', () => {
        expect(campaignNamed(campaigns, 'Leeds agencies')).toBeUndefined();
        expect(campaignNamed(campaigns, '   ')).toBeUndefined();
        expect(campaignNamed(campaigns, 'Added Oct 11')).toBeUndefined();
    });
});

describe('foldNamedCampaigns', () => {
    it('folds campaigns typed with the same name into the one Leads last joined', () => {
        const leads = [
            lead({ id: 'a', campaignId: 'm1', campaignName: 'Miami coaches', createdAt: '2026-10-01T12:00:00Z', dmSent: true }),
            lead({ id: 'b', campaignId: 'm2', campaignName: 'miami Coaches', createdAt: '2026-10-05T12:00:00Z', dmContent: 'hi' }),
            lead({ id: 'c', campaignId: 'm3', campaignName: 'Miami coaches', createdAt: '2026-10-09T12:00:00Z' }),
            lead({ id: 'd', campaignId: 'dubai', campaignName: 'Dubai', createdAt: '2026-10-02T12:00:00Z' }),
        ];
        const { leads: folded, changed } = foldNamedCampaigns(leads);

        expect(changed.map((l) => l.id)).toEqual(['a', 'b']);
        expect(folded.map((l) => l.campaignId)).toEqual(['m3', 'm3', 'm3', 'dubai']);
        expect(folded.slice(0, 3).every((l) => l.campaignName === 'Miami coaches')).toBe(true);
        // Moving a Lead moves nothing else about it: its stage is where it was.
        expect(viewOf(folded[0])).toBe('sent');
        expect(viewOf(folded[1])).toBe('review');

        const [miami] = campaignsOf(folded);
        expect(miami).toMatchObject({ id: 'm3', size: 3, createdAt: '2026-10-01T12:00:00Z' });
    });

    it('leaves names the app made up apart, and Leads from before campaigns', () => {
        const leads = [
            lead({ campaignId: 'p1', campaignName: 'Likers of a post · Nov 6', createdAt: '2026-11-06T10:00:00Z' }),
            lead({ campaignId: 'p2', campaignName: 'Likers of a post · Nov 6', createdAt: '2026-11-06T11:00:00Z' }),
            lead({ campaignId: 'csv1', campaignName: 'CSV import · Nov 6', createdAt: '2026-11-06T10:00:00Z' }),
            lead({ campaignId: 'csv2', campaignName: 'CSV import · Nov 6', createdAt: '2026-11-06T12:00:00Z' }),
            lead({ campaignName: 'Miami coaches', createdAt: '2026-09-01T12:00:00Z' }),
            lead({ campaignId: 'm1', campaignName: 'Miami coaches', createdAt: '2026-10-01T12:00:00Z' }),
        ];
        const { leads: folded, changed } = foldNamedCampaigns(leads);
        expect(changed).toEqual([]);
        expect(folded).toBe(leads);
    });

    it('has nothing left to do once it has run', () => {
        const once = foldNamedCampaigns([
            lead({ campaignId: 'm1', campaignName: 'Miami coaches', createdAt: '2026-10-01T12:00:00Z' }),
            lead({ campaignId: 'm2', campaignName: 'Miami coaches', createdAt: '2026-10-05T12:00:00Z' }),
        ]).leads;
        expect(foldNamedCampaigns(once).changed).toEqual([]);
    });
});
