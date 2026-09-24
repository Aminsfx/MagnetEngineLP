import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Lead, AppConfig } from '../../lib/types';
import {
    Sparkles, Send, Trash2, Download, ChevronDown, Users,
    CheckCircle, Search, Filter, Timer, AlertTriangle,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import { filterUtils } from '../../lib/filters';
import { storage, QUEUE_PAGE_SIZES, type QueuePageSize } from '../../lib/storage';
import { sendCampaign } from '../../lib/extensionProtocol';
import { useStable } from '../../lib/useStable';
import { useProgressiveCount } from '../../lib/useProgressiveCount';
import { QueueRow } from './QueueRow';
import { isReadyForReview } from '../../lib/today';

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
    onApproveLeads?: (ids: string[]) => void | Promise<void>;
    /** Undo for a bulk approve: the same Leads, back to Ready. */
    onUnapproveLeads?: (ids: string[]) => void | Promise<void>;
    /** Stamps the Leads a DELIVERED Handoff carried. Never called on a refusal. */
    onMarkHandedOff?: (ids: string[]) => void | Promise<void>;
    onRejectLead?: (id: string) => void;
    onUpdateDM?: (id: string, content: string) => void;
    onUpdateLead?: (lead: Lead) => void;
}

type StatusFilter = 'ready' | 'approved' | 'sent' | 'pending' | 'rejected' | 'all';

/**
 * Which tab a Lead belongs to. One definition, so the tab counts and the
 * filtered rows can never disagree. Sent wins over Approved: an approved Lead
 * that has gone out is done, not waiting to send.
 */
const IN_TAB: Record<StatusFilter, (l: Lead) => boolean> = {
    ready: isReadyForReview,
    approved: l => !!l.approved && !l.dmSent,
    sent: l => l.dmSent,
    pending: l => !l.dmContent,
    rejected: l => !!l.rejected,
    all: () => true,
};

/**
 * The floor of the gap between two DMs, in minutes. The extension's own
 * pacing, the landing page and the FAQ all promise 3–8 minutes; this field
 * used to accept 1, which is the one number here that raises the Operator's
 * account risk.
 */
const MIN_DELAY_MIN = 3;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Shared by every header cell. An inset shadow stands in for `border-b`:
 * Tailwind preflight collapses table borders, and a collapsed border is painted
 * by the table rather than the cell, so it stays put while a sticky <th> moves.
 */
const STICKY_TH = 'sticky top-0 z-10 bg-surface-raised shadow-[inset_0_-1px_0_rgba(255,255,255,0.05)]';

/** Rows added per frame while a page mounts — see `useProgressiveCount`. */
const ROW_CHUNK = 12;

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

/**
 * Everything both pager bars render, derived once per render of the queue.
 *
 * One object rather than seven loose props is what makes "the bars can never
 * disagree" structural instead of a promise: there is a single value to hand to
 * both, so no call site can pass a stale `pageCount` next to a fresh `page`.
 */
interface PageView {
    page: number;
    pageCount: number;
    pageNumbers: (number | null)[];
    rangeStart: number;
    rangeEnd: number;
    total: number;
}

interface QueuePagerProps {
    view: PageView;
    onPage: (page: number) => void;
    /** Distinguishes the two nav landmarks — screen readers list both. */
    label: string;
    /** The rows-per-page select. Top bar only, so the queue offers exactly one. */
    rowsPerPageControl?: React.ReactNode;
}

/**
 * One pagination bar, rendered both above and below the table so the paging
 * model is visible without scrolling to find it.
 *
 * The summary line is deliberately NOT gated on `pageCount > 1`. The controls
 * used to exist only at the bottom of the card and only when there was more
 * than one page, so an Operator scrolled a long page, hit the end and
 * reasonably concluded they had seen every Lead — the queue read as an
 * un-paged list. "Page 1 of 1 · showing 1–18 of 18 leads" costs one line and
 * removes that reading entirely.
 */
