import React, { useState, useCallback, useRef } from 'react';
import { Lead } from '../../lib/types';
import { runApifyScrape, runFollowersScrape, SearchParams, FollowersParams } from '../../lib/apify';
import {
    Search, CheckSquare, Square, ChevronDown,
    Loader2, Users, AlertCircle, CheckCircle,
    X, ArrowRight, Plus, Settings, Mail, UserCheck,
    FileSpreadsheet,
} from 'lucide-react';
import { NICHE_PRESETS } from '../../lib/presets';
import { CsvImport } from './CsvImport';
import { BRAND, CHANNEL, alpha } from '../../lib/theme';

interface CampaignBuilderProps {
    onLeadsScraped: (leads: Lead[]) => void;
}

type SearchTypeOption = {
    value: SearchParams['searchType'];
    label: string;
    hint: string;
    placeholder: string;
};

const SEARCH_TYPES: SearchTypeOption[] = [
    {
        value: 'user',
        label: 'Search profiles',
        hint: 'Find Instagram profiles matching your keywords — best for niche targeting',
        placeholder: 'coaches, consultants, agency, dm me, skool, ai agency',
    },
    {
        value: 'hashtag',
        label: 'Search hashtags',
        hint: 'Explore hashtag data and related tags for a given niche',
        placeholder: 'entrepreneur, digitalmarketing, agency, saas',
    },
    {
        value: 'place',
        label: 'Search locations',
        hint: 'Find business locations and venue profiles in a specific city',
        placeholder: 'Miami, New York, Dubai, London',
    },
];

// Actor hard cap is 250 per search term
const LIMIT_OPTIONS = [10, 25, 50, 100, 150, 200, 250];

/**
 * Fill for the scrape progress bar. Both tabs render the same bar, so the ramp
 * lives here rather than being re-typed per tab and drifting apart.
 */
