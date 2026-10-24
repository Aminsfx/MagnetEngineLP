import React, { useEffect, useId, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { Conversation, Lead } from '../../lib/types';
import { formatMoney, parseMoney } from '../../lib/reports';
import { DealEditor } from '../campaign/DealEditor';
import { ROW_PILL } from './Copilot';

/**
 * The deal with the person in this Conversation: the price the Operator is
 * pitching, then Won with what was agreed and paid. It sits in the Inbox
 * because that is where the selling happens — the same editor used to live
 * only behind a "$" in the Approval Queue, which nobody found.
 *
 * The price counts nowhere until the Lead is Booked (Pipeline) and Won
 * (revenue), so typing a hopeful number mid-conversation never shows up as
 * money. Won is offered only once the call is booked: the order the sale
 * actually happens in.
 *
 * It renders inline, as part of an open conversation's bar, so its guidance
 * is the price field's description (a tooltip, and read with the field)
 * rather than a sentence in the bar; the editor for a win takes a line of its
 * own.
 */
export const DealPanel: React.FC<{
    conversation: Conversation;
    /** The Lead behind the Conversation, if there is one yet. */
    lead: Lead | undefined;
    onSave: (change: (lead: Lead) => Lead) => void;
}> = ({ conversation, lead, onSave }) => {
    const saved = lead?.dealValue ? lead.dealValue.toLocaleString('en-US') : '';
    const [price, setPrice] = useState(saved);
    const [editing, setEditing] = useState(false);
    const hintId = useId();

    // A different Conversation, or the value changed elsewhere (the Approval
    // Queue, another tab): show what is stored, not a stale draft.
    useEffect(() => { setPrice(saved); setEditing(false); }, [conversation.id, saved]);

    const won = !!lead?.closedAt && (lead.dealValue ?? 0) > 0;
    const booked = !!lead?.booked || conversation.status === 'booked';

    const savePrice = () => {
        const value = parseMoney(price);
        if (value === (lead?.dealValue ?? 0)) return;
        onSave((l) => ({ ...l, dealValue: value || undefined }));
    };

    const hint = won
        ? null
        : !parseMoney(price)
            ? 'Type the price you’re pitching to track this deal.'
            : booked
                ? 'Call booked — this counts in your pipeline. Mark it won when they pay.'
                : 'Mark it booked when they book a call.';

    if (editing) {
        return (
            <div className="basis-full px-4 py-3.5 rounded-2xl border border-white/15 bg-white/[0.04]">
                <DealEditor
                    lead={lead ?? placeholderLead(conversation, parseMoney(price))}
                    onSave={(next) => onSave((l) => ({
                        ...l,
                        dealValue: next.dealValue,
                        cashCollected: next.cashCollected,
                        closedAt: next.closedAt,
                    }))}
                    onClose={() => setEditing(false)}
                />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap min-w-0">
            {won ? (
                <span className="inline-flex items-center gap-1.5 text-meta px-3 py-1.5 rounded-full border font-medium text-positive-300 border-positive-500/30 bg-positive-500/10">
                    <Trophy className="w-3.5 h-3.5" aria-hidden />
                    Won · <span className="font-mono tabular-nums">{formatMoney(lead!.dealValue!)}</span>
                    {(lead!.cashCollected ?? 0) < lead!.dealValue! && (
                        <span className="font-normal opacity-80"> · <span className="font-mono tabular-nums">{formatMoney(lead!.cashCollected ?? 0)}</span> paid</span>
                    )}
                </span>
            ) : (
                <label className="relative">
                    <span className="sr-only">Deal price</span>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-meta text-neutral-400" aria-hidden>$</span>
                    <input
                        inputMode="decimal"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        onBlur={savePrice}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        aria-describedby={hint ? hintId : undefined}
                        title={hint ?? undefined}
                        placeholder="Deal price"
                        className="w-28 pl-6 pr-3 py-1.5 rounded-full bg-white/[0.03] border border-white/12 text-meta font-mono text-white tabular-nums placeholder:font-sans placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10"
                    />
                </label>
            )}
            {hint && <span id={hintId} className="sr-only">{hint}</span>}
            {(booked || won) && (
                <button type="button" onClick={() => setEditing(true)} className={ROW_PILL}>
                    <Trophy className="w-3.5 h-3.5" aria-hidden /> {won ? 'Edit deal' : 'Mark as won'}
                </button>
            )}
        </div>
    );
};

/** What DealEditor edits for someone who isn't a Lead yet. Never saved as is. */
function placeholderLead(c: Conversation, dealValue: number): Lead {
    return {
        id: '', handle: c.handle, name: c.name ?? c.handle, followers: 0, isPrivate: false,
        status: 'cold', dmSent: false, replied: false, dealValue: dealValue || undefined,
    };
}
