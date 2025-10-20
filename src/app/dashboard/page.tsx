'use client';
import { StatCard } from '@/components/StatCard';
import { Package, Users, UserCheck } from 'lucide-react';

export default function DashboardPage() {
    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-6">
            <h1 className="text-3xl font-bold">Food for Free Dashboard</h1>
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
        </main>
    );
}
