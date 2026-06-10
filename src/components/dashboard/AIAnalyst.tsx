import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, Info, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardStats } from '../../lib/types';

interface AIAnalystProps {
    stats: DashboardStats;
}

type InsightType = 'warning' | 'tip' | 'success' | 'info' | 'critical';

interface Insight {
    type: InsightType;
    icon: React.ReactNode;
    title: string;
    text: string;
    metric?: string;
}

function buildInsights(stats: DashboardStats): Insight[] {
    const insights: Insight[] = [];

    // 1. No leads yet — onboarding
    if (stats.totalLeads === 0) {
        insights.push({
            type: 'info',
            icon: <Info className="w-3.5 h-3.5" />,
            title: 'Get started',
            text: 'Head to Campaign Builder and search for your first batch of prospects.',
        });
        return insights;
    }

    // 2. DMs not sent — low send rate
    const sendRate = stats.totalLeads > 0 ? (stats.dmsSent / stats.totalLeads) * 100 : 0;
    if (sendRate < 40 && stats.totalLeads > 0) {
        insights.push({
            type: 'warning',
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
            title: 'Low send rate',
            text: `Only ${Math.round(sendRate)}% of leads have been contacted. Generate and approve more DMs to accelerate outreach.`,
            metric: `${Math.round(sendRate)}%`,
        });
    }

    // 3. Reply rate analysis
    if (stats.dmsSent > 5) {
        if (stats.replyRate < 5) {
            insights.push({
                type: 'critical',
                icon: <TrendingDown className="w-3.5 h-3.5" />,
                title: 'Reply rate very low',
                text: `${stats.replyRate}% reply rate is below the 5% minimum. Try shortening your DMs to 1-2 sentences and lead with curiosity instead of pitching.`,
                metric: `${stats.replyRate}%`,
            });
        } else if (stats.replyRate >= 15) {
            insights.push({
                type: 'success',
                icon: <CheckCircle className="w-3.5 h-3.5" />,
                title: 'Strong reply rate',
                text: `${stats.replyRate}% reply rate is excellent (industry avg: 5-10%). Your messaging is clearly resonating — scale up volume.`,
                metric: `${stats.replyRate}%`,
            });
        } else {
            insights.push({
                type: 'tip',
                icon: <Sparkles className="w-3.5 h-3.5" />,
                title: 'Reply rate can improve',
                text: `${stats.replyRate}% is decent but room to grow. A/B test opening lines — try leading with a genuine compliment vs. a direct question.`,
                metric: `${stats.replyRate}%`,
            });
        }
    }

    // 4. Positive reply rate
    if (stats.replyRate > 0 && stats.positiveReplyRate < 30) {
        insights.push({
            type: 'warning',
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
            title: 'Low positive intent',
            text: `Only ${stats.positiveReplyRate}% of replies show buying intent. Your targeting may be too broad — tighten your ICP or add more specific keywords to filter leads.`,
            metric: `${stats.positiveReplyRate}%`,
        });
    } else if (stats.positiveReplyRate >= 50) {
        insights.push({
            type: 'success',
            icon: <TrendingUp className="w-3.5 h-3.5" />,
            title: 'High positive intent',
            text: `${stats.positiveReplyRate}% of replies are positive — your targeting and messaging are well-aligned. Focus energy on converting these to calls.`,
            metric: `${stats.positiveReplyRate}%`,
        });
    }

    // 5. Booking rate
    if (stats.positiveReplyRate > 0 && stats.bookingRate < 20) {
        insights.push({
            type: 'tip',
            icon: <Sparkles className="w-3.5 h-3.5" />,
            title: 'Boost booking conversions',
            text: `${stats.bookingRate}% of warm replies are booking calls. Add a Calendly link directly in follow-ups and reduce friction with fewer questions before the call.`,
            metric: `${stats.bookingRate}%`,
        });
    }

    // 6. Follow-up rate
    if (stats.dmsSent > 0 && stats.followUpRate < 50) {
        insights.push({
            type: 'tip',
            icon: <Zap className="w-3.5 h-3.5" />,
            title: 'Increase follow-ups',
            text: `${stats.followUpRate}% of leads have received a follow-up. Most deals close on the 2nd-3rd touch — enable automated follow-ups to capture missed opportunities.`,
            metric: `${stats.followUpRate}%`,
        });
    }

    // 7. High performance — all green
    if (
        stats.replyRate >= 15 &&
        stats.positiveReplyRate >= 40 &&
        stats.bookingRate >= 20 &&
        insights.filter(i => i.type !== 'success').length === 0
    ) {
        insights.push({
            type: 'success',
            icon: <CheckCircle className="w-3.5 h-3.5" />,
            title: 'Pipeline is healthy',
            text: 'All key metrics are strong. Your primary lever now is volume — increase the number of leads scraped per campaign.',
        });
    }

    // Cap to 3 most important
    return insights.slice(0, 3);
}

