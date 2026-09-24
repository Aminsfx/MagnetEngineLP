import React, { useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { Lead } from '../../lib/types';
import { CHART } from '../../lib/theme';

interface ConversionChartProps {
    leads: Lead[];
}

interface DayPoint {
    name: string;
    sent: number;
    replies: number;
}

/** Per-day counts of confirmed sends and replies over the last 7 days. */
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
        // Only confirmed sends. `dmDate` is stamped when the DM is WRITTEN (and
        // kept on send), so counting every dated Lead charted drafts as sends —
        // "10 sent" beside a pipeline that said 9. The day is still the best
        // date the Lead carries; Sent itself carries none (CONTEXT.md).
        if (lead.dmSent && lead.dmDate) {
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
                <p className="text-neutral-400 text-xs font-medium uppercase tracking-widest mb-2">{label}</p>
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

    const weekSent = data.reduce((n, d) => n + d.sent, 0);
    const weekReplies = data.reduce((n, d) => n + d.replies, 0);

    return (
        <section aria-labelledby="week-title">
            <div className="flex items-baseline justify-between gap-4 pb-3 border-b border-white/8">
                <h2 id="week-title" className="text-body-sm font-semibold text-white">Last 7 days</h2>
                <span className="text-label text-neutral-400 tabular-nums">
                    {weekSent} sent · {weekReplies} {weekReplies === 1 ? 'reply' : 'replies'}
                </span>
            </div>
            <div className="pt-5">
                {hasActivity ? (
                    <ResponsiveContainer width="100%" height={200}>
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
                    <div className="h-[200px] flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-neutral-400" aria-hidden />
                        </div>
                        <p className="text-sm text-neutral-300">No outreach activity yet</p>
                        <p className="text-xs text-neutral-400 max-w-[260px]">
                            Once you generate DMs and start sending, your daily sends and replies will chart here.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};
