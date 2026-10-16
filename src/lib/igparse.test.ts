import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * extension/igparse.js turns Instagram's GraphQL inbox responses into the
 * extension's thread snapshot. It has no build step, so it is evaluated here
 * the way the browser loads it: as a classic script defining a global.
 *
 * The payloads follow the response shapes Instagram's web app receives since
 * August 2026 (as documented by mautrix-meta's pkg/instameow/slidetypes).
 */
type Parsed = {
    threads: Array<{ threadId: string; handle: string; name: string; avatarUrl: string; messages: Array<{ id: string; direction: string; text: string; createdAt: string }> }>;
    viewer: { id: string; username: string; avatarUrl: string } | null;
};

function loadParser(): (data: unknown) => Parsed {
    const source = readFileSync(resolve(__dirname, '../../extension/igparse.js'), 'utf8');
    const scope: Record<string, unknown> = {};
    new Function('globalThis', source)(scope);
    return scope.parseSlideInbox as (data: unknown) => Parsed;
}

const parse = loadParser();

const viewer = { pk: '111', id: '111', username: 'me.coaching', profile_pic_url: 'https://cdn/me.jpg', interop_messaging_user_fbid: '9001' };
const maya = { pk: '222', id: '222', username: 'maya.builds', full_name: 'Maya R.', profile_pic_url: 'https://cdn/maya.jpg', interop_messaging_user_fbid: '9002' };

const msg = (id: string, senderFbid: string, text: string, ms: number, extra: Record<string, unknown> = {}) => ({
    node: { message_id: id, sender_fbid: senderFbid, text_body: text, timestamp_ms: String(ms), ...extra },
});

const mailbox = {
    get_slide_mailbox_for_iris_subscription: {
        threads_by_folder: {
            edges: [
                {
                    node: {
                        as_ig_direct_thread: {
                            thread_id: '340282366841710300949128100000000001',
                            is_group: false,
                            viewer_id: '111',
                            viewer,
                            users: [maya],
                            slide_messages: {
                                // Newest first, as Instagram sends them.
                                edges: [
                                    msg('mid.$3', '9002', '', 1_760_000_120_000, { content: { attachments: [{}] } }),
                                    msg('mid.$2', '9002', 'What do you actually do?', 1_760_000_060_000),
                                    msg('mid.$1', '9001', 'Hey Maya, loved the post.', 1_760_000_000_000),
                                ],
                            },
                        },
                    },
                },
                {
                    node: {
                        as_ig_direct_thread: {
                            thread_id: 'group-1', is_group: true, viewer, users: [maya],
                            slide_messages: { edges: [msg('mid.$9', '9002', 'hi all', 1_760_000_000_000)] },
                        },
                    },
                },
            ],
        },
        pinned_threads_v2: [],
    },
};

describe('parseSlideInbox', () => {
    it('reads the inbox: the prospect, their messages in order, and which side sent each', () => {
        const { threads, viewer: who } = parse(mailbox);
        expect(who).toEqual({ id: '111', username: 'me.coaching', avatarUrl: 'https://cdn/me.jpg' });
        expect(threads).toHaveLength(1); // the group is skipped
        expect(threads[0]).toMatchObject({
            threadId: '340282366841710300949128100000000001',
            handle: 'maya.builds',
            name: 'Maya R.',
            avatarUrl: 'https://cdn/maya.jpg',
        });
        // Oldest first; the photo with no text is left out.
        expect(threads[0].messages.map((m) => [m.id, m.direction, m.text])).toEqual([
            ['mid.$1', 'out', 'Hey Maya, loved the post.'],
            ['mid.$2', 'in', 'What do you actually do?'],
        ]);
        expect(threads[0].messages[0].createdAt).toBe(new Date(1_760_000_000_000).toISOString());
    });

    it('finds threads wherever a response nests them, and reads text from content', () => {
        const history = {
            fetch__SlideThread: {
                as_ig_direct_thread: {
                    id: 'thread-node-id',
                    thread_id: '340282366841710300949128100000000001',
                    slide_messages: { edges: [msg('mid.$0', '9002', '', 1_759_999_000_000, { content: { text_body: 'Older message' } })] },
                },
            },
        };
        const { threads, viewer: who } = parse(history);
        // A history-only response names nobody; the worker fills the handle in.
        expect(who).toBeNull();
        expect(threads[0]).toMatchObject({ handle: '', messages: [{ id: 'mid.$0', direction: 'in', text: 'Older message' }] });
    });

    it('returns nothing for data that is not an inbox', () => {
        expect(parse({ xdt_api__v1__feed__timeline__connection: { edges: [] } })).toEqual({ threads: [], viewer: null });
        expect(parse(null)).toEqual({ threads: [], viewer: null });
    });
});
