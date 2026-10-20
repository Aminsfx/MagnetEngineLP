import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/db';
import { PLAN_LIMITS } from '../lib/plans';
import type { PlanLimits, Subscription, SubscriptionStatus } from '../lib/plans';

interface PlanContextValue {
    limits: PlanLimits;
    /** 'active' unlocks the dashboard; 'pending' keeps the user on /activate */
    status: SubscriptionStatus;
    /** True until the first subscription fetch resolves — gate routing on this */
    loading: boolean;
    /** Re-fetch the subscription (used by the "check activation" button) */
    refresh: () => Promise<SubscriptionStatus>;
    /** When the free trial ends, while the account is in one (ISO); null otherwise. */
    trialEndsAt: string | null;
    /** Re-fetch and answer the whole subscription, trial included. */
    reload: () => Promise<Subscription>;
}

const PlanContext = createContext<PlanContextValue>({
    limits: PLAN_LIMITS,
    status: 'pending',
    loading: true,
    refresh: async () => 'pending',
    trialEndsAt: null,
    reload: async () => ({ tier: 'starter', status: 'pending', trialEndsAt: null }),
});

export const usePlan = (): PlanContextValue => useContext(PlanContext);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [status, setStatus] = useState<SubscriptionStatus>('pending');
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // When the signed-in user changes, flip back to loading *during render* —
    // otherwise route guards see one frame of the previous user's (stale)
    // status and can wrongly redirect, e.g. an active subscriber bounced to
    // /activate right after login.
    const [lastUserId, setLastUserId] = useState<string | null | undefined>(undefined);
    const currentUserId = user?.id ?? null;
    if (currentUserId !== lastUserId) {
        setLastUserId(currentUserId);
        setLoading(true);
    }

    // Key everything on the user ID, not the user object — Supabase mints a
    // new object on every token refresh (tab refocus), and re-fetching with a
    // loading flip would unmount the dashboard for the same signed-in user.
    const reload = useCallback(async (): Promise<Subscription> => {
        if (!currentUserId) {
            setStatus('pending');
            setTrialEndsAt(null);
            setLoading(false);
            return { tier: 'starter', status: 'pending', trialEndsAt: null };
        }
        const sub = await db.getSubscription(currentUserId);
        setStatus(sub.status);
        setTrialEndsAt(sub.trialEndsAt ?? null);
        setLoading(false);
        return sub;
    }, [currentUserId]);

    const fetchSubscription = useCallback(async (): Promise<SubscriptionStatus> => (await reload()).status, [reload]);

    useEffect(() => {
        // No setLoading(true) here: the render-time guard above already flips
        // loading when the user ID actually changes; same-user re-runs stay quiet.
        fetchSubscription();
    }, [fetchSubscription]);

    return (
        <PlanContext.Provider value={{ limits: PLAN_LIMITS, status, loading, refresh: fetchSubscription, trialEndsAt, reload }}>
            {children}
        </PlanContext.Provider>
    );
};
