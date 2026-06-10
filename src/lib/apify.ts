import { Lead } from './types';

// ─── Loaded from .env (VITE_APIFY_API_KEY) — never hard-coded in source ──────
const APIFY_API_KEY = import.meta.env.VITE_APIFY_API_KEY as string;
const ACTOR_ID = 'apify~instagram-search-scraper';
const BASE_URL = 'https://api.apify.com/v2';

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
// Configurable via VITE_APIFY_FOLLOWERS_ACTOR_ID in .env — requires paid Apify plan
const FOLLOWERS_ACTOR_ID = (import.meta.env.VITE_APIFY_FOLLOWERS_ACTOR_ID as string) || 'asIjo32NQuUHP4Fnc';

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

export async function runFollowersScrape(
    params: FollowersParams,
    onProgress?: (message: string) => void,
): Promise<Lead[]> {
    const campaignId = crypto.randomUUID();

    onProgress?.('Connecting to Apify…');

    const startRes = await fetch(
        `${BASE_URL}/acts/${FOLLOWERS_ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username:        params.usernames,
                type:            params.type,
                maxItem:         params.maxItem,
                profileEnriched: params.profileEnriched,
            }),
        }
    );

    if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        throw new Error(`Apify error ${startRes.status}: ${JSON.stringify(err?.error?.message ?? err)}`);
    }

    const startData = await startRes.json();
    const runId: string = startData?.data?.id;
    if (!runId) throw new Error('No run ID returned — check API key.');

    onProgress?.(`Run started (${runId.slice(0, 8)}…) — scraping ${params.type}…`);

    const MAX_POLLS = 60;
    let poll = 0;

    while (poll < MAX_POLLS) {
        await new Promise(r => setTimeout(r, 5000));
        poll++;

        let statusData: any;
        try {
            const res = await fetch(`${BASE_URL}/actor-runs/${runId}?token=${APIFY_API_KEY}`);
            if (!res.ok) continue;
            statusData = await res.json();
        } catch { continue; }

        const status: string = statusData?.data?.status ?? 'RUNNING';
        onProgress?.(`${poll * 5}s · ${status}`);

        if (status === 'SUCCEEDED') {
            const datasetId = statusData?.data?.defaultDatasetId;
            onProgress?.('Fetching results…');

            const itemsRes = await fetch(
                `${BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_KEY}&clean=true`
            );
            if (!itemsRes.ok) throw new Error(`Dataset fetch failed (${itemsRes.status})`);

            const items: Record<string, any>[] = await itemsRes.json();
            onProgress?.(`Mapping ${items.length} profiles…`);

            const leads = items
                .map(item => mapFollowerItem(item, campaignId))
                .filter((l): l is Lead => l !== null);

            onProgress?.(`Done — ${leads.length} profiles scraped.`);
            return leads;
        }

        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
            throw new Error(`Apify run ${status.toLowerCase()} after ${poll * 5}s.`);
        }
    }

    throw new Error('Scrape timed out after 5 minutes.');
}

// ─── Keyword search scraper ───────────────────────────────────────────────────
/**
 * Start an async Apify run, poll for completion, return mapped leads.
 * Polling interval: 5 s. Timeout: 4 min (48 polls).
 */
export async function runApifyScrape(
    params: SearchParams,
    onProgress?: (message: string) => void,
): Promise<Lead[]> {
    const campaignId = crypto.randomUUID();

    // Cap at actor's hard limit
    const searchLimit = Math.max(1, Math.min(250, params.searchLimit));

    const actorInput = {
        search: params.search,
        searchType: params.searchType,
        searchLimit,
        enhanceUserSearchWithFacebookPage: params.enhanceUserSearchWithFacebookPage,
    };

    onProgress?.('Connecting to Apify…');

    // 1. Start async run
    const startRes = await fetch(
        `${BASE_URL}/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(actorInput),
        }
    );

    if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        throw new Error(
            `Apify error ${startRes.status}: ${JSON.stringify(err?.error?.message ?? err)}`
        );
    }

    const startData = await startRes.json();
    const runId: string = startData?.data?.id;
    if (!runId) throw new Error('No run ID returned — check actor name or API key.');

    onProgress?.(`Run started (${runId.slice(0, 8)}…) — scraping Instagram…`);

    // 2. Poll for completion
    const MAX_POLLS = 48; // 48 × 5 s = 4 min
    let poll = 0;

    while (poll < MAX_POLLS) {
        await new Promise(r => setTimeout(r, 5000));
        poll++;

        let statusData: any;
        try {
            const res = await fetch(`${BASE_URL}/actor-runs/${runId}?token=${APIFY_API_KEY}`);
            if (!res.ok) continue;
            statusData = await res.json();
        } catch {
            continue; // transient network error — keep polling
        }

        const status: string = statusData?.data?.status ?? 'RUNNING';
        onProgress?.(`${poll * 5}s elapsed · ${status}`);

        if (status === 'SUCCEEDED') {
            const datasetId: string = statusData?.data?.defaultDatasetId;
            onProgress?.('Fetching results…');

            const itemsRes = await fetch(
                `${BASE_URL}/datasets/${datasetId}/items?token=${APIFY_API_KEY}&clean=true`
            );
            if (!itemsRes.ok) throw new Error(`Dataset fetch failed (${itemsRes.status})`);

            const items: Record<string, any>[] = await itemsRes.json();
            onProgress?.(`Mapping ${items.length} profiles…`);

            const leads = items
                .map(item => mapItem(item, campaignId))
                .filter((l): l is Lead => l !== null);

            onProgress?.(`Done — ${leads.length} profiles scraped.`);
            return leads;
        }

        if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
            throw new Error(`Apify run ${status.toLowerCase()} after ${poll * 5}s.`);
        }
    }

    throw new Error('Scrape timed out after 4 minutes. Try a lower search limit.');
}
