import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  isLegacyGeneratedPrompt,
  migrateStoredPrompts,
  buildReplySystemPrompt,
  DEFAULT_IDENTITY,
  DEFAULT_SYSTEM_PROMPT,
  PROMPT_VERSION,
  TONE_LIBRARY,
  TONE_OPTIONS,
  buildFollowUpLadder,
  buildRescueLadder,
  migrateSequence,
  type PromptIdentity,
} from './prompt';
import { renderTemplate } from './followups';
import type { FollowUpSequence, FollowUpStep, Lead } from './types';

const marcus: PromptIdentity = {
  founderName: 'Marcus',
  founderRole: 'founder',
  businessName: 'Apex Growth',
  businessNiche: 'paid social for DTC brands',
  targetAudience: '7-figure DTC founders',
  valueProposition: '$3-5 back for every $1 spent',
  exampleDM: '',
  dmTone: 'bold',
};

/** Marcus, with an Offer Ledger filled in. */
const stocked: PromptIdentity = {
  ...marcus,
  proofPoint: '9 booked calls in 3 weeks for a 2-person agency in Leeds',
  removedSacrifice: 'without hiring a VA',
  freeGive: 'the 3-line audit I run on a profile before I write anything',
  price: '$197/mo',
  priceAnchor: '$497/mo',
  guarantee: '7 days, money back',
  callLength: '15 minutes',
  callPromise: 'map your first 30 days on the call',
};

describe('buildSystemPrompt', () => {
  it('opens with the Operator, not the product', () => {
    expect(buildSystemPrompt(marcus)).toContain('You are Marcus, founder at Apex Growth.');
  });

  it('drops the name from the opening when there is none', () => {
    expect(buildSystemPrompt({ ...marcus, founderName: '' }))
      .toContain('You are the founder of Apex Growth.');
  });

  it('injects the chosen tone and no other', () => {
    const prompt = buildSystemPrompt(marcus);
    expect(prompt).toContain(TONE_LIBRARY.bold);
    expect(prompt).not.toContain(TONE_LIBRARY.casual);
  });

  it('falls back to casual for an unknown tone', () => {
    const prompt = buildSystemPrompt({ ...marcus, dmTone: 'nonsense' as PromptIdentity['dmTone'] });
    expect(prompt).toContain(TONE_LIBRARY.casual);
  });

  it('names the business in the do-not-mention list', () => {
    // The whole point of the first DM is that it never pitches, so the business
    // name has to reach the prompt as something to avoid saying.
    expect(buildSystemPrompt(marcus)).toContain('Your product name: "Apex Growth"');
  });

  it('includes the example DM section only when one is given', () => {
    expect(buildSystemPrompt(marcus)).not.toContain('EXAMPLE DM FOR THIS CAMPAIGN');
    const withExample = buildSystemPrompt({ ...marcus, exampleDM: '  hey, saw your ad  ' });
    expect(withExample).toContain('## EXAMPLE DM FOR THIS CAMPAIGN\n\nhey, saw your ad');
  });

  it('substitutes placeholders for every blank field', () => {
    const prompt = buildSystemPrompt({});
    expect(prompt).toContain('You are the founder of our business.');
    expect(prompt).toContain('You help potential clients achieve grow their business.');
    expect(prompt).toContain('their space');
    expect(prompt).not.toContain('undefined');
  });

  it('ends by stating that the whole response is the DM', () => {
    // Last position, because it is the one the model reads most recently — and
    // stated positively, because "no preamble" names the thing it forbids.
    expect(buildSystemPrompt(marcus).trimEnd())
      .toMatch(/You are not answering me\. You are writing to them\.$/);
  });

  it('bans preamble where the model looks for hard stops', () => {
    // It used to appear once, in the OUTPUT section, and nowhere in the list of
    // things never to do. DMs arrived reading "Here is the DM: hey...".
    const never = buildSystemPrompt(marcus).split('## NEVER IN THE FIRST DM')[1];
    expect(never).toContain('Any words that are not the message.');
  });

  it('asks the hook to carry a reason for the message existing', () => {
    expect(buildSystemPrompt(marcus)).toContain('implied BECAUSE');
  });
});

