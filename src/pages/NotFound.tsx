import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Public 404. Unknown URLs land here instead of being funneled through the
 * auth loader into the dashboard.
 */
const NotFound: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-emerald-900/10 to-black pointer-events-none z-0" />

            <div className="relative z-10 w-full max-w-md text-center">
                <div className="inline-flex w-16 h-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6 mx-auto">
                    <Compass className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-5xl font-bold text-white tracking-tight mb-2">404</p>
                <h1 className="text-lg font-semibold text-white mb-2">Page not found</h1>
                <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                    That page doesn't exist. Check the URL, or head back to somewhere that does.
                </p>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-all text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Home
                    </Link>
                    {user && (
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold rounded-xl transition-all text-sm"
                        >
                            <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotFound;
