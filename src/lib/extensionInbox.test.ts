import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { EXT_TO_APP } from './extensionProtocol';
import { resolve } from 'node:path';

/**
 * The extension's inbox path end to end, outside Chrome: the real
 * content.js on an instagram.com page receives the GraphQL responses the page
 * hook (igpage.js) passes it, and the real background.js merges them and tells
 * the dashboard. Chrome's APIs are stubbed; everything else is the shipped code.
 *
 * The payloads have the shape Instagram's web app received on a real account
 * on 2026-10-14 (PolarisDirectInboxQuery → get_slide_mailbox_for_iris_subscription,
 * IGDThreadDetailQuery → get_slide_thread_nullable): the inbox names the viewer
 * with a photo but no username, and a thread's detail carries more history.
 */

const ext = (file: string) => readFileSync(resolve(__dirname, '../../extension', file), 'utf8');

/** A stand-in for any chrome.* API not stubbed explicitly: every property is a no-op function. */
type Stub = Record<string | symbol, unknown>;
function noop(): Stub {
    const target = function () { /* no-op */ } as unknown as Stub;
    return new Proxy(target, {
        get: (t, prop) => (prop in t ? t[prop] : (t[prop] = noop())),
        apply: () => undefined,
    });
}

const viewer = { pk: '111', id: '111', profile_pic_url: 'https://cdn/me.jpg', interop_messaging_user_fbid: '9001' };
const maya = { pk: '222', id: '222', username: 'maya.builds', full_name: 'Maya R.', profile_pic_url: 'https://cdn/maya.jpg', interop_messaging_user_fbid: '9002' };
const node = (id: string, fbid: string, text: string, ms: number) => ({ node: { message_id: id, sender_fbid: fbid, text_body: text, timestamp_ms: String(ms) } });
const THREAD_ID = '340282366841710300949128100000000001';

const mailbox = {
    get_slide_mailbox_for_iris_subscription: {
        threads_by_folder: {
            edges: [{
                node: {
                    as_ig_direct_thread: {
                        thread_id: THREAD_ID, viewer, users: [maya],
                        slide_messages: { edges: [node('mid.$2', '9002', 'What do you actually do?', 2_000), node('mid.$1', '9001', 'Hey Maya', 1_000)] },
                    },
                },
            }],
        },
    },
};

const detail = {
    get_slide_thread_nullable: {
        as_ig_direct_thread: {
            thread_id: THREAD_ID, viewer, users: [maya],
            slide_messages: { edges: [node('mid.$0', '9001', 'An older opener', 500), node('mid.$1', '9001', 'Hey Maya', 1_000)] },
        },
    },
};

const fromPage = (name: string, data: unknown) =>
    window.dispatchEvent(new MessageEvent('message', { data: { source: 'magnet-engine-ig', name, data }, source: window }));

describe('content.js on instagram.com', () => {
    const sent: Array<Record<string, unknown>> = [];
    const toPage: unknown[] = [];

    beforeAll(() => {
        (globalThis as unknown as { jsdom: { reconfigure(o: { url: string }): void } }).jsdom.reconfigure({ url: 'https://www.instagram.com/direct/inbox/' });
        document.cookie = 'ds_user_id=111';
        const chrome = noop();
        chrome.runtime = {
            lastError: undefined,
            getManifest: () => ({ version: '1.9.0' }),
            onMessage: { addListener: vi.fn() },
            sendMessage: vi.fn((msg: Record<string, unknown>, cb?: (r?: unknown) => void) => { sent.push(msg); cb?.(undefined); }),
        };
        chrome.storage = {
            local: { get: vi.fn((_k: unknown, cb?: (v: unknown) => void) => { const v = { account: { userId: 'u1' } }; cb?.(v); return Promise.resolve(v); }) },
            onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
        };
        (globalThis as Record<string, unknown>).chrome = chrome;
        globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ form_data: { username: 'me.coaching' } }), { status: 200 })) as typeof fetch;
        window.addEventListener('message', (e) => { if ((e.data as { source?: string })?.source === 'magnet-engine-ig-ctl') toPage.push(e.data); });

        for (const file of ['protocol.js', 'igparse.js', 'content.js']) new Function(ext(file))();
    });

    it('turns the page hook on for a signed-in Operator', async () => {
        await vi.waitFor(() => expect(toPage).toContainEqual({ source: 'magnet-engine-ig-ctl', enabled: true }));
    });

    it('gathers a burst of inbox responses into one sync, with the viewer named and pictured', async () => {
        fromPage('PolarisDirectInboxQuery', mailbox);
        fromPage('IGDThreadDetailQuery', detail);

        await vi.waitFor(() => expect(sent.filter((m) => m.action === 'INBOX_SYNC' && m.threads)).toHaveLength(1), { timeout: 4000 });
        const sync = sent.find((m) => m.action === 'INBOX_SYNC' && m.threads)!;

        // The username comes from the account lookup; the photo from the inbox.
        expect(sync.viewer).toEqual({ id: '111', username: 'me.coaching', avatarUrl: 'https://cdn/me.jpg' });
        expect(sync.partial).toBe(true);
        const [thread] = sync.threads as Array<{ handle: string; messages: Array<{ id: string; direction: string }> }>;
        expect(thread.handle).toBe('maya.builds');
        expect(thread.messages.map((m) => [m.id, m.direction]).sort()).toEqual([
            ['mid.$0', 'out'], ['mid.$1', 'out'], ['mid.$2', 'in'],
        ]);
    });

    it('ignores messages that did not come from this page', async () => {
        const before = sent.length;
        window.dispatchEvent(new MessageEvent('message', { data: { source: 'magnet-engine-ig', name: 'x', data: mailbox }, source: null }));
        await new Promise((r) => setTimeout(r, 1800));
        expect(sent.length).toBe(before);
    });
});

