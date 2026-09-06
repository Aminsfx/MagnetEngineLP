import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Lock, CheckCircle, AlertCircle, Loader2, Copy, Check, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CARD_BEZEL, CARD_BEZEL_DANGER } from '../lib/theme';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface ProfilePageProps {
    user: SupabaseUser;
    onLogout: () => void;
}

const AVATAR_KEY = (id: string) => `avatar_${id}`;

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onLogout }) => {
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem(AVATAR_KEY(user.id)));
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setAvatarUrl(localStorage.getItem(AVATAR_KEY(user.id)));
    }, [user.id]);

    const memberSince = user.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

    const firstName = (user.user_metadata?.first_name as string | undefined) ?? '';
    const lastName = (user.user_metadata?.last_name as string | undefined) ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const initial = (firstName?.[0] ?? user.email?.[0] ?? 'U').toUpperCase();

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Resize to max 256px via canvas to keep localStorage size small
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const size = Math.min(img.width, img.height, 256);
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d')!;
                const scale = size / Math.min(img.width, img.height);
                const sx = (img.width - size / scale) / 2;
                const sy = (img.height - size / scale) / 2;
                ctx.drawImage(img, sx, sy, size / scale, size / scale, 0, 0, size, size);
                const resized = canvas.toDataURL('image/jpeg', 0.85);
                localStorage.setItem(AVATAR_KEY(user.id), resized);
                setAvatarUrl(resized);
                window.dispatchEvent(new CustomEvent('avatar-updated', { detail: resized }));
                setAvatarUploading(false);
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(user.id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwMessage(null);

        if (newPw.length < 6) {
            setPwMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }
        if (newPw !== confirmPw) {
            setPwMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        setPwLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPw });
        setPwLoading(false);

        if (error) {
            setPwMessage({ type: 'error', text: error.message });
        } else {
            setPwMessage({ type: 'success', text: 'Password updated successfully.' });
            setNewPw('');
            setConfirmPw('');
        }
    };

    return (
        <div className="p-8 max-w-2xl space-y-6">
            {/* Page header */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/4 text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase mb-3">
                    Account
                </div>
                <h1 className="text-2xl font-semibold text-white tracking-tight">Profile</h1>
                <p className="text-neutral-600 text-sm mt-1.5">Manage your account details and security settings.</p>
            </div>

            {/* Identity card */}
            <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
                <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6" style={CARD_BEZEL.inner}>
                    <div className="flex items-center gap-5">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0 group">
                            <div
                                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center shadow-[0_0_24px] shadow-brand-500/25 overflow-hidden cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                                    : <span className="text-2xl font-bold text-brand-950">{initial}</span>
                                }
                                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    {avatarUploading
                                        ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                                        : <Camera className="w-5 h-5 text-white" />
                                    }
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>
                        <div className="min-w-0">
                            {fullName && (
                                <p className="text-white font-semibold text-base truncate">{fullName}</p>
                            )}
                            <p className={`truncate ${fullName ? 'text-neutral-500 text-sm' : 'text-white font-semibold text-base'}`}>{user.email}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {/* Static dot on purpose: this reports the real plan, not a fake live status. */}
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[11px] font-semibold capitalize">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                                    Member Plan
                                </span>
                                <span className="text-neutral-600 text-xs">Member since {memberSince}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
                            <div className="flex items-center gap-2 mb-1">
                                <Mail className="w-3.5 h-3.5 text-neutral-600" />
                                <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">Email</span>
                            </div>
                            <p className="text-sm text-neutral-300 truncate">{user.email}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/3 border border-white/6">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <User className="w-3.5 h-3.5 text-neutral-600" />
                                    <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-semibold">User ID</span>
                                </div>
                                <button
                                    onClick={handleCopyId}
                                    title="Copy full ID"
                                    className="text-neutral-600 hover:text-brand-400 transition-colors"
                                >
                                    {copied
                                        ? <Check className="w-3.5 h-3.5 text-brand-400" />
                                        : <Copy className="w-3.5 h-3.5" />
                                    }
                                </button>
                            </div>
                            <p className="text-xs text-neutral-500 font-mono truncate">{user.id.slice(0, 16)}…</p>
                            {copied && <p className="text-[10px] text-brand-500 mt-1">Copied to clipboard!</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Change password */}
            <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL.outer}>
                <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6" style={CARD_BEZEL.inner}>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-white/8 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-neutral-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white">Change Password</h2>
                            <p className="text-[11px] text-neutral-600 mt-0.5">Update your login credentials.</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1.5">New Password</label>
                            <input
                                type="password"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                                placeholder="Min. 6 characters"
                                required
                                className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1.5">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                placeholder="Repeat password"
                                required
                                className="w-full bg-surface border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/30 transition-all"
                            />
                        </div>

                        {pwMessage && (
                            <div className={`flex items-center gap-2.5 p-3 rounded-xl border text-[11px] ${
                                pwMessage.type === 'success'
                                    ? 'bg-positive-500/8 border-positive-500/20 text-positive-400'
                                    : 'bg-danger-500/8 border-danger-500/20 text-danger-400'
                            }`}>
                                {pwMessage.type === 'success'
                                    ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                                {pwMessage.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={pwLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium hover:bg-brand-500/20 hover:border-brand-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {pwLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Update Password
                        </button>
                    </form>
                </div>
            </div>

            {/* Danger zone */}
            <div className="rounded-[1.5rem] p-[1px]" style={CARD_BEZEL_DANGER.outer}>
                <div className="bg-surface-sunken rounded-[calc(1.5rem-1px)] p-6" style={CARD_BEZEL_DANGER.inner}>
                    <h2 className="text-sm font-semibold text-danger-400/80 mb-1">Danger Zone</h2>
                    <p className="text-[11px] text-neutral-600 mb-4">These actions are irreversible.</p>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-danger-500/20 text-danger-400 text-sm font-medium hover:bg-danger-500/8 transition-all"
                    >
                        Sign out of all sessions
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
