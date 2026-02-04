'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

type FileInfo = {
    name: string;
    rowsCount: number;
};

type ProductPackageDestinationUploadProps = {
    onUploadSuccess?: () => void;
};

export default function ProductPackageDestinationUpload({
    onUploadSuccess,
}: ProductPackageDestinationUploadProps) {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const normalizeRows = (rows: any[]) => {
        return rows
            .map((r, index) => {
                // Get all fields (all strings)
                const productPackageName = r['Product Package Name'] || r['Product Package: Product Package Name  ↑'];
                const productPackageId18 = r['Product Package ID 18'];
                const householdName = r['Household Name'] || r['Pantry Visit Where Distributed: Household Name'];
                const householdId18 = r['Household ID 18'] || r['Pantry Visit Where Distributed: Household ID 18'];

                // Debug logging for the first few rows
                if (index < 3) {
                    console.log(`Row ${index} (Destination):`, {
                        productPackageName,
                        productPackageId18,
                        householdName,
                        householdId18
                    });
                }

                return {
                    productPackageName: productPackageName ? String(productPackageName).trim() : null,
                    productPackageId18: productPackageId18 ? String(productPackageId18).trim() : null,
                    householdName: householdName ? String(householdName).trim() : null,
                    householdId18: householdId18 ? String(householdId18).trim() : null,
                };
            })
            .filter(r => {
                // Check for all required fields
                return (
                    r.productPackageName &&
                    r.productPackageId18 &&
                    r.householdName &&
                    r.householdId18
                );
            });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccess(null);

        const file = e.target.files?.[0];
        if (!file) return;
        // file type 
        const allowed = ['.xls', '.xlsx'];
        const lower = file.name.toLowerCase();
        if (!allowed.some(ext => lower.endsWith(ext))) {
            setError('Please upload an .xls or .xlsx file.');
            setFileInfo(null);
            return;
        }

        try {
            setLoading(true);

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const firstSheet = workbook.Sheets[firstSheetName];

            // SKIP THE FIRST ROW: 1 skips the title row and use second row as headers
            const dataRows = XLSX.utils.sheet_to_json(firstSheet, {
                defval: null,
                range: 1, 
            });
            // normaliza da rows 
            const normalized = normalizeRows(dataRows);

            if (normalized.length === 0) {
                const sampleRow = dataRows[0] as any;
                const availableColumns = Object.keys(sampleRow || {});
                
                throw new Error(
                    `No valid records found. Required: 'Product Package Name', 'Product Package ID 18', 'Household Name', 'Household ID 18'.\n\n` +
                    `Detected Columns: ${availableColumns.join(', ')}`
                );
            }

            setFileInfo({ name: file.name, rowsCount: normalized.length });

            setUploading(true);
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'ProductPackageDestination', 
                    records: normalized,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Upload failed');

            setSuccess(`Uploaded ${json.count} destinations successfully!`);
            onUploadSuccess?.();
        } catch (err: unknown) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Failed to upload file.');
            setFileInfo(null);
        } finally {
            setLoading(false);
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="w-full max-w-md">
            <input
                ref={inputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden
            />

            <div className="flex items-center gap-4">
                <Button type="button" onClick={() => inputRef.current?.click()}>
                    Choose Excel File
                </Button>
                {(loading || uploading) && (
                    <div className="text-sm text-muted-foreground">
                        {loading ? 'Parsing…' : 'Uploading…'}
                    </div>
                )}
            </div>

            <div className="mt-3 space-y-2">
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 max-h-96 overflow-y-auto">
                        <div className="font-semibold mb-2">Error:</div>
                        <pre className="whitespace-pre-wrap text-xs">{error}</pre>
                    </div>
                )}
                {success && <div className="text-sm text-green-600">{success}</div>}

                {fileInfo && (
                    <div className="mt-2 text-sm text-gray-700">
                        <div><strong>File:</strong> {fileInfo.name}</div>
                        <div><strong>Valid Destinations:</strong> {fileInfo.rowsCount}</div>
                    </div>
                )}
            </div>
        </div>
    );
}