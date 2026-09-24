import React from 'react';
import {
    Sparkles, Trash2, Check, X, Edit3, Users, MessageSquare, MapPin,
    CheckCircle, XCircle, Clock, MessageCircle, ThumbsUp, MessagesSquare, CalendarCheck, Send, Hourglass,
} from 'lucide-react';
import { Lead } from '../../lib/types';
import { ReplyBattlecards } from './ReplyBattlecards';
import type { TemplateContext } from '../../lib/followups';

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

/** "3h ago" — coarse on purpose: the Operator needs "today or not", not seconds. */
function ago(iso: string): string {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
}

/**
 * The Actions cell's icon buttons, one entry per role.
 *
 * Written out rather than built from a role name because Tailwind's content
 * scanner only sees literal class strings — an interpolated
 * `hover:text-${role}-400` compiles to nothing. Each button also carries an
 * `aria-label`: `title` alone is a hover tooltip, which is no name at all to
 * a screen reader or a keyboard user.
 */
const ICON_BTN = {
    neutral: 'p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors',
    positive: 'p-1.5 rounded-lg text-neutral-300 hover:text-positive-300 hover:bg-positive-500/10 transition-colors',
    danger: 'p-1.5 rounded-lg text-neutral-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors',
    /** Delete only: it rests one step dimmer than Reject, since it is the
        irreversible one and should not be what the eye lands on first. */
    dangerQuiet: 'p-1.5 rounded-lg text-neutral-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors',
} as const;

