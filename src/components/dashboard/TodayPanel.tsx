import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { TodayCounts } from '../../lib/today';

/**
 * What is waiting on the Operator, each row linking to the one place to deal
 * with it, in the order the work happens.
 *
 * A list, not a card of tiles: these are jobs, and a job reads as a line you
 * can tick off. Reviewing drafts is the one job only a human can do, so it
 * alone gets the solid button.
 */
interface Row {
    key: keyof TodayCounts;
    to: string;
    label: (n: number) => string;
    action: string;
}

// Short enough to sit on one line beside the button on a phone.
const ROWS: Row[] = [
    { key: 'toReview', to: '/queue', label: n => (n === 1 ? 'draft to review' : 'drafts to review'), action: 'Review' },
    // "Not sent", not "not handed off": Leads approved before the handoff stamp
    // existed may already be with the extension, and Sent is the only thing
    // this row can say for certain they aren't.
    { key: 'toSend', to: '/queue', label: () => 'approved, not sent yet', action: 'Send' },
    { key: 'toAnswer', to: '/inbox', label: n => (n === 1 ? 'conversation to answer' : 'conversations to answer'), action: 'Inbox' },
    { key: 'toFollowUp', to: '/follow-ups', label: () => 'due a follow-up', action: 'Follow up' },
];

export const TodayPanel: React.FC<{ counts: TodayCounts; hasLeads: boolean }> = ({ counts, hasLeads }) => {
    const rows = ROWS.filter(r => counts[r.key] > 0);

    return (
        <section aria-labelledby="today-title">
            <h2 id="today-title" className="text-body-sm font-semibold text-white pb-3 border-b border-white/8">Today</h2>

            {rows.length === 0 ? (
                <p className="py-5 text-body-sm text-neutral-300">
                    {hasLeads ? 'Queue clear, inbox answered. ' : ''}
                    <Link to="/campaign" className="font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                        {hasLeads ? 'Start a campaign' : 'Find your first leads'}
                    </Link>{' '}
                    {hasLeads ? 'to line up tomorrow’s drafts.' : 'in the Campaign Builder.'}
                </p>
            ) : (
                <ul className="divide-y divide-white/8">
                    {rows.map((r, i) => {
                        const n = counts[r.key];
                        const primary = i === 0 && r.key === 'toReview';
                        return (
                            <li key={r.key}>
                                <Link
                                    to={r.to}
                                    className="group flex items-center gap-4 py-4 -mx-3 px-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                                >
                                    <span className="w-14 flex-none text-[1.75rem] leading-none font-semibold text-white tabular-nums tracking-[-0.03em]">
                                        {n}
                                    </span>
                                    <span className="flex-1 min-w-0 text-body-sm text-neutral-300">{r.label(n)}</span>
                                    <span
                                        className={`flex-none inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-meta font-semibold transition-colors ${
                                            primary
                                                ? 'bg-white text-surface group-hover:bg-neutral-200'
                                                : 'text-white border border-white/12 group-hover:border-white/30'
                                        }`}
                                    >
                                        {r.action}
                                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};
