import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApprovalQueue } from './ApprovalQueue';
import { ToastProvider } from '../common/Toast';
import type { Lead, AppConfig } from '../../lib/types';

/** Drafts waiting to be read — the To review stage — in one campaign unless told otherwise. */
function makeLeads(n: number, over: Partial<Lead> = {}, prefix = 'lead'): Lead[] {
    return Array.from({ length: n }, (_, i) => ({
        id: `${prefix}-${i}`,
        handle: `${prefix === 'lead' ? 'founder' : prefix}_${i}`,
        name: `Founder ${i}`,
        followers: 1_000 + i,
        isPrivate: false,
        status: 'cold' as const,
        dmSent: false,
        replied: false,
        dmContent: `draft for founder ${i}`,
        ...over,
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
// straight into the follower count, so a `\d+` match on the handle swallows
// the count's leading digit.
const handlesOnPage = () =>
    [...document.querySelectorAll('tbody tr')].map(tr => {
        const n = tr.textContent?.match(/draft for founder (\d+)/)?.[1];
        return n === undefined ? '' : `founder_${n}`;
    });

const nextButton = () => screen.getByRole('button', { name: /Next/ });

/** The pager's one-line statement of the paging model. */
const summary = () =>
    [...document.querySelectorAll('span')]
        .map(s => s.textContent ?? '')
        .find(t => /^\d+–\d+ of \d+ · page \d+ of \d+$/.test(t));

const tab = (name: RegExp) => screen.getByRole('tab', { name });

describe('ApprovalQueue pagination', () => {
    beforeEach(() => localStorage.clear());

    it('mounts only one page of rows, however many leads there are', async () => {
        renderQueue(makeLeads(250));

        await rowsSettle(25);
        expect(summary()).toBe('1–25 of 250 · page 1 of 10');
    });

    it('shows no page controls when everything fits on one page', async () => {
        renderQueue(makeLeads(20));

        await rowsSettle(20);
        expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
    });

    // The bug the pager exists for: with controls only at the bottom and only
    // when there was more than one page, a long page that ended read as "that's
    // everything". The summary states the model even with nowhere to page to.
    it('still states the paging model when there is only one page', async () => {
        renderQueue(makeLeads(18));

        await rowsSettle(18);
        expect(summary()).toBe('1–18 of 18 · page 1 of 1');
    });

    it('says what matched nothing, and offers to clear the search', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(250));

        await user.type(screen.getByPlaceholderText(/search/i), 'nobody_here');

        expect(screen.getByText('No leads match "nobody_here"')).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Clear search' }));
        await rowsSettle(25);
    });

    it('advances to the next slice of leads', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(120));

        expect(handlesOnPage()[0]).toBe('founder_0');

        await user.click(nextButton());

        expect(handlesOnPage()[0]).toBe('founder_25');
        await rowsSettle(25);
        expect(summary()).toBe('26–50 of 120 · page 2 of 5');

        await user.click(screen.getByRole('button', { name: '5' }));

        expect(handlesOnPage()[0]).toBe('founder_100');
        await rowsSettle(20); // last page is partial
        expect(summary()).toBe('101–120 of 120 · page 5 of 5');
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

    it('select-all covers every lead in the view, not just the visible page', async () => {
        const user = userEvent.setup();
        const onApproveLeads = vi.fn();
        renderQueue(makeLeads(250), { onApproveLeads });

        await user.click(screen.getByLabelText('Select all 250 leads in this view'));
        expect(screen.getByText('selected').textContent).toBe('250 selected');

        await user.click(screen.getByRole('button', { name: 'Approve 250' }));
        expect(onApproveLeads).toHaveBeenCalledWith(makeLeads(250).map(l => l.id));
    });

    it('returns to page 1 when the search changes', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(250));

        await user.click(nextButton());
        expect(summary()).toBe('26–50 of 250 · page 2 of 10');

        await user.type(screen.getByPlaceholderText(/search/i), 'founder_1');

        expect(summary()).toMatch(/^1–\d+ of \d+ · page 1 of \d+$/);
        expect(handlesOnPage()[0]).toBe('founder_1');
    });

    it('re-pages the table when rows-per-page changes, and persists the choice', async () => {
        const user = userEvent.setup();
        const { unmount } = renderQueue(makeLeads(250));

        await rowsSettle(25);
        await user.selectOptions(screen.getByLabelText('Rows per page'), '10');

        await rowsSettle(10);
        expect(summary()).toBe('1–10 of 250 · page 1 of 25');

        // A fresh visit reads the choice back rather than snapping to 25.
        unmount();
        renderQueue(makeLeads(250));
        await rowsSettle(10);
        expect(summary()).toBe('1–10 of 250 · page 1 of 25');
    });

    it('keeps the row you were looking at when the page size changes', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(250));

        await user.click(nextButton());
        await user.click(nextButton()); // leads 51–75
        expect(summary()).toBe('51–75 of 250 · page 3 of 10');

        await user.selectOptions(screen.getByLabelText('Rows per page'), '50');

        // Lead 51 is still the first row, now on page 2 of the wider pages.
        expect(summary()).toBe('51–100 of 250 · page 2 of 5');
        await rowsSettle(50);
        expect(handlesOnPage()[0]).toBe('founder_50');
    });

    it('clamps the page when the lead list shrinks under it', async () => {
        const user = userEvent.setup();
        const { rerender } = renderQueue(makeLeads(250));

        await user.click(nextButton());
        expect(summary()).toBe('26–50 of 250 · page 2 of 10');

        rerender(
            <ToastProvider>
                <ApprovalQueue leads={makeLeads(20)} config={config} onGenerateDMs={vi.fn()} isGenerating={false} />
            </ToastProvider>,
        );

        await rowsSettle(20);
        expect(handlesOnPage()[0]).toBe('founder_0');
    });
});

