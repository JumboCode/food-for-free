'use client';

import React, { useState } from 'react';
import { MyCalendar } from '@/components/ui/CalendarPicker';
import { PoundsByMonthChart } from '@/components/ui/PoundsByMonthChart';
import { StatCard } from '@/components/ui/StatCard';
import SearchBar from '../../components/ui/SearchBar';
import { Package, Users, UserCheck } from 'lucide-react';
import Note from '../../components/ui/Notes';
import FileUploadButton from '@/components/FileUploadButton';
import SideNavBar from '@/components/ui/SideNavbar';
import CustomActiveShapePieChart from '@/components/ui/FoodTypesDonutChart';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';
import { Card, CardContent } from '@/components/ui/card';

import { PartnerCardProps } from '../../components/ui/PartnerCard';

const partners: PartnerCardProps[] = [
    {
        id: 1,
        name: 'Whole Foods',
        location: 'Somerville, MA',
        type: 'Grocery Store',
    },
    {
        id: 2,
        name: 'Somerville Food Pantry',
        location: 'Somerville, MA',
        type: 'Food Pantry',
    },
    {
        id: 3,
        name: 'Cambridge Community Center',
        location: 'Cambridge, MA',
        type: 'Community Center',
    },
];

// Delivery popup sample data
const sampleDeliveryData = {
    date: '11/16/2025',
    organizationName: 'Food For Free',
    totalPounds: '1,205.00 lbs',
    nutritionalTags: ['High Protein', 'Vegetarian', 'Gluten Free'],
    foodsDelivered: [
        { name: 'Fresh Apples', weight: '120 lbs' },
        { name: 'Whole Grain Bread', weight: '85 lbs' },
        { name: 'Canned Beans (Assorted)', weight: '200 lbs' },
        { name: 'Frozen Chicken Breast', weight: '150 lbs' },
        { name: 'Carrots (Bulk)', weight: '90 lbs' },
        { name: 'Milk (Gallons)', weight: '300 lbs' },
        { name: 'Rice Bags', weight: '110 lbs' },
        { name: 'Potatoes', weight: '150 lbs' },
    ],
};

export default function CalendarPage() {
    const [isDeliveryPopupOpen, setIsDeliveryPopupOpen] = useState(false);

    return (
        <div className="p-8 space-y-10">
            <section>
                <h1 className="text-2xl font-bold mb-4">Calendar Component</h1>
                <MyCalendar />
            </section>
            <section>
                <h1 className="text-2xl font-bold mb-4">Partner Search</h1>
                <SearchBar organizations={partners} />
            </section>
            <section>
                <h1 className="text-2xl font-bold mb-4">Summary Dashboard</h1>
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
            </section>
            <section>
                <h1 className="text-2xl font-bold mb-4">Delivery Detail Popup</h1>
                <p className="text-gray-500 mb-4">
                    Click the card below to test the delivery detail modal.
                </p>
                <Card
                    className="w-full max-w-sm hover:border-[#E7A54E] hover:bg-orange-50 transition-all cursor-pointer group"
                    onClick={() => setIsDeliveryPopupOpen(true)}
                >
                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                        <div className="p-4 bg-gray-100 rounded-full group-hover:bg-white transition-colors">
                            <Package className="w-8 h-8 text-gray-500 group-hover:text-[#E7A54E]" />
                        </div>
                        <span className="font-semibold text-gray-600 group-hover:text-[#E7A54E]">
                            View Delivery Summary
                        </span>
                    </CardContent>
                </Card>
            </section>
            <section>
                <h1 className="text-2xl font-bold mb-4">Monthly Donations Chart</h1>
                <PoundsByMonthChart />
            </section>
            <section>
                <h2 className="text-xl font-bold mb-4">Upload Excel</h2>
                <FileUploadButton />
            </section>
            <section>
                <h1 className="text-2xl font-bold mb-4">Note Sheet</h1>
                <Note />
            </section>
            <section>
                <h2 className="text-xl font-bold mb-4">SideNavBar</h2>
                <div className="relative min-h-[200px] border rounded-lg p-4 bg-gray-50">
                    <SideNavBar />
                    <p className="ml-20 text-gray-400 italic">Navbar shown in context</p>
                </div>
            </section>
            <section>
                <h1 className="text-2xl font-bold mb-4">Donut Chart</h1>
                <CustomActiveShapePieChart />
            </section>
            <DeliveryDetailPopup
                isOpen={isDeliveryPopupOpen}
                onClose={() => setIsDeliveryPopupOpen(false)}
                {...sampleDeliveryData}
            />
        </div>
    );
}
