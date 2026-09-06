import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APP_TO_EXT,
  EXT_TO_APP,
  PROTOCOL_PREFIX,
  onExtensionMessage,
  requestExtensionSync,
  sendCampaign,
} from './extensionProtocol';

/**
 * The extension has no build step, so its half of the protocol is a plain
 * classic script. These tests are what stops the two halves drifting: they
 * evaluate extension/protocol.js and compare it to the typed module.
 */
function loadExtensionProtocol(): {
  PREFIX: string;
  APP_TO_EXT: Record<string, string>;
  EXT_TO_APP: Record<string, string>;
  RUNTIME: Record<string, string>;
  APP_HOSTS: string[];
} {
  const source = readFileSync(resolve(__dirname, '../../extension/protocol.js'), 'utf8');
  const scope: Record<string, unknown> = {};
  new Function('globalThis', source)(scope);
  return scope.MAGNET_PROTOCOL as ReturnType<typeof loadExtensionProtocol>;
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
