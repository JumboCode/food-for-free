'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '../../components/ui/SearchBar';
import InvitationManager from '@/components/admin/InvitationManager';

//main Admin Console Page
const AdminConsolePage: React.FC = () => {
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [activeTab, setActiveTab] = useState<'partners' | 'invitations'>('partners');

    //mock partner data to pass to search bar for partner cards
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

    useEffect(() => {
        // Check if user is admin by trying to fetch invitations (admin-only endpoint)
        fetch('/api/admin/invitations')
            .then(res => {
                if (res.status === 403) {
                    setIsAdmin(false);
                    router.push('/');
                } else if (res.ok) {
                    setIsAdmin(true);
                }
            })
            .catch(() => setIsAdmin(false));
    }, [router]);

    if (isAdmin === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-green-700">
                            Admin Console
                        </h1>
                        <div className="w-12 sm:w-16 h-1 bg-green-700"></div>
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 border-b border-gray-200">
                        <nav className="flex space-x-8">
                            <button
                                onClick={() => setActiveTab('partners')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'partners'
                                        ? 'border-green-600 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Partner Records
                            </button>
                            <button
                                onClick={() => setActiveTab('invitations')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === 'invitations'
                                        ? 'border-green-600 text-green-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                Manage Invitations
                            </button>
                        </nav>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'partners' && (
                        <div className="mb-6 sm:mb-8">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4 sm:mb-6">
                                Partner Record
                            </h2>

                            {/* SearchBar component - handles everything */}
                            <SearchBar organizations={partnerData} />
                        </div>
                    )}

                    {activeTab === 'invitations' && <InvitationManager />}
                </div>
            </div>
        </div>
    );
};

export default AdminConsolePage;
