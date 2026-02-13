'use client';

import React, { useState, useEffect } from 'react';
import { AddPartnerModal } from '@/components/ui/AddPartnerModal';
import PartnerOrganizationTable from '@/components/PartnerOrganizationTable';
import { OrganizationDetailModal } from '@/components/admin/OrganizationDetailModal';

interface Organization {
    id: string;
    name: string;
    slug: string;
    membersCount: number;
    createdAt: string;
}

//main Admin Console Page
const AdminConsolePage: React.FC = () => {
    const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/admin/organizations');
            if (!response.ok) throw new Error('Failed to fetch organizations');
            const data = await response.json();
            console.log('Organizations loaded:', data.organizations);
            setOrganizations(data.organizations);
        } catch (error) {
            console.error('Error fetching organizations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    //Handle creating new organization
    const handleAddPartner = async (data: { name: string; slug?: string }) => {
        try {
            const response = await fetch('/api/admin/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to create organization');

            await fetchOrganizations(); // Refresh the list
            setIsAddPartnerModalOpen(false); // Close modal
        } catch (error) {
            console.error('Error creating organization:', error);
            throw error;
        }
    };

    // Handle clicking an organization
    // Handle clicking an organization
    const handleOrganizationClick = (organization: Organization) => {
        console.log('Opening modal for:', organization);
        setSelectedOrganization(organization);
    };

    // Filter organizations based on search
    const filteredOrganizations = organizations.filter(
        org =>
            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Transform for table
    const tableData = filteredOrganizations.map(org => ({
        id: org.id,
        name: org.name,
        numOfUsers: org.membersCount,
        onClick: () => handleOrganizationClick(org),
    }));

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

                    {/* Partner Organizations Section */}
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 mb-4">
                            Partner Record
                        </h2>

                        {/* Search Bar and Add Button */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            {/* Search Input */}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608D6A] focus:border-transparent"
                                />
                            </div>

                            {/* ADD PARTNER BUTTON */}
                            <button
                                onClick={() => setIsAddPartnerModalOpen(true)}
                                className="px-6 py-2 bg-[#5CB8E4] text-white rounded-lg hover:bg-[#4A9FCC] transition-colors whitespace-nowrap flex items-center gap-2"
                            >
                                Add Partner Organization
                                <span className="text-xl">+</span>
                            </button>
                        </div>

                        {/* Partner Organizations Table - REAL DATA */}
                        {isLoading ? (
                            <div className="rounded-lg shadow p-8 text-center text-gray-500">
                                Loading organizations...
                            </div>
                        ) : (
                            <div className="p-6">
                                <PartnerOrganizationTable data={tableData} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Partner Modal */}
            {isAddPartnerModalOpen && (
                <AddPartnerModal
                    onClose={() => setIsAddPartnerModalOpen(false)}
                    onSubmit={handleAddPartner}
                />
            )}

            {/* Organization Detail Modal */}
            {selectedOrganization && (
                <OrganizationDetailModal
                    organization={selectedOrganization}
                    onClose={() => setSelectedOrganization(null)}
                    onUpdate={fetchOrganizations}
                />
            )}
        </div>
    );
};

export default AdminConsolePage;
