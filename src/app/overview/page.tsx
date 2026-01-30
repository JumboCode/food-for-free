'use client';

import React, { useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';
import DeliverySummary from '../../components/ui/DeliverySummary';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import SearchBarOverview from '@/components/ui/SearchBarOverview';

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
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
    });

    const [selectedPartner, setSelectedPartner] = useState<string>(organizationName);

    const handlePartnerSelection = (partnerName: string) => {
        setSelectedPartner(partnerName);
    };

    const partnerData = [
        { id: 1, name: 'Whole Foods Market', location: 'Cambridge', type: 'Grocery Store' },
        { id: 2, name: 'Somerville Food Pantry', location: 'Somerville', type: 'Food Pantry' },
        {
            id: 3,
            name: 'Cambridge Community Center',
            location: 'Cambridge',
            type: 'Community Center',
        },
        { id: 4, name: 'Boston Food Bank', location: 'Boston', type: 'Food Bank' },
        { id: 5, name: 'Harvard Square Market', location: 'Cambridge', type: 'Market' },
        { id: 6, name: 'MIT Community Garden', location: 'Cambridge', type: 'Garden' },
        { id: 7, name: 'Central Square Grocery', location: 'Cambridge', type: 'Grocery Store' },
        { id: 8, name: 'Porter Square Co-op', location: 'Cambridge', type: 'Cooperative' },
        {
            id: 9,
            name: 'Davis Square Farmers Market',
            location: 'Somerville',
            type: 'Farmers Market',
        },
        { id: 10, name: 'Union Square Market', location: 'Somerville', type: 'Market' },
        { id: 11, name: 'Assembly Row Fresh Market', location: 'Somerville', type: 'Market' },
        { id: 12, name: 'Kendall Square Kitchen', location: 'Cambridge', type: 'Kitchen' },
        { id: 13, name: 'Arlington Food Cooperative', location: 'Arlington', type: 'Cooperative' },
        { id: 14, name: 'Medford Community Kitchen', location: 'Medford', type: 'Kitchen' },
        { id: 15, name: 'Malden Fresh Foods', location: 'Malden', type: 'Grocery Store' },
        { id: 16, name: 'Everett Community Garden', location: 'Everett', type: 'Garden' },
        { id: 17, name: 'Chelsea Food Hub', location: 'Chelsea', type: 'Food Hub' },
        { id: 18, name: 'Revere Beach Market', location: 'Revere', type: 'Market' },
        { id: 19, name: 'Lynn Community Center', location: 'Lynn', type: 'Community Center' },
        { id: 20, name: 'Salem Organic Market', location: 'Salem', type: 'Market' },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-10 bg-[#FAF9F7] min-h-screen space-y-10">
            {/* Header with Date Range Selector */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold pb-2">
                        {selectedPartner}: Statistics Overview
                    </h1>
                    <p className="pb-6 sm:pb-0">{description}</p>
                </div>
                <div className="flex-shrink-0 flex-start">
                    <MyCalendar selectedRange={dateRange} onRangeChange={setDateRange} />
                </div>
            </div>

            <SearchBarOverview
                organizations={partnerData}
                onSelectPartner={handlePartnerSelection}
            />

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
                <DeliverySummary deliveries={deliveries} historyLink="IDK" />
            </div>
        </div>
    );
};

export default OverviewPage;
