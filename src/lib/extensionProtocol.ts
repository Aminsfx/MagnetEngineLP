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
 *
 * That test proves the two halves agree IN THE REPO. It stops proving anything
 * about the field the day the extension ships from the Chrome Web Store: the
 * dashboard updates on deploy, the extension only after review and only once
 * Chrome finds it idle — and this one deliberately pins an Instagram tab open
 * during campaigns, so the busiest Operators are the ones who lag furthest.
 * Hence the handshake below: the installed copy states its protocol revision
 * and the message names it accepts, and this module refuses to post one it
 * can't act on. A refusal the caller can report beats a silent no-op.
 */

/** Page → extension. */
export const APP_TO_EXT = {
  CAMPAIGN: 'MAGNET_ENGINE_CAMPAIGN',
  GET_STATS: 'MAGNET_ENGINE_GET_STATS',
  GET_INBOX: 'MAGNET_ENGINE_GET_INBOX',
  HELLO: 'MAGNET_ENGINE_HELLO',
} as const;

/** Extension → page. */
export const EXT_TO_APP = {
  STATS: 'MAGNET_ENGINE_STATS',
  SENT: 'MAGNET_ENGINE_SENT',
  INBOX: 'MAGNET_ENGINE_INBOX',
  HELLO_BACK: 'MAGNET_ENGINE_HELLO_BACK',
} as const;

export const PROTOCOL_PREFIX = 'MAGNET_ENGINE_';

/**
 * Wire-protocol revision this build of the dashboard speaks. Must match
 * MAGNET_PROTOCOL.VERSION in extension/protocol.js — asserted by the test.
 */
export const PROTOCOL_VERSION = 2;

/**
 * What an extension built before the handshake (≤ 1.4.0) accepts.
 *
 * Deliberately written as literals rather than read from APP_TO_EXT: this is a
 * frozen record of what shipped as protocol v1, and renaming a name here today
 * must not silently rewrite what we believe yesterday's builds understand.
 */
const LEGACY_ACCEPTS: readonly string[] = [
  'MAGNET_ENGINE_CAMPAIGN',
  'MAGNET_ENGINE_GET_STATS',
  'MAGNET_ENGINE_GET_INBOX',
];

/** How long an extension gets to answer before we call it absent. */
const HANDSHAKE_TIMEOUT_MS = 2500;

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

/** What the extension says about itself when it answers HELLO. */
export interface ExtensionHandshake {
  protocolVersion: number;
  /** Manifest version, for telling the Operator which build they're on. */
  version: string;
  /** Page→extension names this build will act on. */
  accepts: string[];
}

/**
 * - `checking` — no answer yet; too early to conclude anything.
 * - `absent`   — nothing answered. Not installed, disabled, or the dashboard is
 *                on a host the manifest doesn't match.
 * - `legacy`   — a pre-handshake build answered a stats/inbox request but not
 *                HELLO. It works, for protocol v1 messages only.
 * - `ready`    — it handshook and told us exactly what it accepts.
 */
export type ExtensionState = 'checking' | 'absent' | 'legacy' | 'ready';

export interface ExtensionStatus {
  state: ExtensionState;
  /** Reported manifest version; '' when the build is too old to say. */
  version: string;
  /** Revision it speaks. 1 is inferred for `legacy` — those builds can't say. */
  protocolVersion: number;
  accepts: readonly string[];
  /** Installed, but behind the dashboard. The cue to prompt for an update. */
  needsUpdate: boolean;
}

const UNKNOWN: ExtensionStatus = {
  state: 'checking', version: '', protocolVersion: 0, accepts: [], needsUpdate: false,
};

let status: ExtensionStatus = UNKNOWN;
const watchers = new Set<(s: ExtensionStatus) => void>();

function publish(next: ExtensionStatus): void {
  status = next;
  for (const watcher of watchers) watcher(next);
}

/** The extension's own account of itself. */
function readHandshake(message: Partial<ExtensionHandshake>): ExtensionStatus {
  const protocolVersion = Number(message.protocolVersion) || 1;
  return {
    state: 'ready',
    version: String(message.version ?? ''),
    protocolVersion,
    accepts: Array.isArray(message.accepts) ? message.accepts.map(String) : [],
    needsUpdate: protocolVersion < PROTOCOL_VERSION,
  };
}

/** Any other extension→page message: proof it's installed, and pre-handshake. */
const LEGACY_STATUS: ExtensionStatus = {
  state: 'legacy', version: '', protocolVersion: 1,
  accepts: LEGACY_ACCEPTS, needsUpdate: true,
};

/** The current view of the installed extension. Safe to call at any time. */
export function getExtensionStatus(): ExtensionStatus {
  return status;
}

