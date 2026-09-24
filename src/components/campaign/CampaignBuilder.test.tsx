import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampaignBuilder } from './CampaignBuilder';
import { invokeFunction } from '../../lib/functions';
import { demoScrape } from '../../lib/scrapeDemo';

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

    it('scrapes followers and adds them to the queue under a campaign named for the source', async () => {
        const user = userEvent.setup();
        const onLeadsScraped = vi.fn();
        render(<CampaignBuilder onLeadsScraped={onLeadsScraped} />);

        await user.click(screen.getByRole('button', { name: /^Followers/ }));
        await user.type(screen.getByLabelText(/^Accounts/), '@competitor');
        await user.selectOptions(screen.getByLabelText(/^Profiles per account/), '25');
        expect(screen.getByText(/1 account × 25 = up to 25 profiles/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: /Start scrape/ }));
        const add = await screen.findAllByRole('button', { name: /Add 25 to Queue/ });

        await user.click(add[0]);
        expect(onLeadsScraped).toHaveBeenCalledTimes(1);
        const leads = onLeadsScraped.mock.calls[0][0];
        expect(leads).toHaveLength(25);
        expect(leads[0].campaignName).toMatch(/^Followers of @competitor · /);
        expect(leads.every((l: { bio?: string }) => l.bio)).toBe(true); // details loaded
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
