import React from 'react';
import {
    Sparkles, Trash2, Check, X, Edit3, Users, MessageSquare,
    CheckCircle, XCircle, Clock, MessageCircle, MessagesSquare, CalendarCheck,
} from 'lucide-react';
import { Lead } from '../../lib/types';
import { ReplyBattlecards } from './ReplyBattlecards';

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

export interface QueueRowProps {
    lead: Lead;
    isSelected: boolean;
    isEditing: boolean;
    /** The in-progress edit text — only meaningful (and only passed) while editing. */
    editDraft: string | null;
    showBattlecards: boolean;
    isGenerating: boolean;
    calendarLink?: string;
    canDelete: boolean;
    onToggleSelect: (id: string) => void;
    onStartEdit: (lead: Lead) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
    onEditDraftChange: (value: string) => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onUpdateLead: (lead: Lead) => void;
    onToggleBattlecards: (id: string) => void;
    onGenerateDM: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
}

/**
 * One row of the Approval Queue.
 *
 * Memoized on purpose: the queue renders up to 250 of these, and each carries a
 * controlled checkbox. React re-applies `name`/`type` on every controlled input
 * it re-renders, so an unmemoized row cost ~3 DOM attribute writes per row on
 * every commit — approving a single lead rewrote ~770 DOM nodes. With the memo,
 * only the row whose `lead` object actually changed re-renders.
 *
 * Every callback prop must have a stable identity (see `useStable`) or this
 * memo does nothing.
 */
