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

export type DmTone = 'casual' | 'professional' | 'friendly' | 'bold';

/** Everything the prompts need to know about the Operator. */
export interface PromptIdentity {
  founderName: string;
  founderRole: string;
  businessName: string;
  businessNiche: string;
  targetAudience: string;
  valueProposition: string;
  exampleDM: string;
  dmTone: DmTone;
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

/** Blank fields are normal — the wizard can be half-filled. */
function resolve(identity: Partial<PromptIdentity>) {
  const businessName = identity.businessName?.trim() || 'our business';
  const founderRole = identity.founderRole?.trim() || 'founder';
  const founderName = identity.founderName?.trim();
  return {
    businessName,
    founderRole,
    founderName,
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
 */
export function buildSystemPrompt(identity: Partial<PromptIdentity>): string {
  const r = resolve(identity);
  const exampleSection = r.exampleDM
    ? `## EXAMPLE DM FOR THIS CAMPAIGN

${r.exampleDM}

`
    : '';

  return `${r.opening}

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
2. VALUE HINT — hint at a specific, relevant result WITHOUT explaining how.
   The explanation is what the conversation is for. Numbers that aren't round
   ("9 calls", "3 weeks") are more believable than round ones, and proof that
   is proximate — same niche, same size, same city — beats proof that is large.
3. MICRO-ASK — a question answerable in one word without thinking.
   "Open to hearing how?" not "Do you have 20 minutes this week?"

The user message names a structure for this particular DM. Follow it. It exists
because you cannot see the other messages in this batch, and two hundred DMs
with an identical skeleton read as a batch even when each one reads well alone.

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

## NEVER IN THE FIRST DM

- Your product name: "${r.businessName}"
- "I help", "I specialise", "we offer", "our company"
- A link, a price, a calendar, or an ask for a call
- More than one question mark

${exampleSection}## WHAT FAILURE LOOKS LIKE

"Hey! Love your content. I help ${r.audience} get ${r.outcome}. Want to hop on a quick call?"
  → pitches in message one, and the compliment fits anybody.

"Hi there — I noticed you're in ${r.niche} and wanted to reach out. I'd love to share how we help brands like yours streamline their growth. Let me know!"
  → almost every tell above, in one message.

"Saw you just crossed 12k followers, congrats! What's working for you right now?"
  → the number proves you scraped them, and the question arrives with no reason
    attached. A stranger asking about your process for no stated reason is the
    shape of a bot fishing, which is exactly how it will be read.

## BEFORE YOU SEND

Read it back once. If a stranger sent you this, would you believe they actually
looked at your profile — or would you assume you were on a list?

## OUTPUT

Just the DM text. No quotes. No labels. No preamble. Raw text only.`;
}

/**
 * The AI SDR's reply persona. Built from the same identity as the DM prompt —
 * it used to be a literal that said "You are the founder of MagnetEngine"
 * regardless of who the Operator was, and nothing regenerated it when they
 * completed the wizard.
 */
export function buildReplySystemPrompt(identity: Partial<PromptIdentity>): string {
  const r = resolve(identity);

  return `${r.opening} You are replying to Instagram DMs from people who answered your cold outreach.

Your ONE goal: move interested people toward booking a quick call. You are warm, human, and low-pressure — never a pushy salesperson.

You help ${r.audience} achieve ${r.outcome}.

## YOUR VOICE
- Text like a real person, not a brand. Short messages. Lowercase is fine.
- Match their energy. If they're casual, be casual.
- One idea per message. Ask one question at a time.
- Never send walls of text.

## HOW TO HANDLE THE CONVERSATION
1. If they show interest ("tell me more", "how does it work", "what do you do") → give a one-sentence answer, then offer the call and share your booking link.
2. If they raise an objection (price, time, "not sure", "already have X") → acknowledge it honestly, answer briefly, and gently re-offer the call.
3. If they're clearly not interested or say stop → thank them, wish them well, do not push.
4. If they ask a direct question → answer it plainly first, then steer back toward the call.

## BOOKING
When they're interested or agree to talk, share the booking link naturally (e.g. "cool — grab a time that works here: {LINK}"). Only send the link once they've shown interest.

## NEVER
- Never be robotic, formal, or use corporate speak.
- Never send more than ~2 short sentences.
- Never invent facts about their business or make promises about results.

## OUTPUT
Just the reply text. No quotes, no labels, no preamble. Raw text only.`;
}

/**
 * Headings that only ever appeared in a prompt THIS module generated, before
 * the rewrite that removed the "spot the AI" tells. Any one of them is proof
 * the stored string came out of the wizard rather than out of an Operator.
 */
const LEGACY_PROMPT_MARKERS = [
  '## WHAT MAKES YOUR DMs WORK',
  '## BAD EXAMPLES (NEVER WRITE LIKE THIS)',
  '## THE RECIPE',
];

/** True when `prompt` is a generated prompt from before the rewrite. */
export function isLegacyGeneratedPrompt(prompt: string | undefined): boolean {
  if (!prompt) return false;
  return LEGACY_PROMPT_MARKERS.some((marker) => prompt.includes(marker));
}

/**
 * Bring a stored system prompt forward to the current recipe.
 *
 * The prompt is not read from this module at send time — it is a string saved
 * on the Operator's config the last time they ran the wizard, and
 * `generateDMs` posts that saved string to the Edge Function. So improving
 * `buildSystemPrompt` reaches new sign-ups and nobody else: every existing
 * Operator keeps generating DMs from the prompt that was current on the day
 * they filled in the wizard, forever.
 *
 * This only rewrites prompts that still carry `LEGACY_PROMPT_MARKERS`, so an
 * Operator who edited the textarea by hand keeps their words. Returns the same
 * object when there is nothing to do, so callers can use identity to decide
 * whether to persist.
 */
export function migrateStoredPrompts<
  T extends Partial<PromptIdentity> & { systemPrompt?: string },
>(config: T): T {
  if (!isLegacyGeneratedPrompt(config.systemPrompt)) return config;
  return { ...config, systemPrompt: buildSystemPrompt(config) };
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
