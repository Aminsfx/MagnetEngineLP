import type { Route } from '@playwright/test';
import { test, expect, PROTOCOL } from './fixtures';

/**
 * The Inbox reader, end to end: Instagram's own inbox page fetches its threads,
 * the page hook (igpage.js) hands the answer to the content script, the
 * service worker merges it, and the dashboard hears it with the time it was
 * read. Every request to instagram.com is answered here; nothing reaches the
 * network.
 *
 * The read time is what lets the dashboard say when nothing is being read. On
 * 2026-11-07 the reader stopped after an extension reload and the dashboard
 * kept showing the last snapshot, re-sent every 100 s, for 29 hours.
 */
const { INBOX } = PROTOCOL.EXT_TO_APP;
const { GET_INBOX } = PROTOCOL.APP_TO_EXT;

const THREAD_ID = '340282366841710300949128100000000001';
const viewer = { pk: '111', id: '111', profile_pic_url: 'https://cdn.example.test/me.jpg', interop_messaging_user_fbid: '9001' };
const maya = { pk: '222', id: '222', username: 'maya.builds', full_name: 'Maya R.', profile_pic_url: '', interop_messaging_user_fbid: '9002' };

type Line = { id: string; from: 'me' | 'maya'; text: string; at: number };
const mailbox = (lines: Line[]) => ({
  data: {
    get_slide_mailbox_for_iris_subscription: {
      threads_by_folder: {
        edges: [{
          node: {
            as_ig_direct_thread: {
              thread_id: THREAD_ID, viewer, users: [maya],
              slide_messages: {
                edges: lines.map((l) => ({
                  node: { message_id: l.id, sender_fbid: l.from === 'me' ? '9001' : '9002', text_body: l.text, timestamp_ms: String(l.at) },
                })),
              },
            },
          },
        }],
      },
    },
  },
});

/** Instagram's inbox page, reduced to the request its web app makes on load. */
const inboxPage = `<!doctype html><title>Inbox • Direct</title><main>Messages</main>
<script>
  fetch(new Request('/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'fb_api_req_friendly_name=PolarisDirectInboxQuery&doc_id=1&variables=%7B%7D',
  }));
</script>`;

const t0 = Date.parse('2026-11-12T09:00:00Z');

test('reads the Instagram inbox into the dashboard, and says when it was read', async ({ context, harness }) => {
  let lines: Line[] = [
    { id: 'mid.$1', from: 'me', text: 'how are you getting clients right now?', at: t0 },
    { id: 'mid.$2', from: 'maya', text: 'mostly referrals, why?', at: t0 + 60_000 },
  ];
  let reads = 0;

  // Registered after the harness's own instagram.com route, so these answer first.
  await context.addCookies([{ name: 'ds_user_id', value: '111', domain: '.instagram.com', path: '/' }]);
  await context.route('https://www.instagram.com/api/**', async (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/v1/accounts/edit/web_form_data/') {
      await route.fulfill({ json: { form_data: { username: 'me.coaching' } } });
    } else if (url.pathname === '/api/graphql') {
      reads++;
      await route.fulfill({ json: mailbox(lines) });
    } else {
      await route.fulfill({ status: 204 });
    }
  });
  await context.route((url) => url.hostname === 'www.instagram.com' && url.pathname === '/direct/inbox/', (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: inboxPage }));

  const before = Date.now();
  const instagram = await context.newPage();
  await instagram.goto('https://www.instagram.com/direct/inbox/');

  const withThreads = async () =>
    (await harness.received(INBOX)).filter((m) => Array.isArray(m.threads) && m.threads.length > 0);
  await expect.poll(async () => (await withThreads()).length).toBeGreaterThan(0);

  const first = (await withThreads()).at(-1)!;
  expect(first.viewer).toMatchObject({ id: '111', username: 'me.coaching' });
  const [thread] = first.threads as Array<{ handle: string; messages: Array<{ id: string; direction: string }> }>;
  expect(thread.handle).toBe('maya.builds');
  expect(thread.messages.map((m) => [m.id, m.direction])).toEqual([['mid.$1', 'out'], ['mid.$2', 'in']]);
  const readAt = first.syncedAt as number;
  expect(readAt).toBeGreaterThanOrEqual(before);

  // A reply lands while the tab sits open. The hook replays Instagram's own
  // request to pick it up: every 100 s, and 2 s after it is switched back on,
  // which is what this does instead of waiting out the interval.
  lines = [...lines, { id: 'mid.$3', from: 'maya', text: 'ok, tell me more', at: t0 + 120_000 }];
  const readsBefore = reads;
  await instagram.evaluate(() => {
    window.postMessage({ source: 'magnet-engine-ig-ctl', enabled: false }, window.location.origin);
    window.postMessage({ source: 'magnet-engine-ig-ctl', enabled: true }, window.location.origin);
  });
  await expect.poll(async () => {
    const latest = (await withThreads()).at(-1)!;
    return (latest.threads as Array<{ messages: Array<{ id: string }> }>)[0].messages.map((m) => m.id);
  }).toEqual(['mid.$1', 'mid.$2', 'mid.$3']);
  expect(reads).toBeGreaterThan(readsBefore);
  const latest = (await withThreads()).at(-1)!;
  expect(latest.syncedAt as number).toBeGreaterThan(readAt);

  // The dashboard asking for the snapshot, as it does on load and on focus, gets the same read time.
  const answered = (await harness.received(INBOX)).length;
  const dashboardAsks = context.pages().find((p) => p.url().startsWith('http://localhost:4173/'))!;
  await dashboardAsks.evaluate((type) => window.postMessage({ type }, '*'), GET_INBOX);
  await expect.poll(async () => (await harness.received(INBOX)).length).toBeGreaterThan(answered);
  expect((await harness.received(INBOX)).at(-1)).toMatchObject({ syncedAt: latest.syncedAt });
});
