'use client';

// import React, { useState, useEffect } from 'react';
// import { useSearchParams } from 'next/navigation';
// import { Search, Loader2 } from 'lucide-react';
// import { MyCalendar } from '@/components/ui/CalendarPicker';
// import DeliverySummaryRow from '@/components/ui/DeliverySummaryRow';

// interface DeliveryRecord {
//     householdId18: number;
//     date: Date;
//     organizationName: string;
//     productName: string;
//     weightLbs: number;
//     inventoryType: string;
//     foodRescueProgram: string;
// }
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import DeliverySummaryRow from '@/components/ui/DeliverySummaryRow';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';

type DeliveryListItem = {
    id: string;
    date: string;
    destination: string | null;
    totalPounds: number;
};

type DeliveryDetail = {
    date: string;
    organizationName: string;
    totalPounds: number;
    nutritionalTags: string[];
    foodsDelivered: { name: string; weight: string }[];
};

function getDefaultRange() {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    return { start, end };
}

function formatDateParam(date: Date) {
    return date.toISOString().split('T')[0];
}

// const DistributionPage: React.FC = () => {
//     const [loading, setLoading] = useState(true);
//     const [searchTerm, setSearchTerm] = useState('');

//     const [data, setData] = useState<DeliveryRecord[]>([]);
//     const searchParams = useSearchParams();
//     const startParam = searchParams.get('start') ?? undefined;
//     const endParam = searchParams.get('end') ?? undefined;

