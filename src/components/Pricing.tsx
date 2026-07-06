import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Shield, Calendar } from 'lucide-react';

const tiers = [
    {
        name: 'Starter',
        tagline: 'Test the engine',
        highlight: false,
        badge: { text: 'Self-serve', className: 'bg-white/10 text-zinc-300' },
        priceDetails: {
            originalPrice: null,
            price: '$197',
            suffix: 'setup',
            subtext: '+ $47/month · cancel anytime'
        },
        cta: 'Get Started',
        selfServe: true,
        ctaStyle: 'border border-white/10 hover:border-white/20 text-white bg-transparent hover:bg-white/5',
        features: [
            'AI DM generation (1 provider)',
            'Chrome Extension auto-send',
            'Up to 100 leads per campaign',
            'Approval Queue',
            'Test Mode only (30s delays)',
            'Setup guide + Loom walkthrough'
        ]
    },
    {
        name: 'Pro',
        tagline: 'The full acquisition machine',
        highlight: true,
        badge: { text: 'Most popular · Founding 20', className: 'bg-[#e6fcf1] text-[#047857]' },
        priceDetails: {
            originalPrice: '$597 setup',
            price: '$397',
            suffix: 'setup',
            subtext: '+ $97/month · cancel anytime'
        },
        cta: 'Claim Founding Spot',
        selfServe: true,
        ctaStyle: 'border border-white/10 hover:border-white/20 text-white bg-transparent hover:bg-white/5',
        features: [
            'Everything in Starter',
            'Production Mode (15–45 min delays)',
            'Unlimited leads per campaign',
            'Adjustable daily DM cap',
            '3 pre-built niche DM scripts',
            'Private Discord community',
            'Priority updates + support',
            '7-day results guarantee'
        ]
    },
    {
        name: 'Agency',
        tagline: 'We build and run it all',
        highlight: false,
        badge: { text: 'Done-for-you · 3 spots', className: 'bg-[#f3e8ff] text-[#6b21a8]' },
        priceDetails: {
            originalPrice: null,
            price: '$1,497',
            suffix: '/mo',
            subtext: 'No setup fee · application only'
        },
        cta: 'Apply for a Spot',
        selfServe: false,
        ctaStyle: 'border border-white/10 hover:border-white/20 text-white bg-transparent hover:bg-white/5',
        features: [
            'Everything in Pro',
            'We write your system prompt',
            'We run your campaigns weekly',
            'We handle reply inbox for you',
            'Booked calls land on your calendar',
            'Weekly performance report',
            '1-on-1 onboarding call',
            'Direct Slack access to founder',
            '5 booked calls guarantee'
        ]
    }
];

const Pricing: React.FC = () => {
    return (
        <section id="pricing" className="py-32 px-6 relative overflow-hidden bg-[#030604]">
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-6 space-y-4">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Pricing</div>
                    <h2 className="text-4xl md:text-5xl font-medium text-white tracking-tight drop-shadow-md">
                        One Deal Pays For Itself
                    </h2>
                    <p className="text-zinc-400 text-lg font-light">
                        Every day without this, you're leaving 5-10 client conversations on the table.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto mt-16">
                    {tiers.map((tier, index) => {
                        return (
                            <div
                                key={index}
                                className={`relative group ${tier.highlight ? 'lg:-mt-4 lg:mb-4' : ''}`}
                            >
                                {/* Glow effect for Pro */}
                                {tier.highlight && (
                                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 via-cyan-500 to-emerald-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-30 transition duration-700 animate-pulse"></div>
                                )}

                                <div className={`relative rounded-3xl p-8 transition-all duration-300 h-full flex flex-col ${
                                    tier.highlight
                                        ? 'bg-[#050A08] border-2 border-emerald-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
                                        : 'bg-[#050A08] border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:border-white/10'
                                }`}>
                                    
                                    {/* Inner Badge */}
                                    <div className="mb-5">
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${tier.badge.className}`}>
                                            {tier.badge.text}
                                        </span>
                                    </div>

                                    {/* Header */}
                                    <div className="mb-6">
                                        <h3 className="text-2xl font-semibold tracking-tight text-white mb-1">
                                            {tier.name}
                                        </h3>
                                        <p className="text-zinc-400 text-sm">{tier.tagline}</p>
                                    </div>

                                    <div className="h-px w-full bg-white/10 mb-6"></div>

                                    {/* Price */}
                                    <div className="mb-8">
                                        {tier.priceDetails.originalPrice && (
                                            <div className="text-sm text-zinc-500 line-through mb-1">
                                                {tier.priceDetails.originalPrice}
                                            </div>
                                        )}
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-bold tracking-tight text-white">
                                                {tier.priceDetails.price}
                                            </span>
                                            {tier.priceDetails.suffix && (
                                                <span className="text-xl font-semibold text-white">
                                                    {tier.priceDetails.suffix}
                                                </span>
                                            )}
                                        </div>
                                        {tier.priceDetails.subtext && (
                                            <p className="text-sm mt-2 text-zinc-300">
                                                {tier.priceDetails.subtext}
                                            </p>
                                        )}
                                    </div>

                                    {/* Features */}
                                    <div className="space-y-4 mb-8 flex-grow">
                                        {tier.features.map((feature, fIndex) => (
                                            <div key={fIndex} className="flex items-start gap-3">
                                                <div className="mt-0.5 flex-shrink-0">
                                                    <Check className="text-emerald-500" size={18} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-sm text-zinc-300">
                                                    {feature}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA Button — self-serve tiers go to sign-up; Agency books a call */}
                                    {tier.selfServe ? (
                                        <Link
                                            to="/login?mode=signup"
                                            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 mt-auto text-center block ${tier.ctaStyle}`}
                                        >
                                            {tier.cta}
                                        </Link>
                                    ) : (
                                        <button
                                            data-cal-link="magnetengine/15min"
                                            data-cal-namespace="15min"
                                            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                                            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 mt-auto ${tier.ctaStyle}`}
                                        >
                                            {tier.cta}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Trust bar */}
                <div className="mt-16 text-center space-y-6">
                    {/* Guarantee */}
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#050A08] border border-white/5 rounded-2xl">
                        <Shield size={20} className="text-emerald-400" />
                        <span className="text-zinc-300 text-sm">
                            <strong className="text-white">7-Day Results Guarantee</strong> — Get 3+ replies or full refund. No questions asked.
                        </span>
                    </div>

                    {/* ROI math */}
                    <p className="text-zinc-500 text-sm max-w-lg mx-auto">
                        Your clients are worth $1,000+. One closed deal from MagnetEngine pays for a lifetime of access.
                    </p>

                    {/* Book a call fallback */}
                    <div className="pt-4">
                        <button
                            data-cal-link="magnetengine/15min"
                            data-cal-namespace="15min"
                            data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                            className="text-zinc-400 hover:text-white text-sm underline underline-offset-4 transition-colors flex items-center gap-2 mx-auto"
                        >
                            <Calendar size={14} />
                            Not sure which plan? Book a free 15-min demo call
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Pricing;
