'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Search, Loader2, Download, Filter, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import FilterBar from '@/components/ui/FilterBar';
import { useFilterContext } from '@/contexts/FilterContext';
import {
    chipStyleFromDonutHex,
    foodTypeColorLookupFromComposition,
    foodTypeLabelForRow,
    processingChipStyle,
    processingDisplayLabel,
    resolveFoodTypeDonutHex,
    type FoodTypeCompositionEntry,
} from '~/lib/chartCompositionColors';

interface DeliveryRecord {
    householdId18: string;
    date: string;
    organizationName: string;
    productName: string | null;
    distributionAmount: number;
    unitWeightLbs: number | null;
    weightLbs: number;
    productType: string | null;
    minimallyProcessedFood: boolean | null;
    foodRescueProgram: string | null;
    inventoryType?: string;
    source?: string | null;
    program?: 'bulk_rescue' | 'just_eats';
    lineId?: string | null;
}

function rowProgram(row: DeliveryRecord): 'bulk_rescue' | 'just_eats' {
    return row.program ?? 'bulk_rescue';
}

function programExportLabel(row: DeliveryRecord): string {
    return rowProgram(row) === 'just_eats' ? 'Just Eats' : 'Bulk & Rescue';
}

type ProgramFilterKey = 'bulk_rescue' | 'just_eats';

function toggleProgramList(list: ProgramFilterKey[], value: ProgramFilterKey): ProgramFilterKey[] {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value];
}

function formatLbsCell(value: number | null | undefined): string {
    if (value == null || Number.isNaN(Number(value))) return '—';
    const n = Number(value);
    const rounded = Math.round(n * 100) / 100;
    const s =
        Math.abs(rounded - Math.round(rounded)) < 1e-9
            ? String(Math.round(rounded))
            : rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return `${s} lbs`;
}

type ProcessingFilterKey = 'minimal' | 'processed' | 'unspecified';

const EMPTY_VALUE = '\u0000empty\u0000';

function processingKey(m: boolean | null): ProcessingFilterKey {
    if (m === true) return 'minimal';
    if (m === false) return 'processed';
    return 'unspecified';
}

function normOptionalString(s: string | null | undefined): string {
    const t = (s ?? '').trim();
    return t === '' ? EMPTY_VALUE : t;
}

function csvEscapeCell(v: string | number): string {
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function htmlEscapeCell(v: string | number): string {
    return String(v)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function toggleInList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value];
}

function toggleProcessingList(list: ProcessingFilterKey[], value: ProcessingFilterKey) {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value];
}

const THEME_GREEN = '#B7D7BD';
const THEME_ORANGE = '#FAC87D';
const ROWS_PER_PAGE = 25;

