import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ColumnMapping } from '../../lib/types';

interface ColumnMapperProps {
    csvHeaders: string[];
    onConfirm: (mapping: ColumnMapping) => void;
    onCancel: () => void;
}

export const ColumnMapper: React.FC<ColumnMapperProps> = ({ csvHeaders, onConfirm, onCancel }) => {
    const [mapping, setMapping] = useState<ColumnMapping>({});

    const systemFields = [
        { key: 'name', label: 'Name', required: true },
        { key: 'handle', label: 'Handle/Username', required: true },
        { key: 'followers', label: 'Followers Count', required: false },
        { key: 'bio', label: 'Bio/Description', required: false },
        { key: 'isPrivate', label: 'Private Account (true/false)', required: false },
    ];

    const handleUpdate = (field: keyof ColumnMapping, csvColumn: string) => {
        setMapping({ ...mapping, [field]: csvColumn || undefined });
    };

    const canConfirm = mapping.name && mapping.handle;

    const getSuggestedColumn = (field: string): string => {
        const commonMappings: Record<string, string[]> = {
            name: ['name', 'full name', 'fullname', 'display name', 'displayname'],
            handle: ['handle', 'username', 'user', 'twitter', 'account'],
            followers: ['followers', 'follower count', 'follower_count', 'following'],
            bio: ['bio', 'description', 'about', 'about me', 'profile'],
            isPrivate: ['private', 'isprivate', 'is_private', 'account_type'],
        };

        const suggestions = commonMappings[field] || [];
        const found = csvHeaders.find(header =>
            suggestions.some(s => header.toLowerCase().includes(s.toLowerCase()))
        );
        return found || '';
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl max-w-2xl w-full p-8">
                <h2 className="text-2xl font-bold text-white mb-2">Map Your CSV Columns</h2>
                <p className="text-zinc-500 mb-6">
                    Match your CSV columns to the system fields. We'll try to auto-detect, but you can adjust as needed.
                </p>

                <div className="space-y-4 mb-6">
                    {systemFields.map((field) => (
                        <div key={field.key} className="flex items-center gap-4">
                            <div className="w-48">
                                <label className="text-sm font-medium text-white">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                            </div>
                            <ArrowRight className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                            <select
                                value={mapping[field.key as keyof ColumnMapping] || getSuggestedColumn(field.key)}
                                onChange={(e) => handleUpdate(field.key as keyof ColumnMapping, e.target.value)}
                                className="flex-1 bg-[#0B0F19] border border-[#1E293B] rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Skip this field --</option>
                                {csvHeaders.map((header) => (
                                    <option key={header} value={header}>
                                        {header}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 mb-6">
                    <p className="text-sm text-zinc-300">
                        <strong>Note:</strong> If "Private Account" is not in your CSV, all leads will default to <strong>public</strong>.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 bg-[#0B0F19] border border-[#1E293B] text-white rounded-xl hover:border-zinc-600 transition-all font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(mapping)}
                        disabled={!canConfirm}
                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Confirm & Import
                    </button>
                </div>
            </div>
        </div>
    );
};
