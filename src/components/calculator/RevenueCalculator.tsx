import React, { useState } from 'react';
import { Calculator, TrendingUp } from 'lucide-react';

export const RevenueCalculator: React.FC = () => {
    const [revenueGoal, setRevenueGoal] = useState(100000);
    const [dealSize, setDealSize] = useState(5000);
    const [dmToReply, setDmToReply] = useState(10); // %
    const [replyToCall, setReplyToCall] = useState(50); // %
    const [callToClose, setCallToClose] = useState(30); // %

    const calculate = () => {
        const dealsNeeded = revenueGoal / dealSize;
        const callsNeeded = dealsNeeded / (callToClose / 100);
        const repliesNeeded = callsNeeded / (replyToCall / 100);
        const dmsNeeded = repliesNeeded / (dmToReply / 100);
        const dailyDMs = Math.ceil(dmsNeeded / 30); // Assuming 30 days

        return {
            dealsNeeded: Math.ceil(dealsNeeded),
            dmsNeeded: Math.ceil(dmsNeeded),
            dailyDMs,
        };
    };

    const results = calculate();

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center">
                        <Calculator className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Revenue Calculator</h2>
                        <p className="text-sm text-zinc-500">Reverse engineer your daily DM target</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Monthly Revenue Goal ($)</label>
                        <input
                            type="number"
                            value={revenueGoal}
                            onChange={(e) => setRevenueGoal(Number(e.target.value))}
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Average Deal Size ($)</label>
                        <input
                            type="number"
                            value={dealSize}
                            onChange={(e) => setDealSize(Number(e.target.value))}
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">DM → Reply Rate (%)</label>
                        <input
                            type="number"
                            value={dmToReply}
                            onChange={(e) => setDmToReply(Number(e.target.value))}
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Reply → Call Rate (%)</label>
                        <input
                            type="number"
                            value={replyToCall}
                            onChange={(e) => setReplyToCall(Number(e.target.value))}
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Call → Close Rate (%)</label>
                        <input
                            type="number"
                            value={callToClose}
                            onChange={(e) => setCallToClose(Number(e.target.value))}
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600/10 to-emerald-600/10 border border-blue-600/20 rounded-2xl p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <p className="text-sm text-zinc-400 mb-2">You need to send</p>
                    <p className="text-6xl font-bold text-white mb-2">{results.dailyDMs}</p>
                    <p className="text-lg text-zinc-400 mb-6">DMs per day</p>

                    <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                        <div>
                            <p className="text-2xl font-bold text-white">{results.dealsNeeded}</p>
                            <p className="text-xs text-zinc-500">Deals Needed</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{results.dmsNeeded}</p>
                            <p className="text-xs text-zinc-500">Total DMs</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-500">${revenueGoal.toLocaleString()}</p>
                            <p className="text-xs text-zinc-500">Revenue Goal</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
