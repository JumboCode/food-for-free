'use client';

import { useState, useEffect } from 'react';
import { Plus, Mail } from 'lucide-react';

interface Invitation {
    id: string;
    email: string;
    status: string;
    createdAt: number;
    organizationId?: string;
    organizationName?: string;
}

export default function InvitationManager() {
    const [email, setEmail] = useState('');
    const [partnerId, setPartnerId] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch invitations on mount
    useEffect(() => {
        fetchInvitations();
    }, []);

    const fetchInvitations = async () => {
        try {
            const res = await fetch('/api/admin/invitations');
            const data = await res.json();
            if (res.ok) {
                setInvitations(data.invitations || []);
            }
        } catch (err) {
            console.error('Error fetching invitations:', err);
        }
    };

    const handleSendInvitation = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const body: { email: string; partnerId?: string; organizationName?: string } = {
                email,
            };

            if (organizationName.trim()) {
                body.organizationName = organizationName.trim();
            } else {
                setError('Please provide an Organization Name');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setEmail('');
                setPartnerId('');
                setOrganizationName('');
                fetchInvitations();
                alert('Invitation sent successfully!');
            } else {
                setError(data.error || 'Failed to send invitation');
            }
        } catch (err) {
            setError('Failed to send invitation');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Send Invitation Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Send Invitation
                </h2>

                <form onSubmit={handleSendInvitation} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="user@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Organization Name
                        </label>
                        <input
                            type="text"
                            value={organizationName}
                            onChange={e => setOrganizationName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            placeholder="Organization Name"
                        />
                        <p className="text-xs text-gray-500 mt-1"></p>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        {loading ? 'Sending...' : 'Send Invitation'}
                    </button>
                </form>
            </div>

            {/* Pending Invitations */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Pending Invitations
                </h2>
                {invitations.length === 0 ? (
                    <p className="text-gray-500 text-sm">No pending invitations</p>
                ) : (
                    <div className="space-y-2">
                        {invitations.map(inv => (
                            <div
                                key={inv.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                            >
                                <div>
                                    <p className="font-medium text-gray-800">{inv.email}</p>
                                    {inv.organizationName && (
                                        <p className="text-sm text-gray-500">
                                            {inv.organizationName}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xs text-gray-500 bg-yellow-100 px-2 py-1 rounded">
                                    {inv.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
