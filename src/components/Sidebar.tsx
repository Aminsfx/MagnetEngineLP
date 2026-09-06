import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Zap, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isAdminEmail } from '../lib/plans';
import { DASHBOARD_ROUTES } from '../lib/routes';
import Logo from './Logo';

interface SidebarProps {
    onLogout?: () => void;
    /** Mobile: whether the slide-in sidebar is visible (always visible ≥ lg) */
    isOpen?: boolean;
    /** Mobile: called after a nav link is clicked so the parent can close the drawer */
    onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, isOpen = false, onNavigate }) => {
    const location = useLocation();
    const { user } = useAuth();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const navItems = [
        ...DASHBOARD_ROUTES,
        // Owner-only console — hidden for regular members. Not a dashboard
        // route: /admin lives outside the shell and has its own guard.
        ...(isAdminEmail(user?.email) ? [{ icon: Shield, label: 'Admin', path: '/admin' }] : []),
    ];

    return (
        <aside className={`w-64 h-screen bg-[#030604] border-r border-white/5 flex flex-col fixed left-0 top-0 overflow-hidden z-40 transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {/* Ambient glow matching landing page */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[300px] rounded-[100%] bg-gradient-to-t from-emerald-500/10 via-transparent to-transparent blur-[60px] pointer-events-none" />

            <div className="p-6 flex flex-col h-full relative z-10">
                {/* Logo */}
                <div className="mb-6">
                    <Logo subtitle="AI Lead Automation" />
                </div>

                {/* Nav */}
                <nav className="space-y-0.5 flex-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={onNavigate}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative overflow-hidden ${
                                    isActive
                                        ? 'text-emerald-400'
                                        : 'text-zinc-500 hover:text-white'
                                }`}
                            >
                                {/* Active background */}
                                <span
                                    className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                                        isActive
                                            ? 'bg-emerald-500/10 border border-emerald-500/20'
                                            : 'bg-transparent group-hover:bg-white/5'
                                    }`}
                                />
                                {/* Active indicator line */}
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-emerald-500 rounded-r-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                )}
                                <item.icon className={`w-4 h-4 relative z-10 transition-transform duration-300 ${isActive ? '' : 'group-hover:scale-110'}`} />
                                <span className="relative z-10 flex-1">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    {/* Live clock */}
                    <div className="px-4 py-2 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Zap className="w-3 h-3 text-emerald-600" />
                    </div>

                    <button
                        onClick={async () => {
                            // Await sign-out before any navigation so the session is
                            // actually cleared (App's onLogout handles the redirect)
                            await onLogout?.();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-600 hover:text-red-400 hover:bg-red-400/8 transition-all duration-300 group"
                    >
                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
};
