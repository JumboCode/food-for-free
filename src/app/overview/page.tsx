'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';
import DeliverySummary from '../../components/ui/DeliverySummary';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import SearchBarOverview from '@/components/ui/SearchBarOverview';

// Comprehensive fake delivery data spanning multiple months
const allDeliveries = [
    // January 2025
    {
        id: 1,
        date: new Date('2025-01-05'),
        totalPounds: 320,
        organizationName: 'Whole Foods Market',
        foodTypes: { 'High Protein': 120, Vegetables: 80, Dairy: 70, Grains: 50 },
    },
    {
        id: 2,
        date: new Date('2025-01-15'),
        totalPounds: 280,
        organizationName: 'Somerville Food Pantry',
        foodTypes: { 'High Protein': 100, Vegetables: 90, Dairy: 50, Fruits: 40 },
    },
    {
        id: 3,
        date: new Date('2025-01-25'),
        totalPounds: 350,
        organizationName: 'Cambridge Community Center',
        foodTypes: { 'High Protein': 150, Vegetables: 100, Grains: 60, Fruits: 40 },
    },

    // February 2025
    {
        id: 4,
        date: new Date('2025-02-03'),
        totalPounds: 410,
        organizationName: 'Boston Food Bank',
        foodTypes: { 'High Protein': 180, Vegetables: 110, Dairy: 70, Fruits: 50 },
    },
    {
        id: 5,
        date: new Date('2025-02-14'),
        totalPounds: 390,
        organizationName: 'Whole Foods Market',
        foodTypes: { 'High Protein': 160, Vegetables: 100, Grains: 80, Dairy: 50 },
    },
    {
        id: 6,
        date: new Date('2025-02-24'),
        totalPounds: 420,
        organizationName: 'Harvard Square Market',
        foodTypes: { 'High Protein': 170, Vegetables: 120, Fruits: 80, Grains: 50 },
    },

    // March 2025
    {
        id: 7,
        date: new Date('2025-03-05'),
        totalPounds: 380,
        organizationName: 'MIT Community Garden',
        foodTypes: { 'High Protein': 140, Vegetables: 110, Dairy: 80, Fruits: 50 },
    },
    {
        id: 8,
        date: new Date('2025-03-18'),
        totalPounds: 400,
        organizationName: 'Central Square Grocery',
        foodTypes: { 'High Protein': 150, Vegetables: 120, Grains: 80, Fruits: 50 },
    },
    {
        id: 9,
        date: new Date('2025-03-28'),
        totalPounds: 360,
        organizationName: 'Somerville Food Pantry',
        foodTypes: { 'High Protein': 130, Vegetables: 100, Dairy: 80, Grains: 50 },
    },

    // April 2025
    {
        id: 10,
        date: new Date('2025-04-08'),
        totalPounds: 450,
        organizationName: 'Porter Square Co-op',
        foodTypes: { 'High Protein': 180, Vegetables: 140, Fruits: 80, Dairy: 50 },
    },
    {
        id: 11,
        date: new Date('2025-04-20'),
        totalPounds: 470,
        organizationName: 'Davis Square Farmers Market',
        foodTypes: { 'High Protein': 200, Vegetables: 130, Grains: 90, Fruits: 50 },
    },

    // May 2025
    {
        id: 12,
        date: new Date('2025-05-05'),
        totalPounds: 400,
        organizationName: 'Union Square Market',
        foodTypes: { 'High Protein': 150, Vegetables: 120, Dairy: 80, Fruits: 50 },
    },
    {
        id: 13,
        date: new Date('2025-05-18'),
        totalPounds: 420,
        organizationName: 'Whole Foods Market',
        foodTypes: { 'High Protein': 170, Vegetables: 130, Grains: 70, Fruits: 50 },
    },
    {
        id: 14,
        date: new Date('2025-05-28'),
        totalPounds: 380,
        organizationName: 'Assembly Row Fresh Market',
        foodTypes: { 'High Protein': 140, Vegetables: 110, Dairy: 80, Fruits: 50 },
    },

    // June 2025
    {
        id: 15,
        date: new Date('2025-06-08'),
        totalPounds: 420,
        organizationName: 'Kendall Square Kitchen',
        foodTypes: { 'High Protein': 160, Vegetables: 140, Fruits: 70, Grains: 50 },
    },
    {
        id: 16,
        date: new Date('2025-06-22'),
        totalPounds: 440,
        organizationName: 'Boston Food Bank',
        foodTypes: { 'High Protein': 180, Vegetables: 130, Dairy: 80, Fruits: 50 },
    },

    // July 2025
    {
        id: 17,
        date: new Date('2025-07-05'),
        totalPounds: 350,
        organizationName: 'Arlington Food Cooperative',
        foodTypes: { 'High Protein': 130, Vegetables: 100, Fruits: 70, Grains: 50 },
    },
    {
        id: 18,
        date: new Date('2025-07-20'),
        totalPounds: 370,
        organizationName: 'Medford Community Kitchen',
        foodTypes: { 'High Protein': 140, Vegetables: 110, Dairy: 70, Fruits: 50 },
    },

    // August 2025
    {
        id: 19,
        date: new Date('2025-08-08'),
        totalPounds: 430,
        organizationName: 'Malden Fresh Foods',
        foodTypes: { 'High Protein': 170, Vegetables: 140, Grains: 70, Fruits: 50 },
    },
    {
        id: 20,
        date: new Date('2025-08-22'),
        totalPounds: 450,
        organizationName: 'Whole Foods Market',
        foodTypes: { 'High Protein': 180, Vegetables: 150, Dairy: 70, Fruits: 50 },
    },

    // September 2025
    {
        id: 21,
        date: new Date('2025-09-05'),
        totalPounds: 390,
        organizationName: 'Everett Community Garden',
        foodTypes: { 'High Protein': 150, Vegetables: 120, Grains: 70, Fruits: 50 },
    },
    {
        id: 22,
        date: new Date('2025-09-18'),
        totalPounds: 410,
        organizationName: 'Chelsea Food Hub',
        foodTypes: { 'High Protein': 160, Vegetables: 130, Dairy: 70, Fruits: 50 },
    },

    // October 2025
    {
        id: 23,
        date: new Date('2025-10-05'),
        totalPounds: 400,
        organizationName: 'Revere Beach Market',
        foodTypes: { 'High Protein': 150, Vegetables: 130, Fruits: 70, Grains: 50 },
    },
    {
        id: 24,
        date: new Date('2025-10-20'),
        totalPounds: 420,
        organizationName: 'Lynn Community Center',
        foodTypes: { 'High Protein': 170, Vegetables: 140, Dairy: 60, Fruits: 50 },
    },

    // November 2025
    {
        id: 25,
        date: new Date('2025-11-01'),
        totalPounds: 480,
        organizationName: 'Salem Organic Market',
        foodTypes: { 'High Protein': 200, Vegetables: 150, Grains: 80, Fruits: 50 },
    },
    {
        id: 26,
        date: new Date('2025-11-15'),
        totalPounds: 500,
        organizationName: 'Boston Food Bank',
        foodTypes: { 'High Protein': 210, Vegetables: 160, Dairy: 80, Fruits: 50 },
    },

    // December 2025
    {
        id: 27,
        date: new Date('2025-12-05'),
        totalPounds: 420,
        organizationName: 'Whole Foods Market',
        foodTypes: { 'High Protein': 160, Vegetables: 140, Grains: 70, Fruits: 50 },
    },
    {
        id: 28,
        date: new Date('2025-12-18'),
        totalPounds: 440,
        organizationName: 'Cambridge Community Center',
        foodTypes: { 'High Protein': 180, Vegetables: 150, Dairy: 60, Fruits: 50 },
    },

    // January 2026
    {
        id: 29,
        date: new Date('2026-01-08'),
        totalPounds: 460,
        organizationName: 'Somerville Food Pantry',
        foodTypes: { 'High Protein': 190, Vegetables: 150, Grains: 70, Fruits: 50 },
    },
    {
        id: 30,
        date: new Date('2026-01-22'),
        totalPounds: 480,
        organizationName: 'Whole Foods Market',
        foodTypes: { 'High Protein': 200, Vegetables: 160, Dairy: 70, Fruits: 50 },
    },
];

