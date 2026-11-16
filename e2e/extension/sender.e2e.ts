import { test, expect, PROTOCOL } from './fixtures';

/**
 * The Sender, end to end: the dashboard hands the extension a campaign, the
 * service worker opens the Sender Tab on Messages, the content script
 * searches for the handle, opens the chat from the exact result, types the
 * DM, presses Send, and the dashboard hears that it went.
 *
 * Each of these is a way it has failed for an Operator. On 2026-11-07 a whole
 * campaign was reported as "no Message button" because Instagram was in French
 * and the Sender only knew the English word; until 1.12.0 every profile that
 * showed no Message button was skipped, though Messages could reach it.
 */
const { SENT, NOT_SENT } = PROTOCOL.EXT_TO_APP;

const dm = 'how are you getting your episodes cut into clips right now?';

test('searches Messages for the handle, sends the DM to exactly them, and tells the dashboard', async ({ harness }) => {
  await harness.handOff([{ handle: 'maya.builds', message: dm }]);

  await expect.poll(() => harness.received(SENT)).toHaveLength(1);

  // Typed exactly as written, into maya.builds's chat, not the namesake
  // (maya.builds.studio) that search lists above her.
  expect(harness.sent).toEqual([{ handle: 'maya.builds', text: dm, lang: 'en' }]);
  expect((await harness.received(SENT))[0]).toMatchObject({ handle: 'maya.builds', dailySentCount: 1 });
  // Every DM starts from Messages, in English, whatever the account is set to.
  expect(harness.opened).toEqual(['https://www.instagram.com/direct/inbox/?hl=en']);

  // The queue is empty and nothing is left running.
  await expect.poll(async () => (await harness.storage()).isExecuting).toBe(false);
  const state = await harness.storage();
  expect(state.campaignQueue).toEqual([]);
  expect(state.sentHandles).toEqual(['maya.builds']);
  expect(state.lastFailure ?? null).toBeNull();
});

test("sends through New message where Messages has no search box of its own", async ({ harness }) => {
  harness.instagram({ layout: 'dialog' });
  await harness.handOff([{ handle: 'maya.builds', message: dm }]);

  await expect.poll(() => harness.received(SENT)).toHaveLength(1);
  expect(harness.sent).toEqual([{ handle: 'maya.builds', text: dm, lang: 'en' }]);
});

test('sends on an Instagram that stays in French', async ({ harness }) => {
  // New message reads "Nouveau message", Chat "Discuter" and Send "Envoyer".
  harness.instagram({ layout: 'dialog', lang: 'fr' });
  await harness.handOff([{ handle: 'studio.lyon', message: dm }]);

  await expect.poll(() => harness.received(SENT)).toHaveLength(1);
  expect(harness.sent).toEqual([{ handle: 'studio.lyon', text: dm, lang: 'fr' }]);
});

// Every handoff used to replace the queue. An Inbox reply sent while a
// campaign was running threw away every approved DM still waiting, and an
// alert() popped up over the dashboard for every reply.
test('a reply handed over mid-campaign joins the queue, and every DM still goes out', async ({ harness }) => {
  const reply = 'Tuesday at 3 works, talk then.';
  // A 15-second pause, so theo.makes is certainly still waiting when the reply
  // arrives. With the usual second it can already be on its way, and a send
  // in progress is never cut in on.
  await harness.handOff([
    { handle: 'maya.builds', message: dm },
    { handle: 'theo.makes', message: dm },
  ], { pauseMinutes: 0.25 });
  await expect.poll(() => harness.received(SENT), { timeout: 60_000 }).toHaveLength(1);
  expect((await harness.storage()).currentTask ?? null).toBeNull();

  // The first DM has gone; the second is waiting out its pause. Handed over
  // as a replace, the reply would leave theo.makes unsent for good.
  await harness.handOff([{ handle: 'sam.replies', message: reply }], { mode: 'add' });

  await expect.poll(() => harness.received(SENT), { timeout: 150_000 }).toHaveLength(3);
  // The reply goes ahead of the campaign: a person is waiting on it.
  expect(harness.sent.map((m) => [m.handle, m.text])).toEqual([
    ['maya.builds', dm],
    ['sam.replies', reply],
    ['theo.makes', dm],
  ]);
  expect(harness.dialogs).toEqual([]);
});

