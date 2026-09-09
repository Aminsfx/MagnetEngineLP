// Cleaning a model completion down to the message itself.
//
// Deliberately free of Deno globals: the Edge Functions import it as a
// neighbour, and `src/lib/completion.test.ts` imports the same file so the
// behaviour is actually executed by a test rather than asserted about as a
// string. There must only ever be ONE of these — generate-dm and generate-reply
// each carried their own cleaner, they drifted, and the reply path ended up
// with no label handling at all while the DM path had some.
//
// That test import is load-bearing in a second way. It pulls this file into
// `tsc --noEmit`'s program despite `tsconfig.json` excluding `supabase/` —
// `exclude` filters what `include` discovers, not what an import reaches — so
// the no-Deno-globals rule is mechanically enforced: a `Deno.` reference here
// fails `npm run typecheck` with "Cannot find name 'Deno'". That is intended.
// (`eslint.config.js` does ignore `supabase/**`, so tsc is the only linting
// this file gets.)
//
// What it is defending against: a model asked for a DM often answers a person
// instead of producing an artefact — "Sure! Here's a personalized message:" —
// and everything it wraps around the message travels all the way to Instagram.
// The Approval Queue renders `dmContent` verbatim and the extension types it.
//
// The governing constraint is asymmetric. Leaving a preamble in is ugly and the
// Operator can see it. Eating part of a real DM is invisible: it reads as a
// slightly odd message and gets sent. So every rule below is written to fail
// closed — it must recognise a *label*, not merely a suspicious-looking line,
// and no rule may consume the entire string.

/** Control characters, minus \t and \n. */
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Zero-width characters and the byte-order mark.
 *
 * Worth its own rule: a leading BOM defeats a `startsWith('"')` check, which is
 * one quiet reason the old quote strip appeared to fire only sometimes.
 */
const INVISIBLE = /[\u200B-\u200D\uFEFF]/g;

/**
 * The nouns a model reaches for when it is talking ABOUT the message rather
 * than writing it. A label has to contain one of these — "is this line short
 * and does it end in a colon" is not enough, because a real DM opens
 * "quick q:" and nobody would ever see what that rule ate.
 *
 * `note` and `text` are deliberately absent. They are the two words on the
 * obvious list that a real DM uses as ordinary vocabulary — "quick note on
 * your pricing page" is a good opening line, and no model has ever announced
 * itself with "here's the note". The weak nouns buy nothing and cost a DM.
 */
const NOUN = '(?:subject|dm|dms|message|messages|draft|drafts|reply|response|version|versions|option|rewrite)';

/** How a model clears its throat before complying. */
const OPENER = "(?:sure|certainly|absolutely|of course|of course!|got it|no problem|happy to help|here you go|okay|ok)";

/**
 * A bare label and nothing else: "DM:", "Message:", "Option 2:", "Draft:".
 *
 * Nothing may sit between the noun and the colon except digits, which is what
 * keeps it off a real DM. "message me if you want the teardown:" is a sentence
 * that happens to start with a noun from the list and happens to end in a
 * colon; requiring `\d*` and nothing else means it is not a label.
 */
const BARE_LABEL = new RegExp(`^${NOUN}[ \\t]*\\d*[ \\t]*:[ \\t]*`, 'i');

/**
 * The "here's the ..." family: "Here is the DM:", "Here's a personalized
 * message:", "Here's the DM for @jane:".
 *
 * Anchored on "here", so it cannot fire on prose. The old regex demanded the
 * exact article `the|your` and the exact noun `DM|message`, which is why
 * "Here's a personalized message:" sailed through untouched.
 */
const HERES_LABEL = new RegExp(
  `^here(?:'s|\u2019s|s| is| are)?[ \\t]+` +
    `(?:the|your|a|an|my|another)?[ \\t]*` +
    `(?:\\w+[ \\t]+){0,2}?${NOUN}\\b[^\\n:]{0,30}?:[ \\t]*`,
  'i',
);

/**
 * A politeness opener — but only ever stripped when a label follows it.
 *
 * On its own this rule is dangerous: "of course you're already running ads."
 * is a perfectly good bold-tone opening line, and a naive opener strip would
 * silently delete it. Requiring the remainder to be a label means the only
 * thing this can match is a model clearing its throat.
 */
