import { describe, it, expect } from 'vitest';
import { HUMAN_VOICE_HEADING, humanVoiceBlock, withHumanVoice } from '../../supabase/functions/_shared/voice.ts';
import { buildReplySystemPrompt, buildSystemPrompt, DEFAULT_IDENTITY } from './prompt';

/**
 * The Edge Functions add the humanizer rules to whatever system prompt the
 * browser sends. Imported rather than read as a string, like completion.ts,
 * because this is behaviour: a hand-edited prompt has to gain the block, and
 * a v6 prompt must not carry it twice.
 */
describe('withHumanVoice', () => {
  const handWritten = 'You are Sam. Write a short, friendly Instagram DM.';

  it('adds the rules to a prompt the Operator wrote by hand', () => {
    const system = withHumanVoice(handWritten, 'dm');
    expect(system.startsWith(handWritten)).toBe(true);
    expect(system).toContain(HUMAN_VOICE_HEADING);
  });

  it('lets the Operator\'s own instructions win where they are specific', () => {
    expect(withHumanVoice(handWritten, 'dm')).toContain('follow those');
  });

  it('says nothing about what the response contains', () => {
    // It used to end "your whole response is still only the DM". The answer
    // now has fields, laid out by `withDmContract`, which comes after this.
    expect(withHumanVoice(handWritten, 'dm')).not.toMatch(/whole response|only the DM/);
    expect(withHumanVoice(handWritten, 'dm').trimEnd().endsWith('follow those.')).toBe(true);
  });

  it('never adds the rules twice', () => {
    const dm = buildSystemPrompt(DEFAULT_IDENTITY);
    const reply = buildReplySystemPrompt(DEFAULT_IDENTITY);
    expect(withHumanVoice(dm, 'dm')).toBe(dm);
    expect(withHumanVoice(reply, 'reply')).toBe(reply);
    expect(withHumanVoice(withHumanVoice(handWritten, 'reply'), 'reply')).toBe(withHumanVoice(handWritten, 'reply'));
  });

  it('gives each writer its own last checks', () => {
    expect(humanVoiceBlock('dm')).toContain('LinkedIn post');
    expect(humanVoiceBlock('reply')).toContain('Never open on an acknowledgement');
    expect(humanVoiceBlock('dm')).not.toContain('Never open on an acknowledgement');
  });

  it('practises what it bans: the block itself has no em dash', () => {
    expect(humanVoiceBlock('dm') + humanVoiceBlock('reply')).not.toMatch(/[–—]/);
  });
});
