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

export default function PackagesByItemUpload({
    onUploadSuccess,
}: PackagesByItemUploadProps) {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const normalizeRows = (rows: any[]) => {
        return rows
            .map((r, index) => {
                // String fields
                const productPackageName = r['Product Package Name'] || r['Product Package: Product Package Name  ↑'];
                const pantryProductName = r['Pantry Product Name'] || r['Pantry Product: Product  ↑'];
                const lotSourceAccountName = r['Lot Source Account Name'] || r['Lot: Source: Account Name'];
                const lotFoodRescueProgram = r['Lot Food Rescue Program'] || r['Lot: Food Rescue Program'];
                
                // Int field distributionAmount
                const rawDistAmount = r['Distribution Amount'] || r['Distribution Record: Amount'];
                let distributionAmount: number | null = null;
                if (rawDistAmount != null) {
                    const parsed = parseInt(String(rawDistAmount), 10);
                    if (!isNaN(parsed)) distributionAmount = parsed;
                }

                // Float field pantryProductWeightLbs
                const rawWeight = r['Pantry Product Weight Lbs'] || r['Pantry Product: Weight (in pounds)'];
                let pantryProductWeightLbs: number | null = null;
                if (rawWeight != null) {
                    const parsed = parseFloat(String(rawWeight));
                    if (!isNaN(parsed)) pantryProductWeightLbs = parsed;
                }

                // Float field distributionCost
                const rawCost = r['Distribution Cost'] || r['Distribution Record: Cost'];
                let distributionCost: number | null = null;
                if (rawCost != null) {
                    const parsed = parseFloat(String(rawCost));
                    if (!isNaN(parsed)) distributionCost = parsed;
                }

                // Required String ID fields
                const productInventoryRecordId18 = r['Distribution Record: Product Inventory Record ID 18'] 
                    ? String(r['Distribution Record: Product Inventory Record ID 18']).trim() 
                    : null;
                const productPackageId18 = r['Product Package ID 18']
                    ? String(r['Product Package ID 18']).trim()
                    : null;

                // Debug logging for first few rows 
                if (index < 3) {
                    console.log(`Row ${index} (PackagesByItem):`, {
                        productPackageName,
                        distributionAmount,
                        productInventoryRecordId18,
                        productPackageId18
                    });
                }

                return {
                    productPackageName: productPackageName || null,
                    pantryProductName: pantryProductName || null,
                    lotSourceAccountName: lotSourceAccountName || null,
                    lotFoodRescueProgram: lotFoodRescueProgram || null,
                    distributionAmount,
                    pantryProductWeightLbs,
                    distributionCost,
                    productInventoryRecordId18,
                    productPackageId18,
                };
            })
            .filter(r => {
                //Check for all required fields
                return r.productInventoryRecordId18 && r.productPackageId18;
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

            // range: 1 skips the title row and uses the second row as headers
            const dataRows = XLSX.utils.sheet_to_json(firstSheet, {
                defval: null,
                range: 1, 
            });

            const normalized = normalizeRows(dataRows);

            if (normalized.length === 0) {
                const sampleRow = dataRows[0] as any;
                const availableColumns = Object.keys(sampleRow || {});
                
                throw new Error(
                    `No valid records found. Required columns: 'Product Inventory Record ID 18' and 'Product Package ID 18'.\n\n` +
                    `Detected Columns: ${availableColumns.join(', ')}`
                );
            }

            setFileInfo({ name: file.name, rowsCount: normalized.length });

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
            if (!res.ok) throw new Error(json.error || 'Upload failed');

            setSuccess(`Uploaded ${json.count} rows successfully!`);
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
                        <div><strong>Valid Rows found:</strong> {fileInfo.rowsCount}</div>
                    </div>
                )}
            </div>
        </div>
    );
}