const insightStyle: Record<InsightType, string> = {
    critical: 'bg-red-500/8 border-red-500/20 text-red-400',
    warning:  'bg-amber-500/8 border-amber-500/20 text-amber-400',
    tip:      'bg-cyan-500/8 border-cyan-500/20 text-cyan-400',
    success:  'bg-emerald-500/8 border-emerald-500/20 text-emerald-400',
    info:     'bg-white/4 border-white/8 text-zinc-400',
};

const analysisMessages = [
    'Scanning pipeline health…',
    'Calculating conversion ratios…',
    'Comparing to benchmarks…',
    'Insights ready.',
];

export const AIAnalyst: React.FC<AIAnalystProps> = ({ stats }) => {
    const [typedText, setTypedText] = useState('');
    const [analysisIndex, setAnalysisIndex] = useState(0);

    const insights = buildInsights(stats);

    useEffect(() => {
        let charIndex = 0;
        const target = analysisMessages[analysisIndex];
        setTypedText('');

        const typeInterval = setInterval(() => {
            if (charIndex < target.length) {
                setTypedText(target.slice(0, charIndex + 1));
                charIndex++;
            } else {
                clearInterval(typeInterval);
                setTimeout(() => {
                    setAnalysisIndex(prev => (prev + 1) % analysisMessages.length);
                }, 2200);
            }
        }, 38);

        return () => clearInterval(typeInterval);
    }, [analysisIndex]);

    // Best performing metric to highlight in footer
    const bestMetric = [
        { label: 'Reply Rate', value: stats.replyRate },
        { label: 'Positive %', value: stats.positiveReplyRate },
        { label: 'Booking Rate', value: stats.bookingRate },
    ].reduce((a, b) => a.value >= b.value ? a : b);

    return (
        <div className="rounded-[1.5rem] p-[1px] h-full"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
            <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6 h-full flex flex-col relative overflow-hidden"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>

                {/* Background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase">AI Engine</p>
                        <h3 className="text-sm font-semibold text-white tracking-tight leading-none">Analyst</h3>
                    </div>
                </div>

                {/* Typewriter feed */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 border border-white/6 mb-4">
                    <Zap className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="text-[11px] font-mono text-zinc-500 truncate">
                        {typedText}
                        <span className="animate-pulse text-emerald-500">|</span>
                    </span>
                </div>

                {/* Insights */}
                <div className="space-y-2.5 flex-1">
                    {insights.map((insight, index) => (
                        <div
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-xl border ${insightStyle[insight.type]}`}
                            style={{ animation: `fadeUp 0.5s cubic-bezier(0.32,0.72,0,1) ${index * 100}ms both` }}
                        >
                            <span className="mt-0.5 flex-shrink-0">{insight.icon}</span>
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold mb-0.5">{insight.title}</p>
                                <p className="text-[11px] leading-relaxed text-zinc-400">{insight.text}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer stat */}
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">{bestMetric.label}</span>
                    <span className="text-sm font-semibold text-emerald-400">
                        {bestMetric.value.toFixed(1)}%
                    </span>
                </div>
            </div>
        </div>
    );
};
