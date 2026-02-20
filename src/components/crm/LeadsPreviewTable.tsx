import React, { useState } from 'react';
import { Lead } from '../../lib/types';
import { Eye, X } from 'lucide-react';

interface LeadsPreviewTableProps {
    leads: Lead[];
}

export const LeadsPreviewTable: React.FC<LeadsPreviewTableProps> = ({ leads }) => {
    const [viewingDM, setViewingDM] = useState<Lead | null>(null);

    if (leads.length === 0) {
        return (
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-12 text-center">
                <p className="text-zinc-500">No leads imported yet. Click "Import CSV" to get started.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#0B0F19] border-b border-[#1E293B]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Instagram</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Followers</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Account Type</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">DM Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E293B]">
                            {leads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-white">{lead.name}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-400">@{lead.handle}</td>
                                    <td className="px-6 py-4 text-sm text-zinc-400">{lead.followers.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs ${lead.isPrivate ? 'bg-purple-600/10 text-purple-400' : 'bg-blue-600/10 text-blue-400'}`}>
                                            {lead.isPrivate ? 'Private' : 'Public'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.dmSent ? (
                                            <span className="px-2 py-1 rounded text-xs bg-emerald-600/10 text-emerald-400">
                                                ✓ DM Sent
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded text-xs bg-orange-600/10 text-orange-400">
                                                Pending
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.dmSent && lead.dmContent && (
                                            <button
                                                onClick={() => setViewingDM(lead)}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 text-blue-400 rounded-lg text-xs transition-all"
                                            >
                                                <Eye className="w-3 h-3" />
                                                View DM
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DM Viewer Modal */}
            {viewingDM && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl max-w-2xl w-full p-6 relative">
                        <button
                            onClick={() => setViewingDM(null)}
                            className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-white">DM for {viewingDM.name}</h3>
                            <p className="text-sm text-zinc-500 mt-1">@{viewingDM.handle} • {viewingDM.followers.toLocaleString()} followers</p>
                        </div>

                        <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-6">
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {viewingDM.dmContent}
                            </p>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <p className="text-xs text-zinc-500">
                                Sent: {viewingDM.dmDate ? new Date(viewingDM.dmDate).toLocaleString() : 'N/A'}
                            </p>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(viewingDM.dmContent || '');
                                    alert('DM copied to clipboard!');
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-all"
                            >
                                Copy to Clipboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