describe('buildReplySystemPrompt', () => {
  it('speaks as the Operator, not as MagnetEngine', () => {
    const prompt = buildReplySystemPrompt(marcus);
    expect(prompt).toContain('You are Marcus, founder at Apex Growth.');
    expect(prompt).not.toContain('MagnetEngine');
  });

  it('keeps the booking-link placeholder for the caller to fill', () => {
    expect(buildReplySystemPrompt(marcus)).toContain('{LINK}');
  });

  it('steps the ask down instead of re-offering what was refused', () => {
    // The whole reason the SDR stalls is that it answers an objection and then
    // asks for the same call again. The ladder is what stops that.
    const prompt = buildReplySystemPrompt(marcus);
    expect(prompt).toContain('## THE STEP-DOWN LADDER');
    expect(prompt).toContain('full call → 10 minutes → answer it right here over DM → a date to follow up');
  });

  it('diagnoses before it offers, and stops before it interrogates', () => {
    const prompt = buildReplySystemPrompt(marcus);
    expect(prompt).toContain('## DIAGNOSE BEFORE YOU OFFER');
    expect(prompt).toMatch(/CURRENT[\s\S]*DESIRED[\s\S]*OBSTACLE/);
    expect(prompt).toContain('Never diagnose for more than about three exchanges.');
  });

  it('never lets the model quote a price or a result it was not given', () => {
    const flat = buildReplySystemPrompt(marcus).replace(/\s+/g, ' ');
    // Asserted without the line wrapping — the rule is the point, and pinning
    // the newline made an unrelated reflow of this paragraph fail the suite.
    expect(flat).toContain('Never estimate, never give a range you invented');
    expect(flat).toContain('never claim a number you were not given');

    // v4's version of the same rule, and the one that finally has teeth: the
    // Ledger is closed, so "a number you were not given" is a decidable
    // question rather than an appeal to the model's conscience.
    const stockedFlat = buildReplySystemPrompt(stocked).replace(/\s+/g, ' ');
    expect(stockedFlat).toContain('A fact that is not on this list does not exist');
    expect(stockedFlat).toContain('$197/mo');

    // And the half that matters more, because it is the default state of every
    // new Operator: an empty Ledger must say the absence out loud. A prompt
    // that simply omits the section reads, to a model, as permission to supply
    // the missing proof itself.
    expect(flat).toContain('You have been given NO result, NO number, NO price and NO guarantee');
    expect(flat).not.toContain('A fact that is not on this list does not exist');
  });

  it('anchors the whole price before naming ways to pay it', () => {
    const flat = buildReplySystemPrompt(marcus).replace(/\s+/g, ' ');
    expect(flat).toContain('Anchor before you name a number');
    expect(flat).toContain('name the whole figure before you name the ways to pay it');
    expect(flat).toContain('a cheap opener makes everything that follows read as an upsell');
  });

  it('states no output format, because its consumer wraps it in one', () => {
    // generate-reply appends "respond with a SINGLE JSON object and nothing
    // else". This prompt used to say "raw text only" sixty lines above that,
    // and a model handed two contradictory format rules produced an envelope
    // that would not parse — which the old code sent to the prospect verbatim.
    const prompt = buildReplySystemPrompt(marcus);
    expect(prompt).not.toContain('Raw text only');
    expect(prompt).not.toContain('## OUTPUT');
    expect(prompt).toContain('## WHAT COUNTS AS THE REPLY');
  });
});

describe('the offer math', () => {
  it('tells the DM which two levers to pull', () => {
    // v1 said "hint at a specific result" and left the model to decide what
    // made a result compelling. It reliably chose "large".
    const prompt = buildSystemPrompt(marcus);
    expect(prompt).toContain('## THE OFFER MATH');
    expect(prompt).toMatch(
      /DREAM OUTCOME[\s\S]*PERCEIVED LIKELIHOOD[\s\S]*TIME DELAY[\s\S]*EFFORT AND SACRIFICE/,
    );
    expect(prompt).toContain('Pick TWO');
    // v4: both levers must come out of the Ledger, which is what stops the
    // model supplying its own proof when the Operator supplied none.
    expect(prompt.replace(/\s+/g, ' ')).toContain('Pick TWO, and both must come out of WHAT YOU ACTUALLY KNOW');
  });

  it('bans the claim that is too big to be believed', () => {
    const prompt = buildSystemPrompt(marcus);
    expect(prompt).toContain('A guarantee, a superlative, or a number you were not given');
    expect(prompt).toContain("we 10x'd a client in your niche last month, want in?");
  });
});

