// Lead data structure
export interface Lead {
    id: string;
    name: string;
    handle: string;
    followers: number;
    bio?: string;
    isPrivate: boolean;
    status: 'cold' | 'warm' | 'won';
    dmSent: boolean;
    replied: boolean;
    dmContent?: string;
    dmDate?: string; // ISO date string
    followUp1Date?: string; // ISO date string
    followUp2Date?: string; // ISO date string
    followUp3Date?: string; // ISO date string
    responseRate?: number;
    dealValue?: number;
}

// Application state
export interface AppState {
    leads: Lead[];
    filteredLeads: Lead[];
    config: AppConfig;
    stats: DashboardStats;
}

// Configuration
export interface AppConfig {
    systemPrompt: string;
    includeKeywords: string[];
    excludeKeywords: string[];
    minFollowers: number;
    maxFollowers: number;
    accountType: 'all' | 'public' | 'private';
    selectedAIProvider: 'openai' | 'claude' | 'gemini';
}

// Dashboard statistics
export interface DashboardStats {
    totalLeads: number;
    dmsSent: number;
    responseRate: number;
    revenue: number;
    funnelEfficiency: number;
}

// API Key storage
export interface APIKeys {
    openai?: string;
    claude?: string;
    gemini?: string;
}

// Column Mapping for CSV import
export interface ColumnMapping {
    name?: string;
    handle?: string;
    followers?: string;
    bio?: string;
    isPrivate?: string;
}
