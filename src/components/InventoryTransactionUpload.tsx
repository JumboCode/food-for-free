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
interface InventoryTransactionRow {
    Date: string | number;
    Location: string;
    'Pantry Product: Product': string;
    'Inventory Type'?: string;
    Amount?: number;
    'Product Units for Display'?: string;
    'Weight (in pounds)'?: number;
    Source?: string;
    Destination?: string;
    'Product Inventory Record ID 18': string | number;
}

export default function InventoryTransactionUpload({
    onUploadSuccess,
}: InventoryTransactionUploadProps) {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const normalizeRows = (rows: InventoryTransactionRow[]) => {
        return rows.map(r => ({
            date: r.Date ? new Date(r.Date).toISOString() : null,
            location: r.Location,
            pantryProductName: r['Pantry Product: Product'],
            inventoryType: r['Inventory Type'] || null,
            amount: r.Amount != null ? parseInt(r.Amount.toString()) : null,
            productUnitsForDisplay: r['Product Units for Display'] || null,
            weightLbs:
                r['Weight (in pounds)'] != null
                    ? parseFloat(r['Weight (in pounds)'].toString())
                    : null,
            source: r.Source || null,
            destination: r.Destination || null,
            productInventoryRecordId18: r['Product Inventory Record ID 18']?.toString() || null,
        }));
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

            const rawRows = XLSX.utils.sheet_to_json<InventoryTransactionRow>(firstSheet, {
                defval: null,
            });

            const normalized = normalizeRows(rawRows);

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
                throw new Error(json.error || 'Upload failed');
            }

            setSuccess(`Uploaded ${json.count} rows successfully!`);
            onUploadSuccess?.();
        } catch (err: unknown) {
            console.error(err);
            setError(err.message || 'Failed to upload file.');
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
                {error && <div className="text-sm text-red-600">{error}</div>}
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
