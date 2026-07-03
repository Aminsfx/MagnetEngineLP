import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from '../lib/auth';

/**
 * Landing page for the Supabase password-recovery email link.
 * The link contains a recovery token; the Supabase client (detectSessionInUrl)
 * exchanges it for a session automatically, after which we can call
 * auth.updateUser({ password }) to set the new password.
 */
const ResetPasswordPage: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);

    // Give the client a moment to consume the recovery token from the URL
    const [waited, setWaited] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setWaited(true), 2500);
        return () => clearTimeout(t);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPw.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (newPw !== confirmPw) {
            setError('Passwords do not match.');
            return;
        }

        setIsSaving(true);
        const err = await updatePassword(newPw);
        setIsSaving(false);

        if (err) {
            setError(err);
        } else {
            setDone(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        }
    };

    const shell = (content: React.ReactNode) => (
        <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/10 to-black pointer-events-none z-0" />
            <div className="relative z-10 w-full max-w-md">{content}</div>
        </div>
    );

    // Still resolving the recovery session
    if (loading || (!user && !waited)) {
        return shell(
            <div className="text-center text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-4" />
                <p className="text-sm">Verifying reset link…</p>
            </div>
        );
    }

    // Recovery token missing / expired
    if (!user) {
        return shell(
            <div className="text-center">
                <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Link expired or invalid</h1>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                    This password-reset link is no longer valid. Request a new one from the sign-in page.
                </p>
                <Link to="/login" className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors">
                    ← Back to sign in
                </Link>
            </div>
        );
    }

    if (done) {
        return shell(
            <div className="text-center">
                <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Password updated</h1>
                <p className="text-zinc-400 text-sm">Taking you to your dashboard…</p>
            </div>
        );
    }

    return shell(
        <>
            <Link
                to="/login"
                className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-8 group"
            >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back to sign in
            </Link>

            <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-white mb-1">Choose a new password</h1>
                    <p className="text-zinc-500 text-sm">for {user.email}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder="Repeat password"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold py-3 rounded-full transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                    </button>
                </form>
            </div>
        </>
    );
};

export default ResetPasswordPage;
