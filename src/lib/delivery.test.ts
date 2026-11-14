import { describe, it, expect } from 'vitest';
import { replyStatus } from './delivery';
import type { Message } from './types';

const reply = (id: string): Message => ({
    id, conversationId: 't1', direction: 'out', text: 'Tuesday works', createdAt: '2026-11-14T10:00:00Z',
});

// The regression: every reply the app handed to the extension was drawn like a
// message Instagram had, the moment it was handed over. A reply held behind a
// paused campaign, or one the extension gave up on, read as sent.
describe('what a reply in the Inbox says about itself', () => {
    it("says nothing once it is Instagram's own copy", () => {
        expect(replyStatus(reply('ig_1'), { state: 'sending' })).toBeNull();
    });

    it('is sending while the extension has it', () => {
        expect(replyStatus(reply('local_t1_1'), { state: 'sending' })).toEqual({ state: 'sending' });
    });

    it('is sent on the extension\'s word, before Instagram\'s copy is read', () => {
        expect(replyStatus(reply('local_t1_1'), { state: 'sent' })).toEqual({ state: 'sent' });
    });

    it('says why it was not sent', () => {
        expect(replyStatus(reply('local_t1_1'), { state: 'failed', reason: 'no Message button.' }))
            .toEqual({ state: 'failed', reason: 'no Message button.' });
    });

    it('is not on Instagram yet when nobody has said what happened to it', () => {
        expect(replyStatus(reply('local_t1_1'), undefined)).toEqual({ state: 'unconfirmed' });
    });

    it('is never about a message from them', () => {
        expect(replyStatus({ ...reply('local_t1_1'), direction: 'in' }, undefined)).toBeNull();
    });
});
