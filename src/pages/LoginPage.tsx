import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Lock, Mail, Loader2 } from 'lucide-react';

const LoginPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate auth delay
        setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
        }, 1500);
    };

    return (
        <div className="relative min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
            {/* Background Grid Elements */}
            <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
            <div className="fixed inset-0 bg-gradient-to-b from-black via-blue-900/10 to-black pointer-events-none z-0" />

            <div className="relative z-10 w-full max-w-md">
                <Link
                    to="/"
                    className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to landing page
                </Link>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-zinc-500">Enter your credentials to access the software</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                                <input
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center group disabled:opacity-70"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-zinc-600">
                        Don't have an account?{' '}
                        <a href="#" className="text-blue-500 hover:text-blue-400 transition-colors">
                            Request Access
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
