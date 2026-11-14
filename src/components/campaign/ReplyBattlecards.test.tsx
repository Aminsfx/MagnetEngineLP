import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReplyBattlecards } from './ReplyBattlecards';
import type { Lead } from '../../lib/types';

const lead: Lead = {
    id: 'l1', campaignId: 'c1', handle: 'maya.builds', name: 'Maya R.', followers: 1000,
    isPrivate: false, status: 'cold', dmSent: true, replied: true,
};

const ledger = { callLength: '20 minutes', callPromise: 'map out your next month', calendarLink: 'https://cal.example/me' };

// The regression: "They're interested" set `positiveReply` and no
// `qualifiedAt`. The dashboard counts Qualified in a period by that date, so
// the Lead was Qualified under "All time" and in no week, month or quarter.
describe('the "they\'re interested" card', () => {
    it('marks the Lead qualified with the date it happened', async () => {
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true });
        const onUpdateLead = vi.fn();
        render(<ReplyBattlecards lead={lead} ledger={ledger} onUpdateLead={onUpdateLead} />);

        await userEvent.click(screen.getAllByRole('button', { name: /copy reply/i })[0]);

        expect(onUpdateLead).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
            positiveReply: true,
            qualifiedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }));
    });

    it('keeps the date of a Lead qualified earlier', async () => {
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true });
        const onUpdateLead = vi.fn();
        render(<ReplyBattlecards lead={{ ...lead, positiveReply: true, qualifiedAt: '2026-11-01T09:00:00.000Z' }} ledger={ledger} onUpdateLead={onUpdateLead} />);

        await userEvent.click(screen.getAllByRole('button', { name: /copy reply/i })[0]);

        expect(onUpdateLead).not.toHaveBeenCalled();
    });
});
