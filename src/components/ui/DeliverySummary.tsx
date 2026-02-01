'use client';

import React, { useState } from 'react';
import DeliverySummaryRow from './DeliverySummaryRow';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';

type Delivery = {
    date: Date;
    totalPounds: number;
    id: number;
};

type DeliverySummaryProps = {
    deliveries: Delivery[];
    historyLink: string;
};

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

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Delivery Summary</h2>
                    <p className="text-gray-600 mt-1">
                        Snapshot of past deliveries for your organization.
                    </p>
                </div>

                <a
                    href={historyLink}
                    className="text-blue-600 underline hover:text-blue-800 font-medium"
                >
                    Full Distribution History
                </a>
            </div>

            {/* Delivery Rows */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                {deliveries.map(delivery => (
                    <DeliverySummaryRow
                        key={delivery.id}
                        date={delivery.date}
                        totalPounds={delivery.totalPounds}
                        id={delivery.id}
                        onClick={() => setIsDeliveryPopupOpen(true)}
                    />
                ))}
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
