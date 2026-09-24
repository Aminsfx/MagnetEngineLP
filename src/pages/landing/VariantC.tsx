import React from 'react';
import { ArrowRight } from 'lucide-react';
import {
    LandingShell, Hero, ProductPreview, MarqueeBand, Section, Heading, Em, Panel,
    Pricing, FAQ, Close,
} from '../../components/landing/kit';
import { RadarSweep } from '../../components/landing/motion/RadarSweep';
import type { NavItem } from '../../components/landing/Header';
import { PRICES } from '../../lib/plans';

/**
 * Landing C — "The hire", at `/lp/c` for A/B tests. Time and cost first: an outbound team's work for ten
 * minutes a day. The hero field is a search that keeps sweeping on its own;
 * the page walks through a week, then sets the price against what the job
 * costs to hire.
 */

const NAV: NavItem[] = [
    { href: '#week', label: 'Your week' },
    { href: '#replaces', label: 'What it replaces' },
    { href: '#pricing', label: 'Pricing' },
    { href: '#faq', label: 'FAQ' },
];

/** The loop, as the dashboard's pipeline names it. One stage is the Operator's. */
const STAGES = ['Search', 'Filter', 'Write', 'Approve', 'Send', 'Follow up', 'Reply', 'Book'] as const;
const YOURS = new Set<string>(['Approve']);

const WEEK: { when: string; time: string; you: boolean; what: string }[] = [
    {
        when: 'Monday',
        time: '20 min',
        you: true,
        what: 'Pick who to target: a niche, a hashtag or a city. MagnetEngine pulls up to 250 matching profiles per search and filters out the wrong ones.',
    },
    {
        when: 'Every morning',
        time: '10 min',
        you: true,
        what: "Read the day's drafts over coffee — each one written from that person's profile. Approve, edit or reject.",
    },
    {
        when: 'All day',
        time: '0 min',
        you: false,
        what: 'The Chrome extension sends what you approved from your own browser, one every 3–8 minutes, up to your daily cap.',
    },
    {
        when: 'A few days later',
        time: '0 min',
        you: false,
        what: 'Anyone who did not answer gets a follow-up that asks for less than the last one — never a "just bumping this".',
    },
    {
        when: 'When they reply',
        time: 'Your call',
        you: true,
        what: 'The reply lands in one inbox with an answer already drafted. This is the part worth your time.',
    },
];

const ALTERNATIVES: { who: string; does: string; cost: string; us?: boolean }[] = [
    { who: 'An appointment setter', does: 'Finds, writes and sends, forty hours a week.', cost: '$2,400' },
    { who: 'An outreach agency', does: 'Does it for you, in their voice, on their schedule.', cost: '$3,000' },
    { who: 'A VA', does: 'Sends the same message to everyone.', cost: '$800' },
    {
        who: 'MagnetEngine',
        does: 'Finds, writes to each person, sends at your pace, follows up. You approve.',
        cost: PRICES.monthly.label,
        us: true,
    },
];

const Week: React.FC = () => (
    <Section id="week">
        <div className="max-w-4xl mx-auto">
            <Heading className="mb-14 max-w-2xl">
                What your week <Em>actually looks like.</Em>
            </Heading>

            <ol className="border-t border-white/8">
                {WEEK.map(({ when, time, you, what }) => (
                    <li
                        key={when}
                        className="grid grid-cols-[1.25rem_1fr] md:grid-cols-[1.25rem_11rem_1fr_9.5rem] gap-x-5 gap-y-1.5 py-7 border-b border-white/8"
                    >
                        <span
                            aria-hidden
                            className={`mt-[7px] w-2.5 h-2.5 rounded-full ${you ? 'bg-white' : 'border border-white/30'}`}
                        />
                        <p className="text-body font-semibold text-white">{when}</p>
                        <p className="col-start-2 md:col-start-auto text-body-sm text-neutral-400">{what}</p>
                        <p
                            className={`col-start-2 md:col-start-auto md:text-right md:pt-[3px] whitespace-nowrap text-meta font-mono tabular-nums ${
                                you ? 'text-white' : 'text-neutral-500'
                            }`}
                        >
                            {you ? 'You' : 'Automatic'} · {time}
                        </p>
                    </li>
                ))}
            </ol>

            <p className="mt-8 text-lead text-neutral-400">
                Your share: <span className="text-white font-medium">about 70 minutes a week</span>, plus answering
                the people who write back.
            </p>
        </div>
    </Section>
);

const Replaces: React.FC = () => (
    <Section id="replaces">
        <div className="max-w-4xl mx-auto">
            <Heading className="mb-12 max-w-3xl">
                The hire you keep putting off, <Em>for less than a week of theirs.</Em>
            </Heading>

            <Panel className="px-2 md:px-3">
                <table className="w-full border-collapse">
                    <caption className="sr-only">What the same job costs a month, done four ways</caption>
                    <tbody>
                        {ALTERNATIVES.map(({ who, does, cost, us }, i) => (
                            <tr key={who} className={i ? 'border-t border-white/8' : ''}>
                                <th scope="row" className="py-6 px-4 md:px-5 text-left align-top font-normal">
                                    <span className={`block text-body font-semibold ${us ? 'text-white' : 'text-neutral-300'}`}>
                                        {who}
                                    </span>
                                    <span className="block mt-1 text-body-sm text-neutral-400">{does}</span>
                                </th>
                                <td className="py-6 px-4 md:px-5 text-right align-top whitespace-nowrap">
                                    <span
                                        className={`font-mono tabular-nums ${
                                            us ? 'text-[1.5rem] leading-none text-white font-semibold' : 'text-body text-neutral-500 line-through'
                                        }`}
                                    >
                                        {cost}
                                    </span>
                                    <span className="text-meta text-neutral-500">/mo</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Panel>
            <p className="mt-4 text-meta text-neutral-500">
                Setter, agency and VA figures are typical market rates for this work, not quotes — check them against
                your own.
            </p>
        </div>
    </Section>
);

const VariantC: React.FC = () => (
    <LandingShell nav={NAV} variant="c">
        <Hero
            field={<RadarSweep />}
            title={
                <>
                    Your outbound team, <Em>in ten minutes a day.</Em>
                </>
            }
            sub={
                <>
                    Finding prospects, writing to each one, sending, following up — MagnetEngine runs all of it from
                    your own Instagram. You keep the one job that needs a human: deciding what goes out.
                </>
            }
        >
            <ProductPreview />
        </Hero>

        <MarqueeBand label="What runs while you work on something else" duration={50}>
            {STAGES.map(stage => {
                const yours = YOURS.has(stage);
                return (
                    <span key={stage} className="flex items-center gap-3 whitespace-nowrap">
                        <span
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-meta font-medium ${
                                yours ? 'bg-white text-surface' : 'border border-white/10 text-neutral-300'
                            }`}
                        >
                            {stage}
                            {yours && <span className="text-label font-semibold uppercase tracking-[0.1em] text-neutral-500">you</span>}
                        </span>
                        <ArrowRight size={14} aria-hidden className="text-neutral-600" />
                    </span>
                );
            })}
        </MarqueeBand>

        <Week />
        <Replaces />

        <Pricing
            heading={
                <>
                    {PRICES.monthly.label} a month. <Em>Three days to decide.</Em>
                </>
            }
        />

        <FAQ />

        <Close
            heading={
                <>
                    Your first campaign can be live <Em>within 48 hours.</Em>
                </>
            }
            body="Pick a niche, and the first drafts are waiting in your queue. The ten minutes a day start there."
        />
    </LandingShell>
);

export default VariantC;
