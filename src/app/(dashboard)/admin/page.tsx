'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

type OrganizationSortOrder = 'nameAsc' | 'nameDesc';

function compareOrgName(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortOrganizations<T extends { name: string }>(
    orgs: T[],
    order: OrganizationSortOrder
): T[] {
    const copy = [...orgs];
    if (order === 'nameAsc') copy.sort((x, y) => compareOrgName(x.name, y.name));
    else copy.sort((x, y) => compareOrgName(y.name, x.name));
    return copy;
}

//main Admin Console Page
const AdminConsolePage: React.FC = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [organizationSort, setOrganizationSort] = useState<OrganizationSortOrder>('nameAsc');
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

    const sortedFilteredOrganizations = useMemo(
        () => sortOrganizations(filteredOrganizations, organizationSort),
        [filteredOrganizations, organizationSort]
    );

    const sortedOrganizationsForModal = useMemo(
        () => sortOrganizations(organizations, organizationSort),
        [organizations, organizationSort]
    );

    const tableData = sortedFilteredOrganizations.map(org => ({
        id: org.id,
        name: org.name,
        numOfUsers: org.membersCount,
        onClick: () => handleOrganizationClick(org),
    }));

    return (
        <div className="min-h-screen min-w-0 max-w-full bg-[#FAF9F7]">
            <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-[1.5rem] sm:text-[1.75rem] md:text-[2rem] font-semibold tracking-tight text-gray-900">
                        Admin Console
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage partner organizations and their access.
                    </p>
                </div>

                {/* Partner Organizations Section */}
                <section className="min-w-0 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <h2 className="text-sm font-semibold text-gray-800 tracking-wide uppercase">
                                Partner organizations
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                                View and edit organizations connected to Food For Free.
                            </p>
                        </div>
                        <span
                            className="inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium text-[#608D6A]"
                            style={{
                                borderColor: THEME_GREEN,
                                backgroundColor: 'rgba(183, 215, 189, 0.25)',
                            }}
                        >
                            {organizations.length} total
                        </span>
                    </div>

                    {/* Search + manage */}
                    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:gap-4">
                        <div className="relative min-w-0 flex-1 md:min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or slug…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsManagePartnerModalOpen(true)}
                            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#608D6A] px-4 text-sm font-medium text-white transition-colors hover:bg-[#4d7155] md:w-auto"
                        >
                            <Settings2 className="h-4 w-4 shrink-0" />
                            Manage partners
                        </button>
                    </div>

                    {/* Partner Organizations Table */}
                    <div className="mt-2 overflow-x-auto rounded-xl border border-[#B7D7BD] bg-white shadow-sm">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                Loading organizations…
                            </div>
                        ) : sortedFilteredOrganizations.length > 0 ? (
                            <div className="p-4 sm:p-6">
                                <PartnerOrganizationTable
                                    data={tableData}
                                    nameSort={organizationSort === 'nameAsc' ? 'asc' : 'desc'}
                                    onNameSortChange={dir =>
                                        setOrganizationSort(dir === 'asc' ? 'nameAsc' : 'nameDesc')
                                    }
                                />
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
                    organizations={sortedOrganizationsForModal.map(org => ({
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
