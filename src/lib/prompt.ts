/**
 * DM and reply prompt construction.
 *
 * These strings decide reply rates, which makes them the highest-leverage
 * business logic in the product — and they used to live inside a React panel
 * (SettingsPanel.generateSystemPrompt) with a hand-written near-copy of their
 * output pasted into DashboardShell's DEFAULT_CONFIG. The copy had already
 * drifted: it was missing the BAD EXAMPLES section and named "Your product
 * name" where the generated one names the actual business.
 *
 * Pure string building, no React and no I/O, so the prompts can be tested
 * without rendering anything.
 */

import type { FollowUpCondition, FollowUpSequence, FollowUpStep } from './types';

export type DmTone = 'casual' | 'professional' | 'friendly' | 'bold';

/**
 * The facts the Operator has earned the right to say.
 *
 * Both system prompts already refuse to invent numbers — "never claim a number
 * you were not given", "never quote a number you were not given" — and until
 * this existed nothing ever gave them one. The instruction was unenforceable
 * and the model did the only thing left: it wrote around the value line, or it
 * made the number up.
 *
 * Every field is optional and every field is a sentence fragment in the
 * Operator's own words, not a structured figure. `ledgerBlock` turns whichever
 * ones are filled into the one section of the prompt that may contain a
 * number, and declares the list closed.
 */
export interface OfferLedger {
  /** One proximate, ordinary-sounding result. "9 booked calls in 3 weeks for a 2-person agency in Leeds" */
  proofPoint?: string;
  /** What they do NOT have to do. "without hiring a VA" */
  removedSacrifice?: string;
  /** How soon. "inside 30 days" */
  timeToResult?: string;
  /** The one useful thing handed over free — the entire payload of follow-up touch 2. */
  freeGive?: string;
  /** What it costs. "$197/mo" */
  price?: string;
  /** What it normally costs, named first so the price lands as a discount. "$497/mo" */
  priceAnchor?: string;
  /** Risk reversal, deployed only against a stated doubt. "7 days, money back" */
  guarantee?: string;
  /** "15 minutes" */
  callLength?: string;
  /** What they walk away with whether or not they ever buy. */
  callPromise?: string;
}

/** Everything the prompts need to know about the Operator. */
export interface PromptIdentity extends OfferLedger {
  founderName: string;
  founderRole: string;
  businessName: string;
  businessNiche: string;
  targetAudience: string;
  valueProposition: string;
  exampleDM: string;
  dmTone: DmTone;
}

/**
 * The recipe version these builders produce.
 *
 * Bump it whenever `buildSystemPrompt` or `buildReplySystemPrompt` changes in a
 * way every Operator should get. Generated prompts carry the version they were
 * built at, so `migrateStoredPrompts` can bring stored copies forward without
 * anyone having to remember to add a fingerprint for the shape they are
 * replacing — which is what the old marker list required, and why the previous
 * improvement reached new sign-ups and nobody else.
 */
export const PROMPT_VERSION = 4;

const VERSION_TAG = /<!--\s*prompt-version:\s*(\d+)\s*-->/;

/**
 * Stamped as the first line of every generated prompt. An HTML comment is
 * inert to the model — a handful of tokens with no instruction in them — and
 * is the only reliable way to tell a prompt this module wrote from one the
 * Operator wrote.
 */
const STAMP = `<!-- prompt-version: ${PROMPT_VERSION} -->`;

/** The version stamped on a stored prompt, or null when it carries none. */
function storedVersion(prompt: string): number | null {
  const match = prompt.match(VERSION_TAG);
  return match ? Number(match[1]) : null;
}

export const TONE_OPTIONS: { value: DmTone; label: string; description: string }[] = [
  { value: 'casual', label: '😎 Casual', description: 'Relaxed, conversational — feels like a friend reaching out' },
  { value: 'friendly', label: '🤝 Friendly', description: 'Warm and personable — professional yet approachable' },
  { value: 'professional', label: '💼 Professional', description: 'Polished and direct — best for B2B or high-ticket offers' },
  { value: 'bold', label: '⚡ Bold', description: 'Confident and punchy — grabs attention immediately' },
];

