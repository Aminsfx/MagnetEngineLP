import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/db';
import { getPlanLimits } from '../lib/plans';
import type { PlanTier, PlanLimits, SubscriptionStatus } from '../lib/plans';

interface PlanContextValue {
    tier: PlanTier;
    limits: PlanLimits;
    /** 'active' unlocks the dashboard; 'pending' keeps the user on /activate */
    status: SubscriptionStatus;
    /** True until the first subscription fetch resolves — gate routing on this */
    loading: boolean;
    /** Re-fetch the subscription (used by the "check activation" button) */
    refresh: () => Promise<SubscriptionStatus>;
}

const PlanContext = createContext<PlanContextValue>({
    tier: 'starter',
    limits: getPlanLimits('starter'),
    status: 'pending',
    loading: true,
    refresh: async () => 'pending',
});

export const usePlan = (): PlanContextValue => useContext(PlanContext);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [tier, setTier] = useState<PlanTier>('starter');
    const [status, setStatus] = useState<SubscriptionStatus>('pending');
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
    const fetchSubscription = useCallback(async (): Promise<SubscriptionStatus> => {
        if (!currentUserId) {
            setTier('starter');
            setStatus('pending');
            setLoading(false);
            return 'pending';
        }
        const sub = await db.getSubscription(currentUserId);
        setTier(sub.tier);
        setStatus(sub.status);
        setLoading(false);
        return sub.status;
    }, [currentUserId]);

    useEffect(() => {
        // No setLoading(true) here: the render-time guard above already flips
        // loading when the user ID actually changes; same-user re-runs stay quiet.
        fetchSubscription();
    }, [fetchSubscription]);

    return (
        <PlanContext.Provider value={{ tier, limits: getPlanLimits(tier), status, loading, refresh: fetchSubscription }}>
            {children}
        </PlanContext.Provider>
    );
};
