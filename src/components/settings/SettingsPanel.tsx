import React, { useState, useEffect } from 'react';
import { Key, Save, Shield } from 'lucide-react';
import { storage } from '../../lib/storage';
import { AppConfig, APIKeys } from '../../lib/types';

interface SettingsPanelProps {
    config: AppConfig;
    onUpdateConfig: (config: AppConfig) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onUpdateConfig }) => {
    const [apiKeys, setApiKeys] = useState<APIKeys>({});
    const [showKeys, setShowKeys] = useState({
        openai: false,
        claude: false,
        gemini: false,
    });

    useEffect(() => {
        setApiKeys(storage.getAPIKeys());
    }, []);

    const handleSaveAPIKey = (provider: keyof APIKeys, value: string) => {
        if (value.trim()) {
            storage.setAPIKey(provider, value);
            setApiKeys({ ...apiKeys, [provider]: value });
            alert(`${provider.toUpperCase()} API key saved securely!`);
        }
    };

    const maskKey = (key?: string) => {
        if (!key) return '';
        return key.substring(0, 6) + '****' + key.substring(key.length - 4);
    };

    const handleUpdateKeywords = (type: 'include' | 'exclude', value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(k => k);
        onUpdateConfig({
            ...config,
            [type === 'include' ? 'includeKeywords' : 'excludeKeywords']: keywords,
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* API Keys Section */}
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-6 h-6 text-blue-500" />
                    <h3 className="text-xl font-semibold text-white">API Keys</h3>
                </div>

                <div className="space-y-4">
                    {(['openai', 'claude', 'gemini'] as const).map((provider) => (
                        <div key={provider}>
                            <label className="block text-sm font-medium text-zinc-400 mb-2 capitalize">
                                {provider} API Key
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type={showKeys[provider] ? 'text' : 'password'}
                                    placeholder={apiKeys[provider] ? maskKey(apiKeys[provider]) : 'Enter API key'}
                                    className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    onBlur={(e) => {
                                        if (e.target.value && e.target.value !== maskKey(apiKeys[provider])) {
                                            handleSaveAPIKey(provider, e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => setShowKeys({ ...showKeys, [provider]: !showKeys[provider] })}
                                    className="px-4 py-3 bg-[#0B0F19] border border-[#1E293B] rounded-xl text-zinc-400 hover:text-white transition-colors"
                                >
                                    {showKeys[provider] ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6">
                    <label className="block text-sm font-medium text-zinc-400 mb-2">AI Provider</label>
                    <select
                        value={config.selectedAIProvider}
                        onChange={(e) => onUpdateConfig({ ...config, selectedAIProvider: e.target.value as any })}
                        className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="openai">OpenAI (GPT-4)</option>
                        <option value="claude">Claude (Anthropic)</option>
                        <option value="gemini">Gemini (Google)</option>
                    </select>
                </div>
            </div>

            {/* Filtering Configuration */}
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6">Lead Filtering</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Include Keywords (comma-separated)</label>
                        <input
                            type="text"
                            defaultValue={config.includeKeywords.join(', ')}
                            onBlur={(e) => handleUpdateKeywords('include', e.target.value)}
                            placeholder="founder, CEO, marketing"
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Exclude Keywords (comma-separated)</label>
                        <input
                            type="text"
                            defaultValue={config.excludeKeywords.join(', ')}
                            onBlur={(e) => handleUpdateKeywords('exclude', e.target.value)}
                            placeholder="bot, spam, fake"
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Min Followers</label>
                            <input
                                type="number"
                                value={config.minFollowers}
                                onChange={(e) => onUpdateConfig({ ...config, minFollowers: Number(e.target.value) })}
                                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Max Followers</label>
                            <input
                                type="number"
                                value={config.maxFollowers}
                                onChange={(e) => onUpdateConfig({ ...config, maxFollowers: Number(e.target.value) })}
                                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Account Type</label>
                        <select
                            value={config.accountType}
                            onChange={(e) => onUpdateConfig({ ...config, accountType: e.target.value as any })}
                            className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Accounts</option>
                            <option value="public">Public Only</option>
                            <option value="private">Private Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* System Prompt */}
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-6">AI System Prompt</h3>
                <textarea
                    value={config.systemPrompt}
                    onChange={(e) => onUpdateConfig({ ...config, systemPrompt: e.target.value })}
                    rows={6}
                    className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Enter your system prompt for AI DM generation..."
                />
            </div>

            <button
                onClick={() => {
                    storage.setConfig(config);
                    alert('Settings saved!');
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-semibold"
            >
                <Save className="w-5 h-5" />
                Save All Settings
            </button>
        </div>
    );
};
