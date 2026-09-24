import React, { useState, useCallback, useRef } from 'react';
import { Lead } from '../../lib/types';
import {
    runScrape, explainEmptyScrape, parseQueries,
    MAX_PER_QUERY, SCRAPE_DEMO, type ScrapeProgress, type SourceKind,
} from '../../lib/scrape';
import {
    Search, CheckSquare, Square, ChevronDown,
    Loader2, Users, AlertCircle, CheckCircle,
    X, ArrowRight, Plus, Settings, UserCheck,
    FileSpreadsheet, Hash, Heart, MessageCircle,
    MapPin, Sparkles, AtSign, Info, CircleStop,
    type LucideIcon,
} from 'lucide-react';
import { NICHE_PRESETS } from '../../lib/presets';
import { CsvImport } from './CsvImport';
import { CHANNEL, alpha } from '../../lib/theme';

interface CampaignBuilderProps {
    onLeadsScraped: (leads: Lead[]) => void;
}

interface SourceOption {
    kind: SourceKind;
    label: string;
    blurb: string;
    icon: LucideIcon;
    inputLabel: string;
    inputHint: string;
    placeholder: string;
    /** Singular / plural noun for one query, for the "3 accounts × 100" line. */
    unit: [string, string];
    /** Default campaign name from the first query. */
    campaign: (first: string) => string;
    multiline?: boolean;
}

const at = (q: string) => `@${q.replace(/^@/, '').replace(/\/+$/, '').split('/').pop()}`;

const SOURCES: SourceOption[] = [
    {
        kind: 'keyword',
        label: 'Keyword search',
        blurb: 'Accounts whose name or username matches',
        icon: Search,
        inputLabel: 'Search terms',
        inputHint: 'Instagram matches names and usernames, not bios — use words people put in their name, like "coach" or "agency".',
        placeholder: 'coaches, consultants, agency, skool, ai agency',
        unit: ['term', 'terms'],
        campaign: q => q,
    },
    {
        kind: 'hashtag',
        label: 'Hashtag',
        blurb: 'People who recently posted with a hashtag',
        icon: Hash,
        inputLabel: 'Hashtags',
        inputHint: 'The authors of the most recent posts — active accounts, not just big ones.',
        placeholder: 'smma, businesscoach, realestateagent',
        unit: ['hashtag', 'hashtags'],
        campaign: q => `#${q.replace(/^#/, '')}`,
    },
    {
        kind: 'followers',
        label: 'Followers',
        blurb: "An account's followers — a competitor's audience",
        icon: Users,
        inputLabel: 'Accounts',
        inputHint: 'Usernames or profile links. Instagram only lists followers of public accounts.',
        placeholder: 'garyvee, alexhormozi, yourcompetitor',
        unit: ['account', 'accounts'],
        campaign: q => `Followers of ${at(q)}`,
    },
    {
        kind: 'following',
        label: 'Following',
        blurb: 'Who an account follows — its peers and partners',
        icon: UserCheck,
        inputLabel: 'Accounts',
        inputHint: 'Usernames or profile links. Only public accounts show who they follow.',
        placeholder: 'a business in your niche, an industry leader',
        unit: ['account', 'accounts'],
        campaign: q => `Followed by ${at(q)}`,
    },
    {
        kind: 'likers',
        label: 'Post likers',
        blurb: 'People who liked a specific post',
        icon: Heart,
        inputLabel: 'Post links',
        inputHint: 'Links to a post or reel. Instagram shows a sample of likers on very popular posts, not all of them.',
        placeholder: 'https://www.instagram.com/p/…',
        unit: ['post', 'posts'],
        campaign: () => 'Likers of a post',
    },
    {
        kind: 'commenters',
        label: 'Post commenters',
        blurb: 'People who commented — the most engaged',
        icon: MessageCircle,
        inputLabel: 'Post links',
        inputHint: "Links to a post or reel. Commenters on a competitor's post are already talking about the problem.",
        placeholder: 'https://www.instagram.com/p/…',
        unit: ['post', 'posts'],
        campaign: () => 'Commenters on a post',
    },
    {
        kind: 'location',
        label: 'Location',
        blurb: 'People who recently posted at a place',
        icon: MapPin,
        inputLabel: 'Places',
        inputHint: 'A city, neighbourhood or venue. The best match on Instagram is used — its name shows while scraping.',
        placeholder: 'Miami, Dubai Marina, Shoreditch London',
        unit: ['place', 'places'],
        campaign: q => `Posted at ${q}`,
    },
    {
        kind: 'similar',
        label: 'Similar accounts',
        blurb: 'Accounts Instagram suggests next to one you name',
        icon: Sparkles,
        inputLabel: 'Accounts',
        inputHint: 'Name an account that looks like your ideal client — you get the accounts Instagram considers alike.',
        placeholder: 'your best client, a typical prospect',
        unit: ['account', 'accounts'],
        campaign: q => `Similar to ${at(q)}`,
    },
    {
        kind: 'profiles',
        label: 'Handle list',
        blurb: 'Look up specific accounts you already have',
        icon: AtSign,
        inputLabel: 'Usernames',
        inputHint: 'Usernames or profile links, separated by commas, spaces or new lines. Each one is looked up in full.',
        placeholder: 'jane.coaching\nmiami_realtor\nhttps://instagram.com/growthwithsam',
        unit: ['handle', 'handles'],
        campaign: () => 'Handle list',
        multiline: true,
    },
];

