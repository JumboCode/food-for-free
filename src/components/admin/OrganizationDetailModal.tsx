'use client';

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, User, Mail, BarChart3 } from 'lucide-react';
import { CautionDialogBody } from '@/components/ui/CautionDialogBody';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

interface Organization {
    id: string;
    name: string;
    slug: string;
    membersCount: number;
    householdId18: string | null;
    createdAt: string;
}

interface User {
    id: string;
    name: string;
    email: string;
    status: 'Active' | 'Invited';
    role?: string;
    invitationId?: string;
}

interface OrganizationMember {
    id: string;
    userId: string;
    organizationId: string;
    role: string;
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        imageUrl?: string;
    };
}

interface OrganizationInvitation {
    id: string;
    emailAddress: string;
    name?: string | null;
    role: string;
    status: 'pending' | 'accepted' | 'revoked';
    createdAt: string;
}

interface OrganizationDetailModalProps {
    organization: Organization;
    onClose: () => void;
    onUpdate: () => void;
}

const THEME_GREEN = '#B7D7BD';
const THEME_ORANGE = '#FAC87D';

export function OrganizationDetailModal({
    organization,
    onClose,
    onUpdate,
}: OrganizationDetailModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editUserName, setEditUserName] = useState('');
    const [showInvitationSent, setShowInvitationSent] = useState(false);
    const [resendEmail, setResendEmail] = useState<string | null>(null);
    const [isEditingOrgName, setIsEditingOrgName] = useState(false);
    const [organizationNameDraft, setOrganizationNameDraft] = useState(organization.name);
    const menuTriggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const fetchOrganizationUsers = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/admin/organizations/${organization.id}/users`);
            if (!response.ok) {
                throw new Error('Failed to fetch organization users');
            }

            const data: {
                members?: OrganizationMember[];
                invitations?: OrganizationInvitation[];
            } = await response.json();

            const activeUsers: User[] = (data.members ?? []).map(member => {
                const firstName = member.user.firstName ?? '';
                const lastName = member.user.lastName ?? '';
                const fullName = `${firstName} ${lastName}`.trim();

                return {
                    id: member.id,
                    // Neon `User.name` is exposed as firstName; never show email in the Name column.
                    name: fullName || '—',
                    email: member.user.email,
                    status: 'Active',
                    role: member.role,
                };
            });

            const invitedUsers: User[] = (data.invitations ?? []).map(invitation => ({
                id: invitation.id,
                name: invitation.name?.trim() || '—',
                email: invitation.emailAddress,
                status: 'Invited',
                role: invitation.role,
                invitationId: invitation.id,
            }));

            setUsers([...activeUsers, ...invitedUsers]);
        } catch (error) {
            console.error('Error fetching organization users:', error);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, [organization.id]);

    useEffect(() => {
        void fetchOrganizationUsers();
    }, [fetchOrganizationUsers]);

    useEffect(() => {
        setOrganizationNameDraft(organization.name);
    }, [organization.name]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newUserEmail.trim()) {
            setError('Email is required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUserEmail)) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newUserEmail.trim(),
                    name: newUserName.trim(),
                    organizationId: organization.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to invite user');
            }

            await fetchOrganizationUsers();
            await onUpdate();
            setIsAddUserModalOpen(false);
            setNewUserName('');
            setNewUserEmail('');
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to invite user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendInvitation = async (invId: string, email: string) => {
        setResendEmail(email);
        setShowInvitationSent(true);
        setTimeout(() => {
            setShowInvitationSent(false);
            setResendEmail(null);
        }, 3000);

        try {
            const response = await fetch(
                `/api/admin/invitations/${invId}/resend?organizationId=${encodeURIComponent(organization.id)}`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error('Failed to resend invitation');
            await fetchOrganizationUsers();
        } catch (error) {
            console.error('Error resending invitation:', error);
        }
    };

    const startEditUser = (user: User) => {
        if (user.status !== 'Active') {
            setError(
                'You can edit a user name after they accept the invitation and become active.'
            );
            return;
        }
        setEditUser(user);
        setEditUserName(user.name);
        setError(null);
    };

    const confirmEditUser = async () => {
        if (!editUser) return;
        const nextName = editUserName.trim();
        if (!nextName) {
            setError('Name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch(
                `/api/admin/organizations/${organization.id}/members/${editUser.id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nextName }),
                }
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error((data as { error?: string }).error ?? 'Failed to update user');
            }

            setEditUser(null);
            await fetchOrganizationUsers();
            await onUpdate();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const saveOrganizationName = async () => {
        const nextName = organizationNameDraft.trim();
        if (!nextName) {
            setError('Organization name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch(`/api/admin/organizations/${organization.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nextName }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    (data as { error?: string }).error ?? 'Failed to update organization name'
                );
            }

            await onUpdate();
            setIsEditingOrgName(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update organization name');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = (user: User) => {
        setDeleteConfirmUser(user);
    };

    const isDistributorOrg = isDistributorPartnerOrgName(organization.name);
    const partnerOverviewHref = organization.householdId18
        ? `/overview?householdId18=${encodeURIComponent(organization.householdId18)}`
        : '/overview';

    const confirmDelete = async () => {
        if (!deleteConfirmUser) return;

        const userToDelete = deleteConfirmUser;
        setDeleteConfirmUser(null);

        try {
            let res: Response;
            if (userToDelete.status === 'Invited' && userToDelete.invitationId) {
                res = await fetch(
                    `/api/admin/invitations/${userToDelete.invitationId}?organizationId=${encodeURIComponent(organization.id)}`,
                    { method: 'DELETE' }
                );
            } else {
                res = await fetch(
                    `/api/admin/organizations/${organization.id}/members/${userToDelete.id}`,
                    { method: 'DELETE' }
                );
            }

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error((data as { error?: string }).error ?? 'Failed to remove user');
            }

            await fetchOrganizationUsers();
            await onUpdate();
        } catch (error) {
            console.error('Error deleting user:', error);
            setError(error instanceof Error ? error.message : 'Failed to remove user');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/30 p-3 backdrop-blur-sm sm:p-4">
            <div className="my-auto flex max-h-[min(90vh,calc(100vh-1.5rem))] w-full min-h-0 min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#B7D7BD] bg-white shadow-xl sm:max-h-[90vh]">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-100 px-4 pb-4 pt-5 sm:px-6 lg:px-8 lg:pt-6">
                    <div className="min-w-0 pr-2">
                        {isEditingOrgName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={organizationNameDraft}
                                    onChange={e => setOrganizationNameDraft(e.target.value)}
                                    className="h-9 w-full max-w-[320px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                                    disabled={isSubmitting}
                                />
                                <button
                                    type="button"
                                    onClick={saveOrganizationName}
                                    className="h-9 rounded-lg border border-[#9fc5a9] bg-[#B7D7BD] px-3 text-xs font-medium text-gray-800 hover:bg-[#a7c7ad]"
                                    disabled={isSubmitting}
                                >
                                    Save
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrganizationNameDraft(organization.name);
                                        setIsEditingOrgName(false);
                                    }}
                                    className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
                                    {organization.name}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrganizationNameDraft(organization.name);
                                        setIsEditingOrgName(true);
                                    }}
                                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                    Edit Name
                                </button>
                            </div>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                            {isDistributorOrg ? 'Admin organization' : 'Partner organization'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {!isDistributorOrg ? (
                    <div className="border-b border-gray-100 bg-[#FAFDFB] px-4 py-3 sm:px-6 lg:px-8">
                        <Link
                            href={partnerOverviewHref}
                            onClick={() => onClose()}
                            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#9fc5a9] bg-white text-sm font-medium text-[#608D6A] hover:bg-[#F7FAF7] transition-colors"
                        >
                            <BarChart3 className="h-4 w-4" />
                            View statistics overview
                        </Link>
                        <p className="mt-2 text-xs text-gray-500">
                            Opens the overview dashboard filtered to this partner&apos;s delivery
                            data.
                        </p>
                    </div>
                ) : null}

                {/* Users header + Add User Button */}
                <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-4 sm:items-center sm:px-6 lg:px-8 lg:pt-5">
                    <div className="min-w-0 flex-1 pr-2">
                        <h3 className="text-sm font-semibold text-gray-800">
                            {isDistributorOrg ? 'Admins' : 'Users'}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                            {isDistributorOrg
                                ? 'Invite and manage admins within Food For Free.'
                                : 'Invite and manage people with access to this partner.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#608D6A] px-3 text-xs font-medium text-white transition-colors hover:bg-[#4d7155]"
                    >
                        {isDistributorOrg ? 'Add admin' : 'Add user'}
                    </button>
                </div>

                {/* Error banner */}
                {error && !isAddUserModalOpen && (
                    <div className="px-4 pt-3 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-xs text-red-600">{error}</p>
                            <button
                                type="button"
                                aria-label="Dismiss error"
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-600"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Full-bleed header row (gray); first/last column padding matches header / Users sections */}
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto">
                    {isLoading ? (
                        <div className="px-4 py-10 text-center text-gray-500 sm:px-6 lg:px-8">
                            Loading users...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="px-4 py-10 text-center text-gray-500 sm:px-6 lg:px-8">
                            No users yet. Invite someone to get started.
                        </div>
                    ) : (
                        <table className="w-full min-w-[580px] table-fixed divide-y divide-gray-200">
                            <thead className="sticky top-0 z-[1] bg-gray-100">
                                <tr>
                                    <th className="w-[20%] py-3 pl-4 pr-2 text-left text-xs font-medium text-gray-700 sm:pl-6 sm:pr-3 sm:text-sm lg:pl-8">
                                        Name
                                    </th>
                                    <th className="w-[33%] px-2 py-3 text-left text-xs font-medium text-gray-700 sm:px-3 sm:text-sm">
                                        Email
                                    </th>
                                    <th className="w-[14%] px-2 py-3 text-left text-xs font-medium text-gray-700 sm:px-3 sm:text-sm">
                                        Role
                                    </th>
                                    <th className="w-[14%] px-2 py-3 text-left text-xs font-medium text-gray-700 sm:px-3 sm:text-sm">
                                        Status
                                    </th>
                                    <th className="w-[19%] py-3 pl-2 pr-4 text-left text-xs font-medium text-gray-700 sm:pl-3 sm:pr-6 sm:text-sm lg:pr-8">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {users.map(user => (
                                    <tr
                                        key={user.id}
                                        className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                                            activeMenuUserId === user.id ? 'bg-[#FFF7E6]' : ''
                                        }`}
                                    >
                                        <td className="py-4 pl-4 pr-2 text-sm text-gray-900 sm:pl-6 sm:pr-3 lg:pl-8">
                                            <span className="line-clamp-2 break-words">
                                                {user.name}
                                            </span>
                                        </td>
                                        <td className="px-2 py-4 text-sm text-gray-600 sm:px-3">
                                            <span className="block truncate" title={user.email}>
                                                {user.email}
                                            </span>
                                        </td>
                                        <td className="px-2 py-4 text-sm sm:px-3">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        <td className="px-2 py-4 text-sm sm:px-3">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    user.status === 'Active'
                                                        ? 'bg-[rgba(183,215,189,0.35)] text-[#608D6A]'
                                                        : 'bg-[rgba(250,200,125,0.35)] text-[#744210]'
                                                }`}
                                            >
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="py-4 pl-2 pr-4 text-sm sm:pl-3 sm:pr-6 lg:pr-8">
                                            <div
                                                ref={
                                                    activeMenuUserId === user.id
                                                        ? menuTriggerRef
                                                        : undefined
                                                }
                                                className="relative inline-block text-left"
                                            >
                                                <button
                                                    onClick={() =>
                                                        setActiveMenuUserId(
                                                            activeMenuUserId === user.id
                                                                ? null
                                                                : user.id
                                                        )
                                                    }
                                                    className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                                                >
                                                    ⋯
                                                </button>
                                                {activeMenuUserId === user.id && (
                                                    <UserActionsMenu
                                                        triggerRef={menuTriggerRef}
                                                        onEdit={() => {
                                                            startEditUser(user);
                                                            setActiveMenuUserId(null);
                                                        }}
                                                        onResendInvitation={
                                                            user.status === 'Invited' &&
                                                            user.invitationId
                                                                ? () => {
                                                                      void handleResendInvitation(
                                                                          user.invitationId!,
                                                                          user.email
                                                                      );
                                                                      setActiveMenuUserId(null);
                                                                  }
                                                                : undefined
                                                        }
                                                        onDelete={() => {
                                                            handleDeleteUser(user);
                                                            setActiveMenuUserId(null);
                                                        }}
                                                        onClose={() => setActiveMenuUserId(null)}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#B7D7BD]">
                        <CautionDialogBody
                            title="Delete User"
                            actions={
                                <>
                                    <button
                                        onClick={() => setDeleteConfirmUser(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90"
                                        style={{ backgroundColor: THEME_ORANGE }}
                                    >
                                        Confirm
                                    </button>
                                </>
                            }
                        >
                            Are you sure you want to remove {deleteConfirmUser.name} from{' '}
                            {organization.name}?
                        </CautionDialogBody>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-60 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#B7D7BD]">
                        <div className="flex justify-between items-start px-6 pt-5 pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">
                                    Add user to {organization.name}
                                </h3>
                                <p className="mt-1 text-xs text-gray-500">
                                    We&apos;ll email them an invitation to set up access.
                                </p>
                            </div>
                            <User className="h-5 w-5 text-gray-400" />
                        </div>

                        <form onSubmit={handleAddUser} className="px-6 pb-6 pt-4">
                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        id="name"
                                        value={newUserName}
                                        onChange={e => setNewUserName(e.target.value)}
                                        className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                        placeholder="Name (first and last)"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type="email"
                                        id="email"
                                        value={newUserEmail}
                                        onChange={e => setNewUserEmail(e.target.value)}
                                        className="w-full h-9 px-3 pr-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                        placeholder="Email address"
                                        disabled={isSubmitting}
                                    />
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                                {isDistributorPartnerOrgName(organization.name) && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                        <p className="text-xs text-amber-900">
                                            Users invited to Food For Free are granted admin
                                            privileges (including Admin Console access) after
                                            accepting and signing in.
                                        </p>
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
                                    onClick={() => {
                                        setIsAddUserModalOpen(false);
                                        setError(null);
                                        setNewUserName('');
                                        setNewUserEmail('');
                                    }}
                                    className="px-4 h-9 text-sm text-gray-700 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"
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
                                    {isSubmitting ? 'Sending…' : 'Send invite'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Invitation Sent Modal */}
            {showInvitationSent && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-[#B7D7BD]">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-base font-semibold text-gray-900">
                                Invitation sent
                            </h3>
                            <Mail className="h-5 w-5 text-[#608D6A]" />
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                            We sent a message to {resendEmail ?? (newUserEmail || 'the user')} with
                            a link for them to join {organization.name}.
                        </p>
                        <button
                            onClick={() => setShowInvitationSent(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-800 rounded-lg border border-[#9fc5a9] hover:bg-[#9fc5a9]/80 transition-colors"
                            style={{ backgroundColor: THEME_GREEN }}
                        >
                            Great
                        </button>
                    </div>
                </div>
            )}
            {editUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#B7D7BD]">
                        <div className="flex justify-between items-start px-6 pt-5 pb-3 border-b border-gray-100">
                            <div>
                                <h3 className="text-base font-semibold text-gray-900">Edit user</h3>
                                <p className="mt-1 text-xs text-gray-500">{editUser.email}</p>
                            </div>
                            <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="px-6 pb-6 pt-4">
                            <input
                                type="text"
                                value={editUserName}
                                onChange={e => setEditUserName(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] focus:border-[#B7D7BD]"
                                placeholder="Name"
                                disabled={isSubmitting}
                            />
                            <div className="mt-6 flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setEditUser(null)}
                                    className="px-4 h-9 text-sm text-gray-700 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmEditUser}
                                    className="px-4 h-9 text-sm font-medium text-gray-800 rounded-lg border border-[#9fc5a9] hover:bg-[#9fc5a9]/80 disabled:opacity-50 transition-colors"
                                    style={{ backgroundColor: THEME_GREEN }}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function RoleBadge({ role }: { role?: string }) {
    if (!role) return <span className="text-gray-400">—</span>;
    const lower = role.toLowerCase();
    const isAdmin = lower.includes('admin');
    const label = isAdmin ? 'Admin' : 'Partner';
    return (
        <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}
        >
            {label}
        </span>
    );
}

const MENU_WIDTH = 192; // w-48
const MENU_ITEM_HEIGHT = 40;
const MENU_PADDING = 8;

// User Actions Menu Component – renders in a portal below the trigger so it doesn't affect card layout
function UserActionsMenu({
    triggerRef,
    onEdit,
    onResendInvitation,
    onDelete,
    onClose,
}: {
    triggerRef: React.RefObject<HTMLDivElement | null>;
    onEdit?: () => void;
    onResendInvitation?: () => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

    useLayoutEffect(() => {
        const measure = () => {
            const el = triggerRef?.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const itemCount = (onEdit ? 1 : 0) + 1 + (onResendInvitation ? 1 : 0);
            const menuHeight = MENU_ITEM_HEIGHT * itemCount + MENU_PADDING * 2;
            let top = rect.bottom + MENU_PADDING;
            let left = rect.right + MENU_PADDING;
            if (top + menuHeight > window.innerHeight - 10) {
                top = rect.top - menuHeight - MENU_PADDING;
            }
            left = Math.max(10, Math.min(left, window.innerWidth - MENU_WIDTH - 10));
            setPosition({ top, left });
        };
        measure();
        if (!triggerRef?.current) {
            const raf = requestAnimationFrame(() => {
                measure();
            });
            return () => cancelAnimationFrame(raf);
        }
    }, [triggerRef, onEdit, onResendInvitation]);

    useEffect(() => {
        const handleClickOutside = () => onClose();
        const id = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);

    if (position === null || typeof document === 'undefined') return null;

    const menu = (
        <div
            className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
            style={{ zIndex: 9999, top: position.top, left: position.left }}
            onClick={e => e.stopPropagation()}
            onMouseLeave={onClose}
        >
            {onEdit && (
                <button
                    onClick={onEdit}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                    Edit
                </button>
            )}
            <button
                onClick={onDelete}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
                Delete
            </button>
            {onResendInvitation && (
                <button
                    onClick={onResendInvitation}
                    className="w-full px-4 py-1 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                    Resend Invitation
                </button>
            )}
        </div>
    );

    return createPortal(menu, document.body);
}