interface OrganizationInfo {
    organizationName?: string;
    description?: string;
}

const OverviewPage: React.FC<OrganizationInfo> = ({
    organizationName = 'All Organizations',
    description = "Overview of your organization's deliveries and analytics.",
}) => {
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31'),
    });

    const [selectedPartner, setSelectedPartner] = useState<string>(organizationName);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    // Check if user is admin
    useEffect(() => {
        fetch('/api/admin/invitations')
            .then(res => {
                if (res.status === 403) {
                    setIsAdmin(false);
                } else if (res.ok) {
                    setIsAdmin(true);
                }
            })
            .catch(() => setIsAdmin(false));
    }, []);

    const handlePartnerSelection = (partnerName: string) => {
        setSelectedPartner(partnerName);
    };

    // Filter deliveries by date range and selected organization
    const filteredDeliveries = useMemo(() => {
        return allDeliveries.filter(delivery => {
            const dateMatch = delivery.date >= dateRange.start && delivery.date <= dateRange.end;
            const orgMatch =
                selectedPartner === 'All Organizations' ||
                delivery.organizationName === selectedPartner;
            return dateMatch && orgMatch;
        });
    }, [dateRange, selectedPartner]);

    // Calculate total pounds delivered
    const totalPoundsDelivered = useMemo(() => {
        return filteredDeliveries.reduce((sum, delivery) => sum + delivery.totalPounds, 0);
    }, [filteredDeliveries]);

    // Calculate deliveries completed count
    const deliveriesCompleted = filteredDeliveries.length;

    // Aggregate food types data for donut chart
    const foodTypesData = useMemo(() => {
        const aggregated: { [key: string]: number } = {};

        filteredDeliveries.forEach(delivery => {
            Object.entries(delivery.foodTypes).forEach(([type, pounds]) => {
                aggregated[type] = (aggregated[type] || 0) + pounds;
            });
        });

        const colors = ['#B7D7BD', '#6CAEE6', '#F9DC70', '#E7A54E', '#F4A6B8'];
        return Object.entries(aggregated).map(([label, value], index) => ({
            label,
            value,
            color: colors[index % colors.length],
        }));
    }, [filteredDeliveries]);

    // Aggregate pounds by month for chart
    const poundsByMonthData = useMemo(() => {
        const monthlyData: { [key: string]: number } = {};
        const monthNames = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
        ];

        filteredDeliveries.forEach(delivery => {
            const monthKey = `${monthNames[delivery.date.getMonth()]} ${delivery.date.getFullYear()}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + delivery.totalPounds;
        });

        return Object.entries(monthlyData)
            .map(([month, pounds]) => ({ month, pounds }))
            .sort((a, b) => {
                // Sort by date
                const [monthA, yearA] = a.month.split(' ');
                const [monthB, yearB] = b.month.split(' ');
                const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA));
                const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB));
                return dateA.getTime() - dateB.getTime();
            });
    }, [filteredDeliveries]);

    // Prepare delivery summary data (simplified format)
    const deliverySummaryData = useMemo(() => {
        return filteredDeliveries.map(delivery => ({
            id: delivery.id,
            date: delivery.date,
            totalPounds: delivery.totalPounds,
        }));
    }, [filteredDeliveries]);

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

            <div className="flex items-center justify-center gap-2">
                <div className="w-full max-w-md">
                    <SearchBarOverview
                        organizations={partnerData}
                        onSelectPartner={handlePartnerSelection}
                    />
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setSelectedPartner('All Organizations')}
                        disabled={selectedPartner === 'All Organizations'}
                        className={`px-6 py-3 font-medium rounded-lg shadow-sm transition-colors duration-200 whitespace-nowrap ${
                            selectedPartner === 'All Organizations'
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
                        }`}
                    >
                        Clear Filter
                    </button>
                )}
            </div>

            {/* Monthly Chart */}
            <div className="w-full bg-white rounded-xl shadow p-6">
                <PoundsByMonthChart data={poundsByMonthData} />
            </div>

            {/* Pie + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-white rounded-xl shadow p-6 h-full">
                    <FoodTypesDonutChart data={foodTypesData} />
                </div>

                {/* Stat Cards – match donut height */}
                <div className="flex flex-col gap-6 h-full">
                    <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10">
                        <StatCard
                            label="Total Delivered"
                            value={totalPoundsDelivered.toLocaleString()}
                            unit="lbs"
                        />
                    </div>

                    <div className="bg-white rounded-xl shadow p-6 h-full flex items-center justify-center py-10">
                        <StatCard
                            label="Deliveries Completed"
                            value={deliveriesCompleted.toString()}
                        />
                    </div>
                </div>
            </div>

            {/* Delivery Summary */}
            <div className="w-full bg-white rounded-xl shadow p-6">
                <DeliverySummary deliveries={deliverySummaryData} historyLink="IDK" />
            </div>
        </div>
    );
};

export default OverviewPage;
