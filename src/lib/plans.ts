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
    monthly: { amount: 147, label: '$147', suffix: '/month' },
    annual: { amount: 1470, label: '$1,470', suffix: '/year' },
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
    maxDMGenerations: 1500,
    maxLeadsPerMonth: 1500,
    // 6 x the 250-profile search cap = 1,500, so the lead quota is reachable.
    maxCampaignsPerMonth: 6,
};

/** The Send Cap a config that never set one gets. The extension's own default matches. */
export const DEFAULT_SEND_CAP = 40;

/**
 * The Send Cap — how many DMs the extension may send in a day — as every
 * surface must read it: the Operator's setting, or the default, clamped to
 * the plan.
 *
 * One function because four call sites each spelled it themselves and two of
 * them disagreed: Settings and the handoffs fell back to 40, the header to the
 * plan's 200, so an account that never touched the setting was told it could
 * send 200 while every campaign carried 40.
 */
export function sendCapOf(config: { dailySendCap?: number }): number {
    const chosen = Number(config.dailySendCap);
    const cap = Number.isFinite(chosen) && chosen > 0 ? Math.round(chosen) : DEFAULT_SEND_CAP;
    return Math.min(PLAN_LIMITS.maxDailyCap, Math.max(1, cap));
}

/** The one support address. Every mailto in the app is built from it. */
export const SUPPORT_EMAIL = 'amine@magnetengine.xyz';
export const UPGRADE_CONTACT = `mailto:${SUPPORT_EMAIL}?subject=Upgrade%20Plan`;
