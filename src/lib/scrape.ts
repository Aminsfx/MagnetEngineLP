import { Lead } from './types';
import { FunctionError, invokeFunction } from './functions';
import { intake } from './intake';
import {
    ENRICH_BATCH,
    FOLLOWERS_VISIBLE,
    MAX_PER_QUERY,
    type ProfileRow,
    type SourceKind,
} from '../../supabase/functions/_shared/hiker.ts';

/**
 * Instagram lead scraping.
 *
 * The provider key lives ONLY in Supabase secrets. The browser calls the
 * `scrape` Edge Function one page at a time and owns the loop: that keeps each
 * call short, gives the progress bar real numbers, and makes Pause stop the
 * spending at once — every call is a billed lookup.
 *
 * The source kinds, the per-query cap and the batch size are imported from the
 * server's own module, so the two sides cannot disagree about them.
 */

export type { SourceKind };
export { MAX_PER_QUERY, FOLLOWERS_VISIBLE };

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
    /** Profiles to collect per query, ≤ MAX_PER_QUERY (which means "everything"). Ignored for `profiles`. */
    limit: number;
    /** Look up bio + follower count for the rows a list endpoint leaves short. */
    enrich: boolean;
}

export type ScrapePhase = 'collecting' | 'details' | 'paused';

export interface ScrapeProgress {
    message: string;
    /** 0–100, or undefined when the source never says how much it holds (a hashtag, a search). */
    percent?: number;
    phase: ScrapePhase;
    /** Unique profiles found so far. */
    found: number;
    /** Seconds until the run is done, from this run's own measured pace. Undefined when it can't be known. */
    etaSeconds?: number;
}

/**
 * The Operator's hand on a running scrape.
 *
 * - `pause()` holds the run after the call in flight. Nothing more is spent
 *   while paused, and everything found so far is kept.
 * - `resume()` carries on from exactly where it stopped — the cursors are kept.
 * - `finish()` means "these are enough". While collecting, the run stops
 *   paging and loads details for what it has; while loading details, it skips
 *   the rest of them.
 *
 * The loop only reads it between calls, so a press never throws away a lookup
 * that was already paid for.
 */
export class ScrapeControl {
    private state: 'running' | 'paused' | 'finishing' = 'running';
    private wake: ((carryOn: boolean) => void) | null = null;

    pause() {
        if (this.state === 'running') this.state = 'paused';
    }

    resume() {
        if (this.state !== 'paused') return;
        this.state = 'running';
        this.release(true);
    }

    finish() {
        this.state = 'finishing';
        this.release(false);
    }

    /** Between calls: true to carry on, false to end this phase. Holds while paused. */
    async checkpoint(onPause: () => void): Promise<boolean> {
        if (this.state === 'running') return true;
        if (this.state === 'finishing') return false;
        onPause();
        return new Promise<boolean>(resolve => { this.wake = resolve; });
    }

    /** A finish ends the phase it was pressed in, not the one after it. */
    nextPhase() {
        if (this.state === 'finishing') this.state = 'running';
    }