describe('background.js INBOX_SYNC', () => {
    it('merges pieces into one snapshot and tells the dashboard', async () => {
        const store: Record<string, unknown> = {};
        const broadcasts: unknown[] = [];
        let onMessage: ((req: unknown, sender: unknown, respond: (r: unknown) => void) => unknown) | null = null;

        const chrome = noop();
        chrome.runtime = {
            lastError: undefined,
            onMessage: { addListener: (fn: typeof onMessage) => { onMessage = fn; } },
            onStartup: { addListener: vi.fn() },
            getManifest: () => ({ version: '1.9.0' }),
        };
        chrome.storage = {
            local: {
                get: (keys: string[], cb: (v: Record<string, unknown>) => void) => cb(Object.fromEntries(keys.map((k) => [k, store[k]]))),
                set: (patch: Record<string, unknown>, cb?: () => void) => { Object.assign(store, patch); cb?.(); },
            },
        };
        chrome.tabs = {
            query: (_q: unknown, cb: (tabs: unknown[]) => void) => cb([{ id: 7, url: 'http://localhost:3001/inbox' }, { id: 8, url: 'https://www.instagram.com/' }]),
            sendMessage: (id: number, msg: unknown, cb?: () => void) => { if (id === 7) broadcasts.push(msg); cb?.(); },
            onRemoved: { addListener: vi.fn() },
            create: vi.fn(),
        };
        const scope = { chrome, importScripts: () => new Function(ext('protocol.js'))() };
        new Function('chrome', 'importScripts', ext('background.js'))(scope.chrome, scope.importScripts);
        expect(onMessage).not.toBeNull();

        const me = { id: '111', username: 'me.coaching', avatarUrl: '' };
        const send = (threads: unknown[]) => new Promise((done) => onMessage!({ action: 'INBOX_SYNC', threads, viewer: me, partial: true }, {}, done));

        await send([{ threadId: 't1', handle: 'maya.builds', name: 'Maya R.', avatarUrl: '', messages: [{ id: 'mid.$2', direction: 'in', text: 'What do you do?', createdAt: '2026-10-14T10:02:00Z' }] }]);
        // A history-only piece names nobody; the stored handle carries over.
        await send([{ threadId: 't1', handle: '', name: '', avatarUrl: '', messages: [{ id: 'mid.$1', direction: 'out', text: 'Hey Maya', createdAt: '2026-10-14T10:00:00Z' }] }]);

        const saved = store.inboxThreads as Array<{ handle: string; messages: Array<{ id: string }> }>;
        expect(saved).toHaveLength(1);
        expect(saved[0].handle).toBe('maya.builds');
        expect(saved[0].messages.map((m) => m.id)).toEqual(['mid.$1', 'mid.$2']);
        expect(broadcasts.at(-1)).toMatchObject({ type: EXT_TO_APP.INBOX, viewer: me, threads: [{ handle: 'maya.builds' }] });
    });
});
