import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InboxView } from './InboxView';
import { ToastProvider } from '../common/Toast';
import { demoInbox } from '../../lib/inboxDemo';
import type { AppConfig, Conversation, Lead } from '../../lib/types';

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

const plainReplies = () => vi.fn(async (_c: Conversation, instruction?: string) => ({
    reply: instruction ? `steered: ${instruction.slice(0, 12)}` : 'plain reply',
    intent: 'interested' as const,
}));

function renderInbox({
    onGenerateReply = plainReplies(),
    leads = [] as Lead[],
    onSendReply = vi.fn((): boolean => true),
} = {}) {
    const { conversations, messages } = demoInbox();
    const onSaveDeal = vi.fn();
    const onUpdateConversation = vi.fn();
    const ui = (list: Conversation[]) => (
        <ToastProvider>
            <InboxView
                conversations={list}
                messages={messages}
                leads={leads}
                onSaveDeal={onSaveDeal}
                config={config}
                detected={null}
                onGenerateReply={onGenerateReply}
                onSendReply={onSendReply}
                onUpdateConversation={onUpdateConversation}
                onUpdateConfig={vi.fn()}
                onDisconnectInstagram={vi.fn()}
            />
        </ToastProvider>
    );
    const { rerender } = render(ui(conversations));
    return {
        onGenerateReply, onSaveDeal, onSendReply, onUpdateConversation, conversations,
        rerender: (list: Conversation[]) => rerender(ui(list)),
    };
}

const row = (handle: RegExp) => screen.getByRole('button', { name: handle });

