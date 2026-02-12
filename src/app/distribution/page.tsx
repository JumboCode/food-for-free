'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import DeliverySummaryRow from '@/components/ui/DeliverySummaryRow';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';
import { MyCalendar } from '@/components/ui/CalendarPicker';

type Delivery = {
    id: number;
    date: Date;
    totalPounds: number;
};

const sampleDeliveryData = {
    date: '11/16/2025',
    organizationName: 'Food For Free',
    totalPounds: '1,205.00 lbs',
    nutritionalTags: ['High Protein', 'Vegetarian', 'Gluten Free'],
    foodsDelivered: [
        { name: 'Fresh Apples', weight: '120 lbs' },
        { name: 'Whole Grain Bread', weight: '85 lbs' },
        { name: 'Canned Beans (Assorted)', weight: '200 lbs' },
        { name: 'Frozen Chicken Breast', weight: '150 lbs' },
        { name: 'Carrots (Bulk)', weight: '90 lbs' },
        { name: 'Milk (Gallons)', weight: '300 lbs' },
        { name: 'Rice Bags', weight: '110 lbs' },
        { name: 'Potatoes', weight: '150 lbs' },
    ],
};

type FoodItem = { name: string; weight: string };

type DeliveryDetail = {
    date: string;
    organizationName: string;
    totalPounds: string;
    nutritionalTags?: string[];
    foodsDelivered?: FoodItem[];
};

const DistributionPage: React.FC = () => {
    const [deliveries] = useState<Delivery[]>(() => {
        // create a longer list to simulate history
        const base: Delivery[] = [];
        for (let i = 1; i <= 20; i++) {
            base.push({
                id: i,
                date: new Date(2025, 9, 30 - (i % 10)),
                totalPounds: 100 + i * 5,
            });
        }
        return base;
    });

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [activeDetail, setActiveDetail] = useState<DeliveryDetail | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');

    const openDetail = (delivery: Delivery) => {
        // For now reuse sampleDeliveryData; attach date/total
        const detail: DeliveryDetail = {
            ...sampleDeliveryData,
            date: delivery.date.toLocaleDateString(),
            totalPounds: `${delivery.totalPounds} lbs`,
        };
        setActiveDetail(detail);
        setIsPopupOpen(true);
    };

    const filteredDeliveries = deliveries.filter(d => {
        const dateStr = d.date.toLocaleDateString();
        const poundsStr = `${d.totalPounds}`;
        const idStr = `${d.id}`;
        const term = searchTerm.trim().toLowerCase();
        if (term === '') return true;
        return (
            dateStr.toLowerCase().includes(term) ||
            poundsStr.toLowerCase().includes(term) ||
            idStr.toLowerCase().includes(term)
        );
    });

    return (
        <div className="p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Distribution</h1>
                <p className="text-gray-600 mb-6">Full list of deliveries for your organization.</p>

                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="relative w-64 md:w-56">
                            <input
                                aria-label="Search deliveries"
                                placeholder="Search deliveries..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full px-2 py-1 pr-9 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-green-200 focus:border-transparent"
                            />
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>

                        <MyCalendar compact />

                        <button className="inline-flex items-center gap-2 bg-[#E6F6EF] hover:bg-[#DFF0E6] text-[#227A4E] px-4 py-2 rounded-md border border-[#D9EFE0] shadow-sm">
                            Filter
                        </button>
                    </div>

                    <div className="flex-1" />
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {filteredDeliveries.map(d => (
                        <DeliverySummaryRow
                            key={d.id}
                            id={d.id}
                            date={d.date}
                            totalPounds={d.totalPounds}
                            onClick={() => openDetail(d)}
                        />
                    ))}
                </div>

                <DeliveryDetailPopup
                    isOpen={isPopupOpen}
                    onClose={() => setIsPopupOpen(false)}
                    {...(activeDetail ?? sampleDeliveryData)}
                />
            </div>
        </div>
    );
};

export default DistributionPage;