    private release(carryOn: boolean) {
        const wake = this.wake;
        this.wake = null;
        wake?.(carryOn);
    }
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
    /** The Operator finished early; `leads` is what was found until then. */
    stopped: boolean;
    /**
     * A failure that ended the whole run after something was found — the
     * lookups ran out, the service went busy. `leads` is what was found before
     * it: those lookups are already paid for. With nothing found, the run
     * throws instead.
     */
    halted?: string;
    /** Profiles whose details lookup failed or was skipped — kept with what the list gave. */
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
    /** Items the whole source holds, when Instagram says. */
    total?: number;
    /** Items this page covered, in the same unit as `total`. */
    items?: number;
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

/**
 * A safety net against a cursor that never runs out. Comment pages can be
 * small — a handful of threads each — and the old ceiling of 30 ended a busy
 * post's comments part-way. MAX_PER_QUERY and the month's lookups are the
 * limits that matter.
 */
const MAX_PAGES_PER_QUERY = 400;

/**
 * Pages in a row that add nothing new before a query is called exhausted. A
 * post's comment pages can be all repeats for a stretch — the same few people
 * replying to each other — so this is generous; the page and lookup ceilings
 * still bound it.
 */
const MAX_DRY_PAGES = 6;

/** Until a details batch has been timed, assume this long per batch. */
const ENRICH_BATCH_MS_GUESS = 3000;

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

/** "about 4 min", "under a minute" — for the progress line. */
export function formatEta(seconds: number): string {
    if (seconds < 50) return 'under a minute';
    const min = Math.round(seconds / 60);
    if (min < 60) return `about ${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `about ${h} h${m ? ` ${m} min` : ''}`;
}

/** Per query: what it holds, how far through it the run is, and what it gave. */
interface QueryState {
    total?: number;
    read: number;
    found: number;
    done: boolean;
}

export async function runScrape(
    req: ScrapeRequest,
    onProgress?: (p: ScrapeProgress) => void,
    control: ScrapeControl = new ScrapeControl(),
): Promise<ScrapeOutcome> {
    const campaignId = crypto.randomUUID();
    const limit = Math.max(1, Math.min(MAX_PER_QUERY, req.limit));
    const isList = req.kind === 'profiles';
    const queries = isList ? chunk(req.queries, ENRICH_BATCH).map(c => c.join(',')) : req.queries;

    // Keyed by lowercased username: a profile turning up under two search
    // terms, or twice across pages, is one Lead.
    const rows = new Map<string, ProfileRow>();
    const complete = new Set<string>();
    const notes: string[] = [];
    const state: QueryState[] = queries.map(() => ({ read: 0, found: 0, done: false }));
    let lookupsLeft: number | undefined;
    let stopped = false;
    let halted: string | undefined;

    // Time spent waiting on calls, not on the Operator: a pause must not make
    // the run look slower than it is.
    let collectMs = 0;
    let enrichMs = 0;
    let enrichBatches = 0;
    const timed = async <T,>(fn: () => Promise<T>, add: (ms: number) => void): Promise<T> => {
        const t0 = Date.now();
        try { return await fn(); } finally { add(Date.now() - t0); }
    };

    // A run-wide failure ends the run, but never costs the rows already paid for.
    const halt = (e: unknown) => {
        if (rows.size === 0) throw e;
        halted = e instanceof Error ? e.message : 'Lead search stopped unexpectedly.';
    };

    const enriching = req.enrich && !isList;
    const collectShare = enriching ? 70 : 98;
    const shortCount = () => [...rows.keys()].filter(k => !complete.has(k)).length;
    const batchMs = () => (enrichBatches ? enrichMs / enrichBatches : ENRICH_BATCH_MS_GUESS);

    /**
     * How much of the source is left to read, in items — or undefined when a
     * query that isn't finished never said how big it is. A query not started
     * yet is assumed to be the size of the ones that did say.
     */
    const itemsLeft = (): { left: number; read: number } | undefined => {
        if (isList) {
            const done = state.filter(q => q.done).length;
            return { left: (queries.length - done) * ENRICH_BATCH, read: done * ENRICH_BATCH };
        }
        const known = state.filter(q => q.total !== undefined);
        const avg = known.length ? known.reduce((n, q) => n + (q.total ?? 0), 0) / known.length : undefined;
        let left = 0;
        let read = 0;
        for (const q of state) {
            read += q.read;
            if (q.done) continue;
            const total = q.total ?? (q.read === 0 ? avg : undefined);
            if (total === undefined) return undefined;
            let rest = Math.max(0, total - q.read);
            // A limit below "everything" ends the query before the source does.
            if (limit < MAX_PER_QUERY) {
                const perProfile = q.found > 0 ? q.read / q.found : 1;
                rest = Math.min(rest, Math.max(0, limit - q.found) * perProfile);
            }
            left += rest;
        }
        return { left, read };
    };

    const report = (phase: ScrapePhase, message: string) => {
        const found = rows.size;
        let percent: number | undefined;
        let etaSeconds: number | undefined;

        if (phase === 'details') {
            const short = shortCount();
            percent = collectShare + (found ? (found - short) / found : 1) * (99 - collectShare);
            etaSeconds = (Math.ceil(short / ENRICH_BATCH) * batchMs()) / 1000;
        } else {
            const est = itemsLeft();
            if (est) {
                const all = est.read + est.left;
                percent = 1 + (all ? est.read / all : 1) * (collectShare - 1);
                const rate = collectMs > 0 ? est.read / collectMs : 0;   // items per ms
                if (rate > 0) {
                    // Details still to load: the share of rows so far that came
                    // back short, applied to everything still to come.
                    const shortShare = found ? shortCount() / found : 1;
                    const coming = est.read ? (est.left * found) / est.read : 0;
                    const detailsMs = enriching
                        ? Math.ceil(((found + coming) * shortShare) / ENRICH_BATCH) * batchMs()
                        : 0;
                    etaSeconds = (est.left / rate + detailsMs) / 1000;
                }
            } else if (limit < MAX_PER_QUERY && !isList) {
                percent = 1 + (found / (queries.length * limit)) * (collectShare - 1);
            }
        }

        onProgress?.({
            message,
            phase,
            found,
            percent: percent === undefined ? undefined : Math.round(Math.min(99, percent)),
            etaSeconds: etaSeconds === undefined ? undefined : Math.max(1, Math.round(etaSeconds)),
        });
    };

    const onPause = () => report('paused', `Paused — ${rows.size} profile${rows.size !== 1 ? 's' : ''} found so far.`);

    report('collecting', 'Starting…');

    collect: for (const [qi, query] of queries.entries()) {
        const q = state[qi];
        let cursor: string | null = null;
        let pages = 0;
        let dry = 0;
        const seenCursors = new Set<string>();
        const of = queries.length > 1 && !isList ? ` (${qi + 1} of ${queries.length})` : '';

        do {
            if (!await control.checkpoint(onPause)) {
                stopped = true;
                break collect;
            }

            let page: PageResponse;
            try {
                page = await timed(
                    () => callScrape<PageResponse>({ op: 'page', source: { kind: req.kind, query }, cursor }),
                    ms => { collectMs += ms; },
                );
            } catch (e) {
                if (e instanceof FunctionError && e.code && PER_QUERY.has(e.code)) {
                    notes.push(e.message);
                    break;
                }
                halt(e);
                break;
            }
            lookupsLeft = page.limit - page.used;
            if (page.total !== undefined) q.total = page.total;
            q.read += page.items ?? page.rows.length;

            let fresh = 0;
            for (const row of page.rows) {
                if (!isList && q.found >= limit) break;
                const key = row.username.toLowerCase();
                if (rows.has(key)) continue;
                rows.set(key, row);
                if (page.complete) complete.add(key);
                fresh++;
                q.found++;
            }
            if (page.missing?.length) {
                notes.push(`Not on Instagram: ${page.missing.map(h => `@${h}`).join(', ')}.`);
            }

            dry = fresh === 0 ? dry + 1 : 0;
            // A cursor handed back twice would page the same results forever.
            cursor = page.cursor && !seenCursors.has(page.cursor) ? page.cursor : null;
            if (cursor) seenCursors.add(cursor);
            pages++;

            const where = page.target ? ` from ${page.target}` : '';
            const read = q.total !== undefined && req.kind === 'commenters'
                ? ` — ${Math.min(q.read, q.total)} of ${q.total} comments read`
                : '';
            report('collecting', `Found ${rows.size} profile${rows.size !== 1 ? 's' : ''}${where}${read}${of}…`);
        } while (cursor && (isList || q.found < limit) && pages < MAX_PAGES_PER_QUERY && dry < MAX_DRY_PAGES);

        q.done = true;
        if (halted) break;
    }

    // Profile details: one lookup per short row, a batch per call. Finishing
    // early still loads them — "these are enough" means enough to DM.
    control.nextPhase();
    const short = [...rows.entries()].filter(([key, row]) => !complete.has(key) && row.pk);
    if (req.enrich && !halted && short.length > 0) {
        const byPk = new Map(short.map(([key, row]) => [row.pk, key]));
        let done = 0;
        for (const batch of chunk(short, ENRICH_BATCH)) {
            if (!await control.checkpoint(onPause)) { stopped = true; break; }
            report('details', `Loading profile details — ${done} of ${short.length}…`);

            let res: EnrichResponse;
            try {
                res = await timed(
                    () => callScrape<EnrichResponse>({ op: 'enrich', ids: batch.map(([, row]) => row.pk) }),
                    ms => { enrichMs += ms; enrichBatches++; },
                );
            } catch (e) {
                halt(e);
                break;
            }
            lookupsLeft = res.limit - res.used;
            for (const full of res.rows) {
                const key = byPk.get(full.pk) ?? full.username.toLowerCase();
                rows.set(key, { ...rows.get(key), ...full });
                complete.add(key);
            }
            done += batch.length;
        }
    }
    const unenriched = enriching ? [...rows.keys()].filter(k => !complete.has(k)).length : 0;

    const { leads, skipped } = intake({ source: 'scrape', rows: [...rows.values()] as unknown as Record<string, unknown>[], campaignId });
    onProgress?.({
        message: `Done — ${leads.length} profile${leads.length !== 1 ? 's' : ''}${stopped || halted ? ' (finished early)' : ''}.`,
        phase: 'collecting',
        found: rows.size,
        percent: 100,
        etaSeconds: 0,
    });
    return { leads, received: rows.size, skipped, notes, stopped, halted, unenriched, lookupsLeft };
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
