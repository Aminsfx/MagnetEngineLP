import { AppConfig, Lead } from './types';

const STORAGE_KEYS = {
    LEADS: 'magnetengine_leads',
    CONFIG: 'magnetengine_config',
    DM_DELAY: 'magnetengine_dm_delay',
    QUEUE_PAGE_SIZE: 'magnetengine_queue_page_size',
};

/** Random delay (in minutes) the extension waits between each DM. */
export interface DmDelay { min: number; max: number }
const DEFAULT_DM_DELAY: DmDelay = { min: 3, max: 8 };

/** Rows per page offered by the Approval Queue's pager. */
export const QUEUE_PAGE_SIZES = [10, 25, 50, 100] as const;
export type QueuePageSize = (typeof QUEUE_PAGE_SIZES)[number];

/**
 * 25, not 50. A queue row is ~110px tall, so a 50-row page ran six screens deep
 * and the pager sat below all of it — Operators reached the bottom of page 1 and
 * concluded that was every Lead. A page you can scan without losing the pager is
 * what makes the queue read as paged at all.
 */
const DEFAULT_QUEUE_PAGE_SIZE: QueuePageSize = 25;

/**
 * Browser-local storage for the few things that are genuinely per-browser.
 *
 * The API-key half (obfuscated getAPIKeys/setAPIKey) was removed: provider keys
 * moved to Supabase Edge Function secrets in 6a64518, so the interface was
 * protecting something the app no longer stores. The daily-send counter went
 * too — nothing ever called `incrementDailySends`, so `getDailySends` returned
 * 0 forever and the header was reading a hardcoded zero through three layers of
 * indirection. Real send counts come from the extension.
 */
export const storage = {
    // Leads
    getLeads(): Lead[] {
        const stored = localStorage.getItem(STORAGE_KEYS.LEADS);
        return stored ? JSON.parse(stored) : [];
    },

    setLeads(leads: Lead[]): void {
        localStorage.setItem(STORAGE_KEYS.LEADS, JSON.stringify(leads));
    },

    // Config
    getConfig(): AppConfig {
        const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
        return stored ? JSON.parse(stored) : {
            systemPrompt: 'You are a professional sales assistant. Create personalized, engaging DMs.',
            includeKeywords: [],
            excludeKeywords: [],
            minFollowers: 0,
            maxFollowers: 100000000,
            accountType: 'all',
            selectedAIProvider: 'openai',
            dailySendCap: 40,
        };
    },

    setConfig(config: AppConfig): void {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    },

    // DM drip delay (minutes) — chosen in the Approval Queue send bar, reused by
    // the follow-up dispatcher, and sent to the extension per campaign.
    getDmDelay(): DmDelay {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.DM_DELAY);
            if (!stored) return { ...DEFAULT_DM_DELAY };
            const parsed = JSON.parse(stored) as Partial<DmDelay>;
            let min = Number(parsed.min);
            let max = Number(parsed.max);
            if (!Number.isFinite(min) || min < 1) min = DEFAULT_DM_DELAY.min;
            if (!Number.isFinite(max) || max < min) max = Math.max(min, DEFAULT_DM_DELAY.max);
            return { min, max };
        } catch {
            return { ...DEFAULT_DM_DELAY };
        }
    },

    setDmDelay(delay: DmDelay): void {
        localStorage.setItem(STORAGE_KEYS.DM_DELAY, JSON.stringify(delay));
    },

    // Approval Queue rows-per-page — a per-browser reading preference, like the
    // delay range above, so it never belongs in the synced AppConfig.
    getQueuePageSize(): QueuePageSize {
        try {
            const stored = Number(localStorage.getItem(STORAGE_KEYS.QUEUE_PAGE_SIZE));
            // Only accept a value the pager still offers: a stale or hand-edited
            // number would page the table at a size the select can't display.
            return (QUEUE_PAGE_SIZES as readonly number[]).includes(stored)
                ? (stored as QueuePageSize)
                : DEFAULT_QUEUE_PAGE_SIZE;
        } catch {
            return DEFAULT_QUEUE_PAGE_SIZE;
        }
    },

    setQueuePageSize(size: QueuePageSize): void {
        localStorage.setItem(STORAGE_KEYS.QUEUE_PAGE_SIZE, String(size));
    },
};