const QueueRowBase: React.FC<QueueRowProps> = ({
    lead,
    isSelected,
    isEditing,
    editDraft,
    showBattlecards,
    isGenerating,
    calendarLink,
    canDelete,
    onToggleSelect,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onEditDraftChange,
    onApprove,
    onReject,
    onUpdateLead,
    onToggleBattlecards,
    onGenerateDM,
    onDelete,
}) => {
    const rowClass = lead.approved
        ? 'bg-emerald-500/[0.03]'
        : lead.rejected
        ? 'bg-red-500/[0.03]'
        : '';

    return (
        <>
            <tr className={`transition-colors hover:bg-white/[0.02] ${isSelected ? 'bg-emerald-500/[0.06]' : rowClass}`}>
                {/* Select */}
                <td className="pl-5 pr-2 py-4 align-top">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(lead.id)}
                        className="w-4 h-4 mt-1 rounded border-white/20 bg-transparent accent-emerald-500 cursor-pointer"
                    />
                </td>
                {/* Prospect */}
                <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                        {/* A page is a screenful of Instagram CDN avatars — up to 100 — so the
                            img is lazy: eager loading fired every cross-origin request the
                            moment the queue mounted, and the scraped URLs are signed and
                            expire, so most of them are 403s. */}
                        {lead.profilePicUrl ? (
                            <img src={lead.profilePicUrl} alt={lead.name}
                                loading="lazy"
                                decoding="async"
                                width={36}
                                height={36}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-cyan-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(lead.name || lead.handle)[0]?.toUpperCase()}
                            </div>
                        )}
                        <div>
                            <div className="font-medium text-white text-sm leading-tight">{lead.name}</div>
                            <div className="text-zinc-600 text-xs mt-0.5">@{lead.handle}</div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-700">
                                <Users className="w-3 h-3" />
                                {formatFollowers(lead.followers)}
                                {lead.businessAccount && (
                                    <span className="bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded">Biz</span>
                                )}
                            </div>
                            {lead.campaignName && (
                                <div className="mt-1 inline-flex items-center gap-1 text-[9px] text-violet-300/80 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full max-w-[140px] truncate">
                                    {lead.campaignName}
                                </div>
                            )}
                        </div>
                    </div>
                </td>

                {/* Bio / Profile data */}
                <td className="px-5 py-4">
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
                        {lead.bio ?? <span className="text-zinc-700 italic">No bio</span>}
                    </p>
                    {lead.city && (
                        <p className="text-[10px] text-zinc-700 mt-1">📍 {lead.city}</p>
                    )}
                </td>

                {/* DM */}
                <td className="px-5 py-4">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editDraft ?? ''}
                                onChange={e => onEditDraftChange(e.target.value)}
                                rows={4}
                                autoFocus
                                className="w-full bg-[#030604] border border-emerald-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => onSaveEdit(lead.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs hover:bg-emerald-500/30 transition-colors">
                                    <Check className="w-3 h-3" /> Save
                                </button>
                                <button onClick={onCancelEdit}
                                    className="flex items-center gap-1 px-3 py-1 bg-white/5 text-zinc-400 rounded-lg text-xs hover:bg-white/10 transition-colors">
                                    <X className="w-3 h-3" /> Cancel
                                </button>
                            </div>
                        </div>
                    ) : lead.dmContent ? (
                        <p className="text-xs text-zinc-300 leading-relaxed line-clamp-4 cursor-pointer hover:line-clamp-none transition-all"
                            title="Click to see full DM">
                            {lead.dmContent}
                        </p>
                    ) : (
                        <span className="text-xs text-zinc-700 italic">Pending generation…</span>
                    )}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                    {lead.approved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                    ) : lead.rejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            <XCircle className="w-3 h-3" /> Rejected
                        </span>
                    ) : lead.dmContent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <MessageSquare className="w-3 h-3" /> Ready
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-zinc-800/60 text-zinc-500 border border-white/5">
                            <Clock className="w-3 h-3" /> Pending
                        </span>
                    )}
                    {lead.booked && (
                        <span className="block mt-1.5 text-[10px] font-medium text-emerald-400">Booked ✓</span>
                    )}
                </td>

                {/* Actions */}
                <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                        {/* Edit */}
                        {lead.dmContent && !isEditing && (
                            <button
                                onClick={() => onStartEdit(lead)}
                                title="Edit DM"
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {/* Approve */}
                        {lead.dmContent && !lead.approved && (
                            <button
                                onClick={() => onApprove(lead.id)}
                                title="Approve"
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {/* Reject */}
                        {!lead.rejected && (
                            <button
                                onClick={() => onReject(lead.id)}
                                title="Reject"
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {/* Mark replied */}
                        {lead.dmSent && !lead.replied && (
                            <button
                                onClick={() => {
                                    onUpdateLead({ ...lead, replied: true });
                                    // Open (never close) — matches the pre-extraction behaviour,
                                    // which set the id outright rather than toggling.
                                    if (!showBattlecards) onToggleBattlecards(lead.id);
                                }}
                                title="Mark as Replied"
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                            >
                                <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {/* Mark positive reply */}
                        {lead.replied && !lead.positiveReply && (
                            <button
                                onClick={() => onUpdateLead({ ...lead, positiveReply: true })}
                                title="Mark as Positive Reply"
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            >
                                <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                            </button>
                        )}
                        {/* Mark booked */}
                        {lead.positiveReply && !lead.booked && (
                            <button
                                onClick={() => onUpdateLead({ ...lead, booked: true })}
                                title="Mark as Booked"
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            >
                                <CalendarCheck className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {/* Reply battlecards */}
                        {lead.replied && (
                            <button
                                onClick={() => onToggleBattlecards(lead.id)}
                                title="Reply battlecards"
                                className={`p-1.5 rounded-lg transition-all ${showBattlecards ? 'text-cyan-400 bg-cyan-500/10' : 'text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                            >
                                <MessagesSquare className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {/* Generate DM for this lead */}
                        {!lead.dmContent && (
                            <button
                                onClick={() => onGenerateDM(lead)}
                                disabled={isGenerating}
                                title="Generate DM"
                                className="p-1.5 rounded-lg text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all disabled:opacity-40"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                            </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                            <button
                                onClick={() => onDelete(lead)}
                                title="Delete"
                                className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </td>
            </tr>
            {showBattlecards && lead.replied && (
                <tr>
                    <td colSpan={6} className="px-5 py-4 bg-white/[0.015] border-t border-white/5">
                        <ReplyBattlecards
                            lead={lead}
                            calendarLink={calendarLink}
                            onUpdateLead={onUpdateLead}
                        />
                    </td>
                </tr>
            )}
        </>
    );
};

export const QueueRow = React.memo(QueueRowBase);
