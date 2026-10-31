import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Minus, Plus, type LucideIcon } from 'lucide-react';
import '@fontsource/instrument-serif/latin-400-italic.css';
import './landing.css';
import { Header, Logo, type NavItem } from './Header';
import { PillButton, GhostPill } from '../ui/PillButton';
import { Marquee } from '../ui/Marquee';
import { ApprovalPreview, BrandPanel, EXAMPLE_QUEUE_SIZE } from '../ApprovalPreview';
import { PRICES, SUPPORT_EMAIL } from '../../lib/plans';
import { TRIAL_ALLOWANCE } from '../../lib/trial';
import { SOURCE_KINDS } from '../../../supabase/functions/_shared/hiker.ts';
import { LANDING_PATH, rememberLandingVariant, type LandingVariant } from '../../lib/landingVariant';
import {
    AUDIENCE, CALL_BOOKING, CALL_CTA, CLIENT_CALLS, FAQ_ITEMS, MONTHLY_DMS, MONTHLY_LEADS, TESTIMONIALS, TRIAL_CTA,
    type Testimonial,
} from './content';

/**
 * The public landing kit: the pieces the three /preview variants share, in the
 * client dashboard's palette — near-black grounds, white for the one action,
 * grays for chrome, and green only where something went well (approved,
 * replied, found, the trial you pay nothing for).
 *
 * Every number printed here is one the code or the owner stands behind:
 * `PRICES`, send pacing and the default cap from `extension/background.js`.
 * Customer proof is only what customers actually said (`TESTIMONIALS` in
 * content.ts) — the reference's avatars, stars and logo strip became the
 * trial terms, the call and things the product can actually search. No
 * scarcity: the founding-seat count was removed (owner, 2026-10-18).
 */

const SIGNUP = '/login?mode=signup';

// ─── Type ─────────────────────────────────────────────────────────────────────

/** The one italic serif phrase a heading may carry. */
export const Em: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="font-serif italic font-normal tracking-[-0.01em] text-white">{children}</span>
);

export const Section: React.FC<{ children: React.ReactNode; id?: string; className?: string }> = ({
    children,
    id,
    className = '',
}) => (
    <section id={id} className={`relative scroll-mt-24 py-24 md:py-32 px-6 ${className}`}>
        {children}
    </section>
);

export const Heading: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children,
    className = '',
}) => (
    <h2
        className={`text-white font-semibold tracking-[-0.035em] leading-[1.06] text-balance ${className}`}
        style={{ fontSize: 'clamp(2rem, 4.2vw, 3.4rem)' }}
    >
        {children}
    </h2>
);

export const Panel: React.FC<{ children: React.ReactNode; className?: string; accent?: boolean }> = (props) => (
    <BrandPanel tone="mono" {...props} />
);

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * A landing page's frame: header, main, footer — and the A/B test's
 * bookkeeping, so no variant can forget it. Each page names its `variant`;
 * the frame remembers it, tags trial and call clicks with it, and keeps B and
 * C out of search results (they are the same offer as `/`, and a duplicate
 * page in the index competes with the real one).
 */
export const LandingShell: React.FC<{
    nav: NavItem[];
    variant: LandingVariant;
    children: React.ReactNode;
    /** The header's action. Defaults to the trial; `ctaBooksCall` makes it open the call. */
    cta?: string;
    ctaBooksCall?: boolean;
}> = ({ nav, variant, children, cta = TRIAL_CTA, ctaBooksCall }) => {
    const home = LANDING_PATH[variant];

    useEffect(() => {
        rememberLandingVariant(variant);
        if (variant === 'a') return;
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex';
        document.head.appendChild(meta);
        return () => meta.remove();
    }, [variant]);

    return (
        <div
            className="bg-surface min-h-screen antialiased selection:bg-white/20 selection:text-white"
        >
            <Header nav={nav} cta={cta} ctaBooksCall={ctaBooksCall} home={home} />
            <main>{children}</main>
            <LandingFooter home={home} />
        </div>
    );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

/**
 * The terms, printed wherever the trial is offered. No charge date on the
 * landing pages (owner, 2026-10-18): the dated timeline — today, the charge
 * day — is shown on /activate before the card goes in.
 */
export const TrialTerms: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
    className = '',
    style,
}) => (
    <p className={`text-meta text-neutral-400 ${className}`} style={style}>
        Card required · cancel anytime
    </p>
);

