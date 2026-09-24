import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, Check, X, Plus, Minus, Search, PenLine, Send,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ApprovalPreview, BrandPanel as Panel, EXAMPLE_QUEUE_SIZE } from '../components/ApprovalPreview';
import { CARD_BEZEL } from '../lib/theme';
import { PRICES } from '../lib/plans';

/**
 * The marketing landing page.
 *
 * The visual world is the category standard, chosen deliberately over two
 * own-world directions and executed against Linear and Framer as the quality
 * bar: near-black grounds, hairline rules, one accent, tabular figures,
 * generous vertical rhythm, and a single authored scroll moment rather than
 * effects scattered per section. The direction contract lives in
 * `.impeccable/surfaces/src-pages-landingpage-tsx.md`, not here.
 *
 * What the convention usually gets wrong and this page refuses:
 *  - No invented proof. No customer logos, no testimonials, no result
 *    screenshots — there are none to show. A buyer who googles a fake name is
 *    gone, and four invented logos plus five fabricated testimonials were
 *    already removed from this page once.
 *  - No hero screenshot floating in perspective. The product appears as live
 *    DOM the visitor can actually read, because the mechanism IS the argument:
 *    a bio on one side, the message written from it on the other.
 *  - One risk reversal, the 3-day trial, with the charge date printed under
 *    the button. A trial that hides when it bills reads as a trap.
 *  - The Instagram-terms answer is stated plainly rather than buried.
 *
 * Claims are checked against the code: send pacing and the 40/day default come
 * from `extension/background.js`, the price from `PRICES`. SEATS_CLAIMED is a
 * real number the owner edits, never a countdown that resets. The reply rate in
 * "the math" is labelled as the reader's own assumption, because no sourced
 * figure for it exists.
 */

const SEATS_CLAIMED = 7;
const SEATS_TOTAL = 100;
const ANCHOR_PRICE = '$497';

/**
 * What a buyer is really choosing between. Both are market rates for the job
 * this does by hand, not numbers about us — a buyer can check them in an hour,
 * which is the only reason an anchor is worth printing.
 */
const COST_OF_A_HUMAN = '$2,400';
const COST_OF_AN_AGENCY = '$3,000';

/** The decided monthly allowance. See the surface brief's unresolved note. */
const MONTHLY_DMS = '1,500';

// ─── Shared ───────────────────────────────────────────────────────────────────

const Section: React.FC<{ children: React.ReactNode; id?: string; className?: string }> = ({
    children, id, className = '',
}) => (
    <section id={id} className={`relative py-24 md:py-32 px-6 ${className}`}>
        {children}
    </section>
);

/** Section heading. No kicker above it — the heading carries its own weight. */
const Heading: React.FC<{ children: React.ReactNode; className?: string }> = ({
    children, className = '',
}) => (
    <h2
        className={`text-white font-semibold tracking-[-0.035em] leading-[1.08] text-balance ${className}`}
        style={{ fontSize: 'clamp(1.9rem, 3.4vw, 2.85rem)' }}
    >
        {children}
    </h2>
);

// ─── Hero ─────────────────────────────────────────────────────────────────────

/** The primary action, as it appears in the hero and the close. */
const TrialButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Link
        to="/login?mode=signup"
        className="group w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl whitespace-nowrap bg-brand-500 hover:bg-brand-400 text-brand-950 text-body-sm font-semibold transition-[background-color,transform] duration-200 active:scale-[0.98]"
        style={{ boxShadow: '0 12px 32px -12px rgba(249,115,22,0.75)' }}
    >
        {children}
        <ArrowRight size={16} strokeWidth={2.6} aria-hidden className="transition-transform duration-200 ease-out group-hover:translate-x-1" />
    </Link>
);

