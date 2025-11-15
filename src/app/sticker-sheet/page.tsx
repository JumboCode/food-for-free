'use client';

import React from 'react';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import { StatCard } from '@/components/ui/StatCard';
import SearchBar from '../../components/ui/SearchBar';
import { Package, Users, UserCheck } from 'lucide-react';
import Note from '../../components/ui/Notes';
import FileUploadButton from '@/components/FileUploadButton';
import SideNavBar from '@/components/ui/SideNavbar';
import CustomActiveShapePieChart from '@/components/ui/FoodTypesDonutChart';

import { PartnerCardProps } from '../../components/ui/PartnerCard';

const partners: PartnerCardProps[] = [
    {
        id: 1,
        name: 'Whole Foods',
        location: 'Somerville, MA',
        type: 'Grocery Store'
    },
    {
        id: 2,
        name: 'Somerville Food Pantry',
        location: 'Somerville, MA',
        type: 'Food Pantry'
    },
    {
        id: 3,
        name: 'Cambridge Community Center',
        location: 'Cambridge, MA',
        type: 'Community Center'
    }
];

export default function CalendarPage() {
    return (
        <div>
            <h1 className="text-2xl font-bold mb-">Calendar Component</h1>
            <MyCalendar />
            <h1 className="mb-10"></h1>

            <h1 className="text-2xl font-bold mb-">Partner Search</h1>

            <SearchBar organizations={partners} />
            <h1 className="mb-10"></h1>

            <h1 className="text-2xl font-bold">Summary Dashboard</h1>
            <h1 className="mb-10"></h1>
            <StatCard
                title="Summary Dashboard"
                statistics={[
                    {
                        label: 'Total Pounds Distributed',
                        value: '2,847',
                        icon: <Package className="h-5 w-5" />,
                    },
                    {
                        label: 'Total Partners',
                        value: '23',
                        icon: <Users className="h-5 w-5" />,
                    },
                    {
                        label: 'Active Volunteers',
                        value: '156',
                        icon: <UserCheck className="h-5 w-5" />,
                    },
                ]}
            />
            <h1 className="mb-10"></h1>

            {/* Monthly Donations Chart */}
            <h1 className="text-2xl font-bold">Monthly Donations Chart</h1>
            <h1 className="mb-5"></h1>
            <PoundsByMonthChart />
            <h1 className="mb-10"></h1>

            {/* excel upload for testing */}
            <h2 className="text-xl font-semibold mb-2">Upload Excel</h2>
            <FileUploadButton />

            <h1 className="mb-10"></h1>
            <h1 className="text-2xl font-bold mb-4">Note Sheet</h1>
            <Note />

            <h2 className="mb-10">SideNavBar</h2>
            <div>
                <SideNavBar />
            </div>
            <h1 className="text-2xl font-bold mb-">Donut Chart</h1>
            <CustomActiveShapePieChart />
        </div>
    );
}
