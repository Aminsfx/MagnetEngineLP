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

export interface InboxState {
    conversations: Conversation[];
    messages: Message[];
}

export interface IngestResult extends InboxState {
    changedConversations: Conversation[]; // subset to persist
    newMessages: Message[];               // subset to persist
    /** Conversations that gained a NEW inbound message — what autopilot acts on. */
    newInbound: Conversation[];
}

const echoSignature = (conversationId: string, text: string) =>
    `${conversationId}|${text.trim()}`;

/** Fields the poller can change. AI-set intent/status/labels are carried over. */
function differs(a: Conversation, b: Conversation): boolean {
    return (
        a.lastMessageAt !== b.lastMessageAt ||
        a.lastMessageText !== b.lastMessageText ||
        a.unread !== b.unread ||
        a.needsReply !== b.needsReply ||
        a.handle !== b.handle ||
        a.name !== b.name ||
        a.avatarUrl !== b.avatarUrl ||
        a.account !== b.account
    );
}

/**
 * Merge a fresh snapshot into existing state. Pure — see `createInboxLog` for
 * the stateful wrapper that owns hydration ordering.
 *
 * - Messages dedupe by IG `item_id`.
 * - `pendingEchoes` holds signatures of outbound Messages this app created
 *   optimistically and has not yet seen echoed back by Instagram. Each
 *   signature suppresses exactly ONE echo and is then consumed, so an Operator
 *   who genuinely sends "ok" twice keeps both.
 * - Conversations preserve AI-set `intent`/`status`/`labels` (the poller only
 *   knows raw thread facts) and recompute `needsReply`/`unread` from the last
 *   Message.
 */
export function ingestThreads(
    threads: RawThread[],
    prevConversations: Conversation[],
    prevMessages: Message[],
    pendingEchoes: Set<string> = new Set(),
    suppressedIds: Set<string> = new Set(),
): IngestResult {
    const msgById = new Map(prevMessages.map((m) => [m.id, m]));
    const newMessages: Message[] = [];

    for (const t of threads) {
        for (const m of t.messages) {
            if (msgById.has(m.id) || suppressedIds.has(m.id)) continue;

            if (m.direction === 'out') {
                const sig = echoSignature(t.threadId, m.text);
                if (pendingEchoes.has(sig)) {
                    // Our own send coming back under Instagram's id. Consume the
                    // signature so only this one echo is suppressed, and remember
                    // the id so later snapshots don't re-add it.
                    pendingEchoes.delete(sig);
                    suppressedIds.add(m.id);
                    continue;
                }
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
    const newInboundConvIds = new Set(
        newMessages.filter((m) => m.direction === 'in').map((m) => m.conversationId),
    );

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
        if (!existing || differs(existing, conv)) changedConversations.push(conv);
    }

    return {
        conversations: Array.from(convoById.values()),
        messages: allMessages,
        changedConversations,
        newMessages,
        newInbound: changedConversations.filter(
            (c) => c.needsReply && newInboundConvIds.has(c.id),
        ),
    };
}

/**
 * The inbox log: the Conversations and Messages this app knows about, and the
 * rules for merging Instagram's view into them.
 *
 * Exists because `ingestThreads` alone has a precondition its signature cannot
 * express — it must not run until the stored history is loaded, or the echo
 * suppression above compares against a half-empty set and duplicates every
 * optimistic send. The caller used to enforce that itself with three refs
 * (`inboxReady`, `pendingThreads`, and mirrors of both state arrays), and it
 * silently dropped all but the newest snapshot while waiting.
 *
 * Now the ordering constraint is inside the module: `sync` before `hydrate`
 * parks the snapshot instead of merging it, and `hydrate` replays what was
 * parked. There is nothing left for a caller to get wrong.
 */
export interface InboxLog {
    readonly hydrated: boolean;
    /** Everything currently known. Safe to hand to React as state. */
    snapshot(): InboxState;
    /**
     * Load stored history. Returns the result of replaying any snapshot that
     * arrived while waiting, or null if none did.
     */
    hydrate(state: InboxState): IngestResult | null;
    /** Merge a snapshot. Returns null when it was parked, or when nothing changed. */
    sync(threads: RawThread[]): IngestResult | null;
    /**
     * Record an outbound Message this app just sent, so Instagram echoing it
     * back doesn't create a duplicate.
     */
    recordOutbound(message: Message): InboxState;
    /** Record a locally-changed Conversation (AI intent, status, labels). */
    recordConversation(conversation: Conversation): InboxState;
    /** Forget everything — used when the signed-in Operator changes. */
    reset(): void;
}

export function createInboxLog(): InboxLog {
    let hydrated = false;
    let conversations: Conversation[] = [];
    let messages: Message[] = [];
    /** Newest parked snapshot; earlier ones are superseded, as before. */
    let parked: RawThread[] | null = null;
    const pendingEchoes = new Set<string>();
    /** Instagram ids of echoes already matched to a local send. */
    const suppressedIds = new Set<string>();

    const snapshot = (): InboxState => ({ conversations, messages });

    const merge = (threads: RawThread[]): IngestResult | null => {
        const result = ingestThreads(
            threads, conversations, messages, pendingEchoes, suppressedIds,
        );
        if (result.changedConversations.length === 0 && result.newMessages.length === 0) {
            return null;
        }
        conversations = result.conversations;
        messages = result.messages;
        return result;
    };

    return {
        get hydrated() {
            return hydrated;
        },

        snapshot,

        hydrate(state) {
            conversations = state.conversations;
            messages = state.messages;
            hydrated = true;

            const replay = parked;
            parked = null;
            return replay ? merge(replay) : null;
        },

        sync(threads) {
            if (!Array.isArray(threads) || threads.length === 0) return null;
            if (!hydrated) {
                parked = threads;
                return null;
            }
            return merge(threads);
        },

        recordOutbound(message) {
            messages = [...messages, message];
            pendingEchoes.add(echoSignature(message.conversationId, message.text));
            return snapshot();
        },

        recordConversation(conversation) {
            conversations = conversations.map((c) =>
                c.id === conversation.id ? conversation : c,
            );
            return snapshot();
        },

        reset() {
            hydrated = false;
            conversations = [];
            messages = [];
            parked = null;
            pendingEchoes.clear();
            suppressedIds.clear();
        },
    };
}
