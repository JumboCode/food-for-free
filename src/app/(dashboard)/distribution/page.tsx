'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense, useId } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, Download, ChevronDown, X } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import FilterBar from '@/components/ui/FilterBar';
import SearchBarOverview from '@/components/ui/SearchBarOverview';
import { useFilterContext } from '@/contexts/FilterContext';
import { useOrgScopeContext } from '@/contexts/OrgScopeContext';
import { useViewerContext } from '@/contexts/ViewerContext';
import type { PartnerOrgCard } from '@/types/partner';
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

function processingKey(m: boolean | null): ProcessingFilterKey {
    if (m === true) return 'minimal';
    if (m === false) return 'processed';
    return 'unspecified';
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

const ROWS_PER_PAGE = 25;

function DistributionContent() {
    const foodSearchId = useId();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isAdmin } = useViewerContext();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [partnerOrganizations, setPartnerOrganizations] = useState<PartnerOrgCard[]>([]);
    const { selectedOrg, setSelectedOrg, clearSelectedOrg } = useOrgScopeContext();

    const [data, setData] = useState<DeliveryRecord[]>([]);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const { dateRange } = useFilterContext();
    const [exporting, setExporting] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [foodTypeColorLookup, setFoodTypeColorLookup] = useState<Map<string, string>>(
        () => new Map()
    );
    const [availableProductTypes, setAvailableProductTypes] = useState<string[]>([]);

    const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
    const [foodTypeDropdownOpen, setFoodTypeDropdownOpen] = useState(false);
    const [processingDropdownOpen, setProcessingDropdownOpen] = useState(false);
    const programDropdownRef = useRef<HTMLDivElement>(null);
    const foodTypeDropdownRef = useRef<HTMLDivElement>(null);
    const processingDropdownRef = useRef<HTMLDivElement>(null);
    const exportPanelRef = useRef<HTMLDivElement>(null);
    const [filterProductTypes, setFilterProductTypes] = useState<string[]>([]);
    const [filterProcessing, setFilterProcessing] = useState<ProcessingFilterKey[]>([]);
    const [filterPrograms, setFilterPrograms] = useState<ProgramFilterKey[]>([]);

    // Read org from URL on mount (for deep-linking)
    useEffect(() => {
        const householdId18 = searchParams.get('householdId18')?.trim();
        if (householdId18) {
            setSelectedOrg({ name: 'Selected organization', householdId18 });
        }
    }, [searchParams, setSelectedOrg]);

    // Fetch partner org list for admin org selector
    useEffect(() => {
        if (!isAdmin) return;
        let cancelled = false;
        fetch('/api/overview/partners')
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then((d: { partners?: PartnerOrgCard[] }) => {
                if (!cancelled)
                    setPartnerOrganizations(Array.isArray(d.partners) ? d.partners : []);
            })
            .catch(() => {
                if (!cancelled) setPartnerOrganizations([]);
            });
        return () => {
            cancelled = true;
        };
    }, [isAdmin]);

    // Resolve org name from partner list once loaded
    useEffect(() => {
        if (
            !selectedOrg ||
            selectedOrg.name !== 'Selected organization' ||
            partnerOrganizations.length === 0
        )
            return;
        const match = partnerOrganizations.find(p => p.householdId18 === selectedOrg.householdId18);
        if (match) setSelectedOrg({ name: match.name, householdId18: match.householdId18 });
    }, [partnerOrganizations, selectedOrg, setSelectedOrg]);

    // Sync selected org into URL
    const handleSelectOrg = (org: { name: string; householdId18?: string | null }) => {
        setSelectedOrg(org);
        const params = new URLSearchParams(searchParams.toString());
        if (org.householdId18) {
            params.set('householdId18', org.householdId18);
        } else {
            params.delete('householdId18');
        }
        router.push(`?${params.toString()}`);
    };

    const handleClearOrg = () => {
        clearSelectedOrg();
        const params = new URLSearchParams(searchParams.toString());
        params.delete('householdId18');
        router.push(`?${params.toString()}`);
    };

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
        selectedOrg,
        filterProductTypes,
        filterProcessing,
    ]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as Node;
            if (programDropdownRef.current && !programDropdownRef.current.contains(t))
                setProgramDropdownOpen(false);
            if (foodTypeDropdownRef.current && !foodTypeDropdownRef.current.contains(t))
                setFoodTypeDropdownOpen(false);
            if (processingDropdownRef.current && !processingDropdownRef.current.contains(t))
                setProcessingDropdownOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

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

    useEffect(() => {
        const ac = new AbortController();
        async function fetchFilterOptions() {
            try {
                const res = await fetch('/api/distribution/filter-options', { signal: ac.signal });
                if (!res.ok) return;
                const payload = (await res.json()) as { productTypes?: string[] };
                if (ac.signal.aborted) return;
                setAvailableProductTypes(
                    Array.isArray(payload.productTypes) ? payload.productTypes : []
                );
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') return;
                console.error(err);
            }
        }
        void fetchFilterOptions();
        return () => ac.abort();
    }, []);

    const availableProductTypesSorted = useMemo(() => {
        const byKey = new Map<string, string>();
        for (const label of availableProductTypes) byKey.set(label.toLowerCase(), label);
        for (const row of data) {
            const label = foodTypeLabelForRow(row.productType).trim();
            byKey.set(label.toLowerCase(), label);
        }
        return [...byKey.values()].sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
        );
    }, [data, availableProductTypes]);

    const filteredData = useMemo(() => {
        const selectedProductTypeKeys = new Set(
            filterProductTypes.map(v => v.trim().toLowerCase())
        );
        return data.filter(row => {
            const prog = rowProgram(row);
            if (filterPrograms.length > 0 && !filterPrograms.includes(prog)) return false;
            const ptKey = foodTypeLabelForRow(row.productType).trim().toLowerCase();
            if (filterProductTypes.length > 0 && !selectedProductTypeKeys.has(ptKey)) return false;
            const pk = processingKey(row.minimallyProcessedFood);
            if (filterProcessing.length > 0 && !filterProcessing.includes(pk)) return false;
            return true;
        });
    }, [data, filterPrograms, filterProductTypes, filterProcessing]);

    // Human-readable label for each dropdown button when filters are active
    const programLabel =
        filterPrograms.length === 0
            ? null
            : filterPrograms.length === 2
              ? 'Both programs'
              : filterPrograms[0] === 'bulk_rescue'
                ? 'Bulk & Rescue'
                : 'Just Eats';

    const foodTypeLabel =
        filterProductTypes.length === 0
            ? null
            : filterProductTypes.length === 1
              ? filterProductTypes[0]
              : `${filterProductTypes.length} types`;

    const processingLabel =
        filterProcessing.length === 0
            ? null
            : filterProcessing.length === 1
              ? (
                    {
                        minimal: 'Minimally Processed',
                        processed: 'Processed',
                        unspecified: 'Not Specified',
                    } as const
                )[filterProcessing[0]]
              : `${filterProcessing.length} selected`;

    const activeAttributeFilterCount =
        filterPrograms.length + filterProductTypes.length + filterProcessing.length;

    const clearAttributeFilters = () => {
        setFilterPrograms([]);
        setFilterProductTypes([]);
        setFilterProcessing([]);
    };

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
                if (selectedOrg?.householdId18)
                    deliveriesParams.set('householdId18', selectedOrg.householdId18);
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
    }, [dateRange.start, dateRange.end, debouncedSearch, selectedOrg]);

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

    const changePage = (nextPage: number) => {
        window.scrollTo({ top: 0, behavior: 'auto' });
        setCurrentPage(nextPage);
    };

    return (
        <>
            <div className="min-h-screen bg-[#FAF9F7]">
                <div className="mx-auto min-w-0 max-w-6xl space-y-4 px-8 py-8 sm:py-10">
                    <div className="mb-3 sm:mb-2">
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-gray-900">
                            Distribution
                        </h1>
                        {selectedOrg ? (
                            <p className="mt-1 text-sm text-gray-600">
                                Showing deliveries for:{' '}
                                <span className="font-medium text-gray-900">
                                    {selectedOrg.name}
                                </span>
                                <span className="mx-2 text-gray-300">·</span>
                                <button
                                    type="button"
                                    onClick={handleClearOrg}
                                    className="text-[#1C5E2C] font-medium underline underline-offset-2 hover:text-[#164a22]"
                                >
                                    View all organizations
                                </button>
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-gray-500">
                                Food delivery records across all programs.
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Row 1: searches */}
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            {isAdmin ? (
                                <SearchBarOverview
                                    organizations={partnerOrganizations}
                                    onSelectPartner={handleSelectOrg}
                                    selectedPartner={selectedOrg}
                                    onClearPartner={handleClearOrg}
                                    wrapperClassName="w-52 shrink-0 sm:w-56"
                                    placeholder="Search organizations"
                                />
                            ) : null}
                            <div className="relative w-40 shrink-0 sm:w-44">
                                <Search
                                    className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                                    aria-hidden
                                />
                                <input
                                    id={foodSearchId}
                                    type="text"
                                    placeholder="Search food"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-(--fff-green) focus:outline-none focus:ring-2 focus:ring-(--fff-green)"
                                    autoComplete="off"
                                />
                                {searchTerm.trim().length > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                        aria-label="Clear food search"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {/* Row 2: filters */}
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-2">
                            {/* Program dropdown */}
                            <div
                                className={`relative inline-flex shrink-0 rounded-lg border bg-white ${
                                    filterPrograms.length > 0
                                        ? 'border-[#9fc5a9]'
                                        : 'border-gray-200'
                                }`}
                                ref={programDropdownRef}
                            >
                                <button
                                    type="button"
                                    title={
                                        filterPrograms.length > 0
                                            ? 'Change program filter'
                                            : undefined
                                    }
                                    onClick={() => setProgramDropdownOpen(o => !o)}
                                    className={`h-10 inline-flex max-w-44 items-center gap-1.5 border-0 px-2.5 text-sm font-medium transition-colors sm:max-w-52 ${
                                        filterPrograms.length > 0
                                            ? 'rounded-l-lg bg-[#e8f4eb] text-[#1C5E2C]'
                                            : 'rounded-lg bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="min-w-0 truncate">
                                        {programLabel ?? 'Program'}
                                    </span>
                                    {filterPrograms.length === 0 ? (
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                    ) : null}
                                </button>
                                {filterPrograms.length > 0 ? (
                                    <button
                                        type="button"
                                        className="flex h-10 shrink-0 items-center rounded-r-lg border-l border-[#9fc5a9] bg-[#e8f4eb] px-2 text-[#1C5E2C] transition-colors hover:bg-[#dceee0]"
                                        aria-label="Clear program filter"
                                        onClick={e => {
                                            e.stopPropagation();
                                            setFilterPrograms([]);
                                            setProgramDropdownOpen(false);
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </button>
                                ) : null}
                                {programDropdownOpen && (
                                    <div className="absolute left-0 top-full z-100 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white p-2.5 shadow-xl">
                                        {filterPrograms.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setFilterPrograms([])}
                                                className="mb-1.5 w-full text-left px-2 py-1 text-xs text-[#1C5E2C] font-medium hover:underline"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        {(
                                            [
                                                ['bulk_rescue', 'Bulk & Rescue'],
                                                ['just_eats', 'Just Eats'],
                                            ] as const
                                        ).map(([key, label]) => (
                                            <label
                                                key={key}
                                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
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
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Food type dropdown */}
                            <div
                                className={`relative inline-flex shrink-0 rounded-lg border bg-white ${
                                    filterProductTypes.length > 0
                                        ? 'border-[#9fc5a9]'
                                        : 'border-gray-200'
                                }`}
                                ref={foodTypeDropdownRef}
                            >
                                <button
                                    type="button"
                                    title={
                                        filterProductTypes.length > 0
                                            ? 'Change food type filter'
                                            : undefined
                                    }
                                    onClick={() => setFoodTypeDropdownOpen(o => !o)}
                                    className={`h-10 inline-flex max-w-44 items-center gap-1.5 border-0 px-2.5 text-sm font-medium transition-colors sm:max-w-52 ${
                                        filterProductTypes.length > 0
                                            ? 'rounded-l-lg bg-[#e8f4eb] text-[#1C5E2C]'
                                            : 'rounded-lg bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="min-w-0 truncate">
                                        {foodTypeLabel ?? 'Food Type'}
                                    </span>
                                    {filterProductTypes.length === 0 ? (
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                    ) : null}
                                </button>
                                {filterProductTypes.length > 0 ? (
                                    <button
                                        type="button"
                                        className="flex h-10 shrink-0 items-center rounded-r-lg border-l border-[#9fc5a9] bg-[#e8f4eb] px-2 text-[#1C5E2C] transition-colors hover:bg-[#dceee0]"
                                        aria-label="Clear food type filter"
                                        onClick={e => {
                                            e.stopPropagation();
                                            setFilterProductTypes([]);
                                            setFoodTypeDropdownOpen(false);
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </button>
                                ) : null}
                                {foodTypeDropdownOpen && (
                                    <div className="absolute left-0 top-full z-100 mt-1.5 w-52 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2.5 shadow-xl">
                                        {filterProductTypes.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setFilterProductTypes([])}
                                                className="mb-1.5 w-full text-left px-2 py-1 text-xs text-[#1C5E2C] font-medium hover:underline"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        {availableProductTypesSorted.map(pt => (
                                            <label
                                                key={pt}
                                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1C5E2C]"
                                                    checked={filterProductTypes.includes(pt)}
                                                    onChange={() =>
                                                        setFilterProductTypes(prev =>
                                                            toggleInList(prev, pt)
                                                        )
                                                    }
                                                />
                                                {pt}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Processing dropdown */}
                            <div
                                className={`relative inline-flex shrink-0 rounded-lg border bg-white ${
                                    filterProcessing.length > 0
                                        ? 'border-[#9fc5a9]'
                                        : 'border-gray-200'
                                }`}
                                ref={processingDropdownRef}
                            >
                                <button
                                    type="button"
                                    title={
                                        filterProcessing.length > 0
                                            ? 'Change processing filter'
                                            : undefined
                                    }
                                    onClick={() => setProcessingDropdownOpen(o => !o)}
                                    className={`h-10 inline-flex max-w-44 items-center gap-1.5 border-0 px-2.5 text-sm font-medium transition-colors sm:max-w-52 ${
                                        filterProcessing.length > 0
                                            ? 'rounded-l-lg bg-[#e8f4eb] text-[#1C5E2C]'
                                            : 'rounded-lg bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="min-w-0 truncate">
                                        {processingLabel ?? 'Processing'}
                                    </span>
                                    {filterProcessing.length === 0 ? (
                                        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                                    ) : null}
                                </button>
                                {filterProcessing.length > 0 ? (
                                    <button
                                        type="button"
                                        className="flex h-10 shrink-0 items-center rounded-r-lg border-l border-[#9fc5a9] bg-[#e8f4eb] px-2 text-[#1C5E2C] transition-colors hover:bg-[#dceee0]"
                                        aria-label="Clear processing filter"
                                        onClick={e => {
                                            e.stopPropagation();
                                            setFilterProcessing([]);
                                            setProcessingDropdownOpen(false);
                                        }}
                                    >
                                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    </button>
                                ) : null}
                                {processingDropdownOpen && (
                                    <div className="absolute left-0 top-full z-100 mt-1.5 w-52 rounded-xl border border-gray-200 bg-white p-2.5 shadow-xl">
                                        {filterProcessing.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setFilterProcessing([])}
                                                className="mb-1.5 w-full text-left px-2 py-1 text-xs text-[#1C5E2C] font-medium hover:underline"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        {(
                                            [
                                                ['minimal', 'Minimally Processed'],
                                                ['processed', 'Processed'],
                                                ['unspecified', 'Not Specified'],
                                            ] as const
                                        ).map(([key, label]) => (
                                            <label
                                                key={key}
                                                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
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
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {activeAttributeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={clearAttributeFilters}
                                    className="h-10 shrink-0 px-2 text-sm font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                            <div className="ml-auto flex shrink-0 items-center">
                                <div
                                    className="relative inline-block shrink-0"
                                    ref={exportPanelRef}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExportMenuOpen(open => !open)}
                                        disabled={exporting}
                                        className="h-10 shrink-0 px-4 rounded-lg text-gray-800 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors border border-[#9fc5a9] hover:bg-[#9fc5a9]/80"
                                        style={{ backgroundColor: 'var(--fff-green)' }}
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
                                            className="absolute left-0 top-full z-100 mt-2 min-w-44 rounded-xl border border-gray-200 bg-white p-2 shadow-xl ring-1 ring-black/5"
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
                                                        handleExport(
                                                            option.key as 'csv' | 'excel' | 'pdf'
                                                        )
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
                                                                            'var(--fff-orange)',
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
                                    onClick={() => changePage(Math.max(1, currentPageSafe - 1))}
                                    disabled={currentPageSafe === 1}
                                    className="h-9 px-3 rounded-md border border-gray-200 text-sm text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                {pageNumbers.map(page => (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => changePage(page)}
                                        className={`h-9 min-w-9 px-2 rounded-md border text-sm ${
                                            page === currentPageSafe
                                                ? 'bg-(--fff-green) border-[#9fc5a9] text-gray-900'
                                                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() =>
                                        changePage(Math.min(totalPages, currentPageSafe + 1))
                                    }
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
