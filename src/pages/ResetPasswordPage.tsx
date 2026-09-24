import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle } from 'lucide-react';
import { AuthShell, AuthHeading, PasswordField, FormError, SubmitButton } from '../components/auth/AuthShell';
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
            setError("The two passwords don't match. Type the same one in both fields.");
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

    const shell = (content: React.ReactNode) => <AuthShell>{content}</AuthShell>;

    // Still resolving the recovery session
    if (loading || (!user && !waited)) {
        return shell(
            <div role="status" className="flex items-center gap-3 text-neutral-300">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-300" aria-hidden />
                <p className="text-body-sm">Checking your reset link…</p>
            </div>
        );
    }

    // Recovery token missing / expired
    if (!user) {
        return shell(
            <>
                <AuthHeading title="This link has expired">
                    Reset links work once and expire after a while. Ask for a new one and use the newest email.
                </AuthHeading>
                <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full h-12 rounded-full bg-white hover:bg-neutral-200 text-surface text-body-sm font-semibold transition-colors"
                >
                    Request a new link
                </Link>
            </>
        );
    }

    if (done) {
        return shell(
            <div role="status">
                <CheckCircle className="w-7 h-7 text-positive-400 mb-6" aria-hidden />
                <AuthHeading title="Password updated">Taking you to your dashboard…</AuthHeading>
            </div>
        );
    }

    return shell(
        <>
            <AuthHeading title="Choose a new password">
                For <span className="text-white font-medium">{user.email}</span>.
            </AuthHeading>

            <form onSubmit={handleSubmit} className="space-y-5">
                <PasswordField
                    id="new-password" label="New password" required minLength={6} autoComplete="new-password"
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                    hint={<p className="text-label text-neutral-400">At least 6 characters</p>}
                />
                <PasswordField
                    id="confirm-password" label="Type it again" required minLength={6} autoComplete="new-password"
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                />

                {error && <FormError>{error}</FormError>}

                <SubmitButton loading={isSaving}>Save new password</SubmitButton>
                <Link to="/login" className="inline-block text-meta font-medium text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white">
                    Back to sign in
                </Link>
            </form>
        </>
    );
};

export default ResetPasswordPage;
