'use client';

import React, { useRef } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';
import DeliverySummary from '../../components/ui/DeliverySummary';
import { DownloadPDFButton } from '@/components/ui/DownloadPDFButton';

const deliveries = [
    { id: 1, date: new Date('2025-11-01'), totalPounds: 120 },
    { id: 2, date: new Date('2025-11-05'), totalPounds: 95 },
    { id: 3, date: new Date('2025-11-10'), totalPounds: 150 },
];

interface OrganizationInfo {
    organizationName?: string;
    description?: string;
}

const OverviewPage: React.FC<OrganizationInfo> = ({
    organizationName = 'Organization Name',
    description = "Overview of your organization's deliveries and analytics.",
}) => {
    const exportRef = useRef<HTMLDivElement>(null);

    return (
        <div className="p-4 sm:p-6 lg:p-10 bg-[#FAF9F7] min-h-screen space-y-10 print:p-0 print:bg-white print:space-y-3">
            <div ref={exportRef} className="print-container">
                {/* Header */}
                <div className="mb-8 print:mb-3">
                    <div className="flex justify-between items-start gap-4">
                        <h1 className="text-2xl sm:text-3xl font-bold pb-2 print:text-2xl print:pb-1 print:mb-2">
                            {organizationName}: Statistics Overview
                        </h1>
                        <DownloadPDFButton targetRef={exportRef} fileName="overview.pdf" />
                    </div>
                    <p className="pb-6 sm:pb-10 text-gray-600 print:pb-0 print:mb-3 print:text-sm">
                        {description}
                    </p>
                </div>

                {/* Monthly Chart */}
                <div className="w-full bg-white rounded-xl shadow p-6 mb-8 print:shadow-none print:border print:border-gray-200 print:p-3 print:mb-3">
                    <PoundsByMonthChart />
                </div>

                {/* Pie + Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 print:grid-cols-2 print:gap-3 print:mb-3">
                    {/* Pie Chart */}
                    <div className="bg-white rounded-xl shadow p-6 h-full print:shadow-none print:border print:border-gray-200 print:p-3">
                        <FoodTypesDonutChart />
                    </div>

                    {/* Stat Cards */}
                    <div className="flex flex-col gap-6 h-full print:gap-3">
                        <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10 print:shadow-none print:border print:border-gray-200 print:p-4 print:h-auto print:py-4">
                            <StatCard label="Total Delivered" value="725" unit="lbs" />
                        </div>

                        <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10 print:shadow-none print:border print:border-gray-200 print:p-4 print:h-auto print:py-4">
                            <StatCard label="Deliveries Completed" value="25" />
                        </div>
                    </div>
                </div>

                {/* Delivery Summary */}
                <div className="w-full bg-white rounded-xl shadow p-6 print:shadow-none print:border print:border-gray-200 print:p-3">
                    <DeliverySummary deliveries={deliveries} historyLink="IDK" />
                </div>
            </div>
        </div>
    );
};

export default OverviewPage;
