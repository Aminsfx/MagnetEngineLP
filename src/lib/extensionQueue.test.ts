import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The extension's send queue, outside Chrome: the real background.js (with
 * protocol.js and igsend.js) against stubbed storage, alarms and tabs.
 *
 * The regression: every handoff REPLACED the queue. That is right for the
 * Approval Queue's Send, which hands over every approved DM, and wrong for
 * everything else that goes out the same way. An Inbox reply, an autopilot
 * reply or a batch of follow-ups handed over mid-campaign threw away every
 * approved DM still waiting, which the dashboard went on showing as with the
 * extension. And a handoff that arrived while a DM was being typed was refused
 * after the dashboard had already counted it delivered.
 */

const ext = (file: string) => readFileSync(resolve(__dirname, '../../extension', file), 'utf8');

type Stub = Record<string | symbol, unknown>;
function noop(): Stub {
    const target = function () { /* no-op */ } as unknown as Stub;
    return new Proxy(target, {
        get: (t, prop) => (prop in t ? t[prop] : (t[prop] = noop())),
        apply: () => undefined,
    });
}

type QueueItem = { handle: string; message: string; added?: boolean };

function loadBackground(initial: Record<string, unknown> = {}, pendingAlarms: string[] = []) {
    const store: Record<string, unknown> = { account: { userId: 'u1', email: '' }, ...initial };
    const alarms = new Map<string, unknown>(pendingAlarms.map((name) => [name, { name }]));
    const opened: string[] = [];
    let onMessage: ((req: unknown, sender: unknown, respond: (r: unknown) => void) => unknown) | null = null;

    const chrome = noop();
    chrome.runtime = {
        id: 'test-extension',
        lastError: undefined,
        onMessage: { addListener: (fn: typeof onMessage) => { onMessage = fn; } },
        onStartup: { addListener: vi.fn() },
        getManifest: () => ({ version: '1.10.1' }),
    };
    chrome.alarms = {
        create: (name: string) => { alarms.set(name, { name }); },
        clear: (name: string) => { alarms.delete(name); },
        get: (name: string, cb: (a: unknown) => void) => cb(alarms.get(name)),
        onAlarm: { addListener: vi.fn() },
    };
    chrome.storage = {
        local: {
            get: (keys: string[], cb: (v: Record<string, unknown>) => void) => cb(Object.fromEntries(keys.map((k) => [k, store[k]]))),
            set: (patch: Record<string, unknown>, cb?: () => void) => { Object.assign(store, patch); cb?.(); },
            remove: (keys: string | string[], cb?: () => void) => { for (const k of [keys].flat()) delete store[k]; cb?.(); },
        },
    };
    chrome.tabs = {
        query: (_q: unknown, cb: (t: unknown[]) => void) => cb([]),
        sendMessage: (_id: number, _msg: unknown, cb?: () => void) => cb?.(),
        onRemoved: { addListener: vi.fn() },
        create: (props: { url: string }, cb?: (t: { id: number; url: string }) => void) => {
            opened.push(props.url);
            cb?.({ id: 90, url: props.url });
        },
        update: (id: number, props: { url: string }, cb?: (t: { id: number; url: string }) => void) => {
            opened.push(props.url);
            cb?.({ id, url: props.url });
        },
    };
    const importScripts = (...files: string[]) => { for (const f of files) new Function(ext(f))(); };
    new Function('chrome', 'importScripts', ext('background.js'))(chrome, importScripts);
    expect(onMessage).not.toBeNull();

    const handOver = (leads: QueueItem[], mode?: 'add') =>
        new Promise<Record<string, unknown>>((done) => onMessage!(
            { type: 'MAGNET_ENGINE_CAMPAIGN', payload: { leads, minDelay: 3, maxDelay: 8, dailyCap: 40, ...(mode ? { mode } : {}) } },
            {},
            done as (r: unknown) => void,
        ));
    const queue = () => ((store.campaignQueue as QueueItem[]) || []).map((l) => l.handle);
    return { store, alarms, opened, handOver, queue };
}

