import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APP_TO_EXT,
  EXT_TO_APP,
  PROTOCOL_PREFIX,
  PROTOCOL_VERSION,
  accepts,
  getExtensionStatus,
  onExtensionMessage,
  requestExtensionSync,
  sendCampaign,
  watchExtension,
  type ExtensionStatus,
} from './extensionProtocol';

/**
 * The extension has no build step, so its half of the protocol is a plain
 * classic script. These tests are what stops the two halves drifting: they
 * evaluate extension/protocol.js and compare it to the typed module.
 */
function loadExtensionScope(): Record<string, unknown> {
  const source = readFileSync(resolve(__dirname, '../../extension/protocol.js'), 'utf8');
  const scope: Record<string, unknown> = {};
  new Function('globalThis', source)(scope);
  return scope;
}

function loadExtensionProtocol(): {
  PREFIX: string;
  VERSION: number;
  APP_TO_EXT: Record<string, string>;
  EXT_TO_APP: Record<string, string>;
  RUNTIME: Record<string, string>;
  APP_HOSTS: string[];
} {
  return loadExtensionScope().MAGNET_PROTOCOL as ReturnType<typeof loadExtensionProtocol>;
}

describe('protocol definitions agree across the seam', () => {
  const ext = loadExtensionProtocol();

  it('page → extension names match', () => {
    expect(ext.APP_TO_EXT).toEqual({ ...APP_TO_EXT });
  });

  it('extension → page names match', () => {
    expect(ext.EXT_TO_APP).toEqual({ ...EXT_TO_APP });
  });

  it('the relay prefix matches', () => {
    expect(ext.PREFIX).toBe(PROTOCOL_PREFIX);
  });

  it('every message name carries the prefix the relay filters on', () => {
    for (const name of [...Object.values(APP_TO_EXT), ...Object.values(EXT_TO_APP)]) {
      expect(name.startsWith(PROTOCOL_PREFIX)).toBe(true);
    }
  });

  it('the extension is loaded on every host the app is served from', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(__dirname, '../../extension/manifest.json'), 'utf8'),
    );
    const matches: string[] = manifest.content_scripts[0].matches;
    // broadcastToApp only reaches tabs on these hosts; if the manifest stops
    // matching one, the extension goes quiet there with no error. ef5787b was
    // the same class of bug one layer up.
    for (const host of ext.APP_HOSTS) {
      expect(matches.some((m) => m.includes(host))).toBe(true);
    }
  });

  it('loads protocol.js before the scripts that use it', () => {
    const manifest = JSON.parse(
      readFileSync(resolve(__dirname, '../../extension/manifest.json'), 'utf8'),
    );
    expect(manifest.content_scripts[0].js[0]).toBe('protocol.js');
  });

  it('speaks the same protocol revision on both sides', () => {
    expect(ext.VERSION).toBe(PROTOCOL_VERSION);
  });

  it('describes itself with every name it can act on', () => {
    const scope = loadExtensionScope();
    const describe_ = scope.describeExtension as () => {
      type: string; protocolVersion: number; version: string; accepts: string[];
    };
    const hello = describe_();

    expect(hello.type).toBe(EXT_TO_APP.HELLO_BACK);
    expect(hello.protocolVersion).toBe(PROTOCOL_VERSION);
    // Derived from APP_TO_EXT, so a new message name can't be added to the
    // dispatch without also being advertised as a capability.
    expect(new Set(hello.accepts)).toEqual(new Set(Object.values(APP_TO_EXT)));
  });

  it('answers HELLO from the content script, not the background worker', () => {
    // Answering locally is what makes the probe cheap enough to run on every
    // focus: no service-worker wake, no round trip. If this moves to
    // background.js the handshake still works but pays for a wake each time.
    const content = readFileSync(resolve(__dirname, '../../extension/content.js'), 'utf8');
    expect(content).toContain('APP_TO_EXT.HELLO');
    expect(content).toContain('describeExtension()');
  });
});

describe('app adapter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends a campaign under the agreed name', () => {
    const posted = vi.spyOn(window, 'postMessage');
    sendCampaign({
      leads: [{ handle: 'a', message: 'hi' }],
      minDelay: 3, maxDelay: 8, dailyCap: 40,
    });

    expect(posted).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MAGNET_ENGINE_CAMPAIGN' }),
      '*',
    );
  });

  it('asks for both stats and inbox on sync', () => {
    const posted = vi.spyOn(window, 'postMessage');
    requestExtensionSync();

    const types = posted.mock.calls.map(([m]) => (m as { type: string }).type);
    expect(types).toContain(APP_TO_EXT.GET_STATS);
    expect(types).toContain(APP_TO_EXT.GET_INBOX);
  });

  it('delivers known extension messages and ignores everything else', () => {
    const seen: string[] = [];
    const stop = onExtensionMessage((m) => seen.push(m.type));

    window.dispatchEvent(new MessageEvent('message', {
      source: window, data: { type: EXT_TO_APP.SENT, handle: 'a' },
    }));
    // Unknown type, and a message with no type at all.
    window.dispatchEvent(new MessageEvent('message', {
      source: window, data: { type: 'SOMETHING_ELSE' },
    }));
    window.dispatchEvent(new MessageEvent('message', { source: window, data: 'hello' }));

    stop();
    window.dispatchEvent(new MessageEvent('message', {
      source: window, data: { type: EXT_TO_APP.STATS },
    }));

    expect(seen).toEqual([EXT_TO_APP.SENT]);
  });
});

