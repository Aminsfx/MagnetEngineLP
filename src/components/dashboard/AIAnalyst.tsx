import React from 'react';
import { Sparkles, TrendingDown, AlertTriangle } from 'lucide-react';
import { DashboardStats } from '../../lib/types';

interface AIAnalystProps {
    stats: DashboardStats;
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ stats }) => {
    const insights = [];

    // Generate dynamic insights
    if (stats.responseRate < 15) {
        insights.push({
            type: 'warning',
            icon: <AlertTriangle className="w-4 h-4" />,
            text: 'Response rate is below 15%. Consider shortening your DMs or testing different messaging angles.',
        });
    }

    if (stats.funnelEfficiency < 5) {
        insights.push({
            type: 'tip',
            icon: <Sparkles className="w-4 h-4" />,
            text: 'Low funnel efficiency detected. Focus on higher-quality leads or improve follow-up timing.',
        });
    }

    if (stats.dmsSent > stats.totalLeads * 0.8) {
        insights.push({
            type: 'success',
            icon: <TrendingDown className="w-4 h-4" />,
            text: 'Great outreach velocity! Your DM coverage is above 80%.',
        });
    }

    // Default insight
    if (insights.length === 0) {
        insights.push({
            type: 'info',
            icon: <Sparkles className="w-4 h-4" />,
            text: 'Everything looks good! Keep maintaining your current pace.',
        });
    }

    return (
        <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-white">AI Analyst</h3>
            </div>
            <div className="space-y-3">
                {insights.map((insight, index) => (
                    <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg ${insight.type === 'warning'
                                ? 'bg-orange-600/10 border border-orange-600/20'
                                : insight.type === 'success'
                                    ? 'bg-emerald-600/10 border border-emerald-600/20'
                                    : 'bg-blue-600/10 border border-blue-600/20'
                            }`}
                    >
                        <div
                            className={`mt-0.5 ${insight.type === 'warning'
                                    ? 'text-orange-500'
                                    : insight.type === 'success'
                                        ? 'text-emerald-500'
                                        : 'text-blue-500'
                                }`}
                        >
                            {insight.icon}
                        </div>
                        <p className="text-sm text-zinc-300">{insight.text}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
