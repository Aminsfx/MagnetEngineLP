import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, UserPlus, Star, Phone, Trophy, Send, Reply, MessageSquare, Repeat, type LucideIcon } from 'lucide-react';
import type { Lead } from '../../lib/types';
import { CARD_BEZEL } from '../../lib/theme';
import { formatRange, weekPeriod, weeklyReport } from '../../lib/reports';

/**
 * One week, Monday to Sunday, at a glance: what came in, what moved, and how
 * much outreach it took. Steps back week by week; never forward past this one.
 *
 * Messages sent counts openers plus follow-ups — the two kinds this product
 * sends. Inbox replies are left out while the Inbox is paused, rather than
 * shown as a zero that reads like a measurement.
 */

const Stat: React.FC<{ label: string; value: number; icon: LucideIcon; positive?: boolean }> = ({
    label, value, icon: Icon, positive,
}) => (
    <div className="px-4 py-3.5 min-w-0">
        <p className="text-meta text-neutral-400 truncate">{label}</p>
        <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-2xl font-semibold text-white tabular-nums leading-none">{value}</span>
            <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-none ${
                    positive ? 'bg-positive-500/15 text-positive-400' : 'bg-white/[0.06] text-neutral-300'
                }`}
                aria-hidden
            >
                <Icon className="w-3.5 h-3.5" />
            </span>
        </div>
    </div>
);

/** A count with a two-part bar under it: the first part solid, the rest faint. */
const Split: React.FC<{
    label: string;
    icon: LucideIcon;
    value: number;
    part: number;
    partLabel: string;
    restLabel: string;
}> = ({ label, icon: Icon, value, part, partLabel, restLabel }) => {
    const share = value > 0 ? part / value : 0;
    return (
        <div className="px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-meta text-neutral-400">{label}</p>
                <Icon className="w-3.5 h-3.5 text-neutral-400" aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-semibold text-white tabular-nums leading-none">{value}</p>
            <span className="mt-3 block h-1.5 rounded-full bg-white/[0.06] overflow-hidden" aria-hidden>
                <span className="block h-full rounded-full bg-white" style={{ width: `${share * 100}%` }} />
            </span>
            <p className="mt-2 flex items-center gap-4 text-label text-neutral-400 tabular-nums">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden />{partLabel}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white/25" aria-hidden />{restLabel}</span>
            </p>
        </div>
    );
};

export const WeeklyReport: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    const [offset, setOffset] = useState(0);
    const week = useMemo(() => weekPeriod(offset), [offset]);
    const r = useMemo(() => weeklyReport(leads, week), [leads, week]);

    const navBtn = 'p-1.5 rounded-lg border border-white/10 text-neutral-300 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:pointer-events-none';

    return (
        <section aria-labelledby="weekly-title">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/8">
                <div className="min-w-0">
                    <h2 id="weekly-title" className="text-body-sm font-semibold text-white">Weekly report</h2>
                    <p className="text-label text-neutral-400 truncate">
                        {offset === 0 ? 'This week · ' : offset === -1 ? 'Last week · ' : ''}{formatRange(week)}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 flex-none">
                    <button type="button" className={navBtn} onClick={() => setOffset(o => o - 1)} aria-label="Previous week">
                        <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
                    </button>
                    <button type="button" className={navBtn} onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset === 0} aria-label="Next week">
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden />
                    </button>
                </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
                <div
                    className="rounded-[calc(1.5rem-1px)] overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/8 [&>*]:bg-surface-sunken"
                    style={CARD_BEZEL.inner}
                >
                    <Stat label="New leads" value={r.newLeads} icon={UserPlus} />
                    <Stat label="Qualified" value={r.qualified} icon={Star} />
                    <Stat label="Booked" value={r.booked} icon={Phone} positive />
                    <Stat label="Won" value={r.won} icon={Trophy} positive />
                    <div className="col-span-2">
                        <Split
                            label="Messages sent"
                            icon={Send}
                            value={r.messagesSent}
                            part={r.openers}
                            partLabel={`${r.openers} openers`}
                            restLabel={`${r.followUps} follow-ups`}
                        />
                    </div>
                    <div className="col-span-2">
                        <Split
                            label="Openers"
                            icon={MessageSquare}
                            value={r.openers}
                            part={r.openersReplied}
                            partLabel={`${r.openersReplied} replied`}
                            restLabel={r.replyRate === null ? 'no reply rate yet' : `${r.replyRate}% reply rate`}
                        />
                    </div>
                    <div className="lg:col-span-2"><Stat label="Replies received" value={r.replies} icon={Reply} /></div>
                    <div className="lg:col-span-2"><Stat label="Follow-ups sent" value={r.followUps} icon={Repeat} /></div>
                </div>
            </div>
        </section>
    );
};
