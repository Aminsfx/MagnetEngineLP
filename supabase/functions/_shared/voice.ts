// What makes a message read as written by a person. The one copy of it.
//
// Taken from the humanizer playbook (github.com/blader/humanizer, MIT, v3.1):
// the habits a reader uses to spot machine writing, cut down to the ones that
// fit in a 40-word DM or a two-sentence reply, and phrased as rules for the
// writer rather than as a checklist for an editor. The playbook's premise is
// the reason every rule here exists: a model picks the likeliest phrasing, the
// likeliest phrasing is the one everybody has seen, and seeing it is how a
// prospect knows nobody wrote to them.
//
// Free of Deno globals by contract, like `completion.ts`, because both sides
// read it:
//   - `src/lib/prompt.ts` renders the block into the DM prompt and the reply
//     persona it builds, so the Operator can read it in Settings.
//   - generate-dm and generate-reply append it (`withHumanVoice`) to a system
//     prompt that does not already carry it. A prompt the Operator edited by
//     hand is never rebuilt by a PROMPT_VERSION bump, and the rules have to
//     reach their messages too.
//
// The deterministic half (em dashes rewritten after generation) lives in
// `completion.ts`, because a model told "no em dashes" still writes some.

export type VoiceFor = 'dm' | 'reply';

/** How the block is recognised in a stored prompt, so it is never added twice. */
export const HUMAN_VOICE_HEADING = '## WRITE LIKE A PERSON';

const SHARED = `${HUMAN_VOICE_HEADING}

People spot a machine by its habits, not by one bad word. Each habit below is
the likeliest choice a model makes, which is exactly why a reader recognises
it. Write the specific thing instead.

Say it straight:
- No "it's not X, it's Y", no "not just X but Y", no "no X, no Y" tail. Make
  the point itself. A contrast is fine only when it corrects something they
  actually believe.
- No line that sums up the line before it: "That's the real win.", "Just
  saying.", "Food for thought.", "Simple as that." Stop when the point is made.
- No fake-deep phrasing: "the real question is", "at the end of the day",
  "what really matters", "the secret is", "here's what most people miss".
- No run-up before the point: "Here's the thing", "Honestly?", "Look,", "Real
  talk", "Quick note", "Fun fact", "Not gonna lie", "Let's be honest".
- Never deny something nobody said: "not trying to sell you anything", "no
  pressure", "I'm not saying", "don't get me wrong", "to be clear".

Rhythm:
- Never list three things because three sounds finished. Use as many as the
  point needs, which is usually one.
- No em dashes, no en dashes, no semicolons. A comma or a full stop does the
  job, and those are what a phone keyboard has.
- One hedge at most. "could potentially", "might possibly" and "just wondering
  if maybe" are a script apologising for itself.
- Two sentences in a row with the same length and the same opening read like
  a template. Vary them.

Plain words:
- Never: actually (as an opener), additionally, crucial, delve, elevate,
  empower, enhance, game-changer, journey, key (as an adjective), landscape,
  leverage, next level, pivotal, quietly, robust, seamless, showcase,
  testament, unlock, valuable, vibrant.
- No hype adjectives about them or their work: amazing, incredible, stunning,
  impressive, inspiring, insane. Warmth comes from the detail you noticed.
- Say "is" and "has". Not "serves as", "stands as", "boasts", "offers".
- No borrowed authority: "studies show", "experts say", "most businesses".
- No assistant phrases: "Great question", "Absolutely", "Of course", "I hope
  this helps", "Happy to help", "I'd be happy to", "Feel free".
- No bold, no lists, no arrows, no hashtags, and no emoji doing a word's job.

What you do not know:
- Never guess about their life or their business and say it as fact: "you're
  probably", "I bet you", "I imagine you". Use what you were given or say
  nothing.

Sounding like someone:
- Removing the habits is half of it. Contractions. One concrete detail. Short
  words. A real opinion is fine when it is yours to have. Type it the way you
  would to someone you respect and have never met.`;

const DM_ONLY = `
- Read it as the person receiving it. If a sentence could be pasted into a DM
  to somebody else, or would sit comfortably in a LinkedIn post, rewrite that
  sentence before you answer.`;

const REPLY_ONLY = `
- Answer the thing they asked in your first sentence. No warm-up before it.
- Never open on an acknowledgement: "Love that", "Totally", "Makes sense", "I
  hear you", "Thanks for sharing", "I completely understand", "Great point".
  And never open two of your messages in a row the same way.
- Do not repeat their message back to them before you answer it. Reading their
  gap back once, right before you offer the call, is the only exception.
- Read it as them. If it sounds like a support agent or a chatbot, rewrite it.`;

/** The block, as it sits inside a prompt. */
export function humanVoiceBlock(kind: VoiceFor): string {
  return SHARED + (kind === 'dm' ? DM_ONLY : REPLY_ONLY);
}

/**
 * A system prompt with the block on it, unless it already has one.
 *
 * The prompt arrives from the browser as a saved string, so this is the only
 * way the rules reach an Operator whose prompt is hand-edited or older than
 * the block. Their own instructions win where they are specific, since those
 * are their words; the block fills in everything they did not say.
 *
 * It says nothing about what the response contains. A DM's answer is laid out
 * by `withDmContract` (dm.ts), which generate-dm adds after this, and a
 * reply's by generate-reply's own envelope.
 */
export function withHumanVoice(system: string, kind: VoiceFor): string {
  if (system.includes(HUMAN_VOICE_HEADING)) return system;
  const precedence = `These rules come on top of everything above. Where the instructions above ask
for something specific, such as a word or a sign-off, follow those.`;
  return `${system.trimEnd()}\n\n${humanVoiceBlock(kind)}\n\n${precedence}`;
}