/** The secondary action: a human looks at the Operator's list before they pay. */
const CallButton: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <button
        type="button"
        data-cal-link="magnetengine/15min"
        data-cal-namespace="15min"
        data-cal-config='{"layout":"month_view","useSlotsViewOnSmallScreen":"true"}'
        className="w-full sm:w-auto px-6 py-3.5 rounded-xl whitespace-nowrap border border-white/8 bg-white/3 text-neutral-300 hover:text-white hover:border-white/15 hover:bg-white/6 text-body-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.98]"
    >
        {children}
    </button>
);

/** The terms, printed wherever the trial is offered. */
const TrialTerms: React.FC<{ className?: string }> = ({ className = '' }) => (
    <p className={`text-meta text-neutral-400 ${className}`}>
        Card required · cancel before day 4 and pay nothing · {PRICES.monthly.label}/month after
    </p>
);

/**
 * The first viewport. The claim sits left, the product sits right, and they
 * read as one line of thought: "your next clients" beside the message written
 * to one of them. The centred headline over a card below the fold was the
 * category's layout; this puts the argument in the first screen.
 */
const Hero: React.FC = () => (
    <section className="relative isolate overflow-hidden pt-28 pb-20 md:pt-36 md:pb-28 px-6">
        {/* One restrained wash, behind the product rather than the headline. */}
        <div
            aria-hidden
            className="absolute inset-0 -z-10 pointer-events-none"
            style={{
                background:
                    'radial-gradient(ellipse 45% 60% at 72% 38%, rgba(249,115,22,0.12), rgba(249,115,22,0.03) 50%, transparent 75%)',
            }}
        />

        <div className="max-w-6xl mx-auto grid xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-14 xl:gap-16 items-center">
            <div>
                <h1
                    className="font-semibold text-white tracking-[-0.04em] leading-[0.98] text-balance"
                    style={{ fontSize: 'clamp(2.6rem, 4.5vw, 4.25rem)' }}
                >
                    Your next 20 clients are already following someone else.
                </h1>

                <p className="mt-7 text-lead text-neutral-400 max-w-[44ch]">
                    MagnetEngine finds them on Instagram, writes a real DM to each one —{' '}
                    <span className="text-neutral-100 font-medium">not a template</span> — and sends it
                    from your own Instagram, at a human pace.
                </p>

                <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <TrialButton>Start the 3-day trial</TrialButton>
                    <CallButton>Book a 15-minute list check</CallButton>
                </div>

                <TrialTerms className="mt-4" />
                <p className="mt-1.5 text-meta text-neutral-400">
                    <span className="text-brand-400 font-semibold tabular-nums">{SEATS_CLAIMED}</span> of{' '}
                    <span className="tabular-nums">{SEATS_TOTAL}</span> founding seats claimed
                </p>
            </div>

            {/* the product, readable — on top of the queue it came from */}
            <div className="w-full max-w-3xl xl:max-w-none xl:-mr-6">
                <ApprovalPreview stacked />
                <p className="mt-3 text-meta text-neutral-400">
                    One of {EXAMPLE_QUEUE_SIZE} drafts in today's queue. This is the only screen you work in — ten minutes a day.
                </p>
            </div>
        </div>
    </section>
);

// ─── Problem ──────────────────────────────────────────────────────────────────

const PROBLEM = [
    ['Where you are', 'Six clients. Referrals dried up. You post, it gets 40 views, and none of them can afford you.'],
    ['Where you want to be', 'A calendar with names in it. Fifteen clients. Conversations happening whether or not you feel like starting them.'],
    ["What's in the way", "Nobody is filling the top of your funnel. You know cold DMs work. You just can't send 200 a day and run the business too."],
] as const;

