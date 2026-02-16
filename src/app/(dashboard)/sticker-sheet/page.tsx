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
import DeliverySummaryRow from '@/components/ui/DeliverySummaryRow';
import DeliveryDetailPopup from '@/components/ui/DeliveryDetailPopup';
import { Card, CardContent } from '@/components/ui/card';
import { FoodTypesDonutChart } from '@/components/ui/FoodTypesDonutChart';
import { PartnerCardProps } from '../../components/ui/PartnerCard';
import DeliverySummary from '../../components/ui/DeliverySummary';
import InventoryTransactionUpload from '@/components/InventoryTransactionUpload';
import PackagesByItemUpload from '@/components/PackagesByItemUpload';
import ProductPackageDestinationUpload from '@/components/ProductPackageDestinationUpload';
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
const deliveries = [
    { id: 1, date: new Date('2025-11-01'), totalPounds: 120 },
    { id: 2, date: new Date('2025-11-05'), totalPounds: 95 },
    { id: 3, date: new Date('2025-11-10'), totalPounds: 150 },
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Pounds Distributed"
                        value="2,847"
                        icon={<Package className="h-5 w-5" />}
                    />
                    <StatCard
                        label="Total Partners"
                        value="23"
                        icon={<Users className="h-5 w-5" />}
                    />
                    <StatCard
                        label="Active Volunteers"
                        value="156"
                        icon={<UserCheck className="h-5 w-5" />}
                    />
                </div>
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
                <FoodTypesDonutChart />
            </section>
            <DeliveryDetailPopup
                isOpen={isDeliveryPopupOpen}
                onClose={() => setIsDeliveryPopupOpen(false)}
                {...sampleDeliveryData}
            />
            <h1 className="text-2xl font-bold">Summary Dashboard</h1>
            <h1 className="mb-10"></h1>
            <StatCard label="Total Delivered" value="725" unit="lbs" />
            <StatCard label="Deliveries Completed" value="25" />
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
            <FoodTypesDonutChart />

            <DeliverySummaryRow
                date={new Date()}
                organization="Food For Free"
                name="Fresh Apples"
                totalPounds={100}
                tags={['Pallet']}
                id={1}
            />

            <DeliverySummary deliveries={deliveries} historyLink="distribution" />
            <FoodTypesDonutChart />
            <h2>Inventory Transaction Upload</h2>
            <InventoryTransactionUpload />
            <h2>Packages By Item Upload</h2>
            <PackagesByItemUpload />
            <h2>Product Package Destination Upload</h2>
            <ProductPackageDestinationUpload />
        </div>
    );
}
