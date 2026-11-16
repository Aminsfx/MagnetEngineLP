import type { Delivery } from './delivery';
import { confirmedByInstagram } from './inbox';
import type { AppConfig, Conversation, Message } from './types';

/**
 * Who autopilot answers: only the people the Operator switched it on for, in
 * the Inbox (owner, 2026-11-16). It used to answer everyone who wrote in, and
 * the first read after connecting Instagram brings in the whole inbox, so
 * every unanswered thread in it, weeks old and from anyone, got an AI reply.
 *
 * Kept by handle on AppConfig (`autopilotHandles`), not on the Conversation:
 * Instagram serves a message request as a second thread for the same person,
 * and a pick should hold for both.
 */
const key = (handle: string) => String(handle || '').trim().replace(/^@/, '').toLowerCase();

export function isAutopilotPicked(config: Pick<AppConfig, 'autopilotHandles'>, handle: string): boolean {
    const want = key(handle);
    return !!want && (config.autopilotHandles ?? []).some((h) => key(h) === want);
}

export function withAutopilotPick<C extends Pick<AppConfig, 'autopilotHandles'>>(config: C, handle: string, on: boolean): C & { autopilotHandles: string[] } {
    const want = key(handle);
    const rest = (config.autopilotHandles ?? []).filter((h) => key(h) !== want);
    return { ...config, autopilotHandles: on && want ? [...rest, want] : rest };
}

/**
 * Whether autopilot answers a Conversation now.
 *
 * - `answer`: someone it is on for wrote, and nobody has answered them yet.
 * - `wait`: a reply of ours is still with the extension. During a campaign a
 *   reply waits its turn between paced sends, often for minutes. A person who
 *   wrote again in that time used to get a second AI reply on top of the
 *   first. Asked again once that reply goes out.
 * - `skip`: not picked, nothing to answer, or the Operator has it.
 */
export type AutopilotCall = 'answer' | 'wait' | 'skip';

export function autopilotCall(
    conv: Conversation,
    messages: Message[],
    opts: { picked: boolean; delivery: Record<string, Delivery> },
): AutopilotCall {
    if (!opts.picked || !conv.needsReply || conv.status === 'closed') return 'skip';
    const thread = messages.filter((m) => m.conversationId === conv.id);

    const lastIn = thread.reduce<Message | null>(
        (latest, m) => (m.direction === 'in' && (!latest || time(m) > time(latest)) ? m : latest),
        null,
    );
    if (!lastIn) return 'skip';

    const ours = thread.filter((m) => m.direction === 'out' && !confirmedByInstagram(m));
    if (ours.some((m) => opts.delivery[m.id]?.state === 'sending')) return 'wait';
    // A reply the extension gave up on, to this same message: the Inbox shows
    // the Operator why, with Send again. Answering it once more on our own
    // would hide that, and fail the same way.
    if (ours.some((m) => opts.delivery[m.id]?.state === 'failed' && time(m) >= time(lastIn))) return 'skip';
    return 'answer';
}

const time = (m: Message) => Date.parse(m.createdAt) || 0;
