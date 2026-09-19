import { describe, it, expect } from 'vitest';
import { computeDueFollowUps, renderTemplate, stampFollowUp, type TemplateContext } from './followups';
import type { FollowUpCondition, FollowUpSequence, FollowUpStep, Lead } from './types';

const DAY = 86_400_000;
const NOW = new Date('2026-09-20T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY).toISOString();

const lead = (over: Partial<Lead> = {}): Lead => ({
  id: 'l1', handle: 'founder_one', name: 'Marcus Webb', followers: 4200,
  isPrivate: false, status: 'cold', dmSent: true, replied: false,
  dmDate: daysAgo(30), ...over,
});

const step = (over: Partial<FollowUpStep> = {}): FollowUpStep => ({
  id: 's1', delayDays: 3, condition: 'no_reply', messageTemplate: 'hey {{firstName}}', ...over,
});

const sequence = (steps: FollowUpStep[], over: Partial<FollowUpSequence> = {}): FollowUpSequence => ({
  id: 'seq1', steps, active: true, ...over,
});

const stocked: TemplateContext = {
  proofPoint: '9 booked calls in 3 weeks',
  removedSacrifice: 'without hiring anyone',
  freeGive: 'the 3-line profile audit',
  price: '$197/mo',
  priceAnchor: '$497/mo',
  callLength: '15 minutes',
  callPromise: 'map your first 30 days',
  calendarLink: 'https://cal.com/marcus',
  valueProposition: 'a calendar that fills itself',
};

describe('renderTemplate', () => {
  it('fills the Offer Ledger tokens', () => {
    expect(renderTemplate('{{proof}}, {{sacrifice}}.', lead(), stocked))
      .toBe('9 booked calls in 3 weeks, without hiring anyone.');
  });

  it('uses the first word of the name for {{firstName}}', () => {
    expect(renderTemplate('hey {{firstName}}.', lead(), stocked)).toBe('hey Marcus.');
  });

  /**
   * The asymmetry the whole renderer exists for. A missing NAME must cost a
   * word; a missing FACT must cost the sentence. Shipping "if it's , say so"
   * to a prospect is worse than sending nothing, and it is exactly what the old
   * two-token replace would have done the day templates started carrying facts.
   */
  it('drops only the word when a decorative token is empty', () => {
    const anonymous = lead({ name: undefined });
    expect(renderTemplate('not chasing you {{firstName}} — here is the thing.', anonymous, stocked))
      .toBe('not chasing you — here is the thing.');
  });

  it('drops the whole sentence when a factual token is empty', () => {
    const out = renderTemplate(
      "what's stopping you? if it's {{price}}, say so and i'll tell you straight.",
      lead(),
      {},
    );
    expect(out).toBe("what's stopping you?");
    expect(out).not.toContain("if it's");
  });

  it('returns nothing when every sentence needed a fact we do not have', () => {
    expect(renderTemplate('{{proof}}. {{give}}.', lead(), {})).toBe('');
  });

  it('tidies the dash a removed name leaves at the front of a line', () => {
    expect(renderTemplate('{{firstName}} — forgot the useful part.', lead({ name: undefined }), {}))
      .toBe('forgot the useful part.');
  });

  it('leaves an unknown token visible rather than silently eating a sentence', () => {
    expect(renderTemplate('hey {{nonsense}} there.', lead(), stocked)).toBe('hey {{nonsense}} there.');
  });

  it('always resolves {{outcome}}, so the takeaway touch cannot lose its point', () => {
    expect(renderTemplate('if {{outcome}} is still on the list.', lead(), {}))
      .toBe('if growing the business is still on the list.');
    expect(renderTemplate('if {{outcome}} is still on the list.', lead(), stocked))
      .toBe('if a calendar that fills itself is still on the list.');
  });

  it('never reaches for their @handle, which is how a scraped list announces itself', () => {
    expect(renderTemplate('hey {{firstName}}.', lead(), stocked)).not.toContain('@');
  });
});

describe('computeDueFollowUps', () => {
  const due = (leads: Lead[], seq: FollowUpSequence | null, ctx: TemplateContext = stocked) =>
    computeDueFollowUps(leads, seq, NOW, ctx);

  it('is empty for a paused or stepless sequence', () => {
    expect(due([lead()], sequence([step()], { active: false }))).toEqual([]);
    expect(due([lead()], sequence([]))).toEqual([]);
    expect(due([lead()], null)).toEqual([]);
  });

  it('holds a step until its delay has elapsed', () => {
    const fresh = lead({ dmDate: daysAgo(1) });
    expect(due([fresh], sequence([step({ delayDays: 3 })]))).toEqual([]);
    expect(due([lead({ dmDate: daysAgo(4) })], sequence([step({ delayDays: 3 })]))).toHaveLength(1);
  });

  /**
   * The bug this whole condition set was built to fix. The engine held one line
   * — `if (condition === 'no_reply' && lead.replied) continue` — so a Lead who
   * answered fell out of every sequence permanently.
   */
  it('reaches a Lead who replied and never booked', () => {
    const warm = lead({ replied: true, replyDate: daysAgo(8), booked: false });
    const rescue = sequence([step({ condition: 'replied_not_booked', delayDays: 2 })]);

    expect(due([warm], rescue)).toHaveLength(1);
    // ...and the old ladder still leaves them alone, so they get one touch, not two.
    expect(due([warm], sequence([step({ condition: 'no_reply' })]))).toEqual([]);
  });

  it('leaves a booked Lead alone', () => {
    const won = lead({ replied: true, replyDate: daysAgo(8), booked: true, status: 'won' });
    expect(due([won], sequence([step({ condition: 'replied_not_booked', delayDays: 2 })]))).toEqual([]);
  });

  it('counts a rescue step from the reply, not from the opener', () => {
    // Messaged a month ago, replied yesterday. Anchoring on dmDate would make
    // them instantly overdue on the day the rescue ladder is switched on.
    const justReplied = lead({ dmDate: daysAgo(30), replied: true, replyDate: daysAgo(1) });
    const rescue = sequence([step({ condition: 'replied_not_booked', delayDays: 2 })]);
    expect(due([justReplied], rescue)).toEqual([]);

    const stalled = lead({ dmDate: daysAgo(30), replied: true, replyDate: daysAgo(5) });
    expect(due([stalled], rescue)).toHaveLength(1);
  });

  /**
   * Suppression beats every condition, `always` included. Messaging someone who
   * said "not interested" twelve days later is how an Instagram account gets
   * actioned, and no apology takes it back.
   */
  it.each<FollowUpCondition>(['no_reply', 'always', 'replied_not_booked'])(
    'never touches an opted-out Lead, even on condition %s',
    (condition) => {
      const gone = lead({ optedOut: true, replied: true, replyDate: daysAgo(9) });
      expect(due([gone], sequence([step({ condition, delayDays: 1 })]))).toEqual([]);
    },
  );

  it('skips a Lead the extension never confirmed a send for', () => {
    expect(due([lead({ dmSent: false })], sequence([step()]))).toEqual([]);
    expect(due([lead({ dmDate: undefined })], sequence([step()]))).toEqual([]);
  });

  it('does not count a touch whose message renders empty', () => {
    // The Operator left the Ledger field this touch is built around blank.
    // Counting it would promise a send that goes out as a husk or not at all.
    const seq = sequence([step({ messageTemplate: '{{give}}.' })]);
    expect(due([lead()], seq, {})).toEqual([]);
    expect(due([lead()], seq, stocked)).toHaveLength(1);
  });

  it('sends at most one step per lead per batch, earliest first', () => {
    const old = lead({ dmDate: daysAgo(40) });
    const result = due([old], sequence([
      step({ id: 'a', delayDays: 3, messageTemplate: 'first {{firstName}}' }),
      step({ id: 'b', delayDays: 7, messageTemplate: 'second {{firstName}}' }),
    ]));
    expect(result).toHaveLength(1);
    expect(result[0].stepIndex).toBe(0);
    expect(result[0].message).toBe('first Marcus');
  });

  it('moves to the next step once the previous one is stamped', () => {
    const touched = lead({ dmDate: daysAgo(40), followUp1Date: daysAgo(20) });
    const result = due([touched], sequence([
      step({ id: 'a', delayDays: 3 }),
      step({ id: 'b', delayDays: 7, messageTemplate: 'second {{firstName}}' }),
    ]));
    expect(result).toHaveLength(1);
    expect(result[0].stepIndex).toBe(1);
  });
});

describe('stampFollowUp', () => {
  const at = '2026-09-20T12:00:00.000Z';

  it('writes the step it sent and marks the Lead followed up', () => {
    expect(stampFollowUp(lead(), 1, at)).toMatchObject({ followedUp: true, followUp2Date: at });
    expect(stampFollowUp(lead(), 0, at).followUp2Date).toBeUndefined();
  });

  it('keeps the two ladders in separate slots', () => {
    const stamped = stampFollowUp(lead(), 0, at, true);
    expect(stamped.rescue1Date).toBe(at);
    expect(stamped.followUp1Date).toBeUndefined();
    // A rescue touch is still a follow-up as far as followUpRate is concerned.
    expect(stamped.followedUp).toBe(true);
  });
});

/**
 * The defect the separate slots exist for, stated as a test.
 *
 * A prospect who got the day-3 cold touch and then answered it is the single
 * most common way into the rescue ladder. Sharing followUpN would see rung one
 * as already sent and drop them at rung two — skipping "think my last one got
 * buried", which is the rung written for precisely that moment.
 */
describe('a Lead who was touched, then replied', () => {
  const touchedThenReplied = lead({
    dmDate: daysAgo(20),
    followUp1Date: daysAgo(17),   // cold touch 1 already went out
    followedUp: true,
    replied: true,
    replyDate: daysAgo(16),
  });

  it('enters the rescue ladder at rung one, not rung two', () => {
    const rescue = sequence([
      step({ id: 'r1', condition: 'replied_not_booked', delayDays: 2, messageTemplate: 'rung one {{firstName}}' }),
      step({ id: 'r2', condition: 'replied_not_booked', delayDays: 5, messageTemplate: 'rung two {{firstName}}' }),
    ]);
    const result = computeDueFollowUps([touchedThenReplied], rescue, NOW, stocked);

    expect(result).toHaveLength(1);
    expect(result[0].stepIndex).toBe(0);
    expect(result[0].message).toBe('rung one Marcus');
    expect(result[0].rescue).toBe(true);
  });

  it('and the cold ladder still leaves them alone', () => {
    const cold = sequence([
      step({ id: 'c1', delayDays: 3 }),
      step({ id: 'c2', delayDays: 7 }),
    ]);
    expect(computeDueFollowUps([touchedThenReplied], cold, NOW, stocked)).toEqual([]);
  });
});
