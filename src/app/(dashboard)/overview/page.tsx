'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliverySummary from '@/components/ui/DeliverySummary';
import FilterBar from '@/components/ui/FilterBar';
import SearchBarOverview from '@/components/ui/SearchBarOverview';
import { useFilterContext } from '@/contexts/FilterContext';
import { useOrgScopeContext } from '@/contexts/OrgScopeContext';
import { useViewerContext } from '@/contexts/ViewerContext';
import type { PartnerOrgCard } from '@/types/partner';

type PoundsData = { month: string; pounds: number };
type FoodTypeEntry = { label: string; value: number; color: string };

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
    program?: 'bulk_rescue' | 'just_eats' | null;
};

const formatDateParam = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

function selectedPartnerKey(p: SelectedPartner): string {
    return p.householdId18?.trim()
        ? `id:${p.householdId18.trim()}`
        : `name:${p.name.trim().toLowerCase()}`;
}

async function parseApiErrorMessage(response: Response, fallback: string): Promise<string> {
    if (response.status === 403) {
        try {
            const body = (await response.json()) as { error?: string };
            if (body?.error) return body.error;
        } catch {
            return fallback;
        }
    }
    return fallback;
}

const OverviewPageContent: React.FC = () => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const replaceSearchParams = useCallback(
        (mutate: (p: URLSearchParams) => void) => {
            const p = new URLSearchParams(searchParams.toString());
            mutate(p);
            const qs = p.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
        },
        [pathname, router, searchParams]
    );
    const { isAdmin, partnerOrganizationName, partnerHouseholdId18 } = useViewerContext();

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
    const { selectedOrgs, setSelectedOrgs, toggleSelectedOrg, clearSelectedOrgs } =
        useOrgScopeContext();

    useEffect(() => {
        if (!isAdmin) return;
        const ids = searchParams
            .getAll('householdId18')
            .map(v => v.trim())
            .filter(Boolean);
        const names = [
            ...searchParams.getAll('destination').map(v => v.trim()),
            ...searchParams.getAll('destinationName').map(v => v.trim()),
        ].filter(Boolean);
        const next: SelectedPartner[] = [];
        for (const householdId18 of ids) {
            const fromList = partnerOrganizations.find(org => org.householdId18 === householdId18);
            next.push({
                name: fromList?.name ?? householdId18,
                householdId18,
            });
        }
        for (const name of names) {
            next.push({ name, householdId18: null });
        }
        if (next.length > 0) {
            setSelectedOrgs(next);
        }
    }, [isAdmin, searchParams, setSelectedOrgs, partnerOrganizations]);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        if (selectedOrgs.length === 0 || partnerOrganizations.length === 0) return;
        setSelectedOrgs(current =>
            current.map(org => {
                if (org.householdId18) {
                    const byHousehold = partnerOrganizations.find(
                        partner => partner.householdId18 === org.householdId18
                    );
                    if (byHousehold && byHousehold.name !== org.name) {
                        return { ...org, name: byHousehold.name };
                    }
                    return org;
                }
                const byName = partnerOrganizations.find(
                    partner => partner.name.toLowerCase() === org.name.toLowerCase()
                );
                return byName?.householdId18
                    ? { ...org, householdId18: byName.householdId18, name: byName.name }
                    : org;
            })
        );
    }, [partnerOrganizations, selectedOrgs.length, setSelectedOrgs]);

    useEffect(() => {
        if (isAdmin) return;
        if (selectedOrgs.length > 0) return;
        if (partnerOrganizations.length <= 1) return;
        setSelectedOrgs(
            partnerOrganizations.map(org => ({
                name: org.name,
                householdId18: org.householdId18 ?? null,
            }))
        );
    }, [isAdmin, partnerOrganizations, selectedOrgs.length, setSelectedOrgs]);

    const isPartnerDashboard = !isAdmin && Boolean(partnerOrganizationName);
    const selectedPartners: SelectedPartner[] = useMemo(
        () =>
            isPartnerDashboard
                ? partnerOrganizationName
                    ? [
                          {
                              name: partnerOrganizationName,
                              householdId18: partnerHouseholdId18,
                          },
                      ]
                    : []
                : selectedOrgs,
        [isPartnerDashboard, selectedOrgs, partnerHouseholdId18, partnerOrganizationName]
    );

    const totalDeliveriesAllPrograms = deliveriesCompleted + justEatsTotalDeliveries;
    const selectedPartner = selectedPartners[0] ?? null;
    const multipleSelected = selectedPartners.length > 1;
    const nonAdminPrimaryOrgName = useMemo(() => {
        if (isAdmin) return null;
        const selectedName = selectedPartner?.name?.trim();
        if (selectedName) return selectedName;
        if (partnerOrganizations.length === 1) {
            const singleName = partnerOrganizations[0]?.name?.trim();
            if (singleName) return singleName;
        }
        return null;
    }, [isAdmin, selectedPartner, partnerOrganizations]);

    const fetchOverviewData = useCallback(async () => {
        const start = formatDateParam(dateRange.start);
        const end = formatDateParam(dateRange.end);
        const scopes = selectedPartners.length > 0 ? selectedPartners : [null];

        setLoading(true);
        setError(null);
        try {
            const responses = await Promise.all(
                scopes.map(async scope => {
                    const params = new URLSearchParams({ start, end });
                    if (scope?.householdId18) params.set('householdId18', scope.householdId18);
                    else if (scope?.name?.trim()) params.set('destination', scope.name.trim());
                    const q = params.toString();
                    const [chartRes, statsRes, deliveriesRes, compositionRes] = await Promise.all([
                        fetch(`/api/overview/pounds-by-month?${q}`),
                        fetch(`/api/overview/stats?${q}`),
                        fetch(`/api/overview/deliveries?${q}`),
                        fetch(`/api/overview/food-types?${q}`),
                    ]);
                    if (!chartRes.ok)
                        throw new Error(
                            await parseApiErrorMessage(chartRes, 'Failed to load chart data')
                        );
                    if (!statsRes.ok)
                        throw new Error(
                            await parseApiErrorMessage(statsRes, 'Failed to load stats')
                        );
                    if (!deliveriesRes.ok)
                        throw new Error(
                            await parseApiErrorMessage(deliveriesRes, 'Failed to load deliveries')
                        );
                    if (!compositionRes.ok)
                        throw new Error(
                            await parseApiErrorMessage(
                                compositionRes,
                                'Failed to load food composition'
                            )
                        );
                    const [chartData, stats, deliveriesPayload, compositionPayload] =
                        await Promise.all([
                            chartRes.json(),
                            statsRes.json(),
                            deliveriesRes.json(),
                            compositionRes.json(),
                        ]);
                    return { chartData, stats, deliveriesPayload, compositionPayload };
                })
            );

            const chartMap = new Map<string, number>();
            let totalBulk = 0;
            let totalBulkDeliveries = 0;
            let totalJe = 0;
            let totalJeDeliveries = 0;
            const foodMap = new Map<string, FoodTypeEntry>();
            const processingMap = new Map<string, FoodTypeEntry>();
            const deliveriesById = new Map<string, DeliverySummaryItem>();

            for (const r of responses) {
                const chartData = Array.isArray(r.chartData) ? r.chartData : [];
                for (const point of chartData as PoundsData[]) {
                    chartMap.set(
                        point.month,
                        (chartMap.get(point.month) ?? 0) + Number(point.pounds)
                    );
                }
                totalBulk += Number(r.stats.totalPoundsDelivered ?? 0);
                totalBulkDeliveries += Number(r.stats.deliveriesCompleted ?? 0);
                totalJe += Number(r.stats.justEatsPoundsDelivered ?? 0);
                totalJeDeliveries += Number(r.stats.justEatsTotalDeliveries ?? 0);
                for (const e of (Array.isArray(r.compositionPayload.foodTypes)
                    ? r.compositionPayload.foodTypes
                    : []) as FoodTypeEntry[]) {
                    const key = e.label.trim().toLowerCase();
                    const prev = foodMap.get(key);
                    foodMap.set(key, { ...e, value: (prev?.value ?? 0) + Number(e.value ?? 0) });
                }
                for (const e of (Array.isArray(r.compositionPayload.processing)
                    ? r.compositionPayload.processing
                    : []) as FoodTypeEntry[]) {
                    const key = e.label.trim().toLowerCase();
                    const prev = processingMap.get(key);
                    processingMap.set(key, {
                        ...e,
                        value: (prev?.value ?? 0) + Number(e.value ?? 0),
                    });
                }
                const list = r.deliveriesPayload.deliveries ?? [];
                for (const d of list) {
                    const item: DeliverySummaryItem = {
                        id: d.id,
                        date: new Date(d.date),
                        totalPounds: d.totalPounds,
                        destination: d.destination ?? null,
                        householdId18: d.householdId18 ?? null,
                        program: d.program ?? null,
                    };
                    const key = `${item.date.toISOString()}|${item.program ?? ''}|${item.householdId18 ?? ''}|${(item.destination ?? '').toLowerCase()}`;
                    const prev = deliveriesById.get(key);
                    if (prev) prev.totalPounds += item.totalPounds;
                    else deliveriesById.set(key, item);
                }
            }

            setPoundsByMonthData(
                [...chartMap.entries()].map(([month, pounds]) => ({
                    month,
                    pounds: Math.round(pounds),
                }))
            );
            setTotalPoundsDelivered(Math.round(totalBulk));
            setDeliveriesCompleted(totalBulkDeliveries);
            setJustEatsPoundsDelivered(Math.round(totalJe));
            setJustEatsTotalDeliveries(totalJeDeliveries);
            setFoodTypesData([...foodMap.values()].sort((a, b) => b.value - a.value));
            setProcessingData([...processingMap.values()].sort((a, b) => b.value - a.value));
            setDeliverySummaryData(
                [...deliveriesById.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
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
    }, [dateRange, selectedPartners]);

    useEffect(() => {
        void fetchOverviewData();
    }, [fetchOverviewData]);

    return (
        <div className="min-h-screen bg-[#FAF9F7]">
            <div className="mx-auto min-w-0 max-w-6xl space-y-4 px-8 py-8 sm:py-10 lg:space-y-5">
                {/* Page title left; admin org search right on large screens */}
                <div className="mb-0 flex flex-col gap-3 max-lg:mb-6 lg:mb-1 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-gray-900 sm:mb-2">
                            Statistics Overview
                        </h1>
                        {isAdmin && selectedPartners.length > 0 ? (
                            <div className="mt-2 mb-2">
                                <p className="text-base leading-snug text-gray-600 sm:text-[1.0625rem]">
                                    Partner view:{' '}
                                    <span className="font-medium text-gray-900">
                                        {multipleSelected
                                            ? `${selectedPartners.length} organizations selected`
                                            : selectedPartner?.name}
                                    </span>
                                    <span className="mx-2 text-gray-300">·</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            clearSelectedOrgs();
                                            replaceSearchParams(p => {
                                                p.delete('householdId18');
                                                p.delete('destination');
                                                p.delete('destinationName');
                                            });
                                        }}
                                        className="text-sm text-[#1C5E2C] font-medium underline underline-offset-2 hover:text-[#164a22]"
                                    >
                                        View all organizations
                                    </button>
                                    {multipleSelected ? (
                                        <>
                                            <span className="mx-2 text-gray-300">·</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    clearSelectedOrgs();
                                                    replaceSearchParams(p => {
                                                        p.delete('householdId18');
                                                        p.delete('destination');
                                                        p.delete('destinationName');
                                                    });
                                                }}
                                                className="text-sm text-[#1C5E2C] font-medium underline underline-offset-2 hover:text-[#164a22]"
                                            >
                                                Clear all
                                            </button>
                                        </>
                                    ) : null}
                                </p>
                                {multipleSelected ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {selectedPartners.map(p => {
                                            const key = selectedPartnerKey(p);
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    className="inline-flex items-center gap-1 rounded-full bg-[#e8f4eb] px-2 py-1 text-xs text-[#1C5E2C]"
                                                    onClick={() => {
                                                        toggleSelectedOrg(p);
                                                        const next = selectedPartners.filter(
                                                            s =>
                                                                selectedPartnerKey(s) !==
                                                                selectedPartnerKey(p)
                                                        );
                                                        replaceSearchParams(params => {
                                                            params.delete('householdId18');
                                                            params.delete('destination');
                                                            params.delete('destinationName');
                                                            for (const s of next) {
                                                                if (s.householdId18?.trim()) {
                                                                    params.append(
                                                                        'householdId18',
                                                                        s.householdId18.trim()
                                                                    );
                                                                } else if (s.name?.trim()) {
                                                                    params.append(
                                                                        'destinationName',
                                                                        s.name.trim()
                                                                    );
                                                                }
                                                            }
                                                        });
                                                    }}
                                                >
                                                    <span className="max-w-44 truncate">
                                                        {p.name}
                                                    </span>
                                                    <span aria-hidden="true">x</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        ) : !isAdmin && nonAdminPrimaryOrgName ? (
                            <p className="mt-2 mb-2 text-base leading-snug text-gray-600 sm:text-[1.0625rem]">
                                Welcome! Here&apos;s your dashboard for{' '}
                                <span className="font-medium text-gray-900">
                                    {nonAdminPrimaryOrgName}
                                </span>
                                .
                            </p>
                        ) : null}
                    </div>
                    {partnerOrganizations.length > 1 ? (
                        <div className="w-full max-w-[17.5rem] shrink-0 self-start sm:max-w-sm lg:w-auto lg:pt-1">
                            <SearchBarOverview
                                organizations={partnerOrganizations}
                                selectedPartners={selectedPartners}
                                showSelectedChips={false}
                                onTogglePartner={partner => {
                                    toggleSelectedOrg(partner);
                                    const next = (() => {
                                        const key = selectedPartnerKey(partner);
                                        const exists = selectedPartners.some(
                                            p => selectedPartnerKey(p) === key
                                        );
                                        return exists
                                            ? selectedPartners.filter(
                                                  p => selectedPartnerKey(p) !== key
                                              )
                                            : [...selectedPartners, partner];
                                    })();
                                    replaceSearchParams(p => {
                                        p.delete('householdId18');
                                        p.delete('destination');
                                        p.delete('destinationName');
                                        for (const s of next) {
                                            if (s.householdId18?.trim()) {
                                                p.append('householdId18', s.householdId18.trim());
                                            } else if (s.name?.trim()) {
                                                p.append('destinationName', s.name.trim());
                                            }
                                        }
                                    });
                                }}
                                onClearAllPartners={() => {
                                    clearSelectedOrgs();
                                    replaceSearchParams(p => {
                                        p.delete('householdId18');
                                        p.delete('destination');
                                        p.delete('destinationName');
                                    });
                                }}
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
                        <div className="flex flex-col gap-5 pt-0 sm:gap-6">
                            {/* Top stats + trend: compact key metrics column, chart takes rest */}
                            <div className="grid grid-cols-1 gap-y-3 gap-x-4 lg:grid-cols-[minmax(0,220px)_minmax(0,2fr)] lg:grid-rows-[auto_minmax(220px,1fr)] lg:gap-y-3 items-stretch">
                                <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                                    Key metrics
                                </p>
                                <div className="hidden lg:block">
                                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                                        Delivery trend
                                    </p>
                                </div>
                                <div className="grid min-h-0 h-full w-full grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-1 lg:grid-rows-[repeat(3,minmax(0,1fr))] lg:gap-2">
                                    <StatCard
                                        fillHeight
                                        label="Pounds Delivered (Bulk & Recovery)"
                                        value={totalPoundsDelivered.toLocaleString()}
                                        unit="lbs"
                                    />
                                    <StatCard
                                        fillHeight
                                        label="Pounds Delivered (Just Eats)"
                                        value={justEatsPoundsDelivered.toLocaleString()}
                                        unit="lbs"
                                    />
                                    <StatCard
                                        fillHeight
                                        className="col-span-2 lg:col-span-1"
                                        label="Total Deliveries (Bulk, Recovery, and Just Eats)"
                                        value={totalDeliveriesAllPrograms.toLocaleString()}
                                    />
                                </div>
                                <div className="flex min-h-0 flex-col max-lg:mt-1">
                                    <div className="mb-1 max-lg:mb-2 lg:hidden">
                                        <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">
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
                                        <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                                            Donation composition
                                        </p>
                                        <p className="mt-0.5 text-sm text-gray-600">
                                            Breakdown of food types and processing levels for bulk
                                            and recovery deliveries.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
                                    <div className="flex min-h-[380px] min-w-0 flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                        <div className="flex-1">
                                            <FoodTypesDonutChart
                                                data={foodTypesData}
                                                title="Food Types Donated"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex min-h-[380px] min-w-0 flex-col bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4">
                                        <div className="flex-1">
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
                                        <p className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                                            Recent deliveries
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            Snapshot of completed deliveries in the selected period.
                                        </p>
                                    </div>
                                </div>
                                <div className="w-full overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
                                    <DeliverySummary
                                        deliveries={deliverySummaryData}
                                        historyLink="distribution"
                                        middleColumn={
                                            isPartnerDashboard ? 'deliveryProgram' : 'partner'
                                        }
                                        containerStyle="embedded"
                                    />
                                    <div className="flex justify-end border-t border-gray-100 px-3 py-3 sm:px-4">
                                        <Link
                                            href={
                                                selectedPartners.length > 0
                                                    ? `/distribution?${(() => {
                                                          const p = new URLSearchParams();
                                                          for (const s of selectedPartners) {
                                                              if (s.householdId18?.trim())
                                                                  p.append(
                                                                      'householdId18',
                                                                      s.householdId18.trim()
                                                                  );
                                                              else if (s.name?.trim())
                                                                  p.append(
                                                                      'destinationName',
                                                                      s.name.trim()
                                                                  );
                                                          }
                                                          return p.toString();
                                                      })()}`
                                                    : '/distribution'
                                            }
                                            className="inline-flex items-center justify-center rounded-lg border border-transparent px-5 py-2 text-sm font-medium text-black shadow-sm transition-colors hover:opacity-90"
                                            style={{ backgroundColor: 'var(--fff-orange)' }}
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
