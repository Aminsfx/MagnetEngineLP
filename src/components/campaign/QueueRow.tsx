import React, { useState } from 'react';
import {
    Sparkles, Trash2, Check, X, Edit3, MapPin, CornerUpLeft, RotateCcw, Hourglass,
    MessageCircle, ThumbsUp, MessagesSquare, CalendarCheck, DollarSign,
} from 'lucide-react';
import type { Lead } from '../../lib/types';
import type { QueueView } from '../../lib/queue';
import { sentDate } from '../../lib/sent';
import { formatMoney } from '../../lib/reports';
import { ReplyBattlecards } from './ReplyBattlecards';
import { DealEditor } from './DealEditor';
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

const DAY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

/** The columns each view shows, in order. The header and every row read this one list. */
export const COLUMNS: Record<QueueView, Array<{ key: string; label: string; className: string }>> = {
    write: [
        { key: 'lead', label: 'Lead', className: 'w-[32%]' },
        { key: 'bio', label: 'Bio', className: '' },
        { key: 'actions', label: '', className: 'w-px' },
    ],
    // The DM is what gets judged, so it takes the width; the bio is context.
    review: [
        { key: 'lead', label: 'Lead', className: 'w-[20%]' },
        { key: 'bio', label: 'Bio', className: 'w-[20%]' },
        { key: 'dm', label: 'DM', className: '' },
        { key: 'actions', label: '', className: 'w-px' },
    ],
    send: [
        { key: 'lead', label: 'Lead', className: 'w-[24%]' },
        { key: 'dm', label: 'DM', className: '' },
        { key: 'status', label: 'Status', className: 'w-[15%]' },
        { key: 'actions', label: '', className: 'w-px' },
    ],
    sent: [
        { key: 'lead', label: 'Lead', className: 'w-[24%]' },
        { key: 'dm', label: 'DM', className: '' },
        { key: 'outcome', label: 'Outcome', className: 'w-[16%]' },
        { key: 'actions', label: '', className: 'w-px' },
    ],
    skipped: [
        { key: 'lead', label: 'Lead', className: 'w-[24%]' },
        { key: 'dm', label: 'DM', className: '' },
        { key: 'actions', label: '', className: 'w-px' },
    ],
};

/** What a row that changed state while its view was open now says, in place. */
const CHANGED_LABEL: Record<QueueView, string> = {
    write: 'Back to write',
    review: 'In To review',
    send: 'Approved',
    sent: 'Sent',
    skipped: 'Skipped',
};

/**
 * Small square icon buttons, one class per role. Written out rather than built
 * from a role name because Tailwind's content scanner only sees literal class
 * strings. Each carries an `aria-label`: `title` alone is no name to a screen
 * reader or a keyboard user.
 */
const ICON = {
    neutral: 'p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:pointer-events-none',
    danger: 'p-1.5 rounded-lg text-neutral-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors',
} as const;

/** The one labelled button a row offers — the stage's own next step. */
const ROW_PRIMARY = 'inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border border-white/12 text-meta font-medium text-neutral-200 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';

const CELL = 'px-4 py-3.5 align-top max-md:block max-md:px-4 max-md:py-1.5';

export interface QueueRowProps {
    lead: Lead;
    /** The view this row is shown in — it decides the cells and the actions. */
    view: QueueView;
    /**
     * Where the Lead went, when it changed state while this view was open. It
     * stays in its place, muted, with an undo, instead of vanishing from under
     * the pointer — the next row sliding up into a just-clicked Approve is how a
     * skim approves the wrong person.
     */
    changedTo: QueueView | null;
    /** The campaign's name, shown on the row only when every campaign is listed together. */
    campaignLabelText: string | null;
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
    onApprove: (lead: Lead) => void;
    onSkip: (lead: Lead) => void;
    onUnapprove: (lead: Lead) => void;
    onRestore: (lead: Lead) => void;
    /** Reverses whatever `changedTo` records. */
    onUndo: (lead: Lead) => void;
    onUpdateLead: (lead: Lead) => void;
    onToggleBattlecards: (id: string) => void;
    onGenerateDM: (lead: Lead) => void;
    onDelete: (lead: Lead) => void;
}