/** The trial with the call beside it: every page's actions unless it says otherwise. */
const TrialActions: React.FC = () => (
    <>
        <PillButton to={SIGNUP}>{TRIAL_CTA}</PillButton>
        <CallPill>{CALL_CTA}</CallPill>
    </>
);

/**
 * The first viewport, after the reference: the claim centred at display size,
 * who it is for, its subhead, the trial with the call beside it, and the
 * terms — over a motion field that belongs to the variant. The approval card (children) rises into
 * the bottom of the field, which fades out beneath it. A page that sells
 * something other than the trial passes its own `actions` and `terms`.
 */
export const Hero: React.FC<{
    field: React.ReactNode;
    title: React.ReactNode;
    sub: React.ReactNode;
    children: React.ReactNode;
    actions?: React.ReactNode;
    terms?: React.ReactNode;
    audience?: string;
}> = ({ field, title, sub, children, actions = <TrialActions />, terms, audience = AUDIENCE }) => (
    <section className="relative isolate overflow-hidden">
        <div aria-hidden className="hero-field absolute inset-0 -z-10">
            {field}
            <div className="hero-scrim absolute inset-0" />
        </div>

        <div className="px-6 pt-36 md:pt-44 text-center">
            <h1
                className="landing-in mx-auto max-w-5xl font-semibold text-white tracking-[-0.04em] leading-[1.02] text-balance"
                style={{ fontSize: 'clamp(2.75rem, 7vw, 6rem)' }}
            >
                {title}
            </h1>

            <p
                className="landing-in mt-7 mx-auto max-w-[50ch] text-lead text-neutral-300"
                style={{ '--d': '100ms' } as React.CSSProperties}
            >
                <span className="block mb-2 text-white font-medium">{audience}</span>
                {sub}
            </p>

            <div
                className="landing-in mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
                style={{ '--d': '200ms' } as React.CSSProperties}
            >
                {actions}
            </div>

            {terms ? (
                <p className="landing-in mt-7 text-meta text-neutral-400" style={{ '--d': '260ms' } as React.CSSProperties}>
                    {terms}
                </p>
            ) : (
                <TrialTerms className="landing-in mt-7" style={{ '--d': '260ms' } as React.CSSProperties} />
            )}
        </div>

        <div className="relative px-4 sm:px-6 mt-16 md:mt-20 pb-6">{children}</div>
    </section>
);

/** The approval card — the product, readable — with the line that explains it. */
export const ProductPreview: React.FC<{ caption?: React.ReactNode; sendNote?: React.ReactNode }> = ({
    caption,
    sendNote,
}) => (
    <div className="max-w-4xl mx-auto">
        <ApprovalPreview stacked tone="mono" sendNote={sendNote} />
        <p className="mt-3 text-center text-meta text-neutral-400 text-balance">
            {caption ?? (
                <>
                    One of {EXAMPLE_QUEUE_SIZE} drafts in an example queue. Hover a highlighted phrase to see the
                    line written from it.
                </>
            )}
        </p>
    </div>
);

// ─── Marquee band ─────────────────────────────────────────────────────────────

/** A band's label, between two fading rules. */
const BandLabel: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex items-center justify-center gap-4 px-6">
        <span aria-hidden className="hidden md:block h-px w-40 bg-gradient-to-l from-white/20 to-transparent" />
        <p className="text-meta text-neutral-400 text-center">{label}</p>
        <span aria-hidden className="hidden md:block h-px w-40 bg-gradient-to-r from-white/20 to-transparent" />
    </div>
);

/** The reference's "loved by" strip: a label between two fading rules, then the marquee. */
export const MarqueeBand: React.FC<{ label: string; children: React.ReactNode; duration?: number }> = ({
    label,
    children,
    duration = 45,
}) => (
    <section aria-label={label} className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto">
            <BandLabel label={label} />
            <Marquee pauseOnHover duration={duration} className="mt-7 [--gap:0.75rem]">
                {children}
            </Marquee>
        </div>
    </section>
);

