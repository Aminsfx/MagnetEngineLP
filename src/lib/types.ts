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
    campaignName?: string;
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
    founderName?: string;      // who the DM is "from" (e.g. Marcus)
    founderRole?: string;      // e.g. founder, consultant, coach
    businessName?: string;
    businessNiche?: string;
    targetAudience?: string;
    valueProposition?: string; // maps to the "core outcome" you deliver
    exampleDM?: string;
    dmTone?: 'casual' | 'professional' | 'friendly' | 'bold';
    // Booking/Calendly link inserted into reply battlecards
    calendarLink?: string;
    // AI reply assistant (inbox) — persona for answering inbound DMs & booking
    replySystemPrompt?: string;
    // Autopilot: auto-send AI replies to new inbound DMs while a dashboard tab
    // is open (paced by the DM delay + dailySendCap). Off = human approval.
    autopilot?: boolean;
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

// ─── Unified inbox (AI SDR) ──────────────────────────────────────────────────
// A conversation is one Instagram DM thread (keyed by IG thread_id). Messages
// are the individual DMs in that thread. Populated by the extension's inbox
// poller and reconciled into Supabase by DashboardShell.
export type ConversationIntent =
    | 'interested'
    | 'objection'
    | 'not_interested'
    | 'neutral'
    | 'booked';

export interface Conversation {
    id: string;                 // IG thread_id
    handle: string;
    name?: string;
    avatarUrl?: string;
    account?: string;           // which of the user's IG accounts owns this thread
    lastMessageAt?: string;     // ISO
    lastMessageText?: string;
    unread: boolean;
    status: 'open' | 'booked' | 'closed';
    intent?: ConversationIntent;
    labels?: string[];          // freeform lead labels/tags (e.g. "hot", "call booked")
    needsReply: boolean;        // last message is inbound with no outbound after it
}

export interface Message {
    id: string;                 // IG item_id (or uuid for local drafts)
    conversationId: string;     // = Conversation.id (thread_id)
    direction: 'in' | 'out';
    text: string;
    aiDraft?: boolean;
    createdAt: string;          // ISO
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
