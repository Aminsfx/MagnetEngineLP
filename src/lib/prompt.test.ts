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
  type PromptIdentity,
} from './prompt';

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

  it('always ends with the raw-text output rule', () => {
    expect(buildSystemPrompt(marcus).trimEnd())
      .toMatch(/Just the DM text\. No quotes\. No labels\. No preamble\. Raw text only\.$/);
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
    const prompt = buildReplySystemPrompt(marcus);
    expect(prompt).toContain('Never quote a\n  number you were not given');
    expect(prompt).toContain('never claim a number you were not given');
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
    expect(prompt).toContain('Pick TWO.');
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
