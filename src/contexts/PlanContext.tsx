import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/db';
import { getPlanLimits } from '../lib/plans';
import type { PlanTier, PlanLimits } from '../lib/plans';

interface PlanContextValue {
    tier: PlanTier;
    limits: PlanLimits;
    loading: boolean;
}

const PlanContext = createContext<PlanContextValue>({
    tier: 'starter',
    limits: getPlanLimits('starter'),
    loading: false,
});

export const usePlan = (): PlanContextValue => useContext(PlanContext);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [tier, setTier] = useState<PlanTier>('starter');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            setTier('starter');
            return;
        }

        setLoading(true);
        db.getSubscription(user.id).then((fetchedTier) => {
            setTier(fetchedTier);
            setLoading(false);
        });
    }, [user]);

    return (
        <PlanContext.Provider value={{ tier, limits: getPlanLimits(tier), loading }}>
            {children}
        </PlanContext.Provider>
    );
};
