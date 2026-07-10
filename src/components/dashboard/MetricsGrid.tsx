import React, { useState, useEffect } from 'react';
import {
    Users, MessageSquare, TrendingUp, ThumbsUp,
    Calendar, RefreshCw, Mail, Layers, ArrowUpRight,
} from 'lucide-react';
import { DashboardStats } from '../../lib/types';

// Cold-DM industry benchmarks used for the overlay lines on the rate cards
const BENCHMARKS = {
    replyRate:         { avg: 8,  good: 15 },  // % of DMs getting any reply
    positiveReplyRate: { avg: 40, good: 55 },  // % of replies that are positive
    bookingRate:       { avg: 6,  good: 20 },  // % of positive replies that book
};

const BELOW_AVG_HINT: Record<keyof typeof BENCHMARKS, string> = {
    replyRate: 'below 8% avg — try shorter DMs',
    positiveReplyRate: 'below 40% avg — tighten targeting',
    bookingRate: 'below 6% avg — add your booking link',
};

function benchmarkFor(
    key: keyof typeof BENCHMARKS,
    value: number,
): { text: string; tone: 'good' | 'bad' } | undefined {
    if (value === 0) return undefined;
    const { avg, good } = BENCHMARKS[key];
    if (value >= good) return { text: `vs ${avg}% avg — top 25%`, tone: 'good' };
    if (value >= avg) return { text: `vs ${avg}% avg — above average`, tone: 'good' };
    return { text: BELOW_AVG_HINT[key], tone: 'bad' };
}

interface MetricCardProps {
    title: string;
    value: string | number;
    subtext?: string;
    change?: string;
    icon: React.ReactNode;
    glowColor?: string;
    iconBg?: string;
    delay?: number;
    benchmark?: { text: string; tone: 'good' | 'bad' };
}

const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    subtext,
    change,
    icon,
    glowColor = 'rgba(16,185,129,0.15)',
    iconBg = 'bg-emerald-500/10 border-emerald-500/15',
    delay = 0,
    benchmark,
}) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <div
            className="rounded-[1.5rem] p-[1px]"
            style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.55s ease ${delay}ms, transform 0.55s cubic-bezier(0.32,0.72,0,1) ${delay}ms`,
            }}
        >
            <div
                className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-5 h-full relative overflow-hidden group cursor-default"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}
            >
                {/* Hover glow orb */}
                <div
                    className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500"
                    style={{ background: glowColor }}
                />

                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${iconBg}`}>
                        {icon}
                    </div>
                    {change && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-1 rounded-full">
                            <ArrowUpRight className="w-3 h-3" />
                            {change}
                        </span>
                    )}
                </div>

                {/* Value */}
                <p className="text-2xl font-semibold text-white tracking-tight leading-none mb-1">
                    {value}
                </p>

                {/* Label */}
                <p className="text-[10px] text-zinc-600 font-medium tracking-widest uppercase">{title}</p>

                {/* Subtext */}
                {subtext && (
                    <p className="text-[10px] text-zinc-700 mt-1 leading-tight">{subtext}</p>
                )}

                {/* Benchmark overlay */}
                {benchmark && (
                    <p className={`text-[10px] mt-1 font-medium ${benchmark.tone === 'good' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {benchmark.text}
                    </p>
                )}

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-5 right-5 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
        </div>
    );
};

interface MetricsGridProps {
    stats: DashboardStats;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Row 1 */}
            <MetricCard
                title="Approved Leads"
                value={stats.approvedLeads.toLocaleString()}
                subtext={`of ${stats.totalLeads} scraped`}
                icon={<Users className="w-4.5 h-4.5 text-emerald-400" />}
                glowColor="rgba(16,185,129,0.2)"
                iconBg="bg-emerald-500/10 border-emerald-500/15"
                delay={0}
            />
            <MetricCard
                title="DMs Sent"
                value={stats.dmsSent.toLocaleString()}
                subtext={`of ${stats.totalLeads} leads contacted`}
                icon={<MessageSquare className="w-4.5 h-4.5 text-cyan-400" />}
                glowColor="rgba(6,182,212,0.2)"
                iconBg="bg-cyan-500/10 border-cyan-500/15"
                delay={60}
            />
            <MetricCard
                title="Reply Rate"
                value={`${stats.replyRate}%`}
                subtext="any reply to DM sent"
                benchmark={benchmarkFor('replyRate', stats.replyRate)}
                icon={<TrendingUp className="w-4.5 h-4.5 text-emerald-400" />}
                glowColor="rgba(16,185,129,0.15)"
                iconBg="bg-emerald-500/10 border-emerald-500/15"
                delay={120}
            />
            <MetricCard
                title="Positive Reply Rate"
                value={`${stats.positiveReplyRate}%`}
                subtext="of replies showing interest"
                benchmark={benchmarkFor('positiveReplyRate', stats.positiveReplyRate)}
                icon={<ThumbsUp className="w-4.5 h-4.5 text-violet-400" />}
                glowColor="rgba(139,92,246,0.2)"
                iconBg="bg-violet-500/10 border-violet-500/15"
                delay={180}
            />

            {/* Row 2 */}
            <MetricCard
                title="Booking Rate"
                value={`${stats.bookingRate}%`}
                subtext="positive replies → booked call"
                benchmark={benchmarkFor('bookingRate', stats.bookingRate)}
                icon={<Calendar className="w-4.5 h-4.5 text-amber-400" />}
                glowColor="rgba(245,158,11,0.15)"
                iconBg="bg-amber-500/10 border-amber-500/15"
                delay={240}
            />
            <MetricCard
                title="Follow-up Rate"
                value={`${stats.followUpRate}%`}
                subtext="leads that received a follow-up"
                icon={<RefreshCw className="w-4.5 h-4.5 text-zinc-400" />}
                glowColor="rgba(161,161,170,0.12)"
                iconBg="bg-zinc-500/10 border-zinc-500/15"
                delay={300}
            />
            <MetricCard
                title="Leads Contacted"
                value={stats.leadsContacted.toLocaleString()}
                subtext="unique outreach touches"
                icon={<Mail className="w-4.5 h-4.5 text-blue-400" />}
                glowColor="rgba(96,165,250,0.15)"
                iconBg="bg-blue-500/10 border-blue-500/15"
                delay={360}
            />
            <MetricCard
                title="Active Campaigns"
                value={stats.activeCampaigns}
                subtext="distinct campaign runs"
                icon={<Layers className="w-4.5 h-4.5 text-emerald-400" />}
                glowColor="rgba(16,185,129,0.18)"
                iconBg="bg-emerald-500/10 border-emerald-500/15"
                delay={420}
            />
        </div>
    );
};
