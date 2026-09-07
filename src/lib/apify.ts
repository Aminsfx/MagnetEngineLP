import { Lead } from './types';
import { invokeFunction } from './functions';
import { intake } from './intake';

/**
 * Instagram scraping.
 *
 * The APIFY_API_KEY lives ONLY in Supabase secrets. The browser never talks to
 * api.apify.com directly — it calls two backend Edge Functions:
 *   - `start-scrape` starts an Apify run and returns a runId
 *   - `poll-scrape`  reports run status and returns the dataset when finished
 * This module keeps the same public API (runApifyScrape / runFollowersScrape),
 * progress messages, poll cadence, and Lead mapping as before; only the network
 * calls changed from direct-Apify to backend proxies.
 */

/**
 * Exact input schema for apify~instagram-search-scraper:
 *   search      — comma-separated search terms
 *   searchType  — "user" | "hashtag" | "place"
 *   searchLimit — 1–250 (max per search term, hard cap by actor)
 *   enhanceUserSearchWithFacebookPage — bool (enriches top 10 user results with FB page + email)
 */
export interface SearchParams {
    search: string;                         // comma-separated terms
    searchType: 'user' | 'hashtag' | 'place';
    searchLimit: number;                    // 1–250
    enhanceUserSearchWithFacebookPage: boolean;
}

// ─── Followers / Following scraper ───────────────────────────────────────────
export interface FollowersParams {
    usernames: string[];            // Instagram handles to scrape from
    type: 'followers' | 'following';
    maxItem: number;                // per username
    profileEnriched: boolean;       // true = fetch full bio + follower counts
}

/**
 * What a scrape actually produced.
 *
 * `leads` alone cannot explain an empty result, and the three causes need
 * different actions: Apify returned nothing (the account is private, or
 * Instagram served no list), Apify returned rows we could not map (the actor's
 * output format moved), or every row was a duplicate. The old code returned
 * `Lead[]`, so the caller had to guess — and it guessed "the account may be
 * private", which is only ever one of the three.
 */
export interface ScrapeOutcome {
    leads: Lead[];
    /** Rows Apify returned, before mapping. */
    received: number;
    /** Rows dropped: no usable handle, or a repeat within this batch. */
    skipped: number;
    /** The Apify run — the only handle on the log that says what happened. */
    runId: string;
    /** The run's own last word (`statusMessage`), when it left one. */
    note?: string;
}

/**
 * Say which of the empty-scrape causes actually happened.
 *
 * This used to be a single sentence blaming the target account ("may be
 * private or have no followers"), asserted without evidence: the run's row
 * count was computed one line earlier and thrown away, and the run's own
 * status message never left the Edge Function at all. The causes need
 * different actions and only one of them is the account's fault, so an
 * Operator chasing an undeployed backend was being told to go and check
 * whether a public profile was private.
 */
export function explainEmptyScrape(outcome: ScrapeOutcome, hint: string): string {
    const run = `Apify run ${outcome.runId.slice(0, 8)}`;
    const note = outcome.note ? ` The run reported: “${outcome.note}”.` : '';

    if (outcome.received === 0) {
        return `${run} finished without returning a single row.${note} ${hint}`;
    }
    return `${run} returned ${outcome.received} row${outcome.received !== 1 ? 's' : ''}, but none could be `
        + `read as a profile (${outcome.skipped} skipped — no usable username, or duplicates). That points at `
        + `the scraper's output format changing rather than anything being wrong with your search.${note}`;
}

// ─── Shared polling loop (calls the poll-scrape backend proxy) ────────────────
interface PollResult { status: string; statusMessage?: string; items?: Record<string, any>[] }

/** The dataset, plus whatever the run said about itself on the way out. */
interface PollOutcome { items: Record<string, any>[]; note?: string }

async function pollForItems(
    runId: string,
    maxPolls: number,
    label: string,
    onProgress?: (message: string) => void,
): Promise<PollOutcome> {
    let poll = 0;
    while (poll < maxPolls) {
        await new Promise(r => setTimeout(r, 5000));
        poll++;

        let result: PollResult;
        try {
            result = await invokeFunction<PollResult>('poll-scrape', { runId });
        } catch {
            continue; // transient — keep polling
        }

        const status = result.status ?? 'RUNNING';
        onProgress?.(`${poll * 5}s · ${status}`);

        if (status === 'SUCCEEDED') {
            onProgress?.('Fetching results…');
            return { items: result.items ?? [], note: result.statusMessage };
        }
        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
            throw new Error(`Apify run ${status.toLowerCase()} after ${poll * 5}s.`);
        }
    }
    throw new Error(`${label} timed out after ${(maxPolls * 5) / 60} minutes.`);
}

export async function runFollowersScrape(
    params: FollowersParams,
    onProgress?: (message: string) => void,
): Promise<ScrapeOutcome> {
    const campaignId = crypto.randomUUID();

    onProgress?.('Connecting to Apify…');

    const { runId } = await invokeFunction<{ runId: string }>('start-scrape', {
        mode: 'followers',
        usernames: params.usernames,
        type: params.type,
        maxItem: params.maxItem,
        profileEnriched: params.profileEnriched,
    });
    if (!runId) throw new Error('No run ID returned — check server configuration.');

    onProgress?.(`Run started (${runId.slice(0, 8)}…) — scraping ${params.type}…`);

    const { items, note } = await pollForItems(runId, 60, 'Scrape', onProgress);
    onProgress?.(`Mapping ${items.length} profiles…`);
    const { leads, skipped } = intake({ source: 'followers', rows: items, campaignId });
    onProgress?.(`Done — ${leads.length} profiles scraped.`);
    return { leads, received: items.length, skipped, runId, note };
}

// ─── Keyword search scraper ───────────────────────────────────────────────────
/**
 * Start an async Apify run (via backend), poll for completion, return mapped leads.
 * Polling interval: 5 s. Timeout: 4 min (48 polls).
 */
export async function runApifyScrape(
    params: SearchParams,
    onProgress?: (message: string) => void,
): Promise<ScrapeOutcome> {
    const campaignId = crypto.randomUUID();
    const searchLimit = Math.max(1, Math.min(250, params.searchLimit));

    onProgress?.('Connecting to Apify…');

    const { runId } = await invokeFunction<{ runId: string }>('start-scrape', {
        mode: 'keyword',
        search: params.search,
        searchType: params.searchType,
        searchLimit,
        enhanceUserSearchWithFacebookPage: params.enhanceUserSearchWithFacebookPage,
    });
    if (!runId) throw new Error('No run ID returned — check server configuration.');

    onProgress?.(`Run started (${runId.slice(0, 8)}…) — scraping Instagram…`);

    const { items, note } = await pollForItems(runId, 48, 'Scrape', onProgress);
    onProgress?.(`Mapping ${items.length} profiles…`);
    const { leads, skipped } = intake({ source: 'search', rows: items, campaignId });
    onProgress?.(`Done — ${leads.length} profiles scraped.`);
    return { leads, received: items.length, skipped, runId, note };
}
