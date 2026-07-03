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
 * Payment links shown on the activation page.
 * Owner: create your Stripe/Lemon Squeezy/PayPal payment links and set them in .env:
 *   VITE_PAYMENT_LINK_STARTER, VITE_PAYMENT_LINK_PRO, VITE_PAYMENT_LINK_AGENCY
 * Until a link is configured, the button falls back to the contact email below.
 */
export const PAYMENT_LINKS: Record<PlanTier, string> = {
    starter: (import.meta.env.VITE_PAYMENT_LINK_STARTER as string) ?? '',
    pro: (import.meta.env.VITE_PAYMENT_LINK_PRO as string) ?? '',
    agency: (import.meta.env.VITE_PAYMENT_LINK_AGENCY as string) ?? '',
};

export interface PlanLimits {
    maxLeadsPerCampaign: number | null; // null = unlimited
    allowedAIProviders: Array<'openai' | 'claude' | 'gemini'>;
    canAdjustDailyCap: boolean;
    maxDailyCap: number;
    canAccessFollowUps: boolean;
    canUsePresets: boolean;
    isTestModeOnly: boolean;
    maxDMGenerations: number; // per month, centrally billed
}

const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    starter: {
        maxLeadsPerCampaign: 100,
        allowedAIProviders: ['openai'],
        canAdjustDailyCap: false,
        maxDailyCap: 40,
        canAccessFollowUps: false,
        canUsePresets: false,
        isTestModeOnly: true,
        maxDMGenerations: 100,
    },
    pro: {
        maxLeadsPerCampaign: null,
        allowedAIProviders: ['openai', 'gemini', 'claude'],
        canAdjustDailyCap: true,
        maxDailyCap: 200,
        canAccessFollowUps: true,
        canUsePresets: true,
        isTestModeOnly: false,
        maxDMGenerations: 1000,
    },
    agency: {
        maxLeadsPerCampaign: null,
        allowedAIProviders: ['openai', 'gemini', 'claude'],
        canAdjustDailyCap: true,
        maxDailyCap: 200,
        canAccessFollowUps: true,
        canUsePresets: true,
        isTestModeOnly: false,
        maxDMGenerations: 10000,
    },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
    return PLAN_LIMITS[tier];
}

export const UPGRADE_CONTACT = 'mailto:support@magnetengine.io?subject=Upgrade%20Plan';
