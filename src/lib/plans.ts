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
    maxDailyCap: number;
    maxDMGenerations: number;     // per month, centrally billed
    maxLeadsPerMonth: number;     // monthly lead-import quota
    maxCampaignsPerMonth: number; // monthly campaign quota
}

/**
 * Single-plan model: every activated member gets the same limits.
 *
 * This used to be a `Record<PlanTier, PlanLimits>` whose three keys all
 * pointed at the same object, read through a `getPlanLimits(tier)` lookup, with
 * `tier` carried as context state — an interface with nothing behind it. The
 * `PlanTier` type stays because `subscriptions.plan` is a real column that
 * whop-webhook and admin-api write; nothing reads it to decide capability.
 *
 * Fields that no caller read (maxLeadsPerCampaign, allowedAIProviders,
 * canAdjustDailyCap, canAccessFollowUps, canUsePresets, isTestModeOnly) are
 * gone: the Sidebar's lock icon was gated on `!canAccessFollowUps`, which was
 * unconditionally true, so it could never render.
 */
export const PLAN_LIMITS: PlanLimits = {
    maxDailyCap: 200,
    maxDMGenerations: 500,
    maxLeadsPerMonth: 500,
    maxCampaignsPerMonth: 3,
};

export const UPGRADE_CONTACT = 'mailto:support@magnetengine.xyz?subject=Upgrade%20Plan';
