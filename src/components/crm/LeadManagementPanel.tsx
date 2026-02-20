import React, { useState, useRef } from 'react';
import { Upload, Download, Sparkles, Filter, Search } from 'lucide-react';
import { csvUtils } from '../../lib/csv';
import { Lead, ColumnMapping, AppConfig } from '../../lib/types';
import { ColumnMapper } from './ColumnMapper';

interface LeadManagementPanelProps {
    onImportLeads: (leads: Lead[]) => void;
    allLeads: Lead[];
    filteredLeads: Lead[];
    onGenerateDMs: () => void;
    isGenerating: boolean;
    config: AppConfig;
}

export const LeadManagementPanel: React.FC<LeadManagementPanelProps> = ({
    onImportLeads,
    allLeads,
    filteredLeads,
    onGenerateDMs,
    isGenerating,
    config,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [showMapper, setShowMapper] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const headers = await csvUtils.parseHeaders(file);
            setCsvHeaders(headers);
            setPendingFile(file);
            setShowMapper(true);
        } catch (error) {
            alert('Error reading CSV file. Please check the format.');
            console.error(error);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleConfirmMapping = async (mapping: ColumnMapping) => {
        if (!pendingFile) return;

        try {
            const parsedLeads = await csvUtils.parseCSV(pendingFile, mapping);
            onImportLeads(parsedLeads);
            alert(`Successfully imported ${parsedLeads.length} leads!`);
            setShowMapper(false);
            setPendingFile(null);
        } catch (error) {
            alert('Error parsing CSV file. Please check the format.');
            console.error(error);
        }
    };

    const handleCancelMapping = () => {
        setShowMapper(false);
        setPendingFile(null);
    };

    const handleExportAll = () => {
        if (allLeads.length === 0) {
            alert('No leads to export');
            return;
        }
        csvUtils.exportCSV(allLeads, `all-leads-${Date.now()}.csv`);
    };

    const handleExportFiltered = () => {
        if (filteredLeads.length === 0) {
            alert('No filtered leads to export');
            return;
        }
        csvUtils.exportCSV(filteredLeads, `filtered-leads-${Date.now()}.csv`);
    };

    const leadsWithoutDM = filteredLeads.filter(l => !l.dmSent).length;

    return (
        <>
            <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Lead Management</h2>
                        <p className="text-zinc-500 text-sm mt-1">Import, filter, and generate AI DMs</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-blue-600/10 border border-blue-600/20 rounded-xl">
                            <span className="text-sm text-blue-400 font-medium">
                                {allLeads.length} Total Leads
                            </span>
                        </div>
                        <div className="px-4 py-2 bg-emerald-600/10 border border-emerald-600/20 rounded-xl">
                            <span className="text-sm text-emerald-400 font-medium">
                                {filteredLeads.length} Filtered
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Import/Export */}
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                        />

                        <button
                            onClick={handleImportClick}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium"
                        >
                            <Upload className="w-4 h-4" />
                            Import CSV
                        </button>

                        <div className="relative group">
                            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#0B0F19] border border-[#1E293B] hover:border-blue-600/50 text-white rounded-xl transition-all font-medium">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                            <div className="hidden group-hover:block absolute top-full mt-2 bg-[#0B0F19] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl z-10 min-w-[200px]">
                                <button
                                    onClick={handleExportAll}
                                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/5 transition-colors"
                                >
                                    Export All ({allLeads.length})
                                </button>
                                <button
                                    onClick={handleExportFiltered}
                                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/5 transition-colors border-t border-[#1E293B]"
                                >
                                    Export Filtered ({filteredLeads.length})
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AI DM Generation */}
                    <button
                        onClick={onGenerateDMs}
                        disabled={isGenerating || leadsWithoutDM === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl transition-all font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles className="w-5 h-5" />
                        {isGenerating ? 'Generating...' : `Generate DMs (${leadsWithoutDM})`}
                    </button>
                </div>

                {/* Filter Info */}
                <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <Filter className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-zinc-300">
                                <strong>Active Filters:</strong> {config.accountType === 'all' ? 'All accounts' : config.accountType === 'public' ? 'Public only' : 'Private only'}
                                {config.minFollowers > 0 || config.maxFollowers < 1000000 ? ` | ${config.minFollowers.toLocaleString()} - ${config.maxFollowers.toLocaleString()} followers` : ''}
                                {config.includeKeywords.length > 0 && ` | Include: ${config.includeKeywords.join(', ')}`}
                                {config.excludeKeywords.length > 0 && ` | Exclude: ${config.excludeKeywords.join(', ')}`}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Showing {filteredLeads.length} of {allLeads.length} leads
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {showMapper && (
                <ColumnMapper
                    csvHeaders={csvHeaders}
                    onConfirm={handleConfirmMapping}
                    onCancel={handleCancelMapping}
                />
            )}
        </>
    );
};