/**
 * Screenshots of the owner's calls with clients, framed like the product
 * cards, two to a row: the real thing the reference's avatar strip only
 * pretended to be. A caption gives the client's first name and what they do,
 * nothing more (content.ts says why). Renders nothing until CLIENT_CALLS has
 * an entry.
 */
export const ClientCalls: React.FC<{ label?: string }> = ({ label = 'On calls with our clients' }) => {
    if (CLIENT_CALLS.length === 0) return null;

    // No bottom padding: the reviews' own top padding is the gap, so the row reads as theirs.
    return (
        <section aria-label={label} className="pt-10 md:pt-14 px-6">
            <BandLabel label={label} />
            <ul className="mt-8 max-w-5xl mx-auto grid sm:grid-cols-2 gap-5">
                {CLIENT_CALLS.map(({ src, width, height, name, role }) => (
                    <li key={src}>
                        {/* Not for opening, saving or dragging out (owner, 2026-10-31): these are real clients. */}
                        <figure onContextMenu={(e) => e.preventDefault()} className="select-none [-webkit-touch-callout:none]">
                            <Panel className="p-1.5">
                                <img
                                    src={src}
                                    alt={`Video call with ${name ?? 'a client'} (${role})`}
                                    width={width}
                                    height={height}
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                    className="w-full h-auto rounded-[calc(1.25rem-7px)] bg-surface pointer-events-none"
                                />
                            </Panel>
                            <figcaption className="mt-3 px-1 text-meta text-neutral-400">
                                {name && <><span className="text-neutral-200">{name}</span> · </>}
                                {role}
                            </figcaption>
                        </figure>
                    </li>
                ))}
            </ul>
        </section>
    );
};

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export interface Step {
    icon: LucideIcon;
    title: string;
    body: string;
    stat: string;
    /** The one step a human does. Drawn solid, the others in outline. */
    you?: boolean;
}

/**
 * The loop as a line of stations, like the dashboard's own pipeline. Which
 * station is yours is the information, so it is the one filled in.
 */
export const Pipeline: React.FC<{ steps: Step[] }> = ({ steps }) => (
    <ol className="grid gap-12 md:gap-6 md:grid-cols-4">
        {steps.map(({ icon: Icon, title, body, stat, you }, i) => (
            <li key={title} className="relative">
                {i < steps.length - 1 && (
                    <span
                        aria-hidden
                        className="hidden md:block absolute top-5 left-14 -right-4 h-px bg-gradient-to-r from-white/15 to-white/5"
                    />
                )}
                <span
                    className={`relative w-10 h-10 rounded-full flex items-center justify-center ${
                        you ? 'bg-white text-surface' : 'border border-white/12 bg-surface text-neutral-300'
                    }`}
                >
                    <Icon size={16} strokeWidth={2.2} aria-hidden />
                </span>
                <p className={`mt-5 text-label font-semibold uppercase tracking-[0.12em] ${you ? 'text-white' : 'text-neutral-500'}`}>
                    {you ? 'You' : 'MagnetEngine'}
                </p>
                <h3 className="mt-1.5 text-white font-semibold text-[1.15rem] leading-snug tracking-[-0.02em]">
                    {title}
                </h3>
                <p className="mt-2.5 text-body-sm text-neutral-400">{body}</p>
                <p className="mt-3 text-meta font-mono text-neutral-300 tabular-nums">{stat}</p>
            </li>
        ))}
    </ol>
);

// ─── Pricing ──────────────────────────────────────────────────────────────────

export const COST_OF_A_HUMAN = '$2,400';
export const COST_OF_AN_AGENCY = '$3,000';

const ANCHORS: [string, string][] = [
    ['Hiring someone to do it', `${COST_OF_A_HUMAN}/mo`],
    ['Paying an agency to do it', `${COST_OF_AN_AGENCY}/mo`],
];

/**
 * The whole offer (owner, 2026-10-31), grouped the way a buyer weighs it:
 * where the leads come from, how each one is written to, what happens when
 * they answer, and the help getting started. A few words a line, and only
 * what the product ships: the quotas are PLAN_LIMITS, the sources are the
 * scraper's own list, the qualifier is the Inbox's triage, and the call comes
 * with the onboarding email. No daily send figure.
 */
