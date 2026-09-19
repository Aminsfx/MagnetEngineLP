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
    /**
     * They asked not to be contacted again — read off the Inbox as an
     * `Outcome`, or set by the Operator. Suppression only: it stops every
     * follow-up condition, fires no webhook and moves no metric. A judgement
     * that only ever silences outreach fails safe in the one direction that
     * matters, which is why it is allowed to come from the AI at all.
     */
    optedOut?: boolean;
    dmContent?: string;
    dmDate?: string; // ISO date string
    replyDate?: string; // ISO date string
    followUp1Date?: string; // ISO date string
    followUp2Date?: string; // ISO date string
    followUp3Date?: string; // ISO date string
    /**
     * The Rescue ladder's own three slots.
     *
     * Separate from followUpN because the two ladders can both run over one
     * Lead's lifetime: a prospect who got a cold touch on day 3 and replied on
     * day 4 has followUp1Date set, and sharing the slots would drop them into
     * the rescue ladder at rung two — skipping the one rung written for exactly
     * their situation. A Lead is stored as jsonb, so three more fields cost
     * nothing at the database.
     */
    rescue1Date?: string;
    rescue2Date?: string;
    rescue3Date?: string;
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
    // ─── The Offer Ledger ───────────────────────────────────────────────────
    // The facts the prompts are allowed to state. Both system prompts refuse to
    // invent a number ("never claim a number you were not given") and until
    // these existed nothing ever gave them one. Mirrors `OfferLedger` in
    // src/lib/prompt.ts, which is where they are turned into prompt text.
    proofPoint?: string;
    removedSacrifice?: string;
    timeToResult?: string;
    freeGive?: string;
    price?: string;
    priceAnchor?: string;
    guarantee?: string;
    callLength?: string;
    callPromise?: string;
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
/**
 * When a follow-up step is allowed to fire.
 *
 * `replied_not_booked` is the one that was missing. Until it existed the engine
 * skipped every Lead the moment they answered, so the warmest segment in the
 * workspace — replied, interested, never booked — received nothing, ever.
 */
export type FollowUpCondition = 'no_reply' | 'always' | 'replied_not_booked';

export interface FollowUpStep {
    id: string;
    delayDays: number;          // days after previous message (or initial DM for step 1)
    messageTemplate: string;    // supports the tokens in src/lib/followups.ts
    condition: FollowUpCondition;
}

export interface FollowUpSequence {
    id: string;
    campaignId?: string;        // undefined = global default sequence
    steps: FollowUpStep[];      // max 3 steps
    active: boolean;
}
