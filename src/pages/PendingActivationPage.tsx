import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Mail, Check, Loader2, Lock } from 'lucide-react';
import { WhopCheckoutEmbed } from '@whop/checkout/react';
import { useAuth } from '../contexts/AuthContext';
import { usePlan } from '../contexts/PlanContext';
import { WHOP_PLAN_IDS, PRICES, UPGRADE_CONTACT, PLAN_LIMITS } from '../lib/plans';
import type { BillingCycle } from '../lib/plans';
import { SURFACE, POSITIVE } from '../lib/theme';
import Logo from '../components/Logo';
import { TrialTimeline } from '../components/auth/TrialTimeline';

const FEATURES = [
    `${PLAN_LIMITS.maxLeadsPerMonth.toLocaleString('en-US')} leads/month`,
    `${PLAN_LIMITS.maxCampaignsPerMonth} campaigns/month`,
    'AI writes every DM for you, no API keys needed',
    'Production Mode sending',
    'Full approval queue + CRM',
    'CSV/JSON export',
    '3 pre-built niche scripts',
    'Direct Slack access to founder',
];

/**
 * Shown to signed-in users whose subscription is not yet activated.
 * Flow: user pays via the embedded Whop checkout (email locked to their signup
 * email) → the whop-webhook (or the owner via /admin) activates the account →
 * this page polls status and lands them in the dashboard.
 */
