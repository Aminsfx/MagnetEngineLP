import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthShell, AuthHeading, Field, PasswordField, FormError, SubmitButton, TextAction } from '../components/auth/AuthShell';
import { TrialTimeline } from '../components/auth/TrialTimeline';
import { ApprovalPreview } from '../components/ApprovalPreview';
import { trackEvent } from '../lib/landingVariant';

type Mode = 'login' | 'signup' | 'forgot';

const MIN_PASSWORD = 6;

/** The right half on sign-in: the thing waiting on the other side of the form. */
const SignInAside: React.FC = () => (
    <>
        <ApprovalPreview stacked tone="mono" />
        <p className="mt-4 text-body-sm text-neutral-400 max-w-[46ch]">
            Your queue picks up where you left off — every draft written from the profile it was sent to.
        </p>
    </>
);

/** The right half on sign-up: exactly what happens next, dated. */
const SignUpAside: React.FC = () => (
    <>
        <h2 className="text-[1.6rem] leading-tight font-semibold text-white tracking-[-0.02em] mb-8 max-w-[22ch]">
            Here is everything that happens next.
        </h2>
        <TrialTimeline at={0} />
    </>
);

const LoginPage: React.FC = () => {
    // Deep link support: /login?mode=signup opens sign-up
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sentTo, setSentTo] = useState<null | 'confirm' | 'reset'>(null);

    const { signIn, signUp, resetPassword } = useAuth();
    const navigate = useNavigate();

    const switchTo = (next: Mode) => { setMode(next); setError(null); };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (mode === 'login') {
                const err = await signIn(email, password);
                if (err) setError(err);
                else navigate('/dashboard');
            } else if (mode === 'forgot') {
                const err = await resetPassword(email);
                if (err) setError(err);
                else setSentTo('reset');
            } else {
                const result = await signUp(email, password, firstName.trim(), lastName.trim());
                if (result === '__CONFIRM_EMAIL__') {
                    trackEvent('sign_up', { method: 'email' });
                    setSentTo('confirm');
                } else if (result) {
                    setError(result);
                } else {
                    trackEvent('sign_up', { method: 'email' });
                    // New accounts land on the activation page until payment is
                    // confirmed — ProtectedRoute enforces this too.
                    navigate('/activate');
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    // ── "Check your email" — after a reset request or an unconfirmed sign-up ──
    if (sentTo) {
        return (
            <AuthShell aside={sentTo === 'confirm' ? <SignUpAside /> : <SignInAside />}>
                <MailCheck className="w-7 h-7 text-white mb-6" aria-hidden />
                <AuthHeading title="Check your email">
                    {sentTo === 'confirm' ? (
                        <>We sent a confirmation link to <span className="text-white font-medium">{email}</span>. Open it to confirm your account, then come back and sign in.</>
                    ) : (
                        <>If there's an account for <span className="text-white font-medium">{email}</span>, a reset link is on its way. It opens a page where you choose a new password.</>
                    )}
                </AuthHeading>
                <p className="text-meta text-neutral-400 mb-6">Nothing after a minute? Check spam, or try again.</p>
                <TextAction onClick={() => { setSentTo(null); switchTo('login'); }}>Back to sign in</TextAction>
            </AuthShell>
        );
    }

    const heading = {
        login: { title: 'Sign in', sub: <>New here? <TextAction onClick={() => switchTo('signup')}>Start the 3-day trial</TextAction></> },
        signup: { title: 'Start your 3-day trial', sub: <>Already have an account? <TextAction onClick={() => switchTo('login')}>Sign in</TextAction></> },
        forgot: { title: 'Reset your password', sub: <>Enter the email you signed up with and we'll send you a link to choose a new one.</> },
    }[mode];

    return (
        <AuthShell aside={mode === 'signup' ? <SignUpAside /> : <SignInAside />}>
            <AuthHeading title={heading.title}>{heading.sub}</AuthHeading>

            <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'signup' && (
                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            id="first-name" label="First name" required autoComplete="given-name"
                            value={firstName} onChange={e => setFirstName(e.target.value)}
                        />
                        <Field
                            id="last-name" label="Last name" required autoComplete="family-name"
                            value={lastName} onChange={e => setLastName(e.target.value)}
                        />
                    </div>
                )}

                <Field
                    id="email" label="Email" type="email" required autoComplete="email" inputMode="email"
                    value={email} onChange={e => setEmail(e.target.value)} placeholder="you@youragency.com"
                />

                {mode !== 'forgot' && (
                    <PasswordField
                        id="password"
                        label="Password"
                        required
                        minLength={MIN_PASSWORD}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        aside={mode === 'login' && (
                            <TextAction className="!text-label" onClick={() => switchTo('forgot')}>Forgot password?</TextAction>
                        )}
                        hint={mode === 'signup' && (
                            <p className={`text-label ${password.length > 0 && password.length < MIN_PASSWORD ? 'text-caution-300' : 'text-neutral-400'}`}>
                                At least {MIN_PASSWORD} characters
                                {password.length > 0 && password.length < MIN_PASSWORD && ` — ${MIN_PASSWORD - password.length} more to go`}
                            </p>
                        )}
                    />
                )}

                {error && <FormError>{error}</FormError>}

                <SubmitButton loading={isLoading}>
                    {mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset link' : 'Create account'}
                </SubmitButton>

                {mode === 'signup' && (
                    <p className="text-label text-neutral-400">
                        Next you'll start the trial — card required, nothing charged for 3 days. By creating an account you
                        agree to the <Link to="/terms" className="text-neutral-200 underline decoration-white/25 underline-offset-2 hover:decoration-white">Terms</Link> and{' '}
                        <Link to="/privacy" className="text-neutral-200 underline decoration-white/25 underline-offset-2 hover:decoration-white">Privacy Policy</Link>.
                    </p>
                )}

                {mode === 'forgot' && (
                    <TextAction onClick={() => switchTo('login')}>Back to sign in</TextAction>
                )}
            </form>
        </AuthShell>
    );
};

export default LoginPage;