describe('defaults', () => {
  it('are generated, not hand-written', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toBe(buildSystemPrompt(DEFAULT_IDENTITY));
  });

  it('read as MagnetEngine speaking to its own audience', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('You are the founder of MagnetEngine.');
    expect(DEFAULT_SYSTEM_PROMPT).toContain('agency owners, coaches, and consultants');
  });
});

describe('TONE_OPTIONS', () => {
  it('offers exactly the tones the library can build', () => {
    expect(TONE_OPTIONS.map((t) => t.value).sort())
      .toEqual(Object.keys(TONE_LIBRARY).sort());
  });
});

describe('migrateStoredPrompts', () => {
  // The prompt that actually generates DMs is a string saved on the Operator's
  // config, not one read from this module at send time. Without a migration,
  // improving the recipe reaches new sign-ups and literally nobody else.
  const legacy = [
    'You are the founder of Apex Growth.',
    '## WHAT MAKES YOUR DMs WORK',
    '1. FIRST SENTENCE: Specific observation about THEIR world',
  ].join('\n\n');

  it('recognises a prompt the old wizard generated', () => {
    expect(isLegacyGeneratedPrompt(legacy)).toBe(true);
    expect(isLegacyGeneratedPrompt(DEFAULT_SYSTEM_PROMPT)).toBe(false);
    expect(isLegacyGeneratedPrompt(undefined)).toBe(false);
    expect(isLegacyGeneratedPrompt('')).toBe(false);
  });

  it('rebuilds a stored legacy prompt from the identity on that config', () => {
    const migrated = migrateStoredPrompts({ ...marcus, systemPrompt: legacy });

    expect(migrated.systemPrompt).toBe(buildSystemPrompt(marcus));
    expect(migrated.systemPrompt).toContain('You are Marcus, founder at Apex Growth.');
    // The whole point: the tells the rewrite removed are gone.
    expect(migrated.systemPrompt).not.toContain('## WHAT MAKES YOUR DMs WORK');
    expect(migrated.systemPrompt).toContain('## HOW YOU GET SPOTTED');
  });

  it('leaves a hand-edited prompt alone, and says so by identity', () => {
    // Same object back means "nothing to persist" to the caller.
    const custom = { ...marcus, systemPrompt: 'just write something nice, thanks' };
    expect(migrateStoredPrompts(custom)).toBe(custom);
  });

  it('is idempotent — a migrated config is not migrated again', () => {
    const once = migrateStoredPrompts({ ...marcus, systemPrompt: legacy });
    expect(migrateStoredPrompts(once)).toBe(once);
  });

  it('brings the reply persona forward too, not just the DM prompt', () => {
    // The reply prompt used to be regenerated only by re-running the wizard, so
    // an Operator who never reopened Settings kept their first persona forever.
    const staleReply = [
      'You are the founder of Apex Growth.',
      '## HOW TO HANDLE THE CONVERSATION',
      '1. If they show interest → give a one-sentence answer, then offer the call.',
    ].join('\n\n');

    const migrated = migrateStoredPrompts({ ...marcus, replySystemPrompt: staleReply });

    expect(migrated.replySystemPrompt).toBe(buildReplySystemPrompt(marcus));
    expect(migrated.replySystemPrompt).toContain('## THE STEP-DOWN LADDER');
    expect(migrated.replySystemPrompt).not.toContain('## HOW TO HANDLE THE CONVERSATION');
  });

  it('migrates each prompt on its own merits', () => {
    // A hand-written reply persona survives a DM-prompt migration.
    const mine = 'reply like a pirate';
    const migrated = migrateStoredPrompts({
      ...marcus,
      systemPrompt: legacy,
      replySystemPrompt: mine,
    });

    expect(migrated.systemPrompt).toBe(buildSystemPrompt(marcus));
    expect(migrated.replySystemPrompt).toBe(mine);
  });
});

