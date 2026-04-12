'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Loader2, Download, Filter } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { MyCalendar } from '@/components/ui/CalendarPicker';
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
    /** Units for this line (1 when source left amount blank). */
    distributionAmount: number;
    /** Weight per unit in pounds. */
    unitWeightLbs: number | null;
    /** Line total weight in pounds (unit × amount). */
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

function toggleInList(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value];
}

function toggleProcessingList(list: ProcessingFilterKey[], value: ProcessingFilterKey) {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value];
}

const THEME_GREEN = '#B7D7BD';
/** Same accent as overview time-range presets */
const THEME_ORANGE = '#FAC87D';
const ROWS_PER_PAGE = 25;

/** Last 30 calendar days inclusive (today minus 29 days through today), same as overview “Last 30 days”. */
function getLast30DaysRange(): { start: Date; end: Date } {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start, end };
}

function getPast12MonthsRange(): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setMonth(start.getMonth() - 12);
    start.setDate(start.getDate() + 1);
    return { start, end };
}

/** Fiscal year Jul 1–Jun 30 through today (overview presets). */
function getFiscalYearToDateRange(now: Date) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const y = today.getFullYear();
    const fiscalStartYear = today.getMonth() >= 6 ? y : y - 1;
    return {
        start: new Date(fiscalStartYear, 6, 1),
        end: today,
    };
}

function parseDateRangeFromSearchParams(searchParams: ReturnType<typeof useSearchParams>) {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const defaultRange = getLast30DaysRange();
    const start =
        startParam && isValid(parseISO(startParam)) ? parseISO(startParam) : defaultRange.start;
    const end = endParam && isValid(parseISO(endParam)) ? parseISO(endParam) : defaultRange.end;
    if (start > end) return defaultRange;
    return { start, end };
}

function hasUrlDateRange(searchParams: ReturnType<typeof useSearchParams>): boolean {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    return Boolean(
        startParam && endParam && isValid(parseISO(startParam)) && isValid(parseISO(endParam))
    );
}

function DistributionContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [data, setData] = useState<DeliveryRecord[]>([]);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [dateRange, setDateRange] = useState(() => parseDateRangeFromSearchParams(searchParams));
    const [activeFilter, setActiveFilter] = useState<string | null>(() =>
        hasUrlDateRange(searchParams) ? null : 'last30days'
    );
    const [exporting, setExporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [foodTypeColorLookup, setFoodTypeColorLookup] = useState<Map<string, string>>(
        () => new Map()
    );

    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const [filterOrgs, setFilterOrgs] = useState<string[]>([]);
    const [filterProductTypes, setFilterProductTypes] = useState<string[]>([]);
    const [filterProcessing, setFilterProcessing] = useState<ProcessingFilterKey[]>([]);
    const [filterPrograms, setFilterPrograms] = useState<ProgramFilterKey[]>([]);

    // When navigating from overview with ?start=&end=, apply that range
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    useEffect(() => {
        setDateRange(parseDateRangeFromSearchParams(searchParams));
        setActiveFilter(hasUrlDateRange(searchParams) ? null : 'last30days');
    }, [searchParams, startParam, endParam]);

    const handleDateRangeChange = (range: { start: Date; end: Date }) => {
        setDateRange(range);
        setActiveFilter(null);
    };

    const setQuickFilter = (
        filter:
            | 'last30days'
            | 'thisMonth'
            | 'thisYear'
            | 'fiscalYearToDate'
            | 'past12months'
            | 'allTime'
    ) => {
        setActiveFilter(filter);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filter) {
            case 'last30days': {
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
                setDateRange({ start: thirtyDaysAgo, end: today });
                break;
            }
            case 'thisMonth':
                setDateRange({
                    start: new Date(currentYear, currentMonth, 1),
                    end: new Date(currentYear, currentMonth + 1, 0),
                });
                break;
            case 'thisYear':
                setDateRange({
                    start: new Date(currentYear, 0, 1),
                    end: new Date(currentYear, 11, 31),
                });
                break;
            case 'fiscalYearToDate':
                setDateRange(getFiscalYearToDateRange(now));
                break;
            case 'past12months':
                setDateRange(getPast12MonthsRange());
                break;
            case 'allTime':
                setDateRange({
                    start: new Date(2000, 0, 1),
                    end: today,
                });
                break;
        }
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

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert('No records to export for the current filters.');
            return;
        }
        setExporting(true);
        try {
            const headers = [
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
            ];
            const lines = [headers.map(csvEscapeCell).join(',')];
            for (const d of filteredData) {
                lines.push(
                    [
                        csvEscapeCell(format(new Date(d.date), 'yyyy-MM-dd')),
                        csvEscapeCell(programExportLabel(d)),
                        csvEscapeCell(d.organizationName),
                        csvEscapeCell(d.productName?.trim() || ''),
                        csvEscapeCell(Number(d.distributionAmount ?? 1)),
                        csvEscapeCell(
                            d.unitWeightLbs == null || Number.isNaN(Number(d.unitWeightLbs))
                                ? ''
                                : Number(d.unitWeightLbs)
                        ),
                        csvEscapeCell(Number(d.weightLbs ?? 0)),
                        csvEscapeCell(foodTypeLabelForRow(d.productType)),
                        csvEscapeCell(processingDisplayLabel(d.minimallyProcessedFood)),
                        csvEscapeCell((d.inventoryType ?? '').trim()),
                        csvEscapeCell((d.source ?? '').trim()),
                        csvEscapeCell((d.foodRescueProgram ?? '').trim()),
                    ].join(',')
                );
            }
            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `distribution-${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err: unknown) {
            console.error('Export error:', err);
            alert(err instanceof Error ? err.message : 'Export failed');
        } finally {
            setExporting(false);
        }
    };

    /** Food-type chip colors match the overview donut for this date range only — not recomputed on search. */
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
                            and attribute filters).
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-72 min-w-[12rem]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                placeholder="Search org, food, Just Eats, inventory type, tags…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                            />
                        </div>
                        {/* <div className="relative" ref={filterPanelRef}>
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
                                    className="absolute left-0 top-full z-50 mt-2 max-h-[min(70vh,32rem)] w-[min(calc(100vw-2rem),22rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5"
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
                                        Narrow results by program, organization, food type,
                                        processing, and more. Empty sections mean &quot;any&quot;;
                                        checked values are combined with OR within a group and AND
                                        across groups.
                                    </p>
                                    <div className="space-y-4">
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
                                                            className="rounded border-gray-300"
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
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Organization
                                            </p>
                                            <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
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
                                                                className="mt-0.5 rounded border-gray-300"
                                                                checked={filterOrgs.includes(org)}
                                                                onChange={() =>
                                                                    setFilterOrgs(prev =>
                                                                        toggleInList(prev, org)
                                                                    )
                                                                }
                                                            />
                                                            <span className="break-words">
                                                                {org}
                                                            </span>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Food type
                                            </p>
                                            <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {filterOptions.productTypes.map(pt => (
                                                    <label
                                                        key={pt}
                                                        className="flex cursor-pointer items-start gap-2 text-xs text-gray-800"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 rounded border-gray-300"
                                                            checked={filterProductTypes.includes(
                                                                pt
                                                            )}
                                                            onChange={() =>
                                                                setFilterProductTypes(prev =>
                                                                    toggleInList(prev, pt)
                                                                )
                                                            }
                                                        />
                                                        <span className="break-words">{pt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
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
                                                            className="rounded border-gray-300"
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
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Inventory type
                                            </p>
                                            <div className="max-h-24 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {filterOptions.inventoryTypes.map(inv => (
                                                    <label
                                                        key={inv}
                                                        className="flex cursor-pointer items-start gap-2 text-xs text-gray-800"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 rounded border-gray-300"
                                                            checked={filterInventoryTypes.includes(
                                                                inv
                                                            )}
                                                            onChange={() =>
                                                                setFilterInventoryTypes(prev =>
                                                                    toggleInList(prev, inv)
                                                                )
                                                            }
                                                        />
                                                        <span className="break-words">
                                                            {labelEmptySentinel(inv)}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Food rescue program
                                            </p>
                                            <div className="max-h-24 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {filterOptions.foodRescue.map(fr => (
                                                    <label
                                                        key={fr}
                                                        className="flex cursor-pointer items-start gap-2 text-xs text-gray-800"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 rounded border-gray-300"
                                                            checked={filterFoodRescue.includes(fr)}
                                                            onChange={() =>
                                                                setFilterFoodRescue(prev =>
                                                                    toggleInList(prev, fr)
                                                                )
                                                            }
                                                        />
                                                        <span className="break-words">
                                                            {labelEmptySentinel(fr)}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="mb-1.5 text-xs font-medium text-gray-700">
                                                Source
                                            </p>
                                            <div className="max-h-24 space-y-1.5 overflow-y-auto rounded-md border border-gray-100 bg-gray-50/80 p-2">
                                                {filterOptions.sources.map(src => (
                                                    <label
                                                        key={src}
                                                        className="flex cursor-pointer items-start gap-2 text-xs text-gray-800"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 rounded border-gray-300"
                                                            checked={filterSources.includes(src)}
                                                            onChange={() =>
                                                                setFilterSources(prev =>
                                                                    toggleInList(prev, src)
                                                                )
                                                            }
                                                        />
                                                        <span className="break-words">
                                                            {labelEmptySentinel(src)}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div> */}
                        <div
                            className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg"
                            ref={filterPanelRef}
                        >
                            <button
                                type="button"
                                onClick={() => setFilterPanelOpen(o => !o)}
                                className="h-10 w-full sm:w-auto inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-gray-50"
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
                                    className="absolute left-0 top-full z-50 mt-2 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 shadow-xl ring-1 ring-black/5"
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
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="h-10 px-5 rounded-lg text-gray-800 text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors border border-[#9fc5a9] hover:bg-[#9fc5a9]/80"
                            style={{ backgroundColor: THEME_GREEN }}
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Export CSV
                        </button>
                    </div>

                    <div className="min-w-0 rounded-lg border border-gray-300/90 bg-white px-3 py-2 shadow-sm ring-1 ring-black/[0.03] sm:px-4 sm:py-2.5">
                        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-x-4 lg:gap-y-2">
                            <div className="min-w-0 lg:flex-1">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
                                    Time Range
                                </p>
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                    <span className="hidden text-xs font-semibold uppercase tracking-wide text-gray-500 lg:mr-1 lg:inline">
                                        Time Range
                                    </span>
                                    <button
                                        type="button"
                                        title="Thirty consecutive calendar days, inclusive of today"
                                        onClick={() => setQuickFilter('last30days')}
                                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            activeFilter === 'last30days'
                                                ? 'text-gray-900 border-transparent'
                                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                        style={
                                            activeFilter === 'last30days'
                                                ? { backgroundColor: THEME_ORANGE }
                                                : undefined
                                        }
                                    >
                                        Last 30 days
                                    </button>
                                    <button
                                        type="button"
                                        title="From the first day of the current calendar month through today"
                                        onClick={() => setQuickFilter('thisMonth')}
                                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            activeFilter === 'thisMonth'
                                                ? 'text-gray-900 border-transparent'
                                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                        style={
                                            activeFilter === 'thisMonth'
                                                ? { backgroundColor: THEME_ORANGE }
                                                : undefined
                                        }
                                    >
                                        Month to date
                                    </button>
                                    <button
                                        type="button"
                                        title="January 1 through December 31 of the current calendar year"
                                        onClick={() => setQuickFilter('thisYear')}
                                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            activeFilter === 'thisYear'
                                                ? 'text-gray-900 border-transparent'
                                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                        style={
                                            activeFilter === 'thisYear'
                                                ? { backgroundColor: THEME_ORANGE }
                                                : undefined
                                        }
                                    >
                                        Full calendar year
                                    </button>
                                    <button
                                        type="button"
                                        title="From July 1 through today. Fiscal year is July 1–June 30."
                                        onClick={() => setQuickFilter('fiscalYearToDate')}
                                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            activeFilter === 'fiscalYearToDate'
                                                ? 'text-gray-900 border-transparent'
                                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                        style={
                                            activeFilter === 'fiscalYearToDate'
                                                ? { backgroundColor: THEME_ORANGE }
                                                : undefined
                                        }
                                    >
                                        Fiscal year
                                    </button>
                                    <button
                                        type="button"
                                        title="Twelve months ending today (rolling)"
                                        onClick={() => setQuickFilter('past12months')}
                                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            activeFilter === 'past12months'
                                                ? 'text-gray-900 border-transparent'
                                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                        style={
                                            activeFilter === 'past12months'
                                                ? { backgroundColor: THEME_ORANGE }
                                                : undefined
                                        }
                                    >
                                        Past 12 months
                                    </button>
                                    <button
                                        type="button"
                                        title="All delivery records on file"
                                        onClick={() => setQuickFilter('allTime')}
                                        className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                            activeFilter === 'allTime'
                                                ? 'text-gray-900 border-transparent'
                                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                        }`}
                                        style={
                                            activeFilter === 'allTime'
                                                ? { backgroundColor: THEME_ORANGE }
                                                : undefined
                                        }
                                    >
                                        All Time
                                    </button>
                                </div>
                            </div>
                            <div className="min-w-0 w-full lg:flex lg:w-auto lg:shrink-0 lg:justify-end">
                                <MyCalendar
                                    triggerVariant="responsive"
                                    selectedRange={dateRange}
                                    onRangeChange={handleDateRangeChange}
                                    defaultRange={getLast30DaysRange()}
                                    onClear={() => setActiveFilter('last30days')}
                                />
                            </div>
                        </div>
                    </div>

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