const LeadCell: React.FC<{ lead: Lead; campaignLabelText: string | null }> = ({ lead, campaignLabelText }) => (
    <div className="flex items-start gap-3 min-w-0">
        {/* A page is a screenful of Instagram CDN avatars, so the img is lazy:
            eager loading fired every cross-origin request the moment the queue
            mounted, and the scraped URLs are signed and expire. */}
        {lead.profilePicUrl ? (
            <img
                src={lead.profilePicUrl} alt="" loading="lazy" decoding="async" width={36} height={36}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 flex-none"
                onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
        ) : (
            <div aria-hidden className="w-9 h-9 rounded-full bg-neutral-800 ring-1 ring-white/10 flex items-center justify-center text-white text-meta font-semibold flex-none">
                {(lead.name || lead.handle)[0]?.toUpperCase()}
            </div>
        )}
        <div className="min-w-0">
            <div className="text-body-sm font-medium text-white leading-snug truncate">{lead.name}</div>
            <div className="font-mono text-label text-neutral-400 truncate">@{lead.handle}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-label text-neutral-400">
                <span><span className="font-mono tabular-nums text-neutral-300">{formatFollowers(lead.followers)}</span> followers</span>
                {lead.businessAccount && <span>Business</span>}
                {lead.city && (
                    <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" aria-hidden />{lead.city}</span>
                )}
            </div>
            {campaignLabelText && <div className="mt-1 text-label text-neutral-400 truncate">{campaignLabelText}</div>}
        </div>
    </div>
);

/** A long bio folds to three lines; the DM is what gets judged, the bio is its context. */
const BioCell: React.FC<{ bio?: string }> = ({ bio }) => {
    const [open, setOpen] = useState(false);
    if (!bio) return <span className="text-meta text-neutral-400">No bio</span>;
    const long = bio.length > 140;
    return (
        <div>
            <p className={`text-meta text-neutral-400 leading-relaxed whitespace-pre-line ${long && !open ? 'line-clamp-3' : ''}`}>{bio}</p>
            {long && (
                <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
                    className="mt-1 text-label font-medium text-neutral-400 hover:text-white transition-colors">
                    {open ? 'Less' : 'More'}
                </button>
            )}
        </div>
    );
};

/**
 * One row of the Approval Queue.
 *
 * Memoized on purpose: a page renders up to 100 of these, each with a
 * controlled checkbox, and without the memo approving one lead re-rendered
 * every row. Every callback prop must keep a stable identity (see `useStable`)
 * or the memo does nothing.
 */