const dm = (handle: string, message = `hey ${handle}`): QueueItem => ({ handle, message });
const reply = dm('maya', 'Tuesday at 3 works, see you then.');

describe('handing a reply or a follow-up to a running campaign', () => {
    it('joins the queue, at the front, instead of replacing it', async () => {
        const { store, handOver, queue } = loadBackground(
            { campaignQueue: [dm('a'), dm('b'), dm('c')], originalTotal: 5, failedCount: 1, isExecuting: false },
            ['dripEngine'], // waiting between two sends
        );

        const answer = await handOver([reply], 'add');

        expect(answer).toMatchObject({ status: 'queued' });
        expect(queue()).toEqual(['maya', 'a', 'b', 'c']);
        // The campaign's own progress is not reset by a reply joining it.
        expect(store.originalTotal).toBe(6);
        expect(store.failedCount).toBe(1);
    });

    it('is taken while a DM is being typed, and leaves that DM alone', async () => {
        const inFlight = { ...dm('x'), dispatched: true };
        const { store, handOver, queue, opened } = loadBackground({
            campaignQueue: [dm('a')], isExecuting: true, currentTask: inFlight,
        });

        const answer = await handOver([reply], 'add');

        expect(answer).toMatchObject({ status: 'queued' });
        expect(queue()).toEqual(['maya', 'a']);
        expect(store.isExecuting).toBe(true);
        expect(store.currentTask).toEqual(inFlight);
        expect(opened).toEqual([]); // no second send started on top of the first
    });

    it('queues the same reply once, however often it is handed over', async () => {
        const { handOver, queue } = loadBackground({ campaignQueue: [dm('a')] }, ['dripEngine']);

        await handOver([reply], 'add');
        await handOver([reply], 'add');

        expect(queue()).toEqual(['maya', 'a']);
    });

    it('leaves a paused campaign paused', async () => {
        const { store, handOver, queue, opened } = loadBackground({ campaignQueue: [dm('a')], isPaused: true });

        await handOver([reply], 'add');

        expect(store.isPaused).toBe(true);
        expect(queue()).toEqual(['maya', 'a']);
        expect(opened).toEqual([]);
    });

    it('goes out at once when nothing else is waiting', async () => {
        const { store, handOver, opened } = loadBackground({});

        await handOver([reply], 'add');

        expect(store.isExecuting).toBe(true);
        expect(store.currentTask).toMatchObject({ handle: 'maya', message: reply.message });
        expect(opened).toHaveLength(1);
    });
});

describe('the Approval Queue handing over every approved DM', () => {
    it('replaces the queue, and keeps the replies still waiting in it', async () => {
        const { handOver, queue } = loadBackground(
            { campaignQueue: [{ ...reply, added: true }, dm('a')] },
            ['dripEngine'],
        );

        await handOver([dm('b'), dm('c')]);

        expect(queue()).toEqual(['maya', 'b', 'c']);
    });

    it('is taken while a DM is being typed, without sending that DM twice or starting a second send', async () => {
        const inFlight = { ...dm('x'), dispatched: true };
        const { store, handOver, queue, opened } = loadBackground({
            campaignQueue: [dm('a')], isExecuting: true, currentTask: inFlight,
        });

        // x is still approved and not yet confirmed Sent, so the dashboard hands it over again.
        const answer = await handOver([dm('x'), dm('a'), dm('b')]);

        expect(answer).toMatchObject({ status: 'queued' });
        expect(queue()).toEqual(['a', 'b']);
        expect(store.isExecuting).toBe(true);
        expect(store.currentTask).toEqual(inFlight);
        expect(opened).toEqual([]);
    });

    it('still starts a fresh campaign straight away', async () => {
        const { store, handOver, queue, opened } = loadBackground({});

        const answer = await handOver([dm('a'), dm('b')]);

        expect(answer).toMatchObject({ status: 'queued', count: 2 });
        expect(store.currentTask).toMatchObject({ handle: 'a' });
        expect(queue()).toEqual(['b']);
        expect(store.originalTotal).toBe(2);
        expect(opened).toHaveLength(1);
    });
});
