import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, ArrowUpRight, Check, X, Plus, Minus,
    Search, PenLine, Send, Shield, BadgeCheck,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { alpha, CARD_BEZEL, CHANNEL } from '../lib/theme';
import { PRICES, type BillingCycle } from '../lib/plans';

/**
 * The marketing landing page.
 *
 * Rendered in the dashboard's own visual language rather than a separate
 * landing-page one: `surface` grounds, `CARD_BEZEL` tiles on `surface-sunken`,
 * `positive-500/10` icon chips, emerald accents, Plus Jakarta Sans, and the
 * app's own Navbar and Footer. The page a visitor signs up from and the product
 * they land in are the same object, so the handoff at checkout has no seam.
 *
 * The card below mirrors MetricsGrid's tile exactly — bezel wrapper, sunken
 * fill, hover glow orb, hairline accent on hover — because matching the product
 * means matching how a surface behaves, not only what colour it is.
 *
 * Copy notes, since these decide conversion and are easy to erode:
 *  - No customer logos. The previous hero carried four invented company names
 *    under "Trusted by scaling agencies & global teams"; a buyer who googles one
 *    and finds nothing is gone. A real, owner-maintained seat count replaces it.
 *  - One guarantee: the 7-day refund that exists in Terms. Nothing here promises
 *    a reply count or a result, because nothing here controls one.
 *  - The Instagram-safety answer states plainly that automated DMs breach IG's
 *    terms. That loses the buyers who would have refunded anyway and keeps the
 *    ones who were going to read the Terms regardless.
 *
 * Claims are checked against the code — send pacing and the 40/day default come
 * from `extension/background.js`, quotas from `PLAN_LIMITS`. SEATS_CLAIMED is a
 * real number the owner edits, never a countdown that resets.
 */

const SEATS_CLAIMED = 7;
const SEATS_TOTAL = 100;
const ANCHOR_PRICE = '$497';

// ─── Drawn imagery ────────────────────────────────────────────────────────────

/** Deterministic avatar gradient, so the same handle always looks the same. */
function avatarGradient(seed: string): string {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
    return `linear-gradient(135deg, hsl(${h} 55% 62%), hsl(${(h + 48) % 360} 60% 45%))`;
}

const Avatar: React.FC<{ handle: string; size?: number }> = ({ handle, size = 34 }) => (
    <div
        className="rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white"
        style={{ width: size, height: size, background: avatarGradient(handle), fontSize: size * 0.36 }}
    >
        {handle.slice(0, 2).toUpperCase()}
    </div>
);

/** A scraped lead, as the product shows it. */
const LeadRow: React.FC<{ handle: string; meta: string; tag?: string }> = ({ handle, meta, tag }) => (
    <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface-overlay border border-white/6">
        <Avatar handle={handle} />
        <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-white truncate">@{handle}</span>
                <BadgeCheck size={13} className="flex-shrink-0 text-positive-400" />
            </div>
            <div className="text-[11px] text-neutral-600 truncate">{meta}</div>
        </div>
        {tag && (
            <span className="text-[10px] font-semibold px-2 py-1 rounded-md flex-shrink-0 bg-positive-500/10 border border-positive-500/15 text-positive-400">
                {tag}
            </span>
        )}
    </div>
);

/** The DM the AI wrote, as a chat mockup. The hero's centrepiece. */
const DmThread: React.FC = () => (
    <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
        <div className="rounded-[calc(1.5rem-1px)] overflow-hidden bg-surface-sunken" style={CARD_BEZEL.inner}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/6">
                <Avatar handle="sara.builds" size={28} />
                <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-white">@sara.builds</div>
                    <div className="text-[10px] text-neutral-600">Active now</div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-info-500/10 border border-info-500/15 text-info-400">
                    AI draft
                </span>
            </div>

            <div className="p-4 space-y-3">
                <div className="rounded-2xl rounded-tr-md px-3.5 py-2.5 ml-auto max-w-[88%] bg-brand-500">
                    <p className="text-[12.5px] leading-relaxed text-brand-950 font-medium">
                        hey Sara — saw you run online fitness coaching for new moms, that postpartum angle
                        is smart. quick one: are you still doing your own prospecting or did you hand that off?
                    </p>
                </div>
                <div className="flex justify-end">
                    <span className="text-[10px] text-neutral-700">Delivered · 7:42 AM</span>
                </div>
                <div className="rounded-2xl rounded-tl-md px-3.5 py-2.5 max-w-[80%] bg-surface-overlay border border-white/6">
                    <p className="text-[12.5px] leading-relaxed text-neutral-200">
                        ha, still doing it myself unfortunately 😅 what do you have in mind?
                    </p>
                </div>
            </div>

            <div className="px-4 py-2.5 flex items-center gap-2 border-t border-white/6 bg-positive-500/6">
                <span className="w-1.5 h-1.5 rounded-full bg-positive-400" />
                <span className="text-[11px] font-medium text-positive-400">
                    Reply logged · lead moved to Warm
                </span>
            </div>
        </div>
    </div>
);