const QueueRowBase: React.FC<QueueRowProps> = ({
    lead, view, changedTo, campaignLabelText, isSelected, isEditing, editDraft, showBattlecards,
    isGenerating, ledger, canDelete, onToggleSelect, onStartEdit, onSaveEdit, onCancelEdit,
    onEditDraftChange, onApprove, onSkip, onUnapprove, onRestore, onUndo, onUpdateLead,
    onToggleBattlecards, onGenerateDM, onDelete,
}) => {
    const who = `@${lead.handle}`;
    const [dealOpen, setDealOpen] = useState(false);
    const muted = changedTo !== null;
    const columns = COLUMNS[view];
    const sentOn = sentDate(lead);

    const dmCell = isEditing ? (
        <div className="space-y-2">
            <textarea
                value={editDraft ?? ''}
                onChange={e => onEditDraftChange(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Escape') { e.preventDefault(); onCancelEdit(); }
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSaveEdit(lead.id); }
                }}
                rows={5}
                autoFocus
                aria-label={`Edit the DM to ${who}`}
                className="w-full bg-surface border border-white/30 rounded-xl px-3 py-2 text-body-sm leading-relaxed text-white focus:outline-none focus:ring-2 focus:ring-white/10 resize-y"
            />
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => onSaveEdit(lead.id)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-surface text-meta font-semibold hover:bg-neutral-100 transition-colors">
                    <Check className="w-3.5 h-3.5" aria-hidden /> Save
                </button>
                <button type="button" onClick={onCancelEdit}
                    className="px-3 py-1 rounded-full text-meta text-neutral-300 hover:text-white hover:bg-white/5 transition-colors">
                    Cancel
                </button>
                <span className="ml-auto text-label text-neutral-400 max-sm:hidden">Ctrl+Enter saves · Esc cancels</span>
            </div>
        </div>
    ) : lead.dmContent ? (
        // Shown in full: approval is the product's one human judgement, and it
        // used to be made on four clamped lines.
        <p className="text-body-sm text-neutral-200 leading-relaxed whitespace-pre-line">{lead.dmContent}</p>
    ) : (
        <span className="text-meta text-neutral-400">No DM written</span>
    );

    const cells: Record<string, React.ReactNode> = {
        lead: <LeadCell lead={lead} campaignLabelText={campaignLabelText} />,
        bio: <BioCell bio={lead.bio} />,
        dm: dmCell,
        // Handed off only means the extension accepted the work; Sent is its
        // word alone (CONTEXT.md), and Sent Leads are not in this view.
        status: lead.handedOffAt ? (
            <span className="inline-flex flex-col gap-0.5" title="The extension has this DM and sends it at its pace and Send Cap. It moves to Sent once the extension confirms it.">
                <span className="inline-flex items-center gap-1 text-meta text-neutral-300"><Hourglass className="w-3.5 h-3.5" aria-hidden /> With the extension</span>
                <span className="text-label text-neutral-400">{ago(lead.handedOffAt)}</span>
            </span>
        ) : (
            <span className="text-meta text-neutral-300">Ready to send</span>
        ),
        outcome: (
            <span className="inline-flex flex-col gap-1">
                {lead.closedAt && lead.dealValue ? (
                    <span className="text-meta font-medium text-positive-300 tabular-nums">Won · {formatMoney(lead.dealValue)}</span>
                ) : lead.booked ? (
                    <span className="text-meta font-medium text-positive-300">Booked</span>
                ) : lead.replied ? (
                    <span className="text-meta text-white">{lead.positiveReply ? 'Replied · interested' : 'Replied'}</span>
                ) : (
                    <span className="text-meta text-neutral-400">No reply yet</span>
                )}
                {sentOn && <span className="text-label text-neutral-400">Sent {DAY.format(new Date(sentOn))}</span>}
            </span>
        ),
        actions: muted ? (
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                <span className={`queue-settle text-meta font-medium ${changedTo === 'send' ? 'text-positive-300' : 'text-neutral-300'}`}>
                    {lead.dmContent && changedTo === 'review' && view === 'write' ? 'DM written' : CHANGED_LABEL[changedTo!]}
                </span>
                {!(view === 'write' && changedTo === 'review') && (
                    <button type="button" onClick={() => onUndo(lead)}
                        className="px-2 py-1 rounded-full text-meta font-medium text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                        Undo
                    </button>
                )}
            </div>
        ) : (
            <div className="flex items-center justify-end gap-1">
                {view === 'write' && (
                    <button type="button" onClick={() => onGenerateDM(lead)} disabled={isGenerating}
                        aria-label={`Write a DM for ${who}`} className={ROW_PRIMARY}>
                        <Sparkles className="w-3.5 h-3.5" aria-hidden /> Write
                    </button>
                )}
                {view === 'review' && !isEditing && (
                    <button type="button" onClick={() => onApprove(lead)} title="Approve"
                        aria-label={`Approve the DM to ${who}`}
                        className={`${ROW_PRIMARY} hover:!text-positive-300 hover:!border-positive-500/40 hover:!bg-positive-500/10`}>
                        <Check className="w-3.5 h-3.5" aria-hidden /> Approve
                    </button>
                )}
                {view === 'skipped' && (
                    <button type="button" onClick={() => onRestore(lead)} aria-label={`Restore ${who}`} className={ROW_PRIMARY}>
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Restore
                    </button>
                )}
                {(view === 'review' || view === 'send') && lead.dmContent && !isEditing && (
                    <button type="button" onClick={() => onStartEdit(lead)} title="Edit DM"
                        aria-label={`Edit the DM to ${who}`} className={ICON.neutral}>
                        <Edit3 className="w-4 h-4" aria-hidden />
                    </button>
                )}
                {view === 'send' && (
                    <button type="button" onClick={() => onUnapprove(lead)} title="Back to review"
                        aria-label={`Move ${who} back to review`} className={ICON.neutral}>
                        <CornerUpLeft className="w-4 h-4" aria-hidden />
                    </button>
                )}
                {(view === 'write' || view === 'review') && (
                    <button type="button" onClick={() => onSkip(lead)} title="Skip"
                        aria-label={`Skip ${who}`} className={ICON.neutral}>
                        <X className="w-4 h-4" aria-hidden />
                    </button>
                )}
                {view === 'sent' && (
                    <>
                        {/* The one next mark this Lead can take, named — the
                            funnel's order: replied, interested, booked, won. */}
                        {!lead.replied ? (
                            <button type="button"
                                onClick={() => {
                                    onUpdateLead({ ...lead, replied: true, replyDate: lead.replyDate ?? new Date().toISOString() });
                                    if (!showBattlecards) onToggleBattlecards(lead.id);
                                }}
                                aria-label={`Mark ${who} as replied`} className={ROW_PRIMARY}>
                                <MessageCircle className="w-3.5 h-3.5" aria-hidden /> Mark replied
                            </button>
                        ) : !lead.positiveReply ? (
                            <button type="button" onClick={() => onUpdateLead({ ...lead, positiveReply: true, qualifiedAt: lead.qualifiedAt ?? new Date().toISOString() })}
                                aria-label={`Mark ${who}'s reply as interested`} className={ROW_PRIMARY}>
                                <ThumbsUp className="w-3.5 h-3.5" aria-hidden /> Mark interested
                            </button>
                        ) : !lead.booked ? (
                            <button type="button" onClick={() => onUpdateLead({ ...lead, booked: true, bookedAt: lead.bookedAt ?? new Date().toISOString() })}
                                aria-label={`Mark ${who} as booked`} className={ROW_PRIMARY}>
                                <CalendarCheck className="w-3.5 h-3.5" aria-hidden /> Mark booked
                            </button>
                        ) : (
                            <button type="button" onClick={() => setDealOpen(o => !o)}
                                aria-label={lead.closedAt ? `Edit the deal with ${who}` : `Record a won deal with ${who}`}
                                aria-expanded={dealOpen}
                                className={`${ROW_PRIMARY} ${dealOpen ? 'border-white/30 bg-white/[0.06] text-white' : ''}`}>
                                <DollarSign className="w-3.5 h-3.5" aria-hidden /> {lead.closedAt ? 'Edit deal' : 'Add deal'}
                            </button>
                        )}
                        {lead.replied && (
                            <button type="button" onClick={() => onToggleBattlecards(lead.id)}
                                title="Suggested replies" aria-label={`Suggested replies for ${who}`}
                                aria-expanded={showBattlecards}
                                className={showBattlecards ? 'p-1.5 rounded-lg text-white bg-white/10' : ICON.neutral}>
                                <MessagesSquare className="w-4 h-4" aria-hidden />
                            </button>
                        )}
                    </>
                )}
                {/* Delete lives where clean-up does: Skipped, and the bulk bar.
                    Beside a stage's Skip (undoable) it was the same-size icon for
                    the one action nothing can take back. */}
                {canDelete && view === 'skipped' && (
                    <button type="button" onClick={() => onDelete(lead)} title="Delete"
                        aria-label={`Delete ${who} from the queue`} className={ICON.danger}>
                        <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                )}
            </div>
        ),
    };

    return (
        <>
            <tr className={`border-t border-white/[0.06] transition-colors duration-150 max-md:block max-md:py-2 ${
                isSelected ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]'
            }`}>
                <td className={`${CELL} w-10 pl-5 pr-1 max-md:float-left max-md:pt-3 max-md:pl-4`}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={muted}
                        onChange={() => onToggleSelect(lead.id)}
                        aria-label={`Select ${who}`}
                        className="w-4 h-4 mt-2.5 rounded border-white/20 bg-transparent accent-white cursor-pointer disabled:opacity-30 disabled:cursor-default"
                    />
                </td>
                {columns.map(col => (
                    <td key={col.key} className={`${CELL} ${col.key === 'actions' ? 'pr-5 max-md:pt-1' : ''} ${
                        muted && col.key !== 'actions' ? 'opacity-50' : ''
                    } transition-opacity duration-200`}>
                        {cells[col.key]}
                    </td>
                ))}
            </tr>
            {dealOpen && lead.booked && (
                <tr className="max-md:block">
                    <td colSpan={columns.length + 1} className="px-5 py-4 bg-white/[0.015] border-t border-white/5 max-md:block">
                        <DealEditor lead={lead} onSave={onUpdateLead} onClose={() => setDealOpen(false)} />
                    </td>
                </tr>
            )}
            {showBattlecards && lead.replied && (
                <tr className="max-md:block">
                    <td colSpan={columns.length + 1} className="px-5 py-4 bg-white/[0.015] border-t border-white/5 max-md:block">
                        <ReplyBattlecards lead={lead} ledger={ledger} onUpdateLead={onUpdateLead} />
                    </td>
                </tr>
            )}
        </>
    );
};

export const QueueRow = React.memo(QueueRowBase);
