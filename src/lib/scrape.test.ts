import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionError, invokeFunction } from './functions';
import { explainEmptyScrape, formatEta, parseQueries, runScrape, ScrapeControl, type ScrapeOutcome, type ScrapeProgress } from './scrape';
import { demoScrape } from './scrapeDemo';

/**
 * The client loop, run against the demo transport — which answers with the
 * `scrape` function's own shapes, paging and error codes. So this exercises
 * the real paging, dedupe, Pause/Finish, enrichment and intake without a network.
 */
vi.mock('./functions', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./functions')>()),
    invokeFunction: vi.fn(),
}));

const invoke = vi.mocked(invokeFunction);
const calls = (op: string) => invoke.mock.calls.filter(([, body]) => body.op === op);

beforeEach(() => {
    invoke.mockReset();
    invoke.mockImplementation(async (_name, body) => demoScrape(body, { delayMs: 0 }));
});

describe('runScrape', () => {
    it('pages until the limit, then loads every profile in full', async () => {
        const out = await runScrape({ kind: 'following', queries: ['competitor'], limit: 120, enrich: true });

        expect(out.leads).toHaveLength(120);
        expect(calls('page')).toHaveLength(3);              // 50 + 50 + 20 of the third page
        expect(calls('enrich')).toHaveLength(12);           // 120 / 10
        expect(out.unenriched).toBe(0);
        expect(out.leads[0]).toMatchObject({ status: 'cold', dmSent: false, replied: false });
        expect(out.leads.every(l => l.bio && l.followers > 0 && l.businessCategory)).toBe(true);
    });

    it('stops paging when the source runs out before the limit', async () => {
        const out = await runScrape({ kind: 'similar', queries: ['client'], limit: 250, enrich: false });
        expect(out.leads).toHaveLength(45);
        expect(calls('page')).toHaveLength(1);
    });

    it('counts a profile found under two queries once — the limit is fresh profiles per query', async () => {
        // The second query's first page is all repeats; it pages on for new people.
        const out = await runScrape({ kind: 'keyword', queries: ['coach', 'coach'], limit: 30, enrich: false });
        expect(out.leads).toHaveLength(60);
        expect(new Set(out.leads.map(l => l.handle)).size).toBe(60);
    });

    it('notes a query that fails on its own and carries on with the rest', async () => {
        const out = await runScrape({ kind: 'followers', queries: ['nobody_here', 'shy_private', 'realone'], limit: 10, enrich: false });
        expect(out.notes).toEqual([
            "There's no Instagram account called @nobody_here.",
            "@shy_private is private — Instagram doesn't show its followers list to anyone.",
        ]);
        expect(out.leads).toHaveLength(10);
    });

    it('stops the whole run on a workspace-wide failure', async () => {
        invoke.mockRejectedValue(new FunctionError('quota spent', { code: 'scrape_quota' }));
        await expect(runScrape({ kind: 'keyword', queries: ['a', 'b'], limit: 10, enrich: true })).rejects.toThrow('quota spent');
        expect(invoke).toHaveBeenCalledTimes(1);
    });

    it('keeps what was found when the lookups run out part-way through the details', async () => {
        // The field report: 63 lookups spent, the 7th details batch refused, and every
        // profile already paid for thrown away with the error.
        invoke.mockImplementation(async (_name, body) => {
            if (body.op === 'enrich' && calls('enrich').length > 6) {
                throw new FunctionError('Lead search is unavailable right now — please contact support.', { code: 'scrape_unavailable' });
            }
            return demoScrape(body, { delayMs: 0 });
        });
        const out = await runScrape({ kind: 'following', queries: ['competitor'], limit: 100, enrich: true });

        expect(out.leads).toHaveLength(100);
        expect(out.halted).toBe('Lead search is unavailable right now — please contact support.');
        expect(out.unenriched).toBe(40);                    // batches 7–10 never loaded
        expect(calls('enrich')).toHaveLength(7);            // nothing spent after the refusal
    });

    it('keeps the earlier pages when a later page fails for the whole run', async () => {
        invoke.mockImplementation(async (_name, body) => {
            if (body.op === 'page' && calls('page').length > 1) {
                throw new FunctionError('busy', { code: 'scrape_busy' });
            }
            return demoScrape(body, { delayMs: 0 });
        });
        const out = await runScrape({ kind: 'keyword', queries: ['coach', 'agency'], limit: 60, enrich: true });

        expect(out.halted).toBe('busy');
        expect(out.leads.length).toBeGreaterThan(0);
        expect(calls('page')).toHaveLength(2);              // the second query is not attempted
        expect(calls('enrich')).toHaveLength(0);            // a halted run spends nothing more
    });

    it('Finish while collecting stops paging and still loads details for what was found', async () => {
        const control = new ScrapeControl();
        invoke.mockImplementation(async (_name, body) => {
            if (body.op === 'page') control.finish();       // "these are enough" after the first page
            return demoScrape(body, { delayMs: 0 });
        });
        const out = await runScrape({ kind: 'hashtag', queries: ['smma'], limit: 200, enrich: true }, undefined, control);

        expect(out.stopped).toBe(true);
        expect(out.leads).toHaveLength(24);                 // one page
        expect(calls('page')).toHaveLength(1);
        expect(calls('enrich')).toHaveLength(3);            // 24 → 10 + 10 + 4
        expect(out.unenriched).toBe(0);
    });

    it('Finish while loading details skips the rest of them and keeps the profiles', async () => {
        const control = new ScrapeControl();
        invoke.mockImplementation(async (_name, body) => {
            if (body.op === 'enrich') control.finish();
            return demoScrape(body, { delayMs: 0 });
        });
        const out = await runScrape({ kind: 'hashtag', queries: ['smma'], limit: 48, enrich: true }, undefined, control);

        expect(out.leads).toHaveLength(48);
        expect(calls('enrich')).toHaveLength(1);
        expect(out.unenriched).toBe(38);
    });

    it('Pause spends nothing until Resume, then carries on from the same cursor', async () => {
        const control = new ScrapeControl();
        const phases: string[] = [];
        invoke.mockImplementation(async (_name, body) => {
            if (body.op === 'page' && calls('page').length === 2) control.pause();
            return demoScrape(body, { delayMs: 0 });
        });
        const run = runScrape(
            { kind: 'following', queries: ['competitor'], limit: 2000, enrich: false },
            p => phases.push(p.phase),
            control,
        );

        await vi.waitFor(() => expect(phases).toContain('paused'));
        await new Promise(r => setTimeout(r, 20));
        expect(calls('page')).toHaveLength(2);              // held — nothing spent while paused

        control.resume();
        const out = await run;
        expect(out.leads).toHaveLength(180);                // the whole list, no repeats
        expect(new Set(calls('page').map(([, b]) => b.cursor)).size).toBe(4);
        expect(out.stopped).toBe(false);
    });

    it('Finish while paused ends collection with what was found', async () => {
        const control = new ScrapeControl();
        const phases: string[] = [];
        invoke.mockImplementation(async (_name, body) => {
            if (body.op === 'page') control.pause();
            return demoScrape(body, { delayMs: 0 });
        });
        const run = runScrape({ kind: 'following', queries: ['competitor'], limit: 2000, enrich: false }, p => phases.push(p.phase), control);
        await vi.waitFor(() => expect(phases).toContain('paused'));
        control.finish();

        const out = await run;
        expect(out.leads).toHaveLength(50);
        expect(out.stopped).toBe(true);
    });

    it('scrapes all of a post’s comments on "everything", with a time estimate from the comment count', async () => {
        const seen: ScrapeProgress[] = [];
        const out = await runScrape({ kind: 'commenters', queries: ['https://www.instagram.com/p/ABCdef123/'], limit: 2000, enrich: false }, p => seen.push(p));

        expect(out.leads).toHaveLength(200);                // 14 pages of 15 — well past the old 30-page and 250 caps' reach
        const mid = seen.find(p => p.phase === 'collecting' && p.found > 0)!;
        expect(mid.etaSeconds).toBeGreaterThan(0);
        expect(mid.percent).toBeGreaterThan(0);
        expect(mid.message).toContain('of 200 comments read');
    });

    it('has no estimate for a source that never says how big it is', async () => {
        const seen: ScrapeProgress[] = [];
        await runScrape({ kind: 'hashtag', queries: ['smma'], limit: 2000, enrich: false }, p => seen.push(p));
        const mid = seen.filter(p => p.phase === 'collecting' && p.found > 0 && p.percent !== 100);
        expect(mid.length).toBeGreaterThan(0);
        expect(mid.every(p => p.etaSeconds === undefined && p.percent === undefined)).toBe(true);
    });

    it('stops a query whose cursor comes back twice instead of paging it forever', async () => {
        invoke.mockImplementation(async (_name, body) => {
            const page = await demoScrape(body, { delayMs: 0 }) as Record<string, unknown>;
            return { ...page, cursor: '{"p":"1"}' };        // the same "next page" every time
        });
        await runScrape({ kind: 'hashtag', queries: ['smma'], limit: 2000, enrich: false });
        expect(calls('page')).toHaveLength(2);
    });

    it('skips the details lookups when enrichment is off', async () => {
        const out = await runScrape({ kind: 'location', queries: ['miami'], limit: 24, enrich: false });
        expect(calls('enrich')).toHaveLength(0);
        expect(out.leads.every(l => l.followers === 0 && !l.bio)).toBe(true);
    });

    it('looks up a handle list ten at a time, in full, and names the ones not found', async () => {
        const handles = [...Array.from({ length: 11 }, (_, i) => `person${i}`), 'nobody_x'];
        const out = await runScrape({ kind: 'profiles', queries: handles, limit: 1, enrich: true });

        expect(calls('page')).toHaveLength(2);
        expect(calls('enrich')).toHaveLength(0);            // already full
        expect(out.leads).toHaveLength(11);
        expect(out.notes).toEqual(['Not on Instagram: @nobody_x.']);
    });

    it('reports progress up to 100%', async () => {
        const seen: number[] = [];
        await runScrape({ kind: 'keyword', queries: ['agency'], limit: 60, enrich: true }, p => seen.push(p.percent ?? -1));
        expect(seen[seen.length - 1]).toBe(100);
        expect(seen.slice(0, -1).every(p => p < 100)).toBe(true);
        expect([...seen].sort((a, b) => a - b)).toEqual(seen);
    });
});

