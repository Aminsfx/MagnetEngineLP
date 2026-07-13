import { Lead } from './types';
import { invokeFunction } from './functions';

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

/** Map one Apify result item → Lead (tries multiple field-name aliases for resilience) */
function mapItem(item: Record<string, any>, campaignId: string): Lead | null {
    const handle = item.username ?? item.handle ?? item.userName ?? '';
    if (!handle) return null;

    const name        = item.fullName ?? item.name ?? item.displayName ?? handle;
    const followers   = Number(item.followersCount ?? item.followers ?? 0);
    const following   = Number(item.followingCount ?? item.following ?? 0);
    const postsCount  = Number(item.postsCount ?? item.mediaCount ?? item.posts ?? 0);
    const bio         = item.biography ?? item.bio ?? item.description ?? '';
    const isPrivate   = Boolean(item.isPrivate ?? false);
    const verified    = Boolean(item.isVerified ?? item.verified ?? false);
    const businessAccount   = Boolean(item.isBusinessAccount ?? item.isBusiness ?? false);
    const businessCategory: string | undefined = item.businessCategoryName ?? item.category ?? undefined;
    const profilePicUrl: string | undefined    = item.profilePicUrl ?? item.profilePicUrlHD ?? undefined;
    const city: string | undefined             = item.city ?? item.locationName ?? undefined;

    return {
        id: crypto.randomUUID(),
        campaignId,
        handle,
        name: name || handle,
        followers,
        following,
        postsCount,
        bio: bio || undefined,
        isPrivate,
        verified,
        businessAccount,
        businessCategory,
        profilePicUrl,
        city,
        status: 'cold',
        dmSent: false,
        replied: false,
    };
}

// ─── Followers / Following scraper ───────────────────────────────────────────
export interface FollowersParams {
    usernames: string[];            // Instagram handles to scrape from
    type: 'followers' | 'following';
    maxItem: number;                // per username
    profileEnriched: boolean;       // true = fetch full bio + follower counts
}

function mapFollowerItem(item: Record<string, any>, campaignId: string): Lead | null {
    const handle = item.username ?? '';
    if (!handle) return null;

    const name           = item.full_name ?? item.fullName ?? handle;
    const bio            = item.biography ?? item.bio ?? '';
    const profilePicUrl  = item.profile_pic_url ?? item.profilePicUrl ?? undefined;
    const isPrivate      = Boolean(item.is_private ?? false);
    const verified       = Boolean(item.is_verified ?? item.isVerified ?? false);
    const followers      = Number(item.followersCount ?? item.edge_followed_by?.count ?? item.followers_count ?? 0);
    const following      = Number(item.followingCount ?? item.edge_follow?.count ?? item.following_count ?? 0);
    const businessAccount   = Boolean(item.isBusinessAccount ?? item.is_business_account ?? false);
    const businessCategory  = item.businessCategoryName ?? item.business_category_name ?? item.category_name ?? undefined;
    const city: string | undefined = item.city ?? undefined;

    return {
        id: crypto.randomUUID(),
        campaignId,
        handle,
        name: name || handle,
        followers,
        following,
        postsCount: 0,
        bio: bio || undefined,
        isPrivate,
        verified,
        businessAccount,
        businessCategory,
        profilePicUrl,
        city,
        status: 'cold',
        dmSent: false,
        replied: false,
    };
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
    const leads = items
        .map(item => mapFollowerItem(item, campaignId))
        .filter((l): l is Lead => l !== null);
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
    const leads = items
        .map(item => mapItem(item, campaignId))
        .filter((l): l is Lead => l !== null);
    onProgress?.(`Done — ${leads.length} profiles scraped.`);
    return leads;
}