function DistributionContent() {
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [data, setData] = useState<DeliveryRecord[]>([]);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { dateRange } = useFilterContext();
    const [exporting, setExporting] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [foodTypeColorLookup, setFoodTypeColorLookup] = useState<Map<string, string>>(
        () => new Map()
    );

    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const exportPanelRef = useRef<HTMLDivElement>(null);
    const [filterOrgs, setFilterOrgs] = useState<string[]>([]);
    const [filterProductTypes, setFilterProductTypes] = useState<string[]>([]);
    const [filterProcessing, setFilterProcessing] = useState<ProcessingFilterKey[]>([]);
    const [filterPrograms, setFilterPrograms] = useState<ProgramFilterKey[]>([]);

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
        return () => clearTimeout(id);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [
        debouncedSearch,
        dateRange.start,
        dateRange.end,
        filterPrograms,
        filterOrgs,
        filterProductTypes,
        filterProcessing,
    ]);

    useEffect(() => {
        if (!filterPanelOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
                setFilterPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [filterPanelOpen]);

    useEffect(() => {
        if (!exportMenuOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (exportPanelRef.current && !exportPanelRef.current.contains(e.target as Node)) {
                setExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [exportMenuOpen]);

    const filterOptions = useMemo(() => {
        const orgs = new Set<string>();
        const productTypes = new Set<string>();
        const inventoryTypes = new Set<string>();
        const foodRescue = new Set<string>();
        const sources = new Set<string>();
        for (const row of data) {
            orgs.add(row.organizationName);
            productTypes.add(foodTypeLabelForRow(row.productType));
            inventoryTypes.add((row.inventoryType ?? '').trim() || EMPTY_VALUE);
            foodRescue.add(normOptionalString(row.foodRescueProgram));
            sources.add(normOptionalString(row.source));
        }
        const sortStr = (a: string, b: string) =>
            a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
        return {
            orgs: [...orgs].sort(sortStr),
            productTypes: [...productTypes].sort(sortStr),
            inventoryTypes: [...inventoryTypes].sort(sortStr),
            foodRescue: [...foodRescue].sort(sortStr),
            sources: [...sources].sort(sortStr),
        };
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(row => {
            const prog = rowProgram(row);
            if (filterPrograms.length > 0 && !filterPrograms.includes(prog)) return false;
            if (filterOrgs.length > 0 && !filterOrgs.includes(row.organizationName)) return false;
            const pt = foodTypeLabelForRow(row.productType);
            if (filterProductTypes.length > 0 && !filterProductTypes.includes(pt)) return false;
            const pk = processingKey(row.minimallyProcessedFood);
            if (filterProcessing.length > 0 && !filterProcessing.includes(pk)) return false;
            const inv = (row.inventoryType ?? '').trim() || EMPTY_VALUE;
            return true;
        });
    }, [data, filterPrograms, filterOrgs, filterProductTypes, filterProcessing]);

    const activeAttributeFilterCount =
        filterPrograms.length +
        filterOrgs.length +
        filterProductTypes.length +
        filterProcessing.length;

    const clearAttributeFilters = () => {
        setFilterPrograms([]);
        setFilterOrgs([]);
        setFilterProductTypes([]);
        setFilterProcessing([]);
    };

    const labelEmptySentinel = (v: string) => (v === EMPTY_VALUE ? '(none)' : v);

    const exportHeaders = useMemo(
        () => [
            'Date',
            'Program',
            'Organization',
            'Food',
            'Amount',
            'Unit weight (lbs)',
            'Total weight (lbs)',
            'Food type',
            'Processing',
            'Inventory type',
            'Source',
            'Food rescue program',
        ],
        []
    );

    const exportRows = useMemo(() => {
        return filteredData.map(d => [
            format(new Date(d.date), 'yyyy-MM-dd'),
            programExportLabel(d),
            d.organizationName,
            d.productName?.trim() || '',
            Number(d.distributionAmount ?? 1),
            d.unitWeightLbs == null || Number.isNaN(Number(d.unitWeightLbs))
                ? ''
                : Number(d.unitWeightLbs),
            Number(d.weightLbs ?? 0),
            foodTypeLabelForRow(d.productType),
            processingDisplayLabel(d.minimallyProcessedFood),
            (d.inventoryType ?? '').trim(),
            (d.source ?? '').trim(),
            (d.foodRescueProgram ?? '').trim(),
        ]);
    }, [filteredData]);

    const exportFilenameBase = `distribution-${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}`;

    const triggerBlobDownload = (blob: Blob, fileName: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleExport = (formatType: 'csv' | 'excel' | 'pdf') => {
        if (filteredData.length === 0) {
            alert('No records to export for the current filters.');
            return;
        }
        setExporting(true);
        setExportMenuOpen(false);
        try {
            if (formatType === 'csv') {
                const lines = [exportHeaders.map(csvEscapeCell).join(',')];
                for (const row of exportRows) {
                    lines.push(row.map(csvEscapeCell).join(','));
                }
                const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
                triggerBlobDownload(blob, `${exportFilenameBase}.csv`);
                return;
            }

            if (formatType === 'excel') {
                const workbookRows = [
                    exportHeaders,
                    ...exportRows.map(row => row.map(cell => (cell == null ? '' : cell))),
                ];
                const worksheet = XLSX.utils.aoa_to_sheet(workbookRows);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Distribution');
                XLSX.writeFile(workbook, `${exportFilenameBase}.xlsx`);
                return;
            }

            const tableRows = exportRows
                .map(
                    row =>
                        `<tr>${row.map(cell => `<td>${htmlEscapeCell(cell)}</td>`).join('')}</tr>`
                )
                .join('');
            const printableHtml = `<!doctype html><html><head><meta charset="utf-8" />
<title>Distribution Export</title>
<style>
body{font-family:Inter,Arial,sans-serif;padding:18px;color:#111827;}
h1{font-size:18px;margin:0 0 4px;}
p{font-size:12px;color:#4b5563;margin:0 0 12px;}
table{border-collapse:collapse;width:100%;}
th,td{border:1px solid #d1d5db;padding:6px 8px;font-size:11px;text-align:left;vertical-align:top;}
thead th{background:#f3f4f6;font-weight:600;}
</style>
</head><body>
<h1>Distribution Export</h1>
<p>${htmlEscapeCell(format(dateRange.start, 'MMM d, yyyy'))} to ${htmlEscapeCell(format(dateRange.end, 'MMM d, yyyy'))}</p>
<table><thead><tr>${exportHeaders.map(h => `<th>${htmlEscapeCell(h)}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table>
</body></html>`;
            const printFrame = document.createElement('iframe');
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            printFrame.setAttribute('aria-hidden', 'true');
            document.body.appendChild(printFrame);

            const cleanup = () => {
                window.setTimeout(() => {
                    printFrame.remove();
                }, 300);
            };

            printFrame.onload = () => {
                const frameWindow = printFrame.contentWindow;
                if (!frameWindow) {
                    cleanup();
                    alert('Unable to open print dialog. Please try again.');
                    return;
                }
                frameWindow.focus();
                frameWindow.print();
                frameWindow.onafterprint = cleanup;
                window.setTimeout(cleanup, 2000);
            };

            printFrame.srcdoc = printableHtml;
        } catch (err: unknown) {
            console.error('Export error:', err);
            alert(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const ac = new AbortController();
        async function fetchCompositionColors() {
            try {
                const rangeParams = new URLSearchParams({
                    start: dateRange.start.toISOString(),
                    end: dateRange.end.toISOString(),
                });
                const res = await fetch(`/api/overview/food-types?${rangeParams.toString()}`, {
                    signal: ac.signal,
                });
                if (!res.ok) return;
                const composition = (await res.json()) as {
                    foodTypes?: FoodTypeCompositionEntry[];
                };
                if (ac.signal.aborted) return;
                const list = Array.isArray(composition.foodTypes) ? composition.foodTypes : [];
                setFoodTypeColorLookup(foodTypeColorLookupFromComposition(list));
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error(err);
            }
        }
        void fetchCompositionColors();
        return () => ac.abort();
    }, [dateRange.start, dateRange.end]);

    useEffect(() => {
        const ac = new AbortController();
        async function fetchDeliveries() {
            setLoading(true);
            try {
                const deliveriesParams = new URLSearchParams({
                    start: dateRange.start.toISOString(),
                    end: dateRange.end.toISOString(),
                    search: debouncedSearch,
                });
                const res = await fetch(
                    `/api/distribution/deliveries?${deliveriesParams.toString()}`,
                    {
                        signal: ac.signal,
                    }
                );
                if (!res.ok) throw new Error('Failed to fetch data.');
                const json = await res.json();
                if (ac.signal.aborted) return;
                setData(json);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error(err);
            } finally {
                if (!ac.signal.aborted) setLoading(false);
            }
        }
        void fetchDeliveries();
        return () => ac.abort();
    }, [dateRange.start, dateRange.end, debouncedSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
    const currentPageSafe = Math.min(currentPage, totalPages);
    const startIdx = (currentPageSafe - 1) * ROWS_PER_PAGE;
    const paginatedData = filteredData.slice(startIdx, startIdx + ROWS_PER_PAGE);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [currentPage, totalPages]);

    const pageWindowStart = Math.max(1, currentPageSafe - 2);
    const pageWindowEnd = Math.min(totalPages, pageWindowStart + 4);
    const pageNumbers: number[] = [];
    for (let page = pageWindowStart; page <= pageWindowEnd; page += 1) {
        pageNumbers.push(page);
    }

    return (
        <>
            <div className="min-h-screen bg-[#FAF9F7]">
                <div className="mx-auto min-w-0 max-w-6xl space-y-4 px-8 py-8 sm:py-10">
                    <div className="mb-6 sm:mb-4">
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-gray-900">
                            Distribution
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Past deliveries include Bulk &amp; Rescue inventory lines and Just Eats
                            box deliveries (1 unit, 25 lbs each). Search matches organization, food,
                            inventory type, and tags. Use Filters to narrow by program,
                            organization, food type, processing, inventory type, food rescue
                            program, and source. Export CSV reflects the table (date range, search,
                            and attribute filters. Choose CSV, Excel, or PDF from Export.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[12rem] w-full max-w-md sm:w-72 sm:max-w-none sm:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                placeholder="Search org, food, Just Eats, inventory type, tags…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                            />
                        </div>
                        <div className="relative inline-block shrink-0" ref={filterPanelRef}>
                            <button
                                type="button"
                                onClick={() => setFilterPanelOpen(o => !o)}
                                className="h-10 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
                                aria-expanded={filterPanelOpen}
                                aria-haspopup="dialog"
                            >
                                <Filter className="h-4 w-4 text-gray-600" aria-hidden />
                                Filters
                                {activeAttributeFilterCount > 0 ? (
                                    <span className="min-w-[1.25rem] rounded-full bg-[#B7D7BD] px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums text-gray-900">
                                        {activeAttributeFilterCount}
                                    </span>
                                ) : null}
                            </button>
                            {filterPanelOpen ? (
                                <div
                                    className="absolute left-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),22rem)] sm:w-96 max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5"
                                    style={{
                                        maxHeight: 'min(70vh, 32rem)',
                                    }}
                                    role="dialog"
                                    aria-label="Attribute filters"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Filter by attribute
                                        </p>
                                        {activeAttributeFilterCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={clearAttributeFilters}
                                                className="text-xs font-medium text-[#1C5E2C] underline underline-offset-2 hover:text-[#164a22]"
                                            >
                                                Clear all
                                            </button>
                                        ) : null}
                                    </div>
                                    <p className="mb-3 text-xs text-gray-500">
                                        Empty sections mean &quot;any&quot;; checked values are
                                        combined with OR within a group and AND across groups.
                                    </p>
                                    <div className="space-y-4">
                                        {/* Program */}
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Program
                                            </p>
                                            <div className="space-y-1.5 rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {(
                                                    [
                                                        ['bulk_rescue', 'Bulk & Rescue'],
                                                        ['just_eats', 'Just Eats'],
                                                    ] as const
                                                ).map(([key, label]) => (
                                                    <label
                                                        key={key}
                                                        className="flex cursor-pointer items-center gap-2 text-xs text-gray-800"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1C5E2C]"
                                                            checked={filterPrograms.includes(key)}
                                                            onChange={() =>
                                                                setFilterPrograms(prev =>
                                                                    toggleProgramList(prev, key)
                                                                )
                                                            }
                                                        />
                                                        <span className="min-w-0 break-words">
                                                            {label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Organization */}
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Organization
                                            </p>
                                            <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {filterOptions.orgs.length === 0 ? (
                                                    <p className="text-xs text-gray-400">
                                                        No values
                                                    </p>
                                                ) : (
                                                    filterOptions.orgs.map(org => (
                                                        <label
                                                            key={org}
                                                            className="flex cursor-pointer items-start gap-2 text-xs text-gray-800"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1C5E2C]"
                                                                checked={filterOrgs.includes(org)}
                                                                onChange={() =>
                                                                    setFilterOrgs(prev =>
                                                                        toggleInList(prev, org)
                                                                    )
                                                                }
                                                            />
                                                            <span className="min-w-0 break-words">
                                                                {org}
                                                            </span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Food type */}
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Food type
                                            </p>
                                            <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {filterOptions.productTypes.map(pt => (
                                                    <label
                                                        key={pt}
                                                        className="flex cursor-pointer items-start gap-2 text-xs text-gray-800"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1C5E2C]"
                                                            checked={filterProductTypes.includes(
                                                                pt
                                                            )}
                                                            onChange={() =>
                                                                setFilterProductTypes(prev =>
                                                                    toggleInList(prev, pt)
                                                                )
                                                            }
                                                        />
                                                        <span className="min-w-0 break-words">
                                                            {pt}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Processing */}
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Processing
                                            </p>
                                            <div className="space-y-1.5 rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {(
                                                    [
                                                        ['minimal', 'Minimally Processed'],
                                                        ['processed', 'Processed'],
                                                        ['unspecified', 'Not Specified'],
                                                    ] as const
                                                ).map(([key, label]) => (
                                                    <label
                                                        key={key}
                                                        className="flex cursor-pointer items-center gap-2 text-xs text-gray-800"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1C5E2C]"
                                                            checked={filterProcessing.includes(key)}
                                                            onChange={() =>
                                                                setFilterProcessing(prev =>
                                                                    toggleProcessingList(prev, key)
                                                                )
                                                            }
                                                        />
                                                        <span className="min-w-0 break-words">
                                                            {label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="relative inline-block shrink-0" ref={exportPanelRef}>
                            <button
                                type="button"
                                onClick={() => setExportMenuOpen(open => !open)}
                                disabled={exporting}
                                className="h-10 shrink-0 px-4 rounded-lg text-gray-800 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors border border-[#9fc5a9] hover:bg-[#9fc5a9]/80"
                                style={{ backgroundColor: THEME_GREEN }}
                                aria-expanded={exportMenuOpen}
                                aria-haspopup="menu"
                            >
                                {exporting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Export
                                <ChevronDown className="w-4 h-4 text-gray-700" />
                            </button>
                            {exportMenuOpen ? (
                                <div
                                    className="absolute right-0 top-full z-50 mt-2 min-w-44 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5"
                                    role="menu"
                                    aria-label="Export format"
                                >
                                    {[
                                        { key: 'csv', label: 'CSV (.csv)' },
                                        { key: 'excel', label: 'Excel (.xls)' },
                                        { key: 'pdf', label: 'PDF (printable)' },
                                    ].map(option => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() =>
                                                handleExport(option.key as 'csv' | 'excel' | 'pdf')
                                            }
                                            className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-800 transition-colors hover:bg-gray-50"
                                            role="menuitem"
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <FilterBar />

                    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse" style={{ minWidth: 920 }}>
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="align-middle text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[102px]">
                                            Date
                                        </th>
                                        <th className="align-middle text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-40 max-w-xs">
                                            Food
                                        </th>
                                        <th className="align-middle text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-48">
                                            Organization
                                        </th>
                                        <th className="align-middle text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider tabular-nums w-[88px]">
                                            Amount
                                        </th>
                                        <th className="align-middle text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider tabular-nums w-[104px]">
                                            Total
                                        </th>
                                        <th className="align-middle text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-44">
                                            Tags
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-20 text-center text-gray-500"
                                            >
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                                Loading…
                                            </td>
                                        </tr>
                                    ) : data.length > 0 && filteredData.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-20 text-center text-gray-500 text-sm"
                                            >
                                                No rows match the selected attribute filters. Try
                                                clearing filters or adjusting your search.
                                            </td>
                                        </tr>
                                    ) : filteredData.length > 0 ? (
                                        paginatedData.map((d, index) => {
                                            const isJustEats = rowProgram(d) === 'just_eats';
                                            const typeLabel = foodTypeLabelForRow(d.productType);
                                            const procLabel = processingDisplayLabel(
                                                d.minimallyProcessedFood
                                            );
                                            const foodLabel = d.productName?.trim() || '—';
                                            const amt = Number(d.distributionAmount ?? 1);
                                            const unitHint =
                                                !isJustEats &&
                                                d.unitWeightLbs != null &&
                                                !Number.isNaN(Number(d.unitWeightLbs))
                                                    ? `${formatLbsCell(d.unitWeightLbs)} each`
                                                    : isJustEats
                                                      ? '25 lbs per unit'
                                                      : undefined;
                                            const rowKey = d.lineId
                                                ? `je-${d.lineId}`
                                                : `br-${d.householdId18}-${String(d.date)}-${d.productName ?? ''}-${amt}-${startIdx + index}`;
                                            return (
                                                <tr
                                                    key={rowKey}
                                                    className="border-b border-gray-100 last:border-b-0"
                                                >
                                                    <td className="align-top py-3 px-4 text-sm text-gray-600 tabular-nums">
                                                        {format(new Date(d.date), 'M/d/yyyy')}
                                                    </td>
                                                    <td
                                                        className="align-top py-3 px-4 text-sm text-gray-700 min-w-0 max-w-xs"
                                                        title={
                                                            foodLabel !== '—'
                                                                ? foodLabel
                                                                : undefined
                                                        }
                                                    >
                                                        <span
                                                            className="block min-w-0 max-w-full truncate"
                                                            title={
                                                                foodLabel !== '—'
                                                                    ? foodLabel
                                                                    : undefined
                                                            }
                                                        >
                                                            {foodLabel}
                                                        </span>
                                                    </td>
                                                    <td className="align-top py-3 px-4 text-sm font-medium text-gray-900 wrap-break-word">
                                                        {d.organizationName}
                                                    </td>
                                                    <td className="align-top py-3 px-4 text-sm text-gray-800 text-right tabular-nums">
                                                        {amt.toLocaleString()}
                                                    </td>
                                                    <td
                                                        className="align-top py-3 px-4 text-sm font-medium text-gray-900 text-right tabular-nums"
                                                        title={unitHint}
                                                    >
                                                        {formatLbsCell(d.weightLbs)}
                                                    </td>
                                                    <td className="align-top py-3 px-4">
                                                        <div className="flex flex-col items-start gap-1.5">
                                                            {isJustEats ? (
                                                                <span
                                                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap"
                                                                    style={{
                                                                        backgroundColor:
                                                                            THEME_ORANGE,
                                                                        borderColor: '#e8b85a',
                                                                        color: '#1f2937',
                                                                    }}
                                                                >
                                                                    Just Eats
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    <span
                                                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap"
                                                                        style={chipStyleFromDonutHex(
                                                                            resolveFoodTypeDonutHex(
                                                                                d.productType,
                                                                                foodTypeColorLookup
                                                                            )
                                                                        )}
                                                                    >
                                                                        {typeLabel}
                                                                    </span>
                                                                    <span
                                                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border whitespace-nowrap"
                                                                        style={processingChipStyle(
                                                                            d.minimallyProcessedFood
                                                                        )}
                                                                    >
                                                                        {procLabel}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-20 text-center text-gray-500 text-sm"
                                            >
                                                No deliveries match your search and date range.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {!loading && filteredData.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-gray-500">
                                Showing {startIdx + 1}-
                                {Math.min(startIdx + ROWS_PER_PAGE, filteredData.length)} of{' '}
                                {filteredData.length}
                            </p>
                            <div className="inline-flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPageSafe === 1}
                                    className="h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                {pageNumbers.map(page => (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => setCurrentPage(page)}
                                        className={`h-9 min-w-9 px-2 rounded-md border text-sm ${
                                            page === currentPageSafe
                                                ? 'bg-[#B7D7BD] border-[#9fc5a9] text-gray-900'
                                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPageSafe === totalPages}
                                    className="h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function DistributionPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            }
        >
            <DistributionContent />
        </Suspense>
    );
}
