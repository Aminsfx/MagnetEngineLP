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
import { LANDING_PATH, rememberLandingVariant, trackEvent, type LandingVariant } from '../../lib/landingVariant';
import { ANCHOR_PRICE, FAQ_ITEMS, MONTHLY_DMS, SEATS_CLAIMED, SEATS_TOTAL, TRIAL_CTA } from './content';

/**
 * The public landing kit: the pieces the three /preview variants share, in the
 * client dashboard's palette — near-black grounds, white for the one action,
 * grays for chrome, and green only where something went well (approved,
 * replied, found, the trial you pay nothing for).
 *
 * Every number printed here is one the code or the owner stands behind:
 * `PRICES`, the seat count the owner edits, send pacing and the default cap
 * from `extension/background.js`. There is no customer proof to show, so none
 * is shown — the reference's avatars, stars and logo strip became the seat
 * count, the trial terms and things the product can actually search.
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
export const LandingShell: React.FC<{ nav: NavItem[]; variant: LandingVariant; children: React.ReactNode }> = ({
    nav,
    variant,
    children,
}) => {
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

    // One listener for every call to action on the page, so a new button is
    // counted without anyone remembering to wire it.
    const onClickCapture = (e: React.MouseEvent) => {
        const el = (e.target as HTMLElement).closest('a, button');
        if (!el) return;
        if (el.getAttribute('href')?.includes('mode=signup')) trackEvent('start_trial_click');
        else if (el.hasAttribute('data-cal-link')) trackEvent('book_call_click');
    };

    return (
        <div
            onClickCapture={onClickCapture}
            className="bg-surface min-h-screen antialiased selection:bg-white/20 selection:text-white"
        >
            <Header nav={nav} cta={TRIAL_CTA} home={home} />
            <main>{children}</main>
            <LandingFooter home={home} />
        </div>
    );
};

// ─── Hero ─────────────────────────────────────────────────────────────────────

/**
 * The seat count, drawn as the hundred seats it counts. It stands where the
 * reference put an avatar stack and five stars: the one piece of scarcity this
 * product has is real, so it gets the visual weight proof would have had.
 */
export const SeatMap: React.FC = () => (
    <div className="flex items-center gap-3.5 text-left">
        <span
            aria-hidden
            className="grid grid-cols-[repeat(20,3px)] grid-rows-[repeat(5,3px)] gap-[2px] flex-none"
        >
            {Array.from({ length: SEATS_TOTAL }, (_, i) => (
                <span key={i} className={`rounded-[1px] ${i < SEATS_CLAIMED ? 'bg-white' : 'bg-white/12'}`} />
            ))}
        </span>
        <span className="leading-tight">
            <span className="block text-body-sm font-semibold text-white tabular-nums">
                {SEATS_CLAIMED} of {SEATS_TOTAL} founding seats
            </span>
            <span className="block text-meta text-neutral-400">claimed at {PRICES.monthly.label}/month</span>
        </span>
    </div>
);

/** The terms, printed wherever the trial is offered. */
export const TrialTerms: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
    className = '',
    style,
}) => (
    <p className={`text-meta text-neutral-400 ${className}`} style={style}>
        Card required · cancel before day 4 and pay nothing · {PRICES.monthly.label}/month after
    </p>
);

/**
 * The first viewport, after the reference: the claim centred at display size,
 * its subhead, the action beside the seat count, and the terms — over a motion
 * field that belongs to the variant. The approval card (children) rises into
 * the bottom of the field, which fades out beneath it.
 */
export const Hero: React.FC<{
    field: React.ReactNode;
    title: React.ReactNode;
    sub: React.ReactNode;
    children: React.ReactNode;
}> = ({ field, title, sub, children }) => (
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
                {sub}
            </p>

            <div
                className="landing-in mt-10 flex flex-col md:flex-row items-center justify-center gap-7 md:gap-9"
                style={{ '--d': '200ms' } as React.CSSProperties}
            >
                <PillButton to={SIGNUP}>{TRIAL_CTA}</PillButton>
                <SeatMap />
            </div>

            <TrialTerms className="landing-in mt-7" style={{ '--d': '260ms' } as React.CSSProperties} />
        </div>

        <div className="relative px-4 sm:px-6 mt-16 md:mt-20 pb-6">{children}</div>
    </section>
);

