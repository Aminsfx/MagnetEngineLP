import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * extension/igpage.js runs in instagram.com's own page and reads the inbox
 * responses Instagram's web app fetches. Instagram uses three request styles,
 * seen on a real account on 2026-10-15: XHR with a form string (navigating to
 * Messages), fetch with `init.body`, and — for the first inbox load on a full
 * page load — fetch with a Request object, whose body lives on the Request.
 */

const mailbox = { data: { get_slide_mailbox_for_iris_subscription: { threads_by_folder: { edges: [] } } } };
const form = (name: string) => `fb_api_req_friendly_name=${name}&doc_id=123&variables=%7B%7D`;

describe('igpage.js', () => {
    const emitted: Array<{ name: string }> = [];
    const pageFetch = vi.fn(async () => new Response(JSON.stringify(mailbox), { status: 200 }));

    beforeAll(() => {
        window.fetch = pageFetch as unknown as typeof fetch;
        window.addEventListener('message', (e) => {
            const d = e.data as { source?: string; name: string };
            if (d?.source === 'magnet-engine-ig') emitted.push(d);
        });
        new Function(readFileSync(resolve(__dirname, '../../extension/igpage.js'), 'utf8'))();
    });

    it('reads an inbox fetched with a Request object, as on a full page load', async () => {
        await window.fetch(new Request('https://www.instagram.com/api/graphql', {
            method: 'POST',
            body: form('PolarisDirectInboxQuery'),
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
        }));
        await vi.waitFor(() => expect(emitted.map((e) => e.name)).toContain('PolarisDirectInboxQuery'));
    });

    it('reads one fetched with init.body, and ignores queries that are not the inbox', async () => {
        emitted.length = 0;
        await window.fetch('https://www.instagram.com/api/graphql', { method: 'POST', body: form('PolarisFeedQuery') });
        await window.fetch('https://www.instagram.com/api/graphql', { method: 'POST', body: form('IGDThreadDetailQuery') });
        await vi.waitFor(() => expect(emitted.map((e) => e.name)).toEqual(['IGDThreadDetailQuery']));
    });

    it('replays the last inbox request once someone is signed in', async () => {
        pageFetch.mockClear();
        // jsdom's postMessage leaves `source` unset, and the hook only trusts its own window.
        window.dispatchEvent(new MessageEvent('message', { data: { source: 'magnet-engine-ig-ctl', enabled: true }, source: window }));
        await vi.waitFor(() => expect(pageFetch).toHaveBeenCalled(), { timeout: 4000 });
        const [url, init] = pageFetch.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('https://www.instagram.com/api/graphql');
        expect(new URLSearchParams(String(init.body)).get('fb_api_req_friendly_name')).toBe('PolarisDirectInboxQuery');
    });
});
