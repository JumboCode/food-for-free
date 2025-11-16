'use client';

import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';

type FileInfo = {
    name: string;
    rowsCount: number;
};

export default function FileUploadButton() {
    const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (!file) return;
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: null });
        const cleanedRows = rows
            .map(row => {
                // Create a new cleaned row object
                const cleanedRow: Record<string, unknown> = {};

                for (const [key, value] of Object.entries(row)) {
                    if (typeof value === 'string') {
                        // Trim whitespace from strings
                        const trimmed = value.trim();
                        // Convert empty strings to null
                        cleanedRow[key] = trimmed === '' ? null : trimmed;
                    } else {
                        // Keep non-string values as-is (numbers, booleans, null, etc.)
                        cleanedRow[key] = value;
                    }
                }

                return cleanedRow;
            })
            .filter(row => {
                // Ignore rows where ALL values are null
                return Object.values(row).some(value => value !== null);
            });

        setFileInfo({ name: file.name, rowsCount: cleanedRows.length });
        setParsedData(cleanedRows);

        // basic client-side validation for extension
        const allowed = ['.xls', '.xlsx'];
        const lower = file.name.toLowerCase();
        if (!allowed.some(ext => lower.endsWith(ext))) {
            setError('Please select an .xls or .xlsx file');
            setFileInfo(null);
            return;
        }

        try {
            setLoading(true);
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const firstSheetName = workbook.SheetNames[0];
            const firstSheet = workbook.Sheets[firstSheetName];
            const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(firstSheet, {
                defval: null,
            });

            setFileInfo({ name: file.name, rowsCount: rows.length });
        } catch (err) {
            console.error(err);
            setError('Failed to parse file');
            setFileInfo(null);
        } finally {
            setLoading(false);
            // clear the file input so the same file can be re-selected if needed
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
