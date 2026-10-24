import React, { useState, useMemo, useEffect, useRef } from 'react';
import { sendCapOf } from '../../lib/plans';
import type { Lead, AppConfig } from '../../lib/types';
import {
    Sparkles, Send, Trash2, Search, Check, X, MoreHorizontal, Download, Filter,
    Loader2, AlertTriangle, CornerUpLeft, RotateCcw, Users,
} from 'lucide-react';
import { useToast } from '../common/Toast';
import { NumberField } from '../common/NumberField';
import { filterUtils } from '../../lib/filters';
import { storage, QUEUE_PAGE_SIZES, type QueuePageSize } from '../../lib/storage';
import { sendCampaign } from '../../lib/extensionProtocol';
import { useStable } from '../../lib/useStable';
import { useProgressiveCount } from '../../lib/useProgressiveCount';
import {
    STAGES, campaignIdOf, campaignsOf, campaignDate, campaignLabel, countViews, nextStage, viewOf,
    type QueueStage, type QueueView,
} from '../../lib/queue';
import type { GenerationProgress } from '../../lib/useOutreach';
import { CARD_BEZEL } from '../../lib/theme';
import { QueueRow, COLUMNS } from './QueueRow';
import { posthogCapture } from '../../lib/posthog';

interface ApprovalQueueProps {
    leads: Lead[];
    config: AppConfig;
    /** With `all`, writes campaign after campaign until every Lead given has a DM. */
    onGenerateDMs: (leads?: Lead[], options?: { all?: boolean }) => void | Promise<void>;
    isGenerating: boolean;
    /** How far a running generation has got. */
    generation?: GenerationProgress | null;
    onStopGenerating?: () => void;
    onDeleteLead?: (id: string) => void;
    /** Bulk delete — one state update + one batched DB write */
    onDeleteLeads?: (ids: string[]) => void;
    onApproveLead?: (id: string) => void;
    /** Bulk approve — one state update + one batched DB write */
    onApproveLeads?: (ids: string[]) => void | Promise<void>;
    /** Back to review. Never touches a Lead already Sent. */
    onUnapproveLeads?: (ids: string[]) => void | Promise<void>;
    /** Stamps the Leads a DELIVERED Handoff carried. Never called on a refusal. */
    onMarkHandedOff?: (ids: string[]) => void | Promise<void>;
    onRejectLead?: (id: string) => void;
    onRejectLeads?: (ids: string[]) => void | Promise<void>;
    onRestoreLeads?: (ids: string[]) => void | Promise<void>;
    onUpdateDM?: (id: string, content: string) => void;
    onUpdateLead?: (lead: Lead) => void;
}

/** The campaign filter's "every campaign" value. A campaign id is a UUID, so no clash. */
const ALL = 'all';