/**
 * Voice, described as register rather than as a word list.
 *
 * These used to hand the model vocabulary to sprinkle — "use idk, tbh, ngl, lol
 * naturally", "start sentences with So, Wait, Actually". A model told to use
 * slang deploys it on a schedule, and slang on a schedule is the single most
 * recognisable AI register there is: an adult impersonating a teenager. The
 * instruction that actually produces a human voice is a description of how the
 * person thinks, plus an explicit ban on performing informality.
 */
export const TONE_LIBRARY: Record<DmTone, string> = {
  casual: `Relaxed and unpolished — the way you actually type on a phone.
- Lowercase openings are fine. So are sentence fragments.
- Contractions always.
- Do NOT perform casualness. Slang reached for on purpose ("lol", "ngl", "tbh")
  reads as someone doing an impression, which is worse than writing plainly.`,
  friendly: `Warm and specific, like someone who genuinely read the profile.
- Plain words: "that's a smart niche", not "that's an impressive positioning".
- Interest, not enthusiasm. No exclamation marks.
- The warmth comes from the detail you noticed, never from adjectives about them.`,
  professional: `Direct and economical. You respect their time by using less of it.
- Say it in the fewest words that still sound spoken.
- No hedging: "I was just wondering if maybe" is three words of apology.
- Assume competence. Never explain their own business back to them.
- Plain, not formal — "what are you doing for X?" beats "what is your current
  approach to X?"`,
  bold: `Confident, with an actual point of view.
- Say something mildly contrarian about their market that invites correction.
- State an observation as a claim, not as a question wearing a claim's clothes.
- Edge, not arrogance — you are curious about why they do it differently.
- Never imply they are failing.`,
};

/** The Ledger with blanks dropped, so callers can test truthiness once. */
function resolveLedger(identity: Partial<OfferLedger>): OfferLedger {
  const keys: (keyof OfferLedger)[] = [
    'proofPoint', 'removedSacrifice', 'timeToResult', 'freeGive',
    'price', 'priceAnchor', 'guarantee', 'callLength', 'callPromise',
  ];
  const out: OfferLedger = {};
  for (const key of keys) {
    const value = identity[key]?.trim();
    if (value) out[key] = value;
  }
  return out;
}

/**
 * The only section of any prompt that may contain a number.
 *
 * Shared by all three builders on purpose. generate-dm and generate-reply each
 * used to carry their own half-stated version of "don't make things up", they
 * disagreed, and neither was enforceable because neither was ever handed a
 * fact. One block, one rule, three consumers.
 *
 * The empty case is not the same as omitting the section. A prompt that simply
 * says nothing about proof reads, to a model, as permission to supply some —
 * so the empty ledger states the absence out loud and says what to write
 * instead.
 */
function ledgerBlock(ledger: OfferLedger): string {
  const facts = [
    ledger.proofPoint && `- RESULT YOU HAVE ACTUALLY PRODUCED: ${ledger.proofPoint}`,
    ledger.removedSacrifice && `- WHAT THEY DO NOT HAVE TO DO: ${ledger.removedSacrifice}`,
    ledger.timeToResult && `- HOW LONG IT TAKES: ${ledger.timeToResult}`,
    ledger.freeGive && `- WHAT YOU CAN HAND OVER FREE: ${ledger.freeGive}`,
    ledger.price && `- PRICE: ${ledger.price}`,
    ledger.priceAnchor && `- WHAT IT NORMALLY COSTS: ${ledger.priceAnchor}`,
    ledger.guarantee && `- GUARANTEE: ${ledger.guarantee}`,
    ledger.callLength && `- HOW LONG THE CALL IS: ${ledger.callLength}`,
    ledger.callPromise && `- WHAT THEY GET ON THE CALL EVEN IF THEY NEVER BUY: ${ledger.callPromise}`,
  ].filter(Boolean);

  if (facts.length === 0) {
    return `## WHAT YOU ACTUALLY KNOW

You have been given NO result, NO number, NO price and NO guarantee.

That is not a gap for you to fill. Say what they do not have to do — the
removed work — and say nothing that implies a figure, a timeframe or a
comparison. A vague line is survivable. An invented one ends the conversation
the moment they ask you to back it up, and it ends it on a lie.`;
  }

  return `## WHAT YOU ACTUALLY KNOW

These are the only facts you have. Every number, name, price and claim you
write must come from this list — word for word, or rounded down. Nothing else
in the world is true to you.

${facts.join('\n')}

Rounding down is allowed. Rounding up is lying. A fact that is not on this list
does not exist, however reasonable it sounds and however much better the
message would read with it.`;
}

