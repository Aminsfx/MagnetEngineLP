import React from 'react';
import { TrendingUp, Users, MessageSquare, DollarSign } from 'lucide-react';
import { DashboardStats } from '../../lib/types';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: string;
    icon: React.ReactNode;
    accent?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, accent = 'blue' }) => {
    const accentColors = {
        blue: 'from-blue-600 to-blue-900',
        emerald: 'from-emerald-600 to-emerald-900',
        purple: 'from-purple-600 to-purple-900',
        orange: 'from-orange-600 to-orange-900',
    };

    return (
        <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6 hover:border-blue-600/30 transition-all">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accentColors[accent as keyof typeof accentColors]} flex items-center justify-center`}>
                    {icon}
                </div>
                {change && (
                    <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {change}
                    </span>
                )}
            </div>
            <p className="text-sm text-zinc-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    );
};

interface MetricsGridProps {
    stats: DashboardStats;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
                title="Total Leads"
                value={stats.totalLeads.toLocaleString()}
                change="+12%"
                icon={<Users className="w-6 h-6 text-white" />}
                accent="blue"
            />
            <MetricCard
                title="DMs Sent"
                value={stats.dmsSent.toLocaleString()}
                change="+28%"
                icon={<MessageSquare className="w-6 h-6 text-white" />}
                accent="purple"
            />
            <MetricCard
                title="Response Rate"
                value={`${stats.responseRate}%`}
                change="+5.4%"
                icon={<TrendingUp className="w-6 h-6 text-white" />}
                accent="orange"
            />
            <MetricCard
                title="Revenue"
                value={`$${stats.revenue.toLocaleString()}`}
                change="+18%"
                icon={<DollarSign className="w-6 h-6 text-white" />}
                accent="emerald"
            />
        </div>
    );
};
