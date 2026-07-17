import type { Conversation, Message } from './types';

/** Shape the extension's content-script poller pushes for each IG thread. */
export interface RawThread {
    threadId: string;
    handle: string;
    name?: string;
    avatarUrl?: string;
    account?: string;
    messages: Array<{ id: string; direction: 'in' | 'out'; text: string; createdAt: string }>;
}

export interface IngestResult {
    conversations: Conversation[]; // full merged list (for state)
    messages: Message[];           // full merged list (for state)
    changedConversations: Conversation[]; // subset to persist
    newMessages: Message[];               // subset to persist
}

/**
 * Merge a fresh inbox snapshot from the extension into existing app state.
 *
 * - Messages dedupe by IG `item_id`. Outbound messages we already have with the
 *   same text (our optimistic "Approve & Send") are not duplicated when IG later
 *   echoes them back under a different id.
 * - Conversations preserve AI-set `intent`/`status`/`labels` (the poller only
 *   knows raw thread facts), and recompute `needsReply`/`unread` from the last
 *   message.
 */
export function ingestThreads(
    threads: RawThread[],
    prevConversations: Conversation[],
    prevMessages: Message[],
): IngestResult {
    const msgById = new Map(prevMessages.map((m) => [m.id, m]));
    // Signatures of outbound messages we already hold, to avoid duplicating our
    // optimistic sends once IG echoes the real item back.
    const outboundSig = new Set(
        prevMessages
            .filter((m) => m.direction === 'out')
            .map((m) => `${m.conversationId}|${m.text.trim()}`),
    );

    const newMessages: Message[] = [];

    for (const t of threads) {
        for (const m of t.messages) {
            if (msgById.has(m.id)) continue;
            if (m.direction === 'out' && outboundSig.has(`${t.threadId}|${m.text.trim()}`)) {
                continue; // already have this outbound (our optimistic copy)
            }
            const msg: Message = {
                id: m.id,
                conversationId: t.threadId,
                direction: m.direction,
                text: m.text,
                createdAt: m.createdAt,
            };
            msgById.set(m.id, msg);
            newMessages.push(msg);
            if (m.direction === 'out') outboundSig.add(`${t.threadId}|${m.text.trim()}`);
        }
    }

    const allMessages = Array.from(msgById.values());
    const byConv = new Map<string, Message[]>();
    for (const m of allMessages) {
        const arr = byConv.get(m.conversationId);
        if (arr) arr.push(m);
        else byConv.set(m.conversationId, [m]);
    }
    for (const arr of byConv.values()) {
        arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }

    const convoById = new Map(prevConversations.map((c) => [c.id, c]));
    const changedConversations: Conversation[] = [];

    for (const t of threads) {
        const msgs = byConv.get(t.threadId) ?? [];
        if (msgs.length === 0) continue;
        const last = msgs[msgs.length - 1];
        const existing = convoById.get(t.threadId);

        const conv: Conversation = {
            id: t.threadId,
            handle: t.handle,
            name: t.name || existing?.name,
            avatarUrl: t.avatarUrl || existing?.avatarUrl,
            account: t.account ?? existing?.account,
            lastMessageAt: last.createdAt,
            lastMessageText: last.text,
            unread: last.direction === 'in',
            status: existing?.status ?? 'open',
            intent: existing?.intent,
            labels: existing?.labels,
            needsReply: last.direction === 'in',
        };
        convoById.set(t.threadId, conv);
        changedConversations.push(conv);
    }

    return {
        conversations: Array.from(convoById.values()),
        messages: allMessages,
        changedConversations,
        newMessages,
    };
}