/**
 * Whether a page→extension message would actually be acted on.
 *
 * Optimistic while `checking`: an unanswered probe is not evidence of absence,
 * and blocking there would make the handshake *cause* the failure it exists to
 * report. A `legacy` build is trusted with the v1 names and nothing newer.
 */
export function accepts(name: string): boolean {
  if (status.state === 'checking') return true;
  if (status.state === 'absent') return false;
  return status.accepts.includes(name);
}

/** Why a message can't be delivered, in words an Operator can act on. */
function explainRefusal(): string {
  if (status.state === 'absent') {
    return 'The MagnetEngine extension isn\'t responding. Install it, or enable it and reload this page.';
  }
  const which = status.version ? ` (v${status.version})` : '';
  return `Your MagnetEngine extension${which} is too old for this. Update it at chrome://extensions, then reload this page.`;
}

/**
 * Start watching for the extension and probe it.
 *
 * `onChange` fires immediately with the current status and on every change.
 * The returned stop() removes the listener and forgets what we learned — with
 * nobody watching, the honest state is "unknown" again.
 */
export function watchExtension(
  onChange: (status: ExtensionStatus) => void,
): () => void {
  watchers.add(onChange);

  const known = new Set<string>(Object.values(EXT_TO_APP));
  let timer: ReturnType<typeof setTimeout> | undefined;

  const listener = (event: MessageEvent) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data.type !== 'string' || !known.has(data.type)) return;

    if (data.type === EXT_TO_APP.HELLO_BACK) {
      clearTimeout(timer);
      publish(readHandshake(data as Partial<ExtensionHandshake>));
      return;
    }
    // A STATS/SENT/INBOX message from a build that never answered HELLO is how
    // a pre-handshake extension identifies itself: present, and speaking v1.
    if (status.state !== 'ready') {
      clearTimeout(timer);
      publish(LEGACY_STATUS);
    }
  };

  window.addEventListener('message', listener);

  const probe = () => {
    clearTimeout(timer);
    window.postMessage({ type: APP_TO_EXT.HELLO }, '*');
    // Nothing at all within the window means nothing is listening. A later
    // probe can still find it — the Operator may install it mid-session.
    timer = setTimeout(() => publish({ ...UNKNOWN, state: 'absent' }), HANDSHAKE_TIMEOUT_MS);
  };

  onChange(status);
  probe();
  window.addEventListener('focus', probe);

  return () => {
    clearTimeout(timer);
    window.removeEventListener('message', listener);
    window.removeEventListener('focus', probe);
    watchers.delete(onChange);
    if (watchers.size === 0) publish(UNKNOWN);
  };
}

// deno-lint-ignore-file
/** A raw Instagram thread snapshot, normalised by the content script. */
export type InboxSnapshot = { threads: unknown[] };

export type ExtensionMessage =
  | ({ type: typeof EXT_TO_APP.STATS } & Partial<ExtensionStats>)
  | ({ type: typeof EXT_TO_APP.SENT } & Partial<SentNotice>)
  | ({ type: typeof EXT_TO_APP.INBOX } & Partial<InboxSnapshot>)
  | ({ type: typeof EXT_TO_APP.HELLO_BACK } & Partial<ExtensionHandshake>);

/** Ask the extension for its current stats and latest inbox snapshot. */
export function requestExtensionSync(): void {
  window.postMessage({ type: APP_TO_EXT.GET_STATS }, '*');
  window.postMessage({ type: APP_TO_EXT.GET_INBOX }, '*');
}

/** The fate of one handoff attempt — whether it reached the extension at all. */
export interface Handoff {
  /** The message was posted to an extension that accepts it. */
  delivered: boolean;
  /** Present only when `delivered` is false: what to tell the Operator. */
  reason?: string;
}

/**
 * Hand a campaign to the extension.
 *
 * Delivery here means "an extension that understands CAMPAIGN received it" —
 * NOT that anything was sent. The extension confirms individual sends later via
 * EXT_TO_APP.SENT, and Sent is its word alone (see CONTEXT.md). Callers must
 * not treat `delivered: true` as sent; they must not treat it as reaching
 * Instagram either.
 *
 * What `delivered: false` buys is the case this used to swallow: no extension,
 * or one too old to know the message. Report the reason instead of a success
 * toast for work nothing will ever do.
 */
export function sendCampaign(payload: CampaignPayload): Handoff {
  if (!accepts(APP_TO_EXT.CAMPAIGN)) {
    return { delivered: false, reason: explainRefusal() };
  }
  window.postMessage({ type: APP_TO_EXT.CAMPAIGN, payload }, '*');
  return { delivered: true };
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
