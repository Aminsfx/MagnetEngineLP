import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Shield, Calendar, Gift } from 'lucide-react';
import { PRICES, type BillingCycle } from '../lib/plans';

const FEATURES = [
    '500 leads/month',
    '3 campaigns/month',
    'AI writes every DM for you, no API keys needed',
    'Production Mode sending',
    'Full approval queue + CRM',
    'CSV/JSON export',
    '3 pre-built niche scripts',
    'Direct Slack access to founder',
];

const Pricing: React.FC = () => {
    const [billing, setBilling] = useState<BillingCycle>('monthly');

    return (
        <section id="pricing" className="py-32 px-6 relative overflow-hidden bg-surface">
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-6 space-y-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mb-2">Pricing</div>
                    <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight drop-shadow-md">
                        One plan. Full access. Zero setup fee.
                    </h2>
                    <p className="text-neutral-400 text-lg font-light">
                        Every day without this, you're leaving 5-10 client conversations on the table.
                    </p>
                </div>

                {/* Single pricing card */}
                <div className="relative group max-w-lg mx-auto mt-16">
                    <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 via-info-500 to-brand-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition duration-700 animate-pulse"></div>

                    <div className="relative rounded-3xl p-8 bg-surface-raised border-2 border-brand-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col">
                        {/* Badge */}
                        <div className="mb-5">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700">
                                Founding Member
                            </span>
                        </div>

                        {/* Billing toggle */}
                        <div className="flex gap-1 bg-white/3 border border-white/5 rounded-xl p-1 w-fit mb-6">
                            <button
                                onClick={() => setBilling('monthly')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    billing === 'monthly'
                                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                        : 'text-neutral-600 hover:text-neutral-400'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBilling('annual')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    billing === 'annual'
                                        ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                        : 'text-neutral-600 hover:text-neutral-400'
                                }`}
                            >
                                Annual
                            </button>
                        </div>

                        {/* Price */}
                        <div className="mb-8">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-5xl font-bold tracking-tight text-white">
                                    {PRICES[billing].label}
                                </span>
                                <span className="text-xl font-semibold text-white">
                                    {PRICES[billing].suffix}
                                </span>
                                {billing === 'annual' && (
                                    <span className="px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-400 text-[11px] font-semibold">
                                        2 months free
                                    </span>
                                )}
                            </div>
                            <p className="text-sm mt-2 text-neutral-300">
                                3-day free trial. Cancel anytime before it ends and you pay nothing.
                            </p>
                        </div>

                        {/* Features */}
                        <p className="text-sm font-semibold text-white mb-4">What's included:</p>
                        <div className="space-y-4 mb-8 flex-grow">
                            {FEATURES.map((feature, fIndex) => (
                                <div key={fIndex} className="flex items-start gap-3">
                                    <div className="mt-0.5 flex-shrink-0">
                                        <Check className="text-brand-500" size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="text-sm text-neutral-300">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* Founding Member Bonus */}
                        <div className="flex items-start gap-3 bg-brand-500/8 border border-brand-500/20 rounded-xl p-4 mb-8">
                            <Gift className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-neutral-300">
                                <strong className="text-white">Founding Member Bonus:</strong>{' '}
                                I'll personally optimize your first campaign with you on a 30-minute call.
                            </p>
                        </div>

                        {/* CTA */}
                        <Link
                            to="/login?mode=signup"
                            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 mt-auto text-center block bg-brand-500 hover:bg-brand-400 text-brand-950"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>

                {/* Trust bar */}
                <div className="mt-16 text-center space-y-6">
                    {/* Guarantee */}
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-surface-raised border border-white/5 rounded-2xl">
                        <Shield size={20} className="text-brand-400" />
                        <span className="text-neutral-300 text-sm">
                            <strong className="text-white">3-day free trial.</strong> Cancel any time before it ends and you pay nothing. See Terms for details.
                        </span>
                    </div>

                    {/* ROI math */}
                    <p className="text-neutral-500 text-sm max-w-lg mx-auto">
                        Your clients are worth $1,000+. One closed deal from MagnetEngine pays for a lifetime of access.
                    </p>

                    {/* Book a call fallback */}
                    <div className="pt-4">
                        <button
                            data-cal-link="magnetengine/15min"
                            data-cal-namespace="15min"
                            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                            className="text-neutral-400 hover:text-white text-sm underline underline-offset-4 transition-colors flex items-center gap-2 mx-auto"
                        >
                            <Calendar size={14} />
                            Questions? Book a free 15-min demo call
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