const Problem: React.FC = () => (
    <Section id="problem">
        <div className="max-w-3xl mx-auto">
            <Heading className="mb-14">
                You don't have a lead problem.{' '}
                <span className="text-neutral-500">You have a "nobody knows you exist" problem.</span>
            </Heading>

            <dl className="border-t border-white/8">
                {PROBLEM.map(([label, body], i) => (
                    <div key={label} className="grid md:grid-cols-[minmax(0,13rem)_1fr] gap-2 md:gap-8 py-7 border-b border-white/8">
                        <dt
                            className={`text-meta font-semibold md:pt-[3px] ${
                                i === 2 ? 'text-brand-400' : 'text-neutral-400'
                            }`}
                        >
                            {label}
                        </dt>
                        <dd className="text-body text-neutral-300">{body}</dd>
                    </div>
                ))}
            </dl>

            <p className="mt-12 text-lead text-neutral-400">
                A VA costs $800 a month and sends the same message to everyone, which is why the
                reply rate is 1%. A $47 bot gets your account restricted.{' '}
                <span className="text-white font-medium">There was no third option. Now there is.</span>
            </p>
        </div>
    </Section>
);

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
    {
        icon: Search,
        title: 'It finds them',
        body: 'Type "SMMA" or "business coach". MagnetEngine pulls matching Instagram profiles and filters out everyone who isn\'t worth your time — wrong follower count, wrong keywords, wrong account type.',
        stat: 'Up to 250 profiles per search term',
    },
    {
        icon: PenLine,
        title: 'It writes each one individually',
        body: "The AI reads each person's actual bio and writes one message to one human. No merge tags. No \"Hey! Love your page 🔥\". If a message reads like a robot wrote it, we've failed and you'll see it in the queue.",
        stat: `${MONTHLY_DMS} personalised DMs a month`,
    },
    {
        icon: Send,
        title: 'It sends at a human pace',
        body: `You approve the ones you like — 10 minutes with your coffee. The Chrome extension sends from your own browser while an Instagram tab is open, at a pace and daily cap you set. Automated DMs are against Instagram's terms — pacing lowers that risk, it doesn't remove it. Replies land in one inbox with a draft response ready.`,
        stat: '40 a day by default, one every 3–8 minutes',
    },
];

