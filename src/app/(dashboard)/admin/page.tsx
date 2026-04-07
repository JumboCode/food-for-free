'use client';

import React, { useState, useEffect } from 'react';
import { Search, Settings2 } from 'lucide-react';
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

const THEME_GREEN = '#B7D7BD';

//main Admin Console Page
const AdminConsolePage: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isManagePartnerModalOpen, setIsManagePartnerModalOpen] = useState(false);

    useEffect(() => {
        fetchOrganizations();
    }, []);

    const fetchOrganizations = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/admin/organizations');
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.error || 'Failed to fetch organizations');
            }

            const data = await response.json();
            setOrganizations(data.organizations ?? []);
        } catch (error) {
            console.error('Error fetching organizations:', error);
            setOrganizations([]);
        } finally {
            setIsLoading(false);
        }
    };

    //Handle creating new organization
    const handleAddPartner = async (data: { name: string; householdId18: string }) => {
        try {
            const response = await fetch('/api/admin/organizations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Failed to create organization');
            }

            await fetchOrganizations(); // Refresh the list
            setIsManagePartnerModalOpen(false); // Close modal
        } catch (error) {
            console.error('Error creating organization:', error);
            throw error;
        }
    };

    const handleOrganizationClick = (organization: Organization) => {
        setSelectedOrganization(organization);
    };

    const handleDeletePartner = async (organizationId: string) => {
        try {
            const response = await fetch(`/api/admin/organizations/${organizationId}`, {
                method: 'DELETE',
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(data?.error || 'Failed to delete organization');
            }

            if (selectedOrganization?.id === organizationId) {
                setSelectedOrganization(null);
            }

            await fetchOrganizations();
        } catch (error) {
            throw new Error(
                error instanceof Error ? error.message : 'Failed to delete organization'
            );
        }
    };

    const filteredOrganizations = organizations.filter(
        org =>
            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tableData = filteredOrganizations.map(org => ({
        id: org.id,
        name: org.name,
        numOfUsers: org.membersCount,
        onClick: () => handleOrganizationClick(org),
    }));

    return (
        <div className="min-h-screen bg-[#FAF9F7]">
            <div className="max-w-6xl mx-auto px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-gray-900">
                        Admin Console
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage partner organizations and their access.
                    </p>
                </div>

                {/* Partner Organizations Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800 tracking-wide uppercase">
                                Partner organizations
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                View and edit organizations connected to Food For Free.
                            </p>
                        </div>
                        <span
                            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-[#608D6A]"
                            style={{
                                borderColor: THEME_GREEN,
                                backgroundColor: 'rgba(183, 215, 189, 0.25)',
                            }}
                        >
                            {organizations.length} total
                        </span>
                    </div>

                    {/* Search + manage */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or slug…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                            />
                        </div>
                        <button
                            onClick={() => setIsManagePartnerModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-[#608D6A] hover:bg-[#4d7155] text-white text-sm font-medium transition-colors whitespace-nowrap"
                        >
                            <Settings2 className="w-4 h-4" />
                            Manage partners
                        </button>
                    </div>

                    {/* Partner Organizations Table */}
                    <div className="rounded-xl border border-[#B7D7BD] bg-white shadow-sm overflow-hidden mt-2">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                Loading organizations…
                            </div>
                        ) : filteredOrganizations.length > 0 ? (
                            <div className="p-4 sm:p-6">
                                <PartnerOrganizationTable data={tableData} />
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No organizations match your search.
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Manage Partners Modal */}
            {isManagePartnerModalOpen && (
                <AddPartnerModal
                    organizations={organizations.map(org => ({
                        id: org.id,
                        name: org.name,
                        membersCount: org.membersCount,
                    }))}
                    onClose={() => setIsManagePartnerModalOpen(false)}
                    onSubmit={handleAddPartner}
                    onDelete={handleDeletePartner}
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
