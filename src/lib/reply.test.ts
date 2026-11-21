import { describe, expect, it } from 'vitest';
import {
  callDays,
  checkReply,
  DISCOVERY_QUESTIONS,
  openSteps,
  readConversation,
  readStep,
  replyBrief,
  replyContract,
  type ThreadLine,
} from '../../supabase/functions/_shared/reply.ts';

const LINK = 'https://cal.com/marcus/15min';

/** Noon UTC on a given date, so the weekday is the same in every zone tested here. */
const noon = (iso: string) => new Date(`${iso}T12:00:00Z`);

const out = (text: string): ThreadLine => ({ direction: 'out', text });
const them = (text: string): ThreadLine => ({ direction: 'in', text });

describe('the two days a call is offered on', () => {
  // Owner, 2026-11-21: "if today is Monday, tell them Tuesday or Wednesday".
  it('offers the next two days after today', () => {
    expect(callDays(noon('2026-11-23'), 'UTC')).toEqual({ today: 'Monday', days: ['Tuesday', 'Wednesday'] });
    expect(callDays(noon('2026-11-25'), 'UTC').days).toEqual(['Thursday', 'Friday']);
  });

  it('skips the weekend, which a booking calendar rarely opens on', () => {
    expect(callDays(noon('2026-11-26'), 'UTC').days).toEqual(['Friday', 'Monday']);
    expect(callDays(noon('2026-11-27'), 'UTC').days).toEqual(['Monday', 'Tuesday']);
    expect(callDays(noon('2026-11-21'), 'UTC')).toEqual({ today: 'Saturday', days: ['Monday', 'Tuesday'] });
  });

  it("reads the day where the Operator is, not where the server is", () => {
    // 01:00 UTC Tuesday is still Monday evening in New York.
    const late = new Date('2026-11-24T01:00:00Z');
    expect(callDays(late, 'America/New_York').today).toBe('Monday');
    expect(callDays(late, 'UTC').today).toBe('Tuesday');
  });

  it('survives a zone name the runtime does not know', () => {
    expect(callDays(noon('2026-11-23'), 'Not/AZone').today).toBe('Monday');
  });
});

describe('where a conversation is', () => {
  it('counts only the questions asked since they first answered', () => {
    const thread = [
      out('do most of your clients come from referrals, or from here?'),
      out('think my last one got buried. still curious?'),
      them('mostly referrals'),
      out('what happens in the months they dry up?'),
      them('we scramble'),
      out('got it, makes sense.'),
    ];
    expect(readConversation(thread, LINK, noon('2026-11-23'), 'UTC').questionsAsked).toBe(1);
  });

  it('knows when the link has gone out, however it was written', () => {
    const sent = [them('yes'), out('grab a time here: cal.com/marcus/15min/')];
    expect(readConversation(sent, LINK, noon('2026-11-23')).linkSent).toBe(true);
    expect(readConversation([them('yes')], LINK, noon('2026-11-23')).linkSent).toBe(false);
    expect(readConversation(sent, undefined, noon('2026-11-23')).linkSent).toBe(false);
  });

  it('closes the questions once a couple have been asked', () => {
    const base = { linkSent: false, today: 'Monday', callDays: ['Tuesday', 'Wednesday'] };
    expect(openSteps({ ...base, questionsAsked: 0 })).toContain('discover');
    expect(openSteps({ ...base, questionsAsked: DISCOVERY_QUESTIONS })).not.toContain('discover');
    expect(openSteps({ ...base, questionsAsked: DISCOVERY_QUESTIONS })).toContain('offer_call');
  });

  it('opens confirm only once there is a link to confirm, and never goes back to questions', () => {
    const base = { questionsAsked: 0, today: 'Monday', callDays: ['Tuesday', 'Wednesday'] };
    expect(openSteps({ ...base, linkSent: false })).not.toContain('confirm');
    expect(openSteps({ ...base, linkSent: true })).toContain('confirm');
    expect(openSteps({ ...base, linkSent: true })).not.toContain('discover');
  });

  it('tells the model the days and the count, so it never has to work them out', () => {
    const state = { questionsAsked: 2, linkSent: false, today: 'Monday', callDays: ['Tuesday', 'Wednesday'] };
    const brief = replyBrief(state, openSteps(state), true);
    expect(brief).toContain('Today is Monday. When you send the link, the two days you offer are Tuesday and Wednesday. Name them only then.');
    expect(brief).toContain('2 of 2. That is enough. Offer the call now.');
    expect(brief).not.toContain('- discover:');
  });
});

describe('the reply gate', () => {
  const open = ['discover', 'offer_call', 'send_link', 'close'] as const;

  it('refuses the link under a question: it goes out only at send_link', () => {
    // The message the owner saw: a question with the booking link stapled on.
    const reply = `how many leads come in a week? grab a time here: ${LINK}`;
    expect(checkReply(reply, 'discover', [...open], LINK).join(' ')).toContain('booking link went into a message');
  });

  it('refuses a send_link without the link in it', () => {
    expect(checkReply('perfect, let me know once it is booked', 'send_link', [...open], LINK).join(' '))
      .toContain('not in the reply');
  });

  it('accepts the link with the request to confirm', () => {
    const reply = `perfect, here's the link: ${LINK} tuesday or wednesday, whichever fits you best. just let me know once you've booked so i can confirm on my end`;
    expect(checkReply(reply, 'send_link', [...open], LINK)).toEqual([]);
  });

  it('refuses a third question, and a message with two', () => {
    expect(checkReply('what happens then?', 'discover', ['offer_call', 'send_link', 'close'], LINK).join(' '))
      .toContain('not open');
    expect(checkReply('how is it going? and what have you tried?', 'discover', [...open], LINK).join(' '))
      .toContain('more than one question');
  });

  const days = ['Tuesday', 'Wednesday'];

  it('accepts the offer to show them how, and waits for their answer', () => {
    const reply = "so the work's good but it comes in waves. we can actually help with that. want me to show you how?";
    expect(checkReply(reply, 'offer_call', [...open], LINK, days)).toEqual([]);
  });

  it('keeps the days for the link: they come only after a yes', () => {
    // Owner, 2026-11-21: offer to show them, wait for yes, then the link and the days.
    const early = "we can help with that. worth a quick call, tuesday or wednesday?";
    expect(checkReply(early, 'offer_call', [...open], LINK, days).join(' ')).toContain('days already named');
    const withLink = `perfect, here's the link: ${LINK} tuesday or wednesday, whichever fits you best. just let me know once you've booked so i can confirm on my end`;
    expect(checkReply(withLink, 'send_link', [...open], LINK, days)).toEqual([]);
  });

  it('refuses an answer with no step, and an empty one', () => {
    expect(checkReply('sounds good', null, [...open], LINK).join(' ')).toContain('no "step"');
    expect(checkReply('  ', 'close', [...open], LINK).join(' ')).toContain('empty');
  });
});

describe('reading the answer', () => {
  it('reads the step from the envelope, or from a broken one', () => {
    expect(readStep('{"step":"offer_call","reply":"x","intent":"interested"}')).toBe('offer_call');
    expect(readStep('{"step": "send_link", "reply": "cut off')).toBe('send_link');
    expect(readStep('{"step":"pitch","reply":"x"}')).toBeNull();
  });

  it('puts the link in the contract only with its rule', () => {
    expect(replyContract(LINK)).toContain('only at step send_link');
    expect(replyContract(undefined)).toContain('no booking link');
  });
});
