// ═══════════════════════════════════════════════════════════════════
// MagnetEngine — app ↔ extension wire protocol
// ═══════════════════════════════════════════════════════════════════
//
// The single definition of every message name that crosses between the
// dashboard and the extension. Before this file, each name was a bare string
// literal written out in at least two places with nothing linking them, the
// relay's whole contract was "anything starting with MAGNET_ENGINE_", and the
// background worker dispatched on `request.type` in one branch and
// `request.action` in four others. Drift was silent: content.js no-ops when
// chrome.runtime is missing, so a renamed message just stopped arriving.
//
// Loaded as a CLASSIC script by both sides — importScripts() in the service
// worker, and first in the content_scripts list — because the extension has no
// build step. The app has its own typed adapter in src/lib/extensionProtocol.ts;
// a test asserts the two agree, so a rename here fails the build rather than
// the product.

const MAGNET_PROTOCOL = {
  /** Every page↔extension message name starts with this. */
  PREFIX: 'MAGNET_ENGINE_',

  /** Page → extension, over window.postMessage. */
  APP_TO_EXT: {
    CAMPAIGN: 'MAGNET_ENGINE_CAMPAIGN',
    GET_STATS: 'MAGNET_ENGINE_GET_STATS',
    GET_INBOX: 'MAGNET_ENGINE_GET_INBOX',
  },

  /** Extension → page, relayed into the page by the content script. */
  EXT_TO_APP: {
    STATS: 'MAGNET_ENGINE_STATS',
    SENT: 'MAGNET_ENGINE_SENT',
    INBOX: 'MAGNET_ENGINE_INBOX',
  },

  /**
   * Internal chrome.runtime messages (content script / popup → background).
   * Historically sent under `action`, while the campaign handoff arrived under
   * `type`; the background worker now reads either through messageKind().
   */
  RUNTIME: {
    TASK_COMPLETE: 'TASK_COMPLETE',
    INBOX_SYNC: 'INBOX_SYNC',
    GET_STATS: 'getStats',
    GET_INBOX: 'getInbox',
    PAUSE: 'pauseCampaign',
    RESUME: 'resumeCampaign',
    CLEAR: 'clearCampaign',
    CLOSE_TAB: 'closeCurrentTab',
  },

  /** Hosts whose pages may talk to the extension. Keep in sync with manifest matches. */
  APP_HOSTS: ['magnetengine.xyz'],
};

/** True for any message the content script should relay into the page. */
function isAppMessage(message) {
  return Boolean(
    message &&
    typeof message.type === 'string' &&
    message.type.startsWith(MAGNET_PROTOCOL.PREFIX),
  );
}

/** One dispatch key, whichever field the sender used. */
function messageKind(request) {
  if (!request) return '';
  return String(request.type || request.action || '');
}

/** Normalize a campaign payload, applying the extension's own defaults. */
function readCampaign(payload, defaults) {
  const minDelay = Number(payload?.minDelay) || defaults.minDelay;
  const maxDelay = Math.max(minDelay, Number(payload?.maxDelay) || defaults.maxDelay);
  return {
    leads: Array.isArray(payload?.leads) ? payload.leads : [],
    minDelay,
    maxDelay,
    dailyCap: Number(payload?.dailyCap) || defaults.dailyCap,
  };
}

globalThis.MAGNET_PROTOCOL = MAGNET_PROTOCOL;
globalThis.isAppMessage = isAppMessage;
globalThis.messageKind = messageKind;
globalThis.readCampaign = readCampaign;