// The regression: a reply waited behind a paused campaign (or one at its Send
// Cap) until Resume or the next morning, while the Inbox showed it as sent,
// and the dashboard was never told which reply went, nor about one that failed.
test('a reply goes out while the campaign is paused, and the dashboard hears which one went', async ({ harness }) => {
  const reply = 'Tuesday at 3 works, talk then.';
  await harness.setStorage({ campaignQueue: [{ handle: 'theo.makes', message: dm }], isPaused: true });

  await harness.handOff([{ handle: 'maya.builds', message: reply, ref: 'local_t1_1', reply: true }], { mode: 'add' });

  await expect.poll(() => harness.received(SENT), { timeout: 60_000 }).toHaveLength(1);
  expect(harness.sent).toEqual([{ handle: 'maya.builds', text: reply, lang: 'en' }]);
  expect((await harness.received(SENT))[0]).toMatchObject({ handle: 'maya.builds', ref: 'local_t1_1' });

  // The campaign stays paused, its DM unsent and still queued.
  const state = await harness.storage();
  expect(state.isPaused).toBe(true);
  expect((state.campaignQueue as Array<{ handle: string }>).map((l) => l.handle)).toEqual(['theo.makes']);
});

test("tells the dashboard which reply couldn't be sent, and why", async ({ harness }) => {
  await harness.handOff([{ handle: 'gone.account', message: 'see you then', ref: 'local_t2_1', reply: true }], { mode: 'add' });

  await expect.poll(() => harness.received(NOT_SENT), { timeout: 60_000 }).toHaveLength(1);
  const [notice] = await harness.received(NOT_SENT);
  expect(notice).toMatchObject({ handle: 'gone.account', ref: 'local_t2_1' });
  expect(String(notice.reason)).toContain("didn't come up in Instagram's search");
  expect(harness.sent).toEqual([]);
});

test('passes over an account search cannot find and sends the next', async ({ harness }) => {
  await harness.handOff([
    { handle: 'gone.account', message: dm },
    { handle: 'maya.builds', message: dm },
  ]);

  await expect.poll(() => harness.received(SENT), { timeout: 150_000 }).toHaveLength(1);
  expect(harness.sent.map((m) => m.handle)).toEqual(['maya.builds']);
  // Messages was opened afresh for the second DM, though the tab was already on it.
  expect(harness.opened).toHaveLength(2);

  // The first is recorded as skipped, with a reason an Operator can read.
  const state = await harness.storage();
  expect(state.lastFailure).toMatchObject({ handle: 'gone.account' });
  expect(String((state.lastFailure as { reason: string }).reason)).toContain("didn't come up in Instagram's search");
});

test('stops after three accounts in a row search cannot find, and keeps their DMs', async ({ harness }) => {
  const leads = ['gone.one', 'gone.two', 'gone.three', 'maya.builds'].map((handle) => ({ handle, message: dm }));
  await harness.handOff(leads);

  // Three misses in a row mean Instagram's page changed, not that three people
  // deleted their accounts: the campaign pauses instead of burning the queue.
  await expect.poll(async () => (await harness.storage()).isPaused, { timeout: 220_000 }).toBe(true);

  const state = await harness.storage();
  // All four are still queued, the three that were tried first, unsent and unskipped.
  expect((state.campaignQueue as Array<{ handle: string }>).map((l) => l.handle)).toEqual(leads.map((l) => l.handle));
  expect(state.isExecuting).toBe(false);
  expect(harness.sent).toEqual([]);
  expect(String((state.lastFailure as { reason: string }).reason))
    .toContain("3 DMs in a row couldn't find their person in Instagram's Messages");
});