const OPENER_PREFIX = new RegExp(`^${OPENER}\\b[ \\t]*[!,.\u2026]*[ \\t]*`, 'i');

/** A line that is nothing but an acknowledgement: "Sure!", "Of course". */
const ACK_LINE = new RegExp(`^${OPENER}[\\s!.,\u2026\u2013\u2014-]*$`, 'i');

/**
 * A whole line that announces the message without a colon, for the shape a
 * markdown heading leaves behind ("## Draft" \u2192 "Draft") and for "Here's your
 * DM" on its own line.
 *
 * The line must be *only* the announcement. Allowing trailing words here would
 * delete "quick note on your pricing page", which is why the noun list has no
 * `note` in it and why this is anchored at both ends.
 */
const LABEL_LINE = new RegExp(
  `^(?:here(?:'s|\u2019s|s| is| are)?[ \\t]+|below is[ \\t]+)?` +
    `(?:the|your|a|an|my|another)?[ \\t]*` +
    `(?:short|quick|brief|personali[sz]ed|custom|tailored|casual|friendly|revised|final)?[ \\t]*` +
    `${NOUN}[ \\t]*\\d*[ \\t]*[:.]?$`,
  'i',
);

/**
 * Chatter addressed to the Operator rather than to the prospect, tacked on the
 * end.
 *
 * This is the most dangerous rule in the file, because a DM's last line is its
 * micro-ask — the entire point of the message — and it is addressed to a
 * person, which is exactly what trailing chatter looks like. "want me to send
 * over the breakdown?" is the DM working. "want me to write a shorter
 * version?" is the model talking to the Operator. Both open identically.
 *
 * So it takes TWO conjuncts: the line must be addressed to someone AND be
 * about the message as an artefact. Either one alone deletes real DMs.
 */
const ADDRESSED =
  /^(?:let me know|lmk|just let me know|happy to|i can|i could|want me to|would you like|do you want|feel free to|tell me if)\b/i;
const ABOUT_THE_MESSAGE =
  /\b(?:variations?|versions?|alternatives?|tweaks?|tweak|adjust(?:ed|ments?)?|shorter|longer|punchier|softer|rewrite|revise|reword|another (?:one|angle|take)|different (?:angle|tone|approach)|more (?:casual|formal|direct)|the tone|the copy|the wording)\b/i;

/** Whole trailing lines that are never part of a message. */
const OPERATOR_ASIDE = [
  // A cold DM has not helped anyone with anything yet.
  /^hope (?:this|that) (?:helps|works)[!. ]*$/i,
  /^\(?[ \t]*~?[ \t]*\d+[ \t]*(?:words?|characters?|chars?)\b[^)]*\)?[.!]?$/i,
  /^[-–—_*=]{3,}$/,
  /^note[ \t]*:/i,
];

/** Quote pairs a model wraps output in. */
const QUOTE_PAIRS: [string, string][] = [
  ['"', '"'],
  ['\u201C', '\u201D'],
  ['\u2018', '\u2019'],
  ['\u00AB', '\u00BB'],
  ["'", "'"],
];