const PendingActivationPage: React.FC = () => {
    const { user, signOut } = useAuth();
    const { refresh, status, loading } = usePlan();
    const navigate = useNavigate();

    const [checking, setChecking] = useState(false);
    const [stillPending, setStillPending] = useState(false);
    const [billing, setBilling] = useState<BillingCycle>('monthly');
    const [awaitingActivation, setAwaitingActivation] = useState(false);
    const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // If the subscription is (or becomes) active, this page shouldn't be shown
    useEffect(() => {
        if (!loading && status === 'active') {
            navigate('/dashboard', { replace: true });
        }
    }, [loading, status, navigate]);

    // Clear any pending poll timer on unmount
    useEffect(() => () => {
        if (pollTimer.current) clearTimeout(pollTimer.current);
    }, []);

    // After Whop reports the checkout complete, poll until the webhook has
    // flipped the subscription to active (usually a few seconds).
    const handleCheckoutComplete = useCallback(() => {
        setAwaitingActivation(true);
        setStillPending(false);

        let attempts = 0;
        const poll = async () => {
            attempts += 1;
            const s = await refresh();
            if (s === 'active') {
                navigate('/dashboard', { replace: true });
                return;
            }
            if (attempts >= 20) { // ~60s — webhook should have landed by now
                setAwaitingActivation(false);
                setStillPending(true);
                return;
            }
            pollTimer.current = setTimeout(poll, 3000);
        };
        poll();
    }, [refresh, navigate]);

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

    const planId = WHOP_PLAN_IDS[billing];

    /*
     * A checkout, laid out like one: what you're buying and when you'll be
     * charged on the left, the payment form on the right. It used to be a
     * centred column of badges, a glowing plan card and a step row of pills
     * over the landing page's grid — a marketing page wearing a checkout.
     */
    return (
        <div className="min-h-[100dvh] bg-surface">
            <header className="border-b border-white/8">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
                    <Logo size="sm" linkTo="/" />
                    <div className="flex items-center gap-4 min-w-0">
                        {user?.email && (
                            <span className="hidden sm:inline text-meta text-neutral-400 truncate">
                                Signed in as <span className="text-neutral-200">{user.email}</span>
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="flex-none inline-flex items-center gap-1.5 text-meta font-medium text-neutral-300 hover:text-white transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5" aria-hidden />
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-12 lg:py-16 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-12 lg:gap-16 items-start">
                {/* ── What you're buying ───────────────────────────────────── */}
                <section aria-labelledby="summary-title">
                    <h1 id="summary-title" className="font-semibold text-white tracking-[-0.035em] leading-[1.02] text-balance" style={{ fontSize: 'clamp(2rem, 3.6vw, 2.9rem)' }}>
                        Start your 3-day trial
                    </h1>
                    <p className="mt-4 text-body text-neutral-400 max-w-[46ch]">
                        Your account is ready. Add a card to open the dashboard — nothing is charged until the trial ends.
                    </p>

                    {/* Billing */}
                    <div className="mt-10 flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-white/8">
                        <div>
                            <p className="text-label uppercase tracking-[0.12em] text-neutral-400">Founding member · one plan</p>
                            <p className="mt-2 flex items-baseline gap-2">
                                <span className="text-[2.75rem] leading-none font-semibold text-white tracking-[-0.04em] tabular-nums">
                                    {PRICES[billing].label}
                                </span>
                                <span className="text-body text-neutral-400">{PRICES[billing].suffix}</span>
                            </p>
                        </div>
                        <div role="radiogroup" aria-label="Billing" className="flex gap-1 p-1 rounded-xl bg-surface-raised border border-white/8">
                            {(['monthly', 'annual'] as BillingCycle[]).map(cycle => (
                                <button
                                    key={cycle}
                                    type="button"
                                    role="radio"
                                    aria-checked={billing === cycle}
                                    onClick={() => setBilling(cycle)}
                                    className={`px-4 py-2 rounded-lg text-meta font-semibold transition-colors ${
                                        billing === cycle ? 'bg-white text-surface' : 'text-neutral-300 hover:text-white'
                                    }`}
                                >
                                    {cycle === 'monthly' ? 'Monthly' : 'Annual · 2 months free'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* When things happen */}
                    <div className="py-8 border-b border-white/8">
                        <TrialTimeline at={1} billing={billing} />
                    </div>

                    {/* What's included */}
                    <div className="py-8">
                        <h2 className="text-meta font-semibold text-white mb-4">Included</h2>
                        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                            {FEATURES.map(f => (
                                <li key={f} className="flex items-start gap-2.5 text-meta text-neutral-300">
                                    <Check className="w-3.5 h-3.5 text-white flex-shrink-0 mt-[3px]" strokeWidth={2.6} aria-hidden />
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <p className="mt-6 text-meta text-neutral-300 max-w-[52ch]">
                            <span className="font-semibold text-white">Founding member bonus:</span>{' '}
                            I'll personally optimize your first campaign with you on a 30-minute call.
                        </p>
                    </div>
                </section>

                {/* ── Payment ───────────────────────────────────────────────── */}
                <section aria-label="Payment" className="lg:sticky lg:top-8">
                    <div className="rounded-[1.25rem] border border-white/10 bg-surface-raised overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8 text-meta text-neutral-300">
                            <Lock className="w-3.5 h-3.5" aria-hidden />
                            Secure checkout by Whop
                        </div>

                        {awaitingActivation ? (
                            <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                                <Loader2 className="w-6 h-6 text-positive-400 animate-spin" aria-hidden />
                                <p className="text-body-sm text-white font-medium">Payment received — opening your dashboard…</p>
                                <p className="text-meta text-neutral-400">This usually takes a few seconds.</p>
                            </div>
                        ) : planId ? (
                            <WhopCheckoutEmbed
                                key={billing}
                                planId={planId}
                                theme="dark"
                                // Paying is the confirming action, so Whop's button takes the
                                // dashboard's green: the one hue it has, and what it means.
                                themeOptions={{ accentColor: POSITIVE[500], backgroundColor: SURFACE.raised, borderRadius: 12 }}
                                prefill={user?.email ? { email: user.email } : undefined}
                                disableEmail={!!user?.email}
                                onComplete={handleCheckoutComplete}
                                fallback={
                                    <div role="status" className="flex items-center justify-center gap-2 py-16 text-neutral-400 text-body-sm">
                                        <Loader2 className="w-4 h-4 animate-spin text-neutral-300" aria-hidden />
                                        Loading secure checkout…
                                    </div>
                                }
                            />
                        ) : (
                            <div className="p-6">
                                <p className="text-body-sm text-neutral-300 mb-4">
                                    Online checkout isn't switched on yet. Email us and we'll set up your trial by hand.
                                </p>
                                <a
                                    href={UPGRADE_CONTACT}
                                    className="w-full flex items-center justify-center gap-2 h-12 rounded-full font-semibold text-body-sm transition-colors bg-white hover:bg-neutral-200 text-surface"
                                >
                                    <Mail className="w-4 h-4" aria-hidden />
                                    Email us to start
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Already paid */}
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1">
                        <p className="text-meta text-neutral-400 max-w-[34ch]">
                            Already paid? Access opens within a minute of payment.
                        </p>
                        <button
                            type="button"
                            onClick={handleCheck}
                            disabled={checking}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-meta font-semibold text-white hover:bg-white/5 disabled:opacity-60 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} aria-hidden />
                            {checking ? 'Checking…' : 'Check again'}
                        </button>
                    </div>
                    {stillPending && (
                        <p role="status" className="mt-3 px-1 text-meta text-caution-300">
                            Not active yet. If you've just paid, give it a minute and check again — it unlocks as soon as the payment is confirmed.
                        </p>
                    )}
                </section>
            </main>
        </div>
    );
};

export default PendingActivationPage;
