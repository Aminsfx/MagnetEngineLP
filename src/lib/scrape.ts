import { Lead } from './types';
import { FunctionError, invokeFunction } from './functions';
import { intake } from './intake';
import {
    ENRICH_BATCH,
    MAX_PER_QUERY,
    type ProfileRow,
    type SourceKind,
} from '../../supabase/functions/_shared/hiker.ts';

/**
 * Instagram lead scraping.
 *
 * The provider key lives ONLY in Supabase secrets. The browser calls the
 * `scrape` Edge Function one page at a time and owns the loop: that keeps each
 * call short, gives the progress bar real numbers, and makes Stop stop the
 * spending at once — every call is a billed lookup.
 *
 * The source kinds, the per-query cap and the batch size are imported from the
 * server's own module, so the two sides cannot disagree about them.
 */

export type { SourceKind };
export { MAX_PER_QUERY };

/**
 * Demo mode (`npm run demo`): the scrape step answers from generated sample
 * profiles instead of the Edge Function, so the Campaign Builder can be tried
 * without a HikerAPI key. Everything after it — queue, DM generation — is real.
 */
export const SCRAPE_DEMO = import.meta.env.VITE_SCRAPE_DEMO === 'true';

async function callScrape<T>(body: Record<string, unknown>): Promise<T> {
    if (SCRAPE_DEMO) {
        const { demoScrape } = await import('./scrapeDemo');
        return demoScrape(body) as Promise<T>;
    }
    return invokeFunction<T>('scrape', body);
}

export interface ScrapeRequest {
    kind: SourceKind;
    /** One per search term, hashtag, account, post link or place. For `profiles`: the handles. */
    queries: string[];
    /** Profiles to collect per query, ≤ MAX_PER_QUERY. Ignored for `profiles`. */
    limit: number;
    /** Look up bio + follower count for the rows a list endpoint leaves short. */
    enrich: boolean;
}

export interface ScrapeProgress {
    message: string;
    percent: number;
}

/**
 * What a scrape actually produced.
 *
 * `leads` alone cannot explain an empty result. `notes` carries each query's
 * own reason for coming back short — the account is private, the post is
 * gone, the place matched nothing — in the server's words, so an empty
 * scrape is explained by evidence rather than a guess.
 */
export interface ScrapeOutcome {
    leads: Lead[];
    /** Unique profiles the source returned, before intake. */
    received: number;
    /** Rows intake dropped: no usable handle. */
    skipped: number;
    /** Per-query problems that did not stop the run. */
    notes: string[];
    /** The Operator pressed Stop; `leads` is what was found until then. */
    stopped: boolean;
    /** Profiles whose details lookup failed — kept with what the list gave. */
    unenriched: number;
    /** This month's remaining lookups, as of the last call. */
    lookupsLeft?: number;
}

interface PageResponse {
    rows: ProfileRow[];
    complete: boolean;
    cursor: string | null;
    target?: string;
    missing?: string[];
    used: number;
    limit: number;
}

interface EnrichResponse {
    rows: ProfileRow[];
    used: number;
    limit: number;
}

/** Codes that are about one query, not the run: note them and move on. */
const PER_QUERY = new Set(['not_found', 'private_target', 'bad_source']);

/** A safety net against a cursor that never runs out. */
const MAX_PAGES_PER_QUERY = 30;

/** Pages in a row that add nothing new before a query is called exhausted. */
const MAX_DRY_PAGES = 2;

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/** Split what the Operator typed into queries: commas and newlines, and for handles, spaces too. */
export function parseQueries(kind: SourceKind, raw: string): string[] {
    const parts = raw.split(kind === 'profiles' ? /[\s,]+/ : /[,\n]/).map(s => s.trim()).filter(Boolean);
    return [...new Set(parts)];
}