const STAGE_LABEL: Record<QueueView, string> = {
    write: 'To write',
    review: 'To review',
    send: 'To send',
    sent: 'Sent',
    skipped: 'Skipped',
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
 * Shared by every header cell. No rule of its own: each row draws its top
 * hairline, and the first one closes the header. Per-cell inset shadows left a
 * seam at every column edge.
 */
const TH = '';

/** Rows added per frame while a page mounts — see `useProgressiveCount`. */
const ROW_CHUNK = 12;

/** The white pill: the one thing to do. */
const PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-surface text-meta font-semibold hover:bg-neutral-100 transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';
/** The hairline ghost pill: everything beside it. */
const GHOST = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/12 text-meta font-medium text-neutral-200 hover:text-white hover:border-white/30 hover:bg-white/[0.04] transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap';
const GHOST_DANGER = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/12 text-meta font-medium text-neutral-300 hover:text-danger-300 hover:border-danger-500/40 hover:bg-danger-500/10 transition-colors whitespace-nowrap';
/** The confirming half of a destructive pair: red, never white. */
const DANGER = 'inline-flex items-center gap-2 px-4 py-2 rounded-full border border-danger-500/40 bg-danger-500/15 text-danger-300 text-meta font-semibold hover:bg-danger-500/25 transition-colors whitespace-nowrap';

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

function download(name: string, type: string, body: string) {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

function exportToCSV(leads: Lead[], campaignNames: Map<string, string>) {
    const headers = ['Handle', 'Name', 'Followers', 'Bio', 'DM', 'Campaign', 'Stage', 'Handed off'];
    const rows = leads.map(l => [
        `@${l.handle}`,
        l.name,
        l.followers,
        (l.bio ?? '').replace(/\n/g, ' '),
        (l.dmContent ?? '').replace(/\n/g, ' '),
        campaignNames.get(campaignIdOf(l)) ?? '',
        STAGE_LABEL[viewOf(l)],
        l.handedOffAt ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    download('magnet_queue.csv', 'text/csv', csv);
}

/**
 * The one pending confirmation the band can show, if any. Delete carries the
 * Leads it would delete: the same inline strip as the other two, not a browser
 * dialog from outside the product.
 */
type Confirming = null | 'approve-all' | 'send' | { delete: Lead[] };

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
    leads,
    config,
    onGenerateDMs,
    isGenerating,
    generation = null,
    onStopGenerating,
    onDeleteLead,
    onDeleteLeads,
    onApproveLead,
    onApproveLeads,
    onUnapproveLeads,
    onMarkHandedOff,
    onRejectLead,
    onRejectLeads,
    onRestoreLeads,
    onUpdateDM,
    onUpdateLead,
}) => {
    const toast = useToast();
    // Clamped on the way in too: a value saved before the floor existed must
    // not survive as the live setting.
    const [minDelay, setMinDelay] = useState<number>(() => Math.max(MIN_DELAY_MIN, storage.getDmDelay().min));
    const [maxDelay, setMaxDelay] = useState<number>(() =>
        Math.max(MIN_DELAY_MIN, storage.getDmDelay().min, storage.getDmDelay().max));

    // `null` until the Leads arrive: the queue opens on the newest campaign that
    // has work in it, at its first stage with work. Leads hydrate after mount,
    // so the choice is made when they land, not at mount.
    const [view, setView] = useState<QueueView | null>(null);
    const [campaign, setCampaign] = useState<string>(ALL);
    const [search, setSearch] = useState('');
    const [rulesOnly, setRulesOnly] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    // Leads changed one at a time while this view was open. They keep their
    // place, muted, with an undo — see `changedTo` on QueueRow.
    const [changed, setChanged] = useState<Set<string>>(new Set());
    const [confirming, setConfirming] = useState<Confirming>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [battlecardsFor, setBattlecardsFor] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState('');

    // ── Campaigns ───────────────────────────────────────────────────────────────
    // The Settings rules narrow what the queue shows, so every count — tabs and
    // chips alike — is counted over the same narrowed set the rows come from.
    const ruled = useMemo(
        () => (rulesOnly ? filterUtils.filterLeads(leads, config) : leads),
        [leads, rulesOnly, config],
    );
    const campaigns = useMemo(() => campaignsOf(ruled), [ruled]);
    const campaignNames = useMemo(() => new Map(campaignsOf(leads).map(b => [b.id, campaignLabel(b)])), [leads]);

    if (view === null && leads.length > 0) {
        const first = campaigns.find(b => nextStage(b.counts) !== null);
        setCampaign(first ? first.id : ALL);
        setView(first ? nextStage(first.counts)! : 'review');
    }
    const activeView: QueueView = view ?? 'review';
    // A campaign whose last Lead was deleted, or that the rules now hide entirely.
    if (campaign !== ALL && view !== null && !campaigns.some(b => b.id === campaign)) setCampaign(ALL);

    const scoped = useMemo(
        () => (campaign === ALL ? ruled : ruled.filter(l => campaignIdOf(l) === campaign)),
        [ruled, campaign],
    );
    const counts = useMemo(() => countViews(scoped), [scoped]);
    const totalInView = useMemo(() => campaigns.reduce((n, b) => n + b.counts[activeView], 0), [campaigns, activeView]);
    const currentCampaign = campaign === ALL ? null : campaigns.find(b => b.id === campaign) ?? null;
    const where = currentCampaign ? `in ${campaignLabel(currentCampaign)}` : 'across every campaign';

    // ── View session ──────────────────────────────────────────────────────────
    // Changing stage, campaign or rules starts a fresh view: back to page 1, no
    // selection, and changed rows released. Adjusted during render (React's
    // sanctioned pattern) rather than in an effect, so no stale frame shows.
    const sessionKey = `${activeView}|${campaign}|${rulesOnly}`;
    const [lastSession, setLastSession] = useState(sessionKey);
    const [page, setPage] = useState(1);
    if (sessionKey !== lastSession) {
        setLastSession(sessionKey);
        setSelected(new Set());
        setChanged(new Set());
        setConfirming(null);
        setPage(1);
    }
    const [lastSearch, setLastSearch] = useState(search);
    if (search !== lastSearch) {
        setLastSearch(search);
        setPage(1);
    }

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return scoped.filter(l => {
            if (viewOf(l) !== activeView && !changed.has(l.id)) return false;
            if (q && !l.handle.toLowerCase().includes(q) && !(l.name ?? '').toLowerCase().includes(q)) return false;
            return true;
        });
    }, [scoped, activeView, changed, search]);

    // Rows that changed state stay listed but are no longer this view's work,
    // so they are never selected or carried by a bulk action.
    const selectable = useMemo(() => rows.filter(l => viewOf(l) === activeView), [rows, activeView]);
    const selectedRows = useMemo(() => selectable.filter(l => selected.has(l.id)), [selectable, selected]);
    const allSelected = selectable.length > 0 && selectedRows.length === selectable.length;

    // ── Pagination ────────────────────────────────────────────────────────────
    // Only a page of rows is mounted: 250 leads used to put ~11k elements and
    // ~1.5k svg icons in the DOM at once. Bulk actions deliberately still act on
    // every selected row, not just the visible page.
    const [pageSize, setPageSize] = useState<QueuePageSize>(() => storage.getQueuePageSize());
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    // Clamped during render, so filtering down to fewer pages never shows an
    // empty table for a frame.
    const safePage = Math.min(page, pageCount);
    if (safePage !== page) setPage(safePage);
    const visible = useMemo(
        () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
        [rows, safePage, pageSize],
    );
    // A page mounts a chunk at a time so the first commit stays small. The key
    // carries the page size too, since resizing changes how many rows to mount.
    const mounted = useProgressiveCount(visible.length, `${sessionKey}|${search}|${safePage}|${pageSize}`, ROW_CHUNK);
    const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const rangeEnd = Math.min(safePage * pageSize, rows.length);
    const pages = useMemo(() => pageWindow(safePage, pageCount), [safePage, pageCount]);

    const changePageSize = (next: QueuePageSize) => {
        // Land on the page still holding the row you were looking at.
        const firstVisibleIndex = (safePage - 1) * pageSize;
        setPageSize(next);
        setPage(Math.floor(firstVisibleIndex / next) + 1);
        storage.setQueuePageSize(next);
    };

    // ── Sending ───────────────────────────────────────────────────────────────
    // Every approved DM not yet Sent, whatever campaign is on screen. The
    // extension REPLACES its queue with each Handoff, so sending one campaign would
    // silently drop another campaign's approved DMs; and `!l.dmSent` is what stops
    // a second press re-DMing everyone already contacted — Instagram reads a
    // repeat DM to the same handle as spam.
    const sendable = useMemo(() => leads.filter(l => l.approved && l.dmContent && !l.dmSent), [leads]);
    const sendableCampaigns = useMemo(() => new Set(sendable.map(campaignIdOf)).size, [sendable]);
    const withExtension = sendable.filter(l => l.handedOffAt).length;
    const dailyCap = sendCapOf(config);

    const commitDelay = (min: number, max: number) => {
        const safeMin = Math.max(MIN_DELAY_MIN, Math.floor(min) || MIN_DELAY_MIN);
        const safeMax = Math.max(safeMin, Math.floor(max) || safeMin);
        setMinDelay(safeMin);
        setMaxDelay(safeMax);
        storage.setDmDelay({ min: safeMin, max: safeMax });
    };

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
        posthogCapture('campaign_handed_to_extension', {
            lead_count: sendable.length,
            min_delay: minDelay,
            max_delay: maxDelay,
            daily_cap: dailyCap,
        });
        // Handed off, not Sent: nothing has reached Instagram yet (CONTEXT.md).
        toast.success(
            `${plural(sendable.length, 'DM')} handed to the extension. One goes out every ${minDelay}–${maxDelay} min while an Instagram tab is open, and each shows Sent once the extension confirms it.`,
        );
    };

    // ── Bulk and band actions ─────────────────────────────────────────────────
    const ids = (list: Lead[]) => list.map(l => l.id);
    const clearSelection = () => setSelected(new Set());

    const writeAll = (list: Lead[]) => {
        if (list.length === 0) return;
        void onGenerateDMs(list, { all: true });
    };

    /**
     * Approves every draft in view at once — which means approving drafts the
     * Operator may not have read, the one thing human approval exists to
     * prevent. So it asks first, says so in those words, and offers an undo.
     */
    const confirmApproveAll = async () => {
        setConfirming(null);
        const ready = ids(scoped.filter(l => viewOf(l) === 'review'));
        if (ready.length === 0) {
            toast.info('No DMs waiting for approval.');
            return;
        }
        await onApproveLeads?.(ready);
        posthogCapture('dms_approved', { approved_count: ready.length });
        toast.success(`${plural(ready.length, 'DM')} approved. They're in To send.`, onUnapproveLeads && {
            action: { label: 'Undo', onClick: () => { void onUnapproveLeads(ready); } },
        });
    };

    const bulk = {
        approve: async () => {
            const list = ids(selectedRows);
            clearSelection();
            await onApproveLeads?.(list);
            posthogCapture('dms_approved', { approved_count: list.length });
            toast.success(`${plural(list.length, 'DM')} approved. They're in To send.`, onUnapproveLeads && {
                action: { label: 'Undo', onClick: () => { void onUnapproveLeads(list); } },
            });
        },
        skip: async () => {
            const list = ids(selectedRows);
            clearSelection();
            if (onRejectLeads) await onRejectLeads(list);
            else list.forEach(id => onRejectLead?.(id));
            toast.success(`${plural(list.length, 'lead')} skipped.`, onRestoreLeads && {
                action: { label: 'Undo', onClick: () => { void onRestoreLeads(list); } },
            });
        },
        unapprove: async () => {
            const list = ids(selectedRows);
            clearSelection();
            await onUnapproveLeads?.(list);
            toast.success(`${plural(list.length, 'DM')} moved back to To review.`, onApproveLeads && {
                action: { label: 'Undo', onClick: () => { void onApproveLeads(list); } },
            });
        },
        restore: async () => {
            const list = ids(selectedRows);
            clearSelection();
            await onRestoreLeads?.(list);
            toast.success(`${plural(list.length, 'lead')} restored.`, onRejectLeads && {
                action: { label: 'Undo', onClick: () => { void onRejectLeads(list); } },
            });
        },
        write: () => {
            const list = selectedRows;
            clearSelection();
            writeAll(list);
        },
        remove: () => {
            if (selectedRows.length > 0) setConfirming({ delete: selectedRows });
        },
    };

    const confirmDelete = (list: Lead[]) => {
        setConfirming(null);
        const doomed = ids(list);
        if (doomed.length === 0) return;
        if (onDeleteLeads) onDeleteLeads(doomed);
        else doomed.forEach(id => onDeleteLead?.(id));
        setSelected(prev => {
            const next = new Set(prev);
            doomed.forEach(id => next.delete(id));
            return next;
        });
    };

    // ── Row callbacks ─────────────────────────────────────────────────────────
    // Handed to a page of memoized rows — every one must keep a stable identity
    // or React.memo compares unequal and the whole table re-renders.
    const keepInPlace = (id: string) => setChanged(prev => (prev.has(id) ? prev : new Set(prev).add(id)));

    const toggleSelect = useStable((id: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    }));
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
    const approveRow = useStable((lead: Lead) => { keepInPlace(lead.id); onApproveLead?.(lead.id); });
    const skipRow = useStable((lead: Lead) => { keepInPlace(lead.id); onRejectLead?.(lead.id); });
    const unapproveRow = useStable((lead: Lead) => { keepInPlace(lead.id); void onUnapproveLeads?.([lead.id]); });
    const restoreRow = useStable((lead: Lead) => { keepInPlace(lead.id); void onRestoreLeads?.([lead.id]); });
    const generateRow = useStable((lead: Lead) => { keepInPlace(lead.id); void onGenerateDMs([lead]); });
    /** Reverses a change made in this view, whichever it was. */
    const undoRow = useStable((lead: Lead) => {
        const now = viewOf(lead);
        if (now === 'send') void onUnapproveLeads?.([lead.id]);
        else if (now === 'skipped') void onRestoreLeads?.([lead.id]);
        else if (activeView === 'send') onApproveLead?.(lead.id);
        else if (activeView === 'skipped') onRejectLead?.(lead.id);
    });
    const updateLead = useStable((lead: Lead) => onUpdateLead?.(lead));
    const toggleBattlecards = useStable((id: string) => setBattlecardsFor(prev => (prev === id ? null : id)));
    const deleteRow = useStable((lead: Lead) => setConfirming({ delete: [lead] }));

    // ── Navigation ────────────────────────────────────────────────────────────
    const chooseCampaign = (id: string) => {
        setCampaign(id);
        // A campaign with nothing at this stage opens where its work is, so a
        // fresh scrape lands on To write instead of an empty To review.
        const b = id === ALL ? null : campaigns.find(x => x.id === id);
        if (b && STAGES.includes(activeView as QueueStage) && b.counts[activeView] === 0) {
            const next = nextStage(b.counts);
            if (next) setView(next);
        }
    };

    // The menu closes on Escape and on a press anywhere outside it.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
        const onDown = (e: PointerEvent) => {
            if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('pointerdown', onDown);
        };
    }, [menuOpen]);

    // Escape backs out of a pending confirmation.
    useEffect(() => {
        if (!confirming) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setConfirming(null); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [confirming]);

    // ── Band ──────────────────────────────────────────────────────────────────
    // One sentence and one action: what this campaign needs next. While rows are
    // selected it becomes the bulk bar for them.
    const toWrite = useMemo(() => scoped.filter(l => viewOf(l) === 'write'), [scoped]);
    const writing = generation !== null && generation.total > 1;

    const band = (() => {
        if (selectedRows.length > 0) {
            const n = selectedRows.length;
            return (
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-2xl border border-white/20 bg-white/[0.06]">
                    <span className="text-body-sm text-white"><span className="font-mono tabular-nums">{n}</span> selected</span>
                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                        {activeView === 'write' && (
                            <button type="button" onClick={bulk.write} disabled={isGenerating} className={PRIMARY}>
                                <Sparkles className="w-4 h-4" aria-hidden /> Write {plural(n, 'DM')}
                            </button>
                        )}
                        {activeView === 'review' && (
                            <button type="button" onClick={() => void bulk.approve()} className={PRIMARY}>
                                <Check className="w-4 h-4" aria-hidden /> Approve {n}
                            </button>
                        )}
                        {activeView === 'skipped' && (
                            <button type="button" onClick={() => void bulk.restore()} className={PRIMARY}>
                                <RotateCcw className="w-4 h-4" aria-hidden /> Restore {n}
                            </button>
                        )}
                        {activeView === 'send' && (
                            <button type="button" onClick={() => void bulk.unapprove()} className={GHOST}>
                                <CornerUpLeft className="w-4 h-4" aria-hidden /> Back to review
                            </button>
                        )}
                        {activeView === 'sent' && (
                            <button type="button" onClick={() => exportToCSV(selectedRows, campaignNames)} className={GHOST}>
                                <Download className="w-4 h-4" aria-hidden /> Export {n}
                            </button>
                        )}
                        {(activeView === 'write' || activeView === 'review') && (
                            <button type="button" onClick={() => void bulk.skip()} className={GHOST}>
                                <X className="w-4 h-4" aria-hidden /> Skip
                            </button>
                        )}
                        {(onDeleteLeads || onDeleteLead) && (
                            <button type="button" onClick={bulk.remove} className={GHOST_DANGER}>
                                <Trash2 className="w-4 h-4" aria-hidden /> Delete
                            </button>
                        )}
                        <button type="button" onClick={clearSelection}
                            className="px-3 py-2 rounded-full text-meta text-neutral-400 hover:text-white transition-colors">
                            Clear
                        </button>
                    </div>
                </div>
            );
        }

        let text: React.ReactNode = null;
        let action: React.ReactNode = null;
        const strong = (n: number) => <span className="font-mono tabular-nums text-white">{n}</span>;
        // While a confirmation is open it owns the one white pill; the band's
        // button steps back to ghost.
        const bandPrimary = confirming ? GHOST : PRIMARY;

        if (activeView === 'write') {
            if (writing) {
                const pct = Math.round((generation!.done / generation!.total) * 100);
                return (
                    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                        <Loader2 className="w-4 h-4 text-white animate-spin" aria-hidden />
                        <span className="text-body-sm text-neutral-300">
                            Writing DMs… {strong(generation!.done)} of {strong(generation!.total)}
                        </span>
                        <span className="flex-1 min-w-[6rem] h-1 rounded-full bg-white/[0.08] overflow-hidden" aria-hidden>
                            <span className="block h-full bg-white rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
                        </span>
                        {onStopGenerating && (
                            <button type="button" onClick={onStopGenerating} className={GHOST}>Stop</button>
                        )}
                    </div>
                );
            }
            if (counts.write > 0) {
                text = <>{strong(counts.write)} {counts.write === 1 ? 'lead' : 'leads'} {where} {counts.write === 1 ? 'has' : 'have'} no DM yet. The AI writes each one from that person's profile.</>;
                action = (
                    <button type="button" onClick={() => writeAll(toWrite)} disabled={isGenerating} className={PRIMARY}>
                        <Sparkles className="w-4 h-4" aria-hidden /> Write {plural(counts.write, 'DM')}
                    </button>
                );
            }
        } else if (activeView === 'review') {
            if (counts.review > 0) {
                text = <>{strong(counts.review)} {counts.review === 1 ? 'draft' : 'drafts'} to read {where}. Approve the good ones, skip the rest.</>;
                action = (
                    <button type="button" onClick={() => setConfirming('approve-all')} aria-expanded={confirming === 'approve-all'} className={bandPrimary}>
                        <Check className="w-4 h-4" aria-hidden /> Approve {plural(counts.review, 'DM')}
                    </button>
                );
            }
        } else if (activeView === 'send') {
            if (sendable.length > 0) {
                // Send is the one action that cannot be scoped to a campaign: the
                // extension works from a single list it replaces on every
                // Handoff. So when a campaign is on screen and others hold approved
                // DMs too, the band says so in numbers, and the pill says "all".
                const here = currentCampaign ? sendable.filter(l => campaignIdOf(l) === currentCampaign.id).length : sendable.length;
                const elsewhere = sendable.length - here;
                const already = withExtension > 0
                    ? <> {strong(withExtension)} {withExtension === 1 ? 'is' : 'are'} with it already.</>
                    : null;
                text = currentCampaign && elsewhere > 0 ? (
                    <>
                        {strong(here)} approved in this campaign, {strong(elsewhere)} in {sendableCampaigns - (here > 0 ? 1 : 0) === 1 ? 'another campaign' : 'other campaigns'}.
                        {' '}The extension works from one list, so Send hands it all {strong(sendable.length)}.{already}
                    </>
                ) : (
                    <>
                        {strong(sendable.length)} approved {sendable.length === 1 ? 'DM' : 'DMs'} ready
                        {sendableCampaigns > 1 ? <> across {strong(sendableCampaigns)} campaigns</> : null}.{already}
                    </>
                );
                action = (
                    <button type="button" onClick={requestSend} aria-expanded={confirming === 'send'} className={bandPrimary}>
                        <Send className="w-4 h-4" aria-hidden />
                        {currentCampaign && elsewhere > 0 ? `Send all ${sendable.length} DMs` : `Send ${plural(sendable.length, 'approved DM')}`}
                    </button>
                );
            }
        } else if (activeView === 'sent') {
            if (counts.sent > 0) {
                text = <>{strong(counts.sent)} {counts.sent === 1 ? 'DM' : 'DMs'} sent {where}. Replies and deals land in the Inbox; mark them here if you track one by hand.</>;
            }
        } else if (counts.skipped > 0) {
            text = <>{strong(counts.skipped)} skipped {where}. Restore any you want back.</>;
        }

        if (!text) return null;
        return (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                <p className="flex-1 min-w-[16rem] text-body-sm text-neutral-300">{text}</p>
                {action}
            </div>
        );
    })();

    // ── Empty state ───────────────────────────────────────────────────────────
    // Says where the work went, and offers the way there.
    const emptyState = (() => {
        if (leads.length === 0) {
            return { title: 'No leads yet', body: 'Search Instagram in the Campaign Builder. Each search lands here as its own campaign.' };
        }
        if (search.trim()) {
            return { title: `No leads match "${search.trim()}"`, body: 'Search looks at names and handles in this view.', clearSearch: true };
        }
        const go = (to: QueueStage, label: string) => ({ to, label });
        switch (activeView) {
            case 'write':
                return {
                    title: 'Every lead here has a DM',
                    body: 'New searches from the Campaign Builder land here first, as their own campaign.',
                    next: counts.review > 0 ? go('review', `Read ${plural(counts.review, 'draft')}`) : undefined,
                };
            case 'review':
                return {
                    title: 'No drafts waiting',
                    body: counts.write > 0 ? 'Write the DMs first; they arrive here to be read.' : 'Approved DMs wait in To send.',
                    next: counts.write > 0 ? go('write', `Go to ${plural(counts.write, 'lead')} without a DM`)
                        : counts.send > 0 ? go('send', `${plural(counts.send, 'approved DM')} in To send`) : undefined,
                };
            case 'send':
                return {
                    title: 'Nothing approved yet',
                    body: 'Approve drafts in To review and they wait here until you press Send.',
                    next: counts.review > 0 ? go('review', `Read ${plural(counts.review, 'draft')}`) : undefined,
                };
            case 'sent':
                return { title: 'Nothing sent yet', body: 'A DM moves here once the extension confirms it went out.' };
            default:
                return { title: 'Nothing skipped', body: 'Leads you skip wait here, and can be restored.' };
        }
    })();

    const viewTab = (v: QueueView) => {
        const active = activeView === v;
        const n = counts[v];
        return (
            <button
                key={v}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setView(v)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-meta font-medium transition-colors ${
                    active
                        ? 'bg-surface text-white ring-1 ring-inset ring-white/12'
                        : 'text-neutral-400 hover:text-white'
                }`}
            >
                {STAGE_LABEL[v]}
                <span className={`font-mono text-label tabular-nums ${active ? 'text-neutral-300' : 'text-neutral-400'}`}>{n}</span>
            </button>
        );
    };

    const columns = COLUMNS[activeView];

    return (
        <div className="space-y-4 [color-scheme:dark]">
            {/* ── Views: the three stages, then where finished leads go ───── */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
                <div role="tablist" aria-label="Stage" className="inline-flex flex-wrap items-center gap-0.5 p-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
                    {STAGES.map(s => viewTab(s))}
                </div>
                <div role="tablist" aria-label="Finished leads" className="inline-flex items-center gap-0.5">
                    {viewTab('sent')}
                    {viewTab('skipped')}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                    <div className="relative flex-1 sm:w-60 sm:flex-none">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" aria-hidden />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search name or handle"
                            aria-label="Search leads by name or handle"
                            className="w-full pl-9 pr-3 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-meta text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-colors"
                        />
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuOpen(o => !o)}
                            aria-expanded={menuOpen}
                            aria-haspopup="menu"
                            aria-label="More options"
                            className="p-2 rounded-full border border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/25 transition-colors"
                        >
                            <MoreHorizontal className="w-4 h-4" aria-hidden />
                        </button>
                        {menuOpen && (
                            <div role="menu" className="absolute right-0 top-full mt-2 z-30 w-64 p-1.5 rounded-2xl bg-surface-overlay border border-white/12">
                                <button type="button" role="menuitemcheckbox" aria-checked={rulesOnly}
                                    onClick={() => { setRulesOnly(v => !v); setMenuOpen(false); }}
                                    className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-white/[0.05] transition-colors">
                                    <Filter className={`w-4 h-4 mt-0.5 flex-none ${rulesOnly ? 'text-white' : 'text-neutral-500'}`} aria-hidden />
                                    <span>
                                        <span className="block text-meta text-white">{rulesOnly ? 'Showing leads that match my rules' : 'Only leads that match my rules'}</span>
                                        <span className="block text-label text-neutral-400">The follower, keyword and account rules from Settings</span>
                                    </span>
                                </button>
                                <div className="my-1 h-px bg-white/[0.06]" />
                                <button type="button" role="menuitem"
                                    onClick={() => { exportToCSV(rows, campaignNames); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-meta text-neutral-200 hover:bg-white/[0.05] transition-colors">
                                    <Download className="w-4 h-4 text-neutral-500" aria-hidden /> Export this view (CSV)
                                </button>
                                <button type="button" role="menuitem"
                                    onClick={() => { download('magnet_queue.json', 'application/json', JSON.stringify(rows, null, 2)); setMenuOpen(false); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-meta text-neutral-200 hover:bg-white/[0.05] transition-colors">
                                    <Download className="w-4 h-4 text-neutral-500" aria-hidden /> Export this view (JSON)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Campaigns: each search is its own ──────────────────────────── */}
            {campaigns.length > 0 && (
                <div role="group" aria-label="Campaigns" className="-mx-1 px-1 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-sm:[mask-image:linear-gradient(to_right,black_85%,transparent)]">
                    {[{ id: ALL, label: 'All campaigns', day: '', n: totalInView }, ...campaigns.map(b => {
                        const label = campaignLabel(b);
                        const day = campaignDate(b);
                        return { id: b.id, label, day: day && !label.includes(day) ? day : '', n: b.counts[activeView] };
                    })].map(chip => {
                        const active = campaign === chip.id;
                        return (
                            <button
                                key={chip.id}
                                type="button"
                                aria-pressed={active}
                                aria-label={`${chip.label}${chip.day ? `, ${chip.day}` : ''}: ${chip.n} ${STAGE_LABEL[activeView].toLowerCase()}`}
                                onClick={() => chooseCampaign(chip.id)}
                                className={`flex-none inline-flex items-center gap-2 pl-3.5 pr-3 py-1.5 rounded-full border text-meta whitespace-nowrap transition-colors ${
                                    active
                                        ? 'border-white/30 bg-white/10 text-white'
                                        : chip.n > 0
                                            ? 'border-white/[0.08] text-neutral-300 hover:text-white hover:border-white/20'
                                            : 'border-white/[0.06] text-neutral-400 hover:text-white'
                                }`}
                            >
                                <span className="max-w-[16rem] truncate">{chip.label}</span>
                                {chip.day && <span className="text-label text-neutral-400">{chip.day}</span>}
                                <span className={`font-mono text-label tabular-nums ${active ? 'text-neutral-200' : 'text-neutral-400'}`}>{chip.n}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {rulesOnly && (
                <p className="flex items-center gap-2 text-meta text-neutral-400">
                    <Filter className="w-3.5 h-3.5" aria-hidden /> Showing only leads that match your Settings rules.
                    <button type="button" onClick={() => setRulesOnly(false)} className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white">Show all</button>
                </p>
            )}

            {/* ── The next decision, or the bulk bar ──────────────────────── */}
            {/* Keyed by what the band is saying, so a new next step settles in
                rather than swapping under the eye; a changing count does not. */}
            {band && (
                <div key={`${selectedRows.length > 0 ? 'bulk' : activeView}|${campaign}|${writing}`} className="queue-settle">
                    {band}
                </div>
            )}

            {/* Confirmations sit inline, under the band that asked, rather than in
                a modal: the queue stays readable behind the question, which is
                the point when the question is "have you read these?". */}
            {confirming === 'approve-all' && (
                <div role="alertdialog" aria-labelledby="confirm-approve-title" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 rounded-2xl border border-white/15 bg-white/[0.04]">
                    <AlertTriangle className="w-4 h-4 text-white flex-none" aria-hidden />
                    <div className="flex-1 min-w-[16rem]">
                        <p id="confirm-approve-title" className="text-body-sm font-semibold text-white">
                            Approve {plural(counts.review, 'draft')} without reading {counts.review === 1 ? 'it' : 'them'}?
                        </p>
                        <p className="text-meta text-neutral-400 mt-0.5">
                            Approved DMs go out from your Instagram the next time you press Send. You can undo this for a few seconds afterwards.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setConfirming(null)} className={GHOST}>Keep reviewing</button>
                        <button type="button" onClick={() => void confirmApproveAll()} autoFocus className={PRIMARY}>
                            Approve {plural(counts.review, 'draft')}
                        </button>
                    </div>
                </div>
            )}

            {confirming === 'send' && (
                <div role="alertdialog" aria-labelledby="confirm-send-title" className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 rounded-2xl border border-white/15 bg-white/[0.04]">
                    <Send className="w-4 h-4 text-white flex-none" aria-hidden />
                    <div className="flex-1 min-w-[16rem] space-y-2">
                        <p id="confirm-send-title" className="text-body-sm font-semibold text-white">
                            Send {plural(sendable.length, 'DM')} from your Instagram account?
                        </p>
                        <fieldset className="flex flex-wrap items-center gap-2 text-meta text-neutral-400">
                            <legend className="sr-only">Minutes between DMs</legend>
                            One every
                            <NumberField
                                min={MIN_DELAY_MIN}
                                value={minDelay}
                                onCommit={n => commitDelay(n, maxDelay)}
                                aria-label="Shortest gap between DMs, in minutes"
                                className="w-12 bg-surface border border-white/12 rounded-lg px-2 py-1 text-meta text-white text-center font-mono tabular-nums focus:outline-none focus:border-white/40"
                            />
                            to
                            <NumberField
                                min={minDelay}
                                value={maxDelay}
                                onCommit={n => commitDelay(minDelay, n)}
                                aria-label="Longest gap between DMs, in minutes"
                                className="w-12 bg-surface border border-white/12 rounded-lg px-2 py-1 text-meta text-white text-center font-mono tabular-nums focus:outline-none focus:border-white/40"
                            />
                            minutes while an Instagram tab is open, up to your Send Cap of {dailyCap} a day
                            {sendable.length > dailyCap ? `, so about ${Math.ceil(sendable.length / dailyCap)} days` : ''}.
                            A sent DM can't be taken back.
                        </fieldset>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setConfirming(null)} className={GHOST}>Cancel</button>
                        <button type="button" onClick={confirmSend} autoFocus className={PRIMARY}>
                            Send {plural(sendable.length, 'DM')}
                        </button>
                    </div>
                </div>
            )}

            {confirming !== null && typeof confirming === 'object' && (
                <div role="alertdialog" aria-labelledby="confirm-delete-title" className="queue-settle flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-4 rounded-2xl border border-danger-500/25 bg-danger-500/[0.06]">
                    <Trash2 className="w-4 h-4 text-danger-400 flex-none" aria-hidden />
                    <p id="confirm-delete-title" className="flex-1 min-w-[16rem] text-body-sm text-white">
                        Delete {confirming.delete.length === 1
                            ? <span className="font-mono">@{confirming.delete[0].handle}</span>
                            : plural(confirming.delete.length, 'lead')} from the queue? This can't be undone.
                    </p>
                    <div className="flex items-center gap-2">
                        {/* Focus rests on Cancel: Enter on a destructive dialog
                            should never be the thing that deletes. */}
                        <button type="button" onClick={() => setConfirming(null)} autoFocus className={GHOST}>Cancel</button>
                        <button type="button" onClick={() => confirmDelete(confirming.delete)} className={DANGER}>
                            <Trash2 className="w-4 h-4" aria-hidden /> Delete
                        </button>
                    </div>
                </div>
            )}

            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
                <div role="tabpanel" aria-label={STAGE_LABEL[activeView]} className="bg-surface-sunken rounded-[calc(1.5rem-1px)] overflow-clip" style={CARD_BEZEL.inner}>
                    {/* One scroll: the page's. A capped scrollport inside the card
                        put a second scrollbar in the table and hid the pager
                        below it. */}
                    <div>
                        <table className="w-full text-left">
                            <thead className="max-md:hidden">
                                <tr>
                                    <th className={`${TH} pl-5 pr-1 py-3 w-10`}>
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            disabled={selectable.length === 0}
                                            onChange={() => setSelected(allSelected ? new Set() : new Set(ids(selectable)))}
                                            aria-label={`Select all ${selectable.length} leads in this view`}
                                            className="w-4 h-4 rounded border-white/20 bg-transparent accent-white cursor-pointer disabled:opacity-30"
                                        />
                                    </th>
                                    {columns.map(c => (
                                        <th key={c.key} scope="col" className={`${TH} px-4 py-3 text-label font-semibold uppercase tracking-[0.12em] text-neutral-500 ${c.className}`}>
                                            {c.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="max-md:block">
                                {visible.slice(0, mounted).map(lead => {
                                    const now = viewOf(lead);
                                    return (
                                        <QueueRow
                                            key={lead.id}
                                            lead={lead}
                                            view={activeView}
                                            changedTo={now === activeView ? null : now}
                                            campaignLabelText={campaign === ALL ? campaignNames.get(campaignIdOf(lead)) ?? null : null}
                                            isSelected={selected.has(lead.id) && now === activeView}
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
                                            onApprove={approveRow}
                                            onSkip={skipRow}
                                            onUnapprove={unapproveRow}
                                            onRestore={restoreRow}
                                            onUndo={undoRow}
                                            onUpdateLead={updateLead}
                                            onToggleBattlecards={toggleBattlecards}
                                            onGenerateDM={generateRow}
                                            onDelete={deleteRow}
                                        />
                                    );
                                })}
                            </tbody>
                        </table>

                        {rows.length === 0 && (
                            <div className="px-6 py-14 flex flex-col items-center text-center gap-3">
                                <Users className="w-7 h-7 text-neutral-600" aria-hidden />
                                <div>
                                    <p className="text-body-sm font-medium text-white">{emptyState.title}</p>
                                    <p className="mt-1 text-meta text-neutral-400 max-w-sm">{emptyState.body}</p>
                                </div>
                                {'next' in emptyState && emptyState.next && (
                                    <button type="button" onClick={() => setView(emptyState.next!.to)} className={GHOST}>
                                        {emptyState.next.label}
                                    </button>
                                )}
                                {'clearSearch' in emptyState && (
                                    <button type="button" onClick={() => setSearch('')} className={GHOST}>Clear search</button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* The pager states the paging model even on one page, so a
                        long page that ends never reads as "that's everything". */}
                    {rows.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 border-t border-white/[0.06]">
                            <span className="text-label text-neutral-400 tabular-nums">
                                <span className="font-mono text-neutral-300">{rangeStart}–{rangeEnd}</span> of <span className="font-mono text-neutral-300">{rows.length}</span>
                                {' · '}page {safePage} of {pageCount}
                            </span>
                            <div className="flex items-center gap-3">
                                {pageCount > 1 && (
                                    <nav aria-label="Approval queue pages" className="flex items-center gap-1">
                                        <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}
                                            className="px-2.5 py-1 rounded-full text-meta text-neutral-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none">
                                            ‹ Prev
                                        </button>
                                        {pages.map((p, i) => p === null ? (
                                            <span key={`gap-${i}`} className="px-1 text-meta text-neutral-500">…</span>
                                        ) : (
                                            <button key={p} type="button" onClick={() => setPage(p)} aria-current={p === safePage ? 'page' : undefined}
                                                className={`min-w-[2rem] px-2 py-1 rounded-full font-mono text-label tabular-nums transition-colors ${
                                                    p === safePage ? 'bg-white/[0.12] text-white' : 'text-neutral-400 hover:text-white hover:bg-white/5'
                                                }`}>
                                                {p}
                                            </button>
                                        ))}
                                        <button type="button" onClick={() => setPage(Math.min(pageCount, safePage + 1))} disabled={safePage >= pageCount}
                                            className="px-2.5 py-1 rounded-full text-meta text-neutral-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none">
                                            Next ›
                                        </button>
                                    </nav>
                                )}
                                <label className="flex items-center gap-1.5 text-label text-neutral-400">
                                    Rows
                                    <select
                                        aria-label="Rows per page"
                                        value={pageSize}
                                        onChange={e => changePageSize(Number(e.target.value) as QueuePageSize)}
                                        className="bg-white/[0.03] border border-white/[0.08] rounded-full px-2.5 py-1 font-mono text-label text-neutral-200 focus:outline-none focus:border-white/40"
                                    >
                                        {QUEUE_PAGE_SIZES.map(n => <option key={n} value={n} className="bg-surface-overlay">{n}</option>)}
                                    </select>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
