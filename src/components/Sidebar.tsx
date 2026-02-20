import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Kanban, Calculator, Settings, Zap, LogOut, Database } from 'lucide-react';

interface SidebarProps {
    onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Database, label: 'Leads', path: '/leads' },
        { icon: Users, label: 'CRM', path: '/crm' },
        { icon: Kanban, label: 'Pipeline', path: '/pipeline' },
        { icon: Calculator, label: 'Calculator', path: '/calculator' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <aside className="w-64 h-screen bg-[#0B0F19] border-r border-[#1E293B] flex flex-col fixed left-0 top-0">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Magnet Engine</h1>
                        <p className="text-xs text-zinc-600">AI Lead Automation</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-blue-600/10 text-blue-500 border border-blue-600/20'
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4">
                <button
                    onClick={() => {
                        if (onLogout) onLogout();
                        window.location.href = '/';
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </aside>
    );
};