describe('demo data', () => {
    it('never produces a handle a real Instagram account could have', async () => {
        const out = await runScrape({ kind: 'profiles', queries: ['garyvee', 'jane.coaching'], limit: 1, enrich: false });
        const scraped = await runScrape({ kind: 'followers', queries: ['garyvee'], limit: 50, enrich: false });
        // Instagram usernames are [a-z0-9._] only, so a hyphen rules out every real account.
        expect([...out.leads, ...scraped.leads].every(l => l.handle.includes('-'))).toBe(true);
    });
});

describe('formatEta', () => {
    it('rounds to what a person would say', () => {
        expect(formatEta(20)).toBe('under a minute');
        expect(formatEta(250)).toBe('about 4 min');
        expect(formatEta(3600 + 25 * 60)).toBe('about 1 h 25 min');
    });
});

describe('parseQueries', () => {
    it('splits on commas and newlines, and handles on spaces too', () => {
        expect(parseQueries('location', 'New York, Miami\nLondon, Miami')).toEqual(['New York', 'Miami', 'London']);
        expect(parseQueries('profiles', 'a b,c\nd')).toEqual(['a', 'b', 'c', 'd']);
    });
});

describe('explainEmptyScrape', () => {
    const outcome = (over: Partial<ScrapeOutcome> = {}): ScrapeOutcome => ({
        leads: [], received: 0, skipped: 0, notes: [], stopped: false, unenriched: 0, ...over,
    });

    it("repeats each query's own reason rather than inventing one", () => {
        const msg = explainEmptyScrape(outcome({ notes: ['@x is private.'] }), 'Try another.');
        expect(msg).toBe('@x is private. Try another.');
    });

    it('says plainly when the source had nothing', () => {
        expect(explainEmptyScrape(outcome(), 'Try another.')).toBe('Instagram returned no profiles for this search. Try another.');
    });

    it('blames the output format when rows arrived but none mapped', () => {
        const msg = explainEmptyScrape(outcome({ received: 40, skipped: 40 }), 'Try another.');
        expect(msg).toContain('40 profiles');
        expect(msg).toContain('output format');
        expect(msg).not.toContain('private');
    });
});
