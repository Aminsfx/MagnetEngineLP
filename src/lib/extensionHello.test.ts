import { describe, it, expect, vi, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_TO_EXT, EXT_TO_APP } from './extensionProtocol';

/**
 * The real content.js on a dashboard page, answering the Handshake.
 *
 * When Chrome updates or reloads the extension, the copy already running in an
 * open dashboard tab is cut off from it (`chrome.runtime.id` goes away) but
 * goes on running. It used to answer HELLO anyway, so the dashboard showed the
 * extension as ready while nothing it handed over arrived and no inbox reached
 * it. A cut-off copy now stays silent, and the dashboard says it is missing.
 */

const ext = (file: string) => readFileSync(resolve(__dirname, '../../extension', file), 'utf8');

describe('content.js on the dashboard', () => {
    const answers: unknown[] = [];
    const runtime: Record<string, unknown> = {
        id: 'test-extension',
        lastError: undefined,
        getManifest: () => ({ version: '1.10.0' }),
        onMessage: { addListener: vi.fn() },
        sendMessage: vi.fn(),
    };

    beforeAll(() => {
        (globalThis as Record<string, unknown>).chrome = { runtime, storage: { local: { get: vi.fn() } } };
        window.addEventListener('message', (e) => {
            if ((e.data as { type?: string })?.type === EXT_TO_APP.HELLO_BACK) answers.push(e.data);
        });
        for (const file of ['protocol.js', 'content.js']) new Function(ext(file))();
    });

    const hello = () =>
        window.dispatchEvent(new MessageEvent('message', { data: { type: APP_TO_EXT.HELLO }, source: window }));

    it('answers the Handshake while it is connected to the extension', async () => {
        await vi.waitFor(() => expect(answers.length).toBeGreaterThan(0));
        answers.length = 0;
        hello();
        await vi.waitFor(() => expect(answers).toHaveLength(1));
        expect(answers[0]).toMatchObject({ type: EXT_TO_APP.HELLO_BACK, version: '1.10.0' });
    });

    it('stays silent once an update has cut it off', async () => {
        runtime.id = undefined;
        answers.length = 0;
        hello();
        await new Promise((r) => setTimeout(r, 50));
        expect(answers).toHaveLength(0);
    });
});
