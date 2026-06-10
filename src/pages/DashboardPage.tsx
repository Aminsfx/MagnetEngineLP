import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Users, Settings, Zap, BarChart3, Search } from 'lucide-react';
import Logo from '../components/Logo';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen bg-[#050A08] text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-[#030604] flex flex-col">
                <div className="p-6">
                    <div className="mb-8 pl-1">
                        <Logo size="sm" />
                    </div>

                    <nav className="space-y-1">
                        {[
                            { icon: LayoutDashboard, label: 'Dashboard', active: true },
                            { icon: Users, label: 'Prospects' },
                            { icon: BarChart3, label: 'Analytics' },
                            { icon: Settings, label: 'Settings' },
                        ].map((item) => (
                            <a
                                key={item.label}
                                href="#"
                                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${item.active
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </nav>
                </div>

                <div className="mt-auto p-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b border-white/10 bg-[#030604] flex items-center justify-between px-8">
                    <div className="relative w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search prospects..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 border border-white/20" />
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-baseline justify-between mb-8">
                            <h2 className="text-3xl font-bold">Good evening, Admin</h2>
                            <p className="text-zinc-500">Your pipeline is looking strong today.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mb-8">
                            {[
                                { label: 'Total Prospects', value: '1,284', change: '+12%' },
                                { label: 'Responses', value: '342', change: '+5.4%' },
                                { label: 'Meetings Booked', value: '28', change: '+18%' },
                            ].map((stat) => (
                                <div key={stat.label} className="bg-[#030604] border border-white/5 p-6 rounded-2xl">
                                    <p className="text-sm text-zinc-500 mb-1">{stat.label}</p>
                                    <div className="flex items-end space-x-3">
                                        <span className="text-3xl font-bold">{stat.value}</span>
                                        <span className="text-xs font-medium text-green-500 pb-1">{stat.change}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-[#030604] border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h3 className="font-semibold">Recent Activity</h3>
                            </div>
                            <div className="divide-y divide-white/10">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-sm font-medium"> JD </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">John Doe</p>
                                                <p className="text-xs text-zinc-500">Replied to your AI Outreach campaign</p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-zinc-600">2 hours ago</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 p-12 bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-3xl flex flex-col items-center text-center">
                            <Zap className="w-12 h-12 text-emerald-500 mb-4 opacity-50" />
                            <h4 className="text-lg font-medium text-emerald-400 mb-2">Backend Integration Ready</h4>
                            <p className="text-zinc-500 max-w-md">
                                This is a placeholder dashboard. You can now integrate the Google Apps Script backend from your repository by embedding the URL here.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
