'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliverySummary from '@/components/ui/DeliverySummary';
import { MyCalendar } from '@/components/ui/CalendarPicker';

type PoundsData = { month: string; pounds: number };
type FoodTypeEntry = { label: string; value: number; color: string };

const MOCK_FOOD_TYPES: FoodTypeEntry[] = [
    { label: 'Produce', value: 340, color: '#A1C5B0' },
    { label: 'Dairy', value: 210, color: '#6CAEE6' },
    { label: 'Grains & Bread', value: 180, color: '#E7A54E' },
    { label: 'Protein', value: 150, color: '#F9DC70' },
    { label: 'Canned Goods', value: 120, color: '#D4A5C9' },
];

const MOCK_PROCESSING: FoodTypeEntry[] = [
    { label: 'Minimally Processed', value: 620, color: '#A1C5B0' },
    { label: 'Processed', value: 380, color: '#E7A54E' },
];
type DeliverySummaryItem = {
    id: number;
    date: Date;
    totalPounds: number;
    destination?: string | null;
};

// Past 12 months = from 12 months ago (same day) through today
const getDefaultDateRange = () => {
    const today = new Date();
    const start = new Date(today);
    start.setMonth(start.getMonth() - 12);
    return { start, end: today };
};

const formatDateParam = (d: Date) => d.toISOString().split('T')[0];

const THEME_ORANGE = '#FAC87D';

const OverviewPage: React.FC = () => {
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(getDefaultDateRange());
    const [activeFilter, setActiveFilter] = useState<string | null>('past12months');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [poundsByMonthData, setPoundsByMonthData] = useState<PoundsData[]>([]);
    const [totalPoundsDelivered, setTotalPoundsDelivered] = useState(0);
    const [deliveriesCompleted, setDeliveriesCompleted] = useState(0);
    const [deliverySummaryData, setDeliverySummaryData] = useState<DeliverySummaryItem[]>([]);
    const [foodTypesData] = useState<FoodTypeEntry[]>(MOCK_FOOD_TYPES);
    const fetchOverviewData = useCallback(async () => {
        const start = formatDateParam(dateRange.start);
        const end = formatDateParam(dateRange.end);
        const q = new URLSearchParams({ start, end }).toString();

        setLoading(true);
        setError(null);
        try {
            const [chartRes, statsRes, deliveriesRes] = await Promise.all([
                fetch(`/api/overview/pounds-by-month?${q}`),
                fetch(`/api/overview/stats?${q}`),
                fetch(`/api/overview/deliveries?${q}`),
            ]);

            if (!chartRes.ok) throw new Error('Failed to load chart data');
            if (!statsRes.ok) throw new Error('Failed to load stats');
            if (!deliveriesRes.ok) throw new Error('Failed to load deliveries');

            const [chartData, stats, deliveriesPayload] = await Promise.all([
                chartRes.json(),
                statsRes.json(),
                deliveriesRes.json(),
            ]);

            setPoundsByMonthData(Array.isArray(chartData) ? chartData : []);
            setTotalPoundsDelivered(Number(stats.totalPoundsDelivered) ?? 0);
            setDeliveriesCompleted(Number(stats.deliveriesCompleted) ?? 0);

            const list = deliveriesPayload.deliveries ?? [];
            setDeliverySummaryData(
                list.map(
                    (
                        d: {
                            id: string;
                            date: string;
                            totalPounds: number;
                            destination?: string | null;
                        },
                        i: number
                    ) => ({
                        id: i + 1,
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
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchOverviewData();
    }, [fetchOverviewData]);

    const handleDateRangeChange = (range: { start: Date; end: Date }) => {
        setDateRange(range);
        setActiveFilter(null);
    };

    const setQuickFilter = (
        filter: 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'past12months' | 'allTime'
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
            case 'lastMonth':
                setDateRange({
                    start: new Date(currentYear, currentMonth - 1, 1),
                    end: new Date(currentYear, currentMonth, 0),
                });
                break;
            case 'thisYear':
                setDateRange({
                    start: new Date(currentYear, 0, 1),
                    end: new Date(currentYear, 11, 31),
                });
                break;
            case 'past12months': {
                const start = new Date(today);
                start.setMonth(start.getMonth() - 12);
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
            <div className="mx-auto max-w-6xl px-8 py-10 space-y-5">
                {/* Page header */}
                <div className="mb-1">
                    <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-gray-900">
                        Statistics Overview
                    </h1>
                </div>

                {/* Filters + date range - compact single row on desktop */}
                <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm px-3 py-2 sm:px-4 sm:py-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:mr-1">
                                Time range
                            </span>
                            <button
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
                                This month
                            </button>
                            <button
                                onClick={() => setQuickFilter('lastMonth')}
                                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    activeFilter === 'lastMonth'
                                        ? 'text-gray-900 border-transparent'
                                        : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                                }`}
                                style={
                                    activeFilter === 'lastMonth'
                                        ? { backgroundColor: THEME_ORANGE }
                                        : undefined
                                }
                            >
                                Last month
                            </button>
                            <button
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
                                This year
                            </button>
                            <button
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
                                All time
                            </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden text-xs text-gray-500 sm:inline">
                                Custom range
                            </span>
                            <MyCalendar
                                selectedRange={dateRange}
                                onRangeChange={handleDateRangeChange}
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
                        {/* Top stats + trend: compact key metrics column, chart takes rest */}
                        <div className="grid grid-cols-1 gap-y-2 gap-x-4 lg:grid-cols-[minmax(0,220px)_minmax(0,2fr)] lg:grid-rows-[auto_minmax(220px,1fr)] items-stretch">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Key metrics
                            </p>
                            <div className="hidden lg:block">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Delivery trend
                                </p>
                            </div>
                            <div className="grid grid-rows-3 gap-1.5 min-h-0 max-w-[280px] lg:max-w-none">
                                <StatCard
                                    label="Total Delivered"
                                    value={totalPoundsDelivered.toLocaleString()}
                                    unit="lbs"
                                />
                                <StatCard
                                    label="Deliveries Completed"
                                    value={deliveriesCompleted.toString()}
                                />
                                <StatCard
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
                            <div className="flex flex-col min-h-0">
                                <div className="lg:hidden mb-1">
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
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                        Donation composition
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-600">
                                        Breakdown of food types and processing levels.
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="min-w-0 bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                    <FoodTypesDonutChart
                                        data={foodTypesData}
                                        title="Food Types Donated"
                                    />
                                </div>
                                <div className="min-w-0 bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                    <FoodTypesDonutChart
                                        data={MOCK_PROCESSING}
                                        title="Processing Breakdown"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Delivery summary */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
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
                    </>
                )}
            </div>
        </div>
    );
};

export default OverviewPage;
