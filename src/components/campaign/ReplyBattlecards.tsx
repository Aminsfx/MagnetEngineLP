import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import type { Lead } from '../../lib/types';

const NO_LINK_PLACEHOLDER = '[add your booking link in Settings → Booking Link]';

const CARDS: Array<{ id: string; label: string; reply: string; marksPositive: boolean }> = [
    {
        id: 'interested',
        label: '🔥 They\'re interested',
        reply: 'Awesome — easiest next step is a quick 15-min call so I can show you exactly how this would work for you, {firstName}. Grab any time that suits you here: {calendar}',
        marksPositive: true,
    },
    {
        id: 'price',
        label: '💰 They asked the price',
        reply: 'Good question — it depends on what you actually need, so a number on its own wouldn\'t mean much. Easier to show you on a quick call and you can decide from there: {calendar}',
        marksPositive: false,
    },
    {
        id: 'later',
        label: '⏸ Not right now',
        reply: 'No worries at all, {firstName}. Mind if I circle back in a couple of weeks? Either way — wishing you a big month 🤝',
        marksPositive: false,
    },
];

interface ReplyBattlecardsProps {
    lead: Lead;
    calendarLink?: string;
    onUpdateLead?: (lead: Lead) => void;
}

export const ReplyBattlecards: React.FC<ReplyBattlecardsProps> = ({ lead, calendarLink, onUpdateLead }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const firstName = lead.name?.trim().split(/\s+/)[0] || `@${lead.handle}`;
    const calendar = calendarLink?.trim() || NO_LINK_PLACEHOLDER;

    const renderReply = (template: string) =>
        template.replace(/\{firstName\}/g, firstName).replace(/\{calendar\}/g, calendar);

    const handleCopy = (card: typeof CARDS[number]) => {
        navigator.clipboard.writeText(renderReply(card.reply)).catch(() => {});
        setCopiedId(card.id);
        setTimeout(() => setCopiedId(prev => (prev === card.id ? null : prev)), 2000);
        if (card.marksPositive && !lead.positiveReply) {
            onUpdateLead?.({ ...lead, positiveReply: true });
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-zinc-500">
                    Reply battlecards — pick the one that matches their reply
                </span>
                <a
                    href={`https://instagram.com/${lead.handle}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors"
                >
                    <ExternalLink className="w-3 h-3" />
                    Open profile
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {CARDS.map(card => (
                    <div key={card.id} className="bg-white/[0.02] border border-white/6 rounded-xl p-3.5 flex flex-col gap-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold">
                            {card.label}
                        </span>
                        <p className="text-xs text-zinc-300 leading-relaxed flex-1">
                            {renderReply(card.reply)}
                        </p>
                        <button
                            onClick={() => handleCopy(card)}
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                copiedId === card.id
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-white/5 text-zinc-400 border border-white/8 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {copiedId === card.id
                                ? <><Check className="w-3 h-3" /> Copied ✓</>
                                : <><Copy className="w-3 h-3" /> Copy reply</>
                            }
                        </button>
                    </div>
                ))}
            </div>

            {!calendarLink?.trim() && (
                <p className="text-[11px] text-amber-400/90 mt-3">
                    Tip: add your Calendly/booking link in Settings so these replies paste ready-to-send.
                </p>
            )}
        </div>
    );
};
