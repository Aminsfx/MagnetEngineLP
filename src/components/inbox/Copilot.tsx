import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Loader2, CornerDownLeft, Check } from 'lucide-react';
import type { ReplyResult } from '../../lib/api';
import { COPILOT_ANGLES, type Suggestion } from '../../lib/copilot';

/** The ghost pill used inside an open conversation (DESIGN.md: Row Action Pill). */
export const ROW_PILL = 'inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border border-white/12 text-meta font-medium text-neutral-200 hover:text-white hover:border-white/30 hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';

/**
 * The setter's copilot: three replies to the same conversation, each taking a
 * different next step, laid side by side in full under the thread. The owner
 * replies copilot-first, so the replies are read where they sit; "Use this
 * reply" only fills the composer. Nothing sends until they press Approve &
 * Send, so the AI assists here and takes over only when they turn Autopilot on.
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
    /** Whether replies (or their drafting placeholders) are on screen, for the composer's hint. */
    onShown?: (shown: boolean) => void;
}> = ({ threadKey, cache, auto, generate, onPick, onShown }) => {
    // Drafting on open starts in the loading state rather than switching to it.
    const [willAuto] = useState(() => auto && !cache.has(threadKey));
    const placeholders = () => COPILOT_ANGLES.map(angle => ({ angle }));
    const [suggestions, setSuggestions] = useState<Suggestion[] | null>(
        () => cache.get(threadKey) ?? (willAuto ? placeholders() : null),
    );
    const [loading, setLoading] = useState(willAuto);
    /** The angle whose reply was last put in the composer. */
    const [used, setUsed] = useState<string | null>(null);

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
        setUsed(null);
        setSuggestions(placeholders());
        show(await draftAll());
    };

    useEffect(() => {
        if (willAuto) void draftAll().then(show);
        // Once per mount: the parent remounts this for every new thread state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const shown = suggestions !== null;
    useEffect(() => { onShown?.(shown); }, [onShown, shown]);

    if (!suggestions) {
        return (
            <section aria-label="AI copilot" className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="flex-1 min-w-[14rem] text-meta text-neutral-400">
                    They aren't waiting on a reply, so nothing was drafted. Ask for three replies if you want to follow up.
                </p>
                <button type="button" onClick={() => void run()} className={ROW_PILL}>
                    <Sparkles className="w-3.5 h-3.5" aria-hidden /> Suggest replies
                </button>
            </section>
        );
    }

    return (
        <section aria-label="AI copilot">
            <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-1.5 text-meta font-medium text-white">
                    <Sparkles className="w-3.5 h-3.5" aria-hidden /> Suggested replies
                </h3>
                <button
                    type="button"
                    onClick={() => void run()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 text-meta font-medium text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : <RefreshCw className="w-3.5 h-3.5" aria-hidden />}
                    {loading ? 'Drafting…' : 'New suggestions'}
                </button>
            </div>
            {/* Three columns ruled by hairlines on the panel's own ground — no
                card inside the list's card. The reply in the composer is marked
                by a white rule along its top and by its pill. */}
            <ul className="mt-2.5 grid md:grid-cols-3 border-t border-white/[0.08] max-md:divide-y md:divide-x divide-white/[0.08]">
                {suggestions.map(({ angle, text, failed }) => {
                    const isUsed = used === angle.key && !!text;
                    return (
                        <li key={angle.key} aria-label={angle.label} className="relative flex flex-col py-3.5 md:px-4 md:first:pl-0 md:last:pr-0">
                            {isUsed && <span aria-hidden className="absolute inset-x-0 -top-px h-0.5 bg-white" />}
                            <p className={`text-label font-semibold ${isUsed ? 'text-white' : 'text-neutral-400'}`}>{angle.label}</p>
                            {/* Five lines held while drafting, so the composer
                                below doesn't jump when the replies land. */}
                            {text ? (
                                <p className="mt-1.5 flex-1 min-h-[7.5rem] text-body-sm text-neutral-100 whitespace-pre-wrap">{text}</p>
                            ) : failed ? (
                                <p className="mt-1.5 flex-1 min-h-[7.5rem] text-meta text-neutral-400">Couldn't draft this one. Try New suggestions.</p>
                            ) : (
                                <div className="mt-1.5 flex-1 min-h-[7.5rem] flex flex-col justify-around py-1.5" aria-label="Drafting">
                                    <span className="block h-2 w-full rounded-full bg-white/[0.07] animate-pulse" />
                                    <span className="block h-2 w-11/12 rounded-full bg-white/[0.07] animate-pulse" />
                                    <span className="block h-2 w-full rounded-full bg-white/[0.07] animate-pulse" />
                                    <span className="block h-2 w-4/5 rounded-full bg-white/[0.07] animate-pulse" />
                                    <span className="block h-2 w-1/2 rounded-full bg-white/[0.07] animate-pulse" />
                                </div>
                            )}
                            <div className="mt-3">
                                <button
                                    type="button"
                                    disabled={!text}
                                    onClick={() => { onPick(text!); setUsed(angle.key); }}
                                    aria-label={isUsed ? `In the composer: ${angle.label}` : `Use this reply: ${angle.label}`}
                                    className={ROW_PILL}
                                >
                                    {isUsed
                                        ? <><Check className="w-3.5 h-3.5" aria-hidden /> In the composer</>
                                        : <><CornerDownLeft className="w-3.5 h-3.5" aria-hidden /> Use this reply</>}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
