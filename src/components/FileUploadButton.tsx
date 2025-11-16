'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

type FileInfo = {
    name: string;
    rowsCount: number;
};

export interface InventoryRecord {
    pantryProduct: string;
    inventoryType: 'Intake' | 'Distribution';
    amount: number;
    productUnitsForDisplay?: string;
    weightInPounds?: number;
    source?: string;
    destination?: string | null;
    date: string;
    location?: string;
}

type FileUploadButtonProps = {
    onDataParsed?: (data: InventoryRecord[]) => void;
};

const ALLOWED_EXTENSIONS = ['.xls', '.xlsx', '.csv'];

function cleanRow(row: Record<string, unknown>): Record<string, unknown> | null {
    const cleaned: Record<string, unknown> = {};
    let hasValue = false;

    for (const [key, rawValue] of Object.entries(row)) {
        if (rawValue === undefined || rawValue === null) {
            cleaned[key] = null;
            continue;
        }

        if (typeof rawValue === 'string') {
            const trimmed = rawValue.trim();
            if (trimmed === '') {
                cleaned[key] = null;
            } else {
                cleaned[key] = trimmed;
                hasValue = true;
            }
        } else {
            // Non-string: keep as-is (numbers, dates, etc.)
            cleaned[key] = rawValue;
            hasValue = true;
        }
    }

    // If the row has no non-null values, treat as fully blank and skip
    if (!hasValue) return null;
    return cleaned;
}

export function getUniqueDestinations(records: InventoryRecord[]): string[] {
    const destinations = records.map(r => {
        const raw = r.destination ?? null;
        const trimmed = typeof raw === 'string' ? raw.trim() : '';
        return trimmed || 'No Destination';
    });

    return Array.from(new Set(destinations)).sort((a, b) => a.localeCompare(b));
}

// used to map header names to our normalized field names
function mapRowToInventoryRecord(row: Record<string, unknown>): InventoryRecord {
    // These keys MUST match the exact headers in Rescue Numbers.xls
    const pantryProductRaw = row['Pantry Product: Product'];
    const inventoryTypeRaw = row['Inventory Type'];
    const amountRaw = row['Amount'];
    const productUnitsForDisplayRaw = row['Product Units for Display'];
    const weightInPoundsRaw = row['Weight (in pounds)'];
    const sourceRaw = row['Source'];
    const destinationRaw = row['Destination'];
    const dateRaw = row['Date'];
    const locationRaw = row['Location'];

    const inventoryTypeStr = String(inventoryTypeRaw ?? '').trim();
    const normalizedInventoryType: 'Intake' | 'Distribution' =
        inventoryTypeStr === 'Distribution' ? 'Distribution' : 'Intake';

    const amountNum = amountRaw == null || amountRaw === '' ? 0 : Number(amountRaw);

    const weightNum =
        weightInPoundsRaw == null || weightInPoundsRaw === ''
            ? undefined
            : Number(weightInPoundsRaw);

    const productUnits =
        productUnitsForDisplayRaw == null || productUnitsForDisplayRaw === ''
            ? undefined
            : String(productUnitsForDisplayRaw).trim();

    const source = sourceRaw == null || sourceRaw === '' ? undefined : String(sourceRaw).trim();

    const destinationTrimmed = String(destinationRaw ?? '').trim();
    const destination = destinationTrimmed === '' ? null : destinationTrimmed;

    const location =
        locationRaw == null || locationRaw === '' ? undefined : String(locationRaw).trim();

    return {
        pantryProduct: String(pantryProductRaw ?? '').trim(),
        inventoryType: normalizedInventoryType,
        amount: amountNum,
        productUnitsForDisplay: productUnits,
        weightInPounds: weightNum,
        source,
        destination,
        date: String(dateRaw ?? '').trim(),
        location,
    };
}

export default function FileUploadButton({ onDataParsed }: FileUploadButtonProps) {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        const lower = file.name.toLowerCase();
        const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));

        if (!hasValidExtension) {
            setError('Please select an .xls, .xlsx, or .csv file');
            setFileInfo(null);
            return;
        }

        try {
            setLoading(true);

            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const firstSheet = workbook.Sheets[firstSheetName];

            const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(firstSheet, {
                defval: null,
                raw: false,
            });

            const cleanedRows = rawRows
                .map(cleanRow)
                .filter((row): row is Record<string, unknown> => row !== null);

            const records: InventoryRecord[] = cleanedRows.map(mapRowToInventoryRecord);

            setFileInfo({
                name: file.name,
                rowsCount: records.length,
            });

            // Pass parsed, cleaned data up to the parent page
            if (onDataParsed) {
                onDataParsed(records);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to parse file');
            setFileInfo(null);
        } finally {
            setLoading(false);
            // Clear the file input so the same file can be re-selected if needed
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="w-full max-w-md">
            <input
                ref={inputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
                aria-hidden
            />

            <div className="flex items-center gap-4">
                <Button type="button" onClick={() => inputRef.current?.click()}>
                    Choose Excel file
                </Button>
                {loading && <div className="text-sm text-muted-foreground">Parsing file…</div>}
            </div>

            <div className="mt-3">
                {error && <div className="text-sm text-red-600">{error}</div>}
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
