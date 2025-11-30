import React from 'react';
import DeliverySummaryRow from './DeliverySummaryRow'; // Adjust path as needed

type Delivery = {
    date: Date;
    totalPounds: number;
    id: number;
};

type DeliverySummaryProps = {
    deliveries: Delivery[];
    historyLink: string;
};

const DeliverySummary: React.FC<DeliverySummaryProps> = ({ deliveries, historyLink }) => {
    return (
        <div className="w-full">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Delivery Summary</h2>
                    <p className="text-gray-600 mt-1">
                        Snapshot of past deliveries for your organization. Visit the distribution
                        tab to see more listings.
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
                    />
                ))}
            </div>
        </div>
    );
};

export default DeliverySummary;
