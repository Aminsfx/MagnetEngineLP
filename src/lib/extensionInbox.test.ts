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
            id: 'test-extension',
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

    // Last in this block: once cut off, this copy stays cut off.
    it('once an update cuts it off, forwards nothing and reloads the tab when nobody is looking at it', async () => {
        // jsdom cannot navigate; asking it to is how a reload shows up here.
        const reloads: string[] = [];
        const jsdom = (globalThis as unknown as { jsdom: { virtualConsole: { on(e: string, fn: (err: Error) => void): void } } }).jsdom;
        jsdom.virtualConsole.on('jsdomError', (err) => { if (/navigation/i.test(err.message)) reloads.push(err.message); });
        let visibility = 'visible';
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility });
        const box = document.createElement('div');
        box.setAttribute('role', 'textbox');
        box.setAttribute('contenteditable', 'true');
        document.body.append(box);

        try {
            // Chrome takes the id away from every copy an update or reload leaves behind.
            (globalThis as unknown as { chrome: { runtime: { id?: string } } }).chrome.runtime.id = undefined;
            const before = sent.length;
            toPage.length = 0;
            fromPage('PolarisDirectInboxQuery', mailbox);

            // The page hook is told to stop replaying for nobody.
            await vi.waitFor(() => expect(toPage).toContainEqual({ source: 'magnet-engine-ig-ctl', enabled: false }));
            await new Promise((r) => setTimeout(r, 1800));
            expect(sent.length).toBe(before);
            // Not under the Operator's eyes...
            expect(reloads).toHaveLength(0);

            // ...nor over a message they are typing.
            box.textContent = 'half a reply';
            visibility = 'hidden';
            document.dispatchEvent(new Event('visibilitychange'));
            expect(reloads).toHaveLength(0);

            box.textContent = '';
            visibility = 'visible';
            document.dispatchEvent(new Event('visibilitychange'));
            expect(reloads).toHaveLength(0);
            visibility = 'hidden';
            document.dispatchEvent(new Event('visibilitychange'));
            expect(reloads).toHaveLength(1);

            // Once: the reloaded page is a new, connected copy.
            document.dispatchEvent(new Event('visibilitychange'));
            expect(reloads).toHaveLength(1);
        } finally {
            box.remove();
            delete (document as unknown as Record<string, unknown>).visibilityState;
        }
    });
});

type Tab = { id: number; url: string };

/** The real background.js against stubbed Chrome APIs whose effects can be read back. */
function loadBackground(tabs: Tab[], initial: Record<string, unknown> = {}) {
    const store: Record<string, unknown> = { ...initial };
    const broadcasts: Array<Record<string, unknown>> = [];
    const created: Array<Record<string, unknown>> = [];
    const reloaded: number[] = [];
    let onMessage: ((req: unknown, sender: unknown, respond: (r: unknown) => void) => unknown) | null = null;
    let onAlarm: ((alarm: { name: string }) => void) | null = null;

    const chrome = noop();
    chrome.runtime = {
        id: 'test-extension',
        lastError: undefined,
        onMessage: { addListener: (fn: typeof onMessage) => { onMessage = fn; } },
        onStartup: { addListener: vi.fn() },
        getManifest: () => ({ version: '1.10.0' }),
    };
    chrome.alarms = {
        create: vi.fn(), clear: vi.fn(), get: vi.fn(),
        onAlarm: { addListener: (fn: typeof onAlarm) => { onAlarm = fn; } },
    };
    chrome.storage = {
        local: {
            get: (keys: string[], cb: (v: Record<string, unknown>) => void) => cb(Object.fromEntries(keys.map((k) => [k, store[k]]))),
            set: (patch: Record<string, unknown>, cb?: () => void) => { Object.assign(store, patch); cb?.(); },
            remove: (keys: string | string[], cb?: () => void) => { for (const k of [keys].flat()) delete store[k]; cb?.(); },
        },
    };
    chrome.tabs = {
        query: (_q: unknown, cb: (t: Tab[]) => void) => cb(tabs),
        sendMessage: (id: number, msg: Record<string, unknown>, cb?: () => void) => { if (id === 7) broadcasts.push(msg); cb?.(); },
        onRemoved: { addListener: vi.fn() },
        reload: (id: number, cb?: () => void) => { reloaded.push(id); cb?.(); },
        create: (props: Record<string, unknown>, cb?: (t: Tab) => void) => {
            created.push(props);
            const tab = { id: 50 + created.length, url: String(props.url) };
            tabs.push(tab);
            cb?.(tab);
        },
    };
    new Function('chrome', 'importScripts', ext('background.js'))(chrome, () => new Function(ext('protocol.js'))());
    expect(onMessage).not.toBeNull();
    expect(onAlarm).not.toBeNull();

    const ask = (req: Record<string, unknown>) =>
        new Promise<Record<string, unknown>>((done) => onMessage!(req, {}, done as (r: unknown) => void));
    const alarm = (name: string) => onAlarm!({ name });
    return { store, broadcasts, created, reloaded, ask, alarm };
}

