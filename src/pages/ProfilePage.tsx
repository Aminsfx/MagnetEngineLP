import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    CheckCircle, AlertCircle, Loader2, Copy, Check, Camera, LogOut, Eye, EyeOff,
    Puzzle, Instagram, ExternalLink, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlan } from '../contexts/PlanContext';
import { PRICES, SUPPORT_EMAIL } from '../lib/plans';
import { CARD_BEZEL, CARD_BEZEL_DANGER } from '../lib/theme';
import { EXTENSION_INSTALL_URL, type ExtensionStatus } from '../lib/extensionProtocol';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfilePageProps {
    user: SupabaseUser;
    onLogout: () => void;
    extension: ExtensionStatus;
    /** AI-written DMs this month, as the generate-dm function counted them. */
    dmUsed: number;
    dmLimit: number;
}

const AVATAR_KEY = (id: string) => `avatar_${id}`;

/** The page's sections, in order: the side nav and the cards read the same list. */
const SECTIONS = [
    { id: 'profile', label: 'Profile' },
    { id: 'plan', label: 'Plan & usage' },
    { id: 'connections', label: 'Connections' },
    { id: 'security', label: 'Security' },
    { id: 'account', label: 'Sign out & delete' },
] as const;

type Notice = { type: 'success' | 'error'; text: string } | null;

const INPUT = 'w-full bg-surface-raised border border-white/10 rounded-xl px-3.5 py-2.5 text-body-sm text-white placeholder:text-neutral-500 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/25 focus:border-white/40 transition-colors disabled:text-neutral-400 disabled:hover:border-white/10';
const PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-surface text-meta font-semibold hover:bg-neutral-200 transition-[background-color,transform] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed';
const SECONDARY = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/12 text-meta font-medium text-neutral-200 hover:text-white hover:border-white/30 transition-colors';

/**
 * The account page, laid out like the settings of the tools the Operator
 * already uses: a section nav on the left, one card per topic, and each
 * card's action in its own footer so a save never reaches past its card.
 *
 * Everything shown is read from somewhere real — the auth user, the
 * subscription row, the handshake with the extension, and the DM count the
 * generate-dm function keeps. Nothing here is a placeholder.
 */
