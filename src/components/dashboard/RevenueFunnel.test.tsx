import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RevenueFunnel } from './RevenueFunnel';
import { WeeklyReport } from './WeeklyReport';
import type { Lead } from '../../lib/types';

const now = new Date();
const thisMonth = (day: number) => new Date(now.getFullYear(), now.getMonth(), day, 10).toISOString();

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

const leads = [
    lead({ createdAt: thisMonth(1), dmSent: true, dmDate: thisMonth(1) }),
    lead({
        createdAt: thisMonth(1), dmSent: true, dmDate: thisMonth(1), replied: true, positiveReply: true, booked: true,
        qualifiedAt: thisMonth(1), bookedAt: thisMonth(1), closedAt: thisMonth(1), dealValue: 3000, cashCollected: 1000,
    }),
];

describe('RevenueFunnel', () => {
    it('shows the month’s money and funnel, and all time on request', async () => {
        render(<RevenueFunnel leads={leads} />);
        expect(screen.getByText('$3,000')).toBeInTheDocument();
        expect(screen.getByText('$1,000')).toBeInTheDocument();
        expect(screen.getByText('$2,000')).toBeInTheDocument();
        const funnel = screen.getByText('Funnel').closest('div')!.parentElement!;
        expect(within(funnel).getByText('New leads').closest('li')).toHaveTextContent('2');
        expect(within(funnel).getByText('Won').closest('li')).toHaveTextContent('1');

        await userEvent.selectOptions(screen.getByLabelText('Period'), 'all');
        expect(screen.getByText('Deals won')).toBeInTheDocument();
    });

    it('explains where revenue comes from before any deal is recorded', () => {
        render(<RevenueFunnel leads={[lead({})]} />);
        expect(screen.getByText(/Revenue counts the deals you record as won/)).toBeInTheDocument();
    });
});

describe('WeeklyReport', () => {
    it('renders the week and cannot step past this week', () => {
        render(<WeeklyReport leads={leads} />);
        expect(screen.getByText(/^This week ·/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next week' })).toBeDisabled();
    });
});