describe('prompt versioning', () => {
  // Recognising stale prompts by heading used to mean remembering to add a
  // fingerprint for every shape being replaced — miss one and that Operator
  // never sees the improvement. The stamp makes the next bump automatic.
  const stampOf = (prompt: string) => prompt.match(/<!-- prompt-version: (\d+) -->/)?.[1];

  it('stamps both prompts with the current recipe version', () => {
    expect(stampOf(buildSystemPrompt(marcus))).toBe(String(PROMPT_VERSION));
    expect(stampOf(buildReplySystemPrompt(marcus))).toBe(String(PROMPT_VERSION));
  });

  it('treats an older stamp as stale and the current one as fresh', () => {
    const older = buildSystemPrompt(marcus)
      .replace(`<!-- prompt-version: ${PROMPT_VERSION} -->`, '<!-- prompt-version: 1 -->');

    expect(isLegacyGeneratedPrompt(older)).toBe(true);
    expect(isLegacyGeneratedPrompt(buildSystemPrompt(marcus))).toBe(false);
    expect(isLegacyGeneratedPrompt(buildReplySystemPrompt(marcus))).toBe(false);
  });

  it('leaves a prompt carrying a newer stamp alone', () => {
    // An Operator whose browser tab is older than their saved config must not
    // have a newer prompt rewritten backwards.
    const newer = buildSystemPrompt(marcus)
      .replace(`<!-- prompt-version: ${PROMPT_VERSION} -->`, `<!-- prompt-version: ${PROMPT_VERSION + 1} -->`);

    expect(isLegacyGeneratedPrompt(newer)).toBe(false);
  });
});

describe('the follow-up ladders', () => {
  const emptyLedger: PromptIdentity = marcus;

  it('runs day 3 / 7 / 14, every step gated on no reply', () => {
    const ladder = buildFollowUpLadder(stocked);
    expect(ladder.map((s) => s.delayDays)).toEqual([3, 7, 14]);
    expect(ladder.every((s) => s.condition === 'no_reply')).toBe(true);
  });

  it('runs the rescue ladder off the reply, gated on replied-not-booked', () => {
    const ladder = buildRescueLadder(stocked);
    expect(ladder.map((s) => s.delayDays)).toEqual([2, 5, 12]);
    expect(ladder.every((s) => s.condition === 'replied_not_booked')).toBe(true);
  });

  /**
   * The give is the only touch with nothing to answer, and that is the whole
   * mechanism: a message that does not need a reply is the one a busy person
   * replies to. A question mark here would turn it back into a third ask.
   */
  it('asks for nothing on the give', () => {
    expect(buildFollowUpLadder(stocked)[1].messageTemplate).not.toContain('?');
  });

  it('ends on the takeaway, the only touch where silence costs them something', () => {
    expect(buildFollowUpLadder(stocked)[2].messageTemplate).toContain('closing your file');
  });

  it('steps the rescue ask down instead of repeating it', () => {
    const [times, inThread, dated] = buildRescueLadder(stocked).map((s) => s.messageTemplate);
    expect(times).toContain('send a couple of times');
    expect(inThread).toContain('no call needed');
    expect(dated).toContain('check back in 90 days');
  });

  it('carries the Ledger when it has one', () => {
    expect(buildFollowUpLadder(stocked)[0].messageTemplate).toContain('{{proof}}');
    expect(buildFollowUpLadder(stocked)[1].messageTemplate).toContain('{{give}}');
    expect(buildRescueLadder(stocked)[1].messageTemplate).toContain('{{price}}');
  });

  /**
   * The half that matters more. A touch whose entire payload is a fact the
   * Operator never entered has to become a DIFFERENT touch, not the same touch
   * with a hole in it — so every template must still render to real words
   * against a completely empty Ledger.
   */
  it('still writes a real message when the Ledger is empty', () => {
    const anonymous = { id: 'l1', handle: 'founder_one', followers: 0, isPrivate: false, status: 'cold', dmSent: true, replied: false } as Lead;
    for (const ladder of [buildFollowUpLadder(emptyLedger), buildRescueLadder(emptyLedger)]) {
      for (const step of ladder) {
        const rendered = renderTemplate(step.messageTemplate, anonymous, {});
        expect(rendered.length).toBeGreaterThan(20);
        expect(rendered).not.toContain('{{');
      }
    }
  });
});

