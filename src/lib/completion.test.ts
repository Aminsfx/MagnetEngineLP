import { describe, it, expect } from 'vitest';
import { cleanCompletion, replyEnvelope } from '../../supabase/functions/_shared/completion.ts';

/**
 * The cleaner lives in `supabase/functions/_shared/` because both Edge
 * Functions import it, and it is imported here — rather than read as a string
 * the way `api.test.ts` reads the generate-dm wire contract — because this is
 * behaviour, not a contract. A substring assertion cannot tell you that
 * "Here's a personalized message:" comes off; only running it can.
 *
 * The file holds no Deno globals, which is what lets one module serve a Deno
 * function and a vitest suite.
 */
const dm = (raw: string, truncated?: boolean) => cleanCompletion(raw, { limit: 1000, truncated });

describe('preamble the old regex let through', () => {
  // Every case here reached an Operator's Approval Queue, and would have
  // reached a prospect on approval.
  it.each([
    ['Here is the DM:\nhey saw your ad', 'the article-and-verb form it did not know'],
    ["Here's a personalized message:\nhey saw your ad", 'the article `a`'],
    ["Here's a DM:\nhey saw your ad", 'article `a` with the right noun'],
    ["Here's the DM for @jane:\nhey saw your ad", 'words between the noun and the colon'],
    ["Sure! Here's the DM:\n\nhey saw your ad", 'an opener before the label'],
    ["Of course! Here's the message:\nhey saw your ad", 'a different opener'],
    ['Draft:\nhey saw your ad', 'a noun it did not carry'],
    ['Option 2:\nhey saw your ad', 'a numbered label'],
    ['**DM:** hey saw your ad', 'a label wearing markdown'],
    ['## Draft\n\nhey saw your ad', 'a markdown heading'],
    ["Here's your DM\n\nhey saw your ad", 'an announcement with no colon'],
    ['> hey saw your ad', 'a blockquote'],
    ['- hey saw your ad', 'a bullet'],
    ['**hey saw your ad**', 'paired emphasis'],
    ['```\nhey saw your ad\n```', 'a code fence'],
    ['```\nhey saw your ad', 'a fence the token cap cut the end off'],
    ["Sure!\n\nHere's the DM:\n\n```\nhey saw your ad\n```", 'all of it at once'],
    ['﻿"hey saw your ad"', 'a byte-order mark hiding the quotes'],
    ['DM: Here\'s the message: hey saw your ad', 'a label nested in a label'],
    ['hey saw your ad\n\nLet me know if you want a shorter version!', 'trailing chatter'],
    ['hey saw your ad\n\nWould you like me to adjust the tone?', 'a trailing question to the Operator'],
  ])('strips %j — %s', (raw) => {
    expect(dm(raw)).toBe('hey saw your ad');
  });

  it('strips the quotes a label used to hide behind', () => {
    // The old cleaner unwrapped quotes BEFORE labels, so a labelled and quoted
    // completion kept its quotes: by the time the quote check ran the string
    // still started with "H".
    expect(dm('Here\'s the DM: "hey saw your ad"')).toBe('hey saw your ad');
  });
});

describe('what must never be touched', () => {
  it('passes a clean DM through byte-identical', () => {
    const clean = 'hey saw you run ads for dentists\n\nhow are you handling follow-up right now?';
    expect(dm(clean)).toBe(clean);
  });

  it('keeps an opener that is the DM talking to the prospect', () => {
    // "of course" reads as a label opener and as ordinary speech. It only comes
    // off when a label follows it, which is the whole reason for that guard.
    const line = "of course you're already running ads. what's the cost per booked call?";
    expect(dm(line)).toBe(line);
  });

  it('keeps a colon that belongs to the message', () => {
    const line = 'quick q: what are you using for follow-up?';
    expect(dm(line)).toBe(line);
  });

  it('keeps a noun from the label list used as a real word', () => {
    const line = 'quick note on your pricing page — the tiers read backwards';
    expect(dm(line)).toBe(line);
  });

  it('keeps apostrophes rather than reading them as quotes', () => {
    const line = "how's the outreach goin' this quarter?";
    expect(dm(line)).toBe(line);
  });

  it('keeps an underscore, because handles contain them', () => {
    // Stripping `_` emphasis would turn @jane_doe_fit into @janedoefit — a
    // silent edit to the one thing in a DM that has to be exact.
    const line = 'saw the teardown on @jane_doe_fit, what did that cost you?';
    expect(dm(line)).toBe(line);
  });

  it('keeps a lone asterisk that is arithmetic, not emphasis', () => {
    const line = 'you post 5 * 3 shoots a week — who edits them?';
    expect(dm(line)).toBe(line);
  });

  it('keeps a hash and a dash that are not markdown', () => {
    const line = '#1 thing i would change: your bio cta\n-50% of your traffic dies there';
    expect(dm(line)).toBe(line);
  });

  it('keeps an ack-shaped opener that carries the sentence', () => {
    // "ok so..." is a real casual opening. Only a line that is NOTHING but an
    // acknowledgement can be dropped.
    const line = 'ok so your reels are outperforming your posts?';
    expect(dm(line)).toBe(line);
  });

  it.each([
    'saw the retreat post\n\nwant me to send over the breakdown?',
    "saw the retreat post\n\nlet me know if you're curious?",
    'saw the retreat post\n\nhappy to show you what we did?',
  ])('keeps %j — the closing ask is addressed to the prospect', (line) => {
    // These open exactly like operator chatter. What separates them is that
    // none of them is ABOUT the message, and the DM's micro-ask is the whole
    // point of the DM — deleting it is the worst failure this file can have.
    expect(dm(line)).toBe(line);
  });

  it('keeps a trailing line that only mentions revising the prospect’s own work', () => {
    const line = 'saw the retreat post\n\nwho writes the copy for those?';
    expect(dm(line)).toBe(line);
  });

  it('never lets a rule eat the entire message', () => {
    // A completion that is ONLY a label has no message in it, and the callers
    // must hear that as a failed generation — but a label-shaped line with
    // nothing after it is the message when it is all there is.
    expect(dm('DM:')).toBe('DM:');
    expect(dm('Here is the DM:')).toBe('Here is the DM:');
  });
});

