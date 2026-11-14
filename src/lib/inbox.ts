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
    /**
     * Ids of the app's own copies of replies (LOCAL_MESSAGE_PREFIX) that
     * Instagram now shows, and that Instagram's copy has replaced. Delete them
     * from storage: Instagram's copy is in `newMessages`.
     */
    settled: string[];
}

/**
 * Marks a Message the app recorded optimistically — sent to the extension, not
 * yet seen echoed back by Instagram. Ingestion replaces it with the real item
 * once Instagram reports it, so the prefix is how the rest of the app tells
 * "we asked for this to be sent" from "Instagram says this exists".
 */
export const LOCAL_MESSAGE_PREFIX = 'local_';

/**
 * Whether Instagram itself reported this Message, rather than the app writing
 * it down on the way out.
 *
 * CONTEXT.md's **Sent** turns on exactly this distinction: handing work to the
 * extension is not a send, so a Message still wearing a local id is not
 * evidence one happened.
 */
export const confirmedByInstagram = (message: Message): boolean =>
    !message.id.startsWith(LOCAL_MESSAGE_PREFIX);

const isLocal = (message: Message): boolean => !confirmedByInstagram(message);

/**
 * How much earlier than the app wrote a reply down Instagram may stamp its
 * copy of it: the browser's clock and Instagram's are not quite the same.
 */
const ECHO_SKEW_MS = 2 * 60_000;

/**
 * Whether a message Instagram reports is the app's own reply come back: the
 * same words, from the Operator, in the same conversation, no earlier than the
 * reply was written down. An older message with the same words is a different
 * message.
 */
function isEchoOf(real: Pick<Message, 'direction' | 'text' | 'createdAt'>, conversationId: string, local: Message): boolean {
    return local.conversationId === conversationId
        && local.direction === 'out'
        && real.direction === 'out'
        && local.text.trim() === real.text.trim()
        && new Date(real.createdAt).getTime() >= new Date(local.createdAt).getTime() - ECHO_SKEW_MS;
}

const byTime = (a: Message, b: Message) => a.createdAt.localeCompare(b.createdAt);

/**
 * The app's own copies of replies that Instagram's copy, already stored, has
 * come back for. Until 2026-11-14 an echo seen in the same session was thrown
 * away and the local copy kept; the next session took the echo in as new, and
 * both were stored. Each stored copy of Instagram's answers for one reply.
 */
function settleStoredCopies(messages: Message[]): { messages: Message[]; settled: string[] } {
    const real = messages.filter((m) => !isLocal(m) && m.direction === 'out').sort(byTime);
    const taken = new Set<string>();
    const settled: string[] = [];
    for (const local of messages.filter((m) => isLocal(m) && m.direction === 'out').sort(byTime)) {
        const echo = real.find((r) => !taken.has(r.id) && isEchoOf(r, r.conversationId, local));
        if (!echo) continue;
        taken.add(echo.id);
        settled.push(local.id);
    }
    if (settled.length === 0) return { messages, settled };
    const gone = new Set(settled);
    return { messages: messages.filter((m) => !gone.has(m.id)), settled };
}

/**
 * Which photo a profile-photo URL is. Instagram signs its CDN URLs afresh on
 * every read (the query string, and often the host, change; the path is the
 * file), so comparing whole URLs counted about 25 Conversations a poll as
 * changed: saved again, and their Outcomes read again, every ~100 s.
 */
function photoOf(url: string | undefined): string {
    if (!url) return '';
    try {
        return new URL(url).pathname;
    } catch {
        return url.split('?')[0];
    }
}

/** Fields the poller can change. AI-set intent/status/labels are carried over. */
function differs(a: Conversation, b: Conversation): boolean {
    return (
        a.lastMessageAt !== b.lastMessageAt ||
        a.lastMessageText !== b.lastMessageText ||
        a.unread !== b.unread ||
        a.needsReply !== b.needsReply ||
        a.handle !== b.handle ||
        a.name !== b.name ||
        photoOf(a.avatarUrl) !== photoOf(b.avatarUrl) ||
        a.account !== b.account
    );
}

/**
 * Instagram's retired REST inbox numbered messages (`item_id`, all digits);
 * the GraphQL inbox that replaced it in August 2026 uses a different id for
 * the same message. A thread read under both would show its last few messages
 * twice, so a new-format message is dropped when a numeric one already holds
 * the same words, from the same side, within two minutes.
 */
const LEGACY_ID = /^\d+$/;
const SAME_MESSAGE_WINDOW_MS = 120_000;

function isLegacyCopy(m: RawThread['messages'][number], legacy: Message[] | undefined): boolean {
    if (!legacy || LEGACY_ID.test(m.id)) return false;
    const t = new Date(m.createdAt).getTime();
    return legacy.some((old) =>
        old.direction === m.direction
        && old.text === m.text
        && Math.abs(new Date(old.createdAt).getTime() - t) <= SAME_MESSAGE_WINDOW_MS);
}

/**
 * Whether a Conversation is unread after a merge. Only something new from
 * them makes it unread, and only an answer, or the Operator opening it, makes
 * it read. It used to be "the last message is theirs", worked out again on
 * every poll, so a conversation the Operator had opened lit up again ~100 s
 * later, and that was saved over their open.
 */
function unreadAfter(existing: Conversation | undefined, last: Message, newFromThem: boolean): boolean {
    if (last.direction === 'out') return false;
    if (!existing || newFromThem) return true;
    return existing.unread;
}

