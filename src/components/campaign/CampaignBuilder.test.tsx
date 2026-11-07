import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignBuilder } from './CampaignBuilder';
import { invokeFunction } from '../../lib/functions';
import { demoScrape } from '../../lib/scrapeDemo';
import { campaignsOf } from '../../lib/queue';
import type { Lead } from '../../lib/types';

/**
 * The Campaign Builder driven the way an Operator drives it, against the demo
 * transport (the `scrape` function's own shapes): pick a source, run it, add
 * the results to the queue.
 */
vi.mock('../../lib/functions', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../lib/functions')>()),
    invokeFunction: vi.fn(),
}));

beforeEach(() => {
    // The campaign name is remembered in the browser; each test starts blank.
    localStorage.clear();
    vi.mocked(invokeFunction).mockReset();
    vi.mocked(invokeFunction).mockImplementation(async (_name, body) => demoScrape(body, { delayMs: 0 }));
});

describe('CampaignBuilder', () => {
    it('offers all nine sources, with no provider named anywhere', () => {
        render(<CampaignBuilder onLeadsScraped={vi.fn()} />);
        for (const label of ['Keyword search', 'Hashtag', 'Followers', 'Following', 'Post likers',
            'Post commenters', 'Location', 'Similar accounts', 'Handle list']) {
            expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
        }
        expect(document.body.textContent).not.toMatch(/hiker|apify/i);
    });

    it('scrapes a following list and adds it to the queue under a campaign named for the source', async () => {
        const user = userEvent.setup();
        const onLeadsScraped = vi.fn();
        render(<CampaignBuilder onLeadsScraped={onLeadsScraped} />);

        await user.click(screen.getByRole('button', { name: /^Following/ }));
        await user.type(screen.getByLabelText(/^Accounts/), '@competitor');
        await user.selectOptions(screen.getByLabelText(/^Profiles per account/), '50');
        expect(screen.getByText(/1 account × 50 = up to 50 profiles/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Start scrape/ }));
        // Five details batches: slow under a full parallel run, like the test below.
        const add = await screen.findAllByRole('button', { name: /Add 50 to Queue/ }, { timeout: 5000 });

        await user.click(add[0]);
        expect(onLeadsScraped).toHaveBeenCalledTimes(1);
        const leads = onLeadsScraped.mock.calls[0][0];
        expect(leads).toHaveLength(50);
        expect(leads[0].campaignName).toMatch(/^Followed by @competitor · /);
        expect(leads.every((l: { bio?: string }) => l.bio)).toBe(true); // details loaded
    });

    it("refuses a search the month's campaigns can't hold, before any lookup is spent", async () => {
        const user = userEvent.setup();
        const onBeforeSearch = vi.fn(async () => ({ known: new Set<string>(), exclude: [], leadsLeft: 300, campaignsLeft: 0 }));
        render(<CampaignBuilder onLeadsScraped={vi.fn()} onBeforeSearch={onBeforeSearch} />);

        await user.click(screen.getByRole('button', { name: /^Following/ }));
        await user.type(screen.getByLabelText(/^Accounts/), '@competitor');
        await user.click(screen.getByRole('button', { name: /Start scrape/ }));

        expect(await screen.findByText(/used all 6 campaigns this month/)).toBeInTheDocument();
        expect(invokeFunction).not.toHaveBeenCalled();
    });

    it("stops at the room left in the month's lead quota and passes over people already in the queue", async () => {
        const user = userEvent.setup();
        const onLeadsScraped = vi.fn();
        // The demo following list's first person, already in the queue.
        const first = (await demoScrape({ op: 'page', source: { kind: 'following', query: 'competitor' } }, { delayMs: 0 }) as { rows: { username: string }[] }).rows[0].username;
        vi.mocked(invokeFunction).mockClear();
        const onBeforeSearch = vi.fn(async () => ({ known: new Set([first]), exclude: [], leadsLeft: 20, campaignsLeft: 3 }));
        render(<CampaignBuilder onLeadsScraped={onLeadsScraped} onBeforeSearch={onBeforeSearch} />);

        await user.click(screen.getByRole('button', { name: /^Following/ }));
        await user.type(screen.getByLabelText(/^Accounts/), '@competitor');
        await user.click(screen.getByRole('button', { name: /Start scrape/ }));

        const add = await screen.findAllByRole('button', { name: /Add 20 to Queue/ }, { timeout: 5000 });
        expect(screen.getByText(/1 profile already in your queue/)).toBeInTheDocument();
        expect(screen.getByText(/Stopped at 20 profiles/)).toBeInTheDocument();
        await user.click(add[0]);
        const leads = onLeadsScraped.mock.calls[0][0] as { handle: string }[];
        expect(leads.map(l => l.handle)).not.toContain(first);
    });

    it('defaults to everything, and can pause, resume, and finish with what was found', async () => {
        const user = userEvent.setup();
        // The demo following list is 180 profiles, 50 a page. Pages 2 and 3 are
        // held until the test lets them go, so the run is still going each
        // time the Operator presses Pause.
        const gates = new Map<number, () => void>();
        let pages = 0;
        vi.mocked(invokeFunction).mockImplementation(async (_name, body) => {
            if (body.op === 'page') {
                const n = ++pages;
                if (n === 2 || n === 3) await new Promise<void>(r => gates.set(n, r));
            }
            return demoScrape(body, { delayMs: 0 });
        });
        const onLeadsScraped = vi.fn();
        render(<CampaignBuilder onLeadsScraped={onLeadsScraped} />);

        await user.click(screen.getByRole('button', { name: /^Following/ }));
        await user.type(screen.getByLabelText(/^Accounts/), '@competitor');
        expect(screen.getByText(/up to 500 profiles$/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Start scrape/ }));
        await waitFor(() => expect(gates.has(2)).toBe(true));
        await user.click(screen.getByRole('button', { name: /^Pause$/ }));
        gates.get(2)!();

        expect(await screen.findByText(/Paused — 100 profiles found so far/)).toBeInTheDocument();
        expect(pages).toBe(2);                              // nothing spent while paused
        await user.click(screen.getByRole('button', { name: /^Resume$/ }));
        await waitFor(() => expect(gates.has(3)).toBe(true));

        await user.click(screen.getByRole('button', { name: /^Pause$/ }));
        gates.get(3)!();
        await user.click(await screen.findByRole('button', { name: /^Use the 150 found$/ }));
        const add = await screen.findAllByRole('button', { name: /Add 150 to Queue/ }, { timeout: 5000 });
        await user.click(add[0]);

        const leads = onLeadsScraped.mock.calls[0][0];
        expect(leads).toHaveLength(150);                     // finished before the list's 180 ran out
        expect(pages).toBe(3);
        expect(leads.every((l: { bio?: string }) => l.bio)).toBe(true); // details still loaded
    }, 15_000);                                             // 15 details batches, slow under a full parallel run

    it("states Instagram's ~50-follower cap instead of offering a limit it can't meet", async () => {
        const user = userEvent.setup();
        render(<CampaignBuilder onLeadsScraped={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: /^Followers/ }));
        expect(screen.queryByLabelText(/^Profiles per account/)).not.toBeInTheDocument();
        expect(screen.getByText('About 50 per account')).toBeInTheDocument();

        await user.type(screen.getByLabelText(/^Accounts/), 'a, b, c');
        expect(screen.getByText(/3 accounts × ~50 = about 150 profiles/)).toBeInTheDocument();
    });

    it("shows a query's own reason when it comes back empty", async () => {
        const user = userEvent.setup();
        render(<CampaignBuilder onLeadsScraped={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: /^Followers/ }));
        await user.type(screen.getByLabelText(/^Accounts/), 'shy_private');
        await user.click(screen.getByRole('button', { name: /Start scrape/ }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            "@shy_private is private — Instagram doesn't show its followers list to anyone.",
        );
    });

    it('keeps every search under one name in one campaign, and keeps the name', async () => {
        const user = userEvent.setup();
        const onLeadsScraped = vi.fn();
        const { rerender, unmount } = render(<CampaignBuilder onLeadsScraped={onLeadsScraped} campaigns={[]} />);

        await user.type(screen.getByLabelText(/^Campaign name/), 'Miami coaches');
        expect(screen.getByText(/A new campaign\./)).toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: /^Handle list/ }));
        await user.type(screen.getByLabelText(/^Usernames/), 'jane.coaching{enter}miami_realtor');
        await user.click(screen.getByRole('button', { name: /^Look up$/ }));
        await user.click((await screen.findAllByRole('button', { name: /Add 2 to Queue/ }))[0]);

        const first = onLeadsScraped.mock.calls[0][0] as Lead[];
        expect(first.every(l => l.campaignName === 'Miami coaches')).toBe(true);

        // The shell hands the new campaign back. The name is still in the field,
        // so the next search, from another source, joins it.
        rerender(<CampaignBuilder onLeadsScraped={onLeadsScraped} campaigns={campaignsOf(first)} />);
        expect(screen.getByLabelText(/^Campaign name/)).toHaveValue('Miami coaches');
        expect(screen.getByText(/2 leads so far/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /^Following/ }));
        await user.type(screen.getByLabelText(/^Accounts/), '@competitor');
        await user.selectOptions(screen.getByLabelText(/^Profiles per account/), '50');
        await user.click(screen.getByRole('button', { name: /Start scrape/ }));
        await user.click((await screen.findAllByRole('button', { name: /Add 50 to Queue/ }, { timeout: 5000 }))[0]);

        const second = onLeadsScraped.mock.calls[1][0] as Lead[];
        expect(new Set(second.map(l => l.campaignId))).toEqual(new Set([first[0].campaignId]));
        expect(second.every(l => l.campaignName === 'Miami coaches')).toBe(true);

        // And it is still there after leaving the page.
        unmount();
        render(<CampaignBuilder onLeadsScraped={onLeadsScraped} campaigns={campaignsOf([...first, ...second])} />);
        expect(screen.getByLabelText(/^Campaign name/)).toHaveValue('Miami coaches');
    }, 15_000);

    it("lets a search join a campaign it already has when the month's campaigns are used up", async () => {
        const user = userEvent.setup();
        const existing = campaignsOf([{
            id: 'x', campaignId: 'miami', campaignName: 'Miami coaches', handle: 'x', name: 'x',
            followers: 0, isPrivate: false, status: 'cold', dmSent: false, replied: false,
        }]);
        const onBeforeSearch = vi.fn(async () => ({ known: new Set<string>(), exclude: [], leadsLeft: 300, campaignsLeft: 0 }));
        render(<CampaignBuilder onLeadsScraped={vi.fn()} onBeforeSearch={onBeforeSearch} campaigns={existing} />);

        await user.type(screen.getByLabelText(/^Campaign name/), 'miami coaches');
        await user.click(screen.getByRole('button', { name: /^Handle list/ }));
        await user.type(screen.getByLabelText(/^Usernames/), 'jane.coaching');
        await user.click(screen.getByRole('button', { name: /^Look up$/ }));

        expect((await screen.findAllByRole('button', { name: /Add 1 to Queue/ })).length).toBeGreaterThan(0);
        expect(screen.queryByText(/used all 6 campaigns/)).not.toBeInTheDocument();
    });

    it('looks up a pasted handle list in full', async () => {
        const user = userEvent.setup();
        render(<CampaignBuilder onLeadsScraped={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: /^Handle list/ }));
        await user.type(screen.getByLabelText(/^Usernames/), 'jane.coaching{enter}miami_realtor{enter}nobody_here');
        await user.click(screen.getByRole('button', { name: /^Look up$/ }));

        await waitFor(() => expect(screen.getAllByRole('button', { name: /Add 2 to Queue/ }).length).toBeGreaterThan(0));
        expect(screen.getByText('Not on Instagram: @nobody_here.')).toBeInTheDocument();
    });
});
