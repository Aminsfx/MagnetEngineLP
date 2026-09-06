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

// ─── Shared polling loop (calls the poll-scrape backend proxy) ────────────────
interface PollResult { status: string; items?: Record<string, any>[] }

async function pollForItems(
    runId: string,
    maxPolls: number,
    label: string,
    onProgress?: (message: string) => void,
): Promise<Record<string, any>[]> {
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
            return result.items ?? [];
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
): Promise<Lead[]> {
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

    const items = await pollForItems(runId, 60, 'Scrape', onProgress);
    onProgress?.(`Mapping ${items.length} profiles…`);
    const { leads } = intake({ source: 'followers', rows: items, campaignId });
    onProgress?.(`Done — ${leads.length} profiles scraped.`);
    return leads;
}

// ─── Keyword search scraper ───────────────────────────────────────────────────
/**
 * Start an async Apify run (via backend), poll for completion, return mapped leads.
 * Polling interval: 5 s. Timeout: 4 min (48 polls).
 */
export async function runApifyScrape(
    params: SearchParams,
    onProgress?: (message: string) => void,
): Promise<Lead[]> {
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

    const items = await pollForItems(runId, 48, 'Scrape', onProgress);
    onProgress?.(`Mapping ${items.length} profiles…`);
    const { leads } = intake({ source: 'search', rows: items, campaignId });
    onProgress?.(`Done — ${leads.length} profiles scraped.`);
    return leads;
}