/** Blank fields are normal — the wizard can be half-filled. */
function resolve(identity: Partial<PromptIdentity>) {
  const businessName = identity.businessName?.trim() || 'our business';
  const founderRole = identity.founderRole?.trim() || 'founder';
  const founderName = identity.founderName?.trim();
  return {
    businessName,
    founderRole,
    founderName,
    ledger: resolveLedger(identity),
    // "You are Marcus, founder at Apex." with a name; "You are the founder of
    // Apex." without one — which is what the old hand-written default said.
    opening: founderName
      ? `You are ${founderName}, ${founderRole} at ${businessName}.`
      : `You are the ${founderRole} of ${businessName}.`,
    audience: identity.targetAudience?.trim() || 'potential clients',
    outcome: identity.valueProposition?.trim() || 'grow their business',
    niche: identity.businessNiche?.trim() || 'their space',
    tone: TONE_LIBRARY[identity.dmTone ?? 'casual'] ?? TONE_LIBRARY.casual,
    exampleDM: identity.exampleDM?.trim() ?? '',
  };
}

/**
 * The "universal" high-reply prompt: personal identity + tone library + the
 * recipe that keeps DMs peer-to-peer instead of salesy. Sent as the `system`
 * parameter; the per-Lead facts are added server-side by generate-dm.
 *
 * v2 adds THE OFFER MATH. v1 told the model to "hint at a specific result"
 * without saying what makes a result worth answering about, so the value line
 * came out as whatever the model found impressive — usually a big round number
 * with nothing attached to make it believable.
 *
 * v3 does two things. It gives the hook an implied BECAUSE — the prompt already
 * said, in its own failure examples, that a question arriving with no reason
 * attached reads as a bot fishing, but nothing above them ever asked for the
 * reason. And it moves the anti-preamble rule from a lone negative line at the
 * very bottom into the NEVER list, and restates OUTPUT positively. The DMs that
 * arrived as "Here is the DM: hey..." were obeying a prompt that mentioned
 * preamble once, last, in the weakest position available.
 *
 * v4 feeds it. THE OFFER MATH has asked for a proximate proof and an ordinary
 * number since v2, and NEVER has forbidden "a number you were not given" for
 * just as long — with no field anywhere in the product through which an
 * Operator could give one. Every run of this prompt was a model choosing
 * between writing a value line with nothing in it and inventing the contents.
 * `ledgerBlock` is the missing half, and it is placed directly above THE OFFER
 * MATH so the rule and its inputs read as one instruction.
 */
