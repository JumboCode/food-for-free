'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Mail, Search, User, X } from 'lucide-react';
import { ScrollableWithVisibleBar } from '@/components/ui/ScrollableWithVisibleBar';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

const THEME_GREEN = '#B7D7BD';

type PartnerOrgOption = {
    id: string;
    name: string;
    householdId18: string | null;
};

type CompanionBundleStatus = {
    id: string;
    primaryOrganizationName: string;
    remainingCompanionOrganizationNames: string[];
    attemptCount: number;
    lastAttemptAt: string | null;
    lastError: string | null;
    status: 'awaiting_acceptance' | 'needs_attention';
};

export type InviteUserModalProps = {
    open: boolean;
    onClose: () => void;
    /** Refetch lists after a successful invite. */
    onSuccess: () => void | Promise<void>;
    /**
     * When opening from an organization detail modal for a **partner** org (“Add user”): only
     * this org (single invitation). Use the main console Invite user for multiple orgs at once.
     */
    anchorOrganization?: { id: string; name: string } | null;
    /**
     * Full multiselect (admin “Invite user” from main console). Ignored when `anchorOrganization` or
     * `lockedOrganizationId` is set.
     */
    initialSelectedOrgIds?: string[];
    /**
     * Food For Free admin org: single invite, no org picker.
     */
    lockedOrganizationId?: string;
    lockedOrganizationName?: string;
};

