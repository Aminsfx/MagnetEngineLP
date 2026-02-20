import { APIKeys, AppConfig, Lead } from './types';

const STORAGE_KEYS = {
    API_KEYS: 'magnetengine_api_keys',
    LEADS: 'magnetengine_leads',
    CONFIG: 'magnetengine_config',
};

// Secure API Key Storage
export const storage = {
    // API Keys
    getAPIKeys(): APIKeys {
        const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
        return stored ? JSON.parse(stored) : {};
    },

    setAPIKey(provider: keyof APIKeys, key: string): void {
        const keys = this.getAPIKeys();
        keys[provider] = key;
        localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
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

    clearAll(): void {
        localStorage.removeItem(STORAGE_KEYS.API_KEYS);
        localStorage.removeItem(STORAGE_KEYS.LEADS);
        localStorage.removeItem(STORAGE_KEYS.CONFIG);
    },
};
