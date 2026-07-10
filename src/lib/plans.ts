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
 * Payment links shown on the activation page — one plan, two billing cycles.
 * Owner: create the two Polar.sh checkout links and set them in .env:
 *   VITE_PAYMENT_LINK_MONTHLY, VITE_PAYMENT_LINK_ANNUAL
 * Until a link is configured, the button falls back to the contact email below.
 */
export type BillingCycle = 'monthly' | 'annual';
export const BILLING_LINKS: Record<BillingCycle, string> = {
    monthly: (import.meta.env.VITE_PAYMENT_LINK_MONTHLY as string) ?? '',
    annual: (import.meta.env.VITE_PAYMENT_LINK_ANNUAL as string) ?? '',
};

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