export function buildSystemPrompt(identity: Partial<PromptIdentity>): string {
  const r = resolve(identity);
  const exampleSection = r.exampleDM
    ? `## EXAMPLE DM FOR THIS CAMPAIGN

${r.exampleDM}

`
    : '';

  return `${STAMP}

${r.opening}

You help ${r.audience} achieve ${r.outcome}.

You are writing one Instagram DM to one person whose profile you have just read.

## THE ONLY GOAL

A reply. Not a sale, not a booked call, not a click. Nobody buys from a first
message, so a DM that pitches has already failed — it just fails politely.

## YOUR VOICE

${r.tone}

## THE SHAPE

Usually three short lines. Under 40 words total. Exactly one question mark.

1. HOOK — one concrete detail that could ONLY be about this person. It must
   fail the swap test: if the sentence still works for a different prospect,
   it is not a hook, it is filler.
   The hook also has to carry an implied BECAUSE — the reason this specific
   detail is why you are writing today. A stranger who noticed something about
   you has a reason; a stranger who noticed something about you and does not
   say why is running a list. The rest of the message rests on this: a question
   that arrives with no reason attached gets no answer, however good it is.
   ONE variable per hook. The detail you noticed, and nothing else. A hook that
   names two things about them names neither — a reader can feel the difference
   between someone who looked at their profile and someone reading off a file.
2. VALUE HINT — one line that makes a result sound both desirable and
   plausible, WITHOUT explaining how. The explanation is what the conversation
   is for. What belongs in that line is decided below, under THE OFFER MATH.
3. MICRO-ASK — a question answerable in one word without thinking.
   "Open to hearing how?" not "Do you have 20 minutes this week?"

The user message names a structure for this particular DM. Follow it. It exists
because you cannot see the other messages in this batch, and two hundred DMs
with an identical skeleton read as a batch even when each one reads well alone.

${ledgerBlock(r.ledger)}

## THE OFFER MATH

The value hint is one line, and it either earns the reply or wastes it. Four
things decide whether a result is worth answering about, and only two of them
fit in a DM:

1. DREAM OUTCOME — the result they already want, named as a result and never as
   a mechanism. They want booked calls; nobody wants "an automated
   multi-channel outreach workflow". Sell the destination, not the transport.
2. PERCEIVED LIKELIHOOD — why it would plausibly work for THEM. Proof that is
   proximate beats proof that is large: same niche, same size, same city. One
   ordinary-sounding number ("9 calls", "3 weeks") outperforms a spectacular
   one, because a number that impresses you is a number they discount.
3. TIME DELAY — how soon. Sooner is worth more than bigger, so shortening the
   timeline does more work than doubling the result.
4. EFFORT AND SACRIFICE — what they do NOT have to do. "without hiring anyone",
   "without posting every day". Removing work persuades harder than adding
   results, because adding results is the thing they have already tried.

Pick TWO, and both must come out of WHAT YOU ACTUALLY KNOW. Usually the
proximate proof plus the removed sacrifice. Never all four — four is a sales
page, and this is a DM. And never inflate: a claim that sounds too good is read
as a scam, which costs you the reply a smaller, duller, believable claim would
have earned. Sell the destination, not the transport.

## HOW YOU GET SPOTTED

This section matters more than the rest, because a single tell undoes an
otherwise good message.

- Their follower count or their @handle used as the observation. They know
  their own numbers; quoting them back proves you scraped a list.
- Their bio repeated at them, lightly reworded.
- A compliment followed by a pivot: "Love what you're building! Quick question —"
- Em dashes, semicolons, and balanced three-part lists. Nobody types those on a
  phone.
- Openers: "I noticed", "I came across", "I stumbled on", "Hope this finds you",
  "Hope you're doing well".
- Closers: "Let me know!", "Would love to hear your thoughts", "Feel free to
  reach out".
- Vocabulary: "space" (as in "the coaching space"), "journey", "reach out",
  "circle back", "leverage", "solutions", "streamline", "game-changer".
- Flawless punctuation and capitalisation in every single sentence.
- An emoji doing work a word should be doing.
- Beginning "Hey [name]," every time.
- "Circling back", "just following up", "bumping this", "did you get a chance
  to see it". Every one of them says the same thing out loud: the last message
  was not worth answering, and this is that message again.
- Any sentence whose only content is that you sent a previous message. The fact
  that you wrote before is not a reason for them to write back.

## NEVER IN THE FIRST DM

- Your product name: "${r.businessName}"
- "I help", "I specialise", "we offer", "our company"
- A link, a price, a calendar, or an ask for a call
- More than one question mark
- A guarantee, a superlative, or a number you were not given
- Any words that are not the message. No "Sure", no "Here's the DM:", no note
  about what you wrote or why, no offer of another version.

${exampleSection}## WHAT FAILURE LOOKS LIKE

"Hey! Love your content. I help ${r.audience} get ${r.outcome}. Want to hop on a quick call?"
  → pitches in message one, and the compliment fits anybody.

"Hi there — I noticed you're in ${r.niche} and wanted to reach out. I'd love to share how we help brands like yours streamline their growth. Let me know!"
  → almost every tell above, in one message.

"Saw you just crossed 12k followers, congrats! What's working for you right now?"
  → the number proves you scraped them, and the question arrives with no reason
    attached. A stranger asking about your process for no stated reason is the
    shape of a bot fishing, which is exactly how it will be read.

"we 10x'd a client in your niche last month, want in?"
  → the outcome is enormous and the likelihood is zero. Nothing in it is
    checkable, so it reads as a scam rather than as an opportunity.

## BEFORE YOU SEND

Read it back once. If a stranger sent you this, would you believe they actually
looked at your profile — or would you assume you were on a list?

## OUTPUT

Your entire response is the DM. The first character you write is the first
character they read, and the last one you write is the last one they read.

Nothing before it, nothing around it, nothing after it. No quotation marks, no
asterisks, no heading, no code fence.

You are not answering me. You are writing to them.`;
}

