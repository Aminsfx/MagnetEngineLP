/**
 * The app's side of the app ↔ extension seam.
 *
 * The seam itself is `window.postMessage`, and it had no module on it: six
 * message names written as bare literals in at least two files each, payload
 * shapes re-typed at every call site with different defaults, and a relay whose
 * entire contract was "anything starting with MAGNET_ENGINE_". When the two
 * sides drifted nothing failed loudly — content.js no-ops when chrome.runtime
 * is missing — so a renamed message just silently stopped arriving.
 *
 * The names live in extension/protocol.js because the extension has no build
 * step and needs a classic script. This module is the typed adapter over them;
 * extensionProtocol.test.ts asserts the two agree, so a rename on either side
 * fails the test run instead of the product.
 */

/** Page → extension. */
export const APP_TO_EXT = {
  CAMPAIGN: 'MAGNET_ENGINE_CAMPAIGN',
  GET_STATS: 'MAGNET_ENGINE_GET_STATS',
  GET_INBOX: 'MAGNET_ENGINE_GET_INBOX',
} as const;

/** Extension → page. */
export const EXT_TO_APP = {
  STATS: 'MAGNET_ENGINE_STATS',
  SENT: 'MAGNET_ENGINE_SENT',
  INBOX: 'MAGNET_ENGINE_INBOX',
} as const;

export const PROTOCOL_PREFIX = 'MAGNET_ENGINE_';

/** One Lead's worth of work handed to the extension. */
export interface CampaignRecipient {
  handle: string;
  message: string;
}

export interface CampaignPayload {
  leads: CampaignRecipient[];
  /** Minutes between sends — the extension randomises within the range. */
  minDelay: number;
  maxDelay: number;
  dailyCap: number;
}

/** What the extension reports about the current day's sending. */
export interface ExtensionStats {
  dailySentCount: number;
  dailyCap: number;
  /** Handles sent today, with timestamps. Resets at midnight. */
  sentLog: { handle?: string }[];
  /** Every handle ever sent. Never resets — see background.js. */
  sentHandles: string[];
}

export interface SentNotice {
  handle: string;
  dailySentCount: number;
  dailyCap: number;
}

// deno-lint-ignore-file
/** A raw Instagram thread snapshot, normalised by the content script. */
export type InboxSnapshot = { threads: unknown[] };

export type ExtensionMessage =
  | ({ type: typeof EXT_TO_APP.STATS } & Partial<ExtensionStats>)
  | ({ type: typeof EXT_TO_APP.SENT } & Partial<SentNotice>)
  | ({ type: typeof EXT_TO_APP.INBOX } & Partial<InboxSnapshot>);

/** Ask the extension for its current stats and latest inbox snapshot. */
export function requestExtensionSync(): void {
  window.postMessage({ type: APP_TO_EXT.GET_STATS }, '*');
  window.postMessage({ type: APP_TO_EXT.GET_INBOX }, '*');
}

/**
 * Hand a campaign to the extension.
 *
 * Fire-and-forget by nature — the content script relays it, and the extension
 * confirms individual sends later via EXT_TO_APP.SENT. Callers must not treat
 * a return from this as "sent".
 */
export function sendCampaign(payload: CampaignPayload): void {
  window.postMessage({ type: APP_TO_EXT.CAMPAIGN, payload }, '*');
}

/**
 * Subscribe to extension → page messages. Returns an unsubscribe function.
 *
 * Only same-window messages carrying a known type are delivered, so page
 * scripts and other extensions can't feed the dashboard.
 */
export function onExtensionMessage(
  handler: (message: ExtensionMessage) => void,
): () => void {
  const known = new Set<string>(Object.values(EXT_TO_APP));

  const listener = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data.type !== 'string' || !known.has(data.type)) return;
    handler(data as ExtensionMessage);
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