export function InviteUserModal({
    open,
    onClose,
    onSuccess,
    anchorOrganization = null,
    initialSelectedOrgIds = [],
    lockedOrganizationId,
    lockedOrganizationName,
}: InviteUserModalProps) {
    const { user: clerkInviter } = useUser();
    const [partnerOrgs, setPartnerOrgs] = useState<PartnerOrgOption[]>([]);
    const [orgSearch, setOrgSearch] = useState('');
    /** Global mode: all selected org ids */
    const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(() => new Set());
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [successEmail, setSuccessEmail] = useState('');
    const [successSentCount, setSuccessSentCount] = useState(0);
    const [successMembershipCount, setSuccessMembershipCount] = useState(0);
    const [successWarnings, setSuccessWarnings] = useState<string | null>(null);
    const [successBundleWarning, setSuccessBundleWarning] = useState<string | null>(null);
    const [successBundleOrgTotal, setSuccessBundleOrgTotal] = useState<number | null>(null);
    const [bundleStatuses, setBundleStatuses] = useState<CompanionBundleStatus[]>([]);
    const [bundleStatusError, setBundleStatusError] = useState<string | null>(null);
    const [bundleStatusLoading, setBundleStatusLoading] = useState(false);
    const [bundleRetryLoading, setBundleRetryLoading] = useState(false);
    const [bundleRetryNotice, setBundleRetryNotice] = useState<string | null>(null);
    const wasOpenRef = useRef(false);

    const isLockedSingleOrg = Boolean(lockedOrganizationId);
    const isAnchoredPartner = Boolean(anchorOrganization?.id) && !isLockedSingleOrg;
    /** Main admin console multi-org picker; name required there only */
    const isMainMultiOrgInvite = !isLockedSingleOrg && !isAnchoredPartner;

    const loadPartners = useCallback(async () => {
        const res = await fetch('/api/admin/organizations');
        if (!res.ok) return;
        const data = (await res.json()) as { organizations?: PartnerOrgOption[] };
        const list = (data.organizations ?? []).filter(
            o => !isDistributorPartnerOrgName(o.name) && Boolean(o.householdId18)
        );
        list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        setPartnerOrgs(list);
    }, []);

    useEffect(() => {
        if (!open) return;
        void loadPartners();
    }, [open, loadPartners]);

    useEffect(() => {
        if (!open) {
            wasOpenRef.current = false;
            return;
        }
        if (wasOpenRef.current) return;
        wasOpenRef.current = true;

        setError(null);
        setStep('form');
        setOrgSearch('');
        setName('');
        setEmail('');
        setSuccessWarnings(null);
        setSuccessBundleWarning(null);
        setSuccessBundleOrgTotal(null);
        setSuccessMembershipCount(0);
        setBundleStatuses([]);
        setBundleStatusError(null);
        setBundleStatusLoading(false);
        setBundleRetryLoading(false);
        setBundleRetryNotice(null);
        if (isLockedSingleOrg && lockedOrganizationId) {
            setSelectedOrgIds(new Set([lockedOrganizationId]));
        } else if (isAnchoredPartner && anchorOrganization) {
            setSelectedOrgIds(new Set());
        } else {
            setSelectedOrgIds(new Set(initialSelectedOrgIds.filter(Boolean)));
        }
    }, [
        open,
        isLockedSingleOrg,
        lockedOrganizationId,
        isAnchoredPartner,
        anchorOrganization,
        initialSelectedOrgIds,
    ]);

    const filteredPartnerOrgs = useMemo(() => {
        const q = orgSearch.trim().toLowerCase();
        if (!q) return partnerOrgs;
        return partnerOrgs.filter(
            o => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
        );
    }, [partnerOrgs, orgSearch]);

    const selectedCountGlobal = selectedOrgIds.size;
    const inviteCount = isLockedSingleOrg || isAnchoredPartner ? 1 : selectedCountGlobal;

    const toggleOrgGlobal = (id: string) => {
        if (isLockedSingleOrg || isAnchoredPartner) return;
        setSelectedOrgIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearSelectionGlobal = () => {
        if (isLockedSingleOrg || isAnchoredPartner) return;
        setSelectedOrgIds(new Set());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        let orgIds: string[];
        if (isLockedSingleOrg) {
            orgIds = [lockedOrganizationId!];
        } else if (isAnchoredPartner && anchorOrganization) {
            orgIds = [anchorOrganization.id];
        } else {
            orgIds = Array.from(selectedOrgIds);
        }

        if (orgIds.length === 0) {
            setError('Select at least one organization.');
            return;
        }

        const trimmedEmail = email.trim();
        if (!trimmedEmail) {
            setError('Email is required.');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (isMainMultiOrgInvite && !name.trim()) {
            setError('Name is required.');
            return;
        }
        const inviteLower = trimmedEmail.toLowerCase();
        if (
            clerkInviter?.emailAddresses?.some(
                e => e.emailAddress.trim().toLowerCase() === inviteLower
            )
        ) {
            setError(
                'This email matches your Clerk account. Enter the address for the person you are inviting.'
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/admin/invitations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: trimmedEmail,
                    name: name.trim(),
                    organizationIds: orgIds,
                }),
            });

            const payload = (await response.json()) as {
                error?: string;
                warning?: string;
                invitations?: { organizationId?: string }[];
                membershipsAdded?: { organizationId?: string }[];
                singleInvitationEmailCoveringOrganizations?: number;
                errors?: { organizationId: string; error: string }[];
            };

            const inviteDone = payload.invitations?.length ?? 0;
            const membershipDone = payload.membershipsAdded?.length ?? 0;
            if (!response.ok && inviteDone === 0 && membershipDone === 0) {
                throw new Error(payload.error || 'Failed to send invitations');
            }

            await onSuccess();

            const partial = payload.errors ?? [];
            setSuccessEmail(trimmedEmail);
            setSuccessSentCount(inviteDone);
            setSuccessMembershipCount(membershipDone);
            setSuccessBundleWarning(
                typeof payload.warning === 'string' && payload.warning.trim()
                    ? payload.warning.trim()
                    : null
            );
            const bundleN =
                typeof payload.singleInvitationEmailCoveringOrganizations === 'number' &&
                payload.singleInvitationEmailCoveringOrganizations >= 2
                    ? payload.singleInvitationEmailCoveringOrganizations
                    : null;
            setSuccessBundleOrgTotal(bundleN);

            if (partial.length > 0) {
                const summary = partial
                    .slice(0, 4)
                    .map(err => err.error)
                    .join(' ');
                setSuccessWarnings(
                    `${partial.length} update${partial.length === 1 ? '' : 's'} could not be completed. ${summary}`.trim()
                );
            } else {
                setSuccessWarnings(null);
            }
            setStep('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invitations');
        } finally {
            setIsSubmitting(false);
        }
    };

    const loadBundleStatuses = useCallback(async (emailToCheck: string) => {
        const normalized = emailToCheck.trim().toLowerCase();
        if (!normalized) return;
        setBundleStatusLoading(true);
        setBundleStatusError(null);
        try {
            const res = await fetch(
                `/api/admin/invitations/bundles?email=${encodeURIComponent(normalized)}`
            );
            const data = (await res.json()) as {
                statuses?: CompanionBundleStatus[];
                error?: string;
            };
            if (!res.ok) throw new Error(data.error || 'Failed to load bundle status');
            setBundleStatuses(Array.isArray(data.statuses) ? data.statuses : []);
        } catch (e) {
            setBundleStatuses([]);
            setBundleStatusError(e instanceof Error ? e.message : 'Failed to load bundle status');
        } finally {
            setBundleStatusLoading(false);
        }
    }, []);

    const handleRetryBundleStatuses = useCallback(async () => {
        const normalized = successEmail.trim().toLowerCase();
        if (!normalized) return;
        setBundleRetryLoading(true);
        setBundleStatusError(null);
        setBundleRetryNotice(null);
        try {
            const res = await fetch('/api/admin/invitations/bundles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalized }),
            });
            const data = (await res.json()) as {
                resolvedCount?: number;
                stillFailingCount?: number;
                waitingForAcceptanceCount?: number;
                warning?: string;
                error?: string;
            };
            if (!res.ok) throw new Error(data.error || 'Retry failed');

            const resolved = data.resolvedCount ?? 0;
            const failing = data.stillFailingCount ?? 0;
            const waiting = data.waitingForAcceptanceCount ?? 0;
            if (data.warning) {
                setBundleRetryNotice(data.warning);
            } else {
                setBundleRetryNotice(
                    `${resolved} bundle${resolved === 1 ? '' : 's'} fixed. ${failing} still need attention. ${waiting} still waiting for acceptance.`
                );
            }
            await loadBundleStatuses(normalized);
        } catch (e) {
            setBundleStatusError(e instanceof Error ? e.message : 'Retry failed');
        } finally {
            setBundleRetryLoading(false);
        }
    }, [loadBundleStatuses, successEmail]);

    useEffect(() => {
        if (step !== 'success') return;
        if (successBundleOrgTotal == null || successBundleOrgTotal <= 1) return;
        if (!successEmail.trim()) return;
        void loadBundleStatuses(successEmail);
    }, [loadBundleStatuses, step, successBundleOrgTotal, successEmail]);

    const handleDone = () => {
        onClose();
    };

    if (!open) return null;

    const formTitle =
        step === 'form'
            ? isLockedSingleOrg
                ? `Invite admin: ${lockedOrganizationName ?? 'Food For Free'}`
                : isAnchoredPartner && anchorOrganization
                  ? `Add user: ${anchorOrganization.name}`
                  : 'Invite user to organizations'
            : isAnchoredPartner
              ? 'Invitation sent'
              : 'Invitations sent';

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
            <div className="flex max-h-[min(92vh,calc(100vh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#B7D7BD] bg-white shadow-xl">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 pt-5 pb-3 sm:px-6">
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold text-gray-900">{formTitle}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            {step === 'form' ? (
                                isLockedSingleOrg ? (
                                    <>
                                        After they accept, they receive organization administrator
                                        access across all existing organizations in Clerk.
                                    </>
                                ) : isAnchoredPartner && anchorOrganization ? (
                                    <>
                                        This form sends one invitation for this organization. The
                                        Invite user action on the Organizations tab supports adding
                                        one recipient to multiple organizations in a single step.
                                    </>
                                ) : (
                                    <>
                                        Select organizations, then enter name and email. Existing
                                        users are added with no emails. New users get one invitation
                                        email that covers every selected partner organization.
                                    </>
                                )
                            ) : (
                                <>You may close this window or continue with another invitation.</>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {step === 'form' ? (
                    <form
                        onSubmit={handleSubmit}
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        {isLockedSingleOrg ? (
                            <div className="border-b border-gray-100 bg-amber-50/60 px-5 py-3 sm:px-6">
                                <p className="text-xs text-amber-950">
                                    <span className="font-semibold uppercase tracking-wide text-amber-900/90">
                                        Organization
                                    </span>
                                    <span className="mt-1 block font-medium text-amber-950">
                                        {lockedOrganizationName ?? 'Food For Free'}
                                    </span>
                                </p>
                            </div>
                        ) : isAnchoredPartner && anchorOrganization ? null : (
                            <div className="flex min-h-0 flex-1 flex-col border-b border-gray-100 bg-[#FAFDFB] px-5 py-3 sm:px-6">
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        Organizations ({selectedCountGlobal} selected)
                                    </p>
                                    <button
                                        type="button"
                                        onClick={clearSelectionGlobal}
                                        className="text-xs font-medium text-gray-600 underline-offset-2 hover:underline disabled:opacity-50"
                                        disabled={isSubmitting || selectedCountGlobal === 0}
                                    >
                                        Clear selection
                                    </button>
                                </div>
                                <div className="relative mb-2">
                                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="search"
                                        value={orgSearch}
                                        onChange={e => setOrgSearch(e.target.value)}
                                        placeholder="Filter organizations by name…"
                                        className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                                        disabled={isSubmitting}
                                        autoComplete="off"
                                    />
                                </div>
                                <ScrollableWithVisibleBar
                                    className="max-h-48 rounded-lg border border-gray-200 bg-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]"
                                    contentKey={`${partnerOrgs.length}-${filteredPartnerOrgs.map(o => o.id).join('|')}`}
                                    viewportClassName="py-1 pl-1 pr-0.5"
                                >
                                    <ul className="space-y-0.5" aria-label="Organization list">
                                        {filteredPartnerOrgs.length === 0 ? (
                                            <li className="py-4 text-center text-xs text-gray-500">
                                                {partnerOrgs.length === 0
                                                    ? 'No organizations loaded.'
                                                    : 'No organizations match your search.'}
                                            </li>
                                        ) : (
                                            filteredPartnerOrgs.map(o => (
                                                <li key={o.id}>
                                                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 hover:border-gray-200 hover:bg-gray-50/90">
                                                        <input
                                                            type="checkbox"
                                                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300 accent-[#608D6A]"
                                                            checked={selectedOrgIds.has(o.id)}
                                                            onChange={() => toggleOrgGlobal(o.id)}
                                                            disabled={isSubmitting}
                                                        />
                                                        <span className="min-w-0 text-sm leading-snug text-gray-800">
                                                            {o.name}
                                                        </span>
                                                    </label>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </ScrollableWithVisibleBar>
                            </div>
                        )}

                        <div className="space-y-3 px-5 py-4 sm:px-6">
                            <div>
                                <label
                                    htmlFor="invite-name"
                                    className="mb-1 block text-xs font-medium text-gray-600"
                                >
                                    {isMainMultiOrgInvite ? (
                                        <>
                                            Name{' '}
                                            <span className="text-red-600" aria-hidden>
                                                *
                                            </span>
                                        </>
                                    ) : (
                                        'Name (optional)'
                                    )}
                                </label>
                                <div className="relative">
                                    <User className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        id="invite-name"
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                                        placeholder="First and last name"
                                        disabled={isSubmitting}
                                        autoComplete="name"
                                        required={isMainMultiOrgInvite}
                                        aria-required={isMainMultiOrgInvite}
                                    />
                                </div>
                            </div>
                            <div>
                                <label
                                    htmlFor="invite-email"
                                    className="mb-1 block text-xs font-medium text-gray-600"
                                >
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        id="invite-email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#B7D7BD] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD]"
                                        placeholder="name@organization.org"
                                        disabled={isSubmitting}
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>
                            {error ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-auto flex shrink-0 justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="h-9 rounded-lg border border-[#9fc5a9] px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-[#9fc5a9]/80 disabled:opacity-50"
                                style={{ backgroundColor: THEME_GREEN }}
                                disabled={
                                    isSubmitting ||
                                    (isMainMultiOrgInvite && !name.trim()) ||
                                    (!isLockedSingleOrg &&
                                        !isAnchoredPartner &&
                                        selectedCountGlobal === 0)
                                }
                            >
                                {isSubmitting
                                    ? 'Sending…'
                                    : inviteCount === 1
                                      ? isAnchoredPartner
                                          ? 'Send invitation'
                                          : 'Send invite'
                                      : 'Send invitation (1 email)'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col px-5 py-6 sm:px-6">
                        <div className="mb-4 flex justify-center">
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-full"
                                style={{ backgroundColor: 'rgba(183, 215, 189, 0.45)' }}
                            >
                                <Mail className="h-6 w-6 text-[#608D6A]" aria-hidden />
                            </div>
                        </div>
                        {successMembershipCount > 0 ? (
                            <p className="text-center text-sm text-gray-700">
                                <span className="font-semibold tabular-nums">
                                    {successMembershipCount}
                                </span>{' '}
                                organization{successMembershipCount === 1 ? '' : 's'} updated for{' '}
                                <span className="font-medium">{successEmail}</span> They already had
                                an account, so no invitation emails were sent. They should see each
                                organization in the sidebar (refresh if needed).
                            </p>
                        ) : successBundleOrgTotal != null &&
                          successSentCount > 0 &&
                          successBundleOrgTotal > 1 ? (
                            <p className="text-center text-sm text-gray-700">
                                <span className="font-semibold tabular-nums">1</span> invitation
                                email sent to <span className="font-medium">{successEmail}</span>,
                                covering{' '}
                                <span className="font-semibold tabular-nums">
                                    {successBundleOrgTotal}
                                </span>{' '}
                                organizations. After they accept, they&apos;ll appear in each one;
                                switching happens from the sidebar.
                            </p>
                        ) : (
                            <p className="text-center text-sm text-gray-700">
                                <span className="font-semibold tabular-nums">
                                    {successSentCount}
                                </span>{' '}
                                invitation{successSentCount === 1 ? '' : 's'} sent to{' '}
                                <span className="font-medium">{successEmail}</span>.
                            </p>
                        )}
                        {successWarnings ? (
                            <p className="mt-3 text-center text-xs text-amber-900">
                                {successWarnings}
                            </p>
                        ) : null}
                        {successBundleWarning ? (
                            <p className="mt-3 text-center text-xs text-amber-900">
                                {successBundleWarning}
                            </p>
                        ) : null}
                        {!successWarnings && !successBundleWarning ? (
                            <>
                                {successSentCount === 1 &&
                                successMembershipCount === 0 &&
                                successBundleOrgTotal == null ? (
                                    <p className="mt-3 text-center text-xs text-gray-500">
                                        The recipient must accept the invitation to complete access.
                                    </p>
                                ) : null}
                                {successMembershipCount > 0 && successSentCount === 0 ? (
                                    <p className="mt-3 text-center text-xs text-gray-500">
                                        Existing users are added to selected organizations without
                                        invitation emails. Users who are not in Clerk yet still
                                        receive invitation emails.
                                    </p>
                                ) : null}
                            </>
                        ) : null}
                        {successBundleOrgTotal != null && successBundleOrgTotal > 1 ? (
                            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                                        Bundled Access Status
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void loadBundleStatuses(successEmail)}
                                            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                                            disabled={bundleStatusLoading || bundleRetryLoading}
                                        >
                                            {bundleStatusLoading ? 'Checking…' : 'Refresh'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleRetryBundleStatuses()}
                                            className="rounded border border-[#9fc5a9] px-2 py-1 text-xs font-medium text-gray-800 hover:bg-[#9fc5a9]/40 disabled:opacity-50"
                                            disabled={bundleRetryLoading || bundleStatusLoading}
                                        >
                                            {bundleRetryLoading ? 'Retrying…' : 'Retry now'}
                                        </button>
                                    </div>
                                </div>
                                {bundleStatusError ? (
                                    <p className="mt-2 text-xs text-red-700">{bundleStatusError}</p>
                                ) : null}
                                {bundleRetryNotice ? (
                                    <p className="mt-2 text-xs text-amber-900">
                                        {bundleRetryNotice}
                                    </p>
                                ) : null}
                                {bundleStatuses.length === 0 && !bundleStatusLoading ? (
                                    <p className="mt-2 text-xs text-gray-600">
                                        All bundled organizations are complete for this recipient.
                                    </p>
                                ) : null}
                                {bundleStatuses.length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                        {bundleStatuses.map(bundle => (
                                            <div
                                                key={bundle.id}
                                                className="rounded border border-gray-200 bg-white px-2 py-2"
                                            >
                                                <p className="text-xs font-medium text-gray-800">
                                                    Primary: {bundle.primaryOrganizationName}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-700">
                                                    Remaining:{' '}
                                                    {bundle.remainingCompanionOrganizationNames.join(
                                                        ', '
                                                    )}
                                                </p>
                                                <p className="mt-1 text-xs text-gray-600">
                                                    {bundle.status === 'awaiting_acceptance'
                                                        ? 'Waiting for the recipient to accept the invitation email.'
                                                        : 'Needs attention: automatic retries have run, but some organizations still failed.'}
                                                </p>
                                                {bundle.lastError ? (
                                                    <p className="mt-1 text-xs text-amber-900">
                                                        Last error: {bundle.lastError}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ))}
                                        <p className="text-xs text-gray-500">
                                            If a bundle stays in &quot;Needs attention&quot;, click
                                            Retry now. If it still fails, contact your technical
                                            admin with the last error shown above.
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={handleDone}
                                className="h-9 rounded-lg border border-[#9fc5a9] px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-[#9fc5a9]/80"
                                style={{ backgroundColor: THEME_GREEN }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
