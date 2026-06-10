export type PlanTier = 'starter' | 'pro' | 'agency';

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
