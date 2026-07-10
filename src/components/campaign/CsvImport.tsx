import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import type { Lead, ColumnMapping } from '../../lib/types';

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function parseFollowers(raw: string | undefined): number {
    if (!raw) return 0;
    const s = String(raw).trim().replace(/,/g, '');
    const m = s.match(/^([\d.]+)\s*([kKmM])?$/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) return 0;
    const mult = m[2]?.toLowerCase() === 'm' ? 1_000_000 : m[2]?.toLowerCase() === 'k' ? 1_000 : 1;
    return Math.round(n * mult);
}

export function parseBool(raw: string | undefined): boolean {
    const s = String(raw ?? '').trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
}

export function cleanHandle(raw: string | undefined): string {
    let s = String(raw ?? '').trim().toLowerCase();
    // Full URLs → last path segment
    if (s.includes('instagram.com')) {
        s = s.replace(/\/+$/, '');
        s = s.slice(s.lastIndexOf('/') + 1);
    }
    return s.replace(/^@/, '').trim();
}

const ALIASES: Record<keyof ColumnMapping, string[]> = {
    handle: ['username', 'handle', 'ig', 'instagram', 'username', 'account'],
    name: ['fullname', 'name', 'fullname', 'displayname'],
    followers: ['followerscount', 'followers', 'followercount'],
    bio: ['biography', 'bio', 'description', 'about'],
    isPrivate: ['private', 'isprivate', 'isprivate'],
};

export function autoMap(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const normalized = headers.map(h => ({ raw: h, norm: h.toLowerCase().replace(/[\s_]/g, '') }));
    (Object.keys(ALIASES) as Array<keyof ColumnMapping>).forEach(field => {
        const hit = normalized.find(h => ALIASES[field].includes(h.norm));
        if (hit) mapping[field] = hit.raw;
    });
    return mapping;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CsvImportProps {
    onLeadsReady: (leads: Lead[]) => void;
    maxLeads: number | null;
}

const FIELD_LABELS: Array<{ field: keyof ColumnMapping; label: string; required?: boolean }> = [
    { field: 'handle', label: 'Handle', required: true },
    { field: 'name', label: 'Name' },
    { field: 'followers', label: 'Followers' },
    { field: 'bio', label: 'Bio' },
    { field: 'isPrivate', label: 'Private' },
];

export const CsvImport: React.FC<CsvImportProps> = ({ onLeadsReady, maxLeads }) => {
    const [rows, setRows] = useState<Record<string, string>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<ColumnMapping>({});
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const [imported, setImported] = useState<number | null>(null);

    const handleFile = (file: File | undefined) => {
        if (!file) return;
        setError('');
        setNote('');
        setImported(null);
        setFileName(file.name);
        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (r) => {
                const fields = r.meta.fields ?? [];
                setRows(r.data);
                setHeaders(fields);
                const auto = autoMap(fields);
                setMapping(auto);
                if (!auto.handle) {
                    setError("Couldn't find a username column. Pick it manually below.");
                }
            },
        });
    };

    const buildLeads = (): { leads: Lead[]; skipped: number } => {
        if (!mapping.handle) return { leads: [], skipped: rows.length };
        const campaignId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const seen = new Set<string>();
        const leads: Lead[] = [];
        let skipped = 0;

        for (const row of rows) {
            const handle = cleanHandle(row[mapping.handle]);
            if (!handle || seen.has(handle)) { skipped++; continue; }
            seen.add(handle);
            leads.push({
                id: crypto.randomUUID(),
                campaignId,
                handle,
                name: mapping.name ? String(row[mapping.name] ?? '').trim() || handle : handle,
                followers: mapping.followers ? parseFollowers(row[mapping.followers]) : 0,
                bio: mapping.bio ? String(row[mapping.bio] ?? '').trim() || undefined : undefined,
                isPrivate: mapping.isPrivate ? parseBool(row[mapping.isPrivate]) : false,
                status: 'cold',
                dmSent: false,
                replied: false,
            });
        }
        void createdAt;
        return { leads, skipped };
    };

    const { leads: previewLeads, skipped } = rows.length > 0 ? buildLeads() : { leads: [], skipped: 0 };

    const handleAdd = () => {
        let { leads } = buildLeads();
        if (leads.length === 0) return;

        if (maxLeads !== null && leads.length > maxLeads) {
            leads = leads.slice(0, maxLeads);
            setNote(`Capped at ${maxLeads} leads for this import.`);
        }

        onLeadsReady(leads);
        setImported(leads.length);
        setRows([]);
        setHeaders([]);
        setMapping({});
        setFileName('');
    };

    return (
        <div className="bg-[#050A08] border border-white/5 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Import Leads from CSV</h3>
            </div>

            {/* Drop zone */}
            <label className="flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border border-dashed border-white/10 text-zinc-600 hover:text-zinc-400 hover:border-white/20 transition-all cursor-pointer text-center px-4">
                <Upload className="w-5 h-5" />
                <span className="text-sm">
                    {fileName || 'Drop a CSV here or click to browse — exports from Apify or any scraper work'}
                </span>
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={e => handleFile(e.target.files?.[0])}
                />
            </label>

            {error && (
                <div className="flex items-start gap-2 px-4 py-3 bg-red-500/8 border border-red-500/20 rounded-xl text-red-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
                </div>
            )}

            {imported !== null && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    ✓ {imported} leads added to the Approval Queue
                    {note && <span className="text-zinc-500 text-xs ml-2">{note}</span>}
                </div>
            )}

            {/* Column mapping */}
            {headers.length > 0 && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {FIELD_LABELS.map(({ field, label, required }) => (
                            <div key={field}>
                                <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                                    {label}{required && <span className="text-emerald-400"> *</span>}
                                </label>
                                <div className="relative">
                                    <select
                                        value={mapping[field] ?? ''}
                                        onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                                        className="w-full appearance-none bg-[#030604] border border-white/8 rounded-xl px-3 pr-8 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
                                    >
                                        <option value="">— not in file —</option>
                                        {headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Preview */}
                    {mapping.handle && (
                        <div className="border border-white/5 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-white/5">
                                    <tr>
                                        {['Handle', 'Name', 'Followers', 'Bio'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {previewLeads.slice(0, 5).map(l => (
                                        <tr key={l.id}>
                                            <td className="px-4 py-2.5 text-zinc-300">@{l.handle}</td>
                                            <td className="px-4 py-2.5 text-zinc-400">{l.name}</td>
                                            <td className="px-4 py-2.5 text-zinc-400">{l.followers.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-zinc-600 truncate max-w-[240px]">{l.bio ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-600 font-mono">
                            {previewLeads.length} rows found · {skipped} skipped (no handle)
                        </span>
                        <button
                            onClick={handleAdd}
                            disabled={!mapping.handle || previewLeads.length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-950 font-semibold rounded-xl transition-all text-sm"
                        >
                            Add {previewLeads.length} to Queue
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};
