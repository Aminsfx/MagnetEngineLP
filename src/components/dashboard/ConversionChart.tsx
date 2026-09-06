import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Lead } from '../../lib/types';
import { CARD_BEZEL, CHART } from '../../lib/theme';

interface ConversionChartProps {
    leads: Lead[];
}

interface DayPoint {
    name: string;
    sent: number;
    replies: number;
}

/** Build per-day counts of DMs sent + replies for the last 7 days from lead dates */
function buildWeekSeries(leads: Lead[]): { data: DayPoint[]; hasActivity: boolean } {
    const days: { key: string; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({
            key: d.toISOString().slice(0, 10),
            label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        });
    }

    const sentByDay = new Map<string, number>();
    const repliesByDay = new Map<string, number>();
    for (const lead of leads) {
        if (lead.dmDate) {
            const k = lead.dmDate.slice(0, 10);
            sentByDay.set(k, (sentByDay.get(k) ?? 0) + 1);
        }
        if (lead.replyDate) {
            const k = lead.replyDate.slice(0, 10);
            repliesByDay.set(k, (repliesByDay.get(k) ?? 0) + 1);
        }
    }

    const data = days.map(({ key, label }) => ({
        name: label,
        sent: sentByDay.get(key) ?? 0,
        replies: repliesByDay.get(key) ?? 0,
    }));

    return { data, hasActivity: data.some(d => d.sent > 0 || d.replies > 0) };
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-surface-sunken border border-white/10 rounded-2xl p-4 shadow-xl shadow-black/50 backdrop-blur-md">
                <p className="text-neutral-500 text-xs font-medium uppercase tracking-widest mb-2">{label}</p>
                {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: entry.color }}
                        />
                        <span className="text-neutral-400 capitalize">{entry.name}:</span>
                        <span className="text-white font-semibold">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const ConversionChart: React.FC<ConversionChartProps> = ({ leads }) => {
    const { data, hasActivity } = useMemo(() => buildWeekSeries(leads), [leads]);

    return (
        /* Outer shell */
        <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
            {/* Inner core */}
            <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6 relative overflow-hidden" style={CARD_BEZEL.inner}>
                {/* Background glow — planet horizon echo */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-brand-500/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="mb-6">
                    <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-600 uppercase mb-1">Last 7 Days</p>
                    <h3 className="text-base font-semibold text-white tracking-tight">Outreach Activity</h3>
                </div>

                {hasActivity ? (
                    <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART.sent} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={CHART.sent} stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="1 4"
                                stroke={CHART.grid}
                                vertical={false}
                            />
                            <XAxis
                                dataKey="name"
                                stroke="transparent"
                                tick={{ fill: CHART.axisTick, fontSize: 11, fontFamily: 'inherit' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="transparent"
                                tick={{ fill: CHART.axisTick, fontSize: 10, fontFamily: 'inherit' }}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART.cursor }} />
                            <Bar
                                dataKey="sent"
                                fill="url(#sentGradient)"
                                stroke={CHART.sent}
                                strokeWidth={1}
                                radius={[6, 6, 0, 0]}
                            />
                            <Line
                                type="monotone"
                                dataKey="replies"
                                stroke={CHART.replies}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, fill: CHART.replies, stroke: CHART.dotStroke, strokeWidth: 2 }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: '16px', fontSize: '11px', color: CHART.legendText }}
                                formatter={(value) => <span style={{ color: CHART.legendText, textTransform: 'capitalize' }}>{value}</span>}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-neutral-600" />
                        </div>
                        <p className="text-sm text-neutral-500">No outreach activity yet</p>
                        <p className="text-xs text-neutral-700 max-w-[260px]">
                            Once you generate DMs and start sending, your daily sends and replies will chart here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