const DASHBOARD: Tab = { id: 7, url: 'http://localhost:3001/inbox' };
const me = { id: '111', username: 'me.coaching', avatarUrl: '' };
const mayaThread = (id: string, text: string, createdAt: string) =>
    ({ threadId: 't1', handle: 'maya.builds', name: 'Maya R.', avatarUrl: '', messages: [{ id, direction: 'in', text, createdAt }] });

describe('background.js INBOX_SYNC', () => {
    it('merges pieces into one snapshot and tells the dashboard', async () => {
        const { store, broadcasts, ask } = loadBackground([DASHBOARD, { id: 8, url: 'https://www.instagram.com/' }]);
        const send = (threads: unknown[]) => ask({ action: 'INBOX_SYNC', threads, viewer: me, partial: true });

        await send([mayaThread('mid.$2', 'What do you do?', '2026-10-14T10:02:00Z')]);
        // A history-only piece names nobody; the stored handle carries over.
        await send([{ threadId: 't1', handle: '', name: '', avatarUrl: '', messages: [{ id: 'mid.$1', direction: 'out', text: 'Hey Maya', createdAt: '2026-10-14T10:00:00Z' }] }]);

        const saved = store.inboxThreads as Array<{ handle: string; messages: Array<{ id: string }> }>;
        expect(saved).toHaveLength(1);
        expect(saved[0].handle).toBe('maya.builds');
        expect(saved[0].messages.map((m) => m.id)).toEqual(['mid.$1', 'mid.$2']);
        expect(broadcasts.at(-1)).toMatchObject({ type: EXT_TO_APP.INBOX, viewer: me, threads: [{ handle: 'maya.builds' }] });
    });

    it('says when threads last came in from Instagram, which re-sending the snapshot does not change', async () => {
        const { broadcasts, ask } = loadBackground([DASHBOARD]);

        // Signed in, nothing read yet.
        await ask({ action: 'INBOX_SYNC', viewer: me });
        expect(broadcasts.at(-1)).toMatchObject({ type: EXT_TO_APP.INBOX, syncedAt: null });

        const t0 = Date.now();
        await ask({ action: 'INBOX_SYNC', threads: [mayaThread('mid.$2', 'What do you do?', '2026-10-14T10:02:00Z')], viewer: me, partial: true });
        const readAt = broadcasts.at(-1)!.syncedAt as number;
        expect(readAt).toBeGreaterThanOrEqual(t0);

        // The viewer-only sync every 100 s re-sends the stored threads: they are not a new read.
        await new Promise((r) => setTimeout(r, 5));
        await ask({ action: 'INBOX_SYNC', viewer: me });
        expect(broadcasts.at(-1)).toMatchObject({ syncedAt: readAt, threads: [{ handle: 'maya.builds' }] });
        expect(await ask({ action: 'getInbox' })).toMatchObject({ syncedAt: readAt, viewer: me });

        // Someone else logged in to Instagram here: their inbox has never been read.
        await ask({ action: 'INBOX_SYNC', viewer: { id: '999', username: 'other', avatarUrl: '' } });
        expect(broadcasts.at(-1)).toMatchObject({ syncedAt: null, threads: [] });
    });
});

describe('background.js keeping the inbox read during a campaign', () => {
    const campaign = { account: { userId: 'u1' }, isExecuting: true, campaignQueue: [{ handle: 'a' }] };
    const SENDER: Tab = { id: 9, url: 'https://www.instagram.com/someone/?hl=en' };

    it('opens a pinned inbox tab when nothing has been read, though the Sender Tab is on Instagram', () => {
        const { store, created, alarm } = loadBackground([DASHBOARD, SENDER], { ...campaign, senderTabId: 9 });
        alarm('inboxKeepAlive');
        expect(created).toEqual([{ url: 'https://www.instagram.com/direct/inbox/', active: false, pinned: true }]);
        expect(store.inboxTabId).toBe(51);

        // Three minutes on, still nothing read: the same tab, not a second one.
        alarm('inboxKeepAlive');
        expect(created).toHaveLength(1);
    });

    it('leaves Instagram alone while threads are coming in, and outside a campaign', () => {
        const reading = loadBackground([DASHBOARD, SENDER], { ...campaign, inboxSyncedAt: Date.now() - 60_000 });
        reading.alarm('inboxKeepAlive');
        expect(reading.created).toHaveLength(0);

        const idle = loadBackground([DASHBOARD], { account: { userId: 'u1' }, isExecuting: false, campaignQueue: [] });
        idle.alarm('inboxKeepAlive');
        expect(idle.created).toHaveLength(0);
    });

    it('reloads its own inbox tab when that stops reading, at most every 15 minutes', () => {
        const ours: Tab = { id: 51, url: 'https://www.instagram.com/direct/inbox/' };
        const stale = { ...campaign, inboxSyncedAt: Date.now() - 30 * 60_000, inboxTabId: 51 };

        const tab = loadBackground([DASHBOARD, ours], { ...stale, inboxTabReloadedAt: Date.now() - 20 * 60_000 });
        tab.alarm('inboxKeepAlive');
        expect(tab.reloaded).toEqual([51]);
        expect(tab.created).toHaveLength(0);
        tab.alarm('inboxKeepAlive');
        expect(tab.reloaded).toEqual([51]);
    });
});
