import { test, expect, PROTOCOL } from './fixtures';

/**
 * The Sender, end to end: the dashboard hands the extension a campaign, the
 * service worker opens the Sender Tab, the content script finds the Message
 * button, types the DM, presses Send, and the dashboard hears that it went.
 *
 * Each of these is a way it has failed for an Operator. On 2026-11-07 a whole
 * campaign was reported as "no Message button" because Instagram was in French
 * and the Sender only knew the English word.
 */
const { SENT } = PROTOCOL.EXT_TO_APP;

const dm = 'how are you getting your episodes cut into clips right now?';

test('sends a DM and tells the dashboard it went', async ({ harness }) => {
  await harness.handOff([{ handle: 'maya.builds', message: dm }]);

  await expect.poll(() => harness.received(SENT)).toHaveLength(1);

  // Typed exactly as written, to the right person.
  expect(harness.sent).toEqual([{ handle: 'maya.builds', text: dm, lang: 'en' }]);
  expect((await harness.received(SENT))[0]).toMatchObject({ handle: 'maya.builds', dailySentCount: 1 });
  // Every profile is opened in English, whatever the account is set to.
  expect(harness.opened[0]).toBe('https://www.instagram.com/maya.builds/?hl=en');

  // The queue is empty and nothing is left running.
  await expect.poll(async () => (await harness.storage()).isExecuting).toBe(false);
  const state = await harness.storage();
  expect(state.campaignQueue).toEqual([]);
  expect(state.sentHandles).toEqual(['maya.builds']);
  expect(state.lastFailure ?? null).toBeNull();
});

test('sends on an Instagram that stays in French', async ({ harness }) => {
  // The button reads "Envoyer un message" and Send reads "Envoyer".
  await harness.handOff([{ handle: 'fr.studio.lyon', message: dm }]);

  await expect.poll(() => harness.received(SENT)).toHaveLength(1);
  expect(harness.sent).toEqual([{ handle: 'fr.studio.lyon', text: dm, lang: 'fr' }]);
});

test('passes over a profile that no longer exists and sends the next', async ({ harness }) => {
  await harness.handOff([
    { handle: 'gone.account', message: dm },
    { handle: 'maya.builds', message: dm },
  ]);

  await expect.poll(() => harness.received(SENT), { timeout: 150_000 }).toHaveLength(1);
  expect(harness.sent.map((m) => m.handle)).toEqual(['maya.builds']);

  // The first is recorded as skipped, with a reason an Operator can read.
  const state = await harness.storage();
  expect(state.lastFailure).toMatchObject({ handle: 'gone.account' });
  expect(String((state.lastFailure as { reason: string }).reason)).toContain("doesn't exist any more");
});

test('stops after three profiles in a row with no Message button, and keeps their DMs', async ({ harness }) => {
  const leads = ['nomsg.one', 'nomsg.two', 'nomsg.three', 'maya.builds'].map((handle) => ({ handle, message: dm }));
  await harness.handOff(leads);

  // Three misses in a row mean Instagram's page changed, not that three people
  // turned messages off: the campaign pauses instead of burning the queue.
  await expect.poll(async () => (await harness.storage()).isPaused, { timeout: 220_000 }).toBe(true);

  const state = await harness.storage();
  // All four are still queued, the three that were tried first, unsent and unskipped.
  expect((state.campaignQueue as Array<{ handle: string }>).map((l) => l.handle)).toEqual(leads.map((l) => l.handle));
  expect(state.isExecuting).toBe(false);
  expect(harness.sent).toEqual([]);

  const reason = String((state.lastFailure as { reason: string }).reason);
  expect(reason).toContain('3 profiles in a row showed no Message button');
  // What the page showed is in the reason, so the next change is quick to fix.
  expect(reason).toContain('page in "en"');
  expect(reason).toContain('"Follow"');
});
