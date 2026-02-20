import React, { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { csvUtils } from '../../lib/csv';
import { Lead, ColumnMapping } from '../../lib/types';
import { ColumnMapper } from './ColumnMapper';

interface CSVControlsProps {
    onImport: (leads: Lead[]) => void;
    leads: Lead[];
}

export const CSVControls: React.FC<CSVControlsProps> = ({ onImport, leads }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [showMapper, setShowMapper] = useState(false);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            // Parse headers first
            const headers = await csvUtils.parseHeaders(file);
            setCsvHeaders(headers);
            setPendingFile(file);
            setShowMapper(true);
        } catch (error) {
            alert('Error reading CSV file. Please check the format.');
            console.error(error);
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleConfirmMapping = async (mapping: ColumnMapping) => {
        if (!pendingFile) return;

        try {
            const parsedLeads = await csvUtils.parseCSV(pendingFile, mapping);
            onImport(parsedLeads);
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

    const handleExport = () => {
        if (leads.length === 0) {
            alert('No leads to export');
            return;
        }
        csvUtils.exportCSV(leads, `magnet-engine-leads-${Date.now()}.csv`);
    };

    return (
        <>
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-medium"
                >
                    <Upload className="w-4 h-4" />
                    Import CSV
                </button>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-[#131B2C] border border-[#1E293B] hover:border-blue-600/50 text-white rounded-xl transition-all font-medium"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
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