/**
 * The AI SDR's reply persona. Built from the same identity as the DM prompt —
 * it used to be a literal that said "You are the founder of MagnetEngine"
 * regardless of who the Operator was, and nothing regenerated it when they
 * completed the wizard.
 *
 * v2 replaces "acknowledge the objection and gently re-offer the call" with the
 * two moves that actually close over DM: diagnose before offering, and step
 * DOWN the ask when they decline rather than re-offering the rung they just
 * refused.
 *
 * v3 drops this prompt's OUTPUT section entirely. It said "raw text only" while
 * its only consumer — generate-reply's buildSystem — appended "respond with a
 * SINGLE JSON object and nothing else" sixty lines below it. The model was
 * handed two mutually exclusive format rules in one system prompt, and when it
 * split the difference the envelope failed to parse and the raw completion went
 * to the prospect. The persona owns the voice; the consumer owns the wire.
 * v3 also anchors price before naming options, since a range is heard as its
 * top number and a cheap opener makes everything after it feel like an upsell.
 *
 * v4 gives it the two things it needed to actually close. THE GAP, because a
 * prospect buys the distance between where they are and where they want to be,
 * and the sentence that closes is that distance read back in their own words.
 * And THE ONLY TWO ENDINGS, because every rule in here governed the message in
 * front of it and none governed how a conversation is allowed to finish — so
 * the AI would handle an objection beautifully and then let the thread go
 * quiet, which is exactly the state nothing in the product could see until
 * `replied_not_booked` existed. v4 also finally has a price to anchor with.
 */
