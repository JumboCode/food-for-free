'use client';

import React from 'react';

import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';

interface OrganizationInfo {
    organizationName: string;
    description: string;
}
const OverviewPage: React.FC<OrganizationInfo> = ({
    organizationName = 'Organization Name',
    description = "Overview of your organization's deliveries and analystics.",
}) => {
    return (
        <div className="p-4 sm:p-6 lg:p-10 bg-[#FAF9F7] min-h-screen space-y-6">
            <h1 className="text-2xl sm:text-3xl font-bold pb-2">
                {organizationName}: Statistics Overview
            </h1>
            <p className="pb-6 sm:pb-10">{description}</p>

            <div className="w-full overflow-x-auto">
                <PoundsByMonthChart />
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:flex-1">
                    <FoodTypesDonutChart />
                </div>

                <div className="flex flex-col gap-6 w-full lg:w-120">
                    <StatCard label="Total Delivered" value="725" unit="lbs" />
                    <StatCard label="Deliveries Completed" value="25" />
                </div>
            </div>
        </div>
    );
};

export default OverviewPage;
