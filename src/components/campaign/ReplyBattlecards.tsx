import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import type { Lead } from '../../lib/types';
import { renderTemplate, type TemplateContext } from '../../lib/followups';

/**
 * The four replies an Operator actually needs at the queue, written to the same
 * rules as the AI SDR's prompt rather than beside them.
 *
 * The price card used to refuse to name a price — "it depends on what you
 * actually need, so a number on its own wouldn't mean much" — even for an
 * Operator who had one. A dodged price question is heard as an expensive one,
 * so it now anchors and answers when the Offer Ledger holds a figure, and falls
 * back to the honest deferral only when it genuinely has nothing to quote.
 *
 * Tokens render through `renderTemplate`, which is what drops a sentence whose
 * Ledger field is still empty instead of shipping "it's normally , and it's ."
 */
const CARDS: Array<{ id: string; label: string; reply: string; marksPositive: boolean }> = [
    {
        id: 'interested',
        label: '🔥 They\'re interested',
        reply: 'nice — easiest next step is a quick call so i can show you exactly how this would work for you {{firstName}}. it\'s {{callLength}} and i\'ll {{callPromise}} whether or not you ever buy anything. grab any time that suits here: {{calendar}}',
        marksPositive: true,
    },
    {
        id: 'price',
        label: '💰 They asked the price',
        // Anchor, then the figure, then the ways to pay it — never the cheapest
        // number first, because everything after it then reads as an upsell.
        reply: 'straight answer {{firstName}} — it\'s normally {{anchor}}, and it\'s {{price}}. whether that\'s worth it depends entirely on what you\'re doing now, so easier to show you than to argue it: {{calendar}}',
        marksPositive: false,
    },
    {
        id: 'quiet',
        label: '🕒 They went quiet',
        reply: 'no call needed {{firstName}} — what\'s the actual thing stopping you? if it\'s {{price}}, say so and i\'ll tell you straight whether it\'s worth it for you.',
        marksPositive: false,
    },
    {
        id: 'later',
        label: '⏸ Not right now',
        // A date is a close. Silence is the only outcome with no next step in
        // it, which is exactly what the rescue ladder exists to prevent.
        reply: 'no worries at all {{firstName}} — mind if i check back in 90 days? either way, wishing you a big quarter 🤝',
        marksPositive: false,
    },
];

interface ReplyBattlecardsProps {
    lead: Lead;
    /** The Offer Ledger + booking link. `AppConfig` satisfies this. */
    ledger?: TemplateContext;
    onUpdateLead?: (lead: Lead) => void;
}

export const ReplyBattlecards: React.FC<ReplyBattlecardsProps> = ({ lead, ledger = {}, onUpdateLead }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const rendered = CARDS.map(card => ({ ...card, text: renderTemplate(card.reply, lead, ledger) }));
    const missingLedger = rendered.some(card => !card.text);

    const handleCopy = (card: typeof rendered[number]) => {
        if (!card.text) return;
        navigator.clipboard.writeText(card.text).catch(() => {});
        setCopiedId(card.id);
        setTimeout(() => setCopiedId(prev => (prev === card.id ? null : prev)), 2000);
        if (card.marksPositive && !lead.positiveReply) {
            onUpdateLead?.({ ...lead, positiveReply: true });
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] text-neutral-500">
                    Reply battlecards — pick the one that matches their reply
                </span>
                <a
                    href={`https://instagram.com/${lead.handle}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white transition-colors"
                >
                    <ExternalLink className="w-3 h-3" />
                    Open profile
                </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {rendered.map(card => (
                    <div key={card.id} className="bg-white/[0.02] border border-white/6 rounded-xl p-3.5 flex flex-col gap-2.5">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-600 font-semibold">
                            {card.label}
                        </span>
                        <p className="text-xs text-neutral-300 leading-relaxed flex-1">
                            {card.text || (
                                <em className="text-neutral-600">
                                    Nothing to send yet — this one needs an Offer Ledger field you haven&rsquo;t filled in.
                                </em>
                            )}
                        </p>
                        <button
                            onClick={() => handleCopy(card)}
                            disabled={!card.text}
                            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                copiedId === card.id
                                    ? 'bg-white/20 text-white border border-white/30'
                                    : 'bg-white/5 text-neutral-400 border border-white/8 hover:bg-white/10 hover:text-white'
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

            {missingLedger && (
                <p className="text-[11px] text-white/90 mt-3">
                    Tip: fill in your Offer Ledger and booking link in Settings so these paste ready-to-send.
                    A blank field is never guessed at — it just takes its sentence with it.
                </p>
            )}
        </div>
    );
};
