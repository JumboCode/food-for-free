'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliverySummary from '@/components/ui/DeliverySummary';
import { MyCalendar } from '@/components/ui/CalendarPicker';

type PoundsData = { month: string; pounds: number };
type FoodTypesData = { label: string; value: number; color: string }[];
type DeliverySummaryItem = { id: number; date: Date; totalPounds: number };

const getDefaultDateRange = () => {
    const today = new Date();
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    return { start: twelveMonthsAgo, end: today };
};

const formatDateParam = (d: Date) => d.toISOString().split('T')[0];

const OverviewPage: React.FC = () => {
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(getDefaultDateRange());
    const [activeFilter, setActiveFilter] = useState<string | null>('past12months');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [poundsByMonthData, setPoundsByMonthData] = useState<PoundsData[]>([]);
    const [totalPoundsDelivered, setTotalPoundsDelivered] = useState(0);
    const [deliveriesCompleted, setDeliveriesCompleted] = useState(0);
    const [deliverySummaryData, setDeliverySummaryData] = useState<DeliverySummaryItem[]>([]);
    const [foodTypesData, setFoodTypesData] = useState<FoodTypesData>([]);
    const fetchOverviewData = useCallback(async () => {
        const start = formatDateParam(dateRange.start);
        const end = formatDateParam(dateRange.end);
        const q = new URLSearchParams({ start, end }).toString();

        setLoading(true);
        setError(null);
        try {
            const [chartRes, statsRes, deliveriesRes, foodTypesRes] = await Promise.all([
                fetch(`/api/overview/pounds-by-month?${q}`),
                fetch(`/api/overview/stats?${q}`),
                fetch(`/api/overview/deliveries?${q}`),
                fetch(`/api/overview/food-types?${q}`),
            ]);

            if (!chartRes.ok) throw new Error('Failed to load chart data');
            if (!statsRes.ok) throw new Error('Failed to load stats');
            if (!deliveriesRes.ok) throw new Error('Failed to load deliveries');
            if (!foodTypesRes.ok) throw new Error('Failed to load food types');

            const [chartData, stats, deliveriesPayload, foodTypes] = await Promise.all([
                chartRes.json(),
                statsRes.json(),
                deliveriesRes.json(),
                foodTypesRes.json(),
            ]);

            setPoundsByMonthData(Array.isArray(chartData) ? chartData : []);
            setTotalPoundsDelivered(Number(stats.totalPoundsDelivered) ?? 0);
            setDeliveriesCompleted(Number(stats.deliveriesCompleted) ?? 0);
            setFoodTypesData(Array.isArray(foodTypes) ? foodTypes : []);

            const list = deliveriesPayload.deliveries ?? [];
            setDeliverySummaryData(
                list.map((d: { id: string; date: string; totalPounds: number }, i: number) => ({
                    id: i + 1,
                    date: new Date(d.date),
                    totalPounds: d.totalPounds,
                }))
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setPoundsByMonthData([]);
            setTotalPoundsDelivered(0);
            setDeliveriesCompleted(0);
            setDeliverySummaryData([]);
            setFoodTypesData([]);
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
        filter:
            | 'last7days'
            | 'last30days'
            | 'thisMonth'
            | 'lastMonth'
            | 'thisYear'
            | 'past12months'
            | 'allTime'
    ) => {
        setActiveFilter(filter);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filter) {
            case 'last7days': {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
                setDateRange({ start: sevenDaysAgo, end: today });
                break;
            }
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
                const twelveMonthsAgo = new Date(today);
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
                twelveMonthsAgo.setDate(1);
                setDateRange({ start: twelveMonthsAgo, end: today });
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
        <div className="p-4 sm:p-6 lg:p-10 bg-[#FAF9F7] min-h-screen space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold pb-2">
                        Statistics Overview
                    </h1>
                    <p className="pb-6 sm:pb-0">
                        Overview of deliveries and analytics across all partners.
                    </p>
                </div>
                <div className="flex-shrink-0 flex-start">
                    <MyCalendar selectedRange={dateRange} onRangeChange={handleDateRangeChange} />
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 mr-2">Quick Filters:</span>
                <button
                    onClick={() => setQuickFilter('last7days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'last7days'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Last 7 Days
                </button>
                <button
                    onClick={() => setQuickFilter('last30days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'last30days'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Last 30 Days
                </button>
                <button
                    onClick={() => setQuickFilter('thisMonth')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'thisMonth'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    This Month
                </button>
                <button
                    onClick={() => setQuickFilter('lastMonth')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'lastMonth'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Last Month
                </button>
                <button
                    onClick={() => setQuickFilter('thisYear')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'thisYear'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    This Year
                </button>
                <button
                    onClick={() => setQuickFilter('past12months')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'past12months'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Past 12 Months
                </button>
                <button
                    onClick={() => setQuickFilter('allTime')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'allTime'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    All Time
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                    <button
                        type="button"
                        onClick={() => fetchOverviewData()}
                        className="ml-2 underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {loading && (
                <div className="text-gray-600 text-center py-8">Loading overview data…</div>
            )}

            {!loading && (
                <>
                    <div className="w-full bg-white rounded-xl shadow p-6 mt-4">
                        <PoundsByMonthChart
                            data={poundsByMonthData}
                            dateRange={dateRange}
                            activeFilter={activeFilter}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl shadow p-6 h-full">
                            <FoodTypesDonutChart data={foodTypesData} />
                        </div>
                        <div className="flex flex-col gap-6 h-full">
                            <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10">
                                <StatCard
                                    label="Total Delivered"
                                    value={totalPoundsDelivered.toLocaleString()}
                                    unit="lbs"
                                />
                            </div>
                            <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10">
                                <StatCard
                                    label="Deliveries Completed"
                                    value={deliveriesCompleted.toString()}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full bg-white rounded-xl shadow p-6">
                        <DeliverySummary
                            deliveries={deliverySummaryData}
                            historyLink="distribution"
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default OverviewPage;