const QueuePager: React.FC<QueuePagerProps> = ({
    view: { page, pageCount, pageNumbers, rangeStart, rangeEnd, total },
    onPage, label, rowsPerPageControl,
}) => (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
        <span className="text-label text-neutral-400 tabular-nums">
            Page {page} of {pageCount} · showing {rangeStart}–{rangeEnd} of {total} leads
        </span>

        <div className="flex items-center gap-3">
            {pageCount > 1 && (
                <nav aria-label={label} className="flex items-center gap-1">
                    <button
                        onClick={() => onPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="px-2.5 py-1 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                    >
                        ‹ Prev
                    </button>
                    {pageNumbers.map((p, i) =>
                        p === null ? (
                            <span key={`gap-${i}`} className="px-1 text-xs text-neutral-400">…</span>
                        ) : (
                            <button
                                key={p}
                                onClick={() => onPage(p)}
                                aria-current={p === page ? 'page' : undefined}
                                className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                                    p === page
                                        ? 'bg-white/15 text-white'
                                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {p}
                            </button>
                        ),
                    )}
                    <button
                        onClick={() => onPage(Math.min(pageCount, page + 1))}
                        disabled={page >= pageCount}
                        className="px-2.5 py-1 rounded-lg text-xs text-neutral-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400"
                    >
                        Next ›
                    </button>
                </nav>
            )}
            {rowsPerPageControl}
        </div>
    </div>
);

function exportToCSV(leads: Lead[]) {
    const headers = ['Handle', 'Name', 'Followers', 'Bio', 'DM', 'Status', 'Approved', 'Rejected'];
    const rows = leads.map(l => [
        `@${l.handle}`,
        l.name,
        l.followers,
        (l.bio ?? '').replace(/\n/g, ' '),
        (l.dmContent ?? '').replace(/\n/g, ' '),
        l.dmSent ? 'Sent' : l.handedOffAt ? 'Handed off' : l.dmContent ? 'Ready' : 'Pending',
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

/** In the order of the work: read, then send, then what's done or parked. */
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'ready', label: 'Ready' },
    { id: 'approved', label: 'Approved' },
    { id: 'sent', label: 'Sent' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'all', label: 'All' },
];

/** The one pending confirmation the action bar can show, if any. */
type Confirming = null | 'approve-all' | 'send';

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
    leads,
    config,
    onGenerateDMs,
    isGenerating,
    onDeleteLead,
    onDeleteLeads,
    onApproveLead,
    onApproveLeads,
    onUnapproveLeads,
    onMarkHandedOff,
    onRejectLead,
    onUpdateDM,
    onUpdateLead,
}) => {
    const toast = useToast();
    // Lazy initialisers: this is a localStorage read + JSON.parse, and it used
    // to run on every render of the queue.
    // Clamped on the way in too: a value saved before the floor existed must
    // not survive as the live setting.
    const [minDelay, setMinDelay] = useState<number>(() => Math.max(MIN_DELAY_MIN, storage.getDmDelay().min));
    const [maxDelay, setMaxDelay] = useState<number>(() =>
        Math.max(MIN_DELAY_MIN, storage.getDmDelay().min, storage.getDmDelay().max));
    // `null` until the Leads arrive: the queue opens on Ready — the one tab with
    // work in it — and falls back to All only when nothing is waiting. Leads
    // hydrate after mount, so the choice is made when they land, not at mount.
    const [statusFilter, setStatusFilter] = useState<StatusFilter | null>(null);
    const [confirming, setConfirming] = useState<Confirming>(null);
    const exportRef = useRef<HTMLDivElement>(null);
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

    const counts = useMemo(() => {
        const out = {} as Record<StatusFilter, number>;
        for (const { id } of STATUS_FILTERS) out[id] = leads.filter(IN_TAB[id]).length;
        return out;
    }, [leads]);

    // Adjusted during render (React's sanctioned pattern), like the page clamp below.
    if (statusFilter === null && leads.length > 0) {
        setStatusFilter(counts.ready > 0 ? 'ready' : 'all');
    }
    const activeFilter: StatusFilter = statusFilter ?? 'all';

    const filtered = useMemo(() => {
        const base = applySettingsFilter ? filterUtils.filterLeads(leads, config) : leads;
        const q = search.trim().toLowerCase();
        const inTab = IN_TAB[activeFilter];
        return base.filter(l => {
            if (!inTab(l)) return false;
            if (q && !l.handle.toLowerCase().includes(q) && !(l.name ?? '').toLowerCase().includes(q)) return false;
            if (campaignFilter !== 'all' && l.campaignId !== campaignFilter) return false;
            return true;
        });
    }, [leads, activeFilter, search, campaignFilter, applySettingsFilter, config]);

    // ── Pagination ────────────────────────────────────────────────────────────
    // Only a page of rows is mounted: 250 leads used to put ~11k elements and
    // ~1.5k svg icons in the DOM at once. Bulk actions below deliberately still
    // operate on the whole `filtered` set, not just the visible page.
    const [page, setPage] = useState(1);
    // Lazy initialiser — a localStorage read, not something to redo per render.
    const [pageSize, setPageSize] = useState<QueuePageSize>(() => storage.getQueuePageSize());

    // Changing what's being filtered should start over at page 1 — adjusted
    // during render (React's sanctioned pattern) rather than in an effect.
    const filterKey = `${activeFilter}|${search}|${campaignFilter}|${applySettingsFilter}`;
    const [lastFilterKey, setLastFilterKey] = useState(filterKey);
    if (filterKey !== lastFilterKey) {
        setLastFilterKey(filterKey);
        setPage(1);
    }

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    // Clamp during render rather than in an effect, so filtering down to fewer
    // pages never shows an empty table for a frame.
    const safePage = Math.min(page, pageCount);
    if (safePage !== page) setPage(safePage);

    const visible = useMemo(
        () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
        [filtered, safePage, pageSize],
    );
    // A page is mounted a chunk at a time so the first commit stays small — the
    // toolbar and the first rows paint immediately instead of the browser
    // freezing until the whole page exists. Bulk actions below still act on the
    // whole `filtered` set, and pagination still reports the full page range:
    // this bounds what React commits per frame, not what the page contains.
    // The key carries `pageSize` too — resizing the page changes how many rows
    // there are to mount, so it has to re-chunk rather than sit on a stale count.
    const mounted = useProgressiveCount(visible.length, `${filterKey}|${safePage}|${pageSize}`, ROW_CHUNK);

    const pageNumbers = useMemo(() => pageWindow(safePage, pageCount), [safePage, pageCount]);
    const pageView: PageView = {
        page: safePage,
        pageCount,
        pageNumbers,
        // 0 when a filter matches nothing — the queue still shows a bar there,
        // because "0 of 250" is exactly when the Operator needs the totals.
        rangeStart: filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1,
        rangeEnd: Math.min(safePage * pageSize, filtered.length),
        total: filtered.length,
    };

    const changePageSize = (next: QueuePageSize) => {
        // Land on the page still holding the row you were looking at instead of
        // snapping to the top: at 250 leads, going 25 → 100 from page 7 would
        // otherwise drop you 150 leads back with no explanation. The render-time
        // clamp above handles the case where the computed page no longer exists.
        const firstVisibleIndex = (safePage - 1) * pageSize;
        setPageSize(next);
        setPage(Math.floor(firstVisibleIndex / next) + 1);
        storage.setQueuePageSize(next);
    };

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
        const safeMin = Math.max(MIN_DELAY_MIN, Math.floor(min) || MIN_DELAY_MIN);
        const safeMax = Math.max(safeMin, Math.floor(max) || safeMin);
        setMinDelay(safeMin);
        setMaxDelay(safeMax);
        storage.setDmDelay({ min: safeMin, max: safeMax });
    };

    // `!l.dmSent` is load-bearing: the extension REPLACES its queue with
    // whatever arrives, so without this a second press re-DMs every lead
    // already contacted. Instagram reads repeat DMs to the same handle as
    // spam, so this is an account-restriction risk, not just bad data.
    const sendable = leads.filter(l => l.approved && l.dmContent && !l.dmSent);
    const dailyCap = config.dailySendCap ?? 40;

    /** Opens the confirmation, or says plainly why there is nothing to send. */
    const requestSend = () => {
        if (sendable.length === 0) {
            const allSent = leads.some(l => l.approved && l.dmContent && l.dmSent);
            toast.error(allSent
                ? 'Every approved DM has already been sent. Approve more leads to send again.'
                : 'No approved DMs to send. Approve some leads first.');
            return;
        }
        setConfirming('send');
    };

    const confirmSend = () => {
        setConfirming(null);
        const handoff = sendCampaign({
            leads: sendable.map(l => ({ handle: l.handle, message: l.dmContent! })),
            minDelay,
            maxDelay,
            dailyCap,
        });
        // A refused Handoff stamps nothing and claims nothing (CLAUDE.md, Seams).
        if (!handoff.delivered) {
            toast.error(handoff.reason!);
            return;
        }
        void onMarkHandedOff?.(sendable.map(l => l.id));
        // Handed off, not Sent: nothing has reached Instagram yet (CONTEXT.md).
        toast.success(
            `${plural(sendable.length, 'DM')} handed to the extension. One goes out every ${minDelay}–${maxDelay} min while an Instagram tab is open, and each shows Sent once the extension confirms it.`,
        );
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

    /**
     * Approves every Ready draft at once — which means approving drafts the
     * Operator may not have read, the one thing human approval exists to
     * prevent. So it asks first, says so in those words, and offers an undo.
     */
    const confirmApproveAll = async () => {
        setConfirming(null);
        const readyIds = leads.filter(IN_TAB.ready).map(l => l.id);
        if (readyIds.length === 0) {
            toast.info('No DMs waiting for approval.');
            return;
        }
        await onApproveLeads?.(readyIds);
        toast.success(`${plural(readyIds.length, 'DM')} approved.`, onUnapproveLeads && {
            action: { label: 'Undo', onClick: () => { void onUnapproveLeads(readyIds); } },
        });
    };

    // The Export menu closes on Escape and on a press anywhere outside it.
    useEffect(() => {
        if (!showExport) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowExport(false); };
        const onDown = (e: PointerEvent) => {
            if (!exportRef.current?.contains(e.target as Node)) setShowExport(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown);
        };
    }, [showExport]);

    // Escape backs out of a pending confirmation.
    useEffect(() => {
        if (!confirming) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirming(null); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [confirming]);

    const handleDelete = useStable((lead: Lead) => {
        if (window.confirm(`Delete @${lead.handle} from the queue? This cannot be undone.`)) {
            onDeleteLead?.(lead.id);
        }
    });

    return (
        <div className="space-y-5">
            {/* ── Action bar ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Generate DMs — black, and deliberately the darkest control in the
                    bar. Drafting is cheap, repeatable and reversible, so it must not
                    carry the weight of the send beside it. The border is
                    load-bearing, since black on a near-black ground has no edge of
                    its own. */}
                <button
                    type="button"
                    onClick={handleGenerateForPending}
                    disabled={isGenerating || leads.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-900 border border-white/15 hover:border-white/25 text-white disabled:opacity-50 font-semibold rounded-xl transition-colors text-sm"
                >
                    <Sparkles className="w-4 h-4 text-white" aria-hidden />
                    {isGenerating ? 'Generating…' : 'Generate AI DMs'}
                </button>

                {/* Export dropdown */}
                <div className="relative" ref={exportRef}>
                    <button
                        type="button"
                        onClick={() => setShowExport(v => !v)}
                        aria-expanded={showExport}
                        aria-haspopup="menu"
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/8 text-neutral-300 font-medium rounded-xl transition-colors text-sm"
                    >
                        <Download className="w-4 h-4" aria-hidden />
                        Export
                        <ChevronDown aria-hidden className={`w-3.5 h-3.5 transition-transform ${showExport ? 'rotate-180' : ''}`} />
                    </button>
                    {showExport && (
                        <div role="menu" className="absolute top-full mt-1 left-0 bg-surface-overlay border border-white/8 rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px]">
                            <button type="button" role="menuitem" onClick={() => { exportToCSV(filtered); setShowExport(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 transition-colors">
                                Export CSV
                            </button>
                            <button type="button" role="menuitem" onClick={() => { exportToJSON(filtered); setShowExport(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-white/5 transition-colors">
                                Export JSON
                            </button>
                        </div>
                    )}
                </div>

                {/* Approve all ready — asks first; see confirmApproveAll. */}
                {counts.ready > 0 && (
                    <button
                        type="button"
                        onClick={() => setConfirming('approve-all')}
                        aria-expanded={confirming === 'approve-all'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/25 text-white font-medium rounded-xl transition-colors text-sm"
                    >
                        <CheckCircle className="w-4 h-4" aria-hidden />
                        Approve all ({counts.ready})
                    </button>
                )}

                {/* Delete selected */}
                {selected.size > 0 && (
                    <button
                        type="button"
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-2 px-5 py-2.5 bg-danger-500/10 hover:bg-danger-500/20 border border-danger-500/25 text-danger-400 font-medium rounded-xl transition-colors text-sm"
                    >
                        <Trash2 className="w-4 h-4" aria-hidden />
                        Delete selected ({selected.size})
                    </button>
                )}

                {/* Send — the only solid fill in this bar, and the only button here
                    that does something irreversible: it DMs real people from the
                    Operator's own Instagram account. It names how many, and it
                    confirms before handing anything over. White, not a glow: the
                    dashboard carries no brand orange (docs/DESIGN-TOKENS.md). */}
                <button
                    type="button"
                    onClick={requestSend}
                    aria-expanded={confirming === 'send'}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-surface font-semibold rounded-xl ring-1 ring-white/30 ring-offset-2 ring-offset-surface transition-colors text-sm"
                >
                    <Send className="w-4 h-4" aria-hidden />
                    {sendable.length > 0
                        ? `Send ${plural(sendable.length, 'approved DM')}`
                        : 'Send approved DMs'}
                </button>

                {/* Gap between DMs — a random wait inside this range, in minutes. */}
                <fieldset className="flex items-center gap-2 ml-auto px-3 py-1.5 bg-white/3 rounded-xl border border-white/8">
                    <legend className="sr-only">Minutes between DMs</legend>
                    <Timer className="w-3.5 h-3.5 text-white" aria-hidden />
                    <span className="text-label text-neutral-400 uppercase tracking-wider font-medium" aria-hidden>Gap</span>
                    <input
                        type="number"
                        min={MIN_DELAY_MIN}
                        value={minDelay}
                        onChange={e => commitDelay(Number(e.target.value), maxDelay)}
                        aria-label="Shortest gap between DMs, in minutes"
                        className="w-12 bg-surface border border-white/8 rounded-lg px-2 py-1 text-xs text-white text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-white/50"
                    />
                    <span className="text-xs text-neutral-400" aria-hidden>–</span>
                    <input
                        type="number"
                        min={minDelay}
                        value={maxDelay}
                        onChange={e => commitDelay(minDelay, Number(e.target.value))}
                        aria-label="Longest gap between DMs, in minutes"
                        className="w-12 bg-surface border border-white/8 rounded-lg px-2 py-1 text-xs text-white text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-white/50"
                    />
                    <span className="text-label text-neutral-400" aria-hidden>min</span>
                </fieldset>
            </div>

            {/* ── Confirmations ───────────────────────────────────────────────
                Inline, under the bar that asked, rather than a modal: the queue
                stays readable behind the question, which is the point when the
                question is "have you read these?". */}
            {confirming === 'approve-all' && (
                <div role="alertdialog" aria-labelledby="confirm-approve-title" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 rounded-2xl border border-white/15 bg-white/[0.04]">
                    <AlertTriangle className="w-4 h-4 text-white flex-none" aria-hidden />
                    <div className="flex-1 min-w-[16rem]">
                        <p id="confirm-approve-title" className="text-sm font-semibold text-white">
                            Approve {plural(counts.ready, 'draft')} without reading {counts.ready === 1 ? 'it' : 'them'}?
                        </p>
                        <p className="text-meta text-neutral-400 mt-0.5">
                            Approved DMs go out from your Instagram the next time you press Send. You can undo this for a few seconds afterwards.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setConfirming(null)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors">
                            Keep reviewing
                        </button>
                        <button type="button" onClick={confirmApproveAll} autoFocus
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-surface hover:bg-neutral-200 transition-colors">
                            Approve {plural(counts.ready, 'draft')}
                        </button>
                    </div>
                </div>
            )}

            {confirming === 'send' && (
                <div role="alertdialog" aria-labelledby="confirm-send-title" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 rounded-2xl border border-white/15 bg-white/[0.04]">
                    <Send className="w-4 h-4 text-white flex-none" aria-hidden />
                    <div className="flex-1 min-w-[16rem]">
                        <p id="confirm-send-title" className="text-sm font-semibold text-white">
                            Send {plural(sendable.length, 'DM')} from your Instagram account?
                        </p>
                        <p className="text-meta text-neutral-400 mt-0.5">
                            The extension sends one every {minDelay}–{maxDelay} min while an Instagram tab is open,
                            and stops at your Send Cap of {dailyCap} a day
                            {sendable.length > dailyCap ? ` — so this takes about ${Math.ceil(sendable.length / dailyCap)} days` : ''}.
                            A sent DM can't be taken back.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setConfirming(null)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors">
                            Cancel
                        </button>
                        <button type="button" onClick={confirmSend} autoFocus
                            className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-surface hover:bg-neutral-200 transition-colors">
                            Send {plural(sendable.length, 'DM')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Status filter tabs ───────────────────────────────────────── */}
            <div className="flex flex-wrap gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit" role="group" aria-label="Show leads by status">
                {STATUS_FILTERS.map(f => (
                    <button
                        type="button"
                        key={f.id}
                        onClick={() => setStatusFilter(f.id)}
                        aria-pressed={activeFilter === f.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            activeFilter === f.id
                                ? 'bg-white/10 text-white'
                                : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                        {f.label}
                        {counts[f.id] > 0 && (
                            <span className={`text-label tabular-nums px-1.5 py-0.5 rounded-full ${
                                activeFilter === f.id ? 'bg-white/15 text-neutral-200' : 'bg-white/5 text-neutral-400'
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" aria-hidden />
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or handle…"
                        aria-label="Search leads by name or handle"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white/3 border border-white/8 rounded-xl text-neutral-300 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/40 focus:border-white/30 transition-colors"
                    />
                </div>

                {/* Campaign filter */}
                {campaigns.length > 1 && (
                    <select
                        value={campaignFilter}
                        onChange={e => setCampaignFilter(e.target.value)}
                        aria-label="Campaign"
                        className="px-3 py-2 text-xs bg-white/3 border border-white/8 rounded-xl text-neutral-300 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors max-w-[200px]"
                    >
                        <option value="all">All campaigns</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                )}

                {/* Lead-quality rules from Settings, applied on demand */}
                <button
                    type="button"
                    onClick={() => setApplySettingsFilter(v => !v)}
                    aria-pressed={applySettingsFilter}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-colors ${
                        applySettingsFilter
                            ? 'border-white/30 bg-white/8 text-white'
                            : 'border-white/8 bg-white/3 text-neutral-400 hover:text-white'
                    }`}
                    title="Hide leads that fail the follower, keyword and account-type rules you set in Settings"
                >
                    <Filter className="w-3.5 h-3.5" aria-hidden />
                    Only leads that match my Settings rules
                </button>

                {/* Clear */}
                {(search || campaignFilter !== 'all' || applySettingsFilter) && (
                    <button
                        type="button"
                        onClick={() => { setSearch(''); setCampaignFilter('all'); setApplySettingsFilter(false); }}
                        className="px-3 py-2 text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                        Clear filters
                    </button>
                )}

                <span className="ml-auto text-label text-neutral-400 tabular-nums">{filtered.length} of {leads.length} leads</span>
            </div>
            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="bg-surface-raised border border-white/5 rounded-2xl overflow-hidden">
                {leads.length > 0 && (
                    <div className="border-b border-white/5">
                        <QueuePager
                            view={pageView}
                            onPage={setPage}
                            label="Approval queue pages"
                            rowsPerPageControl={
                                <div className="flex items-center gap-1.5">
                                    <span className="text-label text-neutral-400">Rows</span>
                                    <select
                                        aria-label="Rows per page"
                                        value={pageSize}
                                        onChange={e => changePageSize(Number(e.target.value) as QueuePageSize)}
                                        className="bg-white/3 border border-white/8 rounded-lg px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-white/40 transition-colors"
                                    >
                                        {QUEUE_PAGE_SIZES.map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </div>
                            }
                        />
                    </div>
                )}

                {/*
                  A bounded scrollport, not the page. `overflow-x-auto` already
                  made this element a scroll container on both axes, so a sticky
                  <thead> could only ever stick to *it* — capping the height is
                  what turns that into a header that survives the scroll, and it
                  keeps both pager bars on screen while the Operator reads down a
                  page.

                  A fraction of the viewport, not `calc(100vh - <toolbar>)`: the
                  toolbar above wraps to two or three rows on narrow widths, so
                  any fixed subtraction is wrong exactly where it matters and
                  shrinks the table to a three-row porthole on a short screen.
                */}
                <div className="overflow-auto max-h-[75vh]">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr>
                                <th className={`${STICKY_TH} pl-5 pr-2 py-3.5 w-10`}>
                                    <input
                                        type="checkbox"
                                        checked={allFilteredSelected}
                                        onChange={toggleSelectAll}
                                        title="Select all"
                                        aria-label={`Select all ${filtered.length} leads in this view`}
                                        className="w-4 h-4 rounded border-white/20 bg-transparent accent-white cursor-pointer"
                                    />
                                </th>
                                <th className={`${STICKY_TH} px-5 py-3.5 text-label font-semibold text-neutral-400 uppercase tracking-widest`}>Lead</th>
                                <th className={`${STICKY_TH} px-5 py-3.5 text-label font-semibold text-neutral-400 uppercase tracking-widest min-w-[12rem] w-[20%]`}>Bio</th>
                                <th className={`${STICKY_TH} px-5 py-3.5 text-label font-semibold text-neutral-400 uppercase tracking-widest min-w-[24rem] w-[40%]`}>DM</th>
                                <th className={`${STICKY_TH} px-5 py-3.5 text-label font-semibold text-neutral-400 uppercase tracking-widest`}>Status</th>
                                <th className={`${STICKY_TH} px-5 py-3.5 text-label font-semibold text-neutral-400 uppercase tracking-widest`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {visible.slice(0, mounted).map(lead => (
                                <QueueRow
                                    key={lead.id}
                                    lead={lead}
                                    isSelected={selected.has(lead.id)}
                                    isEditing={editingId === lead.id}
                                    editDraft={editingId === lead.id ? editDraft : null}
                                    showBattlecards={battlecardsFor === lead.id}
                                    isGenerating={isGenerating}
                                    ledger={config}
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
                                        <div className="flex flex-col items-center gap-3 text-neutral-400">
                                            <Users className="w-8 h-8 opacity-30" />
                                            <p className="text-sm">
                                                {leads.length === 0
                                                    ? 'No leads yet. Search for some in the Campaign Builder.'
                                                    : 'No leads match this filter.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mirrors the bar above the table — same component, so the two
                    can never drift apart. */}
                {leads.length > 0 && (
                    <div className="border-t border-white/5">
                        <QueuePager
                            view={pageView}
                            onPage={setPage}
                            label="Approval queue pages (bottom)"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