const LIMIT_OPTIONS = [10, 25, 50, 100, 150, 200, MAX_PER_QUERY];

/** Fill for the scrape progress bar — white on black, like every other action surface. */
function progressFill(progress: number): string {
    return progress === 100
        ? alpha(CHANNEL.white, 0.9)
        : `linear-gradient(90deg, ${alpha(CHANNEL.white, 0.25)}, ${alpha(CHANNEL.white, 0.85)}, ${alpha(CHANNEL.white, 0.45)})`;
}

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

const FIELD = 'w-full bg-surface border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/30 transition-colors';

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({ onLeadsScraped }) => {
    const [tab, setTab] = useState<'find' | 'import'>('find');
    const [campaignName, setCampaignName] = useState('');

    // ── Source + inputs ──────────────────────────────────────────
    const [kind, setKind]       = useState<SourceKind>('keyword');
    const [raw, setRaw]         = useState('');
    const [limit, setLimit]     = useState(50);
    const [enrich, setEnrich]   = useState(true);

    // ── Run state ────────────────────────────────────────────────
    const [isScraping, setIsScraping] = useState(false);
    const [stopping, setStopping]     = useState(false);
    const stopRef = useRef(false);
    const [progress, setProgress]     = useState<ScrapeProgress | null>(null);
    const [error, setError]           = useState('');
    const [notes, setNotes]           = useState<string[]>([]);
    const [lookupsLeft, setLookupsLeft] = useState<number | undefined>();

    // ── Results ──────────────────────────────────────────────────
    const [results, setResults]   = useState<Lead[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
    const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const source = SOURCES.find(s => s.kind === kind)!;
    const queries = parseQueries(kind, raw);
    const isList = kind === 'profiles';

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToast(null), 3500);
    };

    const resetRun = () => {
        setError('');
        setNotes([]);
        setResults([]);
        setSelected(new Set());
        setProgress(null);
    };

    const pickSource = (next: SourceKind) => {
        if (isScraping || next === kind) return;
        setKind(next);
        setRaw('');
        resetRun();
    };

    const handleStart = useCallback(async () => {
        if (queries.length === 0) { setError(`Enter at least one ${source.unit[0]}.`); return; }

        resetRun();
        stopRef.current = false;
        setStopping(false);
        setIsScraping(true);

        try {
            const outcome = await runScrape(
                { kind, queries, limit, enrich },
                setProgress,
                () => stopRef.current,
            );
            setLookupsLeft(outcome.lookupsLeft);

            const extra = [...outcome.notes];
            if (outcome.unenriched > 0) {
                const n = `${outcome.unenriched} profile${outcome.unenriched !== 1 ? 's' : ''}`;
                extra.push(outcome.stopped
                    ? `Stopped before details loaded for ${n} — they have name and username only.`
                    : `${n} couldn't be loaded in full — kept with name and username only.`);
            }

            if (outcome.leads.length === 0) {
                setError(explainEmptyScrape(outcome, outcome.stopped
                    ? 'You stopped before anything was found.'
                    : 'Try a different search, or another source.'));
            } else {
                setResults(outcome.leads);
                setSelected(new Set(outcome.leads.map(l => l.id)));
                setNotes(extra);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Scrape failed. Check your connection and try again.');
            setProgress(null);
        } finally {
            setIsScraping(false);
            setStopping(false);
        }
    // resetRun and source are derived from the deps below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kind, raw, limit, enrich]);

    const handleStop = () => {
        stopRef.current = true;
        setStopping(true);
    };

    const toggleSelect = (id: string) =>
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const toggleAll = () =>
        setSelected(prev =>
            prev.size === results.length
                ? new Set()
                : new Set(results.map(l => l.id))
        );

    const handleAddToQueue = () => {
        const picked = selected.size > 0
            ? results.filter(l => selected.has(l.id))
            : [...results]; // if nothing explicitly selected, add all

        if (picked.length === 0) {
            showToast('No leads to add. Run a search first.', false);
            return;
        }

        // Default a name if the user left it blank, so campaigns stay trackable.
        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const first = queries[0] ? source.campaign(queries[0]) : 'Campaign';
        const more = !isList && queries.length > 1 ? ` +${queries.length - 1}` : '';
        const name = campaignName.trim() || `${first}${more} · ${date}`;
        const toAdd = picked.map(l => ({ ...l, campaignName: name }));

        onLeadsScraped(toAdd);
        showToast(`${toAdd.length} lead${toAdd.length !== 1 ? 's' : ''} added to "${name}" ✓`);
        setResults([]);
        setSelected(new Set());
        setProgress(null);
        setNotes([]);
    };

    const switchTab = (next: 'find' | 'import') => {
        if (isScraping) return;
        setTab(next);
        resetRun();
    };

    const percent = progress?.percent ?? 0;

    return (
        <div className="space-y-5 relative">

            {/* ── Tabs ───────────────────────────────────────────────── */}
            <div className="flex gap-1 bg-white/3 border border-white/5 rounded-xl p-1 w-fit">
                <button
                    onClick={() => switchTab('find')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'find' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                    <Search className="w-3.5 h-3.5" />
                    Find on Instagram
                </button>
                <button
                    onClick={() => switchTab('import')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${tab === 'import' ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-neutral-200'}`}
                >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Import CSV
                </button>
            </div>

            {/* ── Toast ──────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium ${
                    toast.ok
                        ? 'bg-surface-sunken border-white/30 text-white'
                        : 'bg-surface border-danger-500/30 text-white'
                }`}>
                    {toast.ok
                        ? <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
                    }
                    {toast.msg}
                    <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="ml-1 text-neutral-400 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" aria-hidden />
                    </button>
                </div>
            )}

            {/* ── CSV Import ──────────────────────────────────────────── */}
            {tab === 'import' && (
                <CsvImport
                    maxLeads={null}
                    onLeadsReady={(leads) => { onLeadsScraped(leads); }}
                />
            )}

            {tab === 'find' && (
                <>
                    {/* ── Campaign name ──────────────────────────────────── */}
                    <div>
                        <label htmlFor="campaignbu-campaign-name" className="block text-xs text-neutral-400 mb-1.5 font-medium">
                            Campaign name
                            <span className="ml-2 text-neutral-400 font-normal">so you can track this batch later — optional</span>
                        </label>
                        <input id="campaignbu-campaign-name"
                            type="text"
                            value={campaignName}
                            onChange={e => setCampaignName(e.target.value)}
                            placeholder="e.g. Miami coaches — Jan"
                            className="w-full max-w-md bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/30 transition-colors"
                        />
                    </div>

                    <div className="bg-surface-raised border border-white/5 rounded-2xl p-6 space-y-5">

                        {SCRAPE_DEMO && (
                            <div className="flex items-start gap-2 px-4 py-3 bg-white/5 border border-white/15 rounded-xl text-xs text-neutral-300">
                                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-white" />
                                <span>
                                    <span className="text-white font-semibold">Demo mode.</span> Scrapes return generated
                                    sample profiles, not real accounts. Their handles contain a hyphen, which Instagram
                                    doesn't allow, so nothing can ever be sent to a real person. The queue and DM
                                    generation after this are real. Try an account with "private" or "nobody" in it to see
                                    the error handling.
                                </span>
                            </div>
                        )}

                        {/* ── Source picker ──────────────────────────────── */}
                        <div>
                            <p id="campaignbu-source" className="text-label uppercase tracking-wider text-neutral-400 mb-2 font-semibold">
                                Where to find leads
                            </p>
                            <div role="group" aria-labelledby="campaignbu-source" className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {SOURCES.map(s => {
                                    const Icon = s.icon;
                                    const active = s.kind === kind;
                                    return (
                                        <button
                                            key={s.kind}
                                            type="button"
                                            aria-pressed={active}
                                            disabled={isScraping && !active}
                                            onClick={() => pickSource(s.kind)}
                                            className={`flex items-start gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                                active
                                                    ? 'bg-white/10 border-white/25 text-white'
                                                    : 'bg-white/3 border-white/8 text-neutral-300 hover:border-white/15 hover:text-white'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                                            <span className="min-w-0">
                                                <span className="block text-xs font-semibold">{s.label}</span>
                                                <span className="block text-label text-neutral-400 mt-0.5 leading-snug">{s.blurb}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Quick-fill niche packs (keyword search only) ─ */}
                        {kind === 'keyword' && (
                            <div>
                                <p className="text-label uppercase tracking-wider text-neutral-400 mb-1.5 font-semibold">
                                    Quick fill from a niche pack:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {NICHE_PRESETS.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => setRaw(preset.suggestedSearch)}
                                            disabled={isScraping}
                                            className="px-3 py-1.5 rounded-full border border-white/8 bg-white/3 text-label text-neutral-400 hover:border-white/15 hover:text-neutral-300 transition-colors"
                                        >
                                            {preset.emoji} {preset.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Input ──────────────────────────────────────── */}
                        <div>
                            <label htmlFor="campaignbu-query" className="block text-xs text-neutral-400 mb-1.5 font-medium">
                                {source.inputLabel}
                                {!source.multiline && (
                                    <span className="ml-2 text-neutral-400 font-normal">comma-separated — each one is searched on its own</span>
                                )}
                            </label>
                            {source.multiline ? (
                                <textarea id="campaignbu-query"
                                    rows={5}
                                    value={raw}
                                    disabled={isScraping}
                                    onChange={e => { setRaw(e.target.value); setError(''); }}
                                    placeholder={source.placeholder}
                                    className={`${FIELD} font-mono resize-y`}
                                />
                            ) : (
                                <input id="campaignbu-query"
                                    type="text"
                                    value={raw}
                                    disabled={isScraping}
                                    onChange={e => { setRaw(e.target.value); setError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && !isScraping && handleStart()}
                                    placeholder={source.placeholder}
                                    className={FIELD}
                                />
                            )}
                            <p className="text-label text-neutral-400 mt-1.5">{source.inputHint}</p>
                        </div>

                        {/* ── Limit + details ────────────────────────────── */}
                        {!isList && (
                            <div className="grid sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="campaignbu-limit" className="block text-xs text-neutral-400 mb-1.5 font-medium">
                                        Profiles per {source.unit[0]}
                                        <span className="ml-2 text-neutral-400 font-normal">max {MAX_PER_QUERY}</span>
                                    </label>
                                    <div className="relative">
                                        <select id="campaignbu-limit"
                                            value={limit}
                                            disabled={isScraping}
                                            onChange={e => setLimit(Number(e.target.value))}
                                            className="w-full appearance-none bg-surface border border-white/8 rounded-xl px-4 pr-9 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-white/50 cursor-pointer"
                                        >
                                            {LIMIT_OPTIONS.map(n => (
                                                <option key={n} value={n}>{n} profiles</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    aria-pressed={enrich}
                                    disabled={isScraping}
                                    onClick={() => setEnrich(v => !v)}
                                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-colors self-end ${
                                        enrich
                                            ? 'bg-white/10 border-white/25 text-white'
                                            : 'bg-white/3 border-white/8 text-neutral-400 hover:border-white/15 hover:text-neutral-300'
                                    }`}
                                >
                                    <Users className={`w-4 h-4 flex-shrink-0 ${enrich ? 'text-white' : ''}`} />
                                    <div>
                                        <p className="text-xs font-medium">Full profile details</p>
                                        <p className="text-label text-neutral-400 mt-0.5">
                                            Bio, follower count and category — needed for AI DMs and your filters · slower
                                        </p>
                                    </div>
                                    <div className={`ml-auto w-9 h-5 rounded-full flex-shrink-0 transition-colors ${enrich ? 'bg-white' : 'bg-white/10'}`}>
                                        <div className={`w-4 h-4 m-0.5 rounded-full transition-transform ${enrich ? 'translate-x-4 bg-surface' : 'bg-white'}`} />
                                    </div>
                                </button>
                            </div>
                        )}

                        {!isList && !enrich && (
                            <div className="flex items-start gap-2 px-3 py-2.5 bg-white/3 border border-white/5 rounded-xl text-label text-neutral-400">
                                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <span>
                                    Without details, leads arrive with name and username only: follower count reads 0, so a
                                    minimum-followers filter hides them, and the AI writes DMs without a bio to go on.
                                </span>
                            </div>
                        )}

                        {/* ── Filters live in Settings ───────────────────── */}
                        <div className="flex items-start gap-2 px-3 py-2.5 bg-white/3 border border-white/5 rounded-xl text-label text-neutral-400">
                            <Settings className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>
                                Lead quality filters (min/max followers, bio keywords, business-only) are configured in{' '}
                                <span className="text-neutral-300 font-medium">Settings → Lead Filtering Rules</span>
                                {' '}and applied automatically to the Approval Queue.
                            </span>
                        </div>

                        {/* ── Start / Stop ───────────────────────────────── */}
                        <div className="flex items-center justify-between gap-4 pt-1">
                            <p className="text-label text-neutral-400">
                                {queries.length > 0 && (isList
                                    ? <>{queries.length} {source.unit[queries.length === 1 ? 0 : 1]} to look up</>
                                    : <>
                                        {queries.length} {source.unit[queries.length === 1 ? 0 : 1]}
                                        {' '}× {limit} = up to {queries.length * limit} profiles
                                    </>
                                )}
                                {lookupsLeft !== undefined && (
                                    <span className="block mt-0.5">{lookupsLeft.toLocaleString('en-US')} profile lookups left this month</span>
                                )}
                            </p>
                            {isScraping ? (
                                <button
                                    type="button"
                                    onClick={handleStop}
                                    disabled={stopping}
                                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/15 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
                                >
                                    {stopping
                                        ? <><Loader2 className="w-4 h-4 animate-spin" />Stopping…</>
                                        : <><CircleStop className="w-4 h-4" />Stop — keep what's found</>
                                    }
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleStart}
                                    disabled={queries.length === 0}
                                    className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-surface font-semibold rounded-xl transition-all text-sm"
                                >
                                    <source.icon className="w-4 h-4" />
                                    {isList ? 'Look up' : 'Start scrape'}
                                </button>
                            )}
                        </div>

                        {/* ── Progress ───────────────────────────────────── */}
                        {progress && (
                            <div className="space-y-2" aria-live="polite">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-label text-neutral-400 font-mono truncate">{progress.message}</span>
                                    <span className="text-label font-bold font-mono text-white">{percent}%</span>
                                </div>
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700 ease-out"
                                        style={{
                                            width: `${percent}%`,
                                            background: progressFill(percent),
                                            backgroundSize: '200% 100%',
                                            animation: isScraping ? 'chargeShimmer 1.8s linear infinite' : 'none',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Error ──────────────────────────────────────── */}
                        {error && (
                            <div role="alert" className="flex items-start gap-2 px-4 py-3 bg-danger-500/8 border border-danger-500/20 rounded-xl text-danger-400 text-xs">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        {/* ── Notes: per-query problems that didn't stop the run ─ */}
                        {notes.length > 0 && (
                            <div className="flex items-start gap-2 px-4 py-3 bg-white/3 border border-white/8 rounded-xl text-neutral-300 text-xs">
                                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <ul className="space-y-1">
                                    {notes.map((n, i) => <li key={i}>{n}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Results Card ─────────────────────────────────────────── */}
            {results.length > 0 && (
                <div className="bg-surface-raised border border-white/5 rounded-2xl overflow-hidden">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                            <button onClick={toggleAll} aria-label="Select all" className="text-neutral-400 hover:text-white transition-colors">
                                {selected.size === results.length
                                    ? <CheckSquare className="w-4 h-4 text-white" />
                                    : <Square className="w-4 h-4" />
                                }
                            </button>
                            <span className="text-sm text-neutral-400">
                                <span className="text-white font-medium">{selected.size}</span>
                                {' of '}
                                <span className="text-white font-medium">{results.length}</span>
                                {' profiles selected'}
                            </span>
                        </div>
                        <button
                            onClick={handleAddToQueue}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-surface font-semibold rounded-xl transition-colors text-sm"
                            style={{ boxShadow: `0 0 16px ${alpha(CHANNEL.white, 0.25)}` }}
                        >
                            <Plus className="w-4 h-4" />
                            Add {selected.size > 0 ? selected.size : results.length} to Queue
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* List */}
                    <div className="divide-y divide-white/[0.04] max-h-[520px] overflow-y-auto">
                        {results.map(lead => (
                            <div
                                key={lead.id}
                                onClick={() => toggleSelect(lead.id)}
                                className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors select-none ${
                                    selected.has(lead.id)
                                        ? 'bg-white/[0.05] hover:bg-white/[0.08]'
                                        : 'hover:bg-white/[0.025]'
                                }`}
                            >
                                {/* Checkbox */}
                                <div className="mt-0.5 flex-shrink-0">
                                    {selected.has(lead.id)
                                        ? <CheckSquare className="w-4 h-4 text-white" />
                                        : <Square className="w-4 h-4 text-neutral-400" />
                                    }
                                </div>

                                {/* Avatar */}
                                {lead.profilePicUrl ? (
                                    <img
                                        src={lead.profilePicUrl}
                                        alt={lead.name}
                                        referrerPolicy="no-referrer"
                                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white to-neutral-400 flex items-center justify-center text-surface text-sm font-bold flex-shrink-0">
                                        {(lead.name || lead.handle)[0]?.toUpperCase()}
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-white">{lead.name}</span>
                                        {lead.verified && (
                                            <span className="text-label bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                                        )}
                                        {lead.businessAccount && (
                                            <span className="text-label bg-white/10 text-white border border-white/20 px-1.5 py-0.5 rounded-full">Business</span>
                                        )}
                                        {lead.isPrivate && (
                                            <span className="text-label bg-neutral-800 text-neutral-400 border border-white/8 px-1.5 py-0.5 rounded-full">Private</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-400">
                                        <span>@{lead.handle}</span>
                                        {lead.businessCategory && <span>{lead.businessCategory}</span>}
                                        {lead.city && <span>📍 {lead.city}</span>}
                                    </div>
                                    {lead.bio && (
                                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{lead.bio}</p>
                                    )}
                                </div>

                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs font-medium text-neutral-300">{formatFollowers(lead.followers)}</p>
                                    <p className="text-label text-neutral-400">followers</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer CTA */}
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <p className="text-xs text-neutral-400 max-w-sm">
                            Leads in the queue are then filtered by your Settings rules before AI DMs are generated.
                        </p>
                        <button
                            onClick={handleAddToQueue}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-neutral-200 text-surface font-semibold rounded-xl transition-colors text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add {selected.size > 0 ? selected.size : results.length} to Queue →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
