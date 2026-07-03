import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, LogOut, RefreshCw, CheckCircle2, Clock,
    Sparkles, ArrowRight, Mail,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { PAYMENT_LINKS, UPGRADE_CONTACT } from '../lib/plans';
import type { PlanTier } from '../lib/plans';

const PLAN_OPTIONS: {
    tier: PlanTier;
    name: string;
    price: string;
    subtext: string;
    highlight: boolean;
    features: string[];
}[] = [
    {
        tier: 'starter',
        name: 'Starter',
        price: '$197 setup',
        subtext: '+ $47/month',
        highlight: false,
        features: ['AI DM generation', 'Chrome extension auto-send', '100 leads per campaign', 'Test mode'],
    },
    {
        tier: 'pro',
        name: 'Pro',
        price: '$397 setup',
        subtext: '+ $97/month',
        highlight: true,
        features: ['Everything in Starter', 'Production mode', 'Unlimited leads', 'Follow-up sequencer', 'All AI providers'],
    },
    {
        tier: 'agency',
        name: 'Agency',
        price: '$1,497/mo',
        subtext: 'Done-for-you',
        highlight: false,
        features: ['Everything in Pro', 'We run your campaigns', 'Reply inbox handled', 'Weekly reports'],
    },
];

/**
 * Shown to signed-in users whose subscription is not yet activated.
 * Flow: user pays via the payment link → owner confirms payment and activates
 * the account in Supabase → user clicks "Check activation status" (or just
 * reloads) and lands in the dashboard.
 */
const PendingActivationPage: React.FC = () => {
    const { user, signOut } = useAuth();
    const { refresh } = usePlan();
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [stillPending, setStillPending] = useState(false);

    const handleCheck = async () => {
        setChecking(true);
        setStillPending(false);
        const status = await refresh();
        setChecking(false);
        if (status === 'active') {
            navigate('/dashboard');
        } else {
            setStillPending(true);
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const paymentHref = (tier: PlanTier) => PAYMENT_LINKS[tier] || UPGRADE_CONTACT;

    return (
        <div className="relative min-h-screen bg-black overflow-hidden">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/10 to-black pointer-events-none z-0" />

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                        <Clock className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Your account is almost ready</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mx-auto">
                        Welcome{user?.email ? <>, <span className="text-white font-medium">{user.email}</span></> : ''}!
                        Your account was created successfully. To unlock the dashboard, complete your payment —
                        we'll activate your access as soon as it's confirmed (usually within a few hours).
                    </p>
                </div>

                {/* Steps */}
                <div className="flex items-center justify-center gap-3 mb-10 text-[11px] text-zinc-500 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 1. Account created
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-700" />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/4 text-zinc-300">
                        <CreditCard className="w-3.5 h-3.5" /> 2. Complete payment
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-700" />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/4 text-zinc-500">
                        <Sparkles className="w-3.5 h-3.5" /> 3. We activate your access
                    </span>
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    {PLAN_OPTIONS.map(plan => (
                        <div
                            key={plan.tier}
                            className={`rounded-2xl p-6 flex flex-col bg-[#050A08] border transition-all ${
                                plan.highlight
                                    ? 'border-emerald-500/30 shadow-[0_0_40px_-12px_rgba(16,185,129,0.3)]'
                                    : 'border-white/8 hover:border-white/15'
                            }`}
                        >
                            {plan.highlight && (
                                <span className="self-start px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold mb-3">
                                    Most popular
                                </span>
                            )}
                            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                            <div className="mt-2 mb-1">
                                <span className="text-2xl font-bold text-white">{plan.price}</span>
                            </div>
                            <p className="text-xs text-zinc-500 mb-4">{plan.subtext}</p>
                            <ul className="space-y-2 mb-6 flex-1">
                                {plan.features.map(f => (
                                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <a
                                href={paymentHref(plan.tier)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                                    plan.highlight
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                                        : 'border border-white/10 hover:border-white/20 text-white bg-white/5 hover:bg-white/10'
                                }`}
                            >
                                {PAYMENT_LINKS[plan.tier] ? <CreditCard className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                {PAYMENT_LINKS[plan.tier] ? `Pay for ${plan.name}` : 'Contact us to pay'}
                            </a>
                        </div>
                    ))}
                </div>

                {/* Already paid */}
                <div className="rounded-2xl bg-[#050A08] border border-white/8 p-6 text-center">
                    <p className="text-sm text-zinc-400 mb-4">
                        Already paid? Once we confirm your payment your account unlocks automatically.
                    </p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        <button
                            onClick={handleCheck}
                            disabled={checking}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-emerald-950 font-semibold rounded-xl transition-all text-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                            Check activation status
                        </button>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign out
                        </button>
                    </div>
                    {stillPending && (
                        <p className="text-xs text-amber-400/90 mt-4">
                            Not activated yet — if you've already paid, hang tight. We activate accounts as soon as payment is confirmed.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PendingActivationPage;
