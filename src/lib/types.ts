// Lead data structure
export interface Lead {
    id: string;
    name: string;
    handle: string;
    followers: number;
    following?: number;
    postsCount?: number;
    profilePicUrl?: string;
    verified?: boolean;
    businessAccount?: boolean;
    businessCategory?: string;
    city?: string;
    bio?: string;
    isPrivate: boolean;
    status: 'cold' | 'warm' | 'won';
    dmSent: boolean;
    replied: boolean;
    positiveReply?: boolean;
    booked?: boolean;
    followedUp?: boolean;
    approved?: boolean;
    rejected?: boolean;
    dmContent?: string;
    dmDate?: string; // ISO date string
    replyDate?: string; // ISO date string
    followUp1Date?: string; // ISO date string
    followUp2Date?: string; // ISO date string
    followUp3Date?: string; // ISO date string
    dealValue?: number;
    campaignId?: string;
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
    apifyTargetLocation?: string;
    apifyTargetKeywords?: string[];
    apifyMaxProfiles?: number;
    // AI Onboarding Wizard
    businessName?: string;
    businessNiche?: string;
    targetAudience?: string;
    valueProposition?: string;
    exampleDM?: string;
    dmTone?: 'casual' | 'professional' | 'friendly' | 'bold';
    // Booking/Calendly link inserted into reply battlecards
    calendarLink?: string;
    // Outbound webhook integration (Zapier/Make catch hooks)
    webhookUrl?: string;
    webhookEvents?: { replied: boolean; positiveReply: boolean; booked: boolean };
    onboardingComplete?: boolean;
    // Safety governor
    dailySendCap: number;        // max DMs per day (default 40)
}

// Dashboard statistics
export interface DashboardStats {
    totalLeads: number;
    approvedLeads: number;
    dmsSent: number;
    replyRate: number;           // % of DMs that got any reply
    positiveReplyRate: number;   // % of replies that were positive
    bookingRate: number;         // % of positive replies that booked
    followUpRate: number;        // % of DMs that got a follow-up
    leadsContacted: number;      // unique leads with DM sent
    activeCampaigns: number;     // count of distinct campaignIds
}

// API Key storage — NO Apify (backend-managed). Only AI providers for DM generation.
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

// Follow-up sequencer types
export interface FollowUpStep {
    id: string;
    delayDays: number;          // days after previous message (or initial DM for step 1)
    messageTemplate: string;    // supports {{handle}} and {{name}} tokens
    condition: 'no_reply' | 'always';
}

export interface FollowUpSequence {
    id: string;
    campaignId?: string;        // undefined = global default sequence
    steps: FollowUpStep[];      // max 3 steps
    active: boolean;
}
