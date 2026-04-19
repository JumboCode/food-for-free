'use client';

import React, { useState } from 'react';
import DeliverySummaryRow from './DeliverySummaryRow';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';

type Delivery = {
    date: Date;
    totalPounds: number;
    id: string;
    destination?: string | null;
    householdId18?: string | null;
};

type DeliverySummaryProps = {
    deliveries: Delivery[];
    historyLink: string;
};

type PopupData = {
    date: string;
    organizationName: string;
    totalPounds: string;
    nutritionalTags: string[];
    foodsDelivered: { name: string; weight: string }[];
};

const DeliverySummary: React.FC<DeliverySummaryProps> = ({ deliveries }) => {
    const [popupOpen, setPopupOpen] = useState(false);
    const [popupData, setPopupData] = useState<PopupData | null>(null);

    const handleDeliveryClick = async (delivery: Delivery) => {
        const org = delivery.destination?.trim() ?? 'Selected Organization';
        const dateStr = new Date(delivery.date).toISOString().slice(0, 10);
        const params = new URLSearchParams({ date: dateStr, org });
        if (delivery.householdId18) params.set('householdId18', delivery.householdId18);
        try {
            const res = await fetch(`/api/overview/deliveries/detail?${params.toString()}`);
            if (!res.ok) return;
            const data = (await res.json()) as {
                date: string;
                organizationName: string;
                totalPounds: number;
                nutritionalTags?: string[];
                foodsDelivered: { name: string; weight: string }[];
            };
            setPopupData({
                date: new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                }),
                organizationName: data.organizationName,
                totalPounds: `${Number(data.totalPounds).toLocaleString()} lbs`,
                nutritionalTags: data.nutritionalTags ?? [],
                foodsDelivered: data.foodsDelivered,
            });
            setPopupOpen(true);
        } catch {
            // noop — silently fail if detail fetch fails
        }
    };

    return (
        <div className="w-full">
            <div className="rounded-xl border overflow-hidden shadow-sm border-[#B7D7BD]">
                <div className="divide-y divide-[#B7D7BD]/40 bg-white">
                    <div className="grid grid-cols-[100px_1fr_72px_auto] items-center gap-4 px-4 py-2.5 bg-gray-50/80">
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Date
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Partner
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 text-right">
                            Pounds
                        </span>
                        <span className="w-4" />
                    </div>
                    {deliveries.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-500">
                                No deliveries available for the selected date range.
                            </p>
                        </div>
                    ) : null}
                    {deliveries.map(delivery => (
                        <DeliverySummaryRow
                            key={delivery.id}
                            date={delivery.date}
                            organization={delivery.destination?.trim() ?? 'Unknown'}
                            totalPounds={delivery.totalPounds}
                            id={delivery.id}
                            onClick={() => {
                                void handleDeliveryClick(delivery);
                            }}
                        />
                    ))}
                </div>
            </div>

            {popupData && (
                <DeliveryDetailPopup
                    isOpen={popupOpen}
                    onClose={() => {
                        setPopupOpen(false);
                        setPopupData(null);
                    }}
                    {...popupData}
                />
            )}
        </div>
    );
};

export default DeliverySummary;
