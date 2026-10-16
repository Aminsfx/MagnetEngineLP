import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InboxView } from './InboxView';
import { ToastProvider } from '../common/Toast';
import { demoInbox } from '../../lib/inboxDemo';
import type { AppConfig } from '../../lib/types';

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
}))) {
    const { conversations, messages } = demoInbox();
    render(
        <ToastProvider>
            <InboxView
                conversations={conversations}
                messages={messages}
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
    return { onGenerateReply, conversations };
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
});
