import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../lib/plans';
import { DASHBOARD_ROUTES, type DashboardPath } from '../lib/routes';
import Logo from './Logo';

/**
 * The dashboard's left rail.
 *
 * Operate register: the visitor came to do a job, so the chrome recedes. Rows
 * are compact and quiet, the active state is a flat wash plus a rail marker
 * rather than a glow, and the only colour in here is `danger` on sign-out —
 * the dashboard carries no brand accent by design (docs/DESIGN-TOKENS.md).
 *
 * The ambient bloom, the shadowed indicator and the live clock that used to sit
 * at the bottom belonged to the previous visual world; a clock in a sidebar
 * reports nothing the operator needs. The account row replaced it because it
 * answers a question the operator actually has — which account am I in.
 */
interface SidebarProps {
    onLogout?: () => void;
    /** Mobile: whether the slide-in sidebar is visible (always visible ≥ lg) */
    isOpen?: boolean;
    /** Mobile: called after a nav link is clicked so the parent can close the drawer */
    onNavigate?: () => void;
    /**
     * Work waiting behind a page — drafts to review, conversations to answer.
     * The count is the same one the home page's Today panel shows.
     */
    badges?: Partial<Record<DashboardPath, number>>;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen = false, onNavigate, badges = {} }) => {
    const location = useLocation();
    const { user } = useAuth();

    const navItems = [
        ...DASHBOARD_ROUTES,
        // Owner-only console — hidden for regular members. Not a dashboard
        // route: /admin lives outside the shell and has its own guard.
        ...(isAdminEmail(user?.email) ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
    ];

    return (
        <aside
            className={`w-60 h-screen bg-surface border-r border-white/8 flex flex-col fixed left-0 top-0 z-40 transform transition-transform duration-300 lg:translate-x-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            <div className="px-3 pt-5 pb-3">
                <div className="px-2">
                    <Logo subtitle="AI Lead Automation" />
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-px overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const badge = badges[item.path as DashboardPath] ?? 0;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={onNavigate}
                            aria-current={isActive ? 'page' : undefined}
                            className={`relative flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-meta font-medium transition-colors duration-200 ${
                                isActive
                                    ? 'text-white bg-white/8'
                                    : 'text-neutral-400 hover:text-white hover:bg-white/4'
                            }`}
                        >
                            {isActive && (
                                <span
                                    aria-hidden
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-white"
                                />
                            )}
                            <item.icon
                                size={15}
                                strokeWidth={2}
                                className={isActive ? 'text-white' : 'text-neutral-400'}
                                aria-hidden
                            />
                            <span className="truncate">{item.label}</span>
                            {badge > 0 && (
                                <span className="ml-auto min-w-[1.25rem] px-1.5 py-0.5 rounded-full bg-white text-surface text-label font-semibold text-center tabular-nums">
                                    {badge}
                                    <span className="sr-only"> waiting</span>
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-3 py-3 border-t border-white/8">
                {user?.email && (
                    <p
                        className="px-2.5 pb-2 text-label text-neutral-400 truncate"
                        title={user.email}
                    >
                        {user.email}
                    </p>
                )}
                <button
                    type="button"
                    onClick={async () => {
                        // Await sign-out before any navigation so the session is
                        // actually cleared (App's onLogout handles the redirect)
                        await onLogout?.();
                    }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-meta font-medium text-neutral-400 hover:text-danger-400 hover:bg-danger-500/10 transition-colors duration-200"
                >
                    <LogOut size={15} strokeWidth={2} aria-hidden />
                    Sign out
                </button>
            </div>
        </aside>
    );
};
