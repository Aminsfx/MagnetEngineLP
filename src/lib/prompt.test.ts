import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildReplySystemPrompt,
  DEFAULT_IDENTITY,
  DEFAULT_SYSTEM_PROMPT,
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
