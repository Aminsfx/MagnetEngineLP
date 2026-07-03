import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { usePlan } from './contexts/PlanContext';
import { Loader2 } from 'lucide-react';

// Route-level code splitting: visitors hitting the landing page don't download
// the dashboard bundle (recharts etc.), and vice versa.
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PendingActivationPage = lazy(() => import('./pages/PendingActivationPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const DashboardShell = lazy(() => import('./pages/DashboardShell'));

// ─── Route guards ─────────────────────────────────────────────────────────────
const AuthLoader: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-screen bg-[#030604] flex items-center justify-center">
    <div className="flex items-center gap-3 text-zinc-600">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
      <span className="text-sm font-mono">{label}</span>
    </div>
  </div>
);

/** Requires a signed-in user AND an owner-activated (paid) subscription. */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { status, loading: planLoading } = usePlan();

  if (loading) return <AuthLoader label="Authenticating…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (planLoading) return <AuthLoader label="Checking your access…" />;
  if (status !== 'active') return <Navigate to="/activate" replace />;
  return <>{children}</>;
};

/** Requires only a signed-in user — used by the activation page itself. */
const RequireUser: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoader label="Authenticating…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// ─── Root App ─────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  return (
    <Suspense fallback={<AuthLoader label="Loading…" />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/activate"
          element={
            <RequireUser>
              <PendingActivationPage />
            </RequireUser>
          }
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardShell />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default App;
