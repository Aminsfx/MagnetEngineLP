import Papa from 'papaparse';
import { Lead, ColumnMapping } from './types';

export const csvUtils = {
    // Parse CSV file headers only
    parseHeaders(file: File): Promise<string[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                preview: 1, // Only parse first row
                complete: (results) => {
                    const headers = results.meta.fields || [];
                    resolve(headers);
                },
                error: (error) => reject(error),
            });
        });
    },

    // Parse CSV file to Lead array with column mapping
    parseCSV(file: File, mapping: ColumnMapping): Promise<Lead[]> {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                complete: (results) => {
                    const leads: Lead[] = results.data
                        .filter((row: any) => {
                            // Must have name and handle
                            const name = mapping.name ? row[mapping.name] : '';
                            const handle = mapping.handle ? row[mapping.handle] : '';
                            return name && handle;
                        })
                        .map((row: any, index: number) => {
                            // Extract values using mapping
                            const name = mapping.name ? row[mapping.name] : '';
                            const handle = mapping.handle ? row[mapping.handle] : '';
                            const followers = mapping.followers ? parseInt(row[mapping.followers] || '0') : 0;
                            const bio = mapping.bio ? row[mapping.bio] : undefined;

                            // Handle private status (could be boolean, string, or number)
                            let isPrivate = false;
                            if (mapping.isPrivate && row[mapping.isPrivate]) {
                                const privateValue = row[mapping.isPrivate].toString().toLowerCase();
                                isPrivate = privateValue === 'true' || privateValue === '1' || privateValue === 'yes' || privateValue === 'private';
                            }

                            return {
                                id: `lead-${Date.now()}-${index}`,
                                name,
                                handle,
                                followers,
                                bio,
                                isPrivate,
                                status: 'cold' as const,
                                dmSent: false,
                                replied: false,
                            };
                        });
                    resolve(leads);
                },
                error: (error) => reject(error),
            });
        });
    },

    // Export leads to CSV
    exportCSV(leads: Lead[], filename: string = 'leads.csv'): void {
        const csv = Papa.unparse(leads);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
};