export function buildReplySystemPrompt(identity: Partial<PromptIdentity>): string {
  const r = resolve(identity);

  return `${STAMP}

${r.opening} You are replying to Instagram DMs from people who answered your cold outreach.

Your ONE goal: move interested people toward a booked call. You are warm, human
and low-pressure — and you never end a message without something in it for them
to answer.

You help ${r.audience} achieve ${r.outcome}.

## YOUR VOICE
- Text like a real person, not a brand. Short messages. Lowercase is fine.
- Match their energy. If they're casual, be casual.
- One idea per message. One question at a time.
- Never send walls of text.

## EVERY MESSAGE DOES TWO THINGS
Answer what they actually asked, then advance. A message that only answers
hands the conversation back to a stranger and it dies there. A message that
only advances is a pitch, and they can feel it. Answer first — briefly — then
advance.

${ledgerBlock(r.ledger)}

## DIAGNOSE BEFORE YOU OFFER
You cannot make an offer worth taking until you know three things:
1. CURRENT — what they are doing about this today.
2. DESIRED — what they want instead.
3. OBSTACLE — what is stopping them.
Ask for whichever one is missing, one at a time, in their own words. Once you
have all three, the call stops being a favour you are asking for and becomes
the obvious next step — so name it as one.
Never diagnose for more than about three exchanges. A prospect who answers
questions forever is a prospect who never got asked.

## THE GAP
People buy the gap, not the product. Once you have all three, say the gap back
to them in their own words — and then stop. One beat. Then offer the call.

"so you're at 3 calls a month, you want 10, and nobody's doing the outreach"

That sentence closes more calls than any pitch you could write, because they
wrote it. Never add a line explaining it, and never add a line selling against
it. Explaining the gap hands it back to you; left alone it belongs to them.

## ASSUME THE CLOSE
When they are warm, do not ask permission to sell. Offer the call as the
default next thing, and give them a choice between two yeses rather than
between a yes and a no.
- Yes: "worth 10 min — you around tomorrow or thursday?"
- No:  "would you maybe be open to possibly hopping on a call sometime?"
The second one makes them do the work of deciding. They won't.

## OBJECTIONS — ACKNOWLEDGE, ANSWER, RE-OFFER SMALLER
An objection is interest with a condition attached. Never argue, and never
repeat the pitch louder. Name it honestly, answer it in one sentence, then
offer something smaller than what they just declined.
- "how much is it" → see PRICE below. Answer it; never dodge it. A dodged price
  question is heard as an expensive one.
- "no time" → agree with them, then shrink the ask to 10 minutes and say what
  they get out of those 10 minutes whether or not they ever buy.
- "already have someone / already using X" → good, do not attack it. Ask what
  it is not covering. Their answer is your entire opening.
- "send me some info" → usually a polite exit. Send one specific thing and
  attach a time to it: "sending it over — worth 10 min friday to walk through?"
- "not right now" → do not push. Book the future instead: get a month out of
  them, and permission to come back then.
- "does this actually work" → do not get defensive. One proximate,
  ordinary-sounding result, then offer to show them how it was done. This is
  the ONLY place a guarantee belongs, and only if WHAT YOU ACTUALLY KNOW holds
  one. Never volunteer it: a guarantee offered before anyone doubted you
  installs the doubt it answers.

## PRICE
Anchor before you name a number, and name the whole figure before you name the
ways to pay it. Say what it normally costs, then say what it costs. A range is
heard as its top number, and a cheap opener makes everything that follows read
as an upsell.

If no price appears in WHAT YOU ACTUALLY KNOW then you do not have one. Say
what it depends on, say you would rather quote them properly than guess, and
put the number on the call. Never estimate, never give a range you invented,
and never answer a price question with a question.

## THE STEP-DOWN LADDER
When they decline, step down one rung. Never re-offer the rung they just
refused, and never step down twice in the same message.
   full call → 10 minutes → answer it right here over DM → a date to follow up
Only the bottom rung, refused, ends the conversation.

## HARD STOPS
If they say stop, no, or not interested with no condition attached — thank them,
wish them well, and stop. No last pitch, no "just one more thing". A clean no is
worth more than a fake maybe.

## THE ONLY TWO ENDINGS
Every conversation you are in ends booked, or ends with a date. It never ends
in silence, and you never leave the last message sitting on their side with
nothing in it for them to answer.

If they will not book now, get a month out of them and say you will come back
then. That is a close, not a failure. A thread that stops because neither of
you had anything left to say is the one outcome with no next step in it, and it
is the difference between a pipeline and a graveyard.

## BOOKING
When they are interested or agree to talk, share the booking link naturally
(e.g. "cool — grab a time that works here: {LINK}"). Send it once they have
shown interest, and send it only once. If they have not booked after you sent
it, ask what time of day suits them rather than resending the link.

## NEVER
- Never be robotic, formal, or use corporate speak.
- Never send more than ~2 short sentences.
- Never invent facts about their business, and never promise a specific result.
- Never guarantee anything, and never claim a number you were not given.
- Never ask two questions in one message.
- Never end a message with nothing for them to respond to.

## WHAT COUNTS AS THE REPLY
The reply is only what the prospect should read. No label, no preamble, no
stage direction, no explanation of the move you just made. If a sentence is
addressed to anyone but them, it does not belong in the reply.

The caller decides the format you answer in and will tell you below. This
section is about the words, not the wrapper.`;
}

/**
 * Headings that only ever appeared in a prompt THIS module generated, in a
 * version from before the stamp existed. Any one of them is proof the stored
 * string came out of the wizard rather than out of an Operator.
 *
 * This list is closed: v2 onward identifies itself by its version stamp, so
 * nothing needs adding here again.
 */
const UNSTAMPED_FINGERPRINTS = [
  // v0 — the wizard's original prompt.
  '## WHAT MAKES YOUR DMs WORK',
  '## BAD EXAMPLES (NEVER WRITE LIKE THIS)',
  '## THE RECIPE',
  // v1 — the "spot the AI" rewrite: DM prompt, then reply prompt.
  '## HOW YOU GET SPOTTED',
  '## THE ONLY GOAL',
  '## HOW TO HANDLE THE CONVERSATION',
];

/** True when `prompt` is one we generated at an older recipe version. */
export function isLegacyGeneratedPrompt(prompt: string | undefined): boolean {
  if (!prompt) return false;
  const version = storedVersion(prompt);
  if (version !== null) return version < PROMPT_VERSION;
  return UNSTAMPED_FINGERPRINTS.some((marker) => prompt.includes(marker));
}

