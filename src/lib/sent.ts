import type { Lead } from './types';

/**
 * When a Lead was Sent, as well as this workspace knows.
 *
 * `sentAt` is stamped at the moment the extension confirms the send — its
 * receipt, or the first outbound Message it reads back out of Instagram. Every
 * reader used to take `dmDate` instead, which is when the DM was *written*: a
 * DM drafted on the 12th and sent on the 22nd counted as an opener in the week
 * of the 12th, so the week it actually went out read zero, and its first
 * follow-up fell due the moment it was sent.
 *
 * A Lead Sent before the stamp existed, or Sent with no observed send time (a
 * Booking, or a receipt from a previous day that carries none), falls back to
 * `dmDate` — which is what every one of these readers counted by until now, so
 * no Lead that was counted before disappears from a period.
 */
export function sentDate(lead: Lead): string | undefined {
    return lead.sentAt ?? lead.dmDate;
}
