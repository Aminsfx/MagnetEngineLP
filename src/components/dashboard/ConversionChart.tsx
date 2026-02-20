import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Legend } from 'recharts';

const mockData = [
    { name: 'Mon', replies: 24, calls: 8 },
    { name: 'Tue', replies: 32, calls: 12 },
    { name: 'Wed', replies: 28, calls: 10 },
    { name: 'Thu', replies: 45, calls: 18 },
    { name: 'Fri', replies: 38, calls: 15 },
    { name: 'Sat', replies: 22, calls: 7 },
    { name: 'Sun', replies: 18, calls: 5 },
];

export const ConversionChart: React.FC = () => {
    return (
        <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Conversion Velocity</h3>
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={mockData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="name" stroke="#64748B" />
                    <YAxis stroke="#64748B" />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#131B2C',
                            border: '1px solid #1E293B',
                            borderRadius: '8px',
                            color: '#fff',
                        }}
                    />
                    <Legend />
                    <Bar dataKey="replies" fill="#2563EB" radius={[8, 8, 0, 0]} />
                    <Line type="monotone" dataKey="calls" stroke="#10B981" strokeWidth={2} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};