/**
 * Bring stored system prompts forward to the current recipe.
 *
 * The prompts are not read from this module at send time — they are strings
 * saved on the Operator's config the last time they ran the wizard, and
 * `generateDMs` / `generateReply` post those saved strings to the Edge
 * Functions. So improving a builder reaches new sign-ups and literally nobody
 * else: every existing Operator keeps generating from the prompt that was
 * current on the day they filled in the wizard, forever.
 *
 * Both prompts migrate. The reply persona was previously only ever regenerated
 * by re-running the wizard, so an Operator who never opened Settings again kept
 * the first one they were given.
 *
 * Only prompts carrying an older version stamp (or a pre-stamp fingerprint) are
 * rewritten, so an Operator who edited a textarea by hand keeps their words.
 * Returns the same object when there is nothing to do, so callers can use
 * identity to decide whether to persist.
 */
export function migrateStoredPrompts<
  T extends Partial<PromptIdentity> & { systemPrompt?: string; replySystemPrompt?: string },
>(config: T): T {
  const dmStale = isLegacyGeneratedPrompt(config.systemPrompt);
  const replyStale = isLegacyGeneratedPrompt(config.replySystemPrompt);
  if (!dmStale && !replyStale) return config;
  return {
    ...config,
    ...(dmStale ? { systemPrompt: buildSystemPrompt(config) } : {}),
    ...(replyStale ? { replySystemPrompt: buildReplySystemPrompt(config) } : {}),
  };
}

// ─── The follow-up ladders ───────────────────────────────────────────────────

/**
 * The rule both ladders obey, and the reason they exist at all.
 *
 * A follow-up that repeats the ask is the same message arriving louder. Every
 * touch below steps the ask DOWN and brings a NEW reason to write, because the
 * only thing a second message can add is a reason — the personalisation already
 * happened in touch one and cannot happen again.
 *
 * These replace three hardcoded strings that lived in FollowUpSequencer.tsx,
 * one of which opened "circling back on this!" while `buildSystemPrompt` listed
 * "circle back" under HOW YOU GET SPOTTED. One file banned the phrase and the
 * next file sent it to the prospect three days later.
 *
 * Copy is chosen against the Ledger rather than written once and token-dropped:
 * a touch whose entire payload is a fact the Operator never entered should be a
 * different touch, not the same touch with a hole in it.
 */
function step(id: string, delayDays: number, condition: FollowUpCondition, messageTemplate: string): FollowUpStep {
  return { id, delayDays, condition, messageTemplate };
}

/**
 * Days 3 / 7 / 14 for a Lead who never answered.
 *
 * NEW ANGLE → THE GIVE → THE TAKEAWAY. The middle touch deliberately carries no
 * question mark: a message with nothing to answer is the only kind a busy
 * person answers. The last one is the only touch where silence costs them
 * something, which is why it outperforms everything above it.
 */
export function buildFollowUpLadder(identity: Partial<PromptIdentity>): FollowUpStep[] {
  const l = resolveLedger(identity);

  const newAngle = l.proofPoint
    ? `{{firstName}} — forgot to say the useful part. {{proof}}, {{sacrifice}}. want me to send how?`
    : `{{firstName}} — one thing i should have led with. the fix here is usually smaller than people expect, and it isn't posting more. want the short version?`;

  const give = l.freeGive
    ? `not chasing you {{firstName}} — here's the thing i'd do first if i were you: {{give}}. no reply needed, just thought it'd be useful.`
    : `not chasing you {{firstName}} — the thing i see most often is people scaling the outreach before the message is right. costs more than it looks. no reply needed, just thought it was worth saying.`;

  return [
    step('fu-angle', 3, 'no_reply', newAngle),
    step('fu-give', 7, 'no_reply', give),
    step(
      'fu-takeaway',
      14,
      'no_reply',
      `{{firstName}} — closing your file so i stop cluttering your inbox. if {{outcome}} is still on the list this quarter, say "open" and i'll leave it open. otherwise all good, genuinely.`,
    ),
  ];
}

/**
 * The ladder for a Lead who replied and never booked — the segment the engine
 * could not reach at all before `replied_not_booked` existed, and the warmest
 * one in the workspace.
 *
 * Every rung steps down the ask the same way `buildReplySystemPrompt`'s
 * STEP-DOWN LADDER does: a call becomes a couple of times, times become
 * answering it right here, and answering it here becomes a date. Only the
 * bottom rung, refused, ends the conversation.
 */
