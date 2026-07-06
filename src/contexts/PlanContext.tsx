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

    const fetchSubscription = useCallback(async (): Promise<SubscriptionStatus> => {
        if (!user) {
            setTier('starter');
            setStatus('pending');
            setLoading(false);
            return 'pending';
        }
        const sub = await db.getSubscription(user.id);
        setTier(sub.tier);
        setStatus(sub.status);
        setLoading(false);
        return sub.status;
    }, [user]);

    useEffect(() => {
        setLoading(true);
        fetchSubscription();
    }, [fetchSubscription]);

    return (
        <PlanContext.Provider value={{ tier, limits: getPlanLimits(tier), status, loading, refresh: fetchSubscription }}>
            {children}
        </PlanContext.Provider>
    );
};
