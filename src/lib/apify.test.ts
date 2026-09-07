import { describe, expect, it } from 'vitest';
import { explainEmptyScrape, ScrapeOutcome } from './apify';

const outcome = (over: Partial<ScrapeOutcome> = {}): ScrapeOutcome => ({
    leads: [],
    received: 0,
    skipped: 0,
    runId: 'abcdef1234567890',
    ...over,
});

describe('explainEmptyScrape', () => {
    it('names the run, so the empty result can be looked up', () => {
        expect(explainEmptyScrape(outcome(), 'Try again.')).toContain('abcdef12');
    });

    it('repeats the run\'s own reason rather than inventing one', () => {
        const msg = explainEmptyScrape(outcome({ note: 'Account is private' }), 'Try again.');
        expect(msg).toContain('Account is private');
        expect(msg).toContain('finished without returning a single row');
    });

    it('blames the output format when rows arrived but none mapped', () => {
        const msg = explainEmptyScrape(outcome({ received: 40, skipped: 40 }), 'Try again.');
        expect(msg).toContain('40 rows');
        expect(msg).toContain('output format');
        // The account is not implicated: nothing here is evidence about it.
        expect(msg).not.toContain('private');
    });

    it('does not assert a reason the run did not give', () => {
        expect(explainEmptyScrape(outcome(), 'Try again.')).not.toContain('reported');
    });
});
