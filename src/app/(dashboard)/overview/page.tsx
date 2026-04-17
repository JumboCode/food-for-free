'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliverySummary from '@/components/ui/DeliverySummary';
import FilterBar from '@/components/ui/FilterBar';
import SearchBarOverview from '@/components/ui/SearchBarOverview';
import { useFilterContext } from '@/contexts/FilterContext';
import { useOrgScopeContext } from '@/contexts/OrgScopeContext';

type PoundsData = { month: string; pounds: number };
type FoodTypeEntry = { label: string; value: number; color: string };

type PartnerOrgCard = {
    id: number;
    name: string;
    householdId18?: string | null;
    location: string;
    type: string;
};
type SelectedPartner = {
    name: string;
    householdId18?: string | null;
};
type DeliverySummaryItem = {
    id: string;
    date: Date;
    totalPounds: number;
    destination?: string | null;
    householdId18?: string | null;
};

const formatDateParam = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const THEME_ORANGE = '#FAC87D';

const OverviewPageContent: React.FC = () => {
    const searchParams = useSearchParams();
    const [sessionCtx, setSessionCtx] = useState<{
        ready: boolean;
        isAdmin: boolean;
        partnerName: string | null;
        partnerHouseholdId18: string | null;
    }>({ ready: false, isAdmin: false, partnerName: null, partnerHouseholdId18: null });

    const { dateRange } = useFilterContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [poundsByMonthData, setPoundsByMonthData] = useState<PoundsData[]>([]);
    const [totalPoundsDelivered, setTotalPoundsDelivered] = useState(0);
    const [deliveriesCompleted, setDeliveriesCompleted] = useState(0);
    const [justEatsPoundsDelivered, setJustEatsPoundsDelivered] = useState(0);
    const [justEatsTotalDeliveries, setJustEatsTotalDeliveries] = useState(0);
    const [deliverySummaryData, setDeliverySummaryData] = useState<DeliverySummaryItem[]>([]);
    const [foodTypesData, setFoodTypesData] = useState<FoodTypeEntry[]>([]);
    const [processingData, setProcessingData] = useState<FoodTypeEntry[]>([]);
    const [partnerOrganizations, setPartnerOrganizations] = useState<PartnerOrgCard[]>([]);
    const { selectedOrg, setSelectedOrg, clearSelectedOrg } = useOrgScopeContext();

    useEffect(() => {
        let cancelled = false;
        fetch('/api/user/context')
            .then(res => (res.ok ? res.json() : Promise.reject()))
            .then(
                (d: {
                    isAdmin?: boolean;
                    partnerOrganizationName?: string | null;
                    partnerHouseholdId18?: string | null;
                }) => {
                    if (cancelled) return;
                    const isAdmin = Boolean(d.isAdmin);
                    const partnerName = d.partnerOrganizationName ?? null;
                    const partnerHouseholdId18 = d.partnerHouseholdId18 ?? null;
                    setSessionCtx({ ready: true, isAdmin, partnerName, partnerHouseholdId18 });
                }
            )
            .catch(() => {
                if (!cancelled)
                    setSessionCtx({
                        ready: true,
                        isAdmin: false,
                        partnerName: null,
                        partnerHouseholdId18: null,
                    });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!sessionCtx.ready || !sessionCtx.isAdmin) return;
        const householdId18 = searchParams.get('householdId18')?.trim();
        if (householdId18) {
            setSelectedOrg({ name: 'Selected organization', householdId18 });
        }
    }, [sessionCtx.ready, sessionCtx.isAdmin, searchParams, setSelectedOrg]);

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

    useEffect(() => {
        if (!selectedOrg || selectedOrg.householdId18 || partnerOrganizations.length === 0) return;
        const match = partnerOrganizations.find(
            partner => partner.name.toLowerCase() === selectedOrg.name.toLowerCase()
        );
        if (match?.householdId18) {
            setSelectedOrg(current =>
                current && !current.householdId18
                    ? { ...current, householdId18: match.householdId18 }
                    : current
            );
        }
    }, [partnerOrganizations, selectedOrg, setSelectedOrg]);

    const isPartnerDashboard =
        sessionCtx.ready && !sessionCtx.isAdmin && Boolean(sessionCtx.partnerName);
    const selectedPartner: SelectedPartner | null = useMemo(
        () =>
            isPartnerDashboard
                ? sessionCtx.partnerName
                    ? {
                          name: sessionCtx.partnerName,
                          householdId18: sessionCtx.partnerHouseholdId18,
                      }
                    : null
                : selectedOrg,
        [isPartnerDashboard, selectedOrg, sessionCtx.partnerHouseholdId18, sessionCtx.partnerName]
    );

    const totalDeliveriesAllPrograms = deliveriesCompleted + justEatsTotalDeliveries;

    const fetchOverviewData = useCallback(async () => {
        if (!sessionCtx.ready) return;

        const start = formatDateParam(dateRange.start);
        const end = formatDateParam(dateRange.end);
        const params = new URLSearchParams({ start, end });
        if (selectedPartner?.householdId18)
            params.set('householdId18', selectedPartner.householdId18);
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
            setJustEatsPoundsDelivered(Number(stats.justEatsPoundsDelivered) ?? 0);
            setJustEatsTotalDeliveries(Number(stats.justEatsTotalDeliveries) ?? 0);
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
                        householdId18?: string | null;
                    }) => ({
                        id: d.id,
                        date: new Date(d.date),
                        totalPounds: d.totalPounds,
                        destination: d.destination ?? null,
                        householdId18: d.householdId18 ?? null,
                    })
                )
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
            setPoundsByMonthData([]);
            setTotalPoundsDelivered(0);
            setDeliveriesCompleted(0);
            setJustEatsPoundsDelivered(0);
            setJustEatsTotalDeliveries(0);
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
                                <span className="font-medium text-gray-900">
                                    {selectedPartner.name}
                                </span>
                                <span className="mx-2 text-gray-300">·</span>
                                <button
                                    type="button"
                                    onClick={clearSelectedOrg}
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
                                onSelectPartner={partner => setSelectedOrg(partner)}
                                selectedPartner={selectedPartner}
                                onClearPartner={clearSelectedOrg}
                            />
                        </div>
                    ) : null}
                </div>

                {/* lg+: single toolbar row. Below lg: stacked sections + wider date control */}
                <FilterBar />

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
                                <div className="grid min-h-0 h-full w-full grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-1 lg:grid-rows-[repeat(3,minmax(0,1fr))] lg:gap-2">
                                    <StatCard
                                        fillHeight
                                        label="Bulk & Rescue Pounds Delivered"
                                        value={totalPoundsDelivered.toLocaleString()}
                                        unit="lbs"
                                    />
                                    <StatCard
                                        fillHeight
                                        label="Just Eats Pounds Delivered"
                                        value={justEatsPoundsDelivered.toLocaleString()}
                                        unit="lbs"
                                    />
                                    <StatCard
                                        fillHeight
                                        className="col-span-2 lg:col-span-1"
                                        label="Total Deliveries (Bulk, Rescue, Just Eats)"
                                        value={totalDeliveriesAllPrograms.toLocaleString()}
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
                                    <div className="flex h-[380px] min-w-0 flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                        <div className="flex-1 min-h-0">
                                            <FoodTypesDonutChart
                                                data={foodTypesData}
                                                title="Food Types Donated"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex h-[380px] min-w-0 flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                        <div className="flex-1 min-h-0">
                                            <FoodTypesDonutChart
                                                data={processingData}
                                                title="Processing Breakdown"
                                            />
                                        </div>
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
                                        <Link
                                            href={
                                                selectedPartner?.householdId18
                                                    ? `/distribution?householdId18=${encodeURIComponent(selectedPartner.householdId18)}`
                                                    : '/distribution'
                                            }
                                            className="inline-flex items-center justify-center rounded-lg border border-transparent px-5 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:opacity-90"
                                            style={{ backgroundColor: THEME_ORANGE }}
                                        >
                                            See full distribution history
                                        </Link>
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
