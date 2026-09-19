import type { FollowUpCondition, FollowUpSequence, Lead } from './types';
import type { OfferLedger } from './prompt';

export interface DueFollowUp {
    lead: Lead;
    stepIndex: 0 | 1 | 2;
    message: string;
    /** Which ladder produced it, and therefore which slots get stamped. */
    rescue: boolean;
}

/**
 * The three date slots each ladder owns.
 *
 * Kept apart because both ladders can run over one Lead's lifetime. Sharing
 * them would mean a Lead who received a cold touch and then replied enters the
 * rescue ladder at rung two, skipping the rung written for precisely that
 * moment — and that is the common case, since a day-3 follow-up is exactly what
 * a lot of people finally answer.
 */
const COLD_SLOTS = ['followUp1Date', 'followUp2Date', 'followUp3Date'] as const;
const RESCUE_SLOTS = ['rescue1Date', 'rescue2Date', 'rescue3Date'] as const;

/**
 * Which ladder a sequence is, decided once for the whole sequence rather than
 * per step. A step reading its own condition would break the chain the moment
 * an Operator mixed conditions: step 2 would look for its anchor in slots step
 * 1 never wrote.
 */
function isRescueSequence(sequence: FollowUpSequence): boolean {
    return sequence.steps.some((s) => s.condition === 'replied_not_booked');
}

const DAY_MS = 86_400_000;

/**
 * Everything a follow-up template can say that isn't about the Lead.
 *
 * `AppConfig` satisfies this structurally, which is the point: the Offer Ledger
 * lives on the config already, so a call site passes what it has rather than
 * assembling a bag of strings.
 */
export type TemplateContext = Partial<OfferLedger> & {
    valueProposition?: string;
    calendarLink?: string;
};

/**
 * A token whose absence costs a sentence, not a message.
 *
 * Names are decorative: "not chasing you {{firstName}} — here's the thing"
 * still reads perfectly with the name removed, so an anonymous Lead must not
 * cost the whole line. Facts are the opposite — "if it's , say so" is worse
 * than not sending at all, so a fact that resolved to nothing takes its
 * sentence with it. That asymmetry is the whole design here.
 */
const DECORATIVE = new Set(['firstName', 'name', 'handle']);

/** Marks a sentence for removal — see `renderTemplate`. Never reaches output. */
const MISSING = '\u0000';

/** Sentence-ish fragments, each keeping the punctuation that ends it. */
const SENTENCE = /[^.!?\n]+(?:[.!?]+|\n|$)/g;

const TOKEN = /\{\{(\w+)\}\}/g;

function values(lead: Lead, ctx: TemplateContext): Record<string, string | undefined> {
    const full = lead.name?.trim();
    return {
        // Decorative.
        firstName: full ? full.split(/\s+/)[0] : '',
        name: full || '',
        handle: `@${lead.handle}`,
        // Factual — every one of these is an Offer Ledger entry the Operator
        // typed, or it is nothing at all.
        proof: ctx.proofPoint,
        sacrifice: ctx.removedSacrifice,
        timeToResult: ctx.timeToResult,
        give: ctx.freeGive,
        price: ctx.price,
        anchor: ctx.priceAnchor,
        guarantee: ctx.guarantee,
        callLength: ctx.callLength,
        callPromise: ctx.callPromise,
        calendar: ctx.calendarLink,
        // Always resolvable, with the same fallback `prompt.ts:resolve` uses, so
        // the takeaway touch can never lose its own point.
        outcome: ctx.valueProposition?.trim() || 'growing the business',
    };
}

/** Collapse the gaps a removed decorative token leaves behind. */
function tidy(text: string): string {
    return text
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/[ \t]+([,.!?])/g, '$1')
        // A dangling dash where a name used to be: " — forgot to say" → "forgot to say".
        .replace(/^\s*[—–-]\s*/, '')
        .trim();
}

/**
 * Fill a template's tokens, dropping any sentence whose facts we don't have.
 *
 * The old version replaced `{{handle}}` and `{{name}}` and nothing else, which
 * was fine while the templates were three hardcoded strings and fatal the
 * moment they started carrying the Offer Ledger: a half-filled ledger would
 * otherwise ship "if it's , say so and i'll tell you straight" to a prospect.
 *
 * Returns "" when nothing survives. Callers must treat that as "not due" rather
 * than as an empty message — `computeDueFollowUps` does.
 */