const OFFER: [group: string, items: string[]][] = [
    ['Leads', [`${MONTHLY_LEADS} leads a month`, `${SOURCE_KINDS.length} ways to find them`, 'Follower and keyword filters']],
    ['Outreach', [`${MONTHLY_DMS} personalised DMs a month`, 'Automated follow-ups']],
    ['Booking', ['AI appointment setter', 'AI lead qualifier', 'One inbox for every reply', 'Deal and revenue tracking']],
    ['Support', ['30-minute onboarding call', 'Zapier and Make webhooks']],
];

export const Pricing: React.FC<{ heading: React.ReactNode; id?: string }> = ({ heading, id = 'pricing' }) => (
    <Section id={id}>
        <div className="max-w-2xl mx-auto">
            <Heading className="mb-12 text-center">{heading}</Heading>

            <Panel accent className="p-7 md:p-9">
                <span className="inline-block mb-7 px-3 py-1 rounded-full text-label font-semibold bg-white/[0.06] border border-white/12 text-white">
                    One plan · everything included
                </span>

                {/* What the job costs elsewhere, then ours. Stepping down from
                    a number the reader can check beats striking through one
                    of ours. */}
                <dl className="mb-7 pb-7 border-b border-white/8 space-y-2.5">
                    {ANCHORS.map(([label, price]) => (
                        <div key={label} className="flex items-baseline justify-between gap-3">
                            <dt className="text-meta text-neutral-400">{label}</dt>
                            <dd className="text-meta font-mono text-neutral-500 line-through tabular-nums">{price}</dd>
                        </div>
                    ))}
                </dl>

                <div className="mb-8">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-[3.25rem] leading-none font-semibold tracking-[-0.04em] text-white tabular-nums">
                            {PRICES.monthly.label}
                        </span>
                        <span className="text-[1.1rem] font-medium text-neutral-400">{PRICES.monthly.suffix}</span>
                        <span className="px-3 py-1 rounded-full bg-positive-500/12 border border-positive-500/25 text-positive-300 text-label font-semibold">
                            3-day free trial
                        </span>
                    </div>
                    <p className="text-body-sm text-neutral-400 mt-3">
                        The trial includes {TRIAL_ALLOWANCE.leads} leads and {TRIAL_ALLOWANCE.dms} DMs. Cancel any
                        time before it ends and you pay nothing.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-7 mb-7">
                    {OFFER.map(([group, items]) => (
                        <div key={group}>
                            <h3 className="mb-3 text-label font-semibold uppercase tracking-[0.12em] text-neutral-500">
                                {group}
                            </h3>
                            <ul className="space-y-2">
                                {items.map(f => (
                                    <li key={f} className="flex items-start gap-2.5">
                                        <Check className="text-white mt-[5px] flex-none" size={14} strokeWidth={2.6} aria-hidden />
                                        <span className="text-body-sm text-neutral-300">{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <p className="mb-9 pt-6 border-t border-white/8 text-body-sm text-neutral-400">
                    All AI and infrastructure costs included. You never touch an API key.
                </p>

                <PillButton to={SIGNUP} block>
                    Start my 3-day trial
                </PillButton>
                <TrialTerms className="text-center mt-4" />
            </Panel>
        </div>
    </Section>
);

// ─── Testimonials ─────────────────────────────────────────────────────────────

/**
 * Where each card sits on the wide-screen wall, around the centred heading:
 * four down each side, each turned a few degrees like a screenshot dropped on
 * a desk. Below `xl` the wall becomes a plain two-column grid.
 */
type Spot = { side: 'left' | 'right'; inset: string; top: number; rotate: number; width: number };

/** Up to four messages: two down each side of a shorter wall. */
const WALL_FEW: Spot[] = [
    { side: 'left', inset: '7%', top: 70, rotate: -3, width: 340 },
    { side: 'right', inset: '6%', top: 100, rotate: 3, width: 330 },
    { side: 'left', inset: '10%', top: 340, rotate: 2, width: 330 },
    { side: 'right', inset: '9%', top: 370, rotate: -2, width: 340 },
];

const WALL: Spot[] = [
    { side: 'left', inset: '7%', top: 24, rotate: -3, width: 330 },
    { side: 'right', inset: '6%', top: 44, rotate: 3, width: 320 },
    { side: 'left', inset: '3%', top: 236, rotate: 2, width: 360 },
    { side: 'right', inset: '8%', top: 262, rotate: -2, width: 350 },
    { side: 'left', inset: '10%', top: 470, rotate: -2, width: 300 },
    { side: 'right', inset: '4%', top: 500, rotate: 2, width: 330 },
    { side: 'left', inset: '5%', top: 650, rotate: 3, width: 340 },
    { side: 'right', inset: '10%', top: 690, rotate: -3, width: 300 },
];

/**
 * The shape of a card's blurred name: a short first name, sometimes with a
 * surname initial. Taken from the quote so each card keeps its shape between
 * renders and neighbours differ — the stored name never reaches the page.
 */
const blurredName = (quote: string): { width: number; initial: boolean } => {
    let h = 0;
    for (let i = 0; i < quote.length; i++) h = (h * 31 + quote.charCodeAt(i)) | 0;
    h = Math.abs(h);
    return { width: 26 + (h % 5) * 4, initial: (h >> 4) % 3 === 0 };
};

const BlurredName: React.FC<{ quote: string }> = ({ quote }) => {
    const { width, initial } = blurredName(quote);
    return (
        <span aria-hidden className="flex flex-none items-center gap-[3px] blur-[2.5px]">
            <span className="h-2 rounded-full bg-neutral-300" style={{ width }} />
            {initial && <span className="h-2 w-2 rounded-full bg-neutral-300" />}
        </span>
    );
};

/**
 * One client message, drawn like the chat screenshot it came from. The name
 * and avatar are blurred on purpose — the owner's call, so a client is never
 * named on the page — and a screen reader hears "A client" instead.
 */
const MessageCard: React.FC<{ t: Testimonial; className?: string; style?: React.CSSProperties }> = ({ t, className = '', style }) => (
    <figure
        className={`rounded-2xl border border-white/10 bg-surface-raised px-4 py-3.5 shadow-2xl shadow-black/60 ${className}`}
        style={style}
    >
        <figcaption className="flex items-center gap-2.5">
            <span aria-hidden className="w-8 h-8 rounded-lg flex-none bg-gradient-to-br from-neutral-500 to-neutral-800 blur-[3px]" />
            <BlurredName quote={t.quote} />
            <span className="sr-only">A client</span>
            {t.role && <span className="text-label text-neutral-400 truncate">{t.role}</span>}
            {t.time && <span className="text-label text-neutral-500 flex-none">{t.time}</span>}
        </figcaption>
        {t.topic && <p className="mt-3 text-body-sm font-semibold text-white">{t.topic}</p>}
        <blockquote className={`${t.topic ? 'mt-1' : 'mt-2'} text-body-sm text-neutral-200 leading-relaxed`}>{t.quote}</blockquote>
        {t.reactions && t.reactions.length > 0 && (
            <div className="mt-2.5 flex gap-1.5" aria-label="Reactions">
                {t.reactions.map(([emoji, count]) => (
                    <span key={emoji} className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04] text-label text-neutral-300 tabular-nums">
                        <span aria-hidden>{emoji}</span>
                        {count}
                    </span>
                ))}
            </div>
        )}
    </figure>
);

/**
 * "What our clients are saying": real client messages scattered around the
 * heading — no button in the middle, because the page already asks for a card
 * in the hero, at the price and at the close. More than the wall's eight
 * become a plain grid under the heading. Example entries render on localhost
 * only, and the section renders nothing in production until a real message
 * exists (content.ts).
 */
export const Testimonials: React.FC<{ heading?: React.ReactNode }> = ({
    heading = (
        <>
            What our clients <Em>are saying.</Em>
        </>
    ),
}) => {
    const items = TESTIMONIALS.filter(t => !t.example || import.meta.env.DEV);
    if (items.length === 0) return null;
    const wall = items.length <= WALL.length;
    const few = items.length <= WALL_FEW.length;
    const spots = few ? WALL_FEW : WALL;
    const examples = items.some(t => t.example);

    const center = (
        <div className="text-center px-6">
            <Heading className="mx-auto max-w-[14ch]">{heading}</Heading>
            {examples && (
                <p className="mt-6 mx-auto max-w-[44ch] text-meta text-neutral-400">
                    These are example messages and show on localhost only. Add your clients' real messages in{' '}
                    <code className="text-neutral-300">src/components/landing/content.ts</code>.
                </p>
            )}
        </div>
    );

    return (
        <section id="reviews" className="relative scroll-mt-24 py-24 md:py-32 overflow-hidden">
            {/* Wide screens: the scattered wall, heading in the middle. */}
            {wall && <div className="hidden xl:block relative max-w-[1400px] mx-auto" style={{ height: few ? 600 : 880 }}>
                {items.map((t, i) => {
                    const spot = spots[i];
                    return (
                        <MessageCard
                            key={i}
                            t={t}
                            className="absolute z-10 [transform:rotate(var(--tilt))] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:[transform:translateY(-4px)] hover:z-20 motion-reduce:transition-none"
                            style={{
                                [spot.side]: spot.inset,
                                top: spot.top,
                                width: spot.width,
                                '--tilt': `${spot.rotate}deg`,
                            } as React.CSSProperties}
                        />
                    );
                })}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none">
                    {center}
                </div>
            </div>}

            {/* Narrower screens, or more than the wall holds: heading first, then the messages in columns. */}
            <div className={wall ? 'xl:hidden' : ''}>
                {center}
                <div className={`mt-14 px-6 mx-auto columns-1 sm:columns-2 gap-4 [&>*]:mb-4 [&>*]:break-inside-avoid ${wall ? 'max-w-3xl' : 'max-w-6xl lg:columns-3'}`}>
                    {items.map((t, i) => <MessageCard key={i} t={t} />)}
                </div>
            </div>
        </section>
    );
};

// ─── FAQ ──────────────────────────────────────────────────────────────────────


const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-white/8">
            <h3>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between text-left gap-6 py-6 group"
                >
                    <span className="text-body font-medium text-neutral-200 group-hover:text-white transition-colors duration-300">
                        {question}
                    </span>
                    <span className="flex-none w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-white group-hover:border-white/30 transition-colors duration-300">
                        {open ? <Minus size={13} strokeWidth={2.6} /> : <Plus size={13} strokeWidth={2.6} />}
                    </span>
                </button>
            </h3>
            <div
                className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
            >
                <div className="overflow-hidden">
                    <p className="text-body-sm text-neutral-400 pb-6 max-w-[68ch]">{answer}</p>
                </div>
            </div>
        </div>
    );
};

export const FAQ: React.FC<{ heading?: React.ReactNode; items?: typeof FAQ_ITEMS }> = ({
    heading = (
        <>
            The questions <Em>everyone asks.</Em>
        </>
    ),
    items = FAQ_ITEMS,
}) => (
    <Section id="faq">
        <div className="max-w-3xl mx-auto">
            <Heading className="mb-10">{heading}</Heading>
            <div className="border-t border-white/8">
                {items.map(f => (
                    <FAQItem key={f.question} {...f} />
                ))}
            </div>
        </div>
    </Section>
);

// ─── Close ────────────────────────────────────────────────────────────────────

export const CallPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <GhostPill {...CALL_BOOKING}>{children}</GhostPill>
);

export const Close: React.FC<{
    heading: React.ReactNode;
    body: React.ReactNode;
    actions?: React.ReactNode;
    terms?: React.ReactNode;
}> = ({ heading, body, actions = <TrialActions />, terms }) => (
    <Section id="start" className="pb-32 md:pb-40">
        <div className="max-w-3xl mx-auto text-center">
            <Heading className="mx-auto max-w-[18ch]">{heading}</Heading>
            <p className="mt-6 text-lead text-neutral-400 max-w-[48ch] mx-auto">{body}</p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">{actions}</div>
            {terms ? <p className="mt-6 text-meta text-neutral-400">{terms}</p> : <TrialTerms className="mt-6" />}
        </div>
    </Section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────

export const LandingFooter: React.FC<{ home?: string }> = ({ home = '/' }) => (
    <footer className="border-t border-white/8 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <Logo to={home} />
            <nav aria-label="Legal" className="flex gap-8 text-meta text-neutral-400">
                <Link to="/privacy" className="hover:text-white transition-colors">
                    Privacy
                </Link>
                <Link to="/terms" className="hover:text-white transition-colors">
                    Terms
                </Link>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">
                    Contact
                </a>
            </nav>
            <p className="text-meta text-neutral-500">© {new Date().getFullYear()} MagnetEngine</p>
        </div>
    </footer>
);
