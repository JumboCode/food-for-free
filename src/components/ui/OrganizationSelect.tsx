'use client';

import { useAuth, useClerk, useOrganizationList } from '@clerk/nextjs';
import { Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CautionDialogBody } from '@/components/ui/CautionDialogBody';

type OrganizationSelectProps = {
    className?: string;
    redirectTo?: string;
};

export default function OrganizationSelect({
    className = '',
    redirectTo = '/overview',
}: OrganizationSelectProps) {
    const router = useRouter();
    const clerk = useClerk();
    const { orgId } = useAuth();
    const { isLoaded, setActive, userMemberships } = useOrganizationList({
        userMemberships: { infinite: true },
    });
    const [open, setOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const [leaveTarget, setLeaveTarget] = useState<{ organizationId: string; name: string } | null>(
        null
    );
    const [leaveError, setLeaveError] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const memberships = useMemo(() => userMemberships.data ?? [], [userMemberships.data]);
    const canSwitchOrganizations = memberships.length > 1;
    const canLeaveAnyOrganization = memberships.length > 1;
    const currentOrgName = useMemo(
        () =>
            memberships.find(membership => membership.organization.id === orgId)?.organization.name,
        [memberships, orgId]
    );

    useEffect(() => {
        const onDocumentClick = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (!rootRef.current || !target) return;
            if (!rootRef.current.contains(target)) {
                setOpen(false);
            }
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDocumentClick);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onDocumentClick);
            document.removeEventListener('keydown', onEscape);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const estimatedMenuHeight = 260;
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpward(spaceBelow < estimatedMenuHeight);
    }, [open, memberships.length]);

    useEffect(() => {
        if (!isLoaded) return;
        let cancelled = false;
        const fetchNext = userMemberships.fetchNext;

        if (!fetchNext || !userMemberships.hasNextPage || userMemberships.isFetching) return;

        const loadAllMemberships = async () => {
            while (!cancelled && userMemberships.hasNextPage) {
                await fetchNext();
            }
        };

        void loadAllMemberships();
        return () => {
            cancelled = true;
        };
    }, [
        isLoaded,
        userMemberships.fetchNext,
        userMemberships.hasNextPage,
        userMemberships.isFetching,
    ]);

    if (!isLoaded) {
        return (
            <div
                className={`h-10 w-full animate-pulse rounded-lg border border-gray-200 bg-gray-100 ${className}`}
            />
        );
    }

    if (!canSwitchOrganizations) {
        return (
            <div className={`w-full ${className}`}>
                <div className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 flex items-center">
                    <span className="block truncate">
                        {currentOrgName ?? 'No organizations available'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div ref={rootRef} className={`relative w-full ${className}`}>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(prev => !prev)}
                disabled={memberships.length === 0 || isSwitching}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-left text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 focus:border-[#9fc5a9] focus:outline-none focus:ring-2 focus:ring-[#B7D7BD] disabled:cursor-not-allowed disabled:bg-gray-50"
            >
                <span className="block truncate">
                    {currentOrgName ??
                        (memberships.length === 0
                            ? 'No organizations available'
                            : 'Select organization')}
                </span>
            </button>
            <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
            />
            {open ? (
                <div
                    className={`absolute z-50 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
                        openUpward ? 'bottom-11' : 'mt-1'
                    }`}
                >
                    {memberships.map(membership => {
                        const active = membership.organization.id === orgId;
                        return (
                            <div
                                key={membership.organization.id}
                                className="flex flex-col gap-0 border-b border-gray-100 last:border-b-0"
                            >
                                <div className="flex w-full min-w-0 items-stretch gap-0">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                setIsSwitching(true);
                                                const nextOrgId = membership.organization.id;
                                                if (nextOrgId !== orgId && setActive) {
                                                    await setActive({ organization: nextOrgId });
                                                }
                                                setOpen(false);
                                                router.replace(redirectTo);
                                                router.refresh();
                                            } finally {
                                                setIsSwitching(false);
                                            }
                                        }}
                                        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                        title={membership.organization.name}
                                    >
                                        <span className="min-w-0 flex-1 whitespace-normal wrap-break-word leading-snug">
                                            {membership.organization.name}
                                        </span>
                                        {active ? (
                                            <Check className="h-4 w-4 shrink-0 text-[#1C5E2C]" />
                                        ) : null}
                                    </button>
                                    {canLeaveAnyOrganization ? (
                                        <button
                                            type="button"
                                            title="Leave this organization"
                                            onClick={e => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setLeaveError(null);
                                                setLeaveTarget({
                                                    organizationId: membership.organization.id,
                                                    name:
                                                        membership.organization.name ??
                                                        'Organization',
                                                });
                                            }}
                                            className="shrink-0 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                                            disabled={isSwitching}
                                        >
                                            Leave
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {leaveTarget ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-[#B7D7BD] bg-white shadow-xl">
                        <CautionDialogBody
                            title="Leave organization"
                            actions={
                                <>
                                    <button
                                        type="button"
                                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        onClick={() => setLeaveTarget(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="rounded-lg bg-[#FAC87D] px-4 py-2 text-sm font-medium text-gray-900 hover:opacity-90"
                                        disabled={isSwitching}
                                        onClick={async () => {
                                            if (!leaveTarget) return;
                                            setLeaveError(null);
                                            setIsSwitching(true);
                                            try {
                                                const res = await fetch(
                                                    '/api/me/leave-organization',
                                                    {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify({
                                                            organizationId:
                                                                leaveTarget.organizationId,
                                                        }),
                                                    }
                                                );
                                                const data = (await res.json()) as {
                                                    error?: string;
                                                    suggestedActiveOrganizationId?: string | null;
                                                };
                                                if (!res.ok) {
                                                    setLeaveError(
                                                        data.error ?? 'Could not leave organization'
                                                    );
                                                    return;
                                                }
                                                const switchingFrom = leaveTarget.organizationId;

                                                if (
                                                    switchingFrom === orgId &&
                                                    data.suggestedActiveOrganizationId &&
                                                    setActive
                                                ) {
                                                    await setActive({
                                                        organization:
                                                            data.suggestedActiveOrganizationId,
                                                    });
                                                }
                                                await clerk.user?.reload();
                                                setLeaveTarget(null);
                                                setOpen(false);
                                                router.replace(redirectTo);
                                                router.refresh();
                                            } finally {
                                                setIsSwitching(false);
                                            }
                                        }}
                                    >
                                        Leave organization
                                    </button>
                                </>
                            }
                        >
                            <div className="space-y-2 text-sm text-gray-700">
                                <p>
                                    Leave <span className="font-semibold">{leaveTarget.name}</span>?
                                    You will keep access to your other organizations.
                                </p>
                                <p className="text-xs text-gray-500">
                                    You cannot remove your last organization here; contact an
                                    administrator if you no longer need access.
                                </p>
                                {leaveError ? (
                                    <p className="text-xs text-red-700">{leaveError}</p>
                                ) : null}
                            </div>
                        </CautionDialogBody>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
