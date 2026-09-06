import React, { useState, useMemo } from 'react';
import { Lead, AppConfig } from '../../lib/types';
import {
    Sparkles, Send, Trash2, Download, ChevronDown, Users,
    CheckCircle, Search, Filter, Timer,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import { filterUtils } from '../../lib/filters';
import { storage } from '../../lib/storage';
import { sendCampaign } from '../../lib/extensionProtocol';
import { useStable } from '../../lib/useStable';
import { QueueRow } from './QueueRow';

interface ApprovalQueueProps {
    leads: Lead[];
    config: AppConfig;
    onGenerateDMs: (leads?: Lead[]) => void;
    isGenerating: boolean;
    onDeleteLead?: (id: string) => void;
    /** Bulk delete — one state update + one batched DB write */
    onDeleteLeads?: (ids: string[]) => void;
    onApproveLead?: (id: string) => void;
    /** Bulk approve — one state update + one batched DB write */
    onApproveLeads?: (ids: string[]) => void;
    onRejectLead?: (id: string) => void;
    onUpdateDM?: (id: string, content: string) => void;
    onUpdateLead?: (lead: Lead) => void;
}

type StatusFilter = 'all' | 'pending' | 'ready' | 'approved' | 'rejected';

/** Rows mounted at once. Keeps the table's DOM flat as the lead count grows. */
const PAGE_SIZE = 50;

/** Page numbers to show, with `null` standing in for an elided run. */
function pageWindow(current: number, total: number): (number | null)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = new Set([1, total, current, current - 1, current + 1]);
    const shown = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);

    const out: (number | null)[] = [];
    let prev = 0;
    for (const p of shown) {
        if (prev && p - prev > 1) out.push(null);
        out.push(p);
        prev = p;
    }
    return out;
}

