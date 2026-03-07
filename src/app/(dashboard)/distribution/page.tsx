'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { MyCalendar } from '@/components/ui/CalendarPicker';

interface DeliveryRecord {
    householdId18: number;
    date: Date;
    organizationName: string;
    productName: string;
    weightLbs: number;
    inventoryType: string;
    foodRescueProgram: string;
}

/** Frontend-only: derive a simple processing label from food type for display */
function getProcessingLabel(inventoryType: string | null | undefined): string {
    if (!inventoryType || !inventoryType.trim()) return 'Not specified';
    const t = inventoryType.toLowerCase();
    if (t.includes('canned') || t.includes('packaged') || t.includes('frozen')) return 'Processed';
    return 'Minimally processed';
}

const THEME_GREEN = '#B7D7BD';
const THEME_ORANGE = '#FAC87D';

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
            const response = await fetch(
                `/api/distribution?start=${startStr}&end=${endStr}&search=${encodeURIComponent(searchTerm)}`
            );

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
                if (!response.ok) throw new Error('Failed to fetch data.');
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

    const filteredData = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return data;
        return data.filter(d => {
            return (
                (d.organizationName || '').toLowerCase().includes(search) ||
                (d.productName || '').toLowerCase().includes(search) ||
                (d.inventoryType || '').toLowerCase().includes(search)
            );
        });
    }, [data, searchTerm]);

    return (
        <div className="min-h-screen bg-[#fafaf9]">
            <div className="max-w-6xl mx-auto px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">Distribution</h1>
                    <p className="text-sm text-gray-500">
                        Past deliveries. Search to filter; export uses the date range above.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            placeholder="Search…"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                        />
                    </div>
                    <MyCalendar selectedRange={dateRange} onRangeChange={setDateRange} />
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

                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse" style={{ minWidth: 720 }}>
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[110px]">
                                        Date
                                    </th>
                                    <th className="text-left py-3 pl-5 pr-2 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[200px]">
                                        Organization
                                    </th>
                                    <th className="text-left py-3 pl-2 pr-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[200px]">
                                        Food
                                    </th>
                                    <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[100px]">
                                        Weight
                                    </th>
                                    <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[240px]">
                                        Tags
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-500">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                            Loading…
                                        </td>
                                    </tr>
                                ) : filteredData.length > 0 ? (
                                    filteredData.map((d, index) => (
                                        <tr
                                            key={`${d.householdId18}-${index}-${d.productName}-${d.date}`}
                                            className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70 transition-colors"
                                        >
                                            <td className="py-3.5 px-5 text-sm text-gray-600 tabular-nums">
                                                {format(new Date(d.date), 'M/d/yyyy')}
                                            </td>
                                            <td className="py-3.5 pl-5 pr-2 text-sm font-medium text-gray-900 truncate max-w-[200px]" title={d.organizationName}>
                                                {d.organizationName}
                                            </td>
                                            <td className="py-3.5 pl-2 pr-5 text-sm text-gray-700 truncate max-w-[200px]">
                                                {d.productName?.trim() || '—'}
                                            </td>
                                            <td className="py-3.5 px-5 text-sm font-medium text-gray-900 text-right tabular-nums">
                                                {Number(d.weightLbs).toLocaleString()} lbs
                                            </td>
                                            <td className="py-3.5 px-5">
                                                <span className="inline-flex flex-wrap items-center gap-2">
                                                    <span
                                                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border border-[#e8c878]/60"
                                                        style={{ backgroundColor: 'rgba(250, 200, 125, 0.35)', color: '#744210' }}
                                                    >
                                                        {getProcessingLabel(d.inventoryType)}
                                                    </span>
                                                    <span
                                                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border border-[#9fc5a9]/60"
                                                        style={{ backgroundColor: 'rgba(183, 215, 189, 0.35)', color: '#608D6A' }}
                                                    >
                                                        {d.inventoryType?.trim() || '—'}
                                                    </span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-gray-500 text-sm">
                                            No records match the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DistributionPage;