/** The first fenced block in the text, if there is one. */
function unwrapFence(text: string): string {
  // A fence is the single most reliable signal in the whole file: when a model
  // fences its answer, the message is exactly the fenced part and everything
  // outside it is commentary. That one rule retires the entire
  // "Sure!\n```\nhey there\n```\nWant a shorter one?" family at a stroke, both
  // preamble and trailer, before any rule with a false-positive surface runs.
  // No Instagram DM contains a triple backtick, so the risk here is zero.
  //
  // The unterminated case is not hypothetical: against a 140-token cap, the
  // closing fence is exactly what gets cut off.
  const closed = text.match(/```[a-zA-Z0-9]*[ \t]*\n?([\s\S]*?)```/);
  const open = text.match(/```[a-zA-Z0-9]*[ \t]*\n?([\s\S]*)$/);
  const inner = (closed ?? open)?.[1]?.trim();
  return inner ? inner : text;
}

/**
 * Markdown a phone keyboard cannot produce, so its presence is always the
 * model formatting rather than the Operator's voice.
 *
 * Two deliberate omissions.
 *
 * `_` is never stripped. Handles and business names are full of underscores \u2014
 * `@jane_doe_fit` would become `@janedoefit`, silently changing the one thing
 * in a DM that has to be exact.
 *
 * Emphasis is unwrapped in PAIRS, not by deleting every asterisk the way the
 * old cleaner did. The space-adjacency guard means `5 * 3 shoots a week`
 * survives while `*this*` still unwraps.
 *
 * Each marker also requires trailing whitespace, so `#1 thing i'd change` and
 * `-50% churn` are left alone.
 */
function stripMarkdown(text: string): string {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^[ \t]{0,3}#{1,6}[ \t]+/, '')
        .replace(/^[ \t]{0,3}>[ \t]?/, ''),
    )
    .join('\n')
    .replace(/\*\*([^*\n]+?)\*\*/g, '$1')
    .replace(/\*(?!\s)([^*\n]+?)(?<!\s)\*/g, '$1')
    .replace(/`/g, '')
    .replace(/^[ \t]*[-\u2022][ \t]+/, '');
}

/** Strip one layer of surrounding quotes, if both ends agree. */
function unwrapQuotes(text: string): string {
  for (const [open, close] of QUOTE_PAIRS) {
    if (text.length > 2 && text.startsWith(open) && text.endsWith(close)) {
      const inner = text.slice(open.length, text.length - close.length);
      // A straight apostrophe is a letter in "how's it goin'", not a quote
      // mark, so only unwrap that pair when the interior holds no more of them.
      if (open === "'" && inner.includes("'")) continue;
      if (inner.trim()) return inner.trim();
    }
  }
  return text;
}

/** Drop a leading line that is a label with the message on a later line. */
function dropLabelLine(text: string): string {
  const lines = text.split('\n');
  const first = lines[0].trim();
  if (!first) return text;

  const rest = lines.slice(1).join('\n').trim();
  // Never let this rule consume everything. If there is no message after the
  // line, the line IS the message.
  if (!rest) return text;

  const isLabel = BARE_LABEL.test(first) || HERES_LABEL.test(first) || ACK_LINE.test(first) || LABEL_LINE.test(first);

  return isLabel ? rest : text;
}

/**
 * Drop a trailing line that talks to the Operator about the message.
 *
 * Capped at two drops and never allowed to empty the text. Looping a deletion
 * rule to a fixed point is how you eat a DM one line at a time, and unlike
 * everything above it, whatever this removes sits *after* a message that
 * already exists — so it has no business returning "".
 */
function dropTrailingChatter(text: string): string {
  const lines = text.split('\n');
  for (let dropped = 0; dropped < 2; dropped++) {
    let i = lines.length - 1;
    while (i > 0 && !lines[i].trim()) i--;
    if (i <= 0) break;

    const line = lines[i].trim();
    const isAside =
      (ADDRESSED.test(line) && ABOUT_THE_MESSAGE.test(line)) ||
      OPERATOR_ASIDE.some((rule) => rule.test(line));
    if (!isAside) break;

    if (!lines.slice(0, i).join('\n').trim()) break;
    lines.length = i;
  }
  return lines.join('\n').trim();
}

/** One pass of the label/quote strips. Returns the text unchanged when stable. */
function unwrapOnce(text: string): string {
  let out = text.trim();

  // An opener only comes off when a label is behind it — see OPENER_PREFIX.
  const withoutOpener = out.replace(OPENER_PREFIX, '');
  if (
    withoutOpener !== out &&
    withoutOpener.trim() &&
    (BARE_LABEL.test(withoutOpener.trim()) || HERES_LABEL.test(withoutOpener.trim()))
  ) {
    out = withoutOpener.trim();
  }

  for (const label of [HERES_LABEL, BARE_LABEL]) {
    const stripped = out.replace(label, '');
    // A label that leaves nothing behind was not a label.
    if (stripped !== out && stripped.trim()) out = stripped.trim();
  }

  out = dropLabelLine(out);
  out = unwrapQuotes(out);
  return out;
}

/**
 * Cut a cut-off completion back to its last finished sentence.
 *
 * Only ever called when the provider itself reported hitting the token cap.
 * The alternative is shipping "hey saw you run ads for dentists in Leeds, how
 * are you handl" to a prospect, which is worse than shipping nothing: nothing
 * is retried and reported, a fragment is approved and sent.
 */
function salvageTruncated(text: string): string {
  const cut = Math.max(text.lastIndexOf('.'), text.lastIndexOf('?'), text.lastIndexOf('!'));
  return cut > 0 ? text.slice(0, cut + 1).trim() : '';
}

export interface CleanOptions {
  /** Hard character ceiling — 1000 for a DM, 800 for an inbox reply. */
  limit: number;
  /** The provider reported the token cap stopped generation, not the model. */
  truncated?: boolean;
}

/**
 * The message a model meant to write, with everything it wrapped around it
 * removed. Returns "" when the completion held no message at all, which both
 * callers treat as a failed generation rather than as a DM.
 */
export function cleanCompletion(raw: string, { limit, truncated }: CleanOptions): string {
  if (!raw) return '';

  let text = raw
    .replace(CONTROL, '')
    .replace(INVISIBLE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .trim();
  text = unwrapFence(text);
  text = stripMarkdown(text).trim();

  // Labels nest — "DM: Here's the message: hey" — and unwrapping one exposes
  // the next, so run to a fixed point rather than once. The cap is a guard
  // against a pathological input, not an expected path; two passes is already
  // unusual.
  for (let pass = 0; pass < 4; pass++) {
    const next = unwrapOnce(text);
    if (next === text) break;
    text = next;
  }

  text = dropTrailingChatter(text);

  if (truncated) text = salvageTruncated(text);

  text = text.replace(/\n{3,}/g, '\n\n').trim().slice(0, limit).trim();

  // A completion of `""` or `**` or a lone bullet held no message. Saying so
  // is what drives the retry and then the 502 the callers already handle; the
  // alternative is stamping punctuation onto a Lead as its DM.
  return /[\p{L}\p{N}]/u.test(text) ? text : '';
}

/** What the inbox reply generator asks the model for. */
export interface ReplyEnvelope {
  reply: string;
  /** Unvalidated — the caller checks it against its own intent list. */
  intent: string | null;
}

/** Anything still wearing the envelope must never be sent. */
const LOOKS_LIKE_JSON = /^[{[]|"(?:reply|intent)"\s*:/;

/**
 * The reply inside the model's JSON envelope.
 *
 * This path carries more risk than the DM path, not less. Autopilot sends an
 * approved reply to the prospect with no human in the loop, so where a leaked
 * preamble on a DM lands in a queue somebody reads, a leaked preamble here is
 * simply sent. The old version made that easy: any JSON parse failure put the
 * entire raw completion into `reply`.
 *
 * Three defences, in order of preference:
 *   1. Parse the envelope, then clean the string inside it — a model that
 *      obeys the JSON contract will still write "Sure! Here's the reply:"
 *      *within* the reply field.
 *   2. If the JSON will not parse, lift the field by hand. This is what
 *      recovers a reply from an envelope the token cap cut off mid-object,
 *      which is the specific failure autopilot used to send verbatim.
 *   3. If what survives still looks like JSON, return nothing and let the
 *      caller fall back to its canned line. A prospect never sees a brace.
 */
export function replyEnvelope(raw: string, { limit, truncated }: CleanOptions): ReplyEnvelope {
  let reply = '';
  let intent: string | null = null;

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      reply = cleanCompletion(String(parsed?.reply ?? ''), { limit });
      if (typeof parsed?.intent === 'string') intent = parsed.intent;
    } catch {
      // Fall through to the hand-lift below.
    }
  }

  if (!reply) {
    const lifted = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
    if (lifted) {
      let field = lifted[1];
      try {
        field = JSON.parse(`"${field}"`);
      } catch {
        // A truncated field can end mid-escape. Unescape what is unambiguous.
        field = field.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      reply = cleanCompletion(field, { limit, truncated: true });
    }
  }

  if (!reply) reply = cleanCompletion(raw, { limit, truncated });
  if (LOOKS_LIKE_JSON.test(reply)) reply = '';

  const matched = raw.match(/"intent"\s*:\s*"([a-z_]+)"/i);
  if (!intent && matched) intent = matched[1];

  return { reply, intent };
}
