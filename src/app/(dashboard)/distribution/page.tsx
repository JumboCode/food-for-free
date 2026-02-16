'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import DeliverySummaryRow from '@/components/ui/DeliverySummaryRow';
import DownloadPDFButton from '@/components/ui/DownloadPDFButton';

interface DeliveryRecord {
    id: number;
    date: Date; // ISO string from backend
    organizationName: string;
    productName: string;
    weightLbs: number;
    inventoryType: string;
}

const DistributionPage: React.FC = () => {
    const [records, setRecords] = useState<DeliveryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchDeliveries = async () => {
            setLoading(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 800));
                const mockData: DeliveryRecord[] = [
                    {
                        id: 101,
                        date: new Date('2026-02-14'),
                        organizationName: 'Food For Free',
                        productName: 'Fresh Apples',
                        weightLbs: 1205,
                        inventoryType: 'Weekly Account',
                    },
                    {
                        id: 102,
                        date: new Date('2026-02-14'),
                        organizationName: 'Open Door Pantry',
                        productName: 'Whole Grain Bread',
                        weightLbs: 850,
                        inventoryType: 'Whole Pallet Order',
                    },
                    {
                        id: 103,
                        date: new Date('2026-02-13'),
                        organizationName: 'Grace Church',
                        productName: 'Frozen Chicken',
                        weightLbs: 400,
                        inventoryType: 'Weekly Account',
                    },
                ];
                setRecords(mockData);
            } finally {
                setLoading(false);
            }
        };
        fetchDeliveries();
    }, []);

    const filteredRecords = records.filter(
        r =>
            r.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.productName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-10 bg-[#F9FAFB] min-h-screen">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Distribution</h1>
                <p className="text-gray-600 mb-8">
                    A full summary of past deliveries, across all partner organizations. Click
                    "export" to download the full history.
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
                        <MyCalendar compact />
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
                        ) : filteredRecords.length > 0 ? (
                            filteredRecords.map(record => (
                                <DeliverySummaryRow
                                    key={record.id}
                                    id={record.id}
                                    date={record.date}
                                    organization={record.organizationName}
                                    name={record.productName}
                                    totalPounds={record.weightLbs}
                                    tags={[record.inventoryType]}
                                    onClick={() => console.log('Opening detail for:', record.id)}
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
