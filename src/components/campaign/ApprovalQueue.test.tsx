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

// The pager renders above AND below the table, so every control exists twice.
// Driving the top copy is enough — they are the same component.
const nextButton = () => screen.getAllByRole('button', { name: /Next/ })[0];

// Both summaries, in DOM order. The `span` selector keeps the pager's wrapper
// <div>s out of the match: with only one page they hold no buttons, so their
// textContent is identical to the span's and they match the text too.
const summaries = () =>
    screen
        .getAllByText(/^Page \d+ of \d+ · showing/, { selector: 'span' })
        .map(el => el.textContent);

/** Asserts the summary AND that the two bars agree — they must never drift. */
const expectSummary = (text: string) => expect(summaries()).toEqual([text, text]);

describe('ApprovalQueue pagination', () => {
    beforeEach(() => localStorage.clear());

    it('mounts only one page of rows, however many leads there are', async () => {
        renderQueue(makeLeads(250));

        await rowsSettle(25);
        expectSummary('Page 1 of 10 · showing 1–25 of 250 leads');
    });

    it('shows no pagination controls when everything fits on one page', async () => {
        renderQueue(makeLeads(20));

        await rowsSettle(20);
        expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
    });

    // The bug this whole pager exists for: the controls used to appear only
    // below a six-screen table and only when there was more than one page, so
    // the queue read as a plain list. The summary has to state the model even
    // when there is nowhere to page to.
    it('still states the paging model when there is only one page', async () => {
        renderQueue(makeLeads(18));

        await rowsSettle(18);
        expectSummary('Page 1 of 1 · showing 1–18 of 18 leads');
    });

    // "0 of 250" is the reading the totals exist for, so a filter that matches
    // nothing keeps its bar — only a genuinely empty workspace loses it, where
    // the empty state's "go scrape some prospects" is the whole message.
    it('keeps the summary when a filter matches nothing', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(250));

        await user.type(screen.getByPlaceholderText(/search/i), 'nobody_here');

        expectSummary('Page 1 of 1 · showing 0–0 of 0 leads');
        expect(screen.getByText(/No leads match this filter/)).toBeInTheDocument();
    });

    it('advances to the next slice of leads', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(120));

        expect(handlesOnPage()[0]).toBe('founder_0');

        await user.click(nextButton());

        expect(handlesOnPage()[0]).toBe('founder_25');
        await rowsSettle(25);
        expectSummary('Page 2 of 5 · showing 26–50 of 120 leads');

        await user.click(screen.getAllByRole('button', { name: '5' })[0]);

        expect(handlesOnPage()[0]).toBe('founder_100');
        await rowsSettle(20); // last page is partial
        expectSummary('Page 5 of 5 · showing 101–120 of 120 leads');
    });

    it('acts on the lead in the row that was clicked, not the first one', async () => {
        const user = userEvent.setup();
        const onApproveLead = vi.fn();
        renderQueue(makeLeads(120), { onApproveLead });

        await user.click(nextButton());
        const secondRow = document.querySelectorAll('tbody tr')[1];
        await user.click(within(secondRow as HTMLElement).getByTitle('Approve'));

        expect(onApproveLead).toHaveBeenCalledWith('lead-26');
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

        await user.click(nextButton());
        expectSummary('Page 2 of 10 · showing 26–50 of 250 leads');

        await user.type(screen.getByPlaceholderText(/search/i), 'founder_1');

        expect(summaries()[0]).toMatch(/^Page 1 of \d+ · showing 1–/);
        expect(handlesOnPage()[0]).toBe('founder_1');
    });

    it('re-pages the table when rows-per-page changes, and persists the choice', async () => {
        const user = userEvent.setup();
        const { unmount } = renderQueue(makeLeads(250));

        await rowsSettle(25);
        await user.selectOptions(screen.getByLabelText('Rows per page'), '10');

        await rowsSettle(10);
        expectSummary('Page 1 of 25 · showing 1–10 of 250 leads');

        // A fresh visit reads the choice back rather than snapping to 25.
        unmount();
        renderQueue(makeLeads(250));
        await rowsSettle(10);
        expectSummary('Page 1 of 25 · showing 1–10 of 250 leads');
    });

    it('keeps the row you were looking at when the page size changes', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(250));

        await user.click(nextButton());
        await user.click(nextButton()); // page 3 of 25-row pages — leads 51–75
        expectSummary('Page 3 of 10 · showing 51–75 of 250 leads');

        await user.selectOptions(screen.getByLabelText('Rows per page'), '50');

        // Lead 51 is still the first row, now on page 2 of the wider pages.
        expectSummary('Page 2 of 5 · showing 51–100 of 250 leads');
        await rowsSettle(50);
        expect(handlesOnPage()[0]).toBe('founder_50');
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

        await user.click(nextButton());
        expectSummary('Page 2 of 10 · showing 26–50 of 250 leads');

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
