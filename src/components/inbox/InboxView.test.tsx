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
    syncedAt = undefined as number | null | undefined,
} = {}) {
    const { conversations, messages } = demoInbox();
    const onSaveDeal = vi.fn();
    const onUpdateConversation = vi.fn();
    const onMarkConversation = vi.fn();
    const ui = (list: Conversation[]) => (
        <ToastProvider>
            <InboxView
                conversations={list}
                messages={messages}
                leads={leads}
                onSaveDeal={onSaveDeal}
                config={config}
                detected={null}
                syncedAt={syncedAt}
                onGenerateReply={onGenerateReply}
                onSendReply={onSendReply}
                onUpdateConversation={onUpdateConversation}
                onMarkConversation={onMarkConversation}
                onUpdateConfig={vi.fn()}
                onDisconnectInstagram={vi.fn()}
            />
        </ToastProvider>
    );
    const { rerender } = render(ui(conversations));
    return {
        onGenerateReply, onSaveDeal, onSendReply, onUpdateConversation, onMarkConversation, conversations,
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

    describe('qualified', () => {
        const NOOR = /@studio-noor-design/;
        const noor = () => screen.getByRole('region', { name: 'Conversation with @studio-noor-design' });
        const mark = (list: Conversation[], handle: string, status: Conversation['status']) =>
            list.map(c => (c.handle === handle ? { ...c, status } : c));

        it('has its own button, apart from booked', async () => {
            const { onMarkConversation, onUpdateConversation } = renderInbox();
            await userEvent.click(row(NOOR));

            expect(within(noor()).getByRole('button', { name: /Mark booked/ })).toBeInTheDocument();
            await userEvent.click(within(noor()).getByRole('button', { name: /Mark qualified/ }));

            // Qualified, and nothing about a call: the AI's read is left as it was.
            expect(onMarkConversation).toHaveBeenCalledTimes(1);
            expect(onMarkConversation).toHaveBeenCalledWith(
                expect.objectContaining({ handle: 'studio-noor-design', status: 'qualified', intent: 'neutral' }),
            );
            expect(onUpdateConversation).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'qualified' }));
            expect(await screen.findByText('@studio-noor-design marked as qualified')).toBeInTheDocument();
        });

        it('shows the conversation as qualified, with booking still to come', async () => {
            const { conversations, rerender } = renderInbox();
            await userEvent.click(row(NOOR));
            rerender(mark(conversations, 'studio-noor-design', 'qualified'));

            expect(within(row(NOOR)).getByText('Qualified')).toBeInTheDocument();
            expect(within(noor()).queryByRole('button', { name: /Mark qualified/ })).not.toBeInTheDocument();
            expect(within(noor()).getByText('Qualified')).toBeInTheDocument();
            expect(within(noor()).getByRole('button', { name: /Mark booked/ })).toBeInTheDocument();
        });

        it('sends a booking down the same path, as its own stage', async () => {
            const { onMarkConversation } = renderInbox();
            await userEvent.click(row(NOOR));
            await userEvent.click(within(noor()).getByRole('button', { name: /Mark booked/ }));

            expect(onMarkConversation).toHaveBeenCalledWith(
                expect.objectContaining({ handle: 'studio-noor-design', status: 'booked', intent: 'booked' }),
            );
        });

        it('calls the AI\'s read Interested, and keeps Qualified for the Operator\'s mark', () => {
            renderInbox();
            // Maya and Jordan are the AI's "interested"; nobody has been marked.
            expect(within(row(/@maya-builds\.coaching/)).getByText('Interested')).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /^Interested/ })).toHaveTextContent('2');
            expect(screen.getByRole('tab', { name: /^Qualified/ })).toHaveTextContent('0');
        });

        it('holds the open conversation under the filter it was marked from', async () => {
            const { conversations, rerender } = renderInbox();
            await userEvent.click(screen.getByRole('tab', { name: /^Interested/ }));
            await userEvent.click(row(/@maya-builds\.coaching/));

            rerender(mark(conversations, 'maya-builds.coaching', 'qualified'));
            // Marked, it belongs under Qualified now, but it stays under the Operator's hands.
            expect(screen.getByRole('region', { name: 'Conversation with @maya-builds.coaching' })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /^Qualified/ })).toHaveTextContent('1');

            await userEvent.click(row(/@maya-builds\.coaching/));       // fold
            expect(screen.queryByText('@maya-builds.coaching')).not.toBeInTheDocument();
        });
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

    describe('whether new DMs are reaching it', () => {
        const stale = () => screen.queryByText(/aren’t reaching this Inbox/);

        it('says when Instagram was last read while it is being read', () => {
            renderInbox({ syncedAt: Date.now() - 3 * 60_000 });
            expect(screen.getByText('Read from Instagram 3m ago')).toBeInTheDocument();
            expect(stale()).toBeNull();
        });

        it('says so, and what to do, once nothing has been read for a while', () => {
            renderInbox({ syncedAt: Date.now() - 5 * 3_600_000 });
            expect(stale()).toHaveTextContent('Instagram was last read 5h ago');
            expect(screen.getByRole('link', { name: 'Open your Instagram inbox' }))
                .toHaveAttribute('href', 'https://www.instagram.com/direct/inbox/');
            expect(screen.queryByText(/Read from Instagram/)).toBeNull();
        });

        it('says so when nothing has ever been read in this browser', () => {
            renderInbox({ syncedAt: null });
            expect(stale()).toHaveTextContent('Nothing has been read from Instagram in this browser yet');
        });

        it('claims nothing for an extension too old to say', () => {
            renderInbox();
            expect(stale()).toBeNull();
            expect(screen.queryByText(/Read from Instagram/)).toBeNull();
        });
    });
});
