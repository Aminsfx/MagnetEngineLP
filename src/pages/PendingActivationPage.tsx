import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CreditCard, LogOut, RefreshCw, CheckCircle2, Clock,
    Sparkles, ArrowRight, Mail, Check, Gift,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { BILLING_LINKS, UPGRADE_CONTACT } from '../lib/plans';
import type { BillingCycle } from '../lib/plans';

const FEATURES = [
    '500 leads/month',
    '3 campaigns/month',
    'AI-written personalized DMs — no API keys needed',
    'Production Mode sending',
    'Full approval queue + CRM',
    'CSV/JSON export',
    '3 pre-built niche scripts',
    'Direct Slack access to founder',
];

/**
 * Shown to signed-in users whose subscription is not yet activated.
 * Flow: user pays via the Polar checkout link → the webhook (or the owner)
 * activates the account → user clicks "Check activation status" (or just
 * reloads) and lands in the dashboard.
 */
const PendingActivationPage: React.FC = () => {
    const { user, signOut } = useAuth();
    const { refresh, status, loading } = usePlan();
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [stillPending, setStillPending] = useState(false);
    const [billing, setBilling] = useState<BillingCycle>('monthly');

    // If the subscription is (or becomes) active, this page shouldn't be shown
    useEffect(() => {
        if (!loading && status === 'active') {
            navigate('/dashboard', { replace: true });
        }
    }, [loading, status, navigate]);

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

    const paymentLink = BILLING_LINKS[billing];
    const paymentHref = (() => {
        if (!paymentLink) return UPGRADE_CONTACT;
        if (!user?.email) return paymentLink;
        const sep = paymentLink.includes('?') ? '&' : '?';
        return `${paymentLink}${sep}customer_email=${encodeURIComponent(user.email)}`;
    })();

    return (
        <div className="relative min-h-screen bg-black overflow-hidden">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/10 to-black pointer-events-none z-0" />

            <div className="relative z-10 max-w-2xl mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                        <Clock className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Your account is almost ready</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mx-auto">
                        Welcome{user?.email ? <>, <span className="text-white font-medium">{user.email}</span></> : ''}!
                        Your account was created successfully. To unlock the dashboard, complete your payment —
                        your access activates as soon as it's confirmed.
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
                        <Sparkles className="w-3.5 h-3.5" /> 3. Access unlocks
                    </span>
                </div>

                {/* Single plan card */}
                <div className="rounded-2xl p-8 flex flex-col bg-[#050A08] border border-emerald-500/30 shadow-[0_0_40px_-12px_rgba(16,185,129,0.3)] mb-10">
                    <span className="self-start px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold mb-4">
                        Founding Member
                    </span>

                    <h3 className="text-lg font-semibold text-white mb-4">
                        One plan. Full access. Zero setup fee.
                    </h3>

                    {/* Billing toggle */}
                    <div className="flex gap-1 bg-white/3 border border-white/5 rounded-xl p-1 w-fit mb-5">
                        <button
                            onClick={() => setBilling('monthly')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                billing === 'monthly'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBilling('annual')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                billing === 'annual'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'text-zinc-600 hover:text-zinc-400'
                            }`}
                        >
                            Annual
                        </button>
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-2 flex-wrap mb-1">
                        <span className="text-3xl font-bold text-white">
                            {billing === 'monthly' ? '$97' : '$970'}
                        </span>
                        <span className="text-base font-semibold text-white">
                            {billing === 'monthly' ? '/month' : '/year'}
                        </span>
                        {billing === 'annual' && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold">
                                2 months free
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-500 mb-5">Cancel anytime. 7-day money-back guarantee.</p>

                    {/* Features */}
                    <p className="text-xs font-semibold text-white mb-3">What's included:</p>
                    <ul className="space-y-2 mb-5">
                        {FEATURES.map(f => (
                            <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                                <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                {f}
                            </li>
                        ))}
                    </ul>

                    {/* Founding Member Bonus */}
                    <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4 mb-6">
                        <Gift className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-300">
                            <strong className="text-white">Founding Member Bonus:</strong>{' '}
                            I'll personally optimize your first campaign with you on a 30-minute call.
                        </p>
                    </div>

                    {/* Pay button */}
                    <a
                        href={paymentHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all bg-emerald-500 hover:bg-emerald-400 text-emerald-950"
                    >
                        {paymentLink ? <CreditCard className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                        {paymentLink
                            ? (billing === 'monthly' ? 'Pay $97/month' : 'Pay $970/year')
                            : 'Contact us to pay'}
                    </a>
                </div>

                {/* Already paid */}
                <div className="rounded-2xl bg-[#050A08] border border-white/8 p-6 text-center">
                    <p className="text-sm text-zinc-400 mb-4">
                        Already paid? Your account unlocks automatically within a minute of payment — click below to refresh.
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
                            Not activated yet — if you've already paid, hang tight. Access unlocks as soon as payment is confirmed.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PendingActivationPage;
