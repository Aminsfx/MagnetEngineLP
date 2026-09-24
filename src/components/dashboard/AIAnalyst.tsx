import React from 'react';
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
                text: `${stats.replyRate}% of your sent DMs got a reply. Try shortening your DMs to 1-2 sentences and lead with curiosity instead of pitching.`,
                metric: `${stats.replyRate}%`,
            });
        } else if (stats.replyRate >= 15) {
            insights.push({
                type: 'success',
                icon: <CheckCircle className="w-3.5 h-3.5" />,
                title: 'Strong reply rate',
                text: `${stats.replyRate}% of your sent DMs got a reply. Your messaging is landing — the lever now is volume.`,
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

const insightTone: Record<InsightType, string> = {
    critical: 'text-danger-400',
    warning: 'text-white',
    tip: 'text-neutral-300',
    success: 'text-positive-400',
    info: 'text-neutral-400',
};

export const AIAnalyst: React.FC<AIAnalystProps> = ({ stats }) => {
    // Rule-based, and it now says so by what it no longer does: it used to type
    // "Scanning pipeline health… Comparing to benchmarks…" in a loop forever,
    // performing an analysis that is a handful of if-statements.
    const insights = buildInsights(stats);


    /*
     * Rule-based, and titled as what it is: suggestions from your own numbers.
     * It used to be an "Analyst" with a sparkle icon, a typewriter pretending
     * to scan, coloured boxes per insight and a "best metric" footer.
     */
    return (
        <section aria-labelledby="suggestions-title">
            <h2 id="suggestions-title" className="text-body-sm font-semibold text-white pb-3 border-b border-white/8">
                Suggestions
            </h2>
            <ul className="divide-y divide-white/8">
                {insights.map((insight) => (
                    <li key={insight.title} className="flex items-start gap-3 py-4">
                        <span className={`mt-0.5 flex-shrink-0 ${insightTone[insight.type]}`} aria-hidden>{insight.icon}</span>
                        <div className="min-w-0">
                            <p className="text-meta font-semibold text-white">{insight.title}</p>
                            <p className="mt-1 text-meta text-neutral-400">{insight.text}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
};
