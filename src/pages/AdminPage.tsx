import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Shield, Users, DollarSign, Clock, XCircle, Sparkles, RefreshCw,
    CheckCircle, AlertCircle, UserPlus, BookOpen, ExternalLink,
    Loader2, ArrowLeft, UserCheck, UserX,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    callAdminApi,
    type AdminOverview,
    type AdminUserRow,
    type AdminUsersResponse,
} from '../lib/adminApi';

/** Owner-only business console — gated by RequireAdmin in App.tsx and
 *  enforced server-side by the admin-api Edge Function (ADMIN_EMAILS secret). */
const AdminPage: React.FC = () => {
    const { session, user } = useAuth();

    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rowBusy, setRowBusy] = useState<string | null>(null);
    const [manualEmail, setManualEmail] = useState('');
    const [manualBusy, setManualBusy] = useState(false);
    const [manualResult, setManualResult] = useState<{ ok: boolean; text: string } | null>(null);

    const loadAll = useCallback(async () => {
        if (!session) return;
        setLoading(true);
        setError(null);
        try {
            const [ov, us] = await Promise.all([
                callAdminApi<AdminOverview>(session, { action: 'overview' }),
                callAdminApi<AdminUsersResponse>(session, { action: 'users', perPage: 100 }),
            ]);
            setOverview(ov);
            setUsers(us.users);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load admin data.');
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const setStatus = async (email: string, action: 'activate' | 'revoke') => {
        if (!session) return;
        setRowBusy(email);
        try {
            await callAdminApi(session, { action, email });
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : `Failed to ${action} ${email}.`);
        } finally {
            setRowBusy(null);
        }
    };

    const handleManualActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session || !manualEmail.trim()) return;
        setManualBusy(true);
        setManualResult(null);
        try {
            await callAdminApi(session, { action: 'activate', email: manualEmail.trim() });
            setManualResult({ ok: true, text: `${manualEmail.trim()} is now active.` });
            setManualEmail('');
            await loadAll();
        } catch (err) {
            setManualResult({ ok: false, text: err instanceof Error ? err.message : 'Activation failed.' });
        } finally {
            setManualBusy(false);
        }
    };

    const fmtDate = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

    const tiles = overview ? [
        { icon: Users, label: 'Total signups', value: String(overview.totalUsers), color: 'text-cyan-400' },
        { icon: CheckCircle, label: 'Active members', value: String(overview.subscriptions.active), color: 'text-emerald-400' },
        { icon: Clock, label: 'Pending payment', value: String(overview.subscriptions.pending), color: 'text-amber-400' },
        { icon: XCircle, label: 'Cancelled', value: String(overview.subscriptions.cancelled), color: 'text-red-400' },
        { icon: DollarSign, label: 'Est. MRR', value: `$${overview.estMRR.toLocaleString()}`, color: 'text-emerald-400' },
        { icon: Sparkles, label: 'DMs this month', value: String(overview.dmsThisMonth), color: 'text-violet-400' },
    ] : [];

    const statusBadge = (status: string) => {
        if (status === 'active') return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
        if (status === 'cancelled') return 'bg-red-500/10 border-red-500/20 text-red-400';
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    };

    return (
        <div className="relative min-h-screen bg-[#030604] overflow-hidden">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/8 to-black pointer-events-none z-0" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4 mb-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/8 text-[10px] font-semibold tracking-[0.2em] text-emerald-400 uppercase mb-3">
                            <Shield className="w-3 h-3" /> Owner Console
                        </div>
                        <h1 className="text-2xl font-semibold text-white tracking-tight">Admin</h1>
                        <p className="text-zinc-600 text-sm mt-1.5">
                            Signed in as <span className="text-zinc-400">{user?.email}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadAll}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all text-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" /> Dashboard
                        </Link>
                    </div>
                </div>

                {error && (
                    <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-500/8 border border-red-500/20 mb-8">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* ── Metric tiles ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
                    {(loading && !overview ? Array.from({ length: 6 }) : tiles).map((tile, i) => (
                        <div key={i} className="rounded-[1.25rem] p-[1px]"
                            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
                            <div className="bg-[#030A06] rounded-[calc(1.25rem-1px)] p-4 h-full"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
                                {tile ? (
                                    <>
                                        {(() => { const t = tile as typeof tiles[number]; const Icon = t.icon; return (
                                            <>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                                                    <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">{t.label}</span>
                                                </div>
                                                <p className="text-2xl font-bold text-white tracking-tight">{t.value}</p>
                                            </>
                                        ); })()}
                                    </>
                                ) : (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-3 w-16 bg-white/5 rounded" />
                                        <div className="h-7 w-12 bg-white/8 rounded" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Members table ───────────────────────────────────────── */}
                <div className="rounded-[1.5rem] p-[1px] mb-10"
                    style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
                    <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] overflow-hidden"
                        style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                <Users className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-white">Members</h2>
                                <p className="text-[11px] text-zinc-600">Every account, with subscription status</p>
                            </div>
                            <span className="ml-auto text-[10px] text-zinc-700 font-mono">{users.length} shown</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-white/5">
                                    <tr>
                                        {['Email', 'Name', 'Signed up', 'Last sign-in', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-5 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3.5 text-zinc-300 text-xs">{u.email}</td>
                                            <td className="px-5 py-3.5 text-zinc-500 text-xs">{u.name ?? '—'}</td>
                                            <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                                            <td className="px-5 py-3.5 text-zinc-500 text-xs whitespace-nowrap">{fmtDate(u.lastSignInAt)}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold border capitalize ${statusBadge(u.status)}`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    {u.status !== 'active' && (
                                                        <button
                                                            onClick={() => setStatus(u.email, 'activate')}
                                                            disabled={rowBusy === u.email}
                                                            title="Activate"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                                                        >
                                                            {rowBusy === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3 h-3" />}
                                                            Activate
                                                        </button>
                                                    )}
                                                    {u.status === 'active' && (
                                                        <button
                                                            onClick={() => setStatus(u.email, 'revoke')}
                                                            disabled={rowBusy === u.email}
                                                            title="Revoke access"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/8 transition-all disabled:opacity-50"
                                                        >
                                                            {rowBusy === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-zinc-600 text-sm">No members yet.</td>
                                        </tr>
                                    )}
                                    {loading && users.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center">
                                                <Loader2 className="w-5 h-5 animate-spin text-emerald-500 mx-auto" />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Activate a customer ─────────────────────────────── */}
                    <div className="rounded-[1.5rem] p-[1px]"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(255,255,255,0.02) 100%)' }}>
                        <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6 h-full"
                            style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                    <UserPlus className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Activate a customer</h2>
                                    <p className="text-[11px] text-zinc-600">For Whop payments that didn't auto-match</p>
                                </div>
                            </div>

                            <form onSubmit={handleManualActivate} className="flex gap-2 mb-4">
                                <input
                                    type="email"
                                    value={manualEmail}
                                    onChange={e => { setManualEmail(e.target.value); setManualResult(null); }}
                                    placeholder="customer@email.com"
                                    required
                                    className="flex-1 bg-[#030604] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                />
                                <button
                                    type="submit"
                                    disabled={manualBusy}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-emerald-950 font-semibold rounded-xl transition-all text-sm"
                                >
                                    {manualBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                                    Activate
                                </button>
                            </form>

                            {manualResult && (
                                <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs mb-4 ${
                                    manualResult.ok
                                        ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
                                        : 'bg-red-500/8 border-red-500/20 text-red-400'
                                }`}>
                                    {manualResult.ok ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                                    {manualResult.text}
                                </div>
                            )}

                            <p className="text-[11px] text-zinc-600 leading-relaxed">
                                Payments auto-activate when the Whop checkout email matches the signup email
                                (the /activate page locks it, so this is the normal case). If a buyer paid with a
                                different email, find their payment in the Whop dashboard, then activate the email
                                they <span className="text-zinc-400">signed up to MagnetEngine with</span> here.
                                If they haven't signed up yet, ask them to create an account first.
                            </p>
                        </div>
                    </div>

                    {/* ── Business runbook ────────────────────────────────── */}
                    <div className="rounded-[1.5rem] p-[1px]"
                        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)' }}>
                        <div className="bg-[#030A06] rounded-[calc(1.5rem-1px)] p-6 h-full"
                            style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04)' }}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                                    <BookOpen className="w-4 h-4 text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-white">Business runbook</h2>
                                    <p className="text-[11px] text-zinc-600">How the machine runs</p>
                                </div>
                            </div>

                            <div className="space-y-3 text-[11px] text-zinc-500 leading-relaxed mb-5">
                                <p>
                                    <span className="text-zinc-300 font-medium">Money flow:</span>{' '}
                                    customer signs up → pays $197/mo or $1,970/yr via the embedded Whop checkout on
                                    /activate → Whop fires a webhook → <code className="text-emerald-400/90">whop-webhook</code>{' '}
                                    matches by email and flips their subscription to active → dashboard unlocks.
                                    Cancellations revoke automatically the same way.
                                </p>
                                <p>
                                    <span className="text-zinc-300 font-medium">Config lives in:</span>{' '}
                                    Whop plan IDs + admin emails in Vercel env (<code>VITE_WHOP_PLAN_ID_MONTHLY/ANNUAL</code>,{' '}
                                    <code>VITE_ADMIN_EMAILS</code>); webhook secret + server admin list in Supabase secrets{' '}
                                    (<code>WHOP_WEBHOOK_SECRET</code>, <code>ADMIN_EMAILS</code>). Full setup: docs/WHOP_SETUP.md.
                                </p>
                                <p>
                                    <span className="text-zinc-300 font-medium">Note:</span>{' '}
                                    the "DMs this month" tile reads the server-side usage table; the app currently
                                    tracks DM usage client-side, so it may show 0 until server tracking is wired.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { label: 'Whop dashboard', href: 'https://whop.com/dashboard' },
                                    { label: 'Supabase', href: 'https://supabase.com/dashboard/project/tttktkfrclaivxjhzbxn' },
                                    { label: 'Vercel', href: 'https://vercel.com/dashboard' },
                                    { label: 'Cal.com bookings', href: 'https://app.cal.com/bookings/upcoming' },
                                ].map(l => (
                                    <a
                                        key={l.label}
                                        href={l.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/3 border border-white/6 text-xs text-zinc-400 hover:text-white hover:border-white/15 transition-all"
                                    >
                                        {l.label}
                                        <ExternalLink className="w-3 h-3 text-zinc-600" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
