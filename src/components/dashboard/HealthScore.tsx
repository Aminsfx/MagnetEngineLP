import React from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Lead } from '../../lib/types';

type Rag = 'green' | 'yellow' | 'red';

const DAY_MS = 86_400_000;

function withinDays(iso: string | undefined, days: number, nowMs: number): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t >= nowMs - days * DAY_MS;
}

function olderThanDays(iso: string | undefined, days: number, nowMs: number): boolean {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) && t < nowMs - days * DAY_MS;
}

export function computeHealth(leads: Lead[], now: Date = new Date()): {
    checks: { label: string; rag: Rag; line: string }[];
    score: number;
    overall: Rag;
    overallLabel: string;
} {
    const nowMs = now.getTime();

    // 1. Outreach active — DMs sent in the last 7 days
    const sent7d = leads.filter(l => l.dmSent && withinDays(l.dmDate, 7, nowMs)).length;
    const outreach = sent7d >= 20
        ? { rag: 'green' as Rag, line: `${sent7d} DMs sent this week — keep the streak` }
        : sent7d >= 1
            ? { rag: 'yellow' as Rag, line: `Only ${sent7d} DMs this week — aim for 20+` }
            : { rag: 'red' as Rag, line: 'No DMs sent this week — launch a campaign' };

    // 2. Queue cleared
    const ready = leads.filter(l => l.dmContent && !l.approved && !l.rejected).length;
    const queue = ready < 10
        ? { rag: 'green' as Rag, line: 'Approval queue is clear' }
        : ready < 30
            ? { rag: 'yellow' as Rag, line: `${ready} DMs waiting for review` }
            : { rag: 'red' as Rag, line: `${ready} DMs stuck in your queue — review them` };

    // 3. Replies handled
    const unhandled = leads.filter(l => l.replied && !l.positiveReply && !l.booked && !l.followedUp).length;
    const replies = unhandled === 0
        ? { rag: 'green' as Rag, line: 'All replies handled' }
        : unhandled < 5
            ? { rag: 'yellow' as Rag, line: `${unhandled} replies need a response` }
            : { rag: 'red' as Rag, line: `${unhandled} replies waiting — money is sitting in your inbox` };

    // 4. Follow-up coverage — silent leads older than 3 days with no follow-up
    const stale = leads.filter(l => l.dmSent && olderThanDays(l.dmDate, 3, nowMs) && !l.replied && !l.followedUp).length;
    const followUps = stale === 0
        ? { rag: 'green' as Rag, line: 'No leads slipping through' }
        : stale < 10
            ? { rag: 'yellow' as Rag, line: `${stale} leads need a follow-up` }
            : { rag: 'red' as Rag, line: `${stale} silent leads with no follow-up — most deals close on touch 2-3` };

    const checks = [
        { label: 'OUTREACH', ...outreach },
        { label: 'QUEUE', ...queue },
        { label: 'REPLIES', ...replies },
        { label: 'FOLLOW-UPS', ...followUps },
    ];

    const points: Record<Rag, number> = { green: 2, yellow: 1, red: 0 };
    const score = checks.reduce((sum, c) => sum + points[c.rag], 0);
    const overall: Rag = score >= 6 ? 'green' : score >= 3 ? 'yellow' : 'red';
    const overallLabel = overall === 'green' ? 'Healthy' : overall === 'yellow' ? 'Slipping' : 'At risk';

    return { checks, score, overall, overallLabel };
}

const RAG_STYLE: Record<Rag, string> = {
    green: 'text-emerald-400 bg-emerald-500/8 border-emerald-500/20',
    yellow: 'text-amber-400 bg-amber-500/8 border-amber-500/20',
    red: 'text-red-400 bg-red-500/8 border-red-500/20',
};

const RAG_ICON: Record<Rag, React.ReactNode> = {
    green: <CheckCircle className="w-3.5 h-3.5" />,
    yellow: <AlertTriangle className="w-3.5 h-3.5" />,
    red: <XCircle className="w-3.5 h-3.5" />,
};

export const HealthScore: React.FC<{ leads: Lead[] }> = ({ leads }) => {
    const { checks, score, overall, overallLabel } = computeHealth(leads);

    return (
        <div
            className="rounded-[1.5rem] p-[1px]"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}
        >
            <div
                className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">This Week</p>
                            <h3 className="text-sm font-semibold text-white tracking-tight leading-none">Outreach Health</h3>
                        </div>
                    </div>
                    {leads.length > 0 && (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold ${RAG_STYLE[overall]}`}>
                            {overallLabel} · {score}/8
                        </span>
                    )}
                </div>

                {leads.length === 0 ? (
                    <p className="text-xs text-zinc-600">Add your first leads to start tracking outreach health.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {checks.map(check => (
                            <div
                                key={check.label}
                                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${RAG_STYLE[check.rag]}`}
                            >
                                <span className="text-[10px] font-semibold tracking-wider uppercase">{check.label}</span>
                                <span className="flex items-center gap-1.5 text-[11px] text-right">
                                    {RAG_ICON[check.rag]}
                                    {check.line}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