describe('nothing to return', () => {
  it.each(['', '   ', '\n\n', '""', '**']) ('reads %j as no message at all', (raw) => {
    expect(dm(raw)).toBe('');
  });
});

describe('a completion the token cap cut in half', () => {
  it('cuts back to the last finished sentence', () => {
    expect(dm('hey saw your ad. how are you handl', true))
      .toBe('hey saw your ad.');
  });

  it('returns nothing when no sentence finished, so the caller retries', () => {
    expect(dm('hey saw you run ads for dentists in Leeds and I was wond', true)).toBe('');
  });

  it('leaves a complete completion alone', () => {
    expect(dm('hey saw your ad. worth a look?', true)).toBe('hey saw your ad. worth a look?');
  });

  it('only salvages when the provider actually reported a cut', () => {
    const fragment = 'hey saw your ad. how are you handl';
    expect(dm(fragment)).toBe(fragment);
  });
});

describe('the limit', () => {
  it('caps a DM at its ceiling', () => {
    expect(cleanCompletion('a'.repeat(2000), { limit: 1000 })).toHaveLength(1000);
  });

  it('caps an inbox reply at its own, lower ceiling', () => {
    expect(cleanCompletion('a'.repeat(2000), { limit: 800 })).toHaveLength(800);
  });
});

describe('cleaning is idempotent', () => {
  // A cleaned message is a valid completion, and cleaning it again must be a
  // no-op. Without this, a rule that fires on its own output would eat a DM one
  // pass at a time and nothing downstream would notice.
  it.each([
    "Sure! Here's the DM:\n\nhey saw your ad",
    'hey saw you run ads for dentists\n\nhow are you handling follow-up?',
    'quick q: what are you using for follow-up?',
    'saw the retreat post\n\nwant me to send over the breakdown?',
  ])('leaves %j alone on a second pass', (raw) => {
    const once = dm(raw);
    expect(dm(once)).toBe(once);
  });
});

describe('the reply envelope', () => {
  const envelope = (raw: string, truncated?: boolean) => replyEnvelope(raw, { limit: 800, truncated });

  it('reads a well-formed envelope', () => {
    expect(envelope('{"reply":"sounds good, thursday work?","intent":"interested"}'))
      .toEqual({ reply: 'sounds good, thursday work?', intent: 'interested' });
  });

  it('cleans a preamble the model wrote INSIDE the reply field', () => {
    expect(envelope('{"reply":"Here is the reply: sounds good","intent":"neutral"}').reply)
      .toBe('sounds good');
  });

  it('ignores prose wrapped around the envelope', () => {
    expect(envelope('Sure! Here you go:\n```json\n{"reply":"sounds good","intent":"neutral"}\n```').reply)
      .toBe('sounds good');
  });

  it('lifts the reply out of an envelope the token cap cut in half', () => {
    // This is the case autopilot used to send to a prospect verbatim, braces
    // and all: JSON.parse throws, and the old catch returned the whole string.
    expect(envelope('{"reply":"sounds good. thursday work for a quick call? i can', true).reply)
      .toBe('sounds good. thursday work for a quick call?');
  });

  it('never lets a brace reach a prospect', () => {
    // Whatever survives, if it still wears the envelope it is not a message.
    expect(envelope('{"intent":"neutral","re').reply).toBe('');
    expect(envelope('{ "reply" : ').reply).toBe('');
  });

  it('falls back to the raw text when the model ignored the envelope entirely', () => {
    expect(envelope('sounds good, thursday work?'))
      .toEqual({ reply: 'sounds good, thursday work?', intent: null });
  });
});
