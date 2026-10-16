import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Loader2, CornerDownLeft } from 'lucide-react';
import type { ReplyResult } from '../../lib/api';
import { COPILOT_ANGLES, type Suggestion } from '../../lib/copilot';

/**
 * The setter's copilot: three replies to the same conversation, each taking a
 * different next step, as one row of single-line chips under the thread. A
 * chip opens in full on click, and "Use this reply" only fills the composer — nothing sends until they press Approve & Send, so the AI
 * assists here and takes over only when they turn Autopilot on.
 *
 * Mount it with `key={threadKey}`: a new conversation, or a new message in
 * this one, is a fresh copilot. Drafts still in flight for the old one land in
 * the cache, not on screen.
 */
export const Copilot: React.FC<{
    threadKey: string;
    /** Suggestions already made per threadKey, kept across conversation switches. */
    cache: Map<string, Suggestion[]>;
    /** Draft without being asked — for conversations waiting on a reply. */
    auto: boolean;
    generate: (instruction?: string) => Promise<ReplyResult>;
    onPick: (text: string) => void;
}> = ({ threadKey, cache, auto, generate, onPick }) => {
    // Drafting on open starts in the loading state rather than switching to it.
    const [willAuto] = useState(() => auto && !cache.has(threadKey));
    const placeholders = () => COPILOT_ANGLES.map(angle => ({ angle }));
    const [suggestions, setSuggestions] = useState<Suggestion[] | null>(
        () => cache.get(threadKey) ?? (willAuto ? placeholders() : null),
    );
    const [loading, setLoading] = useState(willAuto);
    /** The one suggestion shown in full, if any. */
    const [openKey, setOpenKey] = useState<string | null>(null);

    const draftAll = useCallback(async (): Promise<Suggestion[]> => {
        const settled = await Promise.allSettled(COPILOT_ANGLES.map(a => generate(a.instruction)));
        const next: Suggestion[] = settled.map((r, i) => ({
            angle: COPILOT_ANGLES[i],
            ...(r.status === 'fulfilled' && r.value.reply.trim() ? { text: r.value.reply.trim() } : { failed: true }),
        }));
        cache.set(threadKey, next);
        return next;
    }, [cache, generate, threadKey]);

    const show = (next: Suggestion[]) => {
        setSuggestions(next);
        setLoading(false);
    };

    const run = async () => {
        setLoading(true);
        setSuggestions(placeholders());
        show(await draftAll());
    };

    useEffect(() => {
        if (willAuto) void draftAll().then(show);
        // Once per mount: the parent remounts this for every new thread state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const open = suggestions?.find(x => x.angle.key === openKey && x.text);

    return (
        <section aria-label="AI copilot" className="border-t border-white/5 px-3 pt-2.5">
            {/* One compact row: the three replies as single-line chips, so the
                conversation above keeps its room. A chip opens in full only
                when clicked. */}
            <div className="flex items-center gap-2 min-w-0">
                <span className="flex-none flex items-center gap-1 text-label font-semibold text-white" title="Suggested replies. Click one to read it in full.">
                    <Sparkles className="w-3 h-3" aria-hidden /> Copilot
                </span>
                {suggestions ? (
                    <ul className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
                        {suggestions.map(({ angle, text, failed }) => {
                            const active = openKey === angle.key;
                            return (
                                <li key={angle.key} className="flex-1 min-w-[9rem] max-w-[16rem]">
                                    <button
                                        type="button"
                                        disabled={!text}
                                        onClick={() => setOpenKey(active ? null : angle.key)}
                                        aria-expanded={active}
                                        title={failed ? 'Could not draft this one. Try new suggestions.' : undefined}
                                        className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-left transition-colors disabled:cursor-default ${
                                            active
                                                ? 'border-white/40 bg-white/10'
                                                : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                                        }`}
                                    >
                                        <span className="flex-none text-label font-medium text-neutral-400">{angle.label}</span>
                                        <span className="min-w-0 truncate text-label text-neutral-200">
                                            {text ?? (failed ? 'could not draft' : (
                                                <span className="inline-block h-1.5 w-16 align-middle rounded bg-white/[0.08] animate-pulse" aria-label="Drafting" />
                                            ))}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <span className="flex-1 min-w-0 truncate text-label text-neutral-400">Three suggested replies, one click away.</span>
                )}
                <button
                    type="button"
                    onClick={() => void run()}
                    disabled={loading}
                    aria-label={suggestions ? 'New suggestions' : 'Suggest replies'}
                    title={suggestions ? 'New suggestions' : 'Suggest replies'}
                    className="flex-none flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-white/10 text-label font-medium text-neutral-300 hover:text-white hover:border-white/30 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> : <RefreshCw className="w-3 h-3" aria-hidden />}
                    {!suggestions && <span>Suggest</span>}
                </button>
            </div>

            {open?.text && (
                <div className="mt-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
                    <p className="text-label font-medium text-neutral-400">{open.angle.label}</p>
                    <p className="mt-1 max-h-32 overflow-y-auto text-meta text-neutral-100 whitespace-pre-wrap">{open.text}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => { onPick(open.text!); setOpenKey(null); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/25 bg-white/10 text-label font-semibold text-white hover:bg-white/15 transition-colors"
                        >
                            <CornerDownLeft className="w-3 h-3" aria-hidden /> Use this reply
                        </button>
                        <button type="button" onClick={() => setOpenKey(null)} className="px-2 py-1.5 text-label text-neutral-400 hover:text-white">
                            Close
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};