// ─── Shared ───────────────────────────────────────────────────────────────────

/**
 * The dashboard's tile, verbatim: bezel wrapper, sunken fill, a glow orb that
 * blooms on hover and a hairline that fades in along the bottom edge. Matching
 * the product means matching how a card behaves, not only its colour.
 */
const Card: React.FC<{
    children: React.ReactNode;
    className?: string;
    hot?: boolean;
}> = ({ children, className = '', hot }) => (
    <div className="rounded-[1.5rem] p-[1px] h-full" style={hot ? { background: `linear-gradient(135deg, ${alpha(CHANNEL.brand, 0.22)} 0%, ${alpha(CHANNEL.white, 0.02)} 100%)` } : CARD_BEZEL.outer}>
        <div
            className={`rounded-[calc(1.5rem-1px)] h-full relative overflow-hidden group ${hot ? 'bg-brand-500/6' : 'bg-surface-sunken'} ${className}`}
            style={CARD_BEZEL.inner}
        >
            <div
                aria-hidden
                className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
                style={{ background: alpha(CHANNEL.brand, 0.18) }}
            />
            <div className="relative z-10 h-full">{children}</div>
            <div
                aria-hidden
                className="absolute bottom-0 left-5 right-5 h-[1px] bg-gradient-to-r from-transparent via-brand-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
        </div>
    </div>
);

/** The dashboard's section label: 10px, uppercase, widely tracked, zinc. */
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="text-[10px] font-medium uppercase tracking-widest text-neutral-600 mb-4">
        {children}
    </div>
);

const Section: React.FC<{ children: React.ReactNode; id?: string; className?: string }> = ({
    children, id, className = '',
}) => (
    <section id={id} className={`relative px-6 py-24 md:py-28 bg-surface ${className}`}>
        {children}
    </section>
);

// ─── Hero ─────────────────────────────────────────────────────────────────────

