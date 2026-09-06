import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalQueue } from './ApprovalQueue';
import { ToastProvider } from '../common/Toast';
import type { Lead, AppConfig } from '../../lib/types';

function makeLeads(n: number): Lead[] {
    return Array.from({ length: n }, (_, i) => ({
        id: `lead-${i}`,
        handle: `founder_${i}`,
        name: `Founder ${i}`,
        followers: 1_000 + i,
        isPrivate: false,
        status: 'cold' as const,
        dmSent: false,
        replied: false,
        dmContent: `draft for founder ${i}`,
    }));
}

const config: AppConfig = {
    systemPrompt: '',
    includeKeywords: [],
    excludeKeywords: [],
    minFollowers: 0,
    maxFollowers: Number.MAX_SAFE_INTEGER,
    accountType: 'all',
    selectedAIProvider: 'claude',
    dailySendCap: 40,
};

function renderQueue(leads: Lead[], props: Partial<React.ComponentProps<typeof ApprovalQueue>> = {}) {
    return render(
        <ToastProvider>
            <ApprovalQueue
                leads={leads}
                config={config}
                onGenerateDMs={vi.fn()}
                isGenerating={false}
                {...props}
            />
        </ToastProvider>,
    );
}

const rowCount = () => document.querySelectorAll('tbody tr').length;

// A page mounts a chunk of rows per frame (see `useProgressiveCount`), so the
// full page is there a few frames after the click, not synchronously.
const rowsSettle = (expected: number) => waitFor(() => expect(rowCount()).toBe(expected));

// Read the index off the DM cell, not the handle: row text runs the handle
// straight into the follower count ("@founder_0" + "1.0K"), so a `\d+` match on
// the handle swallows the count's leading digit.
const handlesOnPage = () =>
    [...document.querySelectorAll('tbody tr')].map(tr => {
        const n = tr.textContent?.match(/draft for founder (\d+)/)?.[1];
        return n === undefined ? '' : `founder_${n}`;
    });

describe('ApprovalQueue pagination', () => {
    beforeEach(() => localStorage.clear());

    it('mounts only one page of rows, however many leads there are', async () => {
        renderQueue(makeLeads(250));

        await rowsSettle(50);
        expect(screen.getByText('1–50 of 250')).toBeInTheDocument();
    });

    it('shows no pagination controls when everything fits on one page', async () => {
        renderQueue(makeLeads(30));

        await rowsSettle(30);
        expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
    });

    it('advances to the next slice of leads', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(120));

        expect(handlesOnPage()[0]).toBe('founder_0');

        await user.click(screen.getByRole('button', { name: /Next/ }));

        expect(handlesOnPage()[0]).toBe('founder_50');
        await rowsSettle(50);
        expect(screen.getByText('51–100 of 120')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Next/ }));

        expect(handlesOnPage()[0]).toBe('founder_100');
        await rowsSettle(20); // last page is partial
    });

    it('acts on the lead in the row that was clicked, not the first one', async () => {
        const user = userEvent.setup();
        const onApproveLead = vi.fn();
        renderQueue(makeLeads(120), { onApproveLead });

        await user.click(screen.getByRole('button', { name: /Next/ }));
        const secondRow = document.querySelectorAll('tbody tr')[1];
        await user.click(within(secondRow as HTMLElement).getByTitle('Approve'));

        expect(onApproveLead).toHaveBeenCalledWith('lead-51');
    });

    it('select-all covers every filtered lead, not just the visible page', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(250));

        await user.click(screen.getByTitle('Select all'));

        expect(screen.getByText(/Delete selected \(250\)/)).toBeInTheDocument();
    });

    it('returns to page 1 when the filter changes', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(250));

        await user.click(screen.getByRole('button', { name: /Next/ }));
        expect(screen.getByText('51–100 of 250')).toBeInTheDocument();

        await user.type(screen.getByPlaceholderText(/search/i), 'founder_1');

        expect(screen.getByText(/^1–/)).toBeInTheDocument();
        expect(handlesOnPage()[0]).toBe('founder_1');
    });

    it('never re-sends a lead the extension already confirmed', async () => {
        const user = userEvent.setup();
        const leads = makeLeads(4).map((l, i) => ({
            ...l,
            approved: true,
            dmContent: `draft for founder ${i}`,
            dmSent: i < 2, // first two already went out
        }));
        const posted = vi.spyOn(window, 'postMessage');
        renderQueue(leads);

        await user.click(screen.getByRole('button', { name: /Send Approved to Extension/ }));

        const payload = posted.mock.calls
            .map(([msg]) => msg as { type?: string; payload?: { leads: { handle: string }[] } })
            .find(msg => msg?.type === 'MAGNET_ENGINE_CAMPAIGN')?.payload;

        expect(payload?.leads.map(l => l.handle)).toEqual(['founder_2', 'founder_3']);
        posted.mockRestore();
    });

    it('refuses to send when every approved lead is already sent', async () => {
        const user = userEvent.setup();
        const leads = makeLeads(3).map((l, i) => ({
            ...l, approved: true, dmContent: `draft for founder ${i}`, dmSent: true,
        }));
        const posted = vi.spyOn(window, 'postMessage');
        renderQueue(leads);

        await user.click(screen.getByRole('button', { name: /Send Approved to Extension/ }));

        expect(posted.mock.calls.some(([m]) => (m as { type?: string })?.type === 'MAGNET_ENGINE_CAMPAIGN')).toBe(false);
        expect(await screen.findByText(/already been sent/i)).toBeInTheDocument();
        posted.mockRestore();
    });

    it('clamps the page when the lead list shrinks under it', async () => {
        const user = userEvent.setup();
        const { rerender } = renderQueue(makeLeads(250));

        await user.click(screen.getByRole('button', { name: /Next/ }));
        expect(screen.getByText('51–100 of 250')).toBeInTheDocument();

        rerender(
            <ToastProvider>
                <ApprovalQueue
                    leads={makeLeads(20)}
                    config={config}
                    onGenerateDMs={vi.fn()}
                    isGenerating={false}
                />
            </ToastProvider>,
        );

        await rowsSettle(20);
        expect(handlesOnPage()[0]).toBe('founder_0');
    });
});
