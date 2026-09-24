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
        <div className="relative min-h-screen bg-surface flex items-center justify-center p-4 overflow-hidden">
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />

            <div className="relative z-10 w-full max-w-md text-center">
                <div className="inline-flex w-16 h-16 items-center justify-center rounded-full bg-white/[0.04] border border-white/10 mb-6 mx-auto">
                    <Compass className="w-7 h-7 text-white" aria-hidden />
                </div>
                <p className="text-5xl font-bold text-white tracking-tight mb-2">404</p>
                <h1 className="text-lg font-semibold text-white mb-2">Page not found</h1>
                <p className="text-neutral-400 text-sm leading-relaxed mb-8">
                    That page doesn't exist. Check the URL, or head back to somewhere that does.
                </p>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-white/12 text-neutral-200 hover:text-white hover:border-white/30 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" /> Home
                    </Link>
                    {user && (
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center gap-2 h-10 px-5 bg-white hover:bg-neutral-200 text-surface font-semibold rounded-full transition-colors text-sm"
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