/** One status pill. The icon is decoration; the word carries the state. */
const Pill: React.FC<{ tone: 'positive' | 'danger' | 'ready' | 'muted'; icon: React.ReactNode; children: React.ReactNode }> = ({
    tone, icon, children,
}) => {
    const cls = {
        positive: 'bg-positive-500/10 text-positive-300 border-positive-500/25',
        danger: 'bg-danger-500/10 text-danger-300 border-danger-500/25',
        ready: 'bg-white/10 text-white border-white/20',
        muted: 'bg-white/5 text-neutral-300 border-white/10',
    }[tone];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-label font-medium border whitespace-nowrap ${cls}`}>
            <span aria-hidden>{icon}</span>
            {children}
        </span>
    );
};

export interface QueueRowProps {
    lead: Lead;
    isSelected: boolean;
    isEditing: boolean;
    /** The in-progress edit text — only meaningful (and only passed) while editing. */
    editDraft: string | null;
    showBattlecards: boolean;
    isGenerating: boolean;
    /** Offer Ledger + booking link, for the reply battlecards. `AppConfig` fits. */
    ledger?: TemplateContext;
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
    ledger,
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
    const rowClass = lead.dmSent
        ? ''
        : lead.approved
        ? 'bg-positive-500/[0.03]'
        : lead.rejected
        ? 'bg-danger-500/[0.03]'
        : '';
    const who = `@${lead.handle}`;

    return (
        <>
            <tr className={`transition-colors hover:bg-white/[0.02] ${isSelected ? 'bg-white/[0.06]' : rowClass}`}>
                {/* Select */}
                <td className="pl-5 pr-2 py-4 align-top">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(lead.id)}
                        aria-label={`Select ${who}`}
                        className="w-4 h-4 mt-1 rounded border-white/20 bg-transparent accent-white cursor-pointer"
                    />
                </td>
                {/* Lead */}
                <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-3">
                        {/* A page is a screenful of Instagram CDN avatars — up to 100 — so the
                            img is lazy: eager loading fired every cross-origin request the
                            moment the queue mounted, and the scraped URLs are signed and
                            expire, so most of them are 403s. */}
                        {lead.profilePicUrl ? (
                            <img src={lead.profilePicUrl} alt=""
                                loading="lazy"
                                decoding="async"
                                width={36}
                                height={36}
                                className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        ) : (
                            // Was white text on a white-to-grey gradient, i.e. invisible.
                            <div aria-hidden className="w-9 h-9 rounded-full bg-neutral-800 ring-1 ring-white/10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(lead.name || lead.handle)[0]?.toUpperCase()}
                            </div>
                        )}
                        <div className="min-w-0">
                            <div className="font-medium text-white text-sm leading-tight">{lead.name}</div>
                            <div className="text-neutral-400 text-xs mt-0.5">{who}</div>
                            <div className="flex items-center gap-1.5 mt-1 text-label text-neutral-400 tabular-nums">
                                <Users className="w-3 h-3" aria-hidden />
                                <span>{formatFollowers(lead.followers)}<span className="sr-only"> followers</span></span>
                                {lead.businessAccount && (
                                    <span className="bg-white/10 text-white px-1 py-0.5 rounded">Business</span>
                                )}
                            </div>
                            {/* `neutral`, not an accent: which campaign a Lead came
                                from is a label, not a state. See docs/DESIGN-TOKENS.md. */}
                            {lead.campaignName && (
                                <div className="mt-1 inline-flex items-center gap-1 text-label text-neutral-300 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full max-w-[140px] truncate">
                                    {lead.campaignName}
                                </div>
                            )}
                        </div>
                    </div>
                </td>

                {/* Bio */}
                <td className="px-5 py-4 align-top">
                    <p className="text-xs text-neutral-400 leading-relaxed">
                        {lead.bio || <span className="text-neutral-400 italic">No bio</span>}
                    </p>
                    {lead.city && (
                        <p className="flex items-center gap-1 text-label text-neutral-400 mt-1.5">
                            <MapPin className="w-3 h-3" aria-hidden /> {lead.city}
                        </p>
                    )}
                </td>

                {/* DM — shown in full. Approval is the product's one human
                    judgement, and it used to be made on four clamped lines
                    with the rest behind a hover no keyboard can reach. */}
                <td className="px-5 py-4 align-top">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editDraft ?? ''}
                                onChange={e => onEditDraftChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') { e.preventDefault(); onCancelEdit(); }
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSaveEdit(lead.id); }
                                }}
                                rows={6}
                                autoFocus
                                aria-label={`Edit the DM to ${who}`}
                                className="w-full bg-surface border border-white/30 rounded-xl px-3 py-2 text-sm leading-relaxed text-white focus:outline-none focus:ring-1 focus:ring-white/50 resize-y"
                            />
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => onSaveEdit(lead.id)}
                                    className="flex items-center gap-1 px-3 py-1 bg-white/20 text-white rounded-lg text-xs hover:bg-white/30 transition-colors">
                                    <Check className="w-3 h-3" aria-hidden /> Save
                                </button>
                                <button type="button" onClick={onCancelEdit}
                                    className="flex items-center gap-1 px-3 py-1 bg-white/5 text-neutral-300 rounded-lg text-xs hover:bg-white/10 transition-colors">
                                    <X className="w-3 h-3" aria-hidden /> Cancel
                                </button>
                                <span className="ml-auto text-label text-neutral-400">Ctrl+Enter saves · Esc cancels</span>
                            </div>
                        </div>
                    ) : lead.dmContent ? (
                        <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                            {lead.dmContent}
                        </p>
                    ) : (
                        <span className="text-xs text-neutral-400 italic">Not written yet</span>
                    )}
                </td>

                {/* Status — the furthest the Lead has got. Sent is the extension's
                    word (CONTEXT.md); Handed off only means it accepted the work. */}
                <td className="px-5 py-4 align-top">
                    {lead.dmSent ? (
                        <Pill tone="positive" icon={<Send className="w-3 h-3" />}>Sent</Pill>
                    ) : lead.approved && lead.handedOffAt ? (
                        <span title="The extension has this DM and will send it on its pace and Send Cap. It shows Sent once the extension confirms it.">
                            <Pill tone="muted" icon={<Hourglass className="w-3 h-3" />}>Handed off</Pill>
                            <span className="block mt-1 text-label text-neutral-400">{ago(lead.handedOffAt)}</span>
                        </span>
                    ) : lead.approved ? (
                        <Pill tone="positive" icon={<CheckCircle className="w-3 h-3" />}>Approved</Pill>
                    ) : lead.rejected ? (
                        <Pill tone="danger" icon={<XCircle className="w-3 h-3" />}>Rejected</Pill>
                    ) : lead.dmContent ? (
                        <Pill tone="ready" icon={<MessageSquare className="w-3 h-3" />}>Ready</Pill>
                    ) : (
                        <Pill tone="muted" icon={<Clock className="w-3 h-3" />}>Pending</Pill>
                    )}
                    {lead.booked ? (
                        <span className="block mt-1.5 text-label font-medium text-positive-400">Booked</span>
                    ) : lead.replied ? (
                        <span className="block mt-1.5 text-label font-medium text-neutral-300">
                            {lead.positiveReply ? 'Replied · interested' : 'Replied'}
                        </span>
                    ) : null}
                </td>

                {/* Actions */}
                <td className="px-5 py-4 align-top">
                    <div className="flex items-center gap-1">
                        {/* Edit — only before it has gone out. */}
                        {lead.dmContent && !isEditing && !lead.dmSent && (
                            <button type="button" onClick={() => onStartEdit(lead)}
                                title="Edit DM" aria-label={`Edit the DM to ${who}`} className={ICON_BTN.neutral}>
                                <Edit3 className="w-4 h-4" aria-hidden />
                            </button>
                        )}

                        {/* Approve */}
                        {lead.dmContent && !lead.approved && !lead.dmSent && (
                            <button type="button" onClick={() => onApprove(lead.id)}
                                title="Approve" aria-label={`Approve the DM to ${who}`} className={ICON_BTN.positive}>
                                <Check className="w-4 h-4" aria-hidden />
                            </button>
                        )}

                        {/* Reject — pointless once Sent. */}
                        {!lead.rejected && !lead.dmSent && (
                            <button type="button" onClick={() => onReject(lead.id)}
                                title="Reject" aria-label={`Reject the DM to ${who}`} className={ICON_BTN.danger}>
                                <X className="w-4 h-4" aria-hidden />
                            </button>
                        )}

                        {/* Mark replied */}
                        {lead.dmSent && !lead.replied && (
                            <button
                                type="button"
                                onClick={() => {
                                    onUpdateLead({ ...lead, replied: true });
                                    // Open (never close) — matches the pre-extraction behaviour,
                                    // which set the id outright rather than toggling.
                                    if (!showBattlecards) onToggleBattlecards(lead.id);
                                }}
                                title="Mark as replied"
                                aria-label={`Mark ${who} as replied`}
                                className={ICON_BTN.neutral}
                            >
                                <MessageCircle className="w-4 h-4" aria-hidden />
                            </button>
                        )}
                        {/* Mark positive reply — its own icon; it used to share
                            "Mark replied"'s speech bubble. */}
                        {lead.replied && !lead.positiveReply && (
                            <button type="button" onClick={() => onUpdateLead({ ...lead, positiveReply: true })}
                                title="Mark as interested" aria-label={`Mark ${who}'s reply as interested`} className={ICON_BTN.positive}>
                                <ThumbsUp className="w-4 h-4" aria-hidden />
                            </button>
                        )}
                        {/* Mark booked */}
                        {lead.positiveReply && !lead.booked && (
                            <button type="button" onClick={() => onUpdateLead({ ...lead, booked: true })}
                                title="Mark as booked" aria-label={`Mark ${who} as booked`} className={ICON_BTN.positive}>
                                <CalendarCheck className="w-4 h-4" aria-hidden />
                            </button>
                        )}
                        {/* Reply battlecards */}
                        {lead.replied && (
                            <button
                                type="button"
                                onClick={() => onToggleBattlecards(lead.id)}
                                title="Suggested replies"
                                aria-label={`Suggested replies for ${who}`}
                                aria-expanded={showBattlecards}
                                className={showBattlecards
                                    ? 'p-1.5 rounded-lg transition-colors text-white bg-white/10'
                                    : ICON_BTN.neutral}
                            >
                                <MessagesSquare className="w-4 h-4" aria-hidden />
                            </button>
                        )}

                        {/* Generate DM for this lead */}
                        {!lead.dmContent && (
                            <button
                                type="button"
                                onClick={() => onGenerateDM(lead)}
                                disabled={isGenerating}
                                title="Write DM"
                                aria-label={`Write a DM for ${who}`}
                                className={`${ICON_BTN.neutral} disabled:opacity-40`}
                            >
                                <Sparkles className="w-4 h-4" aria-hidden />
                            </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                            <button type="button" onClick={() => onDelete(lead)}
                                title="Delete" aria-label={`Delete ${who} from the queue`} className={ICON_BTN.dangerQuiet}>
                                <Trash2 className="w-4 h-4" aria-hidden />
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
                            ledger={ledger}
                            onUpdateLead={onUpdateLead}
                        />
                    </td>
                </tr>
            )}
        </>
    );
};

export const QueueRow = React.memo(QueueRowBase);
