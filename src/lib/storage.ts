import { APIKeys, AppConfig, Lead } from './types';

const STORAGE_KEYS = {
    API_KEYS: 'magnetengine_api_keys',
    LEADS: 'magnetengine_leads',
    CONFIG: 'magnetengine_config',
    DAILY_SENDS: 'magnetengine_daily_sends',
};

// Simple obfuscation (NOT encryption — just prevents casual inspection)
function obfuscate(text: string): string {
    return btoa(encodeURIComponent(text));
}

function deobfuscate(text: string): string {
    try {
        return decodeURIComponent(atob(text));
    } catch {
        // If deobfuscation fails, the value was stored in plaintext (legacy)
        return text;
    }
}

// Secure API Key Storage
export const storage = {
    // API Keys (obfuscated) — AI providers only; Apify is backend-managed
    getAPIKeys(): APIKeys {
        const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
        if (!stored) return {};

        try {
            const parsed = JSON.parse(stored);
            const keys: APIKeys = {};
            for (const [provider, value] of Object.entries(parsed)) {
                const k = provider as keyof APIKeys;
                keys[k] = deobfuscate(value as string);
            }
            return keys;
        } catch {
            return {};
        }
    },

    setAPIKey(provider: keyof APIKeys, key: string): void {
        const keys = this.getAPIKeys();
        keys[provider] = key;

        const obfuscated: Record<string, string> = {};
        for (const [p, v] of Object.entries(keys)) {
            if (v) obfuscated[p] = obfuscate(v);
        }
        localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(obfuscated));
    },

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
        };
    },

    setConfig(config: AppConfig): void {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    },

    // Daily send counter — resets automatically at midnight
    getDailySends(): { count: number; date: string } {
        const today = new Date().toISOString().slice(0, 10);
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.DAILY_SENDS);
            if (!stored) return { count: 0, date: today };
            const parsed = JSON.parse(stored) as { count: number; date: string };
            if (parsed.date !== today) return { count: 0, date: today }; // new day, reset
            return parsed;
        } catch {
            return { count: 0, date: today };
        }
    },

    incrementDailySends(by = 1): number {
        const current = this.getDailySends();
        const updated = { count: current.count + by, date: current.date };
        localStorage.setItem(STORAGE_KEYS.DAILY_SENDS, JSON.stringify(updated));
        return updated.count;
    },

    clearAll(): void {
        localStorage.removeItem(STORAGE_KEYS.API_KEYS);
        localStorage.removeItem(STORAGE_KEYS.LEADS);
        localStorage.removeItem(STORAGE_KEYS.CONFIG);
        localStorage.removeItem(STORAGE_KEYS.DAILY_SENDS);
    },
};
