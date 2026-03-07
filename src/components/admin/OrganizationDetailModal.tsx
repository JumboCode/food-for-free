'use client';

import { useState, useEffect } from 'react';
import { X, MoreVertical, ExternalLink, User, Mail } from 'lucide-react';
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

//dummy data for testing
const DUMMY_USERS: User[] = [
    {
        id: '1',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '2',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '3',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '4',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '5',
        name: 'Peter Parker',
        email: 'pparker@gmail.com',
        status: 'Invited',
        role: 'member',
        invitationId: 'inv-123',
    },
    {
        id: '6',
        name: 'Peter Parker',
        email: 'pparker@gmail.com',
        status: 'Invited',
        role: 'member',
        invitationId: 'inv-456',
    },
    {
        id: '7',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '8',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '9',
        name: 'Peter Parker',
        email: 'pparker@gmail.com',
        status: 'Invited',
        role: 'member',
        invitationId: 'inv-789',
    },
    {
        id: '10',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '11',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
    {
        id: '12',
        name: 'Johnny Appleseed',
        email: 'jappleseed@gmail.com',
        status: 'Active',
        role: 'member',
    },
];

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
    const [showInvitationSent, setShowInvitationSent] = useState(false);

    useEffect(() => {
        fetchOrganizationUsers();
    }, [organization.id]);

    const fetchOrganizationUsers = async () => {
        //frontend only - just use dummy data
        setIsLoading(true);

        //simulate loading delay
        setTimeout(() => {
            setUsers(DUMMY_USERS);
            setIsLoading(false);
        }, 500);
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
        setShowInvitationSent(true);

        //hide it after 3 seconds
        setTimeout(() => setShowInvitationSent(false), 3000);

        //Also call the API
        // try {
        //     const response = await fetch(`/api/admin/invitations/${invitationId}/resend`, {
        //         method: 'POST',
        //     });
        //     if (!response.ok) throw new Error('Failed to resend invitation');
        //     await fetchOrganizationUsers();
        // } catch (error) {
        //     console.error('Error resending invitation:', error);
        // }
    };

    const handleDeleteUser = (user: User) => {
        setDeleteConfirmUser(user);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmUser) return;

        //frontend only, just show alert
        alert(`Deleted: ${deleteConfirmUser.name} (Frontend only)`);
        setDeleteConfirmUser(null);

        //calling the API commented out for now since we are using dummy data and don't want to accidentally delete real users while testing
        // try {
        //     if (deleteConfirmUser.status === 'Invited' && deleteConfirmUser.invitationId) {
        //         await fetch(`/api/admin/invitations/${deleteConfirmUser.invitationId}`, {
        //             method: 'DELETE',
        //         });
        //     } else {
        //         await fetch(`/api/admin/organizations/${organization.id}/members/${deleteConfirmUser.id}`, {
        //             method: 'DELETE'
        //         });
        //     }
        //     await fetchOrganizationUsers();
        //     await onUpdate();
        // } catch (error) {
        //     console.error('Error deleting user:', error);
        // }
    };

    const handleViewDashboard = () => {
        window.open(`/organizations/${organization.slug}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[#B7D7BD]">
                {/* Header */}
                <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {organization.name}
                        </h2>
                        <p className="mt-1 text-xs text-gray-500">Partner organization</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-100"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 border-b border-gray-200">
                    <div className="flex gap-6 text-sm">
                        <button className="px-0 py-3 font-medium text-[#608D6A] border-b-2 border-[#B7D7BD]">
                            Users
                        </button>
                        <button className="px-0 py-3 font-medium text-gray-400 hover:text-gray-600">
                            Statistics
                        </button>
                    </div>
                </div>

                {/* Users header + Add User Button */}
                <div className="px-8 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800">Users</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Invite and manage people with access to this partner.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsAddUserModalOpen(true)}
                        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-[#608D6A] hover:bg-[#4d7155] text-white text-xs font-medium transition-colors"
                    >
                        Add user
                    </button>
                </div>

                {/* User Table */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No users yet. Invite someone to get started.
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {users.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                            activeMenuUserId === user.id ? 'bg-[#FFF7E6]' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {user.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
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
                                        <td className="px-6 py-4 text-sm relative">
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
                                                    user={user}
                                                    onResendInvitation={
                                                        user.status === 'Invited' &&
                                                        user.invitationId
                                                            ? () => {
                                                                  handleResendInvitation(
                                                                      user.invitationId!
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
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

            {/* Delete Confirmation Modal */}
            {deleteConfirmUser && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[70]">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 border border-[#B7D7BD]">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                                     style={{ backgroundColor: 'rgba(250,200,125,0.35)' }}>
                                    <span className="text-2xl">⚠️</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Delete User
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Are you sure you want to remove {deleteConfirmUser.name}{' '}
                                        from {organization.name}?
                                    </p>
                                </div>
                            </div>
                            <div className="mt-6 flex gap-3 justify-end">
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
                            </div>
                        </div>
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
                            <h3 className="text-base font-semibold text-gray-900">Invitation sent</h3>
                            <Mail className="h-5 w-5 text-[#608D6A]" />
                        </div>
                        <p className="text-sm text-gray-600 mb-6">
                            We sent a message to {newUserEmail || 'the user'} with a link for them to
                            join {organization.name}.
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
            className="absolute right-0 top-12 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
            onClick={e => e.stopPropagation()}
            onMouseLeave={onClose}
        >
            <button
                onClick={() => {
                    alert(`Edit user: ${user.name} (Frontend only)`);
                    onClose();
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
                Edit
            </button>

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
}