/**
 * The handshake. Everything here is about the window between a dashboard
 * deploy and a Chrome Web Store update landing on an Operator's machine —
 * the one state the in-repo agreement tests above can say nothing about.
 */
describe('version handshake', () => {
  /** Watch, run a scenario, and always stop — status is module-level. */
  function watching(run: (seen: ExtensionStatus[]) => void): void {
    const seen: ExtensionStatus[] = [];
    const stop = watchExtension((s) => seen.push(s));
    try {
      run(seen);
    } finally {
      stop();
    }
  }

  function announce(data: Record<string, unknown>): void {
    window.dispatchEvent(new MessageEvent('message', { source: window, data }));
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('starts out unknown rather than assuming either way', () => {
    expect(getExtensionStatus().state).toBe('checking');
  });

  it('reads a handshake as ready, with what that build accepts', () => {
    watching(() => {
      announce({
        type: EXT_TO_APP.HELLO_BACK,
        protocolVersion: PROTOCOL_VERSION,
        version: '1.5.0',
        accepts: Object.values(APP_TO_EXT),
      });

      const status = getExtensionStatus();
      expect(status.state).toBe('ready');
      expect(status.version).toBe('1.5.0');
      expect(status.needsUpdate).toBe(false);
      expect(accepts(APP_TO_EXT.CAMPAIGN)).toBe(true);
    });
  });

  it('flags a build that handshakes on an older revision', () => {
    watching(() => {
      announce({
        type: EXT_TO_APP.HELLO_BACK,
        protocolVersion: PROTOCOL_VERSION - 1,
        version: '1.5.0',
        accepts: [APP_TO_EXT.CAMPAIGN],
      });

      expect(getExtensionStatus().needsUpdate).toBe(true);
      // Still does what it advertised, though — an update prompt is not a stop.
      expect(accepts(APP_TO_EXT.CAMPAIGN)).toBe(true);
      expect(accepts('MAGNET_ENGINE_SOMETHING_NEWER')).toBe(false);
    });
  });

  it('reads a pre-handshake build from any other message it sends', () => {
    watching(() => {
      // A ≤1.4.0 extension ignores HELLO but still answers GET_STATS. That
      // answer is the only evidence those builds can give that they exist.
      announce({ type: EXT_TO_APP.STATS, dailySentCount: 3 });

      const status = getExtensionStatus();
      expect(status.state).toBe('legacy');
      expect(status.protocolVersion).toBe(1);
      expect(status.needsUpdate).toBe(true);
    });
  });

  it('keeps sending campaigns to a pre-handshake build', () => {
    // The whole point of a capability list rather than a version cutoff: 1.4.0
    // sends DMs perfectly well, so the handshake must not break it.
    const posted = vi.spyOn(window, 'postMessage');
    watching(() => {
      announce({ type: EXT_TO_APP.STATS });
      posted.mockClear();

      const handoff = sendCampaign({
        leads: [{ handle: 'a', message: 'hi' }], minDelay: 3, maxDelay: 8, dailyCap: 40,
      });

      expect(handoff.delivered).toBe(true);
      expect(posted).toHaveBeenCalledWith(
        expect.objectContaining({ type: APP_TO_EXT.CAMPAIGN }), '*',
      );
    });
  });

  it('settles to absent when nothing answers, and refuses to pretend', () => {
    vi.useFakeTimers();
    const posted = vi.spyOn(window, 'postMessage');
    watching(() => {
      vi.advanceTimersByTime(5000);
      expect(getExtensionStatus().state).toBe('absent');

      posted.mockClear();
      const handoff = sendCampaign({
        leads: [{ handle: 'a', message: 'hi' }], minDelay: 3, maxDelay: 8, dailyCap: 40,
      });

      expect(handoff.delivered).toBe(false);
      expect(handoff.reason).toMatch(/install/i);
      // Nothing posted: the caller reports the reason instead of a false success.
      expect(posted).not.toHaveBeenCalled();
    });
  });

  it('names the version to update when the build is too old for a message', () => {
    watching(() => {
      announce({
        type: EXT_TO_APP.HELLO_BACK,
        protocolVersion: 1,
        version: '1.4.0',
        accepts: [APP_TO_EXT.GET_STATS], // knows stats, not campaigns
      });

      const handoff = sendCampaign({
        leads: [{ handle: 'a', message: 'hi' }], minDelay: 3, maxDelay: 8, dailyCap: 40,
      });

      expect(handoff.delivered).toBe(false);
      expect(handoff.reason).toContain('1.4.0');
      expect(handoff.reason).toMatch(/update/i);
    });
  });

  it('stays optimistic before the probe settles', () => {
    // An unanswered probe is not evidence of absence. Blocking here would make
    // the handshake cause the very failure it exists to report.
    watching(() => {
      expect(getExtensionStatus().state).toBe('checking');
      expect(sendCampaign({
        leads: [{ handle: 'a', message: 'hi' }], minDelay: 3, maxDelay: 8, dailyCap: 40,
      }).delivered).toBe(true);
    });
  });

  it('forgets what it learned once nobody is watching', () => {
    watching(() => announce({ type: EXT_TO_APP.STATS }));
    expect(getExtensionStatus().state).toBe('checking');
  });
});
