'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import DeliverySummaryRow from '@/components/ui/DeliverySummaryRow';

interface DeliveryRecord {
    householdId18: number;
    date: Date;
    organizationName: string;
    productName: string;
    weightLbs: number;
    inventoryType: string;
    foodRescueProgram: string;
}

const DistributionPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [data, setData] = useState<DeliveryRecord[]>([]);
    const [dateRange, setDateRange] = useState({
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
    });
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const startStr = dateRange.start.toISOString();
            const endStr = dateRange.end.toISOString();
            const response = await fetch(`/api/distribution?start=${startStr}&end=${endStr}`);

            if (!response.ok) {
                if (response.status === 404) {
                    alert('No records found for the selected range.');
                    return;
                }
                throw new Error('Export failed');
            }

            const blob = await response.blob();
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
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            alert(errorMessage);
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const response = await fetch('/api/admin/deliveries');
                if (!response.ok) throw new Error('Failed to fetch');
                const json = await response.json();
                setData(json);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DistributionPage;
