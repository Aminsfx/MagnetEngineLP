import React from 'react';
import confetti from 'canvas-confetti';
import { Lead } from '../../lib/types';
import { Users } from 'lucide-react';

interface KanbanBoardProps {
    leads: Lead[];
    onUpdateLead: (id: string, updates: Partial<Lead>) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onUpdateLead }) => {
    const handleDragStart = (e: React.DragEvent, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, newStatus: Lead['status']) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        onUpdateLead(leadId, { status: newStatus });

        // Trigger confetti if moved to "won"
        if (newStatus === 'won') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
            });
        }
    };

    const columns: { status: Lead['status']; title: string; color: string }[] = [
        { status: 'cold', title: 'Cold', color: 'blue' },
        { status: 'warm', title: 'Warm', color: 'orange' },
        { status: 'won', title: 'Won', color: 'emerald' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => {
                const columnLeads = leads.filter((l) => l.status === column.status);

                return (
                    <div
                        key={column.status}
                        className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.status)}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">{column.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${column.color}-600/10 text-${column.color}-400`}>
                                {columnLeads.length}
                            </span>
                        </div>

                        <div className="space-y-3 min-h-[400px]">
                            {columnLeads.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                                    <Users className="w-8 h-8 mb-2" />
                                    <p className="text-sm">No leads</p>
                                </div>
                            ) : (
                                columnLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead.id)}
                                        className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-4 cursor-move hover:border-blue-600/50 transition-all"
                                    >
                                        <p className="font-medium text-white mb-1">{lead.name}</p>
                                        <p className="text-sm text-zinc-500">@{lead.handle}</p>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1E293B]">
                                            <span className="text-xs text-zinc-600">{lead.followers.toLocaleString()} followers</span>
                                            {lead.dmSent && (
                                                <span className="ml-auto text-xs px-2 py-1 rounded bg-emerald-600/10 text-emerald-400">
                                                    DM Sent
                                                </span>
                                            )}
                                        </div>
                                        {column.status === 'won' && (
                                            <div className="mt-3 pt-3 border-t border-[#1E293B]">
                                                <label className="text-xs text-zinc-500 block mb-1">Deal Value ($)</label>
                                                <input
                                                    type="number"
                                                    value={lead.dealValue || ''}
                                                    onChange={(e) => onUpdateLead(lead.id, { dealValue: parseFloat(e.target.value) || 0 })}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="0"
                                                    className="w-full px-3 py-2 bg-[#131B2C] border border-[#1E293B] rounded-lg text-white text-sm focus:border-emerald-600/50 focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
