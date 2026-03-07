'use client';

import React, { useState, useMemo } from 'react';
import DeliverySummaryRow from './DeliverySummaryRow';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';

type Delivery = {
    date: Date;
    totalPounds: number;
    id: number;
    destination?: string | null;
};

type DeliverySummaryProps = {
    deliveries: Delivery[];
    historyLink: string;
};

const SAMPLE_DESTINATIONS = [
    'Bunker Hill Community College',
    'Cambridge Community Center',
    'Central Assembly of God',
    'East Boston Community Soup Kitchen',
    'First Parish Church',
    'Pine Street Inn',
    'Revival',
    'Somerville YMCA',
    'East Somerville Community School',
    'West Somerville Neighborhood School',
    'CEOC Pantry',
    'East End House',
    'Margaret Fuller House',
];

const SAGE_GREEN = '#B7D7BD';

function isPlaceName(value: string | null | undefined): boolean {
    if (!value || !value.trim()) return false;
    const s = value.trim();
    return SAMPLE_DESTINATIONS.includes(s);
}

// Sticker sheet mock popup data
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

const DeliverySummary: React.FC<DeliverySummaryProps> = ({ deliveries, historyLink }) => {
    const [isDeliveryPopupOpen, setIsDeliveryPopupOpen] = useState(false);

    const enriched = useMemo(
        () =>
            deliveries.map((d, i) => ({
                ...d,
                organization: isPlaceName(d.destination)
                    ? (d.destination as string).trim()
                    : SAMPLE_DESTINATIONS[i % SAMPLE_DESTINATIONS.length],
            })),
        [deliveries]
    );

    return (
        <div className="w-full">
            {/* <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Delivery Summary</h2>
                <p className="text-sm mt-0.5" style={{ color: 'gray-900' }}>
                    Snapshot of past deliveries for your organization.
                </p>
            </div> */}

            <div className="rounded-xl border overflow-hidden shadow-sm border-[#B7D7BD]">
                <div className="divide-y divide-[#B7D7BD]/40 bg-white">
                    <div className="grid grid-cols-[100px_1fr_72px_auto] items-center gap-4 px-4 py-2.5 bg-gray-50/80">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Date</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Partner</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 text-right">Pounds</span>
                        <span className="w-4" />
                    </div>
                    {enriched.map(delivery => (
                        <DeliverySummaryRow
                            key={delivery.id}
                            date={delivery.date}
                            organization={delivery.organization}
                            totalPounds={delivery.totalPounds}
                            id={delivery.id}
                            onClick={() => setIsDeliveryPopupOpen(true)}
                        />
                    ))}
                </div>
            </div>

            <DeliveryDetailPopup
                isOpen={isDeliveryPopupOpen}
                onClose={() => setIsDeliveryPopupOpen(false)}
                {...sampleDeliveryData}
            />
        </div>
    );
};

export default DeliverySummary;
