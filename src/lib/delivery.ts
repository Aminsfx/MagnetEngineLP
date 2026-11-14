import { confirmedByInstagram } from './inbox';
import type { Message } from './types';

/**
 * Where a reply the app handed to the extension is, as far as anyone has said.
 * Only the extension moves it (SENT and NOT_SENT carry the reply's `ref`,
 * protocol 5), and Instagram ends it: once Instagram's copy of the reply is
 * read, it replaces the app's (`settled` in inbox.ts) and there is nothing
 * left to say. Held in memory only: after a reload, a reply Instagram hasn't
 * shown yet is `unconfirmed`.
 */
export type Delivery =
    | { state: 'sending' }
    | { state: 'sent' }
    | { state: 'failed'; reason: string };

export type ReplyStatus = Delivery | { state: 'unconfirmed' };

/**
 * What a message in the Inbox says about itself: null for Instagram's own
 * copy and for anything from them. Every reply used to be drawn like a message
 * Instagram had from the moment it was handed over, so one held behind a
 * paused campaign, or one the extension gave up on, read as sent.
 */
export function replyStatus(message: Message, delivery: Delivery | undefined): ReplyStatus | null {
    if (message.direction !== 'out' || confirmedByInstagram(message)) return null;
    return delivery ?? { state: 'unconfirmed' };
}
