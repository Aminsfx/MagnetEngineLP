import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FollowUpSequencer } from './FollowUpSequencer';
import type { WorkspaceStore } from '../../lib/store';
import type { AppConfig } from '../../lib/types';

const config: AppConfig = {
    systemPrompt: 'prompt', includeKeywords: [], excludeKeywords: [],
    minFollowers: 0, maxFollowers: Number.MAX_SAFE_INTEGER, accountType: 'all',
    selectedAIProvider: 'claude', dailySendCap: 40,
};

function storeWith(loadSequences: WorkspaceStore['loadSequences']) {
    const saveSequence = vi.fn<WorkspaceStore['saveSequence']>(async (s) => s);
    const store = { kind: 'supabase', loadSequences, saveSequence } as unknown as WorkspaceStore;
    return { store, saveSequence };
}

// The regression: a load that failed was read as "no sequences". The page
// seeded fresh ladders over the Operator's own, so what they saw was not what
// they had saved, and a Save stored a second ladder beside it.
describe('follow-up sequences that fail to load', () => {
    beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

    it('say so, and seed nothing in their place', async () => {
        const { store, saveSequence } = storeWith(async () => { throw new Error('[db] getSequences: Failed to fetch'); });

        render(<FollowUpSequencer leads={[]} config={config} store={store} onSendFollowUps={async () => 0} />);

        expect(await screen.findByText(/couldn.t load your follow-up sequences/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
        expect(saveSequence).not.toHaveBeenCalled();
    });

    it('load when tried again', async () => {
        let calls = 0;
        const { store } = storeWith(async () => {
            calls++;
            if (calls === 1) throw new Error('[db] getSequences: Failed to fetch');
            return [];
        });

        render(<FollowUpSequencer leads={[]} config={config} store={store} onSendFollowUps={async () => 0} />);
        await userEvent.click(await screen.findByRole('button', { name: /try again/i }));

        expect(await screen.findByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('still seeds the ladders for an Operator who has none', async () => {
        const { store } = storeWith(async () => []);

        render(<FollowUpSequencer leads={[]} config={config} store={store} onSendFollowUps={async () => 0} />);

        expect(await screen.findByRole('button', { name: /save/i })).toBeInTheDocument();
    });
});