export function renderTemplate(template: string, lead: Lead, ctx: TemplateContext = {}): string {
    const table = values(lead, ctx);

    const filled = template.replace(TOKEN, (whole, key: string) => {
        // A token we do not know is left visible: it is a typo in the
        // Operator's own template, and showing it in the preview is how they
        // find out. A token we DO know but cannot fill is the opposite case —
        // testing the value alone conflated the two, so an unfilled `{{price}}`
        // was classed as a typo and went out to the prospect verbatim.
        if (!(key in table)) return whole;
        const value = table[key];
        if (value) return value;
        return DECORATIVE.has(key) ? '' : MISSING;
    });

    const kept = (filled.match(SENTENCE) ?? [filled])
        .filter((sentence) => !sentence.includes(MISSING))
        .map((sentence) => tidy(sentence))
        .filter(Boolean);

    return tidy(kept.join(' '));
}

/**
 * Returns a copy of the lead stamped with the sent follow-up step.
 *
 * `followedUp` is set either way — a rescue touch is still a follow-up, and
 * `filters.ts`'s followUpRate counts it as one.
 */
export function stampFollowUp(lead: Lead, stepIndex: 0 | 1 | 2, sentAt: string, rescue = false): Lead {
    const slots = rescue ? RESCUE_SLOTS : COLD_SLOTS;
    return { ...lead, followedUp: true, [slots[stepIndex]]: sentAt };
}

/**
 * Which Leads a step is allowed to touch.
 *
 * `replied_not_booked` is the one that was missing. The engine used to hold a
 * single line — `if (condition === 'no_reply' && lead.replied) continue` — so
 * the moment a prospect answered, every sequence stopped reaching them for
 * good. Replied, warm and never booked is the most valuable state a Lead can be
 * in, and it was the one state with no machinery pointed at it.
 */
const ELIGIBLE: Record<FollowUpCondition, (lead: Lead) => boolean> = {
    always: () => true,
    no_reply: (lead) => !lead.replied,
    replied_not_booked: (lead) => Boolean(lead.replied) && !lead.booked,
};

/**
 * Where a step counts its delay from.
 *
 * A rescue step measures from the last thing that actually happened, which is
 * their reply — not from the opener, which may be weeks older. Anchoring a
 * stall on `dmDate` would make every already-replied Lead instantly overdue on
 * the day the rescue ladder was switched on.
 */
function anchorFor(lead: Lead, rescue: boolean, index: number): string | undefined {
    if (index === 0) return rescue ? (lead.replyDate ?? lead.dmDate) : lead.dmDate;
    const slots = rescue ? RESCUE_SLOTS : COLD_SLOTS;
    return lead[slots[index - 1]];
}

/**
 * Compute which leads are due a follow-up step right now.
 *
 * Rules:
 *  - never a Lead who opted out, whatever the condition says
 *  - only leads with dmSent + dmDate
 *  - step i anchors on `anchorFor` — dmDate (or replyDate, for a rescue step),
 *    then followUp1Date, then followUp2Date
 *  - due when the anchor exists, the step's own date is empty, anchor +
 *    delayDays has elapsed, and the condition allows it
 *  - a step whose message renders empty is not due: the Operator is missing an
 *    Offer Ledger field, and the honest answer is to show nothing rather than
 *    count a touch that would send a husk
 *  - at most ONE step per lead per batch (the earliest due one)
 */
export function computeDueFollowUps(
    leads: Lead[],
    sequence: FollowUpSequence | null,
    now: Date = new Date(),
    ctx: TemplateContext = {},
): DueFollowUp[] {
    if (!sequence || !sequence.active || sequence.steps.length === 0) return [];

    const nowMs = now.getTime();
    const due: DueFollowUp[] = [];
    const rescue = isRescueSequence(sequence);
    const slots = rescue ? RESCUE_SLOTS : COLD_SLOTS;

    for (const lead of leads) {
        // They asked to be left alone. Messaging them anyway is how an Instagram
        // account gets actioned, and no apology takes it back.
        if (lead.optedOut) continue;
        if (!lead.dmSent || !lead.dmDate) continue;

        for (let i = 0; i < Math.min(sequence.steps.length, 3); i++) {
            const step = sequence.steps[i];
            const anchor = anchorFor(lead, rescue, i);
            if (!anchor || lead[slots[i]]) continue;

            const anchorMs = new Date(anchor).getTime();
            if (!Number.isFinite(anchorMs)) continue;
            if (nowMs < anchorMs + step.delayDays * DAY_MS) continue;
            if (!ELIGIBLE[step.condition]?.(lead)) continue;

            const message = renderTemplate(step.messageTemplate, lead, ctx);
            if (!message) continue;

            due.push({ lead, stepIndex: i as 0 | 1 | 2, message, rescue });
            break; // one step per lead per batch
        }
    }

    return due;
}
