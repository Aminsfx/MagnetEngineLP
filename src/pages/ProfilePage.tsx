import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, Copy, Check, Camera, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlan } from '../contexts/PlanContext';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfilePageProps {
    user: SupabaseUser;
    onLogout: () => void;
}

const AVATAR_KEY = (id: string) => `avatar_${id}`;

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onLogout }) => {
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem(AVATAR_KEY(user.id)));
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { status: planStatus, loading: planLoading } = usePlan();

    useEffect(() => {
        setAvatarUrl(localStorage.getItem(AVATAR_KEY(user.id)));
    }, [user.id]);

    const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

    const firstName = (user.user_metadata?.first_name as string | undefined) ?? '';
    const lastName = (user.user_metadata?.last_name as string | undefined) ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const initial = (firstName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase();

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Resize to max 256px via canvas to keep localStorage size small
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height, 256);
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d')!;
                const scale = size / Math.min(img.width, img.height);
                const sx = (img.width - size / scale) / 2;
                const sy = (img.height - size / scale) / 2;
                ctx.drawImage(img, sx, sy, size / scale, size / scale, 0, 0, size, size);
                const resized = canvas.toDataURL('image/jpeg', 0.85);
                localStorage.setItem(AVATAR_KEY(user.id), resized);
                setAvatarUrl(resized);
                window.dispatchEvent(new CustomEvent('avatar-updated', { detail: resized }));
                setAvatarUploading(false);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(user.id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwMessage(null);

        if (newPw.length < 6) {
            setPwMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }
        if (newPw !== confirmPw) {
            setPwMessage({ type: 'error', text: "The two passwords don't match. Type the same one in both fields." });
            return;
        }

        setPwLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPw });
        setPwLoading(false);

        if (error) {
            setPwMessage({ type: 'error', text: error.message });
        } else {
            setPwMessage({ type: 'success', text: 'Password updated.' });
            setNewPw('');
            setConfirmPw('');
        }
    };

    /*
     * An account page, read top to bottom as one document: who you are, what
     * you pay for, how you sign in, and how to leave. It used to be three
     * bezelled cards with cards inside them, a glowing gradient avatar and a
     * "Member Plan" badge that said the same thing for every account whatever
     * its real state. The badge now reads the subscription.
     */
    const PLAN = {
        active: { label: 'Active', tone: 'text-positive-300', dot: 'bg-positive-400', note: 'Your trial or subscription is running.' },
        pending: { label: 'Not started', tone: 'text-neutral-200', dot: 'bg-neutral-400', note: 'Start the trial to open the dashboard.' },
        cancelled: { label: 'Cancelled', tone: 'text-danger-300', dot: 'bg-danger-400', note: 'Your access has ended.' },
    }[planStatus];

    return (
        <div className="px-4 py-6 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
            {/* Who */}
            <header className="flex items-center gap-5 pb-8 border-b border-white/8">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={avatarUrl ? 'Change profile photo' : 'Add a profile photo'}
                    className="relative flex-shrink-0 group w-20 h-20 rounded-2xl bg-neutral-800 ring-1 ring-white/10 overflow-hidden flex items-center justify-center"
                >
                    {avatarUrl
                        ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-3xl font-semibold text-white">{initial}</span>
                    }
                    <span className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center">
                        {avatarUploading
                            ? <Loader2 className="w-5 h-5 text-white animate-spin" aria-hidden />
                            : <Camera className="w-5 h-5 text-white" aria-hidden />}
                    </span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-white tracking-tight truncate">{fullName || user.email}</h1>
                    {fullName && <p className="text-body-sm text-neutral-400 truncate mt-0.5">{user.email}</p>}
                    <p className="mt-2 flex items-center gap-2 text-meta">
                        {planLoading ? (
                            <span className="text-neutral-400">Checking subscription…</span>
                        ) : (
                            <>
                                <span className={`w-1.5 h-1.5 rounded-full ${PLAN.dot}`} aria-hidden />
                                <span className={`font-semibold ${PLAN.tone}`}>{PLAN.label}</span>
                                <span className="text-neutral-500" aria-hidden>·</span>
                                <span className="text-neutral-400">Member since {memberSince}</span>
                            </>
                        )}
                    </p>
                </div>
            </header>

            {/* Account */}
            <Section title="Account" note="Your sign-in email and the ID support may ask for.">
                <dl className="divide-y divide-white/8">
                    {fullName && <Row term="Name">{fullName}</Row>}
                    <Row term="Email">{user.email}</Row>
                    <Row term="Member since">{memberSince}</Row>
                    <Row term="User ID">
                        <span className="flex items-center gap-2 min-w-0">
                            <code className="font-mono text-meta text-neutral-300 truncate">{user.id}</code>
                            <button
                                type="button"
                                onClick={handleCopyId}
                                aria-label="Copy user ID"
                                className="flex-none p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-positive-400" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
                            </button>
                            <span role="status" className="text-label text-positive-400">{copied ? 'Copied' : ''}</span>
                        </span>
                    </Row>
                </dl>
            </Section>

            {/* Subscription */}
            <Section title="Subscription" note="One plan. Billing is handled by Whop.">
                <dl className="divide-y divide-white/8">
                    <Row term="Status">
                        {planLoading ? 'Checking…' : <span className={`font-semibold ${PLAN.tone}`}>{PLAN.label}</span>}
                    </Row>
                </dl>
                {!planLoading && (
                    <p className="mt-3 text-meta text-neutral-400">
                        {PLAN.note}{' '}
                        {planStatus !== 'active' && (
                            <Link to="/activate" className="font-medium text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                                Start the trial
                            </Link>
                        )}
                    </p>
                )}
            </Section>

            {/* Password */}
            <Section title="Password" note="At least 6 characters. You stay signed in here after changing it.">
                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <div>
                        <label htmlFor="profile-new-password" className="block text-meta font-medium text-neutral-300 mb-2">New password</label>
                        <input
                            id="profile-new-password"
                            type="password"
                            autoComplete="new-password"
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            required
                            className="w-full bg-surface-raised border border-white/10 rounded-xl px-4 py-2.5 text-body-sm text-white hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/25 focus:border-white/40 transition-colors"
                        />
                    </div>
                    <div>
                        <label htmlFor="profile-confirm-password" className="block text-meta font-medium text-neutral-300 mb-2">Type it again</label>
                        <input
                            id="profile-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)}
                            required
                            className="w-full bg-surface-raised border border-white/10 rounded-xl px-4 py-2.5 text-body-sm text-white hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/25 focus:border-white/40 transition-colors"
                        />
                    </div>

                    {pwMessage && (
                        <div
                            role={pwMessage.type === 'error' ? 'alert' : 'status'}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-meta ${
                                pwMessage.type === 'success'
                                    ? 'bg-positive-500/8 border-positive-500/25 text-positive-300'
                                    : 'bg-danger-500/8 border-danger-500/25 text-danger-300'
                            }`}
                        >
                            {pwMessage.type === 'success'
                                ? <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
                                : <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />}
                            {pwMessage.text}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={pwLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-surface text-body-sm font-semibold hover:bg-neutral-200 transition-[background-color,transform] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {pwLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                        Update password
                    </button>
                </form>
            </Section>

            {/* Sign out */}
            <Section title="Sign out" note="Signs you out here and in every other browser where you're signed in.">
                <button
                    type="button"
                    onClick={onLogout}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-danger-500/30 text-danger-300 text-body-sm font-medium hover:bg-danger-500/10 transition-colors"
                >
                    <LogOut className="w-4 h-4" aria-hidden />
                    Sign out everywhere
                </button>
            </Section>
        </div>
    );
};

/** One labelled band of the page: title and a line of context left, content right. */
const Section: React.FC<{ title: string; note: string; children: React.ReactNode }> = ({ title, note, children }) => (
    <section className="grid md:grid-cols-[minmax(0,14rem)_1fr] gap-4 md:gap-10 py-8 border-b border-white/8 last:border-b-0">
        <div>
            <h2 className="text-body-sm font-semibold text-white">{title}</h2>
            <p className="mt-1 text-meta text-neutral-400">{note}</p>
        </div>
        <div className="min-w-0">{children}</div>
    </section>
);

/** One fact in a definition list. */
const Row: React.FC<{ term: string; children: React.ReactNode }> = ({ term, children }) => (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-3 first:pt-0 items-center">
        <dt className="text-meta text-neutral-400">{term}</dt>
        <dd className="text-body-sm text-neutral-200 min-w-0 truncate">{children}</dd>
    </div>
);

export default ProfilePage;