const HzHero: React.FC = () => (
    <section className="relative overflow-hidden pt-36 pb-24 px-6 bg-surface">
        {/* Ambient emerald bloom — the same atmosphere the Sidebar uses */}
        <div
            aria-hidden
            className="absolute inset-x-0 top-0 pointer-events-none -z-10"
            style={{
                bottom: '30%',
                background:
                    'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(16,185,129,0.24) 0%, rgba(16,185,129,0.10) 35%, rgba(34,211,238,0.05) 65%, transparent 85%)',
                filter: 'blur(70px)',
            }}
        />

        <div className="max-w-6xl mx-auto relative z-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
            <div>
                {/* A real, checkable number — not "V2.0 Now Live" */}
                <div
                    className="inline-block p-px rounded-full mb-8"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(16,185,129,0.22), rgba(255,255,255,0.04))' }}
                >
                    <div
                        className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface"
                        style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06)' }}
                    >
                        <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500" />
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                            Founding Member
                        </span>
                        <span className="w-px h-3 bg-white/12" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-400">
                            {SEATS_CLAIMED} of {SEATS_TOTAL} seats claimed
                        </span>
                    </div>
                </div>

                <h1
                    className="font-bold text-white tracking-[-0.04em] leading-[0.98] mb-7"
                    style={{ fontSize: 'clamp(2.6rem, 5.4vw, 4.5rem)' }}
                >
                    Your next 20 clients<br />
                    are already following{' '}
                    <span
                        style={{
                            background: 'linear-gradient(135deg, #6ee7b7 0%, #34d399 40%, #22d3ee 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        someone else.
                    </span>
                </h1>

                <p className="text-[1.1rem] font-light leading-[1.65] text-neutral-400 mb-4 max-w-xl">
                    MagnetEngine finds them on Instagram, writes a real DM to each one —{' '}
                    <span className="text-neutral-200 font-normal">not a template</span> — and sends it
                    from your account while you sleep.
                </p>
                <p className="text-[15px] text-neutral-600 mb-10">
                    You approve messages for ten minutes a day. That's the whole job.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <a
                        href="#pricing"
                        className="group flex items-center gap-3 pl-6 pr-[7px] py-[7px] rounded-full bg-brand-500 hover:bg-brand-400 active:scale-[0.98]"
                        style={{
                            boxShadow: '0 0 28px rgba(16,185,129,0.3), 0 0 80px rgba(16,185,129,0.08)',
                            transition: 'all 700ms cubic-bezier(0.32,0.72,0,1)',
                        }}
                    >
                        <span className="text-[15px] font-semibold text-brand-950 leading-none">
                            Get my first 500 DMs
                        </span>
                        <span
                            className="w-8 h-8 rounded-full bg-brand-950/20 flex items-center justify-center group-hover:translate-x-0.5"
                            style={{ transition: 'transform 700ms cubic-bezier(0.32,0.72,0,1)' }}
                        >
                            <ArrowRight size={14} className="text-brand-950" strokeWidth={2.5} />
                        </span>
                    </a>
                    <button
                        data-cal-link="magnetengine/15min"
                        data-cal-namespace="15min"
                        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                        className="px-6 py-3.5 rounded-full border border-white/8 bg-white/3 text-neutral-300 hover:text-white hover:border-white/15 hover:bg-white/6 active:scale-[0.98] text-[15px] font-medium"
                        style={{ transition: 'all 700ms cubic-bezier(0.32,0.72,0,1)' }}
                    >
                        Show me my leads first
                    </button>
                </div>
            </div>

            {/* The picture: the product, drawn */}
            <div className="relative">
                <div className="relative lg:rotate-[1.2deg] transition-transform duration-500 hover:rotate-0">
                    <DmThread />
                </div>
                <div className="mt-4 space-y-2 lg:-rotate-[0.8deg]">
                    <LeadRow handle="grow.with.dan" meta="4.2k followers · Meta ads, Austin" tag="Match" />
                    <LeadRow handle="leila.scales" meta="11.8k followers · SMMA, retainers" tag="Match" />
                </div>
            </div>
        </div>
    </section>
);

// ─── Problem ──────────────────────────────────────────────────────────────────

const HzProblem: React.FC = () => (
    <Section id="problem">
        <div className="max-w-4xl mx-auto">
            <div className="text-center">
                <Eyebrow>The actual problem</Eyebrow>
                <h2 className="text-3xl md:text-[2.75rem] font-medium text-white tracking-tight leading-[1.15] mb-16">
                    You don't have a lead problem.<br />
                    <span className="text-neutral-500">You have a "nobody knows you exist" problem.</span>
                </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {[
                    {
                        label: 'Where you are',
                        body: 'Six clients. Referrals dried up. You post, it gets 40 views, and none of them can afford you.',
                    },
                    {
                        label: 'Where you want to be',
                        body: 'A calendar with names in it. Fifteen clients. Conversations happening whether or not you feel like starting them.',
                    },
                    {
                        label: "What's in the way",
                        body: "Nobody is filling the top of your funnel. You know cold DMs work. You just can't send 200 a day and run the business too.",
                        highlight: true,
                    },
                ].map(({ label, body, highlight }) => (
                    <Card key={label} hot={highlight} className="p-6">
                        <div
                            className={`text-[10px] font-medium uppercase tracking-widest mb-3 ${
                                highlight ? 'text-brand-400' : 'text-neutral-600'
                            }`}
                        >
                            {label}
                        </div>
                        <p className="text-[15px] font-light leading-relaxed text-neutral-300">{body}</p>
                    </Card>
                ))}
            </div>

            <p className="text-center mt-12 text-lg font-light leading-[1.7] text-neutral-400 max-w-2xl mx-auto">
                A VA costs $800 a month and sends the same message to everyone, which is why
                the reply rate is 1%. A $47 bot gets your account restricted.{' '}
                <span className="text-white font-normal">There was no third option. Now there is.</span>
            </p>
        </div>
    </Section>
);

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
    {
        icon: Search,
        step: '01',
        title: 'It finds them',
        body: 'Type "SMMA" or "business coach". MagnetEngine pulls matching Instagram profiles and filters out everyone who isn\'t worth your time — wrong follower count, wrong keywords, wrong account type.',
        stat: '500 leads a month',
    },
    {
        icon: PenLine,
        step: '02',
        title: 'It writes each one individually',
        body: "The AI reads each person's actual bio and writes one message to one human. No merge tags. No \"Hey! Love your page 🔥\". If a message reads like a robot wrote it, we've failed and you'll see it in the queue.",
        stat: 'One DM per profile',
    },
    {
        icon: Send,
        step: '03',
        title: 'It sends while you sleep',
        body: 'You approve the ones you like — 10 minutes with your coffee. The Chrome extension sends from your own browser, at a pace and daily cap you set. Replies land in one inbox with a draft response ready.',
        stat: 'Your cap, your pace',
    },
];