/**
 * The two files used to contradict each other in production: `buildSystemPrompt`
 * listed "circle back" as a tell that gets your DM ignored, and the follow-up
 * templates three files away opened with "circling back on this!".
 *
 * Asserting both halves against one list is what makes that stay fixed. Delete a
 * phrase from the prompt and this fails; reintroduce one in a ladder and this
 * fails. Neither file can drift without the other noticing.
 */
describe('the ladders do not undo the opener', () => {
  const TELLS = [
    'circling back',
    'circle back',
    'just following up',
    'bumping this',
    'did you get a chance',
    'i noticed',
    'reach out',
  ];

  it.each(TELLS)('names "%s" as a tell in the DM prompt', (tell) => {
    expect(buildSystemPrompt(marcus).toLowerCase()).toContain(tell);
  });

  it.each(TELLS)('never uses "%s" in a follow-up', (tell) => {
    const templates = [...buildFollowUpLadder(stocked), ...buildRescueLadder(stocked)]
      .map((s) => s.messageTemplate.toLowerCase());
    for (const template of templates) expect(template).not.toContain(tell);
  });

  it('never quotes their @handle back at them', () => {
    const templates = [...buildFollowUpLadder(stocked), ...buildRescueLadder(stocked)];
    for (const step of templates) expect(step.messageTemplate).not.toContain('{{handle}}');
  });
});

describe('migrateSequence', () => {
  const legacy = 'Hi {{name}}, circling back on this! Would love to show you what we\'ve been doing for similar businesses. Worth a quick chat?';

  const seq = (steps: FollowUpStep[]): FollowUpSequence => ({ id: 'seq1', steps, active: true });
  const step = (messageTemplate: string, condition: FollowUpStep['condition'] = 'no_reply'): FollowUpStep =>
    ({ id: 's', delayDays: 3, condition, messageTemplate });

  it('recognises all three templates the product used to hardcode', () => {
    // Verified against git HEAD's FollowUpSequencer.DEFAULT_TEMPLATES by
    // evaluating both arrays as real JS — a transcription slip in any one of
    // these is silent, and its only symptom is an Operator keeping the old
    // "circling back" copy forever.
    const before = [
      'Hey {{handle}} \u{1F44B} Just wanted to follow up on my last message — did you get a chance to see it?',
      "Hi {{name}}, circling back on this! Would love to show you what we've been doing for similar businesses. Worth a quick chat?",
      `{{handle}}, last follow-up from me — I'll leave the door open. Just reply "interested" if you'd like to connect.`,
    ];
    const migrated = migrateSequence(seq(before.map((t) => step(t))), stocked);
    const ladder = buildFollowUpLadder(stocked);
    expect(migrated.steps.map((s) => s.messageTemplate))
      .toEqual(ladder.map((s) => s.messageTemplate));
  });

  it('replaces copy the product wrote, in place', () => {
    const migrated = migrateSequence(seq([step(legacy)]), stocked);
    expect(migrated.steps[0].messageTemplate).toBe(buildFollowUpLadder(stocked)[0].messageTemplate);
    // Their delay and their condition are theirs, and survive.
    expect(migrated.steps[0].delayDays).toBe(3);
  });

  it('leaves copy the Operator wrote alone', () => {
    const mine = seq([step('oi marcus, you still after more calls or did you sort it?')]);
    expect(migrateSequence(mine, stocked)).toBe(mine);
  });

  it('fills a blank step rather than leaving it unsendable', () => {
    expect(migrateSequence(seq([step('   ')]), stocked).steps[0].messageTemplate).not.toBe('   ');
  });

  it('migrates a rescue sequence to the rescue ladder, not the cold one', () => {
    const migrated = migrateSequence(seq([step(legacy, 'replied_not_booked')]), stocked);
    expect(migrated.steps[0].messageTemplate).toBe(buildRescueLadder(stocked)[0].messageTemplate);
  });

  it('is idempotent', () => {
    const once = migrateSequence(seq([step(legacy)]), stocked);
    expect(migrateSequence(once, stocked)).toBe(once);
  });
});
