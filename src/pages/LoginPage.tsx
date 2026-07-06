import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Loader2, CheckCircle, AlertCircle, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'signup' | 'forgot';

const LoginPage: React.FC = () => {
    // Deep link support: /login?mode=signup opens the Create Account tab
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<Mode>(
        searchParams.get('mode') === 'signup' ? 'signup' : 'login'
    );
    const [showPw, setShowPw] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmEmail, setConfirmEmail] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const { signIn, signUp, resetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const err = await signIn(email, password);
                if (err) {
                    setError(err);
                } else {
                    navigate('/dashboard');
                }
            } else if (mode === 'forgot') {
                const err = await resetPassword(email);
                if (err) {
                    setError(err);
                } else {
                    setResetSent(true);
                }
            } else {
                const result = await signUp(email, password, firstName.trim(), lastName.trim());
                if (result === '__CONFIRM_EMAIL__') {
                    setConfirmEmail(true);
                } else if (result) {
                    setError(result);
                } else {
                    // New accounts land on the activation page until the owner
                    // confirms payment — ProtectedRoute enforces this too.
                    navigate('/activate');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (resetSent) {
        return (
            <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
                <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
                <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/10 to-black pointer-events-none z-0" />
                <div className="relative z-10 w-full max-w-md text-center">
                    <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6 mx-auto">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        If an account exists for <span className="text-white font-medium">{email}</span>,
                        we sent a password-reset link. Click it to choose a new password.
                    </p>
                    <button
                        onClick={() => { setResetSent(false); setMode('login'); setError(null); }}
                        className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                        ← Back to sign in
                    </button>
                </div>
            </div>
        );
    }

    if (confirmEmail) {
        return (
            <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
                <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
                <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/10 to-black pointer-events-none z-0" />
                <div className="relative z-10 w-full max-w-md text-center">
                    <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6 mx-auto">
                        <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
                    <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                        We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                        Click it to activate your account, then come back to log in.
                    </p>
                    <button
                        onClick={() => { setConfirmEmail(false); setMode('login'); }}
                        className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
                    >
                        ← Back to sign in
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/10 to-black pointer-events-none z-0" />

            <div className="relative z-10 w-full max-w-md">
                <Link
                    to="/"
                    className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to landing page
                </Link>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                    {/* Tab switcher */}
                    <div className="flex bg-black/30 rounded-xl p-1 mb-8 border border-white/8">
                        {(['login', 'signup'] as Mode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => { setMode(m); setError(null); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                                    mode === m
                                        ? 'bg-emerald-500 text-emerald-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                                        : 'text-zinc-500 hover:text-white'
                                }`}
                            >
                                {m === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold text-white mb-1">
                            {mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Reset your password' : 'Get started'}
                        </h1>
                        <p className="text-zinc-500 text-sm">
                            {mode === 'login'
                                ? 'Enter your credentials to access your dashboard'
                                : mode === 'forgot'
                                ? "Enter your email and we'll send you a reset link"
                                : 'Create your MagnetEngine account'
                            }
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* First + Last name — signup only */}
                        {mode === 'signup' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                        <input
                                            type="text"
                                            required
                                            autoComplete="given-name"
                                            value={firstName}
                                            onChange={e => setFirstName(e.target.value)}
                                            placeholder="John"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                        <input
                                            type="text"
                                            required
                                            autoComplete="family-name"
                                            value={lastName}
                                            onChange={e => setLastName(e.target.value)}
                                            placeholder="Doe"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password — hidden in forgot mode */}
                        {mode !== 'forgot' && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                    <input
                                        id="password"
                                        type={showPw ? 'text' : 'password'}
                                        required
                                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        minLength={6}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-11 text-white text-sm placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all"
                                    />
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => setShowPw(v => !v)}
                                        aria-label={showPw ? 'Hide password' : 'Show password'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                                    >
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {mode === 'signup' && password.length > 0 && password.length < 6 && (
                                    <p className="text-[11px] text-amber-400/90 mt-1.5">
                                        Password must be at least 6 characters ({6 - password.length} more to go)
                                    </p>
                                )}
                                {mode === 'login' && (
                                    <div className="text-right mt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setMode('forgot'); setError(null); }}
                                            className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Error state */}
                        {error && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/20">
                                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        {/* Sign-up info */}
                        {mode === 'signup' && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/4 border border-white/8">
                                <User className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    By creating an account you agree to our{' '}
                                    <Link to="/terms" className="text-emerald-500/90 hover:text-emerald-400 underline underline-offset-2">Terms of Service</Link>
                                    {' '}and{' '}
                                    <Link to="/privacy" className="text-emerald-500/90 hover:text-emerald-400 underline underline-offset-2">Privacy Policy</Link>.
                                    After sign-up you'll pick a plan and complete payment to unlock your dashboard.
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            id="auth-submit-btn"
                            disabled={isLoading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold py-3 rounded-full transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 group disabled:opacity-70 mt-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Send Reset Link' : 'Create Account'}
                                    <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        {mode === 'forgot' && (
                            <button
                                type="button"
                                onClick={() => { setMode('login'); setError(null); }}
                                className="w-full text-center text-xs text-zinc-500 hover:text-white transition-colors"
                            >
                                ← Back to sign in
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