/**
 * Merge a fresh snapshot into existing state. Pure — see `createInboxLog` for
 * the stateful wrapper that owns hydration ordering.
 *
 * - Messages dedupe by IG `item_id`.
 * - A reply the app wrote down on the way out (LOCAL_MESSAGE_PREFIX) is
 *   replaced by Instagram's copy when Instagram shows it (`settled`). Each copy
 *   of Instagram's replaces one of the app's, so an Operator who genuinely
 *   sends "ok" twice keeps both. It used to be the other way round: the app
 *   kept its own copy and threw Instagram's away, so a reply only handed to
 *   the extension looked exactly like one Instagram had.
 * - Conversations preserve AI-set `intent`/`status`/`labels` (the poller only
 *   knows raw thread facts) and recompute `needsReply` from the last Message.
 *   `unread` follows new Messages, not the last one (`unreadAfter`).
 */
export function ingestThreads(
    threads: RawThread[],
    prevConversations: Conversation[],
    prevMessages: Message[],
): IngestResult {
    const msgById = new Map(prevMessages.map((m) => [m.id, m]));
    const newMessages: Message[] = [];
    const settled: string[] = [];
    /** The app's own copies still waiting for Instagram's, oldest first. */
    const waiting = prevMessages.filter((m) => isLocal(m) && m.direction === 'out').sort(byTime);
    const legacyByConv = new Map<string, Message[]>();
    for (const m of prevMessages) {
        if (!LEGACY_ID.test(m.id)) continue;
        const arr = legacyByConv.get(m.conversationId);
        if (arr) arr.push(m);
        else legacyByConv.set(m.conversationId, [m]);
    }

    for (const t of threads) {
        for (const m of t.messages) {
            if (msgById.has(m.id)) continue;
            if (isLegacyCopy(m, legacyByConv.get(t.threadId))) continue;

            // A reply the app sent, now on Instagram: Instagram's copy takes
            // the place of the app's.
            const mine = waiting.findIndex((local) => isEchoOf(m, t.threadId, local));
            if (mine !== -1) {
                const [local] = waiting.splice(mine, 1);
                msgById.delete(local.id);
                settled.push(local.id);
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
            unread: unreadAfter(existing, last, newInboundConvIds.has(t.threadId)),
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
        settled,
    };
}

/**
 * How long the extension may go without reading threads from Instagram before
 * the Inbox says nothing is being read. A live reader brings the inbox in about
 * every 100 s, and Chrome stretches that to a couple of minutes in a background
 * tab, so ten minutes of quiet is no longer a quiet inbox.
 */
export const READER_STALE_MS = 10 * 60_000;

/**
 * Whether new DMs are reaching this Inbox, from the extension's `syncedAt`:
 * when it last read threads from Instagram itself.
 *
 * - `unknown`: an extension too old to say (it sends no `syncedAt`), or none
 *   has answered yet. Nothing is claimed either way.
 * - `live`: read within READER_STALE_MS.
 * - `stale`: read longer ago than that (`at`), or never (`at: null`).
 *
 * This exists because the reader used to stop without a word: the extension
 * kept re-sending the last snapshot it had, so the Inbox looked current while
 * nothing was being read (29 hours of it on 2026-11-07).
 */
export type ReaderState =
    | { kind: 'unknown' }
    | { kind: 'live'; at: number }
    | { kind: 'stale'; at: number | null };

export function readerState(syncedAt: number | null | undefined, now: number): ReaderState {
    if (syncedAt === undefined) return { kind: 'unknown' };
    if (syncedAt === null || !Number.isFinite(syncedAt)) return { kind: 'stale', at: null };
    return now - syncedAt <= READER_STALE_MS ? { kind: 'live', at: syncedAt } : { kind: 'stale', at: syncedAt };
}

/**
 * The inbox log: the Conversations and Messages this app knows about, and the
 * rules for merging Instagram's view into them.
 *
 * Exists because `ingestThreads` alone has a precondition its signature cannot
 * express — it must not run until the stored history is loaded, or a reply
 * the app sent finds no copy of its own to replace and is stored twice. The caller used to enforce that itself with three refs
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
     * arrived while waiting, and of settling stored copies of replies that
     * Instagram's copy has already come back for; null if neither happened.
     */
    hydrate(state: InboxState): IngestResult | null;
    /** Merge a snapshot. Returns null when it was parked, or when nothing changed. */
    sync(threads: RawThread[]): IngestResult | null;
    /**
     * Record a reply this app just handed to the extension, under a
     * LOCAL_MESSAGE_PREFIX id, until Instagram's copy of it takes its place.
     */
    recordOutbound(message: Message): InboxState;
    /** Drop Messages by id: a reply that wasn't sent, when it is sent again. */
    forget(ids: string[]): InboxState;
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

    const snapshot = (): InboxState => ({ conversations, messages });

    const merge = (threads: RawThread[]): IngestResult | null => {
        const result = ingestThreads(threads, conversations, messages);
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
            const stored = settleStoredCopies(state.messages);
            conversations = state.conversations;
            messages = stored.messages;
            hydrated = true;

            const replay = parked;
            parked = null;
            const merged = replay ? merge(replay) : null;
            if (stored.settled.length === 0) return merged;
            return {
                ...(merged ?? { ...snapshot(), changedConversations: [], newMessages: [], newInbound: [], settled: [] }),
                settled: [...stored.settled, ...(merged?.settled ?? [])],
            };
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
            return snapshot();
        },

        forget(ids) {
            const gone = new Set(ids);
            messages = messages.filter((m) => !gone.has(m.id));
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
        },
    };
}