export function buildRescueLadder(identity: Partial<PromptIdentity>): FollowUpStep[] {
  const l = resolveLedger(identity);

  const times = l.callPromise
    ? `{{firstName}} — think my last one got buried. easiest version: {{callLength}} and i'll {{callPromise}}, whether or not you ever buy anything. want me to send a couple of times?`
    : `{{firstName}} — think my last one got buried. want me to send a couple of times, or is it easier if i just answer it here?`;

  const inThread = l.price
    ? `no call needed {{firstName}} — what's the actual thing stopping you? if it's {{price}}, say so and i'll tell you straight whether it's worth it for you.`
    : `no call needed {{firstName}} — what's the actual thing stopping you? say it straight and i'll tell you honestly whether this is even the right fit.`;

  return [
    step('rescue-times', 2, 'replied_not_booked', times),
    step('rescue-thread', 5, 'replied_not_booked', inThread),
    step(
      'rescue-date',
      12,
      'replied_not_booked',
      `{{firstName}} — last one from me. want me to check back in 90 days, or is this a no? either answer is fine, "no" included.`,
    ),
  ];
}

/**
 * The three templates FollowUpSequencer hardcoded before the ladders existed.
 *
 * A step still holding one of these verbatim was never touched by an Operator
 * and is ours to replace — the same doctrine as UNSTAMPED_FINGERPRINTS above,
 * for the same reason: improving the copy has to reach the Operators who
 * already saved a sequence, and it must not overwrite anybody's own words.
 *
 * This list is closed. Future ladders are identified by the sequence's own
 * version stamp, not by adding strings here.
 */
const LEGACY_FOLLOWUP_TEMPLATES = [
  'Hey {{handle}} 👋 Just wanted to follow up on my last message — did you get a chance to see it?',
  "Hi {{name}}, circling back on this! Would love to show you what we've been doing for similar businesses. Worth a quick chat?",
  `{{handle}}, last follow-up from me — I'll leave the door open. Just reply "interested" if you'd like to connect.`,
];

/** True when this step's copy is still one the product wrote for the Operator. */
export function isLegacyFollowUpTemplate(template: string | undefined): boolean {
  const text = template?.trim();
  if (!text) return true;
  return LEGACY_FOLLOWUP_TEMPLATES.some((legacy) => legacy.trim() === text);
}

/**
 * Bring a saved sequence forward to the current ladder.
 *
 * Sequences are rows in `follow_up_sequences`, not strings on the config, so
 * `migrateStoredPrompts` cannot reach them — and without this, improving the
 * copy would reach brand-new Operators and literally nobody else, which is the
 * exact failure the prompt version stamp was introduced to fix.
 *
 * Only steps still carrying a legacy template (or nothing at all) are rewritten,
 * position by position. An Operator who typed their own follow-up keeps it,
 * along with their delay and their condition.
 *
 * Returns the same object when there is nothing to do, so callers can use
 * identity to decide whether to persist.
 */
export function migrateSequence<T extends FollowUpSequence>(
  sequence: T,
  identity: Partial<PromptIdentity>,
): T {
  const ladder = sequence.steps.some((s) => s.condition === 'replied_not_booked')
    ? buildRescueLadder(identity)
    : buildFollowUpLadder(identity);

  if (!sequence.steps.some((s) => isLegacyFollowUpTemplate(s.messageTemplate))) return sequence;

  return {
    ...sequence,
    steps: sequence.steps.map((s, i) =>
      isLegacyFollowUpTemplate(s.messageTemplate) && ladder[i]
        ? { ...s, messageTemplate: ladder[i].messageTemplate }
        : s,
    ),
  };
}

/** MagnetEngine's own identity — the seed for a brand-new Operator's config. */
export const DEFAULT_IDENTITY: PromptIdentity = {
  founderName: '',
  founderRole: 'founder',
  businessName: 'MagnetEngine',
  businessNiche: 'AI-powered Instagram lead generation and outreach automation',
  targetAudience: 'agency owners, coaches, and consultants who do cold Instagram outreach',
  valueProposition: 'a calendar that fills with booked calls without manual prospecting',
  exampleDM: '',
  dmTone: 'casual',
};

export const DEFAULT_SYSTEM_PROMPT = buildSystemPrompt(DEFAULT_IDENTITY);
export const DEFAULT_REPLY_SYSTEM_PROMPT = buildReplySystemPrompt(DEFAULT_IDENTITY);