describe('ApprovalQueue campaigns', () => {
    beforeEach(() => localStorage.clear());

    // The owner's ask: a fresh scrape must not land among Leads already
    // written, approved or sent, so it can be looked at — and written — on purpose.
    it('opens on the newest campaign, at its first stage with work, and shows only that campaign', async () => {
        const older = makeLeads(4, { campaignId: 'old', campaignName: 'Older campaign', createdAt: '2026-10-01T12:00:00Z' }, 'old');
        const fresh = makeLeads(3, {
            campaignId: 'new', campaignName: 'Fresh scrape', createdAt: '2026-10-20T12:00:00Z', dmContent: undefined,
        }, 'new');
        renderQueue([...older, ...fresh]);

        expect(tab(/^To write/)).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('button', { name: /^Fresh scrape, Oct 20: 3 to write$/ })).toHaveAttribute('aria-pressed', 'true');
        await rowsSettle(3);
        expect(document.querySelector('tbody')!.textContent).not.toMatch(/old_\d/);
        expect(screen.getByText(/have no DM yet/)).toHaveTextContent('3 leads in Fresh scrape have no DM yet');
    });

    it('writes the whole campaign on one press, not ten at a time', async () => {
        const user = userEvent.setup();
        const onGenerateDMs = vi.fn();
        const fresh = makeLeads(30, { campaignId: 'new', campaignName: 'Fresh scrape', dmContent: undefined }, 'new');
        renderQueue(fresh, { onGenerateDMs });

        await user.click(screen.getByRole('button', { name: 'Write 30 DMs' }));

        const [list, options] = onGenerateDMs.mock.calls[0];
        expect((list as Lead[]).map(l => l.id)).toEqual(fresh.map(l => l.id));
        expect(options).toEqual({ all: true });
    });

    it('shows progress and a Stop while a campaign is being written', async () => {
        const user = userEvent.setup();
        const onStopGenerating = vi.fn();
        renderQueue(makeLeads(30, { dmContent: undefined }), {
            isGenerating: true, generation: { done: 12, total: 30 }, onStopGenerating,
        });

        expect(screen.getByRole('status')).toHaveTextContent('Writing DMs… 12 of 30');
        await user.click(screen.getByRole('button', { name: 'Stop' }));
        expect(onStopGenerating).toHaveBeenCalled();
    });

    it('jumps to where a campaign\'s work is when its chip is picked', async () => {
        const user = userEvent.setup();
        const fresh = makeLeads(2, { campaignId: 'new', campaignName: 'Fresh scrape', createdAt: '2026-10-20T12:00:00Z', dmContent: undefined }, 'new');
        const drafts = makeLeads(5, { campaignId: 'old', campaignName: 'Drafted campaign', createdAt: '2026-10-01T12:00:00Z' }, 'old');
        renderQueue([...fresh, ...drafts]);

        expect(tab(/^To write/)).toHaveAttribute('aria-selected', 'true');
        await user.click(screen.getByRole('button', { name: /^Drafted campaign/ }));

        expect(tab(/^To review/)).toHaveAttribute('aria-selected', 'true');
        await rowsSettle(5);
    });

    it('keeps sent leads out of the stages, in Sent', async () => {
        const user = userEvent.setup();
        const leads = [
            ...makeLeads(2),
            ...makeLeads(3, { approved: true, dmSent: true }, 'sent'),
        ];
        renderQueue(leads);

        await rowsSettle(2);
        expect(document.querySelector('tbody')!.textContent).not.toMatch(/sent_\d/);

        await user.click(tab(/^Sent/));
        await rowsSettle(3);
        expect(screen.getAllByText('No reply yet')).toHaveLength(3);
    });
});

