import React from 'react';
import { Check, X, Calendar } from 'lucide-react';
import { Lead } from '../../lib/types';

interface LeadTableProps {
    leads: Lead[];
    onUpdateLead: (id: string, updates: Partial<Lead>) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({ leads, onUpdateLead }) => {
    const getStatusColor = (status: Lead['status']) => {
        switch (status) {
            case 'cold': return 'text-blue-400 bg-blue-600/10';
            case 'warm': return 'text-orange-400 bg-orange-600/10';
            case 'won': return 'text-emerald-400 bg-emerald-600/10';
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleFollowUpClick = (leadId: string, followUpNumber: 1 | 2 | 3) => {
        const today = new Date().toISOString();
        const field = `followUp${followUpNumber}Date` as keyof Lead;
        onUpdateLead(leadId, { [field]: today });
    };

    return (
        <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[#0B0F19] border-b border-[#1E293B]">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Instagram</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Followers</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Deal Value</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Replied</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">DM Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Follow-up 1</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Follow-up 2</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Follow-up 3</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E293B]">
                        {leads.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-zinc-500">
                                    No DMs have been generated yet. Import leads and click "Generate DMs" above.
                                </td>
                            </tr>
                        ) : (
                            leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-white">{lead.name}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-400">@{lead.handle}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-400">{lead.followers.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={lead.status}
                                            onChange={(e) => onUpdateLead(lead.id, { status: e.target.value as Lead['status'] })}
                                            className={`px-3 py-1 rounded-lg text-xs font-medium ${getStatusColor(lead.status)} border-0 cursor-pointer`}
                                        >
                                            <option value="cold">Cold</option>
                                            <option value="warm">Warm</option>
                                            <option value="won">Won</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.status === 'won' ? (
                                            <input
                                                type="number"
                                                value={lead.dealValue || ''}
                                                onChange={(e) => onUpdateLead(lead.id, { dealValue: parseFloat(e.target.value) || 0 })}
                                                placeholder="$0"
                                                className="w-20 px-2 py-1 bg-[#0B0F19] border border-[#1E293B] rounded text-sm text-emerald-400 focus:border-emerald-600/50 focus:outline-none"
                                            />
                                        ) : (
                                            <span className="text-xs text-zinc-600">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => onUpdateLead(lead.id, { replied: true })}
                                                className={`px-2 py-1 text-xs font-medium rounded transition-all ${lead.replied ? 'bg-emerald-600 text-white' : 'bg-[#0B0F19] border border-[#1E293B] text-zinc-500 hover:border-emerald-600/50 hover:text-emerald-400'}`}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                onClick={() => onUpdateLead(lead.id, { replied: false })}
                                                className={`px-2 py-1 text-xs font-medium rounded transition-all ${!lead.replied ? 'bg-red-600/20 text-red-400 border border-red-600/30' : 'bg-[#0B0F19] border border-[#1E293B] text-zinc-500 hover:border-red-600/50 hover:text-red-400'}`}
                                            >
                                                No
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-zinc-400">
                                        {lead.dmSent ? formatDate(lead.dmDate) : '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.followUp1Date ? (
                                            <span className="text-xs text-emerald-500">{formatDate(lead.followUp1Date)}</span>
                                        ) : (
                                            <button
                                                onClick={() => handleFollowUpClick(lead.id, 1)}
                                                disabled={!lead.dmSent}
                                                className="text-xs px-2 py-1 border border-[#1E293B] rounded text-zinc-500 hover:text-white hover:border-blue-600/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                Mark
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.followUp2Date ? (
                                            <span className="text-xs text-emerald-500">{formatDate(lead.followUp2Date)}</span>
                                        ) : (
                                            <button
                                                onClick={() => handleFollowUpClick(lead.id, 2)}
                                                disabled={!lead.followUp1Date}
                                                className="text-xs px-2 py-1 border border-[#1E293B] rounded text-zinc-500 hover:text-white hover:border-blue-600/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                Mark
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.followUp3Date ? (
                                            <span className="text-xs text-emerald-500">{formatDate(lead.followUp3Date)}</span>
                                        ) : (
                                            <button
                                                onClick={() => handleFollowUpClick(lead.id, 3)}
                                                disabled={!lead.followUp2Date}
                                                className="text-xs px-2 py-1 border border-[#1E293B] rounded text-zinc-500 hover:text-white hover:border-blue-600/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                Mark
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
