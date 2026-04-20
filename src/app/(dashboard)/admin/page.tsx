'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Settings2, ShieldCheck } from 'lucide-react';
import { AddPartnerModal } from '@/components/ui/AddPartnerModal';
import PartnerOrganizationTable from '@/components/PartnerOrganizationTable';
import { OrganizationDetailModal } from '@/components/admin/OrganizationDetailModal';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

interface Organization {
    id: string;
    name: string;
    slug: string;
    membersCount: number;
    householdId18: string | null;
    createdAt: string;
}

type OrganizationSortOrder = 'nameAsc' | 'nameDesc' | 'usersAsc' | 'usersDesc';

function compareOrgName(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function sortOrganizations<T extends { name: string; membersCount: number }>(
    orgs: T[],
    order: OrganizationSortOrder
): T[] {
    const copy = [...orgs];
    if (order === 'nameAsc') copy.sort((x, y) => compareOrgName(x.name, y.name));
    else if (order === 'nameDesc') copy.sort((x, y) => compareOrgName(y.name, x.name));
    else if (order === 'usersAsc') copy.sort((x, y) => x.membersCount - y.membersCount);
    else copy.sort((x, y) => y.membersCount - x.membersCount);
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
            const nextOrganizations: Organization[] = data.organizations ?? [];
            setOrganizations(nextOrganizations);
            setSelectedOrganization(prev =>
                prev ? (nextOrganizations.find(org => org.id === prev.id) ?? null) : prev
            );
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

    /** Receiving partners only — excludes the internal Food For Free Clerk org from the table and counts. */
    const partnerOrganizations = useMemo(
        () => organizations.filter(org => !isDistributorPartnerOrgName(org.name)),
        [organizations]
    );

    const internalFoodForFreeOrg = useMemo(
        () => organizations.find(org => isDistributorPartnerOrgName(org.name)) ?? null,
        [organizations]
    );

    const filteredOrganizations = partnerOrganizations.filter(
        org =>
            org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const searchActive = searchQuery.trim().length > 0;
    const partnerCountHint = searchActive
        ? filteredOrganizations.length
        : partnerOrganizations.length;

    const sortedFilteredOrganizations = useMemo(
        () => sortOrganizations(filteredOrganizations, organizationSort),
        [filteredOrganizations, organizationSort]
    );

    const sortedOrganizationsForModal = useMemo(
        () => sortOrganizations(partnerOrganizations, organizationSort),
        [partnerOrganizations, organizationSort]
    );

    const nameSortActive = organizationSort.startsWith('name');
    const usersSortActive = organizationSort.startsWith('users');
    const nameSortDir = organizationSort === 'nameDesc' ? 'desc' : 'asc';
    const usersSortDir = organizationSort === 'usersDesc' ? 'desc' : 'asc';

    const toggleNameSort = () => {
        setOrganizationSort(prev =>
            prev.startsWith('name') ? (prev === 'nameAsc' ? 'nameDesc' : 'nameAsc') : 'nameAsc'
        );
    };

    const toggleUsersSort = () => {
        setOrganizationSort(prev =>
            prev.startsWith('users') ? (prev === 'usersAsc' ? 'usersDesc' : 'usersAsc') : 'usersAsc'
        );
    };

    const tableData = sortedFilteredOrganizations.map(org => ({
        id: org.id,
        name: org.name,
        numOfUsers: org.membersCount,
        onClick: () => handleOrganizationClick(org),
    }));

    return (
        <div className="min-h-screen min-w-0 max-w-full bg-[#FAF9F7]">
            <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-8 py-8 sm:py-10 lg:space-y-5">
                <div className="mb-0 flex flex-col gap-3 max-lg:mb-6 lg:mb-1 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-gray-900">
                            Admin Console
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Manage partner organizations and their access.
                        </p>
                    </div>
                    {internalFoodForFreeOrg ? (
                        <div className="w-full max-w-[17.5rem] shrink-0 self-start sm:max-w-sm lg:w-auto lg:pt-1">
                            <button
                                type="button"
                                onClick={() => handleOrganizationClick(internalFoodForFreeOrg)}
                                className="inline-flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-[#608D6A] bg-white px-4 text-sm font-medium text-[#608D6A] shadow-sm transition-colors hover:bg-[#608D6A]/10 sm:w-auto"
                            >
                                <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
                                Add Admins
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Partner Organizations Section — spaced below page title via parent space-y */}
                <section className="min-w-0 space-y-4">
                    <div className="min-w-0 space-y-1 sm:mt-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
                            Partner organizations
                        </h2>
                        <p className="text-xs text-gray-500">
                            View and edit organizations connected to Food For Free.
                        </p>
                    </div>

                    {/* Search + manage */}
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="relative min-w-0 flex-1 md:min-w-[200px]">
                            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-10 w-full min-w-0 rounded-lg border border-gray-200 bg-white pl-9 pr-[6.75rem] text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] sm:pr-[8.25rem]"
                                autoComplete="off"
                            />
                            <span
                                className="pointer-events-none absolute right-2.5 top-1/2 max-w-[45%] -translate-y-1/2 truncate text-right text-[11px] leading-none text-gray-400 tabular-nums sm:right-3 sm:max-w-[40%] sm:text-xs"
                                title={
                                    searchActive
                                        ? `${filteredOrganizations.length} matching of ${partnerOrganizations.length} partner organizations`
                                        : `${partnerOrganizations.length} partner organizations`
                                }
                            >
                                {partnerCountHint} {partnerCountHint === 1 ? 'partner' : 'partners'}
                            </span>
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
                                    nameSort={nameSortActive ? nameSortDir : 'asc'}
                                    nameSortActive={nameSortActive}
                                    onNameSortToggle={toggleNameSort}
                                    usersSort={usersSortActive ? usersSortDir : 'asc'}
                                    usersSortActive={usersSortActive}
                                    onUsersSortToggle={toggleUsersSort}
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
