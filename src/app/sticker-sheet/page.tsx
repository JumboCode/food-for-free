'use client';

import React from 'react';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import { StatCard } from '@/components/ui/StatCard';
import SearchBar from '../../components/ui/SearchBar';
import { Package, Users, UserCheck } from 'lucide-react';
import Note from '../../components/ui/Notes';
import FileUploadButton from '@/components/FileUploadButton';
import CustomActiveShapePieChart from '@/components/ui/FoodTypesDonutChart';

const partners: string[] = ['Whole Foods', 'Somerville Food Pantry', 'Cambridge Community Center'];

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

            {/* excel upload for testing */}
            <h2 className="text-xl font-semibold mb-2">Upload Excel</h2>
            <FileUploadButton />

            <h1 className="mb-10"></h1>
            <h1 className="text-2xl font-bold mb-4">Note Sheet</h1>
            <Note />
            <h1 className="text-2xl font-bold mb-">Donut Chart</h1>
            <CustomActiveShapePieChart />
        </div>
    );
}
