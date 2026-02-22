'use client';

import { useState, useEffect } from 'react';
import { X, MoreVertical, ExternalLink } from 'lucide-react';
import PartnerOrganizationTable from '../PartnerOrganizationTable';

interface Organization {
    id: string;
    name: string;
    slug: string;
    membersCount: number;
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
    role: string;
    status: 'pending' | 'accepted' | 'revoked';
    createdAt: string;
}

interface OrganizationDetailModalProps {
    organization: Organization;
    onClose: () => void;
    onUpdate: () => void;
}

export function OrganizationDetailModal({
    organization,
    onClose,
    onUpdate,
}: OrganizationDetailModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchOrganizationUsers();
    }, [organization.id]);

    const fetchOrganizationUsers = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`/api/admin/organizations/${organization.id}/users`);
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();

            const members: User[] = data.members.map((member: OrganizationMember) => ({
                id: member.userId,
                name:
                    `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() ||
                    'No name',
                email: member.user.email,
                status: 'Active' as const,
                role: member.role,
            }));

            const invitations: User[] = data.invitations.map(
                (invitation: OrganizationInvitation) => ({
                    id: invitation.id,
                    name: invitation.emailAddress.split('@')[0],
                    email: invitation.emailAddress,
                    status: 'Invited' as const,
                    role: invitation.role,
                    invitationId: invitation.id,
                })
            );

            setUsers([...members, ...invitations]);
        } catch (error) {
            console.error('Error fetching organization users:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
            setNewUserEmail('');
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to invite user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendInvitation = async (invitationId: string) => {
        try {
            const response = await fetch(`/api/admin/invitations/${invitationId}/resend`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to resend invitation');

            alert('Invitation resent successfully!');
            await fetchOrganizationUsers();
        } catch (error) {
            console.error('Error resending invitation:', error);
            alert('Failed to resend invitation');
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Are you sure you want to remove ${user.email}?`)) return;

        try {
            if (user.status === 'Invited' && user.invitationId) {
                // Revoke invitation
                const response = await fetch(`/api/admin/invitations/${user.invitationId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) throw new Error('Failed to revoke invitation');
            } else {
                // Remove membership
                const response = await fetch(
                    `/api/admin/organizations/${organization.id}/members/${user.id}`,
                    { method: 'DELETE' }
                );
                if (!response.ok) throw new Error('Failed to remove member');
            }

            await fetchOrganizationUsers();
            await onUpdate();
            alert('User removed successfully!');
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to remove user');
        }
    };

    const handleViewDashboard = () => {
        window.open(`/organizations/${organization.slug}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 bg-[#608D6A] text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">{organization.name}</h2>
                        <p className="text-sm opacity-90 mt-1">{organization.slug}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 bg-[#B7D7BD] border-b border-white flex gap-3">
                    <button
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="px-4 py-2 bg-[#608D6A] text-white rounded-lg hover:bg-[#4F7557] transition-colors"
                    >
                        Add User
                    </button>
                    <button
                        onClick={handleViewDashboard}
                        className="px-4 py-2 border border-[#608D6A] text-[#608D6A] rounded-lg hover:bg-[#FBE6C4] transition-colors flex items-center gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Organization Dashboard
                    </button>
                </div>

                {/* User Table */}
                <div className="p-6">
                    <PartnerOrganizationTable data={users} />
                </div>

                {/* <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No users yet. Invite someone to get started.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#608D6A] text-white sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#B7D7BD] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.status === "Active"
                            ? "bg-[#B7D7BD] text-[#608D6A]"
                            : "bg-[#FBE6C4] text-[#D4A574]"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right relative">
                      <button
                        onClick={() =>
                          setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)
                        }
                        className="text-gray-400 hover:text-[#608D6A] transition-colors"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      {activeMenuUserId === user.id && (
                        <UserActionsMenu
                          user={user}
                          onResendInvitation={
                            user.status === "Invited" && user.invitationId
                              ? () => {
                                  handleResendInvitation(user.invitationId!);
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div> */}
            </div>

            {/* Add User Modal */}
            {isAddUserModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 bg-[#608D6A] text-white rounded-t-lg flex justify-between items-center">
                            <h3 className="text-xl font-bold">Add User</h3>
                            <button
                                onClick={() => {
                                    setIsAddUserModalOpen(false);
                                    setError(null);
                                    setNewUserEmail('');
                                }}
                                className="text-white hover:text-gray-200 transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="p-6">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    Invite a user to{' '}
                                    <span className="font-medium text-[#608D6A]">
                                        {organization.name}
                                    </span>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={newUserEmail}
                                        onChange={e => setNewUserEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#608D6A] focus:border-transparent"
                                        placeholder="user@example.com"
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
                                    onClick={() => {
                                        setIsAddUserModalOpen(false);
                                        setError(null);
                                        setNewUserEmail('');
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#608D6A] text-white rounded-lg hover:bg-[#4F7557] transition-colors disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Sending Invite...' : 'Send Invitation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// User Actions Menu Component
function UserActionsMenu({
    user,
    onResendInvitation,
    onDelete,
    onClose,
}: {
    user: User;
    onResendInvitation?: () => void;
    onDelete: () => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            onClose();
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [onClose]);

    return (
        <div
            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
            onClick={e => e.stopPropagation()}
        >
            {onResendInvitation && (
                <button
                    onClick={onResendInvitation}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                    Resend Invitation
                </button>
            )}

            <button
                onClick={onDelete}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
                {user.status === 'Invited' ? 'Revoke Invitation' : 'Remove User'}
            </button>
        </div>
    );
}
