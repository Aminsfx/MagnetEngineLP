import React, { useEffect, useState } from 'react';
import { DollarSign, Trophy } from 'lucide-react';
import type { Conversation, Lead } from '../../lib/types';
import { formatMoney, parseMoney } from '../../lib/reports';
import { DealEditor } from '../campaign/DealEditor';

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
                : 'Press Booked when they book a call.';

    if (editing) {
        return (
            <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
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
        <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-wrap flex-shrink-0">
            <DollarSign className="w-3 h-3 text-neutral-400" aria-hidden />
            {won ? (
                <span className="flex items-center gap-1 text-label px-2 py-0.5 rounded-full border font-medium text-positive-300 border-positive-500/30 bg-positive-500/10">
                    <Trophy className="w-3 h-3" aria-hidden />
                    Won · {formatMoney(lead!.dealValue!)}
                    {(lead!.cashCollected ?? 0) < lead!.dealValue! && (
                        <span className="font-normal opacity-80"> · {formatMoney(lead!.cashCollected ?? 0)} paid</span>
                    )}
                </span>
            ) : (
                <label className="relative">
                    <span className="sr-only">Deal price</span>
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-label text-neutral-400" aria-hidden>$</span>
                    <input
                        inputMode="decimal"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        onBlur={savePrice}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        placeholder="Price"
                        className="w-24 pl-5 pr-2 py-1 rounded-lg bg-white/5 border border-white/10 text-label text-white tabular-nums placeholder:text-neutral-500 focus:outline-none focus:border-white/40"
                    />
                </label>
            )}
            {hint && <span className="text-label text-neutral-400 min-w-0">{hint}</span>}
            {(booked || won) && (
                <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="ml-auto flex items-center gap-1 text-label px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:border-white/20 transition-colors"
                >
                    <Trophy className="w-3 h-3" aria-hidden /> {won ? 'Edit deal' : 'Mark as won'}
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