function exportToCSV(leads: Lead[]) {
    const headers = ['Handle', 'Name', 'Followers', 'Bio', 'DM', 'Status', 'Approved', 'Rejected'];
    const rows = leads.map(l => [
        `@${l.handle}`,
        l.name,
        l.followers,
        (l.bio ?? '').replace(/\n/g, ' '),
        (l.dmContent ?? '').replace(/\n/g, ' '),
        l.dmSent ? 'Sent' : l.dmContent ? 'Ready' : 'Pending',
        l.approved ? 'Yes' : 'No',
        l.rejected ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'magnet_queue.csv'; a.click();
    URL.revokeObjectURL(url);
}

function exportToJSON(leads: Lead[]) {
    const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'magnet_queue.json'; a.click();
    URL.revokeObjectURL(url);
}

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'ready', label: 'Ready' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
];

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
    leads,
    config,
    onGenerateDMs,
    isGenerating,
    onDeleteLead,
    onDeleteLeads,
    onApproveLead,
    onApproveLeads,
    onRejectLead,
    onUpdateDM,
    onUpdateLead,
}) => {
    const toast = useToast();
    const initialDelay = storage.getDmDelay();
    const [minDelay, setMinDelay] = useState<number>(initialDelay.min);
    const [maxDelay, setMaxDelay] = useState<number>(initialDelay.max);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [battlecardsFor, setBattlecardsFor] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');
    const [showExport, setShowExport] = useState(false);
    const [search, setSearch] = useState('');
    const [campaignFilter, setCampaignFilter] = useState<string>('all');
    const [applySettingsFilter, setApplySettingsFilter] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Campaigns as {id, name} — name from the leads' campaignName, fallback to a short id.
    const campaigns = useMemo(() => {
        const byId = new Map<string, string>();
        for (const l of leads) {
            if (!l.campaignId) continue;
            if (!byId.has(l.campaignId)) {
                byId.set(l.campaignId, l.campaignName?.trim() || `Campaign ${l.campaignId.slice(0, 6)}`);
            }
        }
        return [...byId.entries()].map(([id, name]) => ({ id, name }));
    }, [leads]);

    const filtered = useMemo(() => {
        const base = applySettingsFilter ? filterUtils.filterLeads(leads, config) : leads;
        const q = search.trim().toLowerCase();
        return base.filter(l => {
            if (statusFilter === 'pending') { if (l.dmContent) return false; }
            else if (statusFilter === 'ready') { if (!l.dmContent || l.approved || l.rejected) return false; }
            else if (statusFilter === 'approved') { if (!l.approved) return false; }
            else if (statusFilter === 'rejected') { if (!l.rejected) return false; }
            if (q && !l.handle.toLowerCase().includes(q) && !(l.name ?? '').toLowerCase().includes(q)) return false;
            if (campaignFilter !== 'all' && l.campaignId !== campaignFilter) return false;
            return true;
        });
    }, [leads, statusFilter, search, campaignFilter, applySettingsFilter, config]);

    // ── Pagination ────────────────────────────────────────────────────────────
    // Only a page of rows is mounted: 250 leads used to put ~11k elements and
    // ~1.5k svg icons in the DOM at once. Bulk actions below deliberately still
    // operate on the whole `filtered` set, not just the visible page.
    const [page, setPage] = useState(1);

    // Changing what's being filtered should start over at page 1 — adjusted
    // during render (React's sanctioned pattern) rather than in an effect.
    const filterKey = `${statusFilter}|${search}|${campaignFilter}|${applySettingsFilter}`;
    const [lastFilterKey, setLastFilterKey] = useState(filterKey);
    if (filterKey !== lastFilterKey) {
        setLastFilterKey(filterKey);
        setPage(1);
    }

    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    // Clamp during render rather than in an effect, so filtering down to fewer
    // pages never shows an empty table for a frame.
    const safePage = Math.min(page, pageCount);
    if (safePage !== page) setPage(safePage);

    const visible = useMemo(
        () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [filtered, safePage],
    );
    const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);
    const pageNumbers = useMemo(() => pageWindow(safePage, pageCount), [safePage, pageCount]);

    const counts = useMemo(() => ({
        all: leads.length,
        pending: leads.filter(l => !l.dmContent).length,
        ready: leads.filter(l => !!l.dmContent && !l.approved && !l.rejected).length,
        approved: leads.filter(l => l.approved).length,
        rejected: leads.filter(l => l.rejected).length,
    }), [leads]);

    // These are handed to 250 memoized rows — every one must keep a stable
    // identity or React.memo compares unequal and the whole table re-renders.
    const startEdit = useStable((lead: Lead) => {
        setEditingId(lead.id);
        setEditDraft(lead.dmContent ?? '');
    });

    const saveEdit = useStable((id: string) => {
        onUpdateDM?.(id, editDraft);
        setEditingId(null);
    });

    const cancelEdit = useStable(() => setEditingId(null));

    const handleEditDraftChange = useStable((value: string) => setEditDraft(value));
    const approveLead = useStable((id: string) => onApproveLead?.(id));
    const rejectLead = useStable((id: string) => onRejectLead?.(id));
    const updateLead = useStable((lead: Lead) => onUpdateLead?.(lead));
    const generateForLead = useStable((lead: Lead) => onGenerateDMs([lead]));
    const toggleBattlecards = useStable((id: string) =>
        setBattlecardsFor(prev => (prev === id ? null : id)),
    );

    // Normalize + persist the delay range whenever an input changes.
    const commitDelay = (min: number, max: number) => {
        const safeMin = Math.max(1, Math.floor(min) || 1);
        const safeMax = Math.max(safeMin, Math.floor(max) || safeMin);
        setMinDelay(safeMin);
        setMaxDelay(safeMax);
        storage.setDmDelay({ min: safeMin, max: safeMax });
    };

    const handleSendToExtension = () => {
        // `!l.dmSent` is load-bearing: the extension REPLACES its queue with
        // whatever arrives, so without this a second press re-DMs every lead
        // already contacted. Instagram reads repeat DMs to the same handle as
        // spam, so this is an account-restriction risk, not just bad data.
        const approved = leads.filter(l => l.approved && l.dmContent && !l.dmSent);
        if (approved.length === 0) {
            const allSent = leads.some(l => l.approved && l.dmContent && l.dmSent);
            toast.error(allSent
                ? 'Every approved DM has already been sent. Approve more leads to send again.'
                : 'No approved DMs to send. Approve some leads first.');
            return;
        }
        const safeMin = Math.max(1, Math.floor(minDelay) || 1);
        const safeMax = Math.max(safeMin, Math.floor(maxDelay) || safeMin);
        sendCampaign({
            leads: approved.map(l => ({ handle: l.handle, message: l.dmContent! })),
            minDelay: safeMin,
            maxDelay: safeMax,
            dailyCap: config.dailySendCap ?? 40,
        });
        toast.success(`${approved.length} lead${approved.length !== 1 ? 's' : ''} sent — DMs will drip every ${safeMin}–${safeMax} min.`);
    };

    // ── Bulk selection ────────────────────────────────────────────────────────
    const toggleSelect = useStable((id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    }));

    const allFilteredSelected = filtered.length > 0 && filtered.every(l => selected.has(l.id));

    const toggleSelectAll = () => setSelected(prev => {
        if (allFilteredSelected) {
            const next = new Set(prev);
            filtered.forEach(l => next.delete(l.id));
            return next;
        }
        return new Set([...prev, ...filtered.map(l => l.id)]);
    });

    const handleDeleteSelected = () => {
        const ids = filtered.filter(l => selected.has(l.id)).map(l => l.id);
        if (ids.length === 0) return;
        if (!window.confirm(`Delete ${ids.length} selected lead${ids.length !== 1 ? 's' : ''} from the queue? This cannot be undone.`)) return;
        if (onDeleteLeads) onDeleteLeads(ids);
        else ids.forEach(id => onDeleteLead?.(id));
        setSelected(new Set());
    };

    const handleGenerateForPending = () => {
        const pending = leads.filter(l => !l.dmContent);
        onGenerateDMs(pending.length > 0 ? pending : undefined);
    };

    const handleApproveAllReady = () => {
        const readyIds = leads
            .filter(l => !!l.dmContent && !l.approved && !l.rejected)
            .map(l => l.id);
        if (readyIds.length === 0) {
            toast.info('No DMs waiting for approval.');
            return;
        }
        onApproveLeads?.(readyIds);
    };

    const handleDelete = useStable((lead: Lead) => {
        if (window.confirm(`Delete @${lead.handle} from the queue? This cannot be undone.`)) {
            onDeleteLead?.(lead.id);
        }
    });

    return (
        <div className="space-y-5">
            {/* ── Action bar ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Generate DMs */}
                <button
                    onClick={handleGenerateForPending}
                    disabled={isGenerating || leads.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-cyan-950 font-semibold rounded-xl transition-all text-sm"
                >
                    <Sparkles className="w-4 h-4" />
                    {isGenerating ? 'Generating…' : 'Generate AI DMs'}
                </button>

                {/* Export dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowExport(v => !v)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 text-zinc-300 font-medium rounded-xl transition-all text-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExport ? 'rotate-180' : ''}`} />
                    </button>
                    {showExport && (
                        <div className="absolute top-full mt-1 left-0 bg-[#0A1510] border border-white/8 rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px]">
                            <button onClick={() => { exportToCSV(filtered); setShowExport(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                                Export CSV
                            </button>
                            <button onClick={() => { exportToJSON(filtered); setShowExport(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
                                Export JSON
                            </button>
                        </div>
                    )}
                </div>

                {/* Approve all ready */}
                {counts.ready > 0 && (
                    <button
                        onClick={handleApproveAllReady}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-emerald-500/25 text-emerald-400 font-medium rounded-xl transition-all text-sm"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Approve All ({counts.ready})
                    </button>
                )}

                {/* Delete selected */}
                {selected.size > 0 && (
                    <button
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 font-medium rounded-xl transition-all text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete selected ({selected.size})
                    </button>
                )}

                {/* Send to Extension */}
                <button
                    onClick={handleSendToExtension}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded-xl transition-all text-sm"
                >
                    <Send className="w-4 h-4" />
                    Send Approved to Extension
                </button>

                {/* DM drip delay — random wait (minutes) between each DM */}
                <div className="flex items-center gap-2 ml-auto px-3 py-1.5 bg-white/3 rounded-xl border border-white/5">
                    <Timer className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Delay</span>
                    <input
                        type="number"
                        min={1}
                        value={minDelay}
                        onChange={e => commitDelay(Number(e.target.value), maxDelay)}
                        title="Minimum minutes between DMs"
                        className="w-12 bg-[#030604] border border-white/8 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                    <span className="text-xs text-zinc-600">–</span>
                    <input
                        type="number"
                        min={1}
                        value={maxDelay}
                        onChange={e => commitDelay(minDelay, Number(e.target.value))}
                        title="Maximum minutes between DMs"
                        className="w-12 bg-[#030604] border border-white/8 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                    <span className="text-[10px] text-zinc-600">min</span>
                </div>
            </div>

            {/* ── Status filter tabs ───────────────────────────────────────── */}
            <div className="flex gap-1 bg-white/3 border border-white/5 rounded-xl p-1 w-fit">
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.id}
                        onClick={() => setStatusFilter(f.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusFilter === f.id
                                ? 'bg-white/10 text-white'
                                : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                    >
                        {f.label}
                        {counts[f.id] > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                statusFilter === f.id ? 'bg-white/15 text-zinc-300' : 'bg-white/5 text-zinc-700'
                            }`}>
                                {counts[f.id]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Search + filter bar ──────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or handle…"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white/3 border border-white/8 rounded-xl text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/30 transition-all"
                    />
                </div>

                {/* Campaign filter */}
                {campaigns.length > 1 && (
                    <select
                        value={campaignFilter}
                        onChange={e => setCampaignFilter(e.target.value)}
                        className="px-3 py-2 text-xs bg-white/3 border border-white/8 rounded-xl text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all max-w-[200px]"
                    >
                        <option value="all">All campaigns</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}

                {/* Settings filter toggle */}
                <button
                    onClick={() => setApplySettingsFilter(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-all ${
                        applySettingsFilter
                            ? 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400'
                            : 'border-white/8 bg-white/3 text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Apply the keyword / follower / account-type filters configured in Settings"
                >
                    <Filter className="w-3.5 h-3.5" />
                    {applySettingsFilter ? 'Settings filter ON' : 'Apply settings filter'}
                </button>

                {/* Clear */}
                {(search || campaignFilter !== 'all' || applySettingsFilter) && (
                    <button
                        onClick={() => { setSearch(''); setCampaignFilter('all'); setApplySettingsFilter(false); }}
                        className="px-3 py-2 text-xs text-zinc-700 hover:text-zinc-400 transition-colors"
                    >
                        Clear
                    </button>
                )}

                <span className="ml-auto text-[10px] text-zinc-700 font-mono">{filtered.length} / {leads.length} leads</span>
            </div>

            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="bg-[#050A08] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/5">
                            <tr>
                                <th className="pl-5 pr-2 py-3.5 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allFilteredSelected}
                                        onChange={toggleSelectAll}
                                        title="Select all"
                                        className="w-4 h-4 rounded border-white/20 bg-transparent accent-emerald-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-5 py-3.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Prospect</th>
                                <th className="px-5 py-3.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest w-[22%]">Profile</th>
                                <th className="px-5 py-3.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest w-[32%]">AI Generated DM</th>
                                <th className="px-5 py-3.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Status</th>
                                <th className="px-5 py-3.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {visible.map(lead => (
                                <QueueRow
                                    key={lead.id}
                                    lead={lead}
                                    isSelected={selected.has(lead.id)}
                                    isEditing={editingId === lead.id}
                                    editDraft={editingId === lead.id ? editDraft : null}
                                    showBattlecards={battlecardsFor === lead.id}
                                    isGenerating={isGenerating}
                                    calendarLink={config.calendarLink}
                                    canDelete={Boolean(onDeleteLead)}
                                    onToggleSelect={toggleSelect}
                                    onStartEdit={startEdit}
                                    onSaveEdit={saveEdit}
                                    onCancelEdit={cancelEdit}
                                    onEditDraftChange={handleEditDraftChange}
                                    onApprove={approveLead}
                                    onReject={rejectLead}
                                    onUpdateLead={updateLead}
                                    onToggleBattlecards={toggleBattlecards}
                                    onGenerateDM={generateForLead}
                                    onDelete={handleDelete}
                                />
                            ))}

                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3 text-zinc-600">
                                            <Users className="w-8 h-8 opacity-30" />
                                            <p className="text-sm">
                                                {leads.length === 0
                                                    ? 'No leads yet. Go to Campaign Builder to search for prospects.'
                                                    : 'No leads match this filter.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ──────────────────────────────────────────── */}
                {pageCount > 1 && (
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-white/5">
                        <span className="text-[10px] text-zinc-700 font-mono">
                            {rangeStart}–{rangeEnd} of {filtered.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                            >
                                ‹ Prev
                            </button>
                            {pageNumbers.map((p, i) =>
                                p === null ? (
                                    <span key={`gap-${i}`} className="px-1 text-xs text-zinc-700">…</span>
                                ) : (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        aria-current={p === page ? 'page' : undefined}
                                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                                            p === page
                                                ? 'bg-emerald-500/15 text-emerald-400'
                                                : 'text-zinc-600 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ),
                            )}
                            <button
                                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                                disabled={page >= pageCount}
                                className="px-2.5 py-1 rounded-lg text-xs text-zinc-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                            >
                                Next ›
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
