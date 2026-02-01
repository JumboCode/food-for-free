'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { StatCard } from '@/components/ui/StatCard';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
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
    // Default to Past 12 Months for better UX
    const getDefaultDateRange = () => {
        const today = new Date();
        const twelveMonthsAgo = new Date(today);
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);
        return {
            start: twelveMonthsAgo,
            end: today,
        };
    };

    const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(getDefaultDateRange());
    const [activeFilter, setActiveFilter] = useState<string | null>('past12months');
    const [selectedPartner, setSelectedPartner] = useState<string>(organizationName);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    // Check if user is admin via backend API
    // Admin status is determined by database role only
    useEffect(() => {
        fetch('/api/admin/check')
            .then(res => res.json())
            .then(data => setIsAdmin(data.isAdmin || false))
            .catch(() => setIsAdmin(false));
    }, []);

    const handlePartnerSelection = (partnerName: string) => {
        setSelectedPartner(partnerName);
    };

    // Reset active filter when date range is changed manually via calendar
    const handleDateRangeChange = (range: { start: Date; end: Date }) => {
        setDateRange(range);
        setActiveFilter(null); // Clear active filter when manually changed
    };

    // Quick filter handlers for common date ranges (standard UX patterns)
    const setQuickFilter = (
        filter:
            | 'last7days'
            | 'last30days'
            | 'thisMonth'
            | 'lastMonth'
            | 'thisYear'
            | 'past12months'
            | 'allTime'
    ) => {
        setActiveFilter(filter);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filter) {
            case 'last7days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today, so -6 days
                setDateRange({
                    start: sevenDaysAgo,
                    end: today,
                });
                break;
            case 'last30days':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // Include today, so -29 days
                setDateRange({
                    start: thirtyDaysAgo,
                    end: today,
                });
                break;
            case 'thisMonth':
                setDateRange({
                    start: new Date(currentYear, currentMonth, 1),
                    end: new Date(currentYear, currentMonth + 1, 0),
                });
                break;
            case 'lastMonth':
                setDateRange({
                    start: new Date(currentYear, currentMonth - 1, 1),
                    end: new Date(currentYear, currentMonth, 0),
                });
                break;
            case 'thisYear':
                setDateRange({
                    start: new Date(currentYear, 0, 1),
                    end: new Date(currentYear, 11, 31),
                });
                break;
            case 'past12months':
                const twelveMonthsAgo = new Date(today);
                twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11); // Include current month, so -11 months
                twelveMonthsAgo.setDate(1); // Start of that month
                setDateRange({
                    start: twelveMonthsAgo,
                    end: today,
                });
                break;
            case 'allTime':
                // Calculate min and max dates from all available data
                const allDates = allDeliveries.map(d => d.date.getTime());
                const minDate = new Date(Math.min(...allDates));
                const maxDate = new Date(Math.max(...allDates));
                // Set to start of first month and end of last month
                minDate.setDate(1);
                maxDate.setMonth(maxDate.getMonth() + 1);
                maxDate.setDate(0); // Last day of the month
                setDateRange({
                    start: minDate,
                    end: maxDate,
                });
                break;
        }
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

    // Aggregate pounds by appropriate time period for chart (day/month/year based on range)
    const poundsByMonthData = useMemo(() => {
        const daysDiff = Math.ceil(
            (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const yearsDiff =
            dateRange.end.getFullYear() -
            dateRange.start.getFullYear() +
            (dateRange.end.getMonth() - dateRange.start.getMonth()) / 12;

        const aggregatedData: { [key: string]: number } = {};
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
            let key: string;

            // For "All Time" or ranges > 2 years, aggregate by year to keep chart readable
            if (activeFilter === 'allTime' || yearsDiff > 2) {
                key = delivery.date.getFullYear().toString();
            } else if (daysDiff <= 30) {
                // Aggregate by day for short ranges
                key = format(delivery.date, 'MM/dd');
            } else {
                // Aggregate by month for medium ranges
                key = `${monthNames[delivery.date.getMonth()]} ${delivery.date.getFullYear()}`;
            }

            aggregatedData[key] = (aggregatedData[key] || 0) + delivery.totalPounds;
        });

        return Object.entries(aggregatedData)
            .map(([period, pounds]) => ({ month: period, pounds }))
            .sort((a, b) => {
                // Sort by date - handle different formats
                if (daysDiff <= 30) {
                    // MM/dd format
                    const [monthA, dayA] = a.month.split('/').map(Number);
                    const [monthB, dayB] = b.month.split('/').map(Number);
                    const dateA = new Date(dateRange.start.getFullYear(), monthA - 1, dayA);
                    const dateB = new Date(dateRange.start.getFullYear(), monthB - 1, dayB);
                    return dateA.getTime() - dateB.getTime();
                } else if (yearsDiff <= 2) {
                    // "Month Year" format
                    const [monthA, yearA] = a.month.split(' ');
                    const [monthB, yearB] = b.month.split(' ');
                    const dateA = new Date(parseInt(yearA), monthNames.indexOf(monthA));
                    const dateB = new Date(parseInt(yearB), monthNames.indexOf(monthB));
                    return dateA.getTime() - dateB.getTime();
                } else {
                    // Year format
                    return parseInt(a.month) - parseInt(b.month);
                }
            });
    }, [filteredDeliveries, dateRange, activeFilter]);

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
                    <MyCalendar selectedRange={dateRange} onRangeChange={handleDateRangeChange} />
                </div>
            </div>

            {/* Quick Filter Buttons - Standard UX patterns */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700 mr-2">Quick Filters:</span>
                <button
                    onClick={() => setQuickFilter('last7days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'last7days'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Last 7 Days
                </button>
                <button
                    onClick={() => setQuickFilter('last30days')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'last30days'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Last 30 Days
                </button>
                <button
                    onClick={() => setQuickFilter('thisMonth')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'thisMonth'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    This Month
                </button>
                <button
                    onClick={() => setQuickFilter('lastMonth')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'lastMonth'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Last Month
                </button>
                <button
                    onClick={() => setQuickFilter('thisYear')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'thisYear'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    This Year
                </button>
                <button
                    onClick={() => setQuickFilter('past12months')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'past12months'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    Past 12 Months
                </button>
                <button
                    onClick={() => setQuickFilter('allTime')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition-colors ${
                        activeFilter === 'allTime'
                            ? 'bg-[#5DB6E6] text-white border border-[#5DB6E6]'
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    }`}
                >
                    All Time
                </button>
            </div>

            {/* 
                Search Bar for Admin Users:
                - Only visible to admin users (checked via /api/admin/invitations endpoint)
                - Allows admins to search and filter by specific partner organizations
                - When admin clicks on a partner card in the dropdown, it filters the entire page
                  to show statistics for only that partner
                - Non-admin users see no search bar and only see their own organization's data
            */}
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
            <div className="w-full bg-white rounded-xl shadow p-6 -mt-6">
                <PoundsByMonthChart
                    data={poundsByMonthData}
                    dateRange={dateRange}
                    activeFilter={activeFilter}
                />
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
