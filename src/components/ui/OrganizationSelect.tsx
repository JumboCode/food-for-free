'use client';

import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { Check, ChevronDown } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

type OrganizationSelectProps = {
    className?: string;
    redirectTo?: string;
};

export default function OrganizationSelect({
    className = '',
    redirectTo = '/overview',
}: OrganizationSelectProps) {
    const { orgId } = useAuth();
    const { isLoaded, setActive, userMemberships } = useOrganizationList({
        userMemberships: { infinite: true },
    });
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [open, setOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const memberships = useMemo(() => userMemberships.data ?? [], [userMemberships.data]);
    const canSwitchOrganizations = memberships.length > 1;
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
                    className={`absolute z-50 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${
                        openUpward ? 'bottom-11' : 'mt-1'
                    }`}
                >
                    {memberships.map(membership => {
                        const active = membership.organization.id === orgId;
                        return (
                            <button
                                key={membership.organization.id}
                                type="button"
                                onClick={async () => {
                                    try {
                                        setIsSwitching(true);
                                        const nextOrgId = membership.organization.id;
                                        if (nextOrgId !== orgId && setActive) {
                                            await setActive({ organization: nextOrgId });
                                        }
                                        setOpen(false);
                                        if (searchParams.get('chooseOrg') === '1') {
                                            window.location.assign(redirectTo);
                                        } else if (pathname !== redirectTo) {
                                            router.replace(redirectTo);
                                        } else {
                                            router.refresh();
                                        }
                                    } finally {
                                        setIsSwitching(false);
                                    }
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                title={membership.organization.name}
                            >
                                <span className="min-w-0 flex-1 whitespace-normal wrap-break-word leading-snug">
                                    {membership.organization.name}
                                </span>
                                {active ? <Check className="h-4 w-4 text-[#1C5E2C]" /> : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
