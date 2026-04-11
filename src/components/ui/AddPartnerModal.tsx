'use client';

import { useState } from 'react';
import { AlertTriangle, Info, Search, X } from 'lucide-react';

interface AddPartnerModalProps {
    organizations: {
        id: string;
        name: string;
        membersCount: number;
    }[];
    onClose: () => void;
    onSubmit: (data: { name: string; householdId18: string }) => Promise<void>;
    onDelete: (organizationId: string) => Promise<void>;
}

const THEME_GREEN = '#B7D7BD';

export function AddPartnerModal({
    organizations,
    onClose,
    onSubmit,
    onDelete,
}: AddPartnerModalProps) {
    const [activeTab, setActiveTab] = useState<'add' | 'delete'>('add');
    const [name, setName] = useState('');
    const [householdId18, setHouseholdId18] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
    const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedOrganization =
        organizations.find(org => org.id === selectedOrganizationId) ?? null;

    const filteredOrganizations = organizations.filter(org =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubmitAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Organization name is required');
            return;
        }
        if (!householdId18.trim()) {
            setError('Household ID 18 is required');
            return;
        }

        try {
            setIsSubmitting(true);
            await onSubmit({
                name: name.trim(),
                householdId18: householdId18.trim(),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create organization');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedOrganizationId) return;

        try {
            setIsSubmitting(true);
            setError(null);
            await onDelete(selectedOrganizationId);
            setSelectedOrganizationId(null);
            setSearchQuery('');
            setDeleteStep(1);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete organization');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-[#B7D7BD]">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">Manage partners</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Create or delete partner organizations.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-3 text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="px-6 pt-4">
                    <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('add');
                                setError(null);
                            }}
                            className={`h-8 px-4 rounded-md text-sm transition-colors ${
                                activeTab === 'add'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('delete');
                                setError(null);
                            }}
                            className={`h-8 px-4 rounded-md text-sm transition-colors ${
                                activeTab === 'delete'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Delete
                        </button>
                    </div>
                </div>

                {activeTab === 'add' ? (
                    <form onSubmit={handleSubmitAdd} className="px-6 pb-6 pt-4">
                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide"
                                >
                                    Organization name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                    placeholder="Food For Free Partner"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="householdId18"
                                    className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide"
                                >
                                    Salesforce ID <span className="text-red-500">*</span>
                                    <span className="relative inline-flex group">
                                        <button
                                            type="button"
                                            tabIndex={0}
                                            className="inline-flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                                            aria-label="Household ID 18 help"
                                        >
                                            <Info className="h-3.5 w-3.5 normal-case" />
                                        </button>
                                        <span className="pointer-events-none absolute z-20 left-1/2 top-[calc(100%+8px)] hidden w-64 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-2 text-[11px] font-normal normal-case tracking-normal text-gray-600 shadow-md group-hover:block group-focus-within:block">
                                            Please paste the Household ID 18 associated with this
                                            partner organization. This information can be found in
                                            YourMarket.
                                        </span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    id="householdId18"
                                    value={householdId18}
                                    onChange={e => setHouseholdId18(e.target.value)}
                                    className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                    placeholder="001XXXXXXXXXXXXXXX"
                                    disabled={isSubmitting}
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 h-9 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 h-9 text-sm font-medium text-gray-800 rounded-lg border border-[#9fc5a9] hover:bg-[#9fc5a9]/80 disabled:opacity-50 transition-colors"
                                style={{ backgroundColor: THEME_GREEN }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Creating…' : 'Create organization'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="px-6 pb-6 pt-4">
                        <div className="space-y-3">
                            <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide">
                                Select partner to delete
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search partner name..."
                                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="max-h-48 overflow-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
                                {filteredOrganizations.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500">
                                        No organizations found.
                                    </div>
                                ) : (
                                    filteredOrganizations.map(org => (
                                        <button
                                            key={org.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedOrganizationId(org.id);
                                                setDeleteStep(1);
                                                setError(null);
                                            }}
                                            className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                                selectedOrganizationId === org.id
                                                    ? 'bg-[#F7FAF7]'
                                                    : 'bg-white'
                                            }`}
                                        >
                                            <div className="text-sm text-gray-900">{org.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {org.membersCount} user(s)
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {selectedOrganization && (
                                <div className="rounded-lg border border-[#F8D4A0] bg-[#FFF9EF] p-3">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 text-[#744210]" />
                                        <div className="text-xs text-[#744210]">
                                            {deleteStep === 1 ? (
                                                <p>
                                                    You are about to delete{' '}
                                                    <span className="font-semibold">
                                                        {selectedOrganization.name}
                                                    </span>
                                                    . This action cannot be undone.
                                                </p>
                                            ) : (
                                                <p>
                                                    Final confirmation: this will permanently delete
                                                    this partner and its associated user account(s)
                                                    in Clerk and Neon.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 h-9 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            {deleteStep === 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setDeleteStep(2)}
                                    className="px-4 h-9 text-sm font-medium rounded-lg border border-[#F8D4A0] bg-[#FFF8EC] text-[#744210] hover:bg-[#FFF2DA] transition-colors disabled:opacity-50"
                                    disabled={!selectedOrganizationId || isSubmitting}
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-4 h-9 text-sm font-medium rounded-lg border border-[#F3CBCB] bg-[#FFF5F5] text-[#B34747] hover:bg-[#FFECEC] transition-colors disabled:opacity-50"
                                    disabled={!selectedOrganizationId || isSubmitting}
                                >
                                    {isSubmitting ? 'Deleting…' : 'Delete partner and users'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
