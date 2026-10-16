import React, { useState } from 'react';
import type { Lead } from '../../lib/types';

/**
 * Record a booked Lead as a won deal: what it is worth and how much has been
 * paid. This is the only place `closedAt`, `dealValue` and `cashCollected` are
 * written, so the dashboard's revenue is exactly what the Operator entered
 * here — never an estimate.
 */
export const DealEditor: React.FC<{
    lead: Lead;
    onSave: (lead: Lead) => void;
    onClose: () => void;
}> = ({ lead, onSave, onClose }) => {
    const [value, setValue] = useState(lead.dealValue ? String(lead.dealValue) : '');
    const [collected, setCollected] = useState(lead.cashCollected ? String(lead.cashCollected) : '');

    const amount = (raw: string) => {
        const n = Number(raw.replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
    };
    const dealValue = amount(value);
    const cashCollected = Math.min(amount(collected), dealValue);

    const save = () => {
        if (dealValue <= 0) return;
        onSave({
            ...lead,
            dealValue,
            cashCollected,
            closedAt: lead.closedAt ?? new Date().toISOString(),
        });
        onClose();
    };

    const clear = () => {
        onSave({ ...lead, dealValue: undefined, cashCollected: undefined, closedAt: undefined });
        onClose();
    };

    const input = 'w-32 pl-6 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white tabular-nums placeholder:text-neutral-500 focus:outline-none focus:border-white/40';

    return (
        <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => { e.preventDefault(); save(); }}
        >
            <p className="w-full text-meta text-neutral-400">
                Won a deal with <span className="text-white font-medium">@{lead.handle}</span>? It counts toward
                the dashboard's revenue from the day you first save it.
            </p>
            <label className="block">
                <span className="block text-label text-neutral-400 mb-1">Deal value</span>
                <span className="relative block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400" aria-hidden>$</span>
                    <input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="3,000" className={input} autoFocus />
                </span>
            </label>
            <label className="block">
                <span className="block text-label text-neutral-400 mb-1">Paid so far</span>
                <span className="relative block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400" aria-hidden>$</span>
                    <input inputMode="decimal" value={collected} onChange={(e) => setCollected(e.target.value)} placeholder="0" className={input} />
                </span>
            </label>
            <button
                type="submit"
                disabled={dealValue <= 0}
                className="px-4 py-2 rounded-lg bg-white text-surface text-sm font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {lead.closedAt ? 'Update deal' : 'Mark as won'}
            </button>
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-white">
                Cancel
            </button>
            {lead.closedAt && (
                <button type="button" onClick={clear} className="ml-auto px-3 py-2 rounded-lg text-sm text-neutral-400 hover:text-danger-400">
                    Remove deal
                </button>
            )}
        </form>
    );
};
