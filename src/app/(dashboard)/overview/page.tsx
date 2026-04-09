'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliverySummary from '@/components/ui/DeliverySummary';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import SearchBarOverview from '@/components/ui/SearchBarOverview';

type PoundsData = { month: string; pounds: number };
type FoodTypeEntry = { label: string; value: number; color: string };

type PartnerOrgCard = {
    id: number;
    name: string;
    location: string;
    type: string;
};
type DeliverySummaryItem = {
    id: string;
    date: Date;
    totalPounds: number;
    destination?: string | null;
};

// Last 30 days inclusive (today minus 29 days through today), same as the “Last 30 days” preset
const getDefaultDateRange = () => {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start, end };
};

/** Fiscal year Jul 1–Jun 30. Range is July 1 of the FY that contains `today` through today. */
const getFiscalYearToDateRange = (now: Date) => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const y = today.getFullYear();
    const fiscalStartYear = today.getMonth() >= 6 ? y : y - 1;
    return {
        start: new Date(fiscalStartYear, 6, 1),
        end: today,
    };
};

const formatDateParam = (d: Date) => d.toISOString().split('T')[0];

const THEME_ORANGE = '#FAC87D';

const OverviewPageContent: React.FC = () => {
    const searchParams = useSearchParams();
    const [sessionCtx, setSessionCtx] = useState<{
        ready: boolean;
        isAdmin: boolean;
        partnerName: string | null;
    }>({ ready: false, isAdmin: false, partnerName: null });

    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(getDefaultDateRange());
    const [activeFilter, setActiveFilter] = useState<string | null>('last30days');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [poundsByMonthData, setPoundsByMonthData] = useState<PoundsData[]>([]);
    const [totalPoundsDelivered, setTotalPoundsDelivered] = useState(0);
    const [deliveriesCompleted, setDeliveriesCompleted] = useState(0);
    const [deliverySummaryData, setDeliverySummaryData] = useState<DeliverySummaryItem[]>([]);
    const [foodTypesData, setFoodTypesData] = useState<FoodTypeEntry[]>([]);
    const [processingData, setProcessingData] = useState<FoodTypeEntry[]>([]);
    const [partnerOrganizations, setPartnerOrganizations] = useState<PartnerOrgCard[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/user/context')
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then((d: { isAdmin?: boolean; partnerOrganizationName?: string | null }) => {
                if (cancelled) return;
                const isAdmin = Boolean(d.isAdmin);
                const partnerName = d.partnerOrganizationName ?? null;
                setSessionCtx({ ready: true, isAdmin, partnerName });
                if (!isAdmin && partnerName) {
                    setSelectedPartner(partnerName);
                }
            })
            .catch(() => {
                if (!cancelled) setSessionCtx({ ready: true, isAdmin: false, partnerName: null });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!sessionCtx.ready || !sessionCtx.isAdmin) return;
        const dest = searchParams.get('destination')?.trim();
        if (dest) setSelectedPartner(dest);
    }, [sessionCtx.ready, sessionCtx.isAdmin, searchParams]);

    useEffect(() => {
        if (!sessionCtx.ready || !sessionCtx.isAdmin) return;
        let cancelled = false;
        fetch('/api/overview/partners')
            .then(res => (res.ok ? res.json() : Promise.reject(new Error('Partners failed'))))
            .then((data: { partners?: PartnerOrgCard[] }) => {
                if (!cancelled)
                    setPartnerOrganizations(Array.isArray(data.partners) ? data.partners : []);
            })
            .catch(() => {
                if (!cancelled) setPartnerOrganizations([]);
            });
        return () => {
            cancelled = true;
        };
    }, [sessionCtx.ready, sessionCtx.isAdmin]);

    const isPartnerDashboard =
        sessionCtx.ready && !sessionCtx.isAdmin && Boolean(sessionCtx.partnerName);

    const fetchOverviewData = useCallback(async () => {
        if (!sessionCtx.ready) return;

        const start = formatDateParam(dateRange.start);
        const end = formatDateParam(dateRange.end);
        const params = new URLSearchParams({ start, end });
        if (selectedPartner) params.set('destination', selectedPartner);
        const q = params.toString();

        setLoading(true);
        setError(null);
        try {
            const [chartRes, statsRes, deliveriesRes, compositionRes] = await Promise.all([
                fetch(`/api/overview/pounds-by-month?${q}`),
                fetch(`/api/overview/stats?${q}`),
                fetch(`/api/overview/deliveries?${q}`),
                fetch(`/api/overview/food-types?${q}`),
            ]);

            if (!chartRes.ok) throw new Error('Failed to load chart data');
            if (!statsRes.ok) throw new Error('Failed to load stats');
            if (!deliveriesRes.ok) throw new Error('Failed to load deliveries');
            if (!compositionRes.ok) throw new Error('Failed to load food composition');

            const [chartData, stats, deliveriesPayload, compositionPayload] = await Promise.all([
                chartRes.json(),
                statsRes.json(),
                deliveriesRes.json(),
                compositionRes.json(),
            ]);

            setPoundsByMonthData(Array.isArray(chartData) ? chartData : []);
            setTotalPoundsDelivered(Number(stats.totalPoundsDelivered) ?? 0);
            setDeliveriesCompleted(Number(stats.deliveriesCompleted) ?? 0);
            setFoodTypesData(
                Array.isArray(compositionPayload.foodTypes) ? compositionPayload.foodTypes : []
            );
            setProcessingData(
                Array.isArray(compositionPayload.processing) ? compositionPayload.processing : []
            );

            const list = deliveriesPayload.deliveries ?? [];
            setDeliverySummaryData(
                list.map(
                    (d: {
                        id: string;
                        date: string;
                        totalPounds: number;
                        destination?: string | null;
                    }) => ({
                        id: d.id,
                        date: new Date(d.date),
                        totalPounds: d.totalPounds,
                        destination: d.destination ?? null,
                    })
                )
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setPoundsByMonthData([]);
            setTotalPoundsDelivered(0);
            setDeliveriesCompleted(0);
            setDeliverySummaryData([]);
            setFoodTypesData([]);
            setProcessingData([]);
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedPartner, sessionCtx.ready]);

    useEffect(() => {
        void fetchOverviewData();
    }, [fetchOverviewData]);

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
            case 'past12months': {
                const start = new Date(today);
                start.setMonth(start.getMonth() - 12);
                start.setDate(start.getDate() + 1);
                setDateRange({ start, end: today });
                break;
            }
            case 'allTime':
                setDateRange({
                    start: new Date(2000, 0, 1),
                    end: today,
                });
                break;
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF9F7]">
            <div className="mx-auto min-w-0 max-w-6xl space-y-4 px-8 py-8 sm:py-10 lg:space-y-5">
                {/* Page title left; admin org search right on large screens */}
                <div className="mb-0 flex flex-col gap-3 max-lg:mb-6 lg:mb-1 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-gray-900">
                            Statistics Overview
                        </h1>
                        {isPartnerDashboard && sessionCtx.partnerName ? (
                            <p className="mt-2 text-sm text-gray-600">
                                Showing deliveries for your organization:{' '}
                                <span className="font-medium text-gray-900">
                                    {sessionCtx.partnerName}
                                </span>
                            </p>
                        ) : selectedPartner ? (
                            <p className="mt-2 text-sm text-gray-600">
                                Partner view:{' '}
                                <span className="font-medium text-gray-900">{selectedPartner}</span>
                                <span className="mx-2 text-gray-300">·</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedPartner(null)}
                                    className="text-[#1C5E2C] font-medium underline underline-offset-2 hover:text-[#164a22]"
                                >
                                    View all organizations
                                </button>
                            </p>
                        ) : null}
                    </div>
                    {sessionCtx.isAdmin ? (
                        <div className="w-full max-w-[17.5rem] shrink-0 self-start sm:max-w-sm lg:w-auto lg:pt-1">
                            <SearchBarOverview
                                organizations={partnerOrganizations}
                                onSelectPartner={name => setSelectedPartner(name)}
                            />
                        </div>
                    ) : null}
                </div>

                {/* lg+: single toolbar row. Below lg: stacked sections + wider date control */}
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
                                defaultRange={getDefaultDateRange()}
                                onClear={() => setActiveFilter('last30days')}
                            />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between gap-4">
                        <p className="text-sm">{error}</p>
                        <button
                            type="button"
                            onClick={() => fetchOverviewData()}
                            className="text-sm font-medium underline underline-offset-4"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="rounded-xl border border-dashed border-gray-300 bg-white/70 px-6 py-5 text-center">
                            <p className="text-sm font-medium text-gray-700">
                                Loading overview data…
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                This may take a moment while we pull in your latest deliveries.
                            </p>
                        </div>
                    </div>
                )}

                {!loading && (
                    <>
                        <div className="flex flex-col gap-5 pt-0 sm:gap-6 lg:pt-3">
                            {/* Top stats + trend: compact key metrics column, chart takes rest */}
                            <div className="grid grid-cols-1 gap-y-3 gap-x-4 lg:grid-cols-[minmax(0,220px)_minmax(0,2fr)] lg:grid-rows-[auto_minmax(220px,1fr)] lg:gap-y-3 items-stretch">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Key metrics
                                </p>
                                <div className="hidden lg:block">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        Delivery trend
                                    </p>
                                </div>
                                <div className="grid min-h-0 h-full w-full grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-1 lg:grid-rows-[repeat(3,minmax(0,1fr))]">
                                    <StatCard
                                        fillHeight
                                        label="Total Delivered"
                                        value={totalPoundsDelivered.toLocaleString()}
                                        unit="lbs"
                                    />
                                    <StatCard
                                        fillHeight
                                        label="Deliveries Completed"
                                        value={deliveriesCompleted.toString()}
                                    />
                                    <StatCard
                                        fillHeight
                                        className="col-span-2 lg:col-span-1"
                                        label="Avg per delivery"
                                        value={
                                            deliveriesCompleted
                                                ? Math.round(
                                                      totalPoundsDelivered / deliveriesCompleted
                                                  ).toLocaleString()
                                                : '0'
                                        }
                                        unit="lbs"
                                    />
                                </div>
                                <div className="flex min-h-0 flex-col max-lg:mt-1">
                                    <div className="mb-1 max-lg:mb-2 lg:hidden">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Delivery trend
                                        </p>
                                    </div>
                                    <div className="flex-1 min-h-[200px]">
                                        <PoundsByMonthChart
                                            data={poundsByMonthData}
                                            dateRange={dateRange}
                                            activeFilter={activeFilter}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Composition charts */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Donation composition
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-600">
                                            Breakdown of food types and processing levels.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                                    <div className="flex min-h-0 min-w-0 flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                        <FoodTypesDonutChart
                                            className="flex-1"
                                            data={foodTypesData}
                                            title="Food Types Donated"
                                        />
                                    </div>
                                    <div className="flex min-h-0 min-w-0 flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                        <FoodTypesDonutChart
                                            className="flex-1"
                                            data={processingData}
                                            title="Processing Breakdown"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Delivery summary */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            Recent deliveries
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Snapshot of completed deliveries in the selected period.
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                    <DeliverySummary
                                        deliveries={deliverySummaryData}
                                        historyLink="distribution"
                                    />
                                    <div className="flex justify-end mt-4">
                                        <a
                                            href={`/distribution?start=${formatDateParam(
                                                dateRange.start
                                            )}&end=${formatDateParam(dateRange.end)}`}
                                            className="inline-flex items-center justify-center rounded-lg border border-transparent px-5 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:opacity-90"
                                            style={{ backgroundColor: THEME_ORANGE }}
                                        >
                                            See full distribution history
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const OverviewPage: React.FC = () => (
    <Suspense
        fallback={
            <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
                Loading overview…
            </div>
        }
    >
        <OverviewPageContent />
    </Suspense>
);

export default OverviewPage;
