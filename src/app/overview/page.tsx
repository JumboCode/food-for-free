'use client';

import React from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';
import DeliverySummary from '../../components/ui/DeliverySummary';

const deliveries = [
    { id: 1, date: new Date('2025-11-01'), totalPounds: 120 },
    { id: 2, date: new Date('2025-11-05'), totalPounds: 95 },
    { id: 3, date: new Date('2025-11-10'), totalPounds: 150 },
];

interface OrganizationInfo {
    organizationName?: string;
    description?: string;
}

const OverviewPage = () => {
    const organizationName = 'Organization Name';
    const description = "Overview of your organization's deliveries and analytics.";
    return (
        <div className="p-4 sm:p-6 lg:p-10 bg-[#FAF9F7] min-h-screen space-y-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold pb-2">
                    {organizationName}: Statistics Overview
                </h1>
                <p className="pb-6 sm:pb-10">{description}</p>
            </div>

            {/* Monthly Chart */}
            <div className="w-full bg-white rounded-xl shadow p-6">
                <PoundsByMonthChart />
            </div>

            {/* Pie + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-white rounded-xl shadow p-6 h-full">
                    <FoodTypesDonutChart />
                </div>

                {/* Stat Cards – match donut height */}
                <div className="flex flex-col gap-6 h-full">
                    <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10">
                        <StatCard label="Total Delivered" value="725" unit="lbs" />
                    </div>

                    <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10">
                        <StatCard label="Deliveries Completed" value="25" />
                    </div>
                </div>
            </div>

            {/* Delivery Summary */}
            <div className="w-full bg-white rounded-xl shadow p-6">
                <DeliverySummary deliveries={deliveries} historyLink="distribution" />
            </div>
        </div>
    );
};

export default OverviewPage;
