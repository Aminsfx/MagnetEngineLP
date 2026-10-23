import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InboxView } from './InboxView';
import { ToastProvider } from '../common/Toast';
import { demoInbox } from '../../lib/inboxDemo';
import type { AppConfig, Lead } from '../../lib/types';

const config: AppConfig = {
    systemPrompt: '',
    includeKeywords: [],
    excludeKeywords: [],
    minFollowers: 0,
    maxFollowers: Number.MAX_SAFE_INTEGER,
    accountType: 'all',
    selectedAIProvider: 'claude',
    dailySendCap: 40,
    calendarLink: 'https://cal.example/call',
    instagramAccount: { id: 'me', username: 'me', connectedAt: new Date().toISOString() },
};

function renderInbox(onGenerateReply = vi.fn(async (_c, instruction?: string) => ({
    reply: instruction ? `steered: ${instruction.slice(0, 12)}` : 'plain reply',
    intent: 'interested' as const,
})), leads: Lead[] = []) {
    const { conversations, messages } = demoInbox();
    const onSaveDeal = vi.fn();
    render(
        <ToastProvider>
            <InboxView
                conversations={conversations}
                messages={messages}
                leads={leads}
                onSaveDeal={onSaveDeal}
                config={config}
                detected={null}
                onGenerateReply={onGenerateReply}
                onSendReply={vi.fn()}
                onUpdateConversation={vi.fn()}
                onUpdateConfig={vi.fn()}
                onDisconnectInstagram={vi.fn()}
            />
        </ToastProvider>,
    );
    return { onGenerateReply, onSaveDeal, conversations };
}

describe('InboxView', () => {
    it('groups conversations by priority with a next step on each', () => {
        renderInbox();
        const attention = screen.getByRole('region', { name: 'Needs attention' });
        // The interested prospect waiting on us is first, with the booking step.
        expect(within(attention).getAllByRole('button')[0]).toHaveTextContent('@maya-builds.coaching');
        expect(within(attention).getAllByRole('button')[0]).toHaveTextContent('Send your booking link');
        expect(screen.getByRole('region', { name: 'Waiting or done' })).toHaveTextContent('@ben-smma-growth');
    });

    it('drafts three different replies on opening a conversation, and a pick fills the composer', async () => {
        const { onGenerateReply } = renderInbox();
        await userEvent.click(screen.getByRole('button', { name: /@maya-builds\.coaching/ }));

        await waitFor(() => expect(onGenerateReply).toHaveBeenCalledTimes(3));
        // One plain draft, two steered ones.
        expect(onGenerateReply.mock.calls.filter(c => c[1] === undefined)).toHaveLength(1);

        // A chip shows one line; clicking opens the full reply, and only
        // "Use this reply" fills the composer.
        await userEvent.click(await screen.findByRole('button', { name: /Best next step.*plain reply/ }));
        expect(screen.getByPlaceholderText(/pick one of the copilot/)).toHaveValue('');
        await userEvent.click(screen.getByRole('button', { name: /Use this reply/ }));
        expect(screen.getByPlaceholderText(/pick one of the copilot/)).toHaveValue('plain reply');
    });

    it('waits to be asked for conversations that are not owed a reply', async () => {
        const { onGenerateReply } = renderInbox();
        await userEvent.click(screen.getByRole('button', { name: /@studio-noor-design/ }));
        expect(screen.getByRole('button', { name: 'Suggest replies' })).toBeInTheDocument();
        expect(onGenerateReply).not.toHaveBeenCalled();
    });
    describe('deal', () => {
        const lead = (over: Partial<Lead> = {}): Lead => ({
            id: 'l1', handle: 'studio-noor-design', name: 'Noor', followers: 0, isPrivate: false,
            status: 'cold', dmSent: true, replied: true, ...over,
        });

        it('saves the price typed on a conversation, even for someone who is not a Lead yet', async () => {
            const { onSaveDeal } = renderInbox();
            await userEvent.click(screen.getByRole('button', { name: /@studio-noor-design/ }));

            await userEvent.type(screen.getByLabelText(/Deal price/), '3,000{Enter}');

            expect(onSaveDeal).toHaveBeenCalledTimes(1);
            const [conv, change] = onSaveDeal.mock.calls[0];
            expect(conv.handle).toBe('studio-noor-design');
            expect(change(lead()).dealValue).toBe(3000);
            // A price is not money: nothing about winning is touched.
            expect(change(lead()).closedAt).toBeUndefined();
        });

        it('offers Mark as won only once the call is booked', async () => {
            renderInbox(undefined, [lead({ dealValue: 3000 })]);
            await userEvent.click(screen.getByRole('button', { name: /@studio-noor-design/ }));

            expect(screen.queryByRole('button', { name: /Mark as won/ })).not.toBeInTheDocument();
            expect(screen.getByText('Press Booked when they book a call.')).toBeInTheDocument();
        });

        it('records the win with the price already filled in', async () => {
            const { onSaveDeal } = renderInbox(undefined, [lead({ dealValue: 3000, booked: true })]);
            await userEvent.click(screen.getByRole('button', { name: /@studio-noor-design/ }));

            await userEvent.click(screen.getByRole('button', { name: /Mark as won/ }));
            expect(screen.getByLabelText(/Deal value/)).toHaveValue('3000');
            await userEvent.type(screen.getByLabelText(/Paid so far/), '1000');
            await userEvent.click(screen.getByRole('button', { name: 'Mark as won' }));

            const won = onSaveDeal.mock.calls[0][1](lead({ dealValue: 3000, booked: true }));
            expect(won).toMatchObject({ dealValue: 3000, cashCollected: 1000 });
            expect(won.closedAt).toEqual(expect.any(String));
        });
    });
});
