import React from 'react';
import { Search, PenLine, CheckCheck, Send } from 'lucide-react';
import {
    LandingShell, Hero, ProductPreview, MarqueeBand, Section, Heading, Em, Panel, Pipeline,
    Pricing, FAQ, Close, type Step,
} from '../../components/landing/kit';
import { MONTHLY_DMS } from '../../components/landing/content';
import { MagnetField } from '../../components/landing/motion/MagnetField';
import type { NavItem } from '../../components/landing/Header';

/**
 * Landing A — "The Magnet", live at `/`. Outcome first: booked calls without the
 * prospecting. The hero field is the product's own diagram, prospects pulled
 * into a core. The argument runs problem → mechanism → the math.
 */

const NAV: NavItem[] = [
    { href: '#problem', label: 'The problem' },
    { href: '#how', label: 'How it works' },
    { href: '#math', label: 'The math' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
];

/** Search terms the Campaign Builder takes as-is. Niches, not customers. */
const NICHES = [
    'business coach', 'SMMA', 'med spa', 'roofing contractor', 'real estate agent', 'fitness coach',
    'dentist', 'web designer', 'wedding photographer', 'interior designer', 'course creator', 'barbershop',
];

const PROBLEM = [
    ['Where you are', 'Six clients. Referrals dried up. You post, it gets 40 views, and none of them can afford you.'],
    ['Where you want to be', 'A calendar with names in it. Fifteen clients. Conversations happening whether or not you feel like starting them.'],
    ["What's in the way", "Nobody is filling the top of your funnel. You know cold DMs work. You just can't send 200 a day and run the business too."],
] as const;

const STEPS: Step[] = [
    {
        icon: Search,
        title: 'It finds them',
        body: 'Type a niche, a hashtag or a city. It pulls matching Instagram profiles and drops the wrong follower counts, keywords and account types.',
        stat: 'Up to 250 profiles per search',
    },
    {
        icon: PenLine,
        title: 'It writes to each one',
        body: 'The AI writes one message for one person. No merge tags, no "love your page 🔥".',
        stat: `${MONTHLY_DMS} DMs a month`,
    },
    {
        icon: CheckCheck,
        title: 'You approve',
        body: 'Read the drafts with your coffee. Edit the ones that need it, reject the ones that miss. Nothing first goes out without you.',
        stat: 'About 10 minutes a day',
        you: true,
    },
    {
        icon: Send,
        title: 'It sends and follows up',
        body: "From your own browser, at a human pace, with follow-ups for anyone who doesn't answer. Replies land in one inbox with a draft ready.",
        stat: '40 a day by default, 3–8 min apart',
    },
];

const MATH_ROWS = [
    [`${MONTHLY_DMS} DMs sent a month`, 'your allowance'],
    ['× your reply rate', 'assume 8% until you have your own'],
    ['= the conversations you start', 'the only thing being sold here'],
] as const;

const VariantA: React.FC = () => (
    <LandingShell nav={NAV} variant="a">
        <Hero
            field={<MagnetField />}
            title={
                <>
                    Book sales calls from Instagram <Em>without prospecting.</Em>
                </>
            }
            sub={
                <>
                    MagnetEngine finds the people you want as clients, writes each one a DM from their own
                    profile, and sends it from your account at a human pace. Your part takes ten minutes a day.
                </>
            }
        >
            <ProductPreview />
        </Hero>

        <MarqueeBand label="Search any niche on Instagram — by keyword, hashtag or place">
            {NICHES.map(n => (
                <span
                    key={n}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/8 text-meta text-neutral-300 whitespace-nowrap"
                >
                    <Search size={13} strokeWidth={2.2} aria-hidden className="text-neutral-500" />
                    {n}
                </span>
            ))}
        </MarqueeBand>

        <Section id="problem">
            <div className="max-w-3xl mx-auto">
                <Heading className="mb-14">
                    You don't have a lead problem. <Em>You have a "nobody knows you exist" problem.</Em>
                </Heading>
                <dl className="border-t border-white/8">
                    {PROBLEM.map(([label, body], i) => (
                        <div
                            key={label}
                            className="grid md:grid-cols-[minmax(0,13rem)_1fr] gap-2 md:gap-8 py-7 border-b border-white/8"
                        >
                            <dt className={`text-meta font-semibold md:pt-[3px] ${i === 2 ? 'text-white' : 'text-neutral-500'}`}>
                                {label}
                            </dt>
                            <dd className={`text-body ${i === 2 ? 'text-neutral-100' : 'text-neutral-400'}`}>{body}</dd>
                        </div>
                    ))}
                </dl>
                <p className="mt-12 text-lead text-neutral-400">
                    A VA costs $800 a month and sends the same message to everyone, which is why the reply rate is
                    1%.{' '}
                    <span className="text-white font-medium">
                        MagnetEngine writes a different message for every person, and all you do is approve them.
                    </span>
                </p>
            </div>
        </Section>

        <Section id="how">
            <div className="max-w-6xl mx-auto">
                <Heading className="mb-16 max-w-2xl">
                    Four steps. <Em>You do one of them.</Em>
                </Heading>
                <Pipeline steps={STEPS} />
            </div>
        </Section>

        <Section id="math">
            <div className="max-w-2xl mx-auto">
                <Heading className="mb-12 text-center">
                    One client a year <Em>pays for it.</Em>
                </Heading>
                <Panel className="p-7 md:p-9">
                    <dl>
                        {MATH_ROWS.map(([left, right], i) => (
                            <div
                                key={left}
                                className={`flex items-baseline justify-between gap-5 py-4 ${i ? 'border-t border-white/8' : ''}`}
                            >
                                <dt className="text-body-sm font-medium text-white">{left}</dt>
                                <dd className="text-meta text-neutral-400 text-right flex-none">{right}</dd>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-7 pt-7 border-t border-white/12">
                        <p className="text-body-sm text-neutral-300">
                            If a client is worth <span className="text-white font-medium">$3,000</span> to you, this has
                            to work <span className="text-white font-medium">once in twelve months</span> to break even.
                            Once a month and it's the best money you spend all year.
                        </p>
                        <p className="text-meta text-neutral-400 mt-4">
                            The 8% is an assumption to run your own numbers against, not a result we've measured —
                            your niche and your offer decide it.
                        </p>
                    </div>
                </Panel>
            </div>
        </Section>

        <Pricing
            heading={
                <>
                    Priced so one client <Em>covers the year.</Em>
                </>
            }
        />

        <FAQ />

        <Close
            heading={
                <>
                    The people you want as clients are <Em>posting today.</Em>
                </>
            }
            body={
                <>
                    You can keep meaning to reach out, or you can have {MONTHLY_DMS} individual messages go out this
                    month while you work on something else.
                </>
            }
        />
    </LandingShell>
);

export default VariantA;