const HowItWorks: React.FC = () => (
    <Section id="how">
        <div className="max-w-4xl mx-auto">
            <Heading className="mb-16 max-w-2xl">Three things happen. You do one of them.</Heading>

            <ol className="relative">
                {/* the rail: the sequence is the information, so it is drawn, and
                    it fills in brand as the reader moves down it */}
                <span aria-hidden className="absolute left-[15px] top-3 bottom-3 w-px bg-white/8 hidden sm:block">
                    <span className="rail-fill absolute inset-0 bg-gradient-to-b from-brand-500/70 to-brand-500/20" />
                </span>

                {STEPS.map(({ icon: Icon, title, body, stat }) => (
                    <li key={title} className="relative grid sm:grid-cols-[2rem_1fr] gap-4 sm:gap-7 pb-12 last:pb-0">
                        <span className="relative z-10 hidden sm:flex w-8 h-8 rounded-full bg-surface border border-white/12 items-center justify-center flex-none">
                            <Icon size={14} strokeWidth={2.2} aria-hidden className="text-brand-400" />
                        </span>
                        <div className="sm:pt-[3px]">
                            <h3 className="text-white font-semibold text-[1.15rem] leading-snug tracking-[-0.02em]">
                                {title}
                            </h3>
                            <p className="mt-2.5 text-body text-neutral-400 max-w-[62ch]">{body}</p>
                            <p className="mt-3 text-meta font-medium text-brand-400 tabular-nums">{stat}</p>
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    </Section>
);

// ─── The math ─────────────────────────────────────────────────────────────────

const MATH_ROWS = [
    [`${MONTHLY_DMS} DMs sent a month`, 'your quota'],
    ['× your reply rate', 'assume 8% until you have your own'],
    ['= the conversations you start', 'the only thing being sold here'],
] as const;

const TheMath: React.FC = () => (
    <Section id="proof">
        <div className="max-w-2xl mx-auto">
            <Heading className="mb-12">You need one client a year for this to pay for itself.</Heading>

            <Panel className="p-7 md:p-9">
                <dl>
                    {MATH_ROWS.map(([left, right], i) => (
                        <div
                            key={left}
                            className={`flex items-baseline justify-between gap-5 py-4 ${
                                i !== 0 ? 'border-t border-white/8' : ''
                            }`}
                        >
                            <dt className="text-body-sm font-medium text-white">{left}</dt>
                            <dd className="text-meta text-neutral-500 text-right flex-none">{right}</dd>
                        </div>
                    ))}
                </dl>

                <div className="mt-7 pt-7 border-t border-brand-500/25">
                    <p className="text-body-sm text-neutral-300">
                        If a client is worth <span className="text-white font-medium">$3,000</span> to you, this
                        has to work <span className="text-white font-medium">once in twelve months</span> to break
                        even. Once a month and it's the best money you spend all year.
                    </p>
                    <p className="text-meta text-neutral-500 mt-4">
                        I'm not selling you software. I'm selling you the conversations the software starts.
                        The 8% above is an assumption to run your own numbers against, not a result we've
                        measured — your niche and your offer decide it.
                    </p>
                </div>
            </Panel>
        </div>
    </Section>
);

// ─── Comparison ───────────────────────────────────────────────────────────────

const COMPARE: [label: string, va: boolean, bot: boolean, us: boolean][] = [
    ['Writes a different message per person', false, false, true],
    ['Reads the profile before writing', false, false, true],
    ['You approve everything before it sends', true, false, true],
    ['Costs less than $250/month', false, true, true],
    ['Keeps a human pace and a daily cap', true, false, true],
    ["Doesn't quit on you in month three", false, true, true],
];

const COMPARE_SHORT = ['VA', 'Bot', 'MagnetEngine'] as const;

const Compare: React.FC = () => (
    <Section>
        <div className="max-w-4xl mx-auto">
            <Heading className="mb-12">You've got three options.</Heading>

            <div className="rounded-[1.25rem] p-[1px]" style={CARD_BEZEL.outer}>
                <div
                    className="relative rounded-[calc(1.25rem-1px)] bg-surface-raised overflow-x-auto"
                    style={CARD_BEZEL.inner}
                >
                    <table className="hidden sm:table w-full min-w-[580px] border-collapse">
                        <caption className="sr-only">
                            How a VA, a cheap bot and MagnetEngine compare
                        </caption>
                        <thead>
                            <tr className="border-b border-white/8">
                                <th scope="col" className="text-left p-5" />
                                <th scope="col" className="p-5 text-meta font-semibold text-neutral-400">
                                    A VA
                                    <span className="block text-neutral-500 font-normal font-mono text-label mt-0.5">
                                        $800/mo
                                    </span>
                                </th>
                                <th scope="col" className="p-5 text-meta font-semibold text-neutral-400">
                                    A $47 bot
                                    <span className="block text-neutral-500 font-normal text-label mt-0.5">
                                        + a ban risk
                                    </span>
                                </th>
                                <th
                                    scope="col"
                                    className="p-5 text-meta font-semibold text-brand-400 bg-brand-500/8 border-x border-brand-500/20"
                                >
                                    MagnetEngine
                                    <span className="block text-brand-500/80 font-normal font-mono text-label mt-0.5">
                                        {PRICES.monthly.label}/mo
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARE.map(([label, va, bot, us], i) => (
                                <tr key={label} className={i !== 0 ? 'border-t border-white/6' : ''}>
                                    <th scope="row" className="p-5 text-left text-body-sm font-normal text-neutral-300">
                                        {label}
                                    </th>
                                    {[va, bot, us].map((v, j) => (
                                        <td
                                            key={j}
                                            className={`p-5 text-center ${
                                                j === 2 ? 'bg-brand-500/8 border-x border-brand-500/20' : ''
                                            }`}
                                        >
                                            {v ? (
                                                <>
                                                    <Check
                                                        size={16}
                                                        strokeWidth={2.6}
                                                        aria-hidden
                                                        className={`mx-auto ${j === 2 ? 'text-brand-400' : 'text-neutral-400'}`}
                                                    />
                                                    <span className="sr-only">Yes</span>
                                                </>
                                            ) : (
                                                <>
                                                    <X size={16} strokeWidth={2.6} aria-hidden className="mx-auto text-neutral-500" />
                                                    <span className="sr-only">No</span>
                                                </>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Below `sm` a three-column table leaves MagnetEngine off-screen,
                        so each row restacks with all three answers in view. */}
                    <ul className="sm:hidden divide-y divide-white/6">
                        {COMPARE.map(([label, ...answers]) => (
                            <li key={label} className="p-4">
                                <p className="text-body-sm text-neutral-300 mb-3">{label}</p>
                                <div className="grid grid-cols-3 gap-1.5 text-label">
                                    {answers.map((v, j) => (
                                        <span
                                            key={j}
                                            className={`flex items-center justify-center gap-1 rounded-md py-1.5 ${
                                                j === 2
                                                    ? 'bg-brand-500/8 border border-brand-500/20 text-brand-400 font-semibold'
                                                    : 'border border-white/6 text-neutral-500'
                                            }`}
                                        >
                                            {v ? (
                                                <Check size={12} strokeWidth={2.6} aria-hidden />
                                            ) : (
                                                <X size={12} strokeWidth={2.6} aria-hidden className="text-neutral-500" />
                                            )}
                                            {COMPARE_SHORT[j]}
                                            <span className="sr-only">: {v ? 'Yes' : 'No'}</span>
                                        </span>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    </Section>
);

// ─── Pricing ──────────────────────────────────────────────────────────────────

const FEATURES = [
    `${MONTHLY_DMS} personalised DMs per month`,
    'Automated follow-ups',
    'Reply and booked-call tracking',
];

const COSTS_INCLUDED = 'All AI and infrastructure costs included.';
const TRIAL_LINE = 'Cancel anytime before it ends and you pay nothing.';

const ANCHORS: [string, string][] = [
    ['Hiring someone to do it', `${COST_OF_A_HUMAN}/mo`],
    ['Paying an agency to do it', `${COST_OF_AN_AGENCY}/mo`],
    [`This, once the ${SEATS_TOTAL} seats are gone`, `${ANCHOR_PRICE}/mo`],
];

const Pricing: React.FC = () => (
    <Section id="pricing">
        <div className="max-w-2xl mx-auto">
            <Heading className="mb-12 text-balance">
                You are not buying software. You are buying the hire you keep putting off.
            </Heading>

            <Panel accent className="p-7 md:p-9">
                <div className="flex items-center justify-between gap-4 mb-7">
                    <span className="px-2.5 py-1 rounded-md text-label font-semibold bg-brand-500/12 border border-brand-500/20 text-brand-400">
                        Founding member
                    </span>
                    <span className="text-meta text-neutral-500 font-mono tabular-nums">
                        {SEATS_CLAIMED}/{SEATS_TOTAL} claimed
                    </span>
                </div>

                {/* The anchor ladder: what the job costs elsewhere, then our own
                    future price, then what they pay. Stepping down from a checkable
                    outside number beats striking through one of ours. */}
                <dl className="mb-7 pb-7 border-b border-white/8 space-y-2.5">
                    {ANCHORS.map(([label, price]) => (
                        <div key={label} className="flex items-baseline justify-between gap-3">
                            <dt className="text-meta text-neutral-500">{label}</dt>
                            <dd className="text-meta font-mono text-neutral-500 line-through tabular-nums">
                                {price}
                            </dd>
                        </div>
                    ))}
                </dl>

                <div className="mb-8">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-[3rem] leading-none font-semibold tracking-[-0.04em] text-white tabular-nums">
                            {PRICES.monthly.label}
                        </span>
                        <span className="text-[1.1rem] font-medium text-neutral-400">
                            {PRICES.monthly.suffix}
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-positive-500/12 border border-positive-500/25 text-positive-300 text-label font-semibold">
                            3-day free trial
                        </span>
                    </div>
                    <p className="text-body-sm text-neutral-400 mt-3">{TRIAL_LINE}</p>
                </div>

                <ul className="space-y-3 mb-8">
                    {FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                            <Check className="text-brand-500 mt-[3px] flex-none" size={16} strokeWidth={2.6} aria-hidden />
                            <span className="text-body-sm text-neutral-300">{f}</span>
                        </li>
                    ))}
                    <li className="text-body-sm text-neutral-500 pl-7">{COSTS_INCLUDED}</li>
                </ul>

                <Link
                    to="/login?mode=signup"
                    className="w-full py-4 rounded-xl font-semibold text-body-sm text-center block bg-brand-500 hover:bg-brand-400 text-brand-950 transition-colors duration-300"
                >
                    Start my 3-day trial
                </Link>
                <p className="text-center text-neutral-500 text-meta mt-4">
                    Card required. You are charged {PRICES.monthly.label} on day 4 unless you cancel.
                </p>
            </Panel>
        </div>
    </Section>
);

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const faqData = [
    {
        question: 'Is my Instagram account safe?',
        answer:
            "Straight answer: automated DMs are against Instagram's terms of service, and anyone who tells you otherwise is lying to you. Here's how we handle that. MagnetEngine sends from your own browser session, with a gap between each message and a daily cap you control — the default is 40 a day, and we recommend ramping up over two weeks rather than starting at full volume. No first DM sends without your approval — replies only send on their own if you turn autopilot on — and we never see or store your Instagram password. In practice, the people who get restricted are the ones blasting hundreds of copy-pasted messages an hour from a fresh account. That's exactly the behaviour this is built to avoid — which is also why every DM is written individually. Run it on an account that's been active 30+ days, and don't run it on an account you can't afford to have restricted.",
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
            "Find out before you pay: book the 15-minute call and I'll run a live scrape on your exact target list while you watch. If the leads come back thin, I'll tell you and we're done — I'd rather lose the sale than take your money for a list that won't convert. If you're already in and it isn't landing, message me on Slack. Targeting is the usual culprit and it's fixable in about half an hour. And the 3-day trial means you can see it run on your own list before you are charged anything.",
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
                    <span className="flex-none w-7 h-7 rounded-lg border border-white/8 flex items-center justify-center text-neutral-500 group-hover:text-brand-400 group-hover:border-brand-500/30 transition-colors duration-300">
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

const FAQ: React.FC = () => (
    <Section id="faq">
        <div className="max-w-3xl mx-auto">
            <Heading className="mb-10">The questions everyone asks.</Heading>
            <div className="border-t border-white/8">
                {faqData.map((f) => (
                    <FAQItem key={f.question} {...f} />
                ))}
            </div>
        </div>
    </Section>
);

// ─── Close ────────────────────────────────────────────────────────────────────

const Close: React.FC = () => (
    <Section id="cta" className="pb-32">
        <div className="max-w-3xl mx-auto text-center">
            <Heading className="mx-auto max-w-[20ch]">
                The people you want as clients are posting today.
            </Heading>
            <p className="mt-6 text-body text-neutral-400 max-w-[48ch] mx-auto">
                You can keep meaning to reach out, or you can have {MONTHLY_DMS} individual messages
                go out this month while you work on something else.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
                <TrialButton>Start the 3-day trial</TrialButton>
                <CallButton>Book the 15-minute call</CallButton>
            </div>

            <TrialTerms className="mt-5" />
        </div>
    </Section>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => (
    <div className="bg-surface min-h-screen antialiased">
        <Navbar />
        <main>
            <Hero />
            <Problem />
            <HowItWorks />
            <TheMath />
            <Compare />
            <Pricing />
            <FAQ />
            <Close />
        </main>
        <Footer />
    </div>
);

export default LandingPage;
