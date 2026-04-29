'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

type RawSheetRow = Record<string, unknown>;

type UploadRecord = {
    date: unknown;
    location: string | null;
    pantryProductName: string | null;
    inventoryType: string | null;
    amount: number | null;
    productUnitsForDisplay: string | null;
    weightLbs: number | null;
    source: string | null;
    destination: string | null;
    productInventoryRecordId18: string | null;
};

function toTrimmedStringOrNull(value: unknown): string | null {
    if (value == null) return null;
    const str = String(value).trim();
    return str.length > 0 ? str : null;
}

export default function FileUploadButton() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        setSuccess(null);

        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowed = ['.xls', '.xlsx'];
        const lower = file.name.toLowerCase();
        if (!allowed.some(ext => lower.endsWith(ext))) {
            setError('Please upload an .xls or .xlsx file.');
            return;
        }

        try {
            setLoading(true);

            // Read Excel file
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const firstSheet = workbook.Sheets[firstSheetName];

            // IMPORTANT: Skip first row to use row 2 as headers
            const rawRows = XLSX.utils.sheet_to_json<RawSheetRow>(firstSheet, {
                defval: null,
                range: 1, // Start from row 2 (0-indexed)
            });

            // Transform rows to InventoryTransaction format
            const records = rawRows
                .map((row): UploadRecord => {
                    // Map actual Excel column names (with arrows)
                    const date = row['Date  ↓'] || row['Date'];
                    const location = row['Location  ↑'] || row['Location'];
                    const pantryProductName = row['Pantry Product: Product'];
                    const inventoryType = row['Inventory Type'];
                    const productUnitsForDisplay = row['Product Units for Display'];
                    const weightLbsRaw = row['Weight (in pounds)'];
                    const source = row['Source'];
                    const destination = row['Destination'];
                    const productInventoryRecordId18 = row['Product Inventory Record ID 18'];

                    // Extract amount from Amount column
                    const rawAmount = row['Amount'];
                    let amount: number | null = null;
                    if (rawAmount != null) {
                        const parsed = parseInt(String(rawAmount), 10);
                        if (!isNaN(parsed)) {
                            amount = parsed;
                        }
                    }

                    // Handle weight
                    let weightLbs: number | null = null;
                    if (weightLbsRaw != null) {
                        const parsed = Number(weightLbsRaw);
                        if (!isNaN(parsed)) {
                            weightLbs = parsed;
                        }
                    }

                    return {
                        date: date,
                        location: toTrimmedStringOrNull(location),
                        pantryProductName: toTrimmedStringOrNull(pantryProductName),
                        inventoryType: toTrimmedStringOrNull(inventoryType),
                        amount: amount,
                        productUnitsForDisplay: toTrimmedStringOrNull(productUnitsForDisplay),
                        weightLbs: weightLbs,
                        source: toTrimmedStringOrNull(source),
                        destination: toTrimmedStringOrNull(destination),
                        productInventoryRecordId18: toTrimmedStringOrNull(
                            productInventoryRecordId18
                        ),
                    };
                })
                .filter((r): r is UploadRecord => {
                    // Pre-filter to only send records with all required fields
                    return (
                        Boolean(r.productInventoryRecordId18) &&
                        r.date != null &&
                        Boolean(r.location) &&
                        Boolean(r.pantryProductName) &&
                        Boolean(r.inventoryType) &&
                        r.amount != null
                    );
                });

            // Validate records before sending
            if (records.length === 0) {
                const sampleRows = rawRows.slice(0, 3).map((row, idx: number) => {
                    const missingFields: string[] = [];
                    if (!row['Date  ↓'] && !row['Date']) missingFields.push('Date');
                    if (!row['Location  ↑'] && !row['Location']) missingFields.push('Location');
                    if (!row['Pantry Product: Product'])
                        missingFields.push('Pantry Product: Product');
                    if (!row['Inventory Type']) missingFields.push('Inventory Type');
                    if (!row['Amount']) missingFields.push('Amount');
                    if (!row['Product Inventory Record ID 18'])
                        missingFields.push('Product Inventory Record ID 18');

                    return `Row ${idx + 1}: Missing fields: ${missingFields.join(', ') || 'none'}`;
                });

                throw new Error(
                    `No valid records found after filtering. ` +
                        `Found ${rawRows.length} raw rows, but ${records.length} valid records. ` +
                        `\n\nFirst few rows analysis:\n${sampleRows.join('\n')}\n\n` +
                        `Please check that your Excel file has all required columns with data.`
                );
            }

            // Upload to API
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'InventoryTransaction',
                    records: records,
                }),
            });

            const json = await res.json();
            if (!res.ok) {
                // Build detailed error message
                let errorMsg = json.error || 'Upload failed';
                if (json.details) {
                    errorMsg += `\n\nDetails: ${JSON.stringify(json.details, null, 2)}`;
                }
                if (res.status === 400) {
                    errorMsg += `\n\nThis is a validation error. Check that all required fields are present and valid.`;
                } else if (res.status === 500) {
                    errorMsg += `\n\nThis is a server error. Check the server logs for more details.`;
                }

                throw new Error(errorMsg);
            }

            setSuccess(`Successfully uploaded ${json.count} records!`);
        } catch (err: unknown) {
            const errorObj = err instanceof Error ? err : new Error('Failed to upload file.');
            // Show more detailed error message
            let errorMessage = errorObj.message || 'Failed to upload file.';
            if (errorObj.message && errorObj.message.includes('\n')) {
                // If error has multiple lines, show them all
                errorMessage = errorObj.message;
            } else if (errorObj.name === 'TypeError') {
                errorMessage = `Type Error: ${errorObj.message}. This might indicate a data format issue.`;
            } else if (errorObj.name === 'SyntaxError') {
                errorMessage = `Syntax Error: ${errorObj.message}. Check the file format.`;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
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
                    {loading ? 'Processing...' : 'Choose Excel file'}
                </Button>
            </div>

            <div className="mt-3 space-y-2">
                {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 max-h-96 overflow-y-auto">
                        <div className="font-semibold mb-2">Error Details:</div>
                        <pre className="whitespace-pre-wrap text-xs font-mono">{error}</pre>
                    </div>
                )}
                {success && <div className="text-sm text-green-600">{success}</div>}
            </div>
        </div>
    );
}
