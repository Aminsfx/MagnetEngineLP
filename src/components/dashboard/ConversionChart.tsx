import React from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
    { name: 'Mon', replies: 24, calls: 8 },
    { name: 'Tue', replies: 32, calls: 12 },
    { name: 'Wed', replies: 28, calls: 10 },
    { name: 'Thu', replies: 45, calls: 18 },
    { name: 'Fri', replies: 38, calls: 15 },
    { name: 'Sat', replies: 22, calls: 7 },
    { name: 'Sun', replies: 18, calls: 5 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#030A06] border border-white/10 rounded-2xl p-4 shadow-xl shadow-black/50 backdrop-blur-md">
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-2">{label}</p>
                {payload.map((entry: any) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: entry.color }}
                        />
                        <span className="text-zinc-400 capitalize">{entry.name}:</span>
                        <span className="text-white font-semibold">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const ConversionChart: React.FC = () => {
    return (
        /* Outer shell */
        <div className="rounded-[1.5rem] p-[1px]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
            {/* Inner core */}
            <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6 relative overflow-hidden" style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
                {/* Background glow — planet horizon echo */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-600 uppercase mb-1">Weekly Overview</p>
                        <h3 className="text-base font-semibold text-white tracking-tight">Conversion Velocity</h3>
                    </div>
                    {/* Live indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/8 bg-white/3 text-[11px] text-zinc-500">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Live
                    </div>
                </div>

                <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={mockData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="repliesGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="1 4"
                            stroke="rgba(255,255,255,0.04)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="name"
                            stroke="transparent"
                            tick={{ fill: '#52525B', fontSize: 11, fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="transparent"
                            tick={{ fill: '#52525B', fontSize: 10, fontFamily: 'inherit' }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                        <Bar
                            dataKey="replies"
                            fill="url(#repliesGradient)"
                            stroke="#10B981"
                            strokeWidth={1}
                            radius={[6, 6, 0, 0]}
                        />
                        <Line
                            type="monotone"
                            dataKey="calls"
                            stroke="#06b6d4"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#06b6d4', stroke: '#030A06', strokeWidth: 2 }}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '16px', fontSize: '11px', color: '#71717A' }}
                            formatter={(value) => <span style={{ color: '#71717A', textTransform: 'capitalize' }}>{value}</span>}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