//     useEffect(() => {
//         async function fetchData() {
//             try {
//                 const query = new URLSearchParams();
//                 if (startParam) query.set('start', startParam);
//                 if (endParam) query.set('end', endParam);
//                 const response = await fetch(`/api/admin/deliveries?${query.toString()}`);
//                 if (!response.ok) throw new Error('Failed to fetch data.');
//                 const json = await response.json();
//                 console.log('Data:', json);
//                 setData(json);
//             } catch (err) {
//                 console.error('Fetch error:', err);
//             } finally {
//                 setLoading(false);
//             }
//         }
//         fetchData();
//     }, [startParam, endParam]);
const DistributionPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState(getDefaultRange());

    const [deliveries, setDeliveries] = useState<DeliveryListItem[]>([]);
    const [selectedDelivery, setSelectedDelivery] = useState<DeliveryListItem | null>(null);
    const [deliveryDetail, setDeliveryDetail] = useState<DeliveryDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const filteredDeliveries = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return deliveries;
        return deliveries.filter(d => (d.destination ?? '').toLowerCase().includes(term));
    }, [deliveries, searchTerm]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const rows = deliveries.map(d => ({
                date: d.date,
                organization: d.destination ?? '',
                totalPounds: d.totalPounds,
            }));
            const header = ['date', 'organization', 'totalPounds'];
            const csv = [
                header.join(','),
                ...rows.map(r => [r.date, r.organization, r.totalPounds].join(',')),
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `deliveries-${formatDateParam(new Date())}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        async function fetchDeliveries() {
            setLoading(true);
            try {
                const start = formatDateParam(dateRange.start);
                const end = formatDateParam(dateRange.end);
                const res = await fetch(`/api/overview/deliveries?start=${start}&end=${end}`);
                if (!res.ok) throw new Error('Failed to load deliveries');
                const json = await res.json();
                setDeliveries(json.deliveries ?? []);
            } catch (err) {
                console.error('Failed to load deliveries:', err);
                setDeliveries([]);
            } finally {
                setLoading(false);
            }
        }

        fetchDeliveries();
    }, [dateRange]);

    const loadDeliveryDetail = async (delivery: DeliveryListItem) => {
        setSelectedDelivery(delivery);
        setDetailError(null);
        setDeliveryDetail(null);
        setDetailLoading(true);

        try {
            const date = delivery.date.split('T')[0];
            const dest = encodeURIComponent(delivery.destination ?? '');
            const res = await fetch(`/api/overview/delivery?date=${date}&destination=${dest}`);
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json?.error ?? 'Failed to load delivery detail.');
            }
            const json = await res.json();
            setDeliveryDetail(json);
        } catch (err) {
            console.error('Failed to load delivery detail:', err);
            setDetailError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setSelectedDelivery(null);
        setDeliveryDetail(null);
        setDetailError(null);
        setDetailLoading(false);
    };

    return (
        <div className="p-6 md:p-10 bg-[#F9FAFB] min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Distribution</h1>
                <p className="text-gray-600 mb-8">
                    A summary of past deliveries. Click &ldquo;export&rdquo; to download CSV data.
                </p>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                        <div className="relative w-full max-w-sm">
                            <input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#608D6A] outline-none"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>

                        <MyCalendar selectedRange={dateRange} onRangeChange={setDateRange} />

                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="px-4 py-2 bg-[#608D6A] hover:bg-[#4d7155] text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {exporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Export CSV'
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-5 px-4 py-3 bg-[#e7f3ea] rounded-t-lg border-b border-gray-200 font-medium">
                        <div>Date</div>
                        <div>Organization</div>
                        <div>Food</div>
                        <div>Weight (lbs)</div>
                        <div>Tags</div>
                    </div>

                    <div className="border border-gray-200 rounded-b-lg overflow-hidden bg-white">
                        {loading ? (
                            <div className="flex flex-col items-center py-20 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <p>Fetching distribution data...</p>
                            </div>
                        ) : filteredDeliveries.length > 0 ? (
                            filteredDeliveries.map((d, index) => (
                                <DeliverySummaryRow
                                    key={d.id}
                                    id={index}
                                    date={new Date(d.date)}
                                    organization={d.destination ?? ''}
                                    name="Various"
                                    totalPounds={d.totalPounds}
                                    onClick={() => loadDeliveryDetail(d)}
                                />
                            ))
                        ) : (
                            <div className="py-20 text-center text-gray-500">No records found.</div>
                        )}
                        <DeliveryDetailPopup
                            isOpen={Boolean(selectedDelivery)}
                            onClose={closeDetail}
                            date={deliveryDetail?.date ?? selectedDelivery?.date ?? ''}
                            organizationName={
                                deliveryDetail?.organizationName ??
                                selectedDelivery?.destination ??
                                ''
                            }
                            totalPounds={
                                deliveryDetail?.totalPounds ? `${deliveryDetail.totalPounds}` : ''
                            }
                            nutritionalTags={deliveryDetail?.nutritionalTags}
                            foodsDelivered={deliveryDetail?.foodsDelivered ?? []}
                        />

                        {detailLoading && selectedDelivery && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                                <div className="rounded-lg bg-white p-6 shadow-lg flex items-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Loading delivery details...</span>
                                </div>
                            </div>
                        )}

                        {detailError && (
                            <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-red-100 border border-red-200 p-4 text-sm text-red-800">
                                <strong>Error:</strong> {detailError}
                            </div>
                        )}
                        {/* {loading ? (
                            <div className="flex flex-col items-center py-20 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <p>Fetching distribution data...</p>
                            </div>
                        ) : filteredDeliveries.length > 0 ? (
                            filteredDeliveries.map((d, index) => (
                                <DeliverySummaryRow
                                    key={d.id}
                                    id={index}
                                    date={new Date(d.date)}
                                    organization={d.destination ?? ''}
                                    name="Various"
                                    totalPounds={d.totalPounds}
                                    onClick={() => loadDeliveryDetail(d)}
                                />
                            ))
                        ) : (
                            <div className="py-20 text-center text-gray-500">No records found.</div>
                        )}
                        <DeliveryDetailPopup
                            isOpen={Boolean(selectedDelivery)}
                            onClose={closeDetail}
                            date={deliveryDetail?.date ?? selectedDelivery?.date ?? ''}
                            organizationName={
                                deliveryDetail?.organizationName ??
                                selectedDelivery?.destination ??
                                ''
                            }
                            totalPounds={
                                deliveryDetail?.totalPounds ? `${deliveryDetail.totalPounds}` : ''
                            }
                            nutritionalTags={deliveryDetail?.nutritionalTags}
                            foodsDelivered={deliveryDetail?.foodsDelivered ?? []}
                        />

                        {detailLoading && selectedDelivery && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                                <div className="rounded-lg bg-white p-6 shadow-lg flex items-center gap-3">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Loading delivery details...</span>
                                </div>
                            </div>
                        )}

                        {detailError && (
                            <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-red-100 border border-red-200 p-4 text-sm text-red-800">
                                <strong>Error:</strong> {detailError}
                            </div>
                        )}
                        {/* {loading ? (
                            <div className="flex flex-col items-center py-20 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <p>Fetching data...</p>
                            </div>
                        ) : data.length > 0 ? (
                            data.map((d, index) => (
                                <DeliverySummaryRow
                                    key={`${d.householdId18}-${index}`}
                                    id={d.householdId18}
                                    date={d.date}
                                    organization={d.organizationName}
                                    name={d.productName}
                                    totalPounds={d.weightLbs}
                                />
                            ))
                        ) : (
                            <div className="py-20 text-center text-gray-500">No records found.</div>
                        )} */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DistributionPage;