export async function runScrape(
    req: ScrapeRequest,
    onProgress?: (p: ScrapeProgress) => void,
    shouldStop: () => boolean = () => false,
): Promise<ScrapeOutcome> {
    const campaignId = crypto.randomUUID();
    const limit = Math.max(1, Math.min(MAX_PER_QUERY, req.limit));
    const isList = req.kind === 'profiles';
    const queries = isList ? chunk(req.queries, ENRICH_BATCH).map(c => c.join(',')) : req.queries;
    const target = isList ? req.queries.length : queries.length * limit;

    // Keyed by lowercased username: a profile turning up under two search
    // terms, or twice across pages, is one Lead.
    const rows = new Map<string, ProfileRow>();
    const complete = new Set<string>();
    const notes: string[] = [];
    let lookupsLeft: number | undefined;
    let stopped = false;

    const collectShare = req.enrich && !isList ? 55 : 95;
    const report = (message: string, percent: number) =>
        onProgress?.({ message, percent: Math.round(Math.min(99, percent)) });

    report('Starting…', 2);

    for (const [qi, query] of queries.entries()) {
        let cursor: string | null = null;
        let fromQuery = 0;
        let pages = 0;
        let dry = 0;
        const of = queries.length > 1 && !isList ? ` (${qi + 1} of ${queries.length})` : '';

        do {
            if (shouldStop()) { stopped = true; break; }

            let page: PageResponse;
            try {
                page = await callScrape<PageResponse>({
                    op: 'page',
                    source: { kind: req.kind, query },
                    cursor,
                });
            } catch (e) {
                if (e instanceof FunctionError && e.code && PER_QUERY.has(e.code)) {
                    notes.push(e.message);
                    break;
                }
                throw e;
            }
            lookupsLeft = page.limit - page.used;

            let fresh = 0;
            for (const row of page.rows) {
                if (!isList && fromQuery >= limit) break;
                const key = row.username.toLowerCase();
                if (rows.has(key)) continue;
                rows.set(key, row);
                if (page.complete) complete.add(key);
                fresh++;
                fromQuery++;
            }
            if (page.missing?.length) {
                notes.push(`Not on Instagram: ${page.missing.map(h => `@${h}`).join(', ')}.`);
            }

            dry = fresh === 0 ? dry + 1 : 0;
            cursor = page.cursor;
            pages++;

            const where = page.target ? ` from ${page.target}` : '';
            report(
                `Found ${rows.size} of up to ${target} profiles${where}${of}…`,
                2 + (rows.size / target) * (collectShare - 2),
            );
        } while (cursor && (isList || fromQuery < limit) && pages < MAX_PAGES_PER_QUERY && dry < MAX_DRY_PAGES);

        if (stopped) break;
    }

    // Profile details: one lookup per short row, a batch per call.
    const short = [...rows.entries()].filter(([key, row]) => !complete.has(key) && row.pk);
    if (req.enrich && !stopped && short.length > 0) {
        const byPk = new Map(short.map(([key, row]) => [row.pk, key]));
        let done = 0;
        for (const batch of chunk(short, ENRICH_BATCH)) {
            if (shouldStop()) { stopped = true; break; }
            report(`Loading profile details — ${done} of ${short.length}…`, collectShare + (done / short.length) * (98 - collectShare));

            const res = await callScrape<EnrichResponse>({
                op: 'enrich',
                ids: batch.map(([, row]) => row.pk),
            });
            lookupsLeft = res.limit - res.used;
            for (const full of res.rows) {
                const key = byPk.get(full.pk) ?? full.username.toLowerCase();
                rows.set(key, { ...rows.get(key), ...full });
                complete.add(key);
            }
            done += batch.length;
        }
    }
    const unenriched = req.enrich && !isList ? [...rows.keys()].filter(k => !complete.has(k)).length : 0;

    const { leads, skipped } = intake({ source: 'scrape', rows: [...rows.values()] as unknown as Record<string, unknown>[], campaignId });
    onProgress?.({ message: `Done — ${leads.length} profile${leads.length !== 1 ? 's' : ''}${stopped ? ' (stopped early)' : ''}.`, percent: 100 });
    return { leads, received: rows.size, skipped, notes, stopped, unenriched, lookupsLeft };
}

/**
 * Say why a scrape came back empty, from what actually happened. The notes
 * are each query's own reason; when there are none, the source simply had
 * nothing, and the hint says what to try instead.
 */
export function explainEmptyScrape(outcome: ScrapeOutcome, hint: string): string {
    const notes = outcome.notes.join(' ');
    if (outcome.received === 0) {
        return notes ? `${notes} ${hint}` : `Instagram returned no profiles for this search. ${hint}`;
    }
    return `${outcome.received} profile${outcome.received !== 1 ? 's' : ''} came back, but none had a usable `
        + `username (${outcome.skipped} skipped). That points at the lookup's output format changing, not at your search.`;
}
