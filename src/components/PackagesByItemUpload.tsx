'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

type FileInfo = {
    name: string;
    rowsCount: number;
};

type PackagesByItemUploadProps = {
    onUploadSuccess?: () => void;
};

interface PackagesByItemRow {
    'Product Package: Product Package Name': string;
    'Pantry Product: Product': string;
    'Lot: Source: Account Name'?: string;
    'Lot: Food Rescue Program'?: string;
    'Distribution Record: Amount'?: number | string;
    'Pantry Product: Weight (in pounds)'?: number | string;
    'Distribution Record: Cost'?: number | string;
    'Distribution Record: Product Inventory Record ID 18': string | number;
    'Product Package ID 18': string | number;
}

export default function PackagesByItemUpload({ onUploadSuccess }: PackagesByItemUploadProps) {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const normalizeRows = (rows: PackagesByItemRow[]) => {
        return rows.map(r => ({
            productPackageName: r['Product Package: Product Package Name'],
            pantryProductName: r['Pantry Product: Product'],
            lotSourceAccountName: r['Lot: Source: Account Name'] || null,
            lotFoodRescueProgram: r['Lot: Food Rescue Program'] || null,
            distributionAmount:
                r['Distribution Record: Amount'] != null
                    ? parseInt(r['Distribution Record: Amount'].toString())
                    : null,
            pantryProductWeightLbs:
                r['Pantry Product: Weight (in pounds)'] != null
                    ? parseFloat(r['Pantry Product: Weight (in pounds)'].toString())
                    : null,
            distributionCost:
                r['Distribution Record: Cost'] != null
                    ? parseFloat(r['Distribution Record: Cost'].toString())
                    : null,
            productInventoryRecordId18:
                r['Distribution Record: Product Inventory Record ID 18']?.toString() || null,
            productPackageId18: r['Product Package ID 18']?.toString() || null,
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

            const rawRows = XLSX.utils.sheet_to_json<PackagesByItemRow>(firstSheet, {
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
                    model: 'PackagesByItem',
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