const HzHowItWorks: React.FC = () => (
    <Section id="features">
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
                <Eyebrow>How it works</Eyebrow>
                <h2 className="text-3xl md:text-[2.75rem] font-medium text-white tracking-tight leading-[1.15]">
                    Three things happen. You do one of them.
                </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {STEPS.map(({ icon: Icon, step, title, body, stat }) => (
                    <Card key={step} className="p-7 flex flex-col">
                        <div className="flex items-start justify-between mb-6">
                            <div className="w-9 h-9 rounded-xl border bg-positive-500/10 border-positive-500/15 flex items-center justify-center">
                                <Icon className="w-4 h-4 text-positive-400" strokeWidth={2} />
                            </div>
                            <span className="text-[11px] font-mono text-neutral-700">{step}</span>
                        </div>
                        <h3 className="text-white font-semibold text-lg tracking-tight mb-3">{title}</h3>
                        <p className="text-[15px] font-light leading-relaxed text-neutral-400 flex-grow">{body}</p>
                        <div className="mt-6 pt-5 border-t border-white/6">
                            <span className="text-[10px] font-medium uppercase tracking-widest text-brand-400">
                                {stat}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    </Section>
);

// ─── The math ─────────────────────────────────────────────────────────────────

const HzMath: React.FC = () => (
    <Section id="proof" className="overflow-hidden">
        <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-900/12 via-transparent to-transparent pointer-events-none"
        />
        <div className="max-w-3xl mx-auto relative z-10">
            <div className="text-center mb-14">
                <Eyebrow>The math</Eyebrow>
                <h2 className="text-3xl md:text-[2.75rem] font-medium text-white tracking-tight leading-[1.15]">
                    You need one client a year<br />for this to pay for itself.
                </h2>
            </div>

            <Card className="p-8 md:p-10">
                <div>
                    {[
                        ['500 DMs sent a month', 'your quota'],
                        ['≈ 40 replies', 'at an 8% reply rate'],
                        ['≈ 10 conversations worth having', 'a quarter of replies'],
                        ['≈ 2–3 booked calls', 'if you answer within 12 hours'],
                    ].map(([left, right], i) => (
                        <div
                            key={left}
                            className={`flex items-baseline justify-between gap-4 py-4 ${i !== 0 ? 'border-t border-white/6' : ''}`}
                        >
                            <span className="text-[15px] md:text-base font-medium text-white">{left}</span>
                            <span className="text-xs md:text-sm font-light text-neutral-600 text-right flex-shrink-0">
                                {right}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-8 border-t border-brand-500/20">
                    <p className="text-[15px] font-light leading-relaxed text-neutral-300">
                        If a client is worth <span className="text-white font-medium">$3,000</span> to you,
                        this has to work{' '}
                        <span className="text-white font-medium">once in twelve months</span> to break even.
                        Once a month and it's the best money you spend all year.
                    </p>
                    <p className="text-sm font-light text-neutral-500 mt-4">
                        I'm not selling you software. I'm selling you the conversations the software starts.
                    </p>
                </div>
            </Card>
        </div>
    </Section>
);

// ─── Comparison ───────────────────────────────────────────────────────────────

const HzCompare: React.FC = () => {
    const rows: [label: string, va: boolean, bot: boolean, us: boolean][] = [
        ['Writes a different message per person', false, false, true],
        ['Reads the profile before writing', false, false, true],
        ['You approve everything before it sends', true, false, true],
        ['Costs less than $250/month', false, true, true],
        ['Runs without you remembering to', false, true, true],
        ["Doesn't quit on you in month three", false, true, true],
    ];

    return (
        <Section>
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-14">
                    <Eyebrow>The honest comparison</Eyebrow>
                    <h2 className="text-3xl md:text-[2.75rem] font-medium text-white tracking-tight leading-[1.15]">
                        You've got three options.
                    </h2>
                </div>

                <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
                    <div className="rounded-[calc(1.5rem-1px)] bg-surface-sunken overflow-x-auto" style={CARD_BEZEL.inner}>
                        <table className="w-full min-w-[560px]">
                            <thead>
                                <tr className="border-b border-white/8">
                                    <th className="text-left p-5" />
                                    <th className="p-5 text-neutral-400 text-xs font-semibold">
                                        A VA<br /><span className="text-neutral-600 font-normal">$800/mo</span>
                                    </th>
                                    <th className="p-5 text-neutral-400 text-xs font-semibold">
                                        A $47 bot<br /><span className="text-neutral-600 font-normal">+ a ban risk</span>
                                    </th>
                                    <th className="p-5 text-brand-400 text-xs font-semibold bg-brand-500/8 border-x border-brand-500/20">
                                        MagnetEngine<br />
                                        <span className="text-brand-500/80 font-normal">{PRICES.monthly.label}/mo</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(([label, va, bot, us], i) => (
                                    <tr key={label} className={i !== 0 ? 'border-t border-white/4' : ''}>
                                        <td className="p-5 text-neutral-300 text-sm font-light">{label}</td>
                                        {[va, bot, us].map((v, j) => (
                                            <td
                                                key={j}
                                                className={`p-5 text-center ${j === 2 ? 'bg-brand-500/8 border-x border-brand-500/20' : ''}`}
                                            >
                                                {v ? (
                                                    <Check
                                                        size={17}
                                                        strokeWidth={2.5}
                                                        className={j === 2 ? 'text-brand-400 mx-auto' : 'text-neutral-500 mx-auto'}
                                                    />
                                                ) : (
                                                    <X size={17} strokeWidth={2.5} className="text-neutral-700 mx-auto" />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Section>
    );
};

// ─── Pricing ──────────────────────────────────────────────────────────────────

const FEATURES = [
    '500 ideal-client leads found for you every month',
    'Every DM written individually — no templates, no "Hey! Love your page 🔥"',
    'You approve messages in 10 minutes a day. We send the rest.',
    'Follow-up sequences that run themselves (most replies come from #2 and #3)',
    'Every reply in one inbox with an AI-drafted response ready to go',
    'Your CRM updates itself — replies, bookings, deals, all tracked',
    'No API keys, no AI accounts, no surprise bills. We pay for all of it.',
    'Direct Slack access to me. I answer.',
];

const HzPricing: React.FC = () => {
    const [billing, setBilling] = useState<BillingCycle>('annual');

    return (
        <Section id="pricing" className="overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center max-w-2xl mx-auto mb-14">
                    <Eyebrow>Pricing</Eyebrow>
                    <h2 className="text-3xl md:text-[2.75rem] font-medium text-white tracking-tight leading-[1.15]">
                        Cheaper than one cold-calling VA.<br />Works while you sleep.
                    </h2>
                </div>

                <div className="relative max-w-lg mx-auto">
                    <div
                        aria-hidden
                        className="absolute -inset-1 bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600 rounded-[2rem] blur-xl opacity-20"
                    />

                    <div className="relative rounded-[1.75rem] p-8 bg-surface-raised border-2 border-brand-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col">
                        <div className="mb-6 flex items-center justify-between">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-positive-500/10 border border-positive-500/15 text-positive-400">
                                Founding Member
                            </span>
                            <span className="text-xs text-neutral-500 font-medium">
                                {SEATS_CLAIMED}/{SEATS_TOTAL} claimed
                            </span>
                        </div>

                        {/* The anchor — the price they don't pay, shown first */}
                        <div className="flex items-baseline gap-3 mb-5 pb-5 border-b border-white/6">
                            <span className="text-neutral-600 text-sm">Standard price</span>
                            <span className="text-neutral-500 text-xl font-semibold line-through">
                                {ANCHOR_PRICE}/mo
                            </span>
                        </div>

                        <div className="flex gap-1 bg-white/3 border border-white/6 rounded-xl p-1 w-fit mb-6">
                            {(['monthly', 'annual'] as BillingCycle[]).map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setBilling(c)}
                                    className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                                        billing === c
                                            ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                                            : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>

                        <div className="mb-8">
                            <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-5xl font-bold tracking-tight text-white">
                                    {PRICES[billing].label}
                                </span>
                                <span className="text-xl font-semibold text-white">{PRICES[billing].suffix}</span>
                                {billing === 'annual' && (
                                    <span className="px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/25 text-brand-400 text-[11px] font-semibold">
                                        2 months free
                                    </span>
                                )}
                            </div>
                            <p className="text-sm mt-2 text-neutral-400">
                                Locked for life. When seat {SEATS_TOTAL} goes, the price is {ANCHOR_PRICE} — founding
                                members keep this rate forever.
                            </p>
                        </div>

                        <p className="text-sm font-semibold text-white mb-4">What you get:</p>
                        <div className="space-y-3.5 mb-8 flex-grow">
                            {FEATURES.map((f) => (
                                <div key={f} className="flex items-start gap-3">
                                    <Check className="text-brand-500 mt-0.5 flex-shrink-0" size={17} strokeWidth={2.5} />
                                    <span className="text-sm font-light leading-relaxed text-neutral-300">{f}</span>
                                </div>
                            ))}
                        </div>

                        {/* One guarantee — the 7-day refund that already exists in Terms */}
                        <div className="rounded-2xl bg-brand-500/8 border border-brand-500/20 p-5 mb-8">
                            <div className="flex items-start gap-3">
                                <Shield className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-white font-semibold mb-1">
                                        7-day money-back guarantee.
                                    </p>
                                    <p className="text-sm font-light leading-relaxed text-neutral-400">
                                        Give it a real shot in your first week — finish the setup, launch a campaign,
                                        send some approved DMs. If it's not for you, email us within 7 days of your
                                        first payment and we refund you in full. Full conditions in the Terms.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Link
                            to="/login?mode=signup"
                            className="w-full py-4 rounded-xl font-semibold text-sm text-center block bg-brand-500 hover:bg-brand-400 text-brand-950 transition-all duration-300"
                        >
                            Claim seat {SEATS_CLAIMED + 1} of {SEATS_TOTAL}
                        </Link>
                        <p className="text-center text-neutral-600 text-xs mt-4">
                            Cancel anytime, one email. No contract, no call to get out.
                        </p>
                    </div>
                </div>
            </div>
        </Section>
    );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const faqData = [
    {
        question: 'Is my Instagram account safe?',
        answer:
            "Straight answer: automated DMs are against Instagram's terms of service, and anyone who tells you otherwise is lying to you. Here's how we handle that. MagnetEngine sends from your own browser session, with a gap between each message and a daily cap you control — the default is 40 a day, and we recommend ramping up over two weeks rather than starting at full volume. Nothing sends without your approval, and we never see or store your Instagram password. In practice, the people who get restricted are the ones blasting hundreds of copy-pasted messages an hour from a fresh account. That's exactly the behaviour this is built to avoid — which is also why every DM is written individually. Run it on an account that's been active 30+ days, and don't run it on an account you can't afford to have restricted.",
    },
    {
        question: 'How is this different from the $47 Instagram bots?',
        answer:
            'Those send one template to everybody. That is why their reply rate is roughly 1% and why they get accounts restricted — Instagram is very good at spotting the same string sent 400 times. MagnetEngine reads each profile and writes one message to one person. That single difference is the entire reply rate, and it is the whole product.',
    },
    {
        question: 'How long until I see replies?',
        answer:
            'First campaign live within 48 hours of signing up. First replies typically day 2 to 4. Most booked calls come from follow-up messages 2 and 3, around day 7 to 10 — which is why the sequencer exists and why people who only ever send one message conclude that cold DMs do not work.',
    },
    {
        question: 'What if my niche does not work?',
        answer:
            "Find out before you pay: book the 15-minute call and I'll run a live scrape on your exact target list while you watch. If the leads come back thin, I'll tell you and we're done — I'd rather lose the sale than take your money for a list that won't convert. If you're already in and it isn't landing, message me on Slack. Targeting is the usual culprit and it's fixable in about half an hour. And the 7-day money-back guarantee covers you either way.",
    },
    {
        question: 'Do I need my own AI account or API keys?',
        answer:
            'No. All the AI is built in, managed by us and paid for by us. You never create an account with any AI company, never paste a key anywhere, and never get a surprise bill from anyone. Your subscription is the only cost.',
    },
    {
        question: 'What do I actually have to do?',
        answer:
            "About ten minutes a day. Twenty minutes on Monday choosing who to target, then ten minutes each morning approving messages in the queue while you drink your coffee. Answering the replies is the part that needs you — and it's the part worth your time.",
    },
];

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-white/6 group">
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between text-left gap-6 py-6 focus:outline-none"
            >
                <span
                    className={`text-[17px] font-medium transition-colors duration-300 ${
                        open ? 'text-brand-400' : 'text-neutral-200 group-hover:text-white'
                    }`}
                >
                    {question}
                </span>
                <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                        open ? 'bg-brand-500/10 text-brand-400' : 'bg-white/6 text-neutral-400'
                    }`}
                >
                    {open ? <Minus size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                </span>
            </button>
            <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: open ? '34rem' : 0, opacity: open ? 1 : 0 }}
            >
                <p className="text-[15px] font-light leading-relaxed text-neutral-400 pb-7 pr-8">{answer}</p>
            </div>
        </div>
    );
};

const HzFAQ: React.FC = () => (
    <Section id="faq">
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-14">
                <Eyebrow>What you're actually thinking</Eyebrow>
                <h2 className="text-3xl md:text-[2.75rem] font-medium text-white tracking-tight leading-[1.15] mb-5">
                    The questions everyone asks.
                </h2>
                <p className="text-lg font-light text-neutral-400">Answered like an adult, not a brochure.</p>
            </div>
            <div>
                {faqData.map((item) => <FAQItem key={item.question} {...item} />)}
            </div>
        </div>
    </Section>
);

// ─── Close ────────────────────────────────────────────────────────────────────

const HzCTA: React.FC = () => (
    <section id="cta" className="relative px-6 py-28 md:py-32 overflow-hidden bg-surface">
        <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-900/15 via-transparent to-transparent pointer-events-none"
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight leading-[1.1] mb-7">
                Your competitors are DMing<br />your prospects right now.
            </h2>
            <p className="text-xl font-light leading-relaxed text-neutral-400 mb-11 max-w-2xl mx-auto">
                They're doing it badly, with a template, at 40 a day. Imagine what happens when you do
                it properly at 500 a month.
            </p>

            <div className="flex flex-col items-center gap-7">
                <a
                    href="#pricing"
                    className="group inline-flex items-center gap-3 px-10 py-4 rounded-full bg-brand-500 hover:bg-brand-400 text-brand-950 text-lg font-semibold shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_0px_rgba(16,185,129,0.6)] hover:-translate-y-1 transition-all duration-300"
                >
                    Claim a founding seat
                    <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </a>
                <p className="text-sm leading-[1.7] text-neutral-500 max-w-md">
                    Or{' '}
                    <button
                        data-cal-link="magnetengine/15min"
                        data-cal-namespace="15min"
                        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
                        className="text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
                    >
                        book 15 minutes
                    </button>{' '}
                    and I'll run a live scrape on your exact target list. If the leads look bad, I'll tell
                    you and we're done.
                </p>
            </div>
        </div>
    </section>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => (
    <div className="relative min-h-screen bg-surface">
        <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
        <div className="fixed inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none z-0" />

        <Navbar />

        <main className="relative z-10">
            <HzHero />
            <HzProblem />
            <HzHowItWorks />
            <HzMath />
            <HzCompare />
            <HzPricing />
            <HzFAQ />
            <HzCTA />
        </main>

        <Footer />
    </div>
);

export default LandingPage;