/** Open @maya's conversation and put the copilot's plain reply in the composer. */
async function useFirstReply() {
    await userEvent.click(row(/@maya-builds\.coaching/));
    const card = await screen.findByRole('listitem', { name: 'Best next step' });
    await within(card).findByText('plain reply');
    await userEvent.click(within(card).getByRole('button', { name: /Use this reply/ }));
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

    it('unfolds a conversation in place with three different replies in full, and Use fills the composer', async () => {
        const { onGenerateReply } = renderInbox();
        await userEvent.click(row(/@maya-builds\.coaching/));

        // The conversation opens under its row, inside its priority group.
        const attention = screen.getByRole('region', { name: 'Needs attention' });
        expect(within(attention).getByRole('region', { name: 'Conversation with @maya-builds.coaching' })).toBeInTheDocument();

        await waitFor(() => expect(onGenerateReply).toHaveBeenCalledTimes(3));
        // One plain draft, two steered ones, each readable without a click.
        expect(onGenerateReply.mock.calls.filter(c => c[1] === undefined)).toHaveLength(1);
        expect(await screen.findByText('plain reply')).toBeInTheDocument();
        expect(screen.getAllByText(/^steered:/)).toHaveLength(2);

        expect(screen.getByLabelText('Your reply')).toHaveValue('');
        const card = screen.getByRole('listitem', { name: 'Best next step' });
        await userEvent.click(within(card).getByRole('button', { name: /Use this reply/ }));
        expect(screen.getByLabelText('Your reply')).toHaveValue('plain reply');
        expect(within(card).getByRole('button', { name: /In the composer/ })).toBeInTheDocument();
    });

    it('waits to be asked for conversations that are not owed a reply', async () => {
        const { onGenerateReply } = renderInbox();
        await userEvent.click(row(/@studio-noor-design/));
        expect(screen.getByRole('button', { name: 'Suggest replies' })).toBeInTheDocument();
        expect(onGenerateReply).not.toHaveBeenCalled();
    });

    it('hands the reply to the extension, then offers the next conversation that needs you', async () => {
        const { onSendReply, conversations } = renderInbox();
        await useFirstReply();
        await userEvent.click(screen.getByRole('button', { name: /Approve & Send/ }));

        expect(onSendReply).toHaveBeenCalledWith(conversations.find(c => c.handle === 'maya-builds.coaching'), 'plain reply');
        expect(await screen.findByText(/Reply handed to the extension/)).toBeInTheDocument();
        expect(screen.getByLabelText('Your reply')).toHaveValue('');

        // Next is the following conversation down the list: the other qualified
        // prospect. It takes focus, so the keyboard runs reply → send → next.
        const next = screen.getByRole('button', { name: /Next: @jordan-fit-method/ });
        expect(next).toHaveFocus();
        await userEvent.keyboard('{Enter}');
        expect(screen.getByRole('region', { name: 'Conversation with @jordan-fit-method' })).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Conversation with @maya-builds.coaching' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('Your reply')).toHaveFocus();
    });

    it('keeps the draft when the extension refuses the reply', async () => {
        renderInbox({ onSendReply: vi.fn((): boolean => false) });
        await useFirstReply();
        await userEvent.click(screen.getByRole('button', { name: /Approve & Send/ }));

        expect(screen.getByLabelText('Your reply')).toHaveValue('plain reply');
        expect(screen.queryByText(/Reply handed to the extension/)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Next:/ })).not.toBeInTheDocument();
    });

    it('holds an open conversation in place when it changes, and moves it once it folds', async () => {
        const { conversations, rerender } = renderInbox();
        await userEvent.click(row(/@maya-builds\.coaching/));

        // The reply goes out: the last word is now ours, which belongs in "Waiting or done".
        const now = new Date().toISOString();
        const answered = conversations.map(c => (c.handle === 'maya-builds.coaching'
            ? { ...c, needsReply: false, unread: false, lastMessageAt: now, lastMessageText: 'plain reply' }
            : c));
        rerender(answered);
        const attention = () => screen.getByRole('region', { name: 'Needs attention' });
        expect(within(attention()).getByRole('region', { name: 'Conversation with @maya-builds.coaching' })).toBeInTheDocument();

        await userEvent.click(row(/@maya-builds\.coaching/));       // fold
        expect(within(attention()).queryByText('@maya-builds.coaching')).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Waiting or done' })).toHaveTextContent('@maya-builds.coaching');
    });

    it('lights a conversation with a new message until it is opened', async () => {
        const { onUpdateConversation } = renderInbox();
        const maya = row(/@maya-builds\.coaching/);
        expect(within(maya).getByText('New message')).toBeInTheDocument();
        expect(within(row(/@studio-noor-design/)).queryByText('New message')).not.toBeInTheDocument();

        await userEvent.click(maya);
        expect(onUpdateConversation).toHaveBeenCalledWith(expect.objectContaining({ handle: 'maya-builds.coaching', unread: false }));
    });

    describe('deal', () => {
        const lead = (over: Partial<Lead> = {}): Lead => ({
            id: 'l1', handle: 'studio-noor-design', name: 'Noor', followers: 0, isPrivate: false,
            status: 'cold', dmSent: true, replied: true, ...over,
        });

        it('saves the price typed on a conversation, even for someone who is not a Lead yet', async () => {
            const { onSaveDeal } = renderInbox();
            await userEvent.click(row(/@studio-noor-design/));

            await userEvent.type(screen.getByLabelText(/Deal price/), '3,000{Enter}');

            expect(onSaveDeal).toHaveBeenCalledTimes(1);
            const [conv, change] = onSaveDeal.mock.calls[0];
            expect(conv.handle).toBe('studio-noor-design');
            expect(change(lead()).dealValue).toBe(3000);
            // A price is not money: nothing about winning is touched.
            expect(change(lead()).closedAt).toBeUndefined();
        });

        it('offers Mark as won only once the call is booked', async () => {
            renderInbox({ leads: [lead({ dealValue: 3000 })] });
            await userEvent.click(row(/@studio-noor-design/));

            expect(screen.queryByRole('button', { name: /Mark as won/ })).not.toBeInTheDocument();
            expect(screen.getByText('Mark it booked when they book a call.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Mark booked/ })).toBeInTheDocument();
        });

        it('records the win with the price already filled in', async () => {
            const { onSaveDeal } = renderInbox({ leads: [lead({ dealValue: 3000, booked: true })] });
            await userEvent.click(row(/@studio-noor-design/));

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
