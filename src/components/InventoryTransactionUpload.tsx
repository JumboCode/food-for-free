'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

type FileInfo = {
    name: string;
    rowsCount: number;
};

type InventoryTransactionUploadProps = {
    onUploadSuccess?: () => void;
};

export default function InventoryTransactionUpload({
    onUploadSuccess,
}: InventoryTransactionUploadProps) {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const normalizeRows = (rows: any[]) => {
        return rows
            .map((r, index) => {
                // Handle date - can be Excel date string
                const rawDate = r['Date  ↓'] || r['Date'];
                let date: string | number | null = null;
                if (rawDate != null) {
                    if (typeof rawDate === 'number') {
                        // Excel serial number
                        date = rawDate;
                    } else {
                        // Try to parse as date string
                        const parsed = new Date(rawDate);
                        if (!isNaN(parsed.getTime())) {
                            date = parsed.toISOString();
                        } else {
                            // Keep as string if can't parse
                            date = rawDate;
                        }
                    }
                }

                // Get location (handle column name with arrow)
                const location = r['Location  ↑'] || r['Location'];

                // Get pantry product name
                const pantryProductName = r['Pantry Product: Product'];

                // Get inventory type
                const inventoryType = r['Inventory Type'];

                // Get amount
                const rawAmount = r['Amount'];
                let amount: number | null = null;
                if (rawAmount != null) {
                    const parsed = Number(rawAmount);
                    if (!isNaN(parsed)) {
                        amount = Math.round(parsed);
                    }
                }

                // Get product units
                const productUnitsForDisplay = r['Product Units for Display'];

                // Get weight
                const rawWeight = r['Weight (in pounds)'];
                let weightLbs: number | null = null;
                if (rawWeight != null) {
                    const parsed = parseFloat(String(rawWeight));
                    if (!isNaN(parsed)) {
                        weightLbs = parsed;
                    }
                }

                // Get source and destination
                const source = r['Source'];
                const destination = r['Destination'];

                // Get product inventory record ID
                const productInventoryRecordId18Raw = r['Product Inventory Record ID 18'];
                const productInventoryRecordId18 = productInventoryRecordId18Raw 
                    ? String(productInventoryRecordId18Raw).trim() 
                    : null;

                // Debug logging for first few rows
                if (index < 3) {
                    console.log(`Row ${index}:`, {
                        date,
                        location,
                        pantryProductName,
                        inventoryType,
                        amount,
                        productInventoryRecordId18,
                    });
                }

                return {
                    date,
                    location: location || null,
                    pantryProductName: pantryProductName || null,
                    inventoryType: inventoryType || null,
                    amount,
                    productUnitsForDisplay: productUnitsForDisplay || null,
                    weightLbs,
                    source: source || null,
                    destination: destination || null,
                    productInventoryRecordId18,
                };
            })
            .filter(r => {
                // Pre-filter to only valid records
                const isValid = (
                    r.date != null &&
                    r.location &&
                    r.pantryProductName &&
                    r.inventoryType &&
                    r.amount != null &&
                    r.productInventoryRecordId18
                );
                return isValid;
            });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccess(null);

        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ['.xls', '.xlsx'];
        const lower = file.name.toLowerCase();
        if (!allowed.some(ext => lower.endsWith(ext))) {
            setError('Please upload an .xls or .xlsx file.');
            setFileInfo(null);
            return;
        }

        try {
            setLoading(true);

            // Read Excel
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const firstSheet = workbook.Sheets[firstSheetName];

            // IMPORTANT: Skip the first row (range option) to use row 2 as headers
            // The Excel file has a title row, then the actual column headers
            const dataRows = XLSX.utils.sheet_to_json(firstSheet, {
                defval: null,
                range: 1, // Start reading from row 2 (0-indexed, so row index 1)
            });

            console.log('Total rows read:', dataRows.length);
            if (dataRows.length > 0) {
                console.log('Available columns:', Object.keys(dataRows[0] as Record<string, any>));
                console.log('First row data:', dataRows[0]);
            }

            const normalized = normalizeRows(dataRows);

            console.log('Valid records after filtering:', normalized.length);

            if (normalized.length === 0) {
                // Provide helpful error message
                const sampleRow = dataRows[0] as any;
                const availableColumns = Object.keys(sampleRow || {});
                
                throw new Error(
                    `No valid records found. ` +
                    `Found ${dataRows.length} total rows in the file.\n\n` +
                    `Available columns: ${availableColumns.join(', ')}\n\n` +
                    `Required columns:\n` +
                    `  - Date (or 'Date  ↓')\n` +
                    `  - Location (or 'Location  ↑')\n` +
                    `  - Pantry Product: Product\n` +
                    `  - Inventory Type\n` +
                    `  - Amount\n` +
                    `  - Product Inventory Record ID 18`
                );
            }

            setFileInfo({ name: file.name, rowsCount: normalized.length });

            // Upload
            setUploading(true);
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'InventoryTransaction',
                    records: normalized,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                console.error('Server error:', json);
                console.error('Response status:', res.status);
                throw new Error(json.error || 'Upload failed');
            }

            setSuccess(`Uploaded ${json.count} rows successfully!`);
            onUploadSuccess?.();
        } catch (err: unknown) {
            console.error('Upload error:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to upload file.';
            setError(errorMessage);
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
                    Choose Excel file
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
                        <div>
                            <strong>File name:</strong> {fileInfo.name}
                        </div>
                        <div>
                            <strong>Rows:</strong> {fileInfo.rowsCount}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}