const ProfilePage: React.FC<ProfilePageProps> = ({ user, onLogout, extension, dmUsed, dmLimit }) => {
    const { status: planStatus, loading: planLoading } = usePlan();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Profile ──
    const savedFirst = (user.user_metadata?.first_name as string | undefined) ?? '';
    const savedLast = (user.user_metadata?.last_name as string | undefined) ?? '';
    const [first, setFirst] = useState(savedFirst);
    const [last, setLast] = useState(savedLast);
    const [nameSaving, setNameSaving] = useState(false);
    const [nameNotice, setNameNotice] = useState<Notice>(null);
    const nameDirty = first.trim() !== savedFirst || last.trim() !== savedLast;

    const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem(AVATAR_KEY(user.id)));
    const [avatarBusy, setAvatarBusy] = useState(false);

    // ── Security ──
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);
    const [pwNotice, setPwNotice] = useState<Notice>(null);
    const [copied, setCopied] = useState(false);

    // When the saved name changes (this save, or another tab's), the fields follow it.
    const [synced, setSynced] = useState({ first: savedFirst, last: savedLast });
    if (synced.first !== savedFirst || synced.last !== savedLast) {
        setSynced({ first: savedFirst, last: savedLast });
        setFirst(savedFirst);
        setLast(savedLast);
    }

    const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';
    const fullName = [savedFirst, savedLast].filter(Boolean).join(' ');
    const initial = (savedFirst?.[0] ?? user.email?.[0] ?? 'U').toUpperCase();

    const saveName = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameNotice(null);
        setNameSaving(true);
        const { error } = await supabase.auth.updateUser({ data: { first_name: first.trim(), last_name: last.trim() } });
        setNameSaving(false);
        setNameNotice(error ? { type: 'error', text: error.message } : { type: 'success', text: 'Saved.' });
    };

    const setAvatar = (url: string | null) => {
        if (url) localStorage.setItem(AVATAR_KEY(user.id), url);
        else localStorage.removeItem(AVATAR_KEY(user.id));
        setAvatarUrl(url);
        window.dispatchEvent(new CustomEvent('avatar-updated', { detail: url }));
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setAvatarBusy(true);
        const reader = new FileReader();
        reader.onload = () => {
            // Square-crop and shrink to 256px so it fits comfortably in localStorage.
            const img = new Image();
            img.onload = () => {
                const size = Math.min(img.width, img.height, 256);
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const side = Math.min(img.width, img.height);
                canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
                setAvatar(canvas.toDataURL('image/jpeg', 0.85));
                setAvatarBusy(false);
            };
            img.onerror = () => setAvatarBusy(false);
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
    };

    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwNotice(null);
        if (newPw.length < 6) return setPwNotice({ type: 'error', text: 'Use at least 6 characters.' });
        if (newPw !== confirmPw) return setPwNotice({ type: 'error', text: "The two passwords don't match." });
        setPwSaving(true);
        const { error } = await supabase.auth.updateUser({ password: newPw });
        setPwSaving(false);
        if (error) return setPwNotice({ type: 'error', text: error.message });
        setPwNotice({ type: 'success', text: 'Password updated.' });
        setNewPw('');
        setConfirmPw('');
    };

    const copyId = () => {
        navigator.clipboard.writeText(user.id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const PLAN = {
        active: { label: 'Active', cls: 'text-positive-300 border-positive-500/30 bg-positive-500/10' },
        pending: { label: 'Not started', cls: 'text-neutral-300 border-white/12 bg-white/5' },
        cancelled: { label: 'Cancelled', cls: 'text-danger-300 border-danger-500/30 bg-danger-500/10' },
    }[planStatus];

    const usedPct = dmLimit > 0 ? Math.min(dmUsed / dmLimit, 1) : 0;
    const resetsOn = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        .toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    const installed = extension.state === 'ready' || extension.state === 'legacy';
    const ext = extension.state === 'checking'
        ? { label: 'Checking…', cls: 'text-neutral-400 border-white/10 bg-white/5' }
        : !installed
            ? { label: 'Not installed', cls: 'text-neutral-300 border-white/12 bg-white/5' }
            : extension.needsUpdate
                ? { label: 'Update needed', cls: 'text-danger-300 border-danger-500/30 bg-danger-500/10' }
                : { label: 'Connected', cls: 'text-positive-300 border-positive-500/30 bg-positive-500/10' };

    return (
        <div className="px-4 py-6 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            <header className="pb-8">
                <h1 className="text-2xl font-semibold text-white tracking-tight">Account</h1>
                <p className="mt-1.5 text-body-sm text-neutral-400">Your profile, plan, connections and security.</p>
            </header>

            <div className="grid md:grid-cols-[11rem_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
                <nav aria-label="Account sections" className="hidden md:block sticky top-6">
                    <ul className="space-y-0.5">
                        {SECTIONS.map(s => (
                            <li key={s.id}>
                                <a
                                    href={`#${s.id}`}
                                    onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                                    className="block px-3 py-2 rounded-lg text-meta text-neutral-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                                >
                                    {s.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="space-y-6 min-w-0">
                    {/* Profile */}
                    <Card
                        id="profile"
                        title="Profile"
                        description="How you appear in MagnetEngine."
                        as="form"
                        onSubmit={saveName}
                        footer={
                            <>
                                <FooterNote notice={nameNotice}>Your first name is used in your dashboard greeting.</FooterNote>
                                <button type="submit" disabled={!nameDirty || nameSaving} className={PRIMARY}>
                                    {nameSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                                    Save
                                </button>
                            </>
                        }
                    >
                        <div className="flex items-center gap-5">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                aria-label={avatarUrl ? 'Change profile photo' : 'Add a profile photo'}
                                className="relative flex-none group w-16 h-16 rounded-2xl bg-neutral-800 ring-1 ring-white/10 overflow-hidden flex items-center justify-center"
                            >
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-2xl font-semibold text-white">{initial}</span>}
                                <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
                                    {avatarBusy ? <Loader2 className="w-4 h-4 text-white animate-spin" aria-hidden /> : <Camera className="w-4 h-4 text-white" aria-hidden />}
                                </span>
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            <div className="min-w-0">
                                <p className="text-body-sm font-medium text-white truncate">{fullName || user.email}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className={SECONDARY}>
                                        {avatarUrl ? 'Change photo' : 'Upload photo'}
                                    </button>
                                    {avatarUrl && (
                                        <button type="button" onClick={() => setAvatar(null)} className="px-2 py-2 text-meta text-neutral-400 hover:text-white">
                                            Remove
                                        </button>
                                    )}
                                </div>
                                <p className="mt-1.5 text-label text-neutral-500">Square images look best. Saved in this browser.</p>
                            </div>
                        </div>

                        <div className="mt-6 grid sm:grid-cols-2 gap-4">
                            <Field id="profile-first" label="First name">
                                <input id="profile-first" value={first} onChange={e => setFirst(e.target.value)} autoComplete="given-name" className={INPUT} />
                            </Field>
                            <Field id="profile-last" label="Last name">
                                <input id="profile-last" value={last} onChange={e => setLast(e.target.value)} autoComplete="family-name" className={INPUT} />
                            </Field>
                            <div className="sm:col-span-2">
                                <Field id="profile-email" label="Email" hint={<>Your sign-in email. To change it, email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-neutral-300 underline decoration-white/30 underline-offset-2 hover:text-white">{SUPPORT_EMAIL}</a>.</>}>
                                    <input id="profile-email" value={user.email ?? ''} disabled className={INPUT} />
                                </Field>
                            </div>
                        </div>
                    </Card>

                    {/* Plan & usage */}
                    <Card
                        id="plan"
                        title="Plan & usage"
                        description="What you pay for and how much of it you've used this month."
                        footer={
                            <>
                                <p className="text-meta text-neutral-400">Billing is handled by Whop. Member since {memberSince}.</p>
                                {!planLoading && planStatus !== 'active' ? (
                                    <Link to="/activate" className={PRIMARY}>Start the trial</Link>
                                ) : (
                                    <a href={`mailto:${SUPPORT_EMAIL}?subject=Billing`} className={SECONDARY}>Billing help</a>
                                )}
                            </>
                        }
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-body-sm font-semibold text-white">MagnetEngine</p>
                                <p className="mt-0.5 text-meta text-neutral-400 tabular-nums">
                                    {PRICES.monthly.label}{PRICES.monthly.suffix} · or {PRICES.annual.label}{PRICES.annual.suffix}
                                </p>
                            </div>
                            {planLoading
                                ? <span className="text-meta text-neutral-400">Checking…</span>
                                : <Pill cls={PLAN.cls}>{PLAN.label}</Pill>}
                        </div>

                        <div className="mt-6">
                            <div className="flex items-baseline justify-between gap-3">
                                <p className="text-meta text-neutral-300">AI-written DMs this month</p>
                                <p className="text-meta text-neutral-400 tabular-nums">
                                    <span className="text-white font-semibold">{dmUsed.toLocaleString('en-US')}</span> / {dmLimit.toLocaleString('en-US')}
                                </p>
                            </div>
                            <div
                                role="progressbar"
                                aria-label="AI-written DMs used this month"
                                aria-valuemin={0}
                                aria-valuemax={dmLimit}
                                aria-valuenow={dmUsed}
                                className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"
                            >
                                <div
                                    className={`h-full rounded-full ${usedPct >= 1 ? 'bg-danger-400' : 'bg-white'}`}
                                    style={{ width: `${usedPct * 100}%` }}
                                />
                            </div>
                            <p className="mt-2 text-label text-neutral-500">Resets on {resetsOn}.</p>
                        </div>
                    </Card>

                    {/* Connections */}
                    <Card id="connections" title="Connections" description="What MagnetEngine uses to send your DMs.">
                        <ul className="divide-y divide-white/8 -my-1">
                            <li className="flex flex-wrap items-center gap-4 py-3">
                                <span className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-none" aria-hidden>
                                    <Puzzle className="w-4 h-4 text-neutral-200" />
                                </span>
                                <div className="flex-1 min-w-[12rem]">
                                    <p className="text-body-sm font-medium text-white">Chrome extension</p>
                                    <p className="text-meta text-neutral-400">
                                        {installed
                                            ? `Sends your approved DMs from this browser${extension.version ? ` · v${extension.version}` : ''}.`
                                            : 'Needed to send DMs. Add it, then reload this page.'}
                                    </p>
                                </div>
                                <Pill cls={ext.cls}>{ext.label}</Pill>
                                {!installed && extension.state !== 'checking' && (
                                    <a href={EXTENSION_INSTALL_URL} target="_blank" rel="noreferrer" className={SECONDARY}>
                                        Add to Chrome <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                                    </a>
                                )}
                            </li>
                            <li className="flex flex-wrap items-center gap-4 py-3">
                                <span className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center flex-none" aria-hidden>
                                    <Instagram className="w-4 h-4 text-neutral-200" />
                                </span>
                                <div className="flex-1 min-w-[12rem]">
                                    <p className="text-body-sm font-medium text-white">Instagram</p>
                                    <p className="text-meta text-neutral-400">
                                        The account you're signed into in this browser. We never ask for your Instagram password and never store your login.
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </Card>

                    {/* Security */}
                    <Card
                        id="security"
                        title="Security"
                        description="Change your password. You stay signed in here afterwards."
                        as="form"
                        onSubmit={changePassword}
                        footer={
                            <>
                                <FooterNote notice={pwNotice}>At least 6 characters.</FooterNote>
                                <button type="submit" disabled={pwSaving || !newPw} className={PRIMARY}>
                                    {pwSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                                    Update password
                                </button>
                            </>
                        }
                    >
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field id="profile-new-password" label="New password">
                                <div className="relative">
                                    <input
                                        id="profile-new-password"
                                        type={showPw ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={newPw}
                                        onChange={e => setNewPw(e.target.value)}
                                        className={`${INPUT} pr-10`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(v => !v)}
                                        aria-label={showPw ? 'Hide passwords' : 'Show passwords'}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-400 hover:text-white"
                                    >
                                        {showPw ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                                    </button>
                                </div>
                            </Field>
                            <Field id="profile-confirm-password" label="Confirm new password">
                                <input
                                    id="profile-confirm-password"
                                    type={showPw ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={confirmPw}
                                    onChange={e => setConfirmPw(e.target.value)}
                                    className={INPUT}
                                />
                            </Field>
                        </div>
                        <div className="mt-5 flex flex-wrap items-center gap-3 text-meta">
                            <span className="text-neutral-400">Account ID</span>
                            <code className="font-mono text-label text-neutral-300 truncate max-w-full">{user.id}</code>
                            <button type="button" onClick={copyId} aria-label="Copy account ID" className="p-1.5 -m-1.5 rounded-lg text-neutral-400 hover:text-white">
                                {copied ? <Check className="w-3.5 h-3.5 text-positive-400" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
                            </button>
                            <span role="status" className="text-label text-positive-400">{copied ? 'Copied' : ''}</span>
                        </div>
                        <p className="mt-1 text-label text-neutral-500">Support may ask for this.</p>
                    </Card>

                    {/* Sign out & delete */}
                    <Card id="account" title="Sign out & delete" description="Leave this browser, or close your account." tone="danger">
                        <ul className="divide-y divide-white/8 -my-1">
                            <li className="flex flex-wrap items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-body-sm font-medium text-white">Sign out everywhere</p>
                                    <p className="text-meta text-neutral-400">Signs you out here and in every other browser where you're signed in.</p>
                                </div>
                                <button type="button" onClick={onLogout} className={SECONDARY}>
                                    <LogOut className="w-4 h-4" aria-hidden /> Sign out
                                </button>
                            </li>
                            <li className="flex flex-wrap items-center justify-between gap-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-body-sm font-medium text-white">Delete account</p>
                                    <p className="text-meta text-neutral-400">Deletes your account and your workspace data. Cancel your subscription first.</p>
                                </div>
                                <a
                                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my account')}&body=${encodeURIComponent(`Please delete my MagnetEngine account.\n\nAccount ID: ${user.id}`)}`}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-danger-500/30 text-meta font-medium text-danger-300 hover:bg-danger-500/10 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" aria-hidden /> Request deletion
                                </a>
                            </li>
                        </ul>
                    </Card>
                </div>
            </div>
        </div>
    );
};

/** One settings card: title and description, the content, and an optional footer bar for its action. */
const Card: React.FC<{
    id: string;
    title: string;
    description: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    tone?: 'danger';
    as?: 'form';
    onSubmit?: (e: React.FormEvent) => void;
}> = ({ id, title, description, children, footer, tone, as, onSubmit }) => {
    const bezel = tone === 'danger' ? CARD_BEZEL_DANGER : CARD_BEZEL;
    const body = (
        <>
            <div className="px-5 sm:px-6 pt-5 sm:pt-6">
                <h2 id={`${id}-title`} className="text-body font-semibold text-white">{title}</h2>
                <p className="mt-0.5 text-meta text-neutral-400">{description}</p>
            </div>
            <div className="px-5 sm:px-6 py-5">{children}</div>
            {footer && (
                <div className="px-5 sm:px-6 py-3.5 border-t border-white/8 bg-white/[0.015] flex flex-wrap items-center justify-between gap-3">
                    {footer}
                </div>
            )}
        </>
    );
    return (
        <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-[1.5rem] p-[1px]" style={bezel.outer}>
            {as === 'form' ? (
                <form onSubmit={onSubmit} className="bg-surface-sunken rounded-[calc(1.5rem-1px)] overflow-hidden" style={bezel.inner}>{body}</form>
            ) : (
                <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] overflow-hidden" style={bezel.inner}>{body}</div>
            )}
        </section>
    );
};

const Field: React.FC<{ id: string; label: string; hint?: React.ReactNode; children: React.ReactNode }> = ({ id, label, hint, children }) => (
    <div>
        <label htmlFor={id} className="block text-meta font-medium text-neutral-300 mb-1.5">{label}</label>
        {children}
        {hint && <p className="mt-1.5 text-label text-neutral-500">{hint}</p>}
    </div>
);

const Pill: React.FC<{ cls: string; children: React.ReactNode }> = ({ cls, children }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-label font-semibold ${cls}`}>{children}</span>
);

/** The footer's left side: a result once there is one, the helper text until then. */
const FooterNote: React.FC<{ notice: Notice; children: React.ReactNode }> = ({ notice, children }) =>
    notice ? (
        <p
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-1.5 text-meta ${notice.type === 'success' ? 'text-positive-300' : 'text-danger-300'}`}
        >
            {notice.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" aria-hidden /> : <AlertCircle className="w-3.5 h-3.5" aria-hidden />}
            {notice.text}
        </p>
    ) : (
        <p className="text-meta text-neutral-400">{children}</p>
    );

export default ProfilePage;
