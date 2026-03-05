'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
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

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/api/admin/deliveries');
                if (!response.ok) throw new Error('Failed to fetch data.');
                const json = await response.json();
                console.log('Data:', json);
                setData(json);
            } catch (err) {
                console.error('Fetch error:', err);
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
                    A full summary of past deliveries, across all partner organizations. Click
                    &ldquo;export&rdquo; to download the full history.
                </p>
                <div className="bg-[#FFFFFF] p-15 rounded-lg shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                        <div className="relative w-full max-w-sm">
                            <input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#608D6A] outline-none bg-white"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                        <MyCalendar />
                        {/* <DownloadPDFButton targetRef={null} /> */}
                    </div>

                    <div className="grid text-left grid-cols-5 px-1 py-3 bg-[#e7f3ea] text-[#000000] rounded-t-lg border-b border-gray-200">
                        <div className="flex-1 px-4 text-[#000000] ">Date</div>
                        <div className="flex-1 px-4 text-[#000000] ">Organization</div>
                        <div className="flex-1 px-4 text-[#000000]">Food</div>
                        <div className="flex-1 px-4 text-[#000000]">Weight (lbs)</div>
                        <div className="flex-1 px-4 text-[#000000] ">Tags</div>
                    </div>

                    {/* Distribution List */}
                    <div className="border border-gray-200 rounded-b-lg overflow-hidden shadow-sm bg-white">
                        {loading ? (
                            <div className="flex flex-col items-center py-20 text-gray-400">
                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                <p>Fetching distribution data...</p>
                            </div>
                        ) : data.length > 0 ? (
                            data.map((d, index) => (
                                <DeliverySummaryRow
                                    key={d.householdId18 + index}
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