function progressFill(progress: number): string {
    return progress === 100
        ? `linear-gradient(90deg, ${BRAND[600]}, ${BRAND[500]})`
        : `linear-gradient(90deg, ${BRAND[800]}, ${BRAND[500]}, ${BRAND[400]})`;
}

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({ onLeadsScraped }) => {
    // ── Tab ──────────────────────────────────────────────────────
    const [tab, setTab] = useState<'search' | 'followers' | 'import'>('search');

    // ── Campaign name (attached to every lead from this scrape for tracking) ─
    const [campaignName, setCampaignName] = useState('');

    // ── Keyword search inputs ────────────────────────────────────
    const [searchType, setSearchType]   = useState<SearchParams['searchType']>('user');
    const [searchRaw, setSearchRaw]     = useState('');
    const [searchLimit, setSearchLimit] = useState(50);
    const [enhance, setEnhance]         = useState(false);

    // ── Followers scraper inputs ─────────────────────────────────
    const [fUsername, setFUsername]         = useState('');
    const [fType, setFType]                 = useState<'followers' | 'following'>('followers');
    const [fMaxItem, setFMaxItem]           = useState(100);
    const [fEnriched, setFEnriched]         = useState(true);

    // ── Shared scrape state ──────────────────────────────────────
    const [isScraping, setIsScraping]     = useState(false);
    const [scrapeProgress, setScrapeProgress] = useState(0);
    const [scrapeStatus, setScrapeStatus]     = useState('');
    const [error, setError]               = useState('');

    // ── Results ──────────────────────────────────────────────────
    const [results, setResults]   = useState<Lead[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
    const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeType = SEARCH_TYPES.find(t => t.value === searchType)!;

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToast(null), 3500);
    };

    const log = (msg: string) => {
        setScrapeStatus(msg);
        if (msg.includes('Connecting'))          setScrapeProgress(8);
        else if (msg.includes('Run started'))    setScrapeProgress(18);
        else if (msg.includes('RUNNING') || /\d+s/.test(msg)) {
            const match = msg.match(/(\d+)s/);
            if (match) {
                const elapsed = parseInt(match[1]);
                setScrapeProgress(Math.min(82, 18 + Math.round((elapsed / 240) * 64)));
            }
        }
        else if (msg.includes('Fetching'))       setScrapeProgress(88);
        else if (msg.includes('Mapping'))        setScrapeProgress(95);
        else if (msg.includes('Done'))           setScrapeProgress(100);
    };

    const handleSearch = useCallback(async () => {
        const trimmed = searchRaw.trim();
        if (!trimmed) { setError('Enter at least one search term.'); return; }

        setError('');
        setResults([]);
        setSelected(new Set());
        setScrapeProgress(0);
        setScrapeStatus('');
        setIsScraping(true);

        const params: SearchParams = {
            search: trimmed,
            searchType,
            searchLimit,
            enhanceUserSearchWithFacebookPage: enhance,
        };

        try {
            const leads = await runApifyScrape(params, log);
            if (leads.length === 0) {
                setError('No profiles returned. Try different search terms or a higher limit.');
            } else {
                setResults(leads);
                setSelected(new Set(leads.map(l => l.id))); // auto-select all
                log(`✓ ${leads.length} profile${leads.length !== 1 ? 's' : ''} ready.`);
            }
        } catch (err: any) {
            setError(err.message ?? 'Scrape failed. Check your connection and try again.');
        } finally {
            setIsScraping(false);
        }
    }, [searchType, searchRaw, searchLimit, enhance]);

    const handleFollowersScrape = useCallback(async () => {
        const usernames = fUsername.split(',').map(u => u.trim().replace('@', '')).filter(Boolean);
        if (!usernames.length) { setError('Enter at least one Instagram username.'); return; }

        setError('');
        setResults([]);
        setSelected(new Set());
        setScrapeProgress(0);
        setScrapeStatus('');
        setIsScraping(true);

        const params: FollowersParams = {
            usernames,
            type: fType,
            maxItem: fMaxItem,
            profileEnriched: fEnriched,
        };

        try {
            const leads = await runFollowersScrape(params, log);
            if (leads.length === 0) {
                setError('No profiles returned. The account may be private or have no followers.');
            } else {
                setResults(leads);
                setSelected(new Set(leads.map(l => l.id)));
                log(`✓ ${leads.length} profile${leads.length !== 1 ? 's' : ''} ready.`);
            }
        } catch (err: any) {
            setError(err.message ?? 'Scrape failed.');
        } finally {
            setIsScraping(false);
        }
    }, [fUsername, fType, fMaxItem, fEnriched]);

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
        const name = campaignName.trim()
            || `${searchRaw.split(',')[0]?.trim() || fUsername.split(',')[0]?.trim() || 'Campaign'} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        const toAdd = picked.map(l => ({ ...l, campaignName: name }));

        onLeadsScraped(toAdd);
        showToast(`${toAdd.length} lead${toAdd.length !== 1 ? 's' : ''} added to "${name}" ✓`);
        setResults([]);
        setSelected(new Set());
        setScrapeProgress(0);
        setScrapeStatus('');
    };

    return (
        <div className="space-y-5 relative">

            {/* ── Tabs ───────────────────────────────────────────────── */}
            <div className="flex gap-1 bg-white/3 border border-white/5 rounded-xl p-1 w-fit">
                <button
                    onClick={() => { setTab('search'); setError(''); setResults([]); setScrapeProgress(0); setScrapeStatus(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'search' ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
                >
                    <Search className="w-3.5 h-3.5" />
                    Keyword Search
                </button>
                <button
                    onClick={() => { setTab('followers'); setError(''); setResults([]); setScrapeProgress(0); setScrapeStatus(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'followers' ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
                >
                    <UserCheck className="w-3.5 h-3.5" />
                    Followers / Following
                </button>
                <button
                    onClick={() => { setTab('import'); setError(''); setResults([]); setScrapeProgress(0); setScrapeStatus(''); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab === 'import' ? 'bg-white/10 text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
                >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Import CSV
                </button>
            </div>

            {/* ── Campaign name ──────────────────────────────────────── */}
            {tab !== 'import' && (
                <div>
                    <label className="block text-xs text-neutral-500 mb-1.5 font-medium">
                        Campaign name
                        <span className="ml-2 text-neutral-700 font-normal">so you can track this batch later — optional</span>
                    </label>
                    <input
                        type="text"
                        value={campaignName}
                        onChange={e => setCampaignName(e.target.value)}
                        placeholder="e.g. Miami coaches — Jan"
                        className="w-full max-w-md bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all"
                    />
                </div>
            )}

            {/* ── Toast ──────────────────────────────────────────────── */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium ${
                    toast.ok
                        ? 'bg-surface-sunken border-brand-500/30 text-white'
                        : 'bg-surface border-danger-500/30 text-white'
                }`}>
                    {toast.ok
                        ? <CheckCircle className="w-4 h-4 text-brand-400 flex-shrink-0" />
                        : <AlertCircle className="w-4 h-4 text-danger-400 flex-shrink-0" />
                    }
                    {toast.msg}
                    <button onClick={() => setToast(null)} className="ml-1 text-neutral-600 hover:text-neutral-300 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* ── Followers / Following Card ───────────────────────────── */}
            {tab === 'followers' && (
                <div className="bg-surface-raised border border-white/5 rounded-2xl p-6 space-y-5">
                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-brand-400" />
                        <h3 className="text-sm font-semibold text-white">Followers / Following Scraper</h3>
                    </div>

                    {/* Username input */}
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1.5 font-medium">
                            Instagram username(s)
                            <span className="ml-2 text-neutral-700 font-normal">comma-separated — no @ needed</span>
                        </label>
                        <input
                            type="text"
                            value={fUsername}
                            onChange={e => { setFUsername(e.target.value); setError(''); }}
                            placeholder="garyvee, alexhormozi, yourcompetitor"
                            className="w-full bg-surface border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all"
                        />
                        <p className="text-[11px] text-neutral-700 mt-1.5">Scrape the followers or following list of any public account</p>
                    </div>

                    {/* Type + Max items */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1.5 font-medium">Scrape type</label>
                            <div className="relative">
                                <select
                                    value={fType}
                                    onChange={e => setFType(e.target.value as 'followers' | 'following')}
                                    className="w-full appearance-none bg-surface border border-white/8 rounded-xl px-4 pr-9 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50 cursor-pointer"
                                >
                                    <option value="followers">Followers</option>
                                    <option value="following">Following</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1.5 font-medium">
                                Max profiles
                                <span className="ml-2 text-neutral-700 font-normal">100 on free Apify plan</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={fMaxItem}
                                    onChange={e => setFMaxItem(Number(e.target.value))}
                                    className="w-full appearance-none bg-surface border border-white/8 rounded-xl px-4 pr-9 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50 cursor-pointer"
                                >
                                    {[50, 100, 200, 500, 1000].map(n => (
                                        <option key={n} value={n}>{n} profiles</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Enrichment toggle */}
                    <button
                        onClick={() => setFEnriched(v => !v)}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all ${
                            fEnriched
                                ? 'bg-info-500/10 border-info-500/25 text-white'
                                : 'bg-white/3 border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-300'
                        }`}
                    >
                        <Users className={`w-4 h-4 flex-shrink-0 ${fEnriched ? 'text-info-400' : ''}`} />
                        <div>
                            <p className="text-xs font-medium">Full profile enrichment</p>
                            <p className="text-[11px] text-neutral-600 mt-0.5">
                                Fetches bio, follower count, and business info for each profile · recommended for AI DM generation · slower
                            </p>
                        </div>
                        <div className={`ml-auto w-9 h-5 rounded-full flex-shrink-0 transition-colors ${fEnriched ? 'bg-info-500' : 'bg-white/10'}`}>
                            <div className={`w-4 h-4 m-0.5 bg-white rounded-full transition-transform ${fEnriched ? 'translate-x-4' : ''}`} />
                        </div>
                    </button>

                    {/* Start */}
                    <div className="flex items-center justify-between pt-1">
                        <p className="text-[11px] text-neutral-700">
                            {fUsername.trim() && (
                                <>
                                    {fUsername.split(',').filter(u => u.trim()).length} account{fUsername.split(',').filter(u => u.trim()).length !== 1 ? 's' : ''}
                                    {' '}× {fMaxItem} = up to {fUsername.split(',').filter(u => u.trim()).length * fMaxItem} profiles
                                </>
                            )}
                        </p>
                        <button
                            onClick={handleFollowersScrape}
                            disabled={isScraping || !fUsername.trim()}
                            className="flex items-center gap-2 px-8 py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-brand-950 font-semibold rounded-xl transition-all text-sm"
                        >
                            {isScraping
                                ? <><Loader2 className="w-4 h-4 animate-spin" />Scraping…</>
                                : <><UserCheck className="w-4 h-4" />Start Scrape</>
                            }
                        </button>
                    </div>

                    {/* Progress bar */}
                    {(isScraping || scrapeProgress > 0) && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-neutral-600 font-mono truncate max-w-[80%]">{scrapeStatus}</span>
                                <span className="text-[11px] font-bold font-mono text-brand-400">{scrapeProgress}%</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                                    style={{
                                        width: `${scrapeProgress}%`,
                                        background: progressFill(scrapeProgress),
                                        backgroundSize: '200% 100%',
                                        animation: isScraping ? 'chargeShimmer 1.8s linear infinite' : 'none',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="flex items-start gap-2 px-4 py-3 bg-danger-500/8 border border-danger-500/20 rounded-xl text-danger-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
                        </div>
                    )}
                </div>
            )}

            {/* ── CSV Import ──────────────────────────────────────────── */}
            {tab === 'import' && (
                <CsvImport
                    maxLeads={null}
                    onLeadsReady={(leads) => { onLeadsScraped(leads); }}
                />
            )}

            {/* ── Search Card ─────────────────────────────────────────── */}
            {tab === 'search' && (
            <div className="bg-surface-raised border border-white/5 rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-brand-400" />
                    <h3 className="text-sm font-semibold text-white">Search Instagram</h3>
                </div>

                {/* Quick-fill niche packs */}
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-600 mb-1.5 font-semibold">
                        Quick fill from a niche pack:
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {NICHE_PRESETS.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => setSearchRaw(preset.suggestedSearch)}
                                className="px-3 py-1.5 rounded-full border border-white/8 bg-white/3 text-[11px] text-neutral-400 hover:border-white/15 hover:text-neutral-300 transition-all"
                            >
                                {preset.emoji} {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search term */}
                <div>
                    <label className="block text-xs text-neutral-500 mb-1.5 font-medium">
                        Search
                        <span className="ml-2 text-neutral-700 font-normal">comma-separated — each term is searched independently</span>
                    </label>
                    <input
                        type="text"
                        value={searchRaw}
                        onChange={e => { setSearchRaw(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && !isScraping && handleSearch()}
                        placeholder={activeType.placeholder}
                        className="w-full bg-surface border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all"
                    />
                    <p className="text-[11px] text-neutral-700 mt-1.5">{activeType.hint}</p>
                </div>

                {/* Search type + limit */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1.5 font-medium">Search type</label>
                        <div className="relative">
                            <select
                                value={searchType}
                                onChange={e => setSearchType(e.target.value as SearchParams['searchType'])}
                                className="w-full appearance-none bg-surface border border-white/8 rounded-xl px-4 pr-9 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50 cursor-pointer"
                            >
                                {SEARCH_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-neutral-500 mb-1.5 font-medium">
                            Search limit per term
                            <span className="ml-2 text-neutral-700 font-normal">max 250</span>
                        </label>
                        <div className="relative">
                            <select
                                value={searchLimit}
                                onChange={e => setSearchLimit(Number(e.target.value))}
                                className="w-full appearance-none bg-surface border border-white/8 rounded-xl px-4 pr-9 py-3 text-sm text-neutral-200 focus:outline-none focus:ring-1 focus:ring-brand-500/50 cursor-pointer"
                            >
                                {LIMIT_OPTIONS.map(n => (
                                    <option key={n} value={n}>{n} results</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Enhance toggle (user search only) */}
                {searchType === 'user' && (
                    <button
                        onClick={() => setEnhance(v => !v)}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all ${
                            enhance
                                ? 'bg-info-500/10 border-info-500/25 text-white'
                                : 'bg-white/3 border-white/8 text-neutral-500 hover:border-white/15 hover:text-neutral-300'
                        }`}
                    >
                        <Mail className={`w-4 h-4 flex-shrink-0 ${enhance ? 'text-info-400' : ''}`} />
                        <div>
                            <p className="text-xs font-medium">Enhance with Facebook page &amp; email</p>
                            <p className="text-[11px] text-neutral-600 mt-0.5">
                                Enriches top 10 results per term with linked Facebook page and business email · uses extra Apify credits
                            </p>
                        </div>
                        <div className={`ml-auto w-9 h-5 rounded-full flex-shrink-0 transition-colors ${enhance ? 'bg-info-500' : 'bg-white/10'}`}>
                            <div className={`w-4 h-4 m-0.5 bg-white rounded-full transition-transform ${enhance ? 'translate-x-4' : ''}`} />
                        </div>
                    </button>
                )}

                {/* Info note: filters live in Settings */}
                <div className="flex items-start gap-2 px-3 py-2.5 bg-white/3 border border-white/5 rounded-xl text-[11px] text-neutral-600">
                    <Settings className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                        Lead quality filters (min/max followers, bio keywords, business-only) are configured in{' '}
                        <span className="text-neutral-400 font-medium">Settings → Lead Filtering Rules</span>
                        {' '}and applied automatically to the Approval Queue.
                    </span>
                </div>

                {/* Start Search */}
                <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-neutral-700">
                        {searchRaw.trim() && (
                            <>
                                {searchRaw.split(',').filter(s => s.trim()).length} term{searchRaw.split(',').filter(s => s.trim()).length !== 1 ? 's' : ''}
                                {' '}× {searchLimit} = up to{' '}
                                {searchRaw.split(',').filter(s => s.trim()).length * searchLimit} profiles
                            </>
                        )}
                    </p>
                    <button
                        onClick={handleSearch}
                        disabled={isScraping || !searchRaw.trim()}
                        className="flex items-center gap-2 px-8 py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-brand-950 font-semibold rounded-xl transition-all text-sm"
                    >
                        {isScraping
                            ? <><Loader2 className="w-4 h-4 animate-spin" />Scraping…</>
                            : <><Search className="w-4 h-4" />Start Search</>
                        }
                    </button>
                </div>

                {/* Progress bar */}
                {(isScraping || scrapeProgress > 0) && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-600 font-mono truncate max-w-[80%]">{scrapeStatus}</span>
                            <span className="text-[11px] font-bold font-mono text-brand-400">{scrapeProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                    width: `${scrapeProgress}%`,
                                    background: progressFill(scrapeProgress),
                                    backgroundSize: '200% 100%',
                                    animation: isScraping ? 'chargeShimmer 1.8s linear infinite' : 'none',
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 px-4 py-3 bg-danger-500/8 border border-danger-500/20 rounded-xl text-danger-400 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {error}
                    </div>
                )}
            </div>
            )}

            {/* ── Results Card ─────────────────────────────────────────── */}
            {results.length > 0 && (
                <div className="bg-surface-raised border border-white/5 rounded-2xl overflow-hidden">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
                        <div className="flex items-center gap-3">
                            <button onClick={toggleAll} className="text-neutral-400 hover:text-white transition-colors">
                                {selected.size === results.length
                                    ? <CheckSquare className="w-4 h-4 text-brand-400" />
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
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-brand-950 font-semibold rounded-xl transition-all text-sm"
                            style={{ boxShadow: `0 0 16px ${alpha(CHANNEL.brand, 0.25)}` }}
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
                                        ? 'bg-brand-500/[0.05] hover:bg-brand-500/[0.08]'
                                        : 'hover:bg-white/[0.025]'
                                }`}
                            >
                                {/* Checkbox */}
                                <div className="mt-0.5 flex-shrink-0">
                                    {selected.has(lead.id)
                                        ? <CheckSquare className="w-4 h-4 text-brand-400" />
                                        : <Square className="w-4 h-4 text-neutral-700" />
                                    }
                                </div>

                                {/* Avatar */}
                                {lead.profilePicUrl ? (
                                    <img
                                        src={lead.profilePicUrl}
                                        alt={lead.name}
                                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-info-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                        {(lead.name || lead.handle)[0]?.toUpperCase()}
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-white">{lead.name}</span>
                                        {lead.verified && (
                                            <span className="text-[10px] bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                                        )}
                                        {lead.businessAccount && (
                                            <span className="text-[10px] bg-caution-500/10 text-caution-400 border border-caution-500/20 px-1.5 py-0.5 rounded-full">Business</span>
                                        )}
                                        {lead.isPrivate && (
                                            <span className="text-[10px] bg-neutral-800 text-neutral-500 border border-white/8 px-1.5 py-0.5 rounded-full">Private</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-600">
                                        <span>@{lead.handle}</span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {formatFollowers(lead.followers)}
                                        </span>
                                        {lead.city && <span>📍 {lead.city}</span>}
                                    </div>
                                    {lead.bio && (
                                        <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{lead.bio}</p>
                                    )}
                                </div>

                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs font-medium text-neutral-400">{formatFollowers(lead.followers)}</p>
                                    <p className="text-[10px] text-neutral-700">followers</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer CTA */}
                    <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <p className="text-xs text-neutral-600 max-w-sm">
                            Leads in the queue are then filtered by your Settings rules before AI DMs are generated.
                        </p>
                        <button
                            onClick={handleAddToQueue}
                            className="flex items-center gap-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-400 text-brand-950 font-semibold rounded-xl transition-all text-sm"
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