describe('ApprovalQueue approval safety', () => {
    beforeEach(() => localStorage.clear());

    it('asks before approving every draft, and approves nothing if you keep reviewing', async () => {
        const user = userEvent.setup();
        const onApproveLeads = vi.fn();
        renderQueue(makeLeads(4), { onApproveLeads });

        await user.click(screen.getByRole('button', { name: 'Approve 4 DMs' }));
        expect(screen.getByText('Approve 4 drafts without reading them?')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Keep reviewing' }));
        expect(onApproveLeads).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'Approve 4 DMs' }));
        await user.click(screen.getByRole('button', { name: 'Approve 4 drafts' }));
        expect(onApproveLeads).toHaveBeenCalledWith(['lead-0', 'lead-1', 'lead-2', 'lead-3']);
    });

    it('offers an undo after a bulk approve', async () => {
        const user = userEvent.setup();
        const onUnapproveLeads = vi.fn();
        renderQueue(makeLeads(2), { onApproveLeads: vi.fn(), onUnapproveLeads });

        await user.click(screen.getByRole('button', { name: 'Approve 2 DMs' }));
        await user.click(screen.getByRole('button', { name: 'Approve 2 drafts' }));
        await user.click(await screen.findByRole('button', { name: 'Undo' }));

        expect(onUnapproveLeads).toHaveBeenCalledWith(['lead-0', 'lead-1']);
    });

    // Skimming fast, the next row sliding up under a just-clicked Approve is
    // how the wrong person gets approved. The row stays where it was.
    it('keeps an approved row in place, with an undo, instead of pulling the next one up', async () => {
        const user = userEvent.setup();
        const leads = makeLeads(3);
        const onApproveLead = vi.fn();
        const onUnapproveLeads = vi.fn();
        const { rerender } = renderQueue(leads, { onApproveLead, onUnapproveLeads });
        await rowsSettle(3);

        await user.click(within(document.querySelectorAll('tbody tr')[0] as HTMLElement).getByTitle('Approve'));
        expect(onApproveLead).toHaveBeenCalledWith('lead-0');

        // The engine's update arrives: lead-0 is approved now.
        const approved = leads.map(l => (l.id === 'lead-0' ? { ...l, approved: true } : l));
        rerender(
            <ToastProvider>
                <ApprovalQueue leads={approved} config={config} onGenerateDMs={vi.fn()} isGenerating={false}
                    onApproveLead={onApproveLead} onUnapproveLeads={onUnapproveLeads} />
            </ToastProvider>,
        );

        await rowsSettle(3);
        expect(handlesOnPage()[0]).toBe('founder_0');
        expect(tab(/^To review/)).toHaveTextContent('2');
        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(onUnapproveLeads).toHaveBeenCalledWith(['lead-0']);
    });

    it('sends skipped leads to Skipped, where they can be restored', async () => {
        const user = userEvent.setup();
        const onRestoreLeads = vi.fn();
        renderQueue([...makeLeads(2), ...makeLeads(1, { rejected: true }, 'skip')], { onRestoreLeads });

        await rowsSettle(2);
        await user.click(tab(/^Skipped/));
        await rowsSettle(1);
        await user.click(screen.getByRole('button', { name: 'Restore @skip_0' }));

        expect(onRestoreLeads).toHaveBeenCalledWith(['skip-0']);
    });

    it('asks inline before deleting, and deletes nothing on Cancel', async () => {
        const user = userEvent.setup();
        const onDeleteLeads = vi.fn();
        renderQueue(makeLeads(3), { onDeleteLeads, onDeleteLead: vi.fn() });

        await user.click(screen.getByLabelText('Select @founder_0'));
        await user.click(screen.getByLabelText('Select @founder_1'));
        await user.click(screen.getByRole('button', { name: 'Delete' }));
        expect(screen.getByRole('alertdialog')).toHaveTextContent("Delete 2 leads from the queue? This can't be undone.");

        await user.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onDeleteLeads).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'Delete' }));
        await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
        expect(onDeleteLeads).toHaveBeenCalledWith(['lead-0', 'lead-1']);
    });

    it('names the next mark a sent lead can take', async () => {
        const user = userEvent.setup();
        const onUpdateLead = vi.fn();
        renderQueue(makeLeads(1, { approved: true, dmSent: true, replied: true }), { onUpdateLead });

        await user.click(tab(/^Sent/));
        await user.click(screen.getByRole('button', { name: "Mark @founder_0's reply as interested" }));
        expect(onUpdateLead).toHaveBeenCalledWith(expect.objectContaining({ positiveReply: true }));
    });

    it('shows the whole DM, not a clamped preview', async () => {
        const long = 'word '.repeat(120).trim();
        renderQueue(makeLeads(1, { dmContent: long }));

        const dm = await screen.findByText(long);
        expect(dm.className).not.toMatch(/line-clamp/);
    });
});

