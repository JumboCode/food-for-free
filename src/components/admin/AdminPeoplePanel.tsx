'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

type AdminPersonMembership = {
    organizationId: string;
    organizationName: string;
    role: string;
    status: 'Active' | 'Invited';
    invitationId?: string;
};

type AdminPersonGroup = {
    rowKey: string;
    name: string | null;
    email: string;
    memberships: AdminPersonMembership[];
};

function isOrgAdminRole(role: string): boolean {
    return role.toLowerCase().includes('admin');
}

function MembershipStatusPill({ status }: { status: 'Active' | 'Invited' }) {
    const invited = status === 'Invited';
    return (
        <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:text-xs ${
                invited
                    ? 'bg-[rgba(250,200,125,0.35)] text-[#744210]'
                    : 'bg-[rgba(183,215,189,0.35)] text-[#608D6A]'
            }`}
        >
            {status}
        </span>
    );
}

export function AdminPeoplePanel() {
    const [people, setPeople] = useState<AdminPersonGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/people');
            const data = (await res.json()) as { people?: AdminPersonGroup[]; error?: string };
            if (!res.ok) throw new Error(data.error || 'Failed to load');
            setPeople(Array.isArray(data.people) ? data.people : []);
        } catch (e) {
            setPeople([]);
            setError(e instanceof Error ? e.message : 'Failed to load');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return people;
        return people.filter(person => {
            const name = (person.name ?? '').toLowerCase();
            const email = person.email.toLowerCase();
            const orgHit = person.memberships.some(m =>
                m.organizationName.toLowerCase().includes(q)
            );
            return name.includes(q) || email.includes(q) || orgHit;
        });
    }, [people, query]);

    return (
        <div className="min-w-0 space-y-4">
            <div className="min-w-0 space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-800">
                    People
                </h2>
                <p className="text-xs text-gray-500">
                    Partner organization memberships and pending invitations. Food For Free
                    administrator accounts are listed under Manage admins.
                </p>
            </div>

            <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="search"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name, email, or organization…"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                    autoComplete="off"
                />
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#B7D7BD] bg-white shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                        Loading people…
                    </div>
                ) : error ? (
                    <div className="p-6 text-center text-sm text-red-600">{error}</div>
                ) : filtered.length === 0 ? (
                    <div className="p-8 text-center text-sm text-gray-500">
                        {people.length === 0 ? 'No people found.' : 'No rows match your search.'}
                    </div>
                ) : (
                    <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
                        <colgroup>
                            <col className="w-[22%]" />
                            <col className="w-[28%]" />
                            <col />
                            <col className="w-[6.25rem]" />
                        </colgroup>
                        <thead>
                            <tr className="border-b border-gray-200 bg-[#fafaf8] text-[10px] font-semibold uppercase tracking-wide text-gray-500 lg:text-xs">
                                <th className="py-3 pl-4 pr-2 sm:pl-6">Name</th>
                                <th className="px-2 py-3">Email</th>
                                <th className="px-2 py-3">Organizations</th>
                                <th className="py-3 pl-2 pr-4 text-left sm:pr-6">Status</th>
                            </tr>
                        </thead>
                        {filtered.map((person, personIndex) => {
                            const n = person.memberships.length;
                            const sectionClass = personIndex > 0 ? 'border-t border-gray-100' : '';
                            if (n === 0) {
                                return (
                                    <tbody key={person.rowKey} className={sectionClass}>
                                        <tr className="align-top hover:bg-gray-50/80">
                                            <td className="py-3 pl-4 pr-2 text-gray-900 sm:pl-6">
                                                <span className="line-clamp-2 wrap-break-word">
                                                    {person.name?.trim() || '—'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3 text-gray-600">
                                                <span
                                                    className="block truncate"
                                                    title={person.email}
                                                >
                                                    {person.email}
                                                </span>
                                            </td>
                                            <td
                                                colSpan={2}
                                                className="px-2 py-3 pr-4 text-gray-400 sm:pr-6"
                                            >
                                                —
                                            </td>
                                        </tr>
                                    </tbody>
                                );
                            }
                            return (
                                <tbody key={person.rowKey} className={sectionClass}>
                                    {person.memberships.map((m, i) => {
                                        const rowPad =
                                            n === 1
                                                ? 'py-3'
                                                : i === 0
                                                  ? 'pt-3 pb-2'
                                                  : i === n - 1
                                                    ? 'pt-2 pb-3'
                                                    : 'py-2';
                                        return (
                                            <tr
                                                key={`${person.rowKey}-${m.organizationId}-${m.status}-${m.invitationId ?? i}`}
                                                className="align-top hover:bg-gray-50/80"
                                            >
                                                {i === 0 ? (
                                                    <>
                                                        <td
                                                            rowSpan={n}
                                                            className="py-3 pl-4 pr-2 text-gray-900 sm:pl-6"
                                                        >
                                                            <span className="line-clamp-2 wrap-break-word">
                                                                {person.name?.trim() || '—'}
                                                            </span>
                                                        </td>
                                                        <td
                                                            rowSpan={n}
                                                            className="px-2 py-3 text-gray-600"
                                                        >
                                                            <span
                                                                className="block truncate"
                                                                title={person.email}
                                                            >
                                                                {person.email}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : null}
                                                <td
                                                    className={`min-w-0 px-2 text-gray-800 ${rowPad}`}
                                                >
                                                    <span className="wrap-break-word text-xs leading-snug text-gray-900 sm:text-sm">
                                                        <span className="font-medium">
                                                            {m.organizationName}
                                                        </span>
                                                        {isOrgAdminRole(m.role) ? (
                                                            <span className="font-normal text-gray-500">
                                                                {' '}
                                                                · Admin
                                                            </span>
                                                        ) : null}
                                                    </span>
                                                </td>
                                                <td
                                                    className={`pl-2 pr-4 text-left align-top sm:pr-6 ${rowPad}`}
                                                >
                                                    <MembershipStatusPill status={m.status} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            );
                        })}
                    </table>
                )}
            </div>
        </div>
    );
}
