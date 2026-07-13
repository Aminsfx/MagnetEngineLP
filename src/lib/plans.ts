export type PlanTier = 'starter' | 'pro' | 'agency';

/**
 * Subscription lifecycle — access is granted manually by the owner.
 *  - 'pending'  → account exists but payment not yet confirmed (no dashboard access)
 *  - 'active'   → owner confirmed payment; full access for the assigned tier
 *  - 'cancelled'→ access revoked
 */
export type SubscriptionStatus = 'pending' | 'active' | 'cancelled';

export interface Subscription {
    tier: PlanTier;
    status: SubscriptionStatus;
}

/**
 * Whop embedded checkout — one plan, two billing cycles.
 * Owner: create the two plans in Whop (Manage Pricing) and set their plan IDs
 * in .env: VITE_WHOP_PLAN_ID_MONTHLY, VITE_WHOP_PLAN_ID_ANNUAL
 * Until a plan ID is configured, /activate falls back to the contact email below.
 * See docs/WHOP_SETUP.md.
 */
export type BillingCycle = 'monthly' | 'annual';
export const WHOP_PLAN_IDS: Record<BillingCycle, string> = {
    monthly: (import.meta.env.VITE_WHOP_PLAN_ID_MONTHLY as string) ?? '',
    annual: (import.meta.env.VITE_WHOP_PLAN_ID_ANNUAL as string) ?? '',
};

/** Single source of truth for displayed prices (landing page + /activate). */
export const PRICES: Record<BillingCycle, { amount: number; label: string; suffix: string }> = {
    monthly: { amount: 197, label: '$197', suffix: '/month' },
    annual: { amount: 1970, label: '$1,970', suffix: '/year' },
};

/**
 * Client-side admin check — controls UI visibility only (Sidebar item, /admin
 * route guard). Real enforcement lives in the admin-api Edge Function, which
 * checks the caller's JWT email against the server-side ADMIN_EMAILS secret.
 */
export function isAdminEmail(email?: string | null): boolean {
    if (!email) return false;
    const list = ((import.meta.env.VITE_ADMIN_EMAILS as string) ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    return list.includes(email.trim().toLowerCase());
}

export interface PlanLimits {
    maxLeadsPerCampaign: number | null; // null = unlimited
    allowedAIProviders: Array<'openai' | 'claude' | 'gemini'>;
    canAdjustDailyCap: boolean;
    maxDailyCap: number;
    canAccessFollowUps: boolean;
    canUsePresets: boolean;
    isTestModeOnly: boolean;
    maxDMGenerations: number;   // per month, centrally billed
    maxLeadsPerMonth: number;   // monthly lead-import quota
    maxCampaignsPerMonth: number; // monthly campaign quota
}

// Single-plan model: every activated member gets full access. The PlanTier
// keys are kept only for backward compatibility with existing subscription
// rows — all three resolve to the same limits.
const MEMBER_LIMITS: PlanLimits = {
    maxLeadsPerCampaign: null,
    allowedAIProviders: ['openai', 'gemini', 'claude'],
    canAdjustDailyCap: true,
    maxDailyCap: 200,
    canAccessFollowUps: true,
    canUsePresets: true,
    isTestModeOnly: false,
    maxDMGenerations: 500,
    maxLeadsPerMonth: 500,
    maxCampaignsPerMonth: 3,
};

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    starter: MEMBER_LIMITS,
    pro: MEMBER_LIMITS,
    agency: MEMBER_LIMITS,
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
    return PLAN_LIMITS[tier];
}

export const UPGRADE_CONTACT = 'mailto:support@magnetengine.xyz?subject=Upgrade%20Plan';