/** The approval card — the product, readable — with the line that explains it. */
export const ProductPreview: React.FC<{ caption?: React.ReactNode }> = ({ caption }) => (
    <div className="max-w-4xl mx-auto">
        <ApprovalPreview stacked tone="mono" />
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

/** The reference's "loved by" strip: a label between two fading rules, then the marquee. */
export const MarqueeBand: React.FC<{ label: string; children: React.ReactNode; duration?: number }> = ({
    label,
    children,
    duration = 45,
}) => (
    <section aria-label={label} className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-4 px-6">
                <span aria-hidden className="hidden md:block h-px w-40 bg-gradient-to-l from-white/20 to-transparent" />
                <p className="text-meta text-neutral-400 text-center">{label}</p>
                <span aria-hidden className="hidden md:block h-px w-40 bg-gradient-to-r from-white/20 to-transparent" />
            </div>
            <Marquee pauseOnHover duration={duration} className="mt-7 [--gap:0.75rem]">
                {children}
            </Marquee>
        </div>
    </section>
);

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

const COST_OF_A_HUMAN = '$2,400';
const COST_OF_AN_AGENCY = '$3,000';

const ANCHORS: [string, string][] = [
    ['Hiring someone to do it', `${COST_OF_A_HUMAN}/mo`],
    ['Paying an agency to do it', `${COST_OF_AN_AGENCY}/mo`],
    [`This, once the ${SEATS_TOTAL} seats are gone`, `${ANCHOR_PRICE}/mo`],
];

const FEATURES = [
    `${MONTHLY_DMS} personalised DMs a month`,
    'Lead search by keyword, hashtag or place',
    'The approval queue, the Chrome extension and the inbox',
    'Automated follow-ups',
    'Reply and booked-call tracking',
];

export const Pricing: React.FC<{ heading: React.ReactNode; id?: string }> = ({ heading, id = 'pricing' }) => (
    <Section id={id}>
        <div className="max-w-2xl mx-auto">
            <Heading className="mb-12 text-center">{heading}</Heading>

            <Panel accent className="p-7 md:p-9">
                <div className="flex items-center justify-between gap-4 mb-7">
                    <span className="px-3 py-1 rounded-full text-label font-semibold bg-white/[0.06] border border-white/12 text-white">
                        Founding member
                    </span>
                    <span className="text-meta text-neutral-400 font-mono tabular-nums">
                        {SEATS_CLAIMED}/{SEATS_TOTAL} claimed
                    </span>
                </div>

                {/* What the job costs elsewhere, then our own later price, then
                    theirs. Stepping down from a number the reader can check
                    beats striking through one of ours. */}
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
                        Cancel any time before the trial ends and you pay nothing.
                    </p>
                </div>

                <ul className="space-y-3 mb-9">
                    {FEATURES.map(f => (
                        <li key={f} className="flex items-start gap-3">
                            <Check className="text-white mt-[4px] flex-none" size={15} strokeWidth={2.6} aria-hidden />
                            <span className="text-body-sm text-neutral-300">{f}</span>
                        </li>
                    ))}
                    <li className="text-body-sm text-neutral-400 pl-7">
                        All AI and infrastructure costs included. You never touch an API key.
                    </li>
                </ul>

                <PillButton to={SIGNUP} block>
                    Start my 3-day trial
                </PillButton>
                <p className="text-center text-neutral-400 text-meta mt-4">
                    Card required. You are charged {PRICES.monthly.label} on day 4 unless you cancel.
                </p>
            </Panel>
        </div>
    </Section>
);

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
    <GhostPill
        data-cal-link="magnetengine/15min"
        data-cal-namespace="15min"
        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
    >
        {children}
    </GhostPill>
);

export const Close: React.FC<{ heading: React.ReactNode; body: React.ReactNode }> = ({ heading, body }) => (
    <Section id="start" className="pb-32 md:pb-40">
        <div className="max-w-3xl mx-auto text-center">
            <Heading className="mx-auto max-w-[18ch]">{heading}</Heading>
            <p className="mt-6 text-lead text-neutral-400 max-w-[48ch] mx-auto">{body}</p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <PillButton to={SIGNUP}>{TRIAL_CTA}</PillButton>
                <CallPill>Book a 15-minute list check</CallPill>
            </div>
            <TrialTerms className="mt-6" />
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
