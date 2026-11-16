import { describe, it, expect } from 'vitest';
import { autopilotCall, isAutopilotPicked, withAutopilotPick } from './autopilot';
import type { Conversation, Message } from './types';

const conv = (over: Partial<Conversation> = {}): Conversation => ({
    id: 't1', handle: 'maya-builds', lastMessageAt: '2026-11-16T10:00:00Z', lastMessageText: 'how much?',
    unread: true, status: 'open', needsReply: true, ...over,
} as Conversation);

const msg = (id: string, direction: 'in' | 'out', createdAt: string): Message => ({
    id, conversationId: 't1', direction, text: direction === 'in' ? 'how much?' : 'about 200', createdAt,
});


describe('whether autopilot answers a conversation', () => {
    it('answers someone it is on for', () => {
        expect(autopilotCall(conv(), [msg('ig_1', 'in', '2026-10-01T10:00:00Z')], { picked: true, delivery: {} }))
            .toBe('answer');
    });

    // The regression: it answered everyone who wrote in, and the first read
    // after connecting Instagram brought in the whole inbox as new.
    it('leaves everyone the Operator did not pick to the Operator', () => {
        expect(autopilotCall(conv(), [msg('ig_1', 'in', '2026-11-16T10:00:00Z')], { picked: false, delivery: {} }))
            .toBe('skip');
    });

    // The regression: a reply waiting its turn behind paced campaign sends,
    // and the person writing again, made a second AI reply.
    it('waits while a reply of ours is still with the extension', () => {
        const thread = [
            msg('ig_1', 'in', '2026-11-16T10:00:00Z'),
            msg('local_t1_1', 'out', '2026-11-16T10:00:05Z'),
            msg('ig_2', 'in', '2026-11-16T10:01:00Z'),
        ];
        expect(autopilotCall(conv(), thread, { picked: true, delivery: { local_t1_1: { state: 'sending' } } }))
            .toBe('wait');
    });

    it('answers again once that reply went out', () => {
        const thread = [
            msg('ig_1', 'in', '2026-11-16T10:00:00Z'),
            msg('local_t1_1', 'out', '2026-11-16T10:00:05Z'),
            msg('ig_2', 'in', '2026-11-16T10:01:00Z'),
        ];
        expect(autopilotCall(conv(), thread, { picked: true, delivery: { local_t1_1: { state: 'sent' } } }))
            .toBe('answer');
    });

    it('does not resend for a reply the extension gave up on', () => {
        // NOT_SENT puts the conversation in front of the Operator with the reason;
        // autopilot answering it again would hide that.
        const thread = [msg('ig_1', 'in', '2026-11-16T10:00:00Z'), msg('local_t1_1', 'out', '2026-11-16T10:00:05Z')];
        expect(autopilotCall(conv(), thread, { picked: true, delivery: { local_t1_1: { state: 'failed', reason: 'x' } } }))
            .toBe('skip');
    });

    it('answers a new message that came after a reply that failed', () => {
        const thread = [
            msg('ig_1', 'in', '2026-11-16T10:00:00Z'),
            msg('local_t1_1', 'out', '2026-11-16T10:00:05Z'),
            msg('ig_2', 'in', '2026-11-16T10:05:00Z'),
        ];
        expect(autopilotCall(conv(), thread, { picked: true, delivery: { local_t1_1: { state: 'failed', reason: 'x' } } }))
            .toBe('answer');
    });

    it('skips a closed conversation and one with nothing to answer', () => {
        const thread = [msg('ig_1', 'in', '2026-11-16T10:00:00Z')];
        expect(autopilotCall(conv({ status: 'closed' }), thread, { picked: true, delivery: {} })).toBe('skip');
        expect(autopilotCall(conv({ needsReply: false }), thread, { picked: true, delivery: {} })).toBe('skip');
    });
});

describe('who autopilot is on for', () => {
    it('is nobody until the Operator picks someone', () => {
        expect(isAutopilotPicked({}, 'maya-builds')).toBe(false);
    });

    it('holds a pick by handle, however the handle is written', () => {
        const config = withAutopilotPick({}, '@Maya-Builds', true);
        expect(config.autopilotHandles).toEqual(['maya-builds']);
        expect(isAutopilotPicked(config, 'maya-builds')).toBe(true);
        expect(isAutopilotPicked(config, '@MAYA-BUILDS')).toBe(true);
    });

    it('picks someone once, and lets them go', () => {
        const twice = withAutopilotPick(withAutopilotPick({}, 'maya-builds', true), 'maya-builds', true);
        expect(twice.autopilotHandles).toEqual(['maya-builds']);
        expect(withAutopilotPick(twice, 'maya-builds', false).autopilotHandles).toEqual([]);
    });

    it('leaves the rest of the config as it was', () => {
        const config = { autopilot: true, autopilotHandles: ['sam-fit'] };
        expect(withAutopilotPick(config, 'maya-builds', true)).toEqual({ autopilot: true, autopilotHandles: ['sam-fit', 'maya-builds'] });
    });
});