describe('ApprovalQueue sending', () => {
    beforeEach(() => localStorage.clear());

    const sentPayload = (posted: { mock: { calls: unknown[][] } }) =>
        posted.mock.calls
            .map(([msg]) => msg as { type?: string; payload?: { leads: { handle: string }[] } })
            .find(msg => msg?.type === 'MAGNET_ENGINE_CAMPAIGN')?.payload;

    it('never re-sends a lead the extension already confirmed', async () => {
        const user = userEvent.setup();
        const leads = makeLeads(4).map((l, i) => ({ ...l, approved: true, dmSent: i < 2 }));
        const posted = vi.spyOn(window, 'postMessage');
        renderQueue(leads);

        await user.click(screen.getByRole('button', { name: 'Send 2 approved DMs' }));
        // Nothing leaves before the Operator confirms.
        expect(sentPayload(posted)).toBeUndefined();
        await user.click(screen.getByRole('button', { name: 'Send 2 DMs' }));

        expect(sentPayload(posted)?.leads.map(l => l.handle)).toEqual(['founder_2', 'founder_3']);
        posted.mockRestore();
    });

    // The extension REPLACES its queue with every Handoff, so sending one campaign
    // alone would drop another campaign's approved DMs on the floor.
    it('hands over every approved DM, whatever campaign is on screen', async () => {
        const user = userEvent.setup();
        const a = makeLeads(2, { approved: true, campaignId: 'a', campaignName: 'Campaign A', createdAt: '2026-10-20T12:00:00Z' }, 'a');
        const b = makeLeads(3, { approved: true, campaignId: 'b', campaignName: 'Campaign B', createdAt: '2026-10-10T12:00:00Z' }, 'b');
        const posted = vi.spyOn(window, 'postMessage');
        renderQueue([...a, ...b]);

        expect(screen.getByRole('button', { name: /^Campaign A/ })).toHaveAttribute('aria-pressed', 'true');
        // Campaign A is on screen, so the band says the send reaches past it.
        expect(screen.getByText(/in another campaign/)).toHaveTextContent('2 approved in this campaign, 3 in another campaign');
        await user.click(screen.getByRole('button', { name: 'Send all 5 DMs' }));
        await user.click(screen.getByRole('button', { name: 'Send 5 DMs' }));

        expect(sentPayload(posted)?.leads).toHaveLength(5);
        posted.mockRestore();
    });

    it('stamps a delivered Handoff as Handed off, and never calls it Sent', async () => {
        const user = userEvent.setup();
        const onMarkHandedOff = vi.fn();
        renderQueue(makeLeads(2, { approved: true }), { onMarkHandedOff });

        await user.click(screen.getByRole('button', { name: 'Send 2 approved DMs' }));
        await user.click(screen.getByRole('button', { name: 'Send 2 DMs' }));

        // No handshake has answered yet, which `accepts` treats optimistically,
        // so the Handoff is delivered.
        expect(onMarkHandedOff).toHaveBeenCalledWith(['lead-0', 'lead-1']);
        const toastText = (await screen.findByText(/handed to the extension/)).textContent ?? '';
        expect(toastText).toMatch(/shows Sent once the extension confirms it/);
    });

    it('says plainly when there is nothing approved to send', async () => {
        const user = userEvent.setup();
        renderQueue(makeLeads(3, { approved: true, dmSent: true }));

        await user.click(tab(/^To send/));
        expect(screen.getByText('Nothing approved yet')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Send/ })).not.toBeInTheDocument();
    });
